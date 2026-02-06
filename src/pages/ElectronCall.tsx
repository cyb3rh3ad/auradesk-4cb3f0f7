import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HybridCallRoom } from '@/components/call/HybridCallRoom';
import { Button } from '@/components/ui/button';
import { Pin, PinOff, X, Minus, GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ElectronCall - Standalone page for the pop-out call window in Electron.
 * This runs in a separate BrowserWindow and connects to the same WebRTC room.
 */
export default function ElectronCall() {
  const [searchParams] = useSearchParams();
  const [isPinned, setIsPinned] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const roomName = searchParams.get('roomName') || '';
  const participantName = searchParams.get('participantName') || 'User';
  const conversationName = searchParams.get('conversationName') || 'Call';
  const isVideo = searchParams.get('isVideo') === 'true';
  const isHost = searchParams.get('isHost') === 'true';

  // Get initial always-on-top state
  useEffect(() => {
    const getInitialState = async () => {
      if ((window as any).electronAPI?.getCallAlwaysOnTop) {
        const pinned = await (window as any).electronAPI.getCallAlwaysOnTop();
        setIsPinned(pinned);
      }
    };
    getInitialState();
  }, []);

  const handleTogglePin = async () => {
    if ((window as any).electronAPI?.toggleCallAlwaysOnTop) {
      const newState = await (window as any).electronAPI.toggleCallAlwaysOnTop();
      setIsPinned(newState);
    }
  };

  const handleClose = async () => {
    if ((window as any).electronAPI?.endCall) {
      await (window as any).electronAPI.endCall();
    }
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (!roomName) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">No active call</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden select-none">
      {/* Custom title bar - draggable */}
      <div 
        className="flex items-center justify-between px-2 py-1.5 bg-muted/80 border-b border-border/30"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground truncate max-w-[180px]">
            {conversationName}
          </span>
        </div>
        
        <div 
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Pin toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 rounded-full",
              isPinned && "bg-primary/20 text-primary"
            )}
            onClick={handleTogglePin}
            title={isPinned ? "Unpin from top" : "Pin to top"}
          >
            {isPinned ? (
              <Pin className="h-3.5 w-3.5" />
            ) : (
              <PinOff className="h-3.5 w-3.5" />
            )}
          </Button>
          
          {/* Minimize */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full"
            onClick={handleMinimize}
            title="Minimize"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          
          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleClose}
            title="End call"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Call room - fills remaining space */}
      <div className={cn(
        "flex-1 transition-all duration-200",
        isMinimized && "h-0 overflow-hidden"
      )}>
        <HybridCallRoom
          roomName={roomName}
          participantName={participantName}
          onDisconnect={handleClose}
          initialVideo={isVideo}
          initialAudio={true}
          isHost={isHost}
          pipMode="full"
        />
      </div>
      
      {/* Minimized state - just shows title bar */}
      {isMinimized && (
        <div className="flex-1 flex items-center justify-center p-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMinimize}
            className="gap-2"
          >
            Show Call
          </Button>
        </div>
      )}
    </div>
  );
}
