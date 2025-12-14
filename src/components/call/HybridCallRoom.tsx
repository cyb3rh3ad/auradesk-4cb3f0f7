import { DailyRoom } from "@/components/daily/DailyRoom";

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
 * HybridCallRoom - Now uses Daily.co for all calls
 *
 * Daily.co is a highly reliable, managed video infrastructure
 * that handles all the complexity of WebRTC, TURN servers, and
 * network traversal. No more connection issues!
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
    <DailyRoom
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
