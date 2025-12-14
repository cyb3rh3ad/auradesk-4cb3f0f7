import { WebRTCRoom } from "@/components/webrtc/WebRTCRoom";

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
 * HybridCallRoom
 *
 * For maximum consistency and to avoid LiveKit-related issues,
 * all calls now use the plain WebRTC implementation only.
 * This uses our perfected negotiation + presence-based signaling
 * and avoids splitting users across different backends.
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
    <WebRTCRoom
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
