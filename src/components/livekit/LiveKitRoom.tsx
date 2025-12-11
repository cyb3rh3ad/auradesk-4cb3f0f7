import { useEffect, useRef, useState } from "react";
import { Track } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MicOff, VideoOff, PhoneOff, MonitorOff, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveKit } from "@/hooks/useLiveKit"; // Pravilen uvoz hooka

// Predpostavljam, da je ta definicija propsov pravilna.
interface LiveKitRoomProps {
  roomName: string;
  participantName: string;
  onDisconnect: () => void;
  className?: string;
}

// Glavna komponenta
export function LiveKitRoom({ roomName, participantName, onDisconnect, className }: LiveKitRoomProps) {
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
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  const setRemoteVideoRef = (id: string, el: HTMLVideoElement | null) => {
    if (el) {
      remoteVideoRefs.current.set(id, el);
      // Tukaj bi morala biti logika za pripenjanje/odpenjanje trakov
      // ki se zgodi, ko se ustvari video element
    } else {
      remoteVideoRefs.current.delete(id);
    }
  };

  const [initialVideo, setInitialVideo] = useState(true);
  const [initialAudio, setInitialAudio] = useState(true);

  // Povezava na sobo ob prvem renderiranju (Mount)
  useEffect(() => {
    // 🚩 POPRAVEK: Klic connect s 4 argumenti (vrstica 39)
    connect(roomName, participantName, initialVideo, initialAudio);

    return () => {
      disconnect();
    };
  }, [roomName, participantName, connect, disconnect, initialVideo, initialAudio]);

  // Povezava lokalnega video traku na video element
  useEffect(() => {
    if (localVideoRef.current && localParticipant) {
      const track = localParticipant.getTrack(Track.Source.Camera);
      if (track?.track) {
        // Preverite, ali je trak že pripet, preden ga pripnete
        if (!localVideoRef.current.srcObject) {
          track.track.attach(localVideoRef.current);
        }
        return () => {
          track.track.detach(localVideoRef.current!);
        };
      }
    }
  }, [localParticipant]);

  if (error) {
    return <div className="text-red-500 p-4">Napaka pri povezovanju: {error.message}</div>;
  }

  if (isConnecting || !isConnected) {
    return <div className="p-4 text-white">Povezujem se z LiveKit...</div>;
  }

  // Združitev lokalnega in oddaljenih udeležencev za prikaz v mreži
  const allParticipants = [localParticipant, ...remoteParticipants].filter((p) => p !== null);

  // Izračun števila stolpcev v mreži (za preprost prikaz)
  const numParticipants = allParticipants.length;
  let gridCols;
  if (numParticipants <= 1) {
    gridCols = "grid-cols-1";
  } else if (numParticipants === 2) {
    gridCols = "md:grid-cols-2 grid-cols-1";
  } else if (numParticipants <= 4) {
    gridCols = "md:grid-cols-2 grid-cols-1";
  } else {
    gridCols = "md:grid-cols-3 grid-cols-2";
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* 1. Mreža za skupno rabo zaslona (Screen Share) - prioritetni prikaz */}
      {screenShareParticipant && (
        <div className="flex-1 p-2 bg-black relative">
          {/* OHRANJENO IZ VAŠE KODE ZA SCREEN SHARE (vrstice 225-236) */}
          <video
            // Predvidevam, da imate ustrezno logiko ref za screen share
            ref={(el) => setRemoteVideoRef(screenShareParticipant.identity + "-screen", el)}
            autoPlay
            playsInline
            muted={true}
            className="w-full h-full object-contain"
          />
          <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded text-white text-sm">
            {screenShareParticipant.name || screenShareParticipant.identity} deli zaslon
          </div>
        </div>
      )}

      {/* 2. Mreža udeležencev (Participants Grid) */}
      <div
        className={cn(
          "p-4 grid gap-4",
          gridCols,
          // Določitev velikosti mreže glede na to, ali je deljenje zaslona aktivno
          screenShareParticipant ? "h-32 flex-shrink-0" : "flex-1",
        )}
      >
        {/* 🚩 POPRAVEK SINTAKSE: Prejšnji blok kode se je končal s cn() brez zapiralne oznake </div>
             Ker je zdaj cn() zaprt, nadaljujemo z mapiranjem (vrstica 245) */}

        {allParticipants.map((participant) => {
          // Filtrirajte udeleženca, ki deli zaslon, da se ne prikaže dvakrat kot video
          if (screenShareParticipant && participant.identity === screenShareParticipant.identity) {
            return null;
          }

          const isLocal = participant.identity === localParticipant?.identity;
          const videoTrack = participant.getTrack(Track.Source.Camera);
          const isVideoAvailable = videoTrack && !videoTrack.isMuted;
          const isParticipantCameraOff = isLocal ? isCameraOff : !isVideoAvailable;
          const isParticipantMuted = isLocal ? isMuted : participant.isMuted;
          const participantName = isLocal ? "Vi (Jaz)" : participant.name || participant.identity;

          return (
            <div
              key={participant.identity}
              className={cn(
                "relative rounded-xl overflow-hidden bg-gray-900 border-2 aspect-video",
                participant.isSpeaking ? "border-green-500" : "border-gray-800",
                isLocal ? "order-first" : "",
              )}
            >
              {/* Prikaz videa (Lokalni video) */}
              {isLocal && isVideoAvailable && (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted // Lokalni video mora biti mutiran
                  className="w-full h-full object-cover"
                />
              )}

              {/* Prikaz videa (Oddaljeni video) - če ni lokalni */}
              {!isLocal && isVideoAvailable && (
                <video
                  // Posodobljena ref logika za oddaljene udeležence
                  ref={(el) => setRemoteVideoRef(participant.identity, el)}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}

              {/* Prikaz Avatarja, če je kamera izklopljena */}
              {isParticipantCameraOff && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Avatar className="h-16 w-16 md:h-20 md:w-20">
                    <AvatarFallback className="text-xl md:text-2xl">{participantName.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
              )}

              {/* Statusna vrstica */}
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded text-white text-sm">
                {participantName}
              </div>

              {/* Ikone za status (Mute/Video Off) */}
              {isParticipantMuted && (
                <MicOff className="absolute top-2 right-2 h-6 w-6 text-red-500 bg-black p-1 rounded-full" />
              )}
              {isParticipantCameraOff && (
                <VideoOff className="absolute top-2 right-10 h-6 w-6 text-red-500 bg-black p-1 rounded-full" />
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Kontrole (Controls) */}
      <div className="flex justify-center p-4 bg-gray-800 border-t border-gray-700">
        {/* Toggle Mute */}
        <Button onClick={toggleMute} variant="secondary" className="mx-2">
          {isMuted ? <MicOff className="h-5 w-5" /> : <i className="h-5 w-5" />}
          {!isMuted && "Mute"}
        </Button>

        {/* Toggle Camera */}
        <Button onClick={toggleCamera} variant="secondary" className="mx-2">
          {isCameraOff ? <VideoOff className="h-5 w-5" /> : <i className="h-5 w-5" />}
          {!isCameraOff && "Kamera"}
        </Button>

        {/* Toggle Screen Share */}
        <Button onClick={toggleScreenShare} variant="secondary" className="mx-2">
          {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <i className="h-5 w-5" />}
          {isScreenSharing ? "Ustavi deljenje" : "Deli zaslon"}
        </Button>

        {/* Gumb za prekinitev klica (Disconnect) */}
        {/* Vrstice 277-284 so videti pravilno zaprte (slika image_62fdfa.png) */}
        <Button onClick={onDisconnect} variant="destructive" className="mx-2">
          <PhoneOff className="h-5 w-5 mr-2" />
          Prekini klic
        </Button>
      </div>
    </div>
  );
}
