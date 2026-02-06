import { useState, useEffect, useCallback } from 'react';
import { isElectronApp } from './useIsElectron';

interface CallData {
  roomName: string;
  participantName: string;
  conversationName: string;
  isVideo: boolean;
  isHost: boolean;
}

interface UseElectronCallWindowReturn {
  isElectron: boolean;
  isPoppedOut: boolean;
  isPinned: boolean;
  popOutCall: (data: CallData) => Promise<boolean>;
  popInCall: () => Promise<boolean>;
  togglePin: () => Promise<boolean>;
  closeCallWindow: () => Promise<boolean>;
}

/**
 * Hook to manage the pop-out call window in Electron.
 * Provides methods to pop out/in the call, toggle always-on-top, etc.
 */
export function useElectronCallWindow(): UseElectronCallWindowReturn {
  const [isPoppedOut, setIsPoppedOut] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const isElectron = isElectronApp();

  // Check initial state on mount
  useEffect(() => {
    const checkState = async () => {
      if (!isElectron) return;
      
      const api = (window as any).electronAPI;
      if (api?.isCallWindowOpen) {
        const open = await api.isCallWindowOpen();
        setIsPoppedOut(open);
      }
      if (api?.getCallAlwaysOnTop) {
        const pinned = await api.getCallAlwaysOnTop();
        setIsPinned(pinned);
      }
    };
    
    checkState();
  }, [isElectron]);

  // Listen for call window closed event
  useEffect(() => {
    if (!isElectron) return;
    
    const api = (window as any).electronAPI;
    if (api?.onCallWindowClosed) {
      const cleanup = api.onCallWindowClosed(() => {
        setIsPoppedOut(false);
      });
      return cleanup;
    }
  }, [isElectron]);

  const popOutCall = useCallback(async (data: CallData): Promise<boolean> => {
    if (!isElectron) return false;
    
    const api = (window as any).electronAPI;
    if (api?.popOutCall) {
      try {
        await api.popOutCall(data);
        setIsPoppedOut(true);
        return true;
      } catch (err) {
        console.error('[useElectronCallWindow] Pop out failed:', err);
        return false;
      }
    }
    return false;
  }, [isElectron]);

  const popInCall = useCallback(async (): Promise<boolean> => {
    if (!isElectron) return false;
    
    const api = (window as any).electronAPI;
    if (api?.popInCall) {
      try {
        await api.popInCall();
        setIsPoppedOut(false);
        return true;
      } catch (err) {
        console.error('[useElectronCallWindow] Pop in failed:', err);
        return false;
      }
    }
    return false;
  }, [isElectron]);

  const togglePin = useCallback(async (): Promise<boolean> => {
    if (!isElectron) return false;
    
    const api = (window as any).electronAPI;
    if (api?.toggleCallAlwaysOnTop) {
      try {
        const newState = await api.toggleCallAlwaysOnTop();
        setIsPinned(newState);
        return newState;
      } catch (err) {
        console.error('[useElectronCallWindow] Toggle pin failed:', err);
        return false;
      }
    }
    return false;
  }, [isElectron]);

  const closeCallWindow = useCallback(async (): Promise<boolean> => {
    if (!isElectron) return false;
    
    const api = (window as any).electronAPI;
    if (api?.closeCallWindow) {
      try {
        await api.closeCallWindow();
        setIsPoppedOut(false);
        return true;
      } catch (err) {
        console.error('[useElectronCallWindow] Close failed:', err);
        return false;
      }
    }
    return false;
  }, [isElectron]);

  return {
    isElectron,
    isPoppedOut,
    isPinned,
    popOutCall,
    popInCall,
    togglePin,
    closeCallWindow,
  };
}
