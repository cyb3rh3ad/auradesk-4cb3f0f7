import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2,
  GripHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface Participant {
  id: string;
  name: string;
  stream: MediaStream | null;
  isLocal: boolean;
  isSpeaking?: boolean;
}

interface PiPCallWindowProps {
  participants: Participant[];
  localStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onDisconnect: () => void;
  onExpand: () => void;
  isExpanded: boolean;
  speakingParticipantId?: string | null;
}

type WindowSize = 'mini' | 'small' | 'medium' | 'large';

export function PiPCallWindow({
  participants,
  localStream,
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onDisconnect,
  onExpand,
  isExpanded,
  speakingParticipantId,
}: PiPCallWindowProps) {
  const isMobile = useIsMobile();
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [size, setSize] = useState<WindowSize>('small');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 20, y: 20 });
  const sizeRef = useRef({ width: 280, height: 200 });

  // Size configurations
  const sizeConfigs = {
    mini: { width: 160, height: 120 },   // Just active speaker
    small: { width: 280, height: 200 },  // Active speaker + self preview
    medium: { width: 400, height: 300 }, // 2-3 participants visible
    large: { width: 560, height: 420 },  // All participants grid
  };

  const currentSize = sizeConfigs[size];

  // Determine which participants to show based on window size
  const getVisibleParticipants = useCallback(() => {
    const localParticipant = participants.find(p => p.isLocal);
    const remoteParticipants = participants.filter(p => !p.isLocal);
    
    // Find active speaker or default to first remote
    const activeSpeaker = speakingParticipantId 
      ? remoteParticipants.find(p => p.id === speakingParticipantId)
      : remoteParticipants[0];

    switch (size) {
      case 'mini':
        // Only show active speaker (or first remote in 1-on-1)
        return activeSpeaker ? [activeSpeaker] : remoteParticipants.slice(0, 1);
      
      case 'small':
        // Show active speaker + small self preview
        if (activeSpeaker && localParticipant) {
          return [activeSpeaker, { ...localParticipant, isPreview: true }];
        }
        return activeSpeaker ? [activeSpeaker] : remoteParticipants.slice(0, 1);
      
      case 'medium':
        // Show self + active speaker + 1 more
        const mediumList = [];
        if (localParticipant) mediumList.push(localParticipant);
        if (activeSpeaker) mediumList.push(activeSpeaker);
        const otherRemote = remoteParticipants.find(p => p.id !== activeSpeaker?.id);
        if (otherRemote && mediumList.length < 3) mediumList.push(otherRemote);
        return mediumList;
      
      case 'large':
      default:
        // Show all participants
        return participants;
    }
  }, [participants, size, speakingParticipantId]);

  const visibleParticipants = getVisibleParticipants();

  // Initialize position
  useEffect(() => {
    const bottomRight = {
      x: window.innerWidth - currentSize.width - 20,
      y: window.innerHeight - currentSize.height - 100,
    };
    setPosition(bottomRight);
    positionRef.current = bottomRight;
  }, []);

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
      
      const newX = Math.max(0, Math.min(window.innerWidth - currentSize.width, positionRef.current.x + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - currentSize.height, positionRef.current.y + deltaY));
      
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
  }, [isDragging, currentSize]);

  // Cycle through sizes
  const cycleSize = () => {
    const sizes: WindowSize[] = ['mini', 'small', 'medium', 'large'];
    const currentIndex = sizes.indexOf(size);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setSize(sizes[nextIndex]);
  };

  // Grid layout based on visible count
  const getGridClass = () => {
    const count = visibleParticipants.length;
    if (count === 1) return "grid-cols-1";
    if (count === 2) return size === 'small' ? "grid-cols-1" : "grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    return "grid-cols-3";
  };

  if (isExpanded) return null;

  return (
    <div
      ref={dragRef}
      className={cn(
        "fixed z-[9998] rounded-xl overflow-hidden shadow-2xl border-2 border-border bg-background",
        "transition-[width,height] duration-200",
        isDragging && "cursor-grabbing select-none"
      )}
      style={{
        left: position.x,
        top: position.y,
        width: currentSize.width,
        height: currentSize.height,
      }}
    >
      {/* Drag handle */}
      <div
        className="absolute top-0 left-0 right-0 h-6 bg-muted/90 backdrop-blur-sm flex items-center justify-center z-20 cursor-grab touch-none"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <GripHorizontal className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Participants grid */}
      <div className={cn(
        "absolute inset-0 pt-6 pb-10 grid gap-0.5",
        getGridClass()
      )}>
        {visibleParticipants.map((participant, index) => {
          const isPreview = (participant as any).isPreview;
          const isSpeaking = participant.id === speakingParticipantId;
          
          return (
            <div
              key={participant.id}
              className={cn(
                "relative bg-muted overflow-hidden",
                isSpeaking && "ring-2 ring-primary",
                // Small self preview in corner for 'small' size
                isPreview && "absolute bottom-11 right-1 w-16 h-12 rounded-md z-10 border border-border"
              )}
            >
              {participant.stream ? (
                <PiPVideoElement 
                  stream={participant.stream} 
                  muted={participant.isLocal}
                  isLocal={participant.isLocal}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <Avatar className={cn(
                    isPreview ? "h-6 w-6" : (size === 'mini' ? "h-10 w-10" : "h-12 w-12")
                  )}>
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      {participant.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              
              {/* Name label - only if not mini or preview */}
              {!isPreview && size !== 'mini' && (
                <div className="absolute bottom-0.5 left-0.5 px-1 py-0.5 bg-background/70 backdrop-blur-sm rounded text-[9px] text-foreground truncate max-w-[90%]">
                  {participant.isLocal ? "You" : participant.name}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-muted/90 backdrop-blur-sm flex items-center justify-center gap-1.5 px-2 z-20">
        <Button 
          onClick={onToggleMute} 
          variant={isMuted ? "destructive" : "ghost"}
          size="icon"
          className="h-7 w-7"
        >
          {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        </Button>

        <Button 
          onClick={onToggleCamera} 
          variant={isCameraOff ? "destructive" : "ghost"}
          size="icon"
          className="h-7 w-7"
        >
          {isCameraOff ? <VideoOff className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
        </Button>

        <Button 
          onClick={cycleSize}
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          title={`Size: ${size}`}
        >
          {size === 'large' ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>

        <Button 
          onClick={onExpand}
          variant="secondary"
          size="icon"
          className="h-7 w-7"
          title="Expand to full window"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>

        <Button 
          onClick={onDisconnect} 
          variant="destructive"
          size="icon"
          className="h-7 w-7"
        >
          <PhoneOff className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// Simple video element for PiP
function PiPVideoElement({ stream, muted, isLocal }: { stream: MediaStream; muted: boolean; isLocal: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={cn(
        "w-full h-full object-cover",
        isLocal && "transform scale-x-[-1]"
      )}
    />
  );
}
