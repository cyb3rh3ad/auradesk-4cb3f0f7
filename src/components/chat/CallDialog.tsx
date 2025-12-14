import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { LiveKitRoom } from "@/components/livekit/LiveKitRoom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
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
      const { data } = await supabase.from("profiles").select("full_name, username, email").eq("id", user.id).single();
      if (data) {
        setUserName(data.full_name || data.username || data.email || "User");
      }
    };
    fetchProfile();
  }, [user]);

  if (!user) return null;

  // Generate unique room name based on conversation
  const roomName = `call-${conversationId}`;

  return (
    <Dialog open={open}>
      <DialogContent className="p-0 border-none overflow-hidden max-w-4xl w-full h-[80vh] bg-background">
        <VisuallyHidden.Root>
          <DialogTitle>Call with {conversationName}</DialogTitle>
        </VisuallyHidden.Root>
        <LiveKitRoom 
          roomName={roomName} 
          participantName={userName} 
          onDisconnect={onClose} 
          className="h-full"
          initialVideo={initialVideo}
          initialAudio={true}
          isHost={isCaller}
        />
      </DialogContent>
    </Dialog>
  );
};
