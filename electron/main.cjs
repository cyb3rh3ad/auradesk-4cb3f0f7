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
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
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
  console.log('=== CREATING STATIC SERVER ===');
  console.log('Serving from distPath:', distPath);
  
  // List files in distPath to verify structure
  try {
    const files = fs.readdirSync(distPath);
    console.log('Files in distPath:', files);
    if (files.includes('assets')) {
      const assetFiles = fs.readdirSync(path.join(distPath, 'assets'));
      console.log('Files in assets folder:', assetFiles.slice(0, 10));
    }
  } catch (e) {
    console.error('Error listing distPath contents:', e.message);
  }
  
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // Parse URL and remove query string
      let urlPath = req.url.split('?')[0];
      
      // Handle root path
      if (urlPath === '/' || urlPath === '') {
        urlPath = '/index.html';
      }
      
      // Remove leading slash for proper path joining on Windows
      let cleanPath = urlPath;
      while (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.substring(1);
      }
      
      // Decode URI and build file path
      const decodedPath = decodeURIComponent(cleanPath);
      const filePath = path.join(distPath, decodedPath);
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      console.log(`[HTTP] ${req.method} "${req.url}" -> "${filePath}"`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`[HTTP] File not found: ${filePath}`);
        // For SPA routing: if no extension, serve index.html
        if (!ext || ext === '') {
          const indexPath = path.join(distPath, 'index.html');
          if (fs.existsSync(indexPath)) {
            console.log(`[HTTP] SPA fallback -> serving index.html`);
            const content = fs.readFileSync(indexPath);
            res.writeHead(200, { 
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-cache'
            });
            res.end(content);
            return;
          }
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found: ' + urlPath);
        return;
      }
      
      // Read and serve the file
      try {
        const content = fs.readFileSync(filePath);
        console.log(`[HTTP] OK "${urlPath}" (${content.length} bytes, ${contentType})`);
        res.writeHead(200, { 
          'Content-Type': contentType,
          'Cache-Control': ext === '.html' ? 'no-cache' : 'max-age=31536000'
        });
        res.end(content);
      } catch (err) {
        console.error(`[HTTP] Error reading file:`, err.message);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error');
      }
    });

    server.on('error', (err) => {
      console.error('Static server error:', err);
      reject(err);
    });

    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      console.log('=== STATIC SERVER STARTED ON PORT:', port, '===');
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
  
  console.log('=== ELECTRON STARTUP ===');
  console.log('isDev:', isDev);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('app.getAppPath():', app.getAppPath());
  console.log('process.resourcesPath:', process.resourcesPath);
  console.log('__dirname:', __dirname);
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Find the dist folder - check unpacked location first (asarUnpack)
    const possibleDistPaths = [
      path.join(process.resourcesPath, 'app.asar.unpacked', 'dist'),
      path.join(app.getAppPath().replace('app.asar', 'app.asar.unpacked'), 'dist'),
      path.join(app.getAppPath(), 'dist'),
      path.join(__dirname, '..', 'dist'),
      path.join(process.resourcesPath, 'app', 'dist'),
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
