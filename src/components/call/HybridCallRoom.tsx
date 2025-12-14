import { LiveKitRoom } from "@/components/livekit/LiveKitRoom";

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
 * HybridCallRoom - Uses LiveKit SFU for reliable, scalable calls
 * Supports up to 30+ participants with proper host controls
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
    <LiveKitRoom
      roomName={roomName}
      participantName={participantName}
      onDisconnect={onDisconnect}
      className={className}
      initialVideo={initialVideo}
      initialAudio={initialAudio}
      isHost={isHost}
    />
  );
}
