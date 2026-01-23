import { useState, useRef, useEffect } from "react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { HybridCallRoom } from "@/components/call/HybridCallRoom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { GripHorizontal, Loader2, Minimize2, Maximize2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

interface CallDialogProps {
  open: boolean;
  onClose: () => void;
  conversationName: string;
  conversationId: string;
  initialVideo: boolean;
  isCaller?: boolean;
}

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
  const [isDragging, setIsDragging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasUserMoved, setHasUserMoved] = useState(false);
  const [pipSize, setPipSize] = useState<PiPSize>('full');
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });

  // Size configurations for PiP modes
  const sizeConfigs = {
    mini: { width: 180, height: 140 },
    small: { width: 320, height: 240 },
    medium: { width: 480, height: 360 },
    full: { width: Math.min(800, window.innerWidth * 0.9), height: Math.min(600, window.innerHeight * 0.8) },
  };

  const currentSize = sizeConfigs[pipSize];

  // Calculate centered position - on mobile, position near top; on desktop, center
  const getCenteredPosition = () => {
    if (pipSize !== 'full') {
      // PiP mode - position in bottom right
      return {
        x: window.innerWidth - currentSize.width - 20,
        y: window.innerHeight - currentSize.height - 100,
      };
    }
    const width = isMobile ? window.innerWidth : Math.min(800, window.innerWidth * 0.9);
    const height = isMobile ? window.innerHeight : Math.min(600, window.innerHeight * 0.8);
    const centerX = isMobile ? 0 : (window.innerWidth - width) / 2;
    const topY = isMobile 
      ? Math.max(0, parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0'))
      : Math.max(20, (window.innerHeight - height) / 2);
    return { x: Math.max(0, centerX), y: topY };
  };

  // Center the dialog on mount
  useEffect(() => {
    if (open && !isInitialized) {
      setPosition(getCenteredPosition());
      setIsInitialized(true);
      setHasUserMoved(false);
    }
    if (!open) {
      setIsInitialized(false);
      setHasUserMoved(false);
      setPipSize('full');
    }
  }, [open, isInitialized, isMobile]);

  // Update position when size changes
  useEffect(() => {
    if (!hasUserMoved && open) {
      setPosition(getCenteredPosition());
    }
  }, [pipSize, hasUserMoved, open]);

  // Re-center on window resize if user hasn't moved the dialog
  useEffect(() => {
    if (!open || hasUserMoved) return;

    const handleResize = () => {
      setPosition(getCenteredPosition());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open, hasUserMoved, isMobile, pipSize]);

  // Fetch user profile name - must complete before joining call
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

  // Handle drag start - supports both mouse and touch
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setHasUserMoved(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragStartRef.current = { x: clientX, y: clientY };
    positionRef.current = position;
  };

  // Handle drag move - supports both mouse and touch
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;
      
      const dialogWidth = pipSize === 'full' 
        ? (isMobile ? window.innerWidth : currentSize.width)
        : currentSize.width;
      const dialogHeight = pipSize === 'full'
        ? (isMobile ? window.innerHeight : currentSize.height)
        : currentSize.height;
      
      const newX = Math.max(0, Math.min(window.innerWidth - dialogWidth, positionRef.current.x + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - dialogHeight, positionRef.current.y + deltaY));
      
      setPosition({ x: newX, y: newY });
    };

    const handleEnd = () => {
      setIsDragging(false);
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
  }, [isDragging, isMobile, pipSize, currentSize]);

  // Cycle through PiP sizes
  const cyclePipSize = () => {
    const sizes: PiPSize[] = ['mini', 'small', 'medium', 'full'];
    const currentIndex = sizes.indexOf(pipSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setPipSize(sizes[nextIndex]);
    setHasUserMoved(false); // Reset position on size change
  };

  // Toggle between full and mini
  const togglePiP = () => {
    if (pipSize === 'full') {
      setPipSize('small');
    } else {
      setPipSize('full');
    }
    setHasUserMoved(false);
  };

  if (!user || !open) return null;

  const isFullScreen = pipSize === 'full' && isMobile;
  const isPiPMode = pipSize !== 'full';

  // Show loading state while fetching name
  if (isLoadingName || !userName) {
    return (
      <div className={cn(
        "fixed z-[9999] overflow-hidden shadow-2xl border border-border bg-background flex items-center justify-center",
        isFullScreen ? "inset-0" : "rounded-xl"
      )} style={isFullScreen ? {} : {
        left: position.x,
        top: position.y,
        width: currentSize.width,
        height: currentSize.height,
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

  return (
    <div
      ref={dragRef}
      className={cn(
        "fixed z-[9999] overflow-hidden shadow-2xl border border-border bg-background transition-all duration-200",
        isFullScreen ? "rounded-none inset-0" : "rounded-xl",
        isDragging && "cursor-grabbing select-none",
        isFullScreen ? "animate-in slide-in-from-top duration-300" : "",
        isPiPMode && "ring-2 ring-primary/30"
      )}
      style={isFullScreen ? {
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      } : {
        left: position.x,
        top: position.y,
        width: currentSize.width,
        height: currentSize.height,
      }}
    >
      {/* Drag handle with PiP controls */}
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
          {isPiPMode && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
              {conversationName}
            </span>
          )}
        </div>
        
        {/* PiP size controls */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className={cn(isPiPMode ? "h-5 w-5" : "h-6 w-6")}
            onClick={(e) => { e.stopPropagation(); cyclePipSize(); }}
            title={`Current: ${pipSize}`}
          >
            {pipSize === 'full' ? (
              <Minimize2 className={cn(isPiPMode ? "h-3 w-3" : "h-4 w-4")} />
            ) : (
              <Maximize2 className={cn(isPiPMode ? "h-3 w-3" : "h-4 w-4")} />
            )}
          </Button>
        </div>
        
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
