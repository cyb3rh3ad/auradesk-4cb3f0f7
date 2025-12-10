import { useEffect, useRef } from "react";
import { Track } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Users,
  PhoneOff, // Uporaba PhoneOff za prekinitev klica
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveKit } from "@/hooks/useLiveKit"; // Uvoz hooka

// Dodajanje ParticipantProps za bolj natančno tipizacijo
interface ParticipantProps {
  identity: string;
  name?: string;
  isLocal: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  videoTrack?: Track;
  // Dodajte isScreenSharing, če ga hook vrača
}

interface LiveKitRoomProps {
  roomName: string;
  participantName: string;
  onDisconnect: () => void;
  className?: string;
}

export function LiveKitRoom({ roomName, participantName, onDisconnect, className }: LiveKitRoomProps) {
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
    isScreenSharing, // Vzeto direktno iz hooka
    isMuted, // Vzeto direktno iz hooka
    isCameraOff, // Vzeto direktno iz hooka
  } = useLiveKit();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Connect on mount
  useEffect(() => {
    connect(roomName, participantName);

    // VZROK POPRAVKA: Ta klic return() mora poklicati funkcijo disconnect() v useLiveKit,
    // ki vključuje KRITIČNI POPRAVEK track.stop().
    return () => {
      disconnect();
    };
  }, [roomName, participantName, connect, disconnect]); // Dodane odvisnosti 'connect' in 'disconnect'

  // Attach local video
  useEffect(() => {
    // Preverimo tudi, da kamera ni izklopljena (isCameraOff) in da video track obstaja
    if (localParticipant?.videoTrack && localVideoRef.current && !isCameraOff) {
      const track = localParticipant.videoTrack;
      if ("attach" in track) {
        track.attach(localVideoRef.current);
      }
    }

    return () => {
      if (localParticipant?.videoTrack && localVideoRef.current) {
        const track = localParticipant.videoTrack;
        if ("detach" in track) {
          track.detach(localVideoRef.current);
        }
      }
    };
  }, [localParticipant?.videoTrack, isCameraOff]); // Dodan isCameraOff kot odvisnost

  // Attach remote videos
  useEffect(() => {
    remoteParticipants.forEach((participant) => {
      const videoEl = remoteVideoRefs.current.get(participant.identity);
      if (participant.videoTrack && videoEl) {
        const track = participant.videoTrack;
        if ("attach" in track) {
          track.attach(videoEl);
        }
      }
    });
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

  if (isConnecting) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-background", className)}>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Povezovanje v sobo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center justify-center h-full bg-background", className)}>
        <div className="text-center space-y-4">
          <p className="text-destructive">Napaka pri povezovanju: {error}</p>
          <Button onClick={() => connect(roomName, participantName)}>Poskusi ponovno</Button>
        </div>
      </div>
    );
  }

  // Združevanje lokalnih in oddaljenih udeležencev
  const allParticipants: ParticipantProps[] = [
    // KLJUČNO: lokalni udeleženec dobi isCameraOff in isMuted stanja direktno iz hooka
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
      {/* Participants Grid */}
      <div className={cn("flex-1 p-4 grid gap-4", gridCols)}>
        {allParticipants.map((participant) => (
          <div
            key={participant.identity}
            className={cn(
              "relative rounded-xl overflow-hidden bg-muted",
              participant.isSpeaking && "ring-2 ring-primary",
            )}
          >
            {/* Prikaz avatara, če je kamera izklopljena ali video track ne obstaja */}
            {participant.isCameraOff || !participant.videoTrack ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-2xl">
                    {participant.name?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
            ) : (
              <video
                ref={participant.isLocal ? localVideoRef : (el) => setRemoteVideoRef(participant.identity, el)}
                autoPlay
                playsInline
                muted={participant.isLocal} // Utišaj lokalni video
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* Participant overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium truncate">
                  {participant.name} {participant.isLocal && "(You)"}
                </span>
                <div className="flex items-center gap-1">
                  {participant.isMuted && <MicOff className="h-4 w-4 text-red-400" />}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center justify-center gap-4">
          {/* Gumb za mikrofon */}
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          {/* Gumb za kamero */}
          <Button
            variant={isCameraOff ? "destructive" : "secondary"}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={toggleCamera}
          >
            {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>

          {/* Gumb za deljenje zaslona */}
          <Button
            variant={isScreenSharing ? "default" : "secondary"}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={toggleScreenShare}
          >
            {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          </Button>

          {/* Gumb za prekinitev klica */}
          <Button variant="destructive" size="icon" className="h-12 w-12 rounded-full" onClick={handleDisconnect}>
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>

        {/* Število udeležencev */}
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
