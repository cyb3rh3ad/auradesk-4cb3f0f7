import { useState, useCallback, useRef, useEffect } from "react";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  LocalParticipant,
  Track,
  RemoteTrack,
  RemoteTrackPublication,
  LocalTrackPublication,
  Participant,
  ConnectionState,
  createLocalTracks, // Dodana za boljšo kontrolo nad tracki
} from "livekit-client";
import { supabase } from "@/integrations/supabase/client";

interface ParticipantState {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  videoTrack?: RemoteTrack | Track;
  audioTrack?: RemoteTrack | Track;
}

interface UseLiveKitReturn {
  room: Room | null;
  isConnecting: boolean;
  // ... ostali vmesnik ostane enak
  localParticipant: ParticipantState | null;
  remoteParticipants: ParticipantState[];
  connect: (roomName: string, participantName: string, initialVideo: boolean, initialAudio: boolean) => Promise<void>; // Spremenjen vmesnik
  disconnect: () => void;
  toggleMute: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  isScreenSharing: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
}

// ... (ParticipantState in UseLiveKitReturn ostanejo enaki) ...

export function useLiveKit(): UseLiveKitReturn {
  // ... (UseState klici ostanejo enaki) ...
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localParticipant, setLocalParticipant] = useState<ParticipantState | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<ParticipantState[]>([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Če želite začeti utišani, nastavite na 'true'
  const [isCameraOff, setIsCameraOff] = useState(false); // Če želite začeti z izklopljeno kamero, nastavite na 'true'
  const roomRef = useRef<Room | null>(null); // ... (updateParticipantState in updateRemoteParticipants ostanejo enaki) ...

  const updateParticipantState = useCallback((participant: Participant, isLocal: boolean) => {
    const audioTrack = participant.getTrackPublication(Track.Source.Microphone);
    const videoTrack = participant.getTrackPublication(Track.Source.Camera);

    const state: ParticipantState = {
      identity: participant.identity,
      name: participant.name || participant.identity,
      isSpeaking: participant.isSpeaking,
      isMuted: audioTrack?.isMuted ?? true,
      isCameraOff: !videoTrack?.isSubscribed || videoTrack?.isMuted || !videoTrack?.track,
      videoTrack: videoTrack?.track ?? undefined,
      audioTrack: audioTrack?.track ?? undefined,
    };

    if (isLocal) {
      setLocalParticipant(state);
      setIsMuted(state.isMuted);
      setIsCameraOff(state.isCameraOff);
    }

    return state;
  }, []);

  const updateRemoteParticipants = useCallback(() => {
    if (!roomRef.current) return;
    const participants: ParticipantState[] = [];
    roomRef.current.remoteParticipants.forEach((participant) => {
      participants.push(updateParticipantState(participant, false));
    });
    setRemoteParticipants(participants);
  }, [updateParticipantState]);

  const connect = useCallback(
    async (roomName: string, participantName: string, initialVideo: boolean, initialAudio: boolean) => {
      setIsConnecting(true);
      setError(null);

      try {
        // Get token from edge function
        const { data, error: tokenError } = await supabase.functions.invoke("livekit-token", {
          body: { roomName, participantName },
        });

        if (tokenError || !data?.token) {
          // KRITIČNO LOGIRANJE
          console.error("Token error details:", tokenError);
          throw new Error(tokenError?.message || "Failed to get LiveKit token from Supabase Edge Function");
        }

        const { token, url } = data; // URL in token prihajata iz Supabase Edge Function!
        // Create and connect room

        const newRoom = new Room({
          adaptiveStream: true,
          dynacast: true, // Če initialVideo/Audio nista nastavljena, LiveKit ne bo zahteval hardware-a takoj
          publishDefaults: {
            videoCodec: "vp8", // Nastavitev kodeka (VP8 je bolj kompatibilen)
          },
          videoCaptureDefaults: {
            resolution: { width: 1280, height: 720, frameRate: 30 },
          },
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        roomRef.current = newRoom;
        setRoom(newRoom); // ... (Event Handlers ostanejo enaki) ...

        newRoom.on(RoomEvent.Connected, () => {
          console.log("Connected to LiveKit room");
          setIsConnected(true);
          setIsConnecting(false);
          updateParticipantState(newRoom.localParticipant, true);
          updateRemoteParticipants();
        });

        newRoom.on(RoomEvent.Disconnected, () => {
          console.log("Disconnected from LiveKit room");
          setIsConnected(false);
          setLocalParticipant(null);
          setRemoteParticipants([]);
        }); // ... (Vsi ostali event handlerji ostanejo enaki) ...
        // Connect to room
        await newRoom.connect(url, token); // *** IZBOLJŠANA LOGIKA ZA PRILAGODITEV NA INITIAL STATE ***

        const tracks = await createLocalTracks({
          audio: initialAudio, // Zahtevaj mikrofon samo, če je 'initialAudio' true
          video: initialVideo, // Zahtevaj kamero samo, če je 'initialVideo' true
        });

        for (const track of tracks) {
          await newRoom.localParticipant.publishTrack(track);
          if (track.kind === Track.Kind.Audio) {
            setIsMuted(!initialAudio);
          } else if (track.kind === Track.Kind.Video) {
            setIsCameraOff(!initialVideo);
          }
        } // Če sta audio/video false, tracki niso ustvarjeni/objavljeni.
        // Če initialAudio/initialVideo false, moramo nastaviti stanje na izklopljeno
        if (!initialAudio) setIsMuted(true);
        if (!initialVideo) setIsCameraOff(true);

        updateParticipantState(newRoom.localParticipant, true);
      } catch (err) {
        console.error("LiveKit connection error:", err);
        setError(err instanceof Error ? err.message : "Failed to connect");
        setIsConnecting(false);
      }
    },
    [updateParticipantState, updateRemoteParticipants],
  );

  const disconnect = useCallback(() => {
    if (roomRef.current) {
      // *** KRITIČNI POPRAVEK: Spuščanje strojne opreme (hardware cleanup) ***
      roomRef.current.localParticipant.tracks.forEach((publication) => {
        if (publication.track) {
          publication.track.stop(); // USTAVI DOSTOP DO KAMERE/MIKROFONA
        }
      });

      roomRef.current.disconnect();
      roomRef.current = null;
      setRoom(null);
      setIsConnected(false);
      setLocalParticipant(null);
      setRemoteParticipants([]);
      setIsScreenSharing(false);
      setIsMuted(false);
      setIsCameraOff(false);
    }
  }, []);
  // ... (ostale funkcije in useEffect cleanup ostanejo enaki) ...
  // ... (Toggle funkcije ostanejo enake) ...

  return {
    room,
    // ... (vrnjeni objekti ostanejo enaki)
    localParticipant,
    remoteParticipants,
    connect: (roomName, participantName, initialVideo, initialAudio) =>
      connect(roomName, participantName, initialVideo, initialAudio),
    disconnect,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    isScreenSharing,
    isMuted,
    isCameraOff,
  };
}
