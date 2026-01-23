import { useState, useRef, useEffect } from "react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { HybridCallRoom } from "@/components/call/HybridCallRoom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { GripHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface CallDialogProps {
  open: boolean;
  onClose: () => void;
  conversationName: string;
  conversationId: string;
  initialVideo: boolean;
  isCaller?: boolean;
}

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
  const [userName, setUserName] = useState<string>("User");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasUserMoved, setHasUserMoved] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });

  // Calculate centered position - on mobile, position near top; on desktop, center
  const getCenteredPosition = () => {
    const width = isMobile ? window.innerWidth : Math.min(800, window.innerWidth * 0.9);
    const height = isMobile ? window.innerHeight : Math.min(600, window.innerHeight * 0.8);
    const centerX = isMobile ? 0 : (window.innerWidth - width) / 2;
    // On mobile, start from safe area top; on desktop, center vertically
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
    }
  }, [open, isInitialized, isMobile]);

  // Re-center on window resize if user hasn't moved the dialog
  useEffect(() => {
    if (!open || hasUserMoved) return;

    const handleResize = () => {
      setPosition(getCenteredPosition());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open, hasUserMoved, isMobile]);

  // Fetch user profile name
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, username, email")
        .eq("id", user.id)
        .single();
      if (data) {
        setUserName(data.full_name || data.username || data.email || "User");
      }
    };
    fetchProfile();
  }, [user]);

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
      
      const dialogWidth = dragRef.current?.offsetWidth || (isMobile ? window.innerWidth : 800);
      const dialogHeight = dragRef.current?.offsetHeight || (isMobile ? window.innerHeight : 600);
      
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
  }, [isDragging, isMobile]);

  if (!user || !open) return null;

  // Generate unique room name based on conversation
  const roomName = `call-${conversationId}`;

  return (
    <div
      ref={dragRef}
      className={cn(
        "fixed z-[9999] overflow-hidden shadow-2xl border border-border bg-background",
        isMobile ? "rounded-none inset-0" : "rounded-xl",
        isDragging && "cursor-grabbing select-none",
        // Animation - slide from top on mobile
        isMobile ? "animate-in slide-in-from-top duration-300" : ""
      )}
      style={isMobile ? {
        // Full screen on mobile with safe areas
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      } : {
        left: position.x,
        top: position.y,
        width: "min(800px, 90vw)",
        height: "min(600px, 80vh)",
      }}
    >
      {/* Drag handle - always visible but only draggable on desktop */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-8 bg-muted/80 backdrop-blur-sm flex items-center justify-center z-10 border-b border-border/50",
          !isMobile && "cursor-grab"
        )}
        style={isMobile ? { marginTop: 'env(safe-area-inset-top)' } : undefined}
        onMouseDown={!isMobile ? handleDragStart : undefined}
        onTouchStart={!isMobile ? handleDragStart : undefined}
      >
        <GripHorizontal className="w-5 h-5 text-muted-foreground" />
        <VisuallyHidden.Root>Call with {conversationName}</VisuallyHidden.Root>
      </div>

      {/* Call room */}
      <div className={cn(
        "h-full",
        isMobile ? "pt-8" : "pt-8"
      )} style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top) + 2rem)' } : undefined}>
        <HybridCallRoom
          roomName={roomName}
          participantName={userName}
          onDisconnect={onClose}
          className="h-full"
          initialVideo={initialVideo}
          initialAudio={true}
          isHost={isCaller}
        />
      </div>
    </div>
  );
};
