const { app, BrowserWindow, shell, protocol, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

// Optional auto-updater
let autoUpdater = null;
if (app.isPackaged) {
  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch (e) {
    console.log('Auto-updater not available');
  }
}

let mainWindow = null;

// Get the correct path to dist folder - SIMPLE approach
function getDistPath() {
  const possiblePaths = [
    path.join(process.resourcesPath, 'app', 'dist'),
    path.join(app.getAppPath(), 'dist'),
    path.join(__dirname, '..', 'dist')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(path.join(p, 'index.html'))) {
      return p;
    }
  }
  return null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false // Allow loading local files
    },
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    backgroundColor: '#1a1a2e',
    show: false
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const distPath = getDistPath();
    
    if (!distPath) {
      dialog.showErrorBox('Error', 'Application files not found. Please reinstall.');
      app.quit();
      return;
    }

    const indexPath = path.join(distPath, 'index.html');
    mainWindow.loadFile(indexPath);
    
    // Setup auto-updater
    if (autoUpdater) {
      autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
