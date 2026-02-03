import { WebRTCRoom } from "@/components/webrtc/WebRTCRoom";

type PiPMode = 'mini' | 'small' | 'medium' | 'full';

export interface HybridCallRoomProps {
  roomName: string;
  participantName: string;
  onDisconnect: () => void;
  className?: string;
  initialVideo?: boolean;
  initialAudio?: boolean;
  isHost?: boolean;
  pipMode?: PiPMode;
}

/**
 * HybridCallRoom - Pure P2P WebRTC with TURN fallback
 * Free, no external dependencies, 5 person limit
 * Uses OpenRelay TURN servers for NAT traversal when needed
 */
export function HybridCallRoom({
  roomName,
  participantName,
  onDisconnect,
  className,
  initialVideo = true,
  initialAudio = true,
  isHost = false,
  pipMode = 'full',
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
      pipMode={pipMode}
    />
  );
}
