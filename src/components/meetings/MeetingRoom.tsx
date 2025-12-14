import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { HybridCallRoom } from "@/components/call/HybridCallRoom";

interface MeetingRoomProps {
  meetingId: string;
  meetingTitle: string;
  initialVideo?: boolean;
  onClose: () => void;
}

export const MeetingRoom = ({ meetingId, meetingTitle, initialVideo = true, onClose }: MeetingRoomProps) => {
  const { user } = useAuth();
  const [userName, setUserName] = useState<string>("User");

  // Fetch profile for display name
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

  if (!user) return null;

  // Generate unique room name based on meeting
  const roomName = `meeting-${meetingId}`;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold">{meetingTitle}</h3>
      </div>

      {/* Hybrid Room - uses WebRTC for small groups, LiveKit for larger */}
      <HybridCallRoom
        roomName={roomName}
        participantName={userName}
        onDisconnect={onClose}
        className="flex-1"
        initialVideo={initialVideo}
        initialAudio={true}
        isHost={true}
      />
    </div>
  );
};
