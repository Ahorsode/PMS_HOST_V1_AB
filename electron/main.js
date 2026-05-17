const { app, BrowserWindow, shell, ipcMain, safeStorage } = require('electron');
const path = require('path');
const serve = require('electron-serve');
const db = require('./database');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const loadURL = serve({ directory: path.join(__dirname, '../out') });

let mainWindow;

function getSecureLicenseToken() {
  try {
    const userDataPath = app.getPath('userData');
    const tokenPath = path.join(userDataPath, 'license_token.dat');
    if (!fs.existsSync(tokenPath)) return null;
    const encrypted = fs.readFileSync(tokenPath);
    if (!safeStorage.isEncryptionAvailable()) {
      return encrypted.toString('utf8');
    }
    return safeStorage.decryptString(encrypted);
  } catch (err) {
    console.error('[License Check] Failed to read secure license token:', err);
    return null;
  }
}

function getHardwareId() {
  const interfaces = os.networkInterfaces();
  let mac = '';
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (!iface.internal && iface.mac !== '00:00:00:00:00:00') {
        mac = iface.mac;
        break;
      }
    }
    if (mac) break;
  }
  
  const platform = process.platform;
  const arch = process.arch;
  const cpus = os.cpus().length;
  const totalMemory = os.totalmem();
  
  const hash = crypto.createHash('sha256');
  hash.update(`${mac}-${platform}-${arch}-${cpus}-${totalMemory}`);
  return `HW-${hash.digest('hex').substring(0, 16).toUpperCase()}`;
}

function createWindow() {
  const token = getSecureLicenseToken();
  const isActivated = !!token;

  mainWindow = new BrowserWindow({
    width: isActivated ? 1280 : 450,
    height: isActivated ? 800 : 600,
    minWidth: isActivated ? 900 : 450,
    minHeight: isActivated ? 650 : 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#000000',
    title: isActivated ? 'Poultry Management System' : 'Activate Poultry PMS Terminal',
    show: false,
    resizable: isActivated,
    maximizable: isActivated,
    minimizable: isActivated,
  });

  if (!isActivated) {
    mainWindow.setMenu(null);
  }

  if (isActivated) {
    if (isDev) {
      mainWindow.loadURL('http://localhost:3000');
    } else {
      loadURL(mainWindow);
    }
  } else {
    if (isDev) {
      mainWindow.loadURL('http://localhost:3000/activate');
    } else {
      mainWindow.loadURL('app://./activate');
    }
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

ipcMain.handle('activate-terminal', async (event, { farmId, licenseKey }) => {
  try {
    const hardwareId = getHardwareId();
    console.log(`[Activation] Invoking cloud registration for Farm ${farmId}, Key ${licenseKey}, HW ${hardwareId}`);
    
    const response = await fetch(`${CLOUD_URL}/api/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        farmId,
        licenseKey,
        hardwareId,
        deviceName: `${os.hostname()} Terminal`,
        deviceType: process.platform
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      return { success: false, error: errData.error || 'Server rejected activation request' };
    }

    const result = await response.json();
    if (!result.success || !result.device) {
      return { success: false, error: 'Invalid activation response payload' };
    }

    // 1. Save DeviceToken securely via safeStorage
    const tokenData = JSON.stringify({
      deviceToken: result.device.id,
      farmId,
      licenseKey,
      hardwareId
    });
    
    const userDataPath = app.getPath('userData');
    const encrypted = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(tokenData)
      : Buffer.from(tokenData, 'utf8');
      
    fs.writeFileSync(path.join(userDataPath, 'license_token.dat'), encrypted);

    // 2. Save sync credentials to sync_auth.dat
    const syncAuthData = JSON.stringify({
      licenseKey: licenseKey,
      deviceToken: result.device.id
    });
    const encryptedSyncAuth = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(syncAuthData)
      : Buffer.from(syncAuthData, 'utf8');
    fs.writeFileSync(path.join(userDataPath, 'sync_auth.dat'), encryptedSyncAuth);

    // 3. Initialize SQLite
    db.initDatabase();

    // 4. Force a quick pull-sync API call to populate database with active batches
    console.log('[Activation] Executing initial cloud data synchronization pull...');
    await attemptSync();

    // 5. Unlock UI & Resize back to standard window settings
    if (mainWindow) {
      mainWindow.setResizable(true);
      mainWindow.setMaximizable(true);
      mainWindow.setMinimizable(true);
      mainWindow.setMinimumSize(900, 650);
      mainWindow.setSize(1280, 800);
      mainWindow.setTitle('Poultry Management System');
      mainWindow.center();
    }
    
    return { success: true };
  } catch (err) {
    console.error('[Activation Exception]:', err);
    return { success: false, error: err.message };
  }
});

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
  const token = getSecureLicenseToken();
  if (!token) {
    console.log('[Sync Worker] Sync blocked: Device is not activated.');
    syncStatus = 'OFFLINE';
    broadcastSyncStatus();
    return;
  }

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
  const token = getSecureLicenseToken();
  if (!token) {
    mainWindow.webContents.send('sync-status-update', {
      pending: 0,
      lastSync: null,
      status: 'OFFLINE'
    });
    return;
  }
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
  const token = getSecureLicenseToken();
  if (token) {
    db.initDatabase();
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
