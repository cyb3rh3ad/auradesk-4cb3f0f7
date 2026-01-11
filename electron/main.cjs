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

// Deep link protocol for OAuth callbacks
const PROTOCOL_NAME = 'auradesk';

// Register as default protocol handler (for OAuth redirects)
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL_NAME, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL_NAME);
}

// Handle the protocol URL (OAuth callback)
function handleProtocolUrl(protocolUrl) {
  if (!protocolUrl) return;
  
  console.log('Received protocol URL:', protocolUrl);
  
  // Extract tokens from the URL (format: auradesk://auth#access_token=...&refresh_token=...)
  try {
    const urlObj = new URL(protocolUrl);
    const hash = urlObj.hash.substring(1); // Remove the # prefix
    const params = new URLSearchParams(hash);
    
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    
    if (accessToken && refreshToken && mainWindow) {
      // Send tokens to the renderer process
      mainWindow.webContents.executeJavaScript(`
        window.postMessage({
          type: 'OAUTH_CALLBACK',
          accessToken: '${accessToken}',
          refreshToken: '${refreshToken}'
        }, '*');
      `);
      
      // Focus the app window
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  } catch (e) {
    console.error('Failed to parse protocol URL:', e);
  }
}

// macOS: Handle protocol URL when app is already running
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleProtocolUrl(url);
});

// Windows/Linux: Handle protocol URL via second instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    // Find the protocol URL in command line arguments
    const protocolUrl = commandLine.find(arg => arg.startsWith(`${PROTOCOL_NAME}://`));
    handleProtocolUrl(protocolUrl);
    
    // Focus existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Get the correct path to dist folder - with debugging
function getDistPath() {
  const possiblePaths = [
    path.join(process.resourcesPath || '', 'app', 'dist'),
    path.join(app.getAppPath(), 'dist'),
    path.join(__dirname, '..', 'dist'),
    path.join(__dirname, 'dist')
  ];

  console.log('Checking dist paths:');
  for (const p of possiblePaths) {
    const indexPath = path.join(p, 'index.html');
    const exists = fs.existsSync(indexPath);
    console.log(`  ${p} -> ${exists ? 'FOUND' : 'not found'}`);
    if (exists) {
      return p;
    }
  }
  
  console.log('App path:', app.getAppPath());
  console.log('Resources path:', process.resourcesPath);
  console.log('__dirname:', __dirname);
  
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
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0a0f',
      symbolColor: '#ffffff',
      height: 32
    },
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0f',
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
  
  // Handle protocol URL that was used to launch the app (Windows/Linux)
  const protocolUrl = process.argv.find(arg => arg.startsWith(`${PROTOCOL_NAME}://`));
  if (protocolUrl) {
    // Delay to ensure window is ready
    mainWindow.once('ready-to-show', () => {
      setTimeout(() => handleProtocolUrl(protocolUrl), 500);
    });
  }
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
