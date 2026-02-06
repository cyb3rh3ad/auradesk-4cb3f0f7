import { useEffect, useState } from 'react';
import { useCall } from '@/contexts/CallContext';
import { ResizableCallWindow } from './ResizableCallWindow';
import { HybridCallRoom } from './HybridCallRoom';
import { useAuth } from '@/contexts/AuthContext';
import { useElectronCallWindow } from '@/hooks/useElectronCallWindow';

/**
 * GlobalCallOverlay - Renders the active call as a floating PiP window
 * This component should be placed at the app root level so it persists
 * across all navigation and route changes.
 * 
 * In Electron, supports popping out the call to a separate OS window.
 */
export const GlobalCallOverlay = () => {
  const { activeCall, endCurrentCall } = useCall();
  const { user } = useAuth();
  const { isElectron, isPoppedOut } = useElectronCallWindow();
  const [showInApp, setShowInApp] = useState(true);

  // Listen for call window events from Electron
  useEffect(() => {
    if (!isElectron) return;
    
    const api = (window as any).electronAPI;
    
    // When call window is closed, ensure we end the call
    const cleanupClosed = api?.onCallWindowClosed?.(() => {
      // Call was ended from pop-out window
      endCurrentCall();
    });
    
    // Listen for end-call event from pop-out window
    const handleCallEnded = () => {
      endCurrentCall();
    };
    
    // Set up IPC listener
    if ((window as any).ipcRenderer) {
      (window as any).ipcRenderer.on('call-ended-from-popout', handleCallEnded);
    }
    
    return () => {
      cleanupClosed?.();
      if ((window as any).ipcRenderer) {
        (window as any).ipcRenderer.removeListener('call-ended-from-popout', handleCallEnded);
      }
    };
  }, [isElectron, endCurrentCall]);

  // Hide in-app view when popped out
  useEffect(() => {
    setShowInApp(!isPoppedOut);
  }, [isPoppedOut]);

  if (!activeCall || !user) return null;
  
  // If popped out in Electron, don't render in-app window
  if (isElectron && isPoppedOut) {
    return null;
  }

  const participantName = user.email?.split('@')[0] || 'User';
  const roomName = `call-${activeCall.conversationId}`;

  return (
    <ResizableCallWindow
      onClose={endCurrentCall}
      title={activeCall.conversationName}
      minWidth={280}
      minHeight={200}
      maxWidth={1400}
      maxHeight={900}
      defaultWidth={640}
      defaultHeight={480}
      roomName={roomName}
      participantName={participantName}
      isVideo={activeCall.isVideo}
      isHost={activeCall.isCaller}
    >
      <HybridCallRoom
        roomName={roomName}
        participantName={participantName}
        onDisconnect={endCurrentCall}
        initialVideo={activeCall.isVideo}
        initialAudio={true}
        isHost={activeCall.isCaller}
      />
    </ResizableCallWindow>
  );
};
