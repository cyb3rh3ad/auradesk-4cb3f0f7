import { useEffect, useRef } from "react";
import { Track } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveKit } from "@/hooks/useLiveKit";

export interface LiveKitRoomProps {
  roomName: string;
  participantName: string;
  onDisconnect: () => void;
  className?: string;
  initialVideo?: boolean;
  initialAudio?: boolean;
}

export function LiveKitRoom({ 
  roomName, 
  participantName, 
  onDisconnect, 
  className,
  initialVideo = true,
  initialAudio = true 
}: LiveKitRoomProps) {
  const {
    isConnecting,
    isConnected,
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
    screenShareParticipant,
  } = useLiveKit();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Connect on mount
  useEffect(() => {
    connect(roomName, participantName, initialVideo, initialAudio);

    return () => {
      disconnect();
    };
  }, [roomName, participantName, connect, disconnect, initialVideo, initialAudio]);

  // Attach local video track
  useEffect(() => {
    if (localVideoRef.current && localParticipant?.videoTrack) {
      const track = localParticipant.videoTrack;
      if ('attach' in track) {
        track.attach(localVideoRef.current);
        return () => {
          track.detach(localVideoRef.current!);
        };
      }
    }
  }, [localParticipant?.videoTrack]);

  // Attach screen share track
  useEffect(() => {
    if (screenShareRef.current && screenShareParticipant?.screenShareTrack) {
      const track = screenShareParticipant.screenShareTrack;
      if ('attach' in track) {
        track.attach(screenShareRef.current);
        return () => {
          track.detach(screenShareRef.current!);
        };
      }
    }
  }, [screenShareParticipant?.screenShareTrack]);

  // Attach remote video tracks
  useEffect(() => {
    remoteParticipants.forEach((participant) => {
      const videoEl = remoteVideoRefs.current.get(participant.identity);
      if (videoEl && participant.videoTrack && 'attach' in participant.videoTrack) {
        participant.videoTrack.attach(videoEl);
      }
    });

    return () => {
      remoteParticipants.forEach((participant) => {
        const videoEl = remoteVideoRefs.current.get(participant.identity);
        if (videoEl && participant.videoTrack && 'detach' in participant.videoTrack) {
          participant.videoTrack.detach(videoEl);
        }
      });
    };
  }, [remoteParticipants]);

  const setRemoteVideoRef = (id: string, el: HTMLVideoElement | null) => {
    if (el) {
      remoteVideoRefs.current.set(id, el);
    } else {
      remoteVideoRefs.current.delete(id);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-background text-destructive p-4">
        <p>Connection error: {error}</p>
      </div>
    );
  }

  if (isConnecting || !isConnected) {
    return (
      <div className="flex items-center justify-center h-full bg-background text-foreground p-4">
        <p>Connecting to call...</p>
      </div>
    );
  }

  const allParticipants = [localParticipant, ...remoteParticipants].filter(Boolean);
  const numParticipants = allParticipants.length;
  
  let gridCols = "grid-cols-1";
  if (numParticipants === 2) {
    gridCols = "md:grid-cols-2 grid-cols-1";
  } else if (numParticipants <= 4) {
    gridCols = "md:grid-cols-2 grid-cols-1";
  } else {
    gridCols = "md:grid-cols-3 grid-cols-2";
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Screen share display */}
      {screenShareParticipant && (
        <div className="flex-1 p-2 bg-muted relative min-h-0">
          <video
            ref={screenShareRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          <div className="absolute top-2 left-2 px-2 py-1 bg-background/70 rounded text-foreground text-sm">
            {screenShareParticipant.name} is sharing screen
          </div>
        </div>
      )}

      {/* Participants grid */}
      <div
        className={cn(
          "p-4 grid gap-4",
          gridCols,
          screenShareParticipant ? "h-32 flex-shrink-0" : "flex-1"
        )}
      >
        {allParticipants.map((participant) => {
          if (!participant) return null;
          
          const isLocal = participant.identity === localParticipant?.identity;
          const hasVideo = participant.videoTrack && !participant.isCameraOff;
          const displayName = isLocal ? "You" : participant.name || participant.identity;

          return (
            <div
              key={participant.identity}
              className={cn(
                "relative rounded-xl overflow-hidden bg-muted border-2 aspect-video",
                participant.isSpeaking ? "border-green-500" : "border-border",
                isLocal && "order-first"
              )}
            >
              {/* Video display */}
              {isLocal && hasVideo && (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}

              {!isLocal && hasVideo && (
                <video
                  ref={(el) => setRemoteVideoRef(participant.identity, el)}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}

              {/* Avatar when camera off */}
              {!hasVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <Avatar className="h-16 w-16 md:h-20 md:w-20">
                    <AvatarFallback className="text-xl md:text-2xl">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}

              {/* Name label */}
              <div className="absolute top-2 left-2 px-2 py-1 bg-background/70 rounded text-foreground text-sm">
                {displayName}
              </div>

              {/* Status icons */}
              <div className="absolute top-2 right-2 flex gap-1">
                {participant.isMuted && (
                  <MicOff className="h-6 w-6 text-red-500 bg-background/70 p-1 rounded-full" />
                )}
                {participant.isCameraOff && (
                  <VideoOff className="h-6 w-6 text-red-500 bg-background/70 p-1 rounded-full" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2 p-4 bg-muted border-t border-border">
        <Button 
          onClick={toggleMute} 
          variant={isMuted ? "destructive" : "secondary"}
          size="icon"
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button 
          onClick={toggleCamera} 
          variant={isCameraOff ? "destructive" : "secondary"}
          size="icon"
        >
          {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>

        <Button 
          onClick={toggleScreenShare} 
          variant={isScreenSharing ? "default" : "secondary"}
          size="icon"
        >
          {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
        </Button>

        <Button onClick={onDisconnect} variant="destructive" size="icon">
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}