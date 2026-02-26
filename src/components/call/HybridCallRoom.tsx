import { LiveKitCallRoom } from "@/components/call/LiveKitCallRoom";

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
 * HybridCallRoom - Now powered by LiveKit Cloud
 * Handles all STUN/TURN/connectivity automatically via LiveKit's infrastructure
 */
export function HybridCallRoom({
  roomName,
  participantName,
  onDisconnect,
  className,
  initialVideo = false,
  initialAudio = true,
  isHost = false,
  pipMode = 'full',
}: HybridCallRoomProps) {
  return (
    <LiveKitCallRoom
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
