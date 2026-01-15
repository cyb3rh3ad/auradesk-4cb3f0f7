import { useState, useRef, useEffect } from "react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { HybridCallRoom } from "@/components/call/HybridCallRoom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { GripHorizontal } from "lucide-react";

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
  const [userName, setUserName] = useState<string>("User");
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasUserMoved, setHasUserMoved] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });

  // Calculate centered position
  const getCenteredPosition = () => {
    const width = Math.min(800, window.innerWidth * 0.9);
    const height = Math.min(600, window.innerHeight * 0.8);
    const centerX = (window.innerWidth - width) / 2;
    const centerY = (window.innerHeight - height) / 2;
    return { x: Math.max(0, centerX), y: Math.max(20, centerY) };
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
  }, [open, isInitialized]);

  // Re-center on window resize if user hasn't moved the dialog
  useEffect(() => {
    if (!open || hasUserMoved) return;

    const handleResize = () => {
      setPosition(getCenteredPosition());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open, hasUserMoved]);

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

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setHasUserMoved(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    positionRef.current = position;
  };

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      
      const newX = Math.max(0, Math.min(window.innerWidth - 800, positionRef.current.x + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, positionRef.current.y + deltaY));
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  if (!user || !open) return null;

  // Generate unique room name based on conversation
  const roomName = `call-${conversationId}`;

  return (
    <div
      ref={dragRef}
      className={cn(
        "fixed z-[9999] rounded-xl overflow-hidden shadow-2xl border border-border bg-background",
        isDragging && "cursor-grabbing select-none"
      )}
      style={{
        left: position.x,
        top: position.y,
        width: "min(800px, 90vw)",
        height: "min(600px, 80vh)",
      }}
    >
      {/* Drag handle */}
      <div
        className="absolute top-0 left-0 right-0 h-8 bg-muted/80 backdrop-blur-sm flex items-center justify-center cursor-grab z-10 border-b border-border/50"
        onMouseDown={handleDragStart}
      >
        <GripHorizontal className="w-5 h-5 text-muted-foreground" />
        <VisuallyHidden.Root>Call with {conversationName}</VisuallyHidden.Root>
      </div>

      {/* Call room */}
      <div className="pt-8 h-full">
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
