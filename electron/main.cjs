const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Auto-updater (only in production)
let autoUpdater = null;
try {
  if (app.isPackaged) {
    autoUpdater = require('electron-updater').autoUpdater;
  }
} catch (e) {
  // Auto-updater not available
}

let mainWindow = null;
let staticServer = null;

// MIME type mapping
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
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
  '.webp': 'image/webp',
  '.wasm': 'application/wasm'
};

/**
 * Creates a local HTTP server to serve static files from distPath
 * This approach handles SPA routing correctly
 */
function createStaticServer(distPath) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // Get the URL path, default to index.html
      let urlPath = (req.url || '/').split('?')[0];
      if (urlPath === '/') {
        urlPath = '/index.html';
      }

      // Remove leading slashes for path.join compatibility on Windows
      const cleanPath = urlPath.replace(/^\/+/, '');
      
      // Build the full file path
      const filePath = path.join(distPath, decodeURIComponent(cleanPath));
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

      // Read and serve the file
      fs.readFile(filePath, (err, data) => {
        if (err) {
          // File not found - for SPA, serve index.html for routes (not assets)
          if (err.code === 'ENOENT' && !ext) {
            const indexPath = path.join(distPath, 'index.html');
            fs.readFile(indexPath, (indexErr, indexData) => {
              if (indexErr) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
                return;
              }
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(indexData);
            });
            return;
          }
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }

        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
      });
    });

    server.on('error', (err) => {
      reject(err);
    });

    // Listen on random available port on localhost
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, port });
    });
  });
}

/**
 * Setup auto-updater event handlers
 */
function setupAutoUpdater() {
  if (!autoUpdater) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    if (!mainWindow) return;
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available. Download now?`,
      buttons: ['Download', 'Later'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (!mainWindow) return;
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} is ready. Restart to install?`,
      buttons: ['Restart', 'Later'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err.message);
  });

  // Check for updates
  autoUpdater.checkForUpdates().catch(() => {});
}

/**
 * Get the path to the dist folder
 * With asar disabled, files are at: resources/app/dist
 */
function getDistPath() {
  // Log paths for debugging
  console.log('__dirname:', __dirname);
  console.log('process.resourcesPath:', process.resourcesPath);
  console.log('app.isPackaged:', app.isPackaged);
  console.log('app.getAppPath():', app.getAppPath());
  
  // Possible paths to check (in order of priority)
  const pathsToCheck = [
    // Packaged app with asar disabled: resources/app/dist
    path.join(process.resourcesPath, 'app', 'dist'),
    // Alternative packaged location
    path.join(app.getAppPath(), 'dist'),
    // Development: dist next to electron folder
    path.join(__dirname, '..', 'dist'),
    // Development alternative: dist in current working directory
    path.join(process.cwd(), 'dist'),
  ];
  
  for (const testPath of pathsToCheck) {
    console.log('Checking path:', testPath, 'exists:', fs.existsSync(testPath));
    if (fs.existsSync(testPath)) {
      const indexPath = path.join(testPath, 'index.html');
      console.log('Checking index.html:', indexPath, 'exists:', fs.existsSync(indexPath));
      if (fs.existsSync(indexPath)) {
        console.log('Found valid dist path:', testPath);
        return testPath;
      }
    }
  }
  
  console.error('Could not find dist folder! Checked:', pathsToCheck);
  return null;
}

/**
 * Create the main application window
 */
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    titleBarStyle: 'default',
    autoHideMenuBar: true,
    show: false
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    // Development: connect to Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: serve from local HTTP server
    const distPath = getDistPath();
    
    // Always open DevTools in production for debugging
    mainWindow.webContents.openDevTools();
    
    if (!distPath) {
      // Show error with debug info if dist folder not found
      const debugInfo = `
        __dirname: ${__dirname}
        resourcesPath: ${process.resourcesPath}
        appPath: ${app.getAppPath()}
        cwd: ${process.cwd()}
      `;
      mainWindow.loadURL(`data:text/html,
        <html>
          <body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#1a1a2e;color:white;">
            <div style="text-align:center;max-width:600px;padding:20px;">
              <h1>Application Error</h1>
              <p>Could not find application files. Please reinstall.</p>
              <pre style="text-align:left;background:#2a2a3e;padding:10px;border-radius:5px;font-size:12px;overflow:auto;">${debugInfo}</pre>
            </div>
          </body>
        </html>
      `);
      mainWindow.show();
      return;
    }

    try {
      console.log('Starting static server with distPath:', distPath);
      const { server, port } = await createStaticServer(distPath);
      staticServer = server;
      console.log('Server started on port:', port);
      await mainWindow.loadURL(`http://127.0.0.1:${port}/`);
      console.log('Page loaded successfully');
    } catch (err) {
      console.error('Failed to start server:', err);
      mainWindow.loadURL(`data:text/html,
        <html>
          <body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#1a1a2e;color:white;">
            <div style="text-align:center;">
              <h1>Startup Error</h1>
              <p>${err.message}</p>
            </div>
          </body>
        </html>
      `);
    }

    // Setup auto-updater after window is ready
    setupAutoUpdater();
  }

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

// App lifecycle events
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

app.on('before-quit', () => {
  if (staticServer) {
    staticServer.close();
  }
});

// Handle external link clicks
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });
});
