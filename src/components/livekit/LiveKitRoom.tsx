import { useEffect, useRef, useState } from "react";
import { Track } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, Users, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveKit } from "@/hooks/useLiveKit";

interface ParticipantProps {
  identity: string;
  name?: string;
  isLocal: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  videoTrack?: Track;
  screenShareTrack?: Track;
}

interface LiveKitRoomProps {
  roomName: string;
  participantName: string;
  onDisconnect: () => void;
  className?: string;
  initialVideo: boolean;
  initialAudio: boolean;
}

export function LiveKitRoom({
  roomName,
  participantName,
  onDisconnect,
  className,
  initialVideo,
  initialAudio,
}: LiveKitRoomProps) {
  const {
    isConnecting,
    error,
    localParticipant,
    remoteParticipants,
    connect,
    disconnect,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    isScreenSharing,
    isMuted,
    isCameraOff,
  } = useLiveKit();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localScreenRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const remoteScreenRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [hasConnected, setHasConnected] = useState(false);

  // Connect on mount - only once
  useEffect(() => {
    if (!hasConnected) {
      setHasConnected(true);
      connect(roomName, participantName, initialVideo, initialAudio);
    }

    return () => {
      disconnect();
    };
  }, [roomName, participantName, initialVideo, initialAudio]); // Removed connect/disconnect from deps to prevent reconnection loops

  // Attach local video track
  useEffect(() => {
    if (!localParticipant?.videoTrack || !localVideoRef.current || isCameraOff) {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      return;
    }

    const track = localParticipant.videoTrack;
    if (track && "attach" in track) {
      track.attach(localVideoRef.current);
    }

    return () => {
      if (track && "detach" in track && localVideoRef.current) {
        track.detach(localVideoRef.current);
      }
    };
  }, [localParticipant?.videoTrack, isCameraOff]);

  // Attach local screen share track
  useEffect(() => {
    if (!localParticipant?.screenShareTrack || !localScreenRef.current) {
      return;
    }

    const track = localParticipant.screenShareTrack;
    if (track && "attach" in track) {
      track.attach(localScreenRef.current);
    }

    return () => {
      if (track && "detach" in track && localScreenRef.current) {
        track.detach(localScreenRef.current);
      }
    };
  }, [localParticipant?.screenShareTrack]);

  // Attach remote video tracks
  useEffect(() => {
    remoteParticipants.forEach((participant) => {
      // Attach camera video
      const videoEl = remoteVideoRefs.current.get(participant.identity);
      if (participant.videoTrack && videoEl && !participant.isCameraOff) {
        const track = participant.videoTrack;
        if (track && "attach" in track) {
          track.attach(videoEl);
        }
      } else if (videoEl) {
        videoEl.srcObject = null;
      }

      // Attach screen share
      const screenEl = remoteScreenRefs.current.get(participant.identity);
      if (participant.screenShareTrack && screenEl) {
        const track = participant.screenShareTrack;
        if (track && "attach" in track) {
          track.attach(screenEl);
        }
      }
    });

    // Cleanup: detach tracks for participants that left
    return () => {
      remoteVideoRefs.current.forEach((videoEl, identity) => {
        const participant = remoteParticipants.find(p => p.identity === identity);
        if (!participant && videoEl.srcObject) {
          videoEl.srcObject = null;
        }
      });
    };
  }, [remoteParticipants]);

  const handleDisconnect = () => {
    disconnect();
    onDisconnect();
  };

  const setRemoteVideoRef = (identity: string, el: HTMLVideoElement | null) => {
    if (el) {
      remoteVideoRefs.current.set(identity, el);
    } else {
      remoteVideoRefs.current.delete(identity);
    }
  };

  const setRemoteScreenRef = (identity: string, el: HTMLVideoElement | null) => {
    if (el) {
      remoteScreenRefs.current.set(identity, el);
    } else {
      remoteScreenRefs.current.delete(identity);
    }
  };

  if (isConnecting) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-background", className)}>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Connecting to room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-background", className)}>
        <div className="text-center space-y-4">
          <p className="text-destructive">Connection error: {error}</p>
          <Button onClick={() => {
            setHasConnected(false);
            connect(roomName, participantName, initialVideo, initialAudio);
          }}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Check if anyone is screen sharing
  const remoteScreenShare = remoteParticipants.find(p => p.screenShareTrack);
  const screenShareParticipant = remoteScreenShare 
    ? { ...remoteScreenShare, isLocal: false as const }
    : (localParticipant?.screenShareTrack ? { ...localParticipant, isLocal: true as const } : null);

  const allParticipants: ParticipantProps[] = [
    ...(localParticipant
      ? [
          {
            ...localParticipant,
            isLocal: true,
            isCameraOff: isCameraOff,
            isMuted: isMuted,
          },
        ]
      : []),
    ...remoteParticipants.map((p) => ({ ...p, isLocal: false })),
  ];

  const gridCols =
    allParticipants.length <= 1
      ? "grid-cols-1"
      : allParticipants.length <= 4
        ? "grid-cols-2"
        : allParticipants.length <= 9
          ? "grid-cols-3"
          : "grid-cols-4";

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Screen Share Display - takes priority when active */}
      {screenShareParticipant && (
        <div className="flex-1 p-2 bg-black relative">
          <video
            ref={screenShareParticipant.isLocal ? localScreenRef : (el) => setRemoteScreenRef(screenShareParticipant.identity, el)}
            autoPlay
            playsInline
            muted={screenShareParticipant.isLocal}
            className="w-full h-full object-contain"
          />
          <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded text-white text-sm">
            {screenShareParticipant.name} is sharing screen
          </div>
        </div>
      )}

      {/* Participants Grid */}
      <div className={cn(
        "p-4 grid gap-4",
        gridCols,
        screenShareParticipant ? "h-32 flex-shrink-0" : "flex-1"
      )}>
        {allParticipants.map((participant) => (
          <div
            key={participant.identity}
            className={cn(
              "relative rounded-xl overflow-hidden bg-muted aspect-video",
              participant.isSpeaking && "ring-2 ring-primary",
            )}
          >
            {/* Show avatar if camera is off */}
            {participant.isCameraOff || !participant.videoTrack ? (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Avatar className="h-16 w-16 md:h-20 md:w-20">
                  <AvatarFallback className="text-xl md:text-2xl">
                    {participant.name?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
            ) : (
              <video
                ref={participant.isLocal ? localVideoRef : (el) => setRemoteVideoRef(participant.identity, el)}
                autoPlay
                playsInline
                muted={participant.isLocal}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* Participant overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
              <div className="flex items-center justify-between">
                <span className="text-white text-xs md:text-sm font-medium truncate">
                  {participant.name} {participant.isLocal && "(You)"}
                </span>
                <div className="flex items-center gap-1">
                  {participant.isMuted && <MicOff className="h-3 w-3 md:h-4 md:w-4 text-red-400" />}
                  {participant.isCameraOff && <VideoOff className="h-3 w-3 md:h-4 md:w-4 text-red-400" />}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center justify-center gap-3 md:gap-4">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="h-10 w-10 md:h-12 md:w-12 rounded-full"
            onClick={toggleMute}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="h-4 w-4 md:h-5 md:w-5" /> : <Mic className="h-4 w-4 md:h-5 md:w-5" />}
          </Button>

          <Button
            variant={isCameraOff ? "destructive" : "secondary"}
            size="icon"
            className="h-10 w-10 md:h-12 md:w-12 rounded-full"
            onClick={toggleCamera}
            title={isCameraOff ? "Turn on camera" : "Turn off camera"}
          >
            {isCameraOff ? <VideoOff className="h-4 w-4 md:h-5 md:w-5" /> : <Video className="h-4 w-4 md:h-5 md:w-5" />}
          </Button>

          <Button
            variant={isScreenSharing ? "default" : "secondary"}
            size="icon"
            className="h-10 w-10 md:h-12 md:w-12 rounded-full"
            onClick={toggleScreenShare}
            title={isScreenSharing ? "Stop sharing" : "Share screen"}
          >
            {isScreenSharing ? <MonitorOff className="h-4 w-4 md:h-5 md:w-5" /> : <Monitor className="h-4 w-4 md:h-5 md:w-5" />}
          </Button>

          <Button 
            variant="destructive" 
            size="icon" 
            className="h-10 w-10 md:h-12 md:w-12 rounded-full" 
            onClick={handleDisconnect}
            title="End call"
          >
            <PhoneOff className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>

        {/* Participant count */}
        <div className="flex items-center justify-center gap-2 mt-3 text-muted-foreground text-sm">
          <Users className="h-4 w-4" />
          <span>
            {allParticipants.length} participant{allParticipants.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
