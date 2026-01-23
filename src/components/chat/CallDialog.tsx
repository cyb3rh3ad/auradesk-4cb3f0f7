import { useState, useRef, useEffect, useCallback } from "react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { HybridCallRoom } from "@/components/call/HybridCallRoom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { GripHorizontal, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface CallDialogProps {
  open: boolean;
  onClose: () => void;
  conversationName: string;
  conversationId: string;
  initialVideo: boolean;
  isCaller?: boolean;
}

// Minimum and maximum sizes for the call window
const MIN_WIDTH = 280;
const MIN_HEIGHT = 200;
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 900;

// Size thresholds for adaptive content
const SIZE_THRESHOLDS = {
  mini: { maxWidth: 320, maxHeight: 260 },
  small: { maxWidth: 480, maxHeight: 380 },
  medium: { maxWidth: 640, maxHeight: 500 },
};

type PiPSize = 'mini' | 'small' | 'medium' | 'full';

export const CallDialog = ({
  open,
  onClose,
  conversationName,
  conversationId,
  initialVideo,
  isCaller = true,
}: CallDialogProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoadingName, setIsLoadingName] = useState(true);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasUserMoved, setHasUserMoved] = useState(false);
  
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });

  // Determine PiP size based on current dimensions
  const getPiPSize = useCallback((): PiPSize => {
    if (size.width <= SIZE_THRESHOLDS.mini.maxWidth && size.height <= SIZE_THRESHOLDS.mini.maxHeight) {
      return 'mini';
    }
    if (size.width <= SIZE_THRESHOLDS.small.maxWidth && size.height <= SIZE_THRESHOLDS.small.maxHeight) {
      return 'small';
    }
    if (size.width <= SIZE_THRESHOLDS.medium.maxWidth && size.height <= SIZE_THRESHOLDS.medium.maxHeight) {
      return 'medium';
    }
    return 'full';
  }, [size]);

  const pipSize = getPiPSize();
  const isPiPMode = pipSize !== 'full';

  // Get default size based on screen
  const getDefaultSize = useCallback(() => {
    if (isMobile) {
      return { width: window.innerWidth, height: window.innerHeight };
    }
    return { 
      width: Math.min(800, window.innerWidth * 0.9), 
      height: Math.min(600, window.innerHeight * 0.8) 
    };
  }, [isMobile]);

  // Calculate centered position
  const getCenteredPosition = useCallback((currentSize: { width: number; height: number }) => {
    if (isMobile) {
      return { x: 0, y: 0 };
    }
    const centerX = (window.innerWidth - currentSize.width) / 2;
    const centerY = Math.max(20, (window.innerHeight - currentSize.height) / 2);
    return { x: Math.max(0, centerX), y: centerY };
  }, [isMobile]);

  // Initialize on open
  useEffect(() => {
    if (open && !isInitialized) {
      const defaultSize = getDefaultSize();
      setSize(defaultSize);
      setPosition(getCenteredPosition(defaultSize));
      setIsInitialized(true);
      setHasUserMoved(false);
    }
    if (!open) {
      setIsInitialized(false);
      setHasUserMoved(false);
    }
  }, [open, isInitialized, getDefaultSize, getCenteredPosition]);

  // Re-center on window resize if user hasn't moved the dialog
  useEffect(() => {
    if (!open || hasUserMoved || isMobile) return;

    const handleResize = () => {
      const newSize = getDefaultSize();
      setSize(newSize);
      setPosition(getCenteredPosition(newSize));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open, hasUserMoved, isMobile, getDefaultSize, getCenteredPosition]);

  // Fetch user profile name
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setIsLoadingName(false);
        return;
      }
      
      setIsLoadingName(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, username, email")
          .eq("id", user.id)
          .single();
        
        if (data) {
          const name = data.full_name || data.username || data.email?.split('@')[0] || "User";
          setUserName(name);
        } else {
          setUserName(user.email?.split('@')[0] || "User");
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
        setUserName(user.email?.split('@')[0] || "User");
      } finally {
        setIsLoadingName(false);
      }
    };
    
    if (open) {
      fetchProfile();
    }
  }, [user, open]);

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isMobile) return;
    e.preventDefault();
    setIsDragging(true);
    setHasUserMoved(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragStartRef.current = { x: clientX, y: clientY };
    positionRef.current = position;
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, direction: string) => {
    if (isMobile) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setHasUserMoved(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    resizeStartRef.current = { 
      x: clientX, 
      y: clientY, 
      width: size.width, 
      height: size.height,
      posX: position.x,
      posY: position.y,
    };
  };

  // Handle drag/resize move
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      if (isDragging) {
        const deltaX = clientX - dragStartRef.current.x;
        const deltaY = clientY - dragStartRef.current.y;
        
        const newX = Math.max(0, Math.min(window.innerWidth - size.width, positionRef.current.x + deltaX));
        const newY = Math.max(0, Math.min(window.innerHeight - size.height, positionRef.current.y + deltaY));
        
        setPosition({ x: newX, y: newY });
      }
      
      if (isResizing && resizeDirection) {
        const deltaX = clientX - resizeStartRef.current.x;
        const deltaY = clientY - resizeStartRef.current.y;
        
        let newWidth = resizeStartRef.current.width;
        let newHeight = resizeStartRef.current.height;
        let newX = resizeStartRef.current.posX;
        let newY = resizeStartRef.current.posY;
        
        // Handle each resize direction
        if (resizeDirection.includes('e')) {
          newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStartRef.current.width + deltaX));
        }
        if (resizeDirection.includes('w')) {
          const widthDelta = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStartRef.current.width - deltaX)) - resizeStartRef.current.width;
          newWidth = resizeStartRef.current.width + widthDelta;
          newX = resizeStartRef.current.posX - widthDelta;
        }
        if (resizeDirection.includes('s')) {
          newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, resizeStartRef.current.height + deltaY));
        }
        if (resizeDirection.includes('n')) {
          const heightDelta = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, resizeStartRef.current.height - deltaY)) - resizeStartRef.current.height;
          newHeight = resizeStartRef.current.height + heightDelta;
          newY = resizeStartRef.current.posY - heightDelta;
        }
        
        // Clamp position to viewport
        newX = Math.max(0, Math.min(window.innerWidth - newWidth, newX));
        newY = Math.max(0, Math.min(window.innerHeight - newHeight, newY));
        
        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection(null);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, isResizing, resizeDirection, size]);

  if (!user || !open) return null;

  const isFullScreen = isMobile;

  // Show loading state while fetching name
  if (isLoadingName || !userName) {
    return (
      <div className={cn(
        "fixed z-[9999] overflow-hidden shadow-2xl border border-border bg-background flex items-center justify-center",
        isFullScreen ? "inset-0" : "rounded-xl"
      )} style={isFullScreen ? {} : {
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Connecting...</p>
        </div>
      </div>
    );
  }

  // Generate unique room name based on conversation
  const roomName = `call-${conversationId}`;

  // Resize handle component
  const ResizeHandle = ({ direction, className }: { direction: string; className: string }) => (
    <div
      className={cn(
        "absolute z-20 opacity-0 hover:opacity-100 transition-opacity",
        className,
        (isResizing && resizeDirection === direction) && "opacity-100"
      )}
      onMouseDown={(e) => handleResizeStart(e, direction)}
      onTouchStart={(e) => handleResizeStart(e, direction)}
    />
  );

  return (
    <div
      ref={dragRef}
      className={cn(
        "fixed z-[9999] overflow-hidden shadow-2xl border border-border bg-background transition-shadow duration-200",
        isFullScreen ? "rounded-none inset-0" : "rounded-xl",
        (isDragging || isResizing) && "select-none",
        isDragging && "cursor-grabbing",
        isFullScreen ? "animate-in slide-in-from-top duration-300" : "",
        isPiPMode && "ring-2 ring-primary/30"
      )}
      style={isFullScreen ? {
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      } : {
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
    >
      {/* Resize handles - only show on desktop */}
      {!isFullScreen && (
        <>
          {/* Corner handles */}
          <ResizeHandle direction="nw" className="top-0 left-0 w-4 h-4 cursor-nw-resize" />
          <ResizeHandle direction="ne" className="top-0 right-0 w-4 h-4 cursor-ne-resize" />
          <ResizeHandle direction="sw" className="bottom-0 left-0 w-4 h-4 cursor-sw-resize" />
          <ResizeHandle direction="se" className="bottom-0 right-0 w-4 h-4 cursor-se-resize" />
          
          {/* Edge handles */}
          <ResizeHandle direction="n" className="top-0 left-4 right-4 h-2 cursor-n-resize" />
          <ResizeHandle direction="s" className="bottom-0 left-4 right-4 h-2 cursor-s-resize" />
          <ResizeHandle direction="w" className="left-0 top-4 bottom-4 w-2 cursor-w-resize" />
          <ResizeHandle direction="e" className="right-0 top-4 bottom-4 w-2 cursor-e-resize" />
        </>
      )}

      {/* Drag handle */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 bg-muted/80 backdrop-blur-sm flex items-center justify-between z-10 border-b border-border/50 px-2",
          isPiPMode ? "h-7" : "h-8",
          !isFullScreen && "cursor-grab"
        )}
        style={isFullScreen ? { marginTop: 'env(safe-area-inset-top)' } : undefined}
        onMouseDown={!isFullScreen ? handleDragStart : undefined}
        onTouchStart={!isFullScreen ? handleDragStart : undefined}
      >
        <div className="flex items-center gap-1">
          <GripHorizontal className={cn("text-muted-foreground", isPiPMode ? "w-4 h-4" : "w-5 h-5")} />
          <span className={cn(
            "text-muted-foreground truncate",
            isPiPMode ? "text-[10px] max-w-[100px]" : "text-xs max-w-[200px]"
          )}>
            {conversationName}
          </span>
        </div>
        
        {/* Size indicator */}
        {!isFullScreen && (
          <span className="text-[10px] text-muted-foreground/60">
            {size.width}×{size.height}
          </span>
        )}
        
        <VisuallyHidden.Root>Call with {conversationName}</VisuallyHidden.Root>
      </div>

      {/* Call room */}
      <div className={cn(
        "h-full",
        isPiPMode ? "pt-7" : "pt-8"
      )} style={isFullScreen ? { paddingTop: 'calc(env(safe-area-inset-top) + 2rem)' } : undefined}>
        <HybridCallRoom
          roomName={roomName}
          participantName={userName}
          onDisconnect={onClose}
          className="h-full"
          initialVideo={initialVideo}
          initialAudio={true}
          isHost={isCaller}
          isPiPMode={isPiPMode}
          pipSize={pipSize}
        />
      </div>
    </div>
  );
};
