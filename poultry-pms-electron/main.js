const { app, BrowserWindow, Menu, shell, dialog, ipcMain, Tray, nativeImage } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// ─── Config ────────────────────────────────────────────────────────────────
const isDev = process.argv.includes('--dev');
const PROD_URL = 'https://pms-host-v1-ab.vercel.app'; // ← your live deployment URL
const DEV_URL  = 'http://localhost:3000';
const APP_URL  = isDev ? DEV_URL : PROD_URL;

// ─── State ─────────────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;

// ─── App Setup ─────────────────────────────────────────────────────────────
app.setName('Agri-ERP');

// Security: disable navigation to unknown origins
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    const allowedOrigins = [
      'https://pms-host-v1-ab.vercel.app',
      'http://localhost:3000',
      'https://accounts.google.com',  // Google OAuth
      'https://supabase.co',
    ];
    const origin = new URL(url).origin;
    if (!allowedOrigins.some(o => url.startsWith(o))) {
      event.preventDefault();
      shell.openExternal(url); // open unknown URLs in browser
    }
  });

  // Prevent new windows from opening inside Electron (open in browser instead)
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
});

// ─── Main Window ────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Agri-ERP',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    backgroundColor: '#0a0f0d',   // match the app's dark background to avoid white flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    // Hide the native frame on Windows for a cleaner look
    // (the web app has its own header)
    titleBarStyle: 'hiddenInset',
    frame: true,
    show: false,  // Don't show until ready to avoid flash
  });

  // Load the web app
  mainWindow.loadURL(APP_URL);

  // Show window once the page has loaded (avoid white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Re-load on crash
  mainWindow.webContents.on('render-process-gone', () => {
    mainWindow.reload();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── Tray Icon ──────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Agri-ERP',  click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: 'Reload',         click: () => mainWindow?.reload() },
    { type: 'separator' },
    { label: 'Quit',           click: () => app.quit() },
  ]);

  tray.setToolTip('Agri-ERP');
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

// ─── Application Menu ───────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: 'Agri-ERP',
      submenu: [
        { label: 'About Agri-ERP', role: 'about' },
        { type: 'separator' },
        {
          label: 'Check for Updates…',
          click: () => autoUpdater.checkForUpdatesAndNotify()
        },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', click: () => mainWindow?.webContents.reloadIgnoringCache() },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Zoom In',     accelerator: 'CmdOrCtrl+=', role: 'zoomIn' },
        { label: 'Zoom Out',    accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Full Screen', accelerator: 'F11', role: 'togglefullscreen' },
        ...(isDev ? [
          { type: 'separator' },
          { label: 'Toggle DevTools', accelerator: 'F12', role: 'toggleDevTools' }
        ] : [])
      ]
    },
    {
      label: 'Navigate',
      submenu: [
        { label: 'Back',    accelerator: 'Alt+Left',  click: () => mainWindow?.webContents.goBack() },
        { label: 'Forward', accelerator: 'Alt+Right', click: () => mainWindow?.webContents.goForward() },
        { type: 'separator' },
        { label: 'Dashboard',   click: () => mainWindow?.loadURL(`${APP_URL}/dashboard`) },
        { label: 'Livestock',   click: () => mainWindow?.loadURL(`${APP_URL}/dashboard/flocks`) },
        { label: 'Sales',       click: () => mainWindow?.loadURL(`${APP_URL}/dashboard/sales`) },
        { label: 'Finance',     click: () => mainWindow?.loadURL(`${APP_URL}/dashboard/finance`) },
        { label: 'Inventory',   click: () => mainWindow?.loadURL(`${APP_URL}/dashboard/inventory`) },
        { label: 'Settings',    click: () => mainWindow?.loadURL(`${APP_URL}/dashboard/settings`) },
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── IPC Handlers ───────────────────────────────────────────────────────────
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);

// ─── Auto Updater ───────────────────────────────────────────────────────────
function setupAutoUpdater() {
  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available. It will be downloaded in the background.`,
      buttons: ['OK']
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'A new version has been downloaded. Restart the app to apply the update.',
      buttons: ['Restart Now', 'Later']
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });
}

// ─── App Lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  createTray();
  buildMenu();
  if (!isDev) {
    setupAutoUpdater();
    autoUpdater.checkForUpdatesAndNotify();
  }
});

// Keep the app running when all windows are closed (show tray instead)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
