const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Only require electron-updater in production builds
let autoUpdater = null;
if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'development') {
  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch (e) {
    console.log('Auto-updater not available:', e.message);
  }
}

let mainWindow;
let staticServer = null;

// MIME types for static file serving
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.webp': 'image/webp'
};

function createStaticServer(distPath) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // Parse URL and remove query string
      let urlPath = req.url.split('?')[0];
      if (urlPath === '/') urlPath = '/index.html';
      
      // Decode URI and build file path
      const decodedPath = decodeURIComponent(urlPath);
      let filePath = path.join(distPath, decodedPath);
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      fs.readFile(filePath, (err, content) => {
        if (err) {
          // For SPA routing, serve index.html for missing routes (not assets)
          if (err.code === 'ENOENT' && !ext) {
            fs.readFile(path.join(distPath, 'index.html'), (err2, indexContent) => {
              if (err2) {
                res.writeHead(500);
                res.end('Server Error');
                return;
              }
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(indexContent);
            });
          } else {
            console.error('File not found:', filePath);
            res.writeHead(404);
            res.end('Not Found');
          }
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
        }
      });
    });

    server.on('error', (err) => {
      console.error('Static server error:', err);
      reject(err);
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      console.log('Static server started on port:', port);
      resolve({ server, port });
    });
  });
}

function setupAutoUpdater() {
  if (!autoUpdater) return;
  
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.checkForUpdates().catch(() => {});

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

  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error);
  });
}

function createWindow() {
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

  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Find the dist folder
    const possibleDistPaths = [
      path.join(app.getAppPath(), 'dist'),
      path.join(__dirname, '..', 'dist'),
      path.join(process.resourcesPath, 'app', 'dist'),
      path.join(process.resourcesPath, 'app.asar', 'dist'),
    ];
    
    let distPath = null;
    
    for (const p of possibleDistPaths) {
      const indexPath = path.join(p, 'index.html');
      console.log('Checking path:', indexPath);
      try {
        if (fs.existsSync(indexPath)) {
          distPath = p;
          console.log('Found dist folder at:', p);
          break;
        }
      } catch (e) {
        // Path doesn't exist, try next
      }
    }
    
    if (distPath) {
      // Start local HTTP server to serve dist files
      createStaticServer(distPath).then(({ server, port }) => {
        staticServer = server;
        const url = `http://127.0.0.1:${port}/`;
        console.log('Loading app from:', url);
        
        mainWindow.loadURL(url).then(() => {
          console.log('Successfully loaded app');
        }).catch((err) => {
          console.error('Failed to load app:', err);
          showErrorPage('Failed to load application: ' + err.message);
        });
      }).catch((err) => {
        console.error('Failed to start static server:', err);
        showErrorPage('Failed to start application server: ' + err.message);
      });
    } else {
      console.error('Could not find dist folder in any expected location');
      console.error('Tried paths:', possibleDistPaths);
      showErrorPage('Application files not found. Please reinstall the application.');
    }
    
    setupAutoUpdater();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (staticServer) {
    staticServer.close();
    console.log('Static server closed');
  }
});

app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});
