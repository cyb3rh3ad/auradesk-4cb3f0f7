import { useState, useEffect } from 'react';

export const useIsElectron = () => {
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check multiple indicators for Electron environment
    const checkElectron = 
      typeof window !== 'undefined' && (
        window.location.protocol === 'file:' ||
        (window as any).electronAPI?.isElectron ||
        navigator.userAgent.toLowerCase().includes('electron')
      );
    
    setIsElectron(checkElectron);
  }, []);

  return isElectron;
};

// Static check for immediate use (before React hydration)
export const isElectronApp = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.location.protocol === 'file:' ||
    (window as any).electronAPI?.isElectron ||
    navigator.userAgent.toLowerCase().includes('electron')
  );
};
