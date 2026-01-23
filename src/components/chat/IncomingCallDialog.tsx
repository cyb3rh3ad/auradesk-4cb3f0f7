import { useEffect, useState, useRef } from 'react';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video, Volume2, GripHorizontal } from 'lucide-react';
import { getModernRingtone } from '@/utils/ringtone';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface IncomingCallDialogProps {
  open: boolean;
  callerName: string;
  callerAvatar?: string | null;
  isVideo: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallDialog = ({ 
  open, 
  callerName, 
  callerAvatar, 
  isVideo, 
  onAccept, 
  onDecline 
}: IncomingCallDialogProps) => {
  const isMobile = useIsMobile();
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Calculate centered position - drop from top on mobile
  const getCenteredPosition = () => {
    const width = Math.min(320, window.innerWidth - 32);
    const centerX = (window.innerWidth - width) / 2;
    // On mobile, position near top with safe area; on desktop, center vertically
    const topY = isMobile 
      ? Math.max(16, parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0') + 16)
      : Math.max(20, (window.innerHeight - 400) / 2);
    return { x: Math.max(16, centerX), y: topY };
  };

  // Initialize position when dialog opens
  useEffect(() => {
    if (open && !isInitialized) {
      setPosition(getCenteredPosition());
      setIsInitialized(true);
    }
    if (!open) {
      setIsInitialized(false);
    }
  }, [open, isInitialized, isMobile]);

  // Play ringtone when dialog opens
  useEffect(() => {
    if (!open) return;

    let intervalId: NodeJS.Timeout | null = null;
    const ringtoneUrl = getModernRingtone();
    
    const playRing = async () => {
      try {
        const audio = new Audio(ringtoneUrl);
        audio.volume = 0.6;
        await audio.play();
        setAudioBlocked(false);
      } catch (e) {
        console.log('Ringtone blocked by browser:', e);
        setAudioBlocked(true);
      }
    };

    playRing();
    intervalId = setInterval(playRing, 2000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [open]);

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragStartRef.current = { x: clientX, y: clientY };
    positionRef.current = position;
  };

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;
      
      const dialogWidth = dragRef.current?.offsetWidth || 320;
      const dialogHeight = dragRef.current?.offsetHeight || 400;
      
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
  }, [isDragging]);

  const handleUnblockAudio = async () => {
    try {
      const ringtoneUrl = getModernRingtone();
      const audio = new Audio(ringtoneUrl);
      audio.volume = 0.6;
      await audio.play();
      setAudioBlocked(false);
    } catch (e) {
      console.log('Still blocked:', e);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[99998]"
        onClick={onDecline}
      />
      
      {/* Dialog */}
      <div
        ref={dragRef}
        className={cn(
          "fixed z-[99999] rounded-2xl overflow-hidden shadow-2xl border border-border bg-card",
          "w-[calc(100vw-2rem)] max-w-[320px]",
          isDragging && "cursor-grabbing select-none",
          // Animation - drop from top on mobile
          isMobile ? "animate-in slide-in-from-top-4 duration-300" : "animate-in fade-in zoom-in-95 duration-200"
        )}
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {/* Drag handle */}
        <div
          className="h-8 bg-muted/80 backdrop-blur-sm flex items-center justify-center cursor-grab border-b border-border/50 touch-none"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <GripHorizontal className="w-5 h-5 text-muted-foreground" />
        </div>

        <VisuallyHidden.Root>
          <h2>Incoming call from {callerName}</h2>
          <p>Accept or decline the {isVideo ? 'video' : 'voice'} call</p>
        </VisuallyHidden.Root>
        
        <div className="p-6 flex flex-col items-center text-center space-y-5">
          {/* Audio blocked indicator */}
          {audioBlocked && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute top-10 right-2 text-muted-foreground z-10"
              onClick={handleUnblockAudio}
            >
              <Volume2 className="w-4 h-4 mr-1" />
              Enable sound
            </Button>
          )}

          {/* Caller Avatar with pulsing ring animation */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <div className="absolute inset-[-8px] rounded-full border-2 border-primary/30 animate-pulse" />
            <Avatar className="w-20 h-20 relative ring-4 ring-primary/20">
              <AvatarImage src={callerAvatar || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xl">
                {getInitials(callerName)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Caller Info */}
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">{callerName}</h3>
            <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
              {isVideo ? (
                <>
                  <Video className="w-4 h-4" />
                  <span>Incoming video call...</span>
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  <span>Incoming voice call...</span>
                </>
              )}
            </p>
          </div>

          {/* Action Buttons - Large touch targets */}
          <div className="flex items-center justify-center gap-6 pt-2 w-full">
            <Button
              variant="ghost"
              size="icon"
              className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-full bg-destructive/20 hover:bg-destructive/40 text-destructive transition-all hover:scale-105 active:scale-95 touch-manipulation"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDecline();
              }}
            >
              <PhoneOff className="w-7 h-7" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-full bg-green-500 hover:bg-green-400 text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-green-500/30 touch-manipulation"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAccept();
              }}
            >
              {isVideo ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
