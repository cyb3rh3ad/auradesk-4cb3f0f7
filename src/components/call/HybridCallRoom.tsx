import { JitsiRoom } from "@/components/jitsi/JitsiRoom";

export interface HybridCallRoomProps {
  roomName: string;
  participantName: string;
  onDisconnect: () => void;
  className?: string;
  initialVideo?: boolean;
  initialAudio?: boolean;
  isHost?: boolean;
}

/**
 * HybridCallRoom - Now uses Jitsi Meet for all calls
 *
 * Jitsi Meet is completely free, open-source, and supports
 * up to 75 participants with no API key required.
 */
export function HybridCallRoom({
  roomName,
  participantName,
  onDisconnect,
  className,
  initialVideo = true,
  initialAudio = true,
  isHost = false,
}: HybridCallRoomProps) {
  return (
    <JitsiRoom
      roomId={roomName}
      userName={participantName}
      isVideoCall={initialVideo}
      onLeave={onDisconnect}
      isInitiator={isHost}
    />
  );
}
