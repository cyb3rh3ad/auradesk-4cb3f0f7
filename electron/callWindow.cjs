const { BrowserWindow, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let callWindow = null;
let isAlwaysOnTop = false;

function getDistPath(app) {
  const possiblePaths = [
    path.join(process.resourcesPath || '', 'app', 'dist'),
    path.join(app.getAppPath(), 'dist'),
    path.join(__dirname, '..', 'dist'),
    path.join(__dirname, 'dist')
  ];

  for (const p of possiblePaths) {
    const indexPath = path.join(p, 'index.html');
    if (fs.existsSync(indexPath)) {
      return p;
    }
  }
  return null;
}

function createCallWindow(app, mainWindow, callData) {
  if (callWindow && !callWindow.isDestroyed()) {
    callWindow.focus();
    return callWindow;
  }

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  
  // Default position: bottom-right corner
  const windowWidth = 400;
  const windowHeight = 320;
  const x = screenWidth - windowWidth - 20;
  const y = screenHeight - windowHeight - 20;

  callWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 280,
    minHeight: 200,
    maxWidth: 1400,
    maxHeight: 900,
    x,
    y,
    frame: false,
    transparent: false,
    resizable: true,
    movable: true,
    alwaysOnTop: isAlwaysOnTop,
    skipTaskbar: false,
    show: false,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false,
    },
  });

  // Load the call window route
  const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';
  
  // Pass call data as URL parameters
  const params = new URLSearchParams({
    roomName: callData.roomName || '',
    participantName: callData.participantName || '',
    conversationName: callData.conversationName || '',
    isVideo: String(callData.isVideo ?? true),
    isHost: String(callData.isHost ?? false),
  });

  if (isDev) {
    callWindow.loadURL(`http://localhost:5173/electron-call?${params.toString()}`);
  } else {
    const distPath = getDistPath(app);
    if (distPath) {
      // Load index.html with hash route for call window
      callWindow.loadFile(path.join(distPath, 'index.html'), {
        hash: `/electron-call?${params.toString()}`
      });
    }
  }

  callWindow.once('ready-to-show', () => {
    callWindow.show();
  });

  callWindow.on('closed', () => {
    callWindow = null;
    // Notify main window that call window was closed
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('call-window-closed');
    }
  });

  return callWindow;
}

function closeCallWindow() {
  if (callWindow && !callWindow.isDestroyed()) {
    callWindow.close();
    callWindow = null;
  }
}

function toggleAlwaysOnTop() {
  isAlwaysOnTop = !isAlwaysOnTop;
  if (callWindow && !callWindow.isDestroyed()) {
    callWindow.setAlwaysOnTop(isAlwaysOnTop);
  }
  return isAlwaysOnTop;
}

function getAlwaysOnTop() {
  return isAlwaysOnTop;
}

function getCallWindow() {
  return callWindow;
}

function isCallWindowOpen() {
  return callWindow && !callWindow.isDestroyed();
}

module.exports = {
  createCallWindow,
  closeCallWindow,
  toggleAlwaysOnTop,
  getAlwaysOnTop,
  getCallWindow,
  isCallWindowOpen,
};
