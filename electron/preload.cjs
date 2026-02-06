const { contextBridge, shell, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  openExternal: (url) => shell.openExternal(url),
  
  // Call window management
  popOutCall: (callData) => ipcRenderer.invoke('pop-out-call', callData),
  popInCall: () => ipcRenderer.invoke('pop-in-call'),
  toggleCallAlwaysOnTop: () => ipcRenderer.invoke('toggle-call-always-on-top'),
  getCallAlwaysOnTop: () => ipcRenderer.invoke('get-call-always-on-top'),
  isCallWindowOpen: () => ipcRenderer.invoke('is-call-window-open'),
  closeCallWindow: () => ipcRenderer.invoke('close-call-window'),
  
  // Listen for call window events
  onCallWindowClosed: (callback) => {
    ipcRenderer.on('call-window-closed', callback);
    return () => ipcRenderer.removeListener('call-window-closed', callback);
  },
  
  // For the pop-out call window itself
  endCall: () => ipcRenderer.invoke('end-call-from-popout'),
  getCallData: () => ipcRenderer.invoke('get-call-data'),
});
