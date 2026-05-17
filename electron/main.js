const { app, BrowserWindow, shell, ipcMain, safeStorage } = require('electron');
const path = require('path');
const serve = require('electron-serve').default || require('electron-serve');
const db = require('./database');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const loadURL = serve({ directory: path.join(__dirname, '../out') });

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#000000',
    title: 'Poultry Management System',
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    loadURL(mainWindow);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

// --- IPC Database Handlers with Sync Queue Integration ---

ipcMain.on('db-query', (event, { sql, params }) => {
  try {
    const result = db.query(sql, params);
    event.reply('db-result', result);
  } catch (error) {
    event.reply('db-error', error.message);
  }
});

ipcMain.on('db-execute', (event, { sql, params, table, action, payload }) => {
  const sqlite = db.getDb();
  
  // Use a transaction for atomic local write + sync_queue entry
  const transaction = sqlite.transaction(() => {
    // 1. Perform the actual local data mutation
    const result = db.execute(sql, params);

    // 2. Logic for Health Module Atomic Updates
    if (table === 'health_logs' && action === 'INSERT' && payload) {
      const { batch_id, status, count, isolation_room_id } = payload;
      
      if (status === 'DEAD') {
        // Deduct from main batch count permanently
        sqlite.prepare('UPDATE batches SET currentCount = currentCount - ? WHERE id = ?')
          .run(count, batch_id);
      } else if (status === 'SICK' && isolation_room_id) {
        // Deduct from main batch count and move to isolation room
        sqlite.prepare('UPDATE batches SET currentCount = currentCount - ?, isolationCount = isolationCount + ? WHERE id = ?')
          .run(count, count, batch_id);
      }
    }

    // 3. If it's a trackable action, add it to the sync outbox
    if (table && action && payload) {
      const syncId = crypto.randomUUID();
      const syncSql = `
        INSERT INTO sync_queue (id, table_name, action_type, payload)
        VALUES (?, ?, ?, ?)
      `;
      sqlite.prepare(syncSql).run(syncId, table, action, JSON.stringify(payload));
    }

    return result;
  });

  try {
    const result = transaction();
    event.reply('db-result', result);
    
    // Trigger an immediate sync attempt if online
    attemptSync();
  } catch (error) {
    event.reply('db-error', error.message);
  }
});

// --- Auth & Secure Storage Handlers ---

ipcMain.on('save-auth-data', (event, { sessionToken, licenseKey, deviceToken }) => {
  try {
    const data = JSON.stringify({ sessionToken, licenseKey, deviceToken });
    // Use Electron's safeStorage API for OS-level encryption (Keychain/DPAPI)
    const encrypted = safeStorage.encryptString(data);
    const userDataPath = app.getPath('userData');
    fs.writeFileSync(path.join(userDataPath, 'sync_auth.dat'), encrypted);
    
    event.reply('auth-saved', { success: true });
    attemptSync(); // Sync immediately after identity update
  } catch (err) {
    console.error('Failed to save auth data:', err);
    event.reply('auth-saved', { success: false, error: err.message });
  }
});

ipcMain.on('get-sync-status', (event) => {
  broadcastSyncStatus();
});

ipcMain.on('trigger-sync', () => {
  attemptSync();
});

ipcMain.on('get-device-info', (event) => {
  try {
    const userDataPath = app.getPath('userData');
    const devicePath = path.join(userDataPath, 'device_info.json');
    let deviceId;

    if (fs.existsSync(devicePath)) {
      const data = JSON.parse(fs.readFileSync(devicePath, 'utf8'));
      deviceId = data.deviceId;
    } else {
      deviceId = crypto.randomUUID();
      fs.writeFileSync(devicePath, JSON.stringify({ 
        deviceId, 
        registeredAt: new Date().toISOString() 
      }));
    }

    event.reply('get-device-info', {
      deviceId,
      deviceName: os.hostname(),
      deviceType: process.platform,
      arch: process.arch
    });
  } catch (err) {
    console.error('Failed to get device info:', err);
    event.reply('get-device-info', { error: err.message });
  }
});

// --- Background Synchronization Worker ---

let isSyncing = false;
let syncStatus = 'IDLE'; // 'IDLE', 'SYNCING', 'ERROR', 'OFFLINE', 'ONLINE_SYNCED'
let lastSyncTime = null;

const CLOUD_URL = isDev ? 'http://localhost:3000' : 'https://poultry-pms.vercel.app';

