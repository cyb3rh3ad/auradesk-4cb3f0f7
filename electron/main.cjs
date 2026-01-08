const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');

// Only require electron-updater in production builds
let autoUpdater = null;
if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'development') {
  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch (e) {
    console.log('Auto-updater not available:', e.message);
  }
}

// Note: electron-squirrel-startup is not needed for NSIS installers

let mainWindow;

function setupAutoUpdater() {
  if (!autoUpdater) return;
  
  // Configure auto-updater
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // Check for updates silently
  autoUpdater.checkForUpdates().catch(() => {
    // Silently fail if offline or can't reach update server
  });

  // Update available
  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available. Would you like to download it now?`,
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  // Update downloaded
  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded. The app will restart to install the update.`,
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  // Error handling
  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error);
  });
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    show: false,
  });

  // Load the app
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, find the correct path to dist/index.html
    // Works both in ASAR and unpacked builds
    const possiblePaths = [
      path.join(app.getAppPath(), 'dist', 'index.html'),
      path.join(__dirname, '..', 'dist', 'index.html'),
      path.join(process.resourcesPath, 'app', 'dist', 'index.html'),
      path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html'),
    ];
    
    let indexPath = null;
    const fs = require('fs');
    
    for (const p of possiblePaths) {
      console.log('Checking path:', p);
      try {
        if (fs.existsSync(p)) {
          indexPath = p;
          console.log('Found index.html at:', p);
          break;
        }
      } catch (e) {
        // Path doesn't exist, try next
      }
    }
    
    if (indexPath) {
      mainWindow.loadFile(indexPath).then(() => {
        console.log('Successfully loaded index.html from:', indexPath);
      }).catch((err) => {
        console.error('Failed to load index.html:', err);
        showErrorPage('Failed to load application files.');
      });
    } else {
      console.error('Could not find index.html in any expected location');
      console.error('Tried paths:', possiblePaths);
      showErrorPage('Application files not found. Please reinstall the application.');
    }
    
    // Setup auto-updater only in production
    setupAutoUpdater();
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showErrorPage(message) {
  const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>AuraDesk - Error</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: white;
        }
        .error-container {
          text-align: center;
          padding: 40px;
          background: rgba(255,255,255,0.1);
          border-radius: 16px;
          backdrop-filter: blur(10px);
        }
        h1 { color: #ff6b6b; margin-bottom: 16px; }
        p { color: #ccc; margin-bottom: 24px; }
        button {
          background: #4ecdc4;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
        }
        button:hover { background: #45b7aa; }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1>⚠️ Oops!</h1>
        <p>${message}</p>
        <button onclick="location.reload()">Try Again</button>
      </div>
    </body>
    </html>
  `;
  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorHtml));
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});
