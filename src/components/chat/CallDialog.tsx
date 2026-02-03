import { useState, useEffect } from "react";
import { HybridCallRoom } from "@/components/call/HybridCallRoom";
import { ResizableCallWindow } from "@/components/call/ResizableCallWindow";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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

  if (!user || !open) return null;

  // Generate unique room name based on conversation
  const roomName = `call-${conversationId}`;

  return (
    <ResizableCallWindow
      onClose={onClose}
      title={`Call with ${conversationName}`}
      defaultWidth={720}
      defaultHeight={540}
      minWidth={320}
      minHeight={240}
      maxWidth={1280}
      maxHeight={960}
    >
      <HybridCallRoom
        roomName={roomName}
        participantName={userName}
        onDisconnect={onClose}
        className="h-full"
        initialVideo={initialVideo}
        initialAudio={true}
        isHost={isCaller}
      />
    </ResizableCallWindow>
  );
};