/**
 * Background Sync Orchestrator
 * Performs a dual-phase reconciliation:
 * 1. Push: Upload local outbox (sync_queue) to cloud.
 * 2. Pull: Fetch fresh cloud updates since last successful sync.
 */
async function attemptSync() {
  if (isSyncing) return;
  
  isSyncing = true;
  syncStatus = 'SYNCING';
  broadcastSyncStatus();

  try {
    const userDataPath = app.getPath('userData');
    const authPath = path.join(userDataPath, 'sync_auth.dat');
    let authData = {};

    if (fs.existsSync(authPath)) {
      const encrypted = fs.readFileSync(authPath);
      const decrypted = safeStorage.decryptString(encrypted);
      authData = JSON.parse(decrypted);
    }

    // --- Phase 1: Push Local Changes (Outbox) ---
    const operations = db.query('SELECT * FROM sync_queue ORDER BY created_at ASC LIMIT 50');
    
    if (operations.length > 0) {
      const pushResponse = await fetch(`${CLOUD_URL}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.sessionToken || ''}`,
          'X-Farm-License-Key': authData.licenseKey || '',
          'X-Device-Token': authData.deviceToken || authData.deviceId || ''
        },
        body: JSON.stringify({ operations }),
      });

      if (pushResponse.ok) {
        const result = await pushResponse.json();
        if (result.processedIds?.length > 0) {
          const placeholders = result.processedIds.map(() => '?').join(',');
          db.execute(`DELETE FROM sync_queue WHERE id IN (${placeholders})`, result.processedIds);
        }
      }
    }

    // --- Phase 2: Pull Cloud Changes ---
    const lastSyncRow = db.query('SELECT value FROM settings WHERE key = ?', ['last_successful_sync'])[0];
    const lastSyncedAt = lastSyncRow ? lastSyncRow.value : new Date(0).toISOString();

    const pullResponse = await fetch(`${CLOUD_URL}/api/sync/pull?last_synced_at=${encodeURIComponent(lastSyncedAt)}`, {
      headers: {
        'Authorization': `Bearer ${authData.sessionToken || ''}`,
        'X-Device-Token': authData.deviceToken || authData.deviceId || ''
      }
    });

    if (pullResponse.ok) {
      const { data, serverTime } = await pullResponse.json();
      const sqlite = db.getDb();
      
      sqlite.transaction(() => {
        for (const [tableName, records] of Object.entries(data)) {
          if (!Array.isArray(records) || records.length === 0) continue;
          
          // CRITICAL: Don't overwrite records that have pending local mutations in the outbox
          const pendingIds = new Set(
            sqlite.prepare(`SELECT DISTINCT json_extract(payload, '$.id') as id FROM sync_queue WHERE table_name = ?`)
              .all(tableName).map(r => r.id)
          );

          const columns = Object.keys(records[0]);
          const placeholders = columns.map(() => '?').join(',');
          const stmt = sqlite.prepare(`INSERT OR REPLACE INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`);
          
          for (const record of records) {
            if (pendingIds.has(record.id)) continue;
            const values = columns.map(col => record[col]);
            stmt.run(...values);
          }
        }
        
        sqlite.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
          .run('last_successful_sync', serverTime);
      })();
      
      lastSyncTime = serverTime;
      console.log(`[Pull Sync] Database reconciled with cloud state.`);
    }

    syncStatus = 'ONLINE_SYNCED';
  } catch (error) {
    console.error('[Sync Worker Error]:', error);
    syncStatus = 'OFFLINE';
  } finally {
    isSyncing = false;
    broadcastSyncStatus();
    
    // Quick re-run if more items are pending in outbox
    const remaining = db.query('SELECT count(*) as count FROM sync_queue')[0].count;
    if (remaining > 0 && syncStatus === 'ONLINE_SYNCED') {
      setTimeout(attemptSync, 5000); 
    }
  }
}

function broadcastSyncStatus() {
  if (!mainWindow) return;
  const remaining = db.query('SELECT count(*) as count FROM sync_queue')[0].count;
  mainWindow.webContents.send('sync-status-update', {
    pending: remaining,
    lastSync: lastSyncTime,
    status: syncStatus
  });
}

// Start sync worker periodic heartbeat
setInterval(attemptSync, 60000); // Check every minute

app.whenReady().then(() => {
  db.initDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
