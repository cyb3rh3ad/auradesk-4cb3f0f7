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
  createLocalTracks,
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
  error: string | null;
  localParticipant: ParticipantState | null;
  remoteParticipants: ParticipantState[];
  connect: (roomName: string, participantName: string, initialVideo: boolean, initialAudio: boolean) => Promise<void>;
  disconnect: () => void;
  toggleMute: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  isScreenSharing: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
}

export function useLiveKit(): UseLiveKitReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localParticipant, setLocalParticipant] = useState<ParticipantState | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<ParticipantState[]>([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const roomRef = useRef<Room | null>(null);

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
        const { data, error: tokenError } = await supabase.functions.invoke("livekit-token", {
          body: { roomName, participantName },
        });

        if (tokenError || !data?.token) {
          console.error("Token error details:", tokenError);
          throw new Error(tokenError?.message || "Failed to get LiveKit token from Supabase Edge Function");
        }

        const { token, url } = data;

        const newRoom = new Room({
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: {
            videoCodec: "vp8",
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
        setRoom(newRoom);

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
        });

        newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
          console.log("Participant connected:", participant.identity);
          updateRemoteParticipants();
        });

        newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          console.log("Participant disconnected:", participant.identity);
          updateRemoteParticipants();
        });

        newRoom.on(RoomEvent.TrackSubscribed, () => {
          updateRemoteParticipants();
        });

        newRoom.on(RoomEvent.TrackUnsubscribed, () => {
          updateRemoteParticipants();
        });

        newRoom.on(RoomEvent.LocalTrackPublished, () => {
          updateParticipantState(newRoom.localParticipant, true);
        });

        newRoom.on(RoomEvent.LocalTrackUnpublished, () => {
          updateParticipantState(newRoom.localParticipant, true);
        });

        newRoom.on(RoomEvent.ActiveSpeakersChanged, () => {
          updateParticipantState(newRoom.localParticipant, true);
          updateRemoteParticipants();
        });

        await newRoom.connect(url, token);

        const tracks = await createLocalTracks({
          audio: initialAudio,
          video: initialVideo,
        });

        for (const track of tracks) {
          await newRoom.localParticipant.publishTrack(track);
          if (track.kind === Track.Kind.Audio) {
            setIsMuted(!initialAudio);
          } else if (track.kind === Track.Kind.Video) {
            setIsCameraOff(!initialVideo);
          }
        }

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

  const disconnect = useCallback(async () => {
    if (roomRef.current) {
      // First unpublish and stop all local tracks to properly release hardware
      const localParticipant = roomRef.current.localParticipant;
      const publications = Array.from(localParticipant.trackPublications.values());
      
      for (const publication of publications) {
        if (publication.track) {
          // Stop the track first to release hardware
          publication.track.stop();
          // Then unpublish it from the room
          try {
            await localParticipant.unpublishTrack(publication.track);
          } catch (err) {
            console.warn("Error unpublishing track:", err);
          }
        }
      }

      // Now disconnect from the room
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

  const toggleMute = useCallback(async () => {
    if (!roomRef.current) return;
    
    const audioTrack = roomRef.current.localParticipant.getTrackPublication(Track.Source.Microphone);
    if (audioTrack?.track) {
      if (audioTrack.isMuted) {
        await audioTrack.unmute();
        setIsMuted(false);
      } else {
        await audioTrack.mute();
        setIsMuted(true);
      }
    } else if (!isMuted) {
      // No audio track exists, try to create one
      try {
        const tracks = await createLocalTracks({ audio: true, video: false });
        for (const track of tracks) {
          await roomRef.current.localParticipant.publishTrack(track);
        }
        setIsMuted(false);
      } catch (err) {
        console.error("Failed to enable microphone:", err);
      }
    }
  }, [isMuted]);

  const toggleCamera = useCallback(async () => {
    if (!roomRef.current) return;
    
    const videoTrack = roomRef.current.localParticipant.getTrackPublication(Track.Source.Camera);
    if (videoTrack?.track) {
      if (videoTrack.isMuted) {
        await videoTrack.unmute();
        setIsCameraOff(false);
      } else {
        await videoTrack.mute();
        setIsCameraOff(true);
      }
    } else if (isCameraOff) {
      // No video track exists, try to create one
      try {
        const tracks = await createLocalTracks({ audio: false, video: true });
        for (const track of tracks) {
          await roomRef.current.localParticipant.publishTrack(track);
        }
        setIsCameraOff(false);
      } catch (err) {
        console.error("Failed to enable camera:", err);
      }
    }
  }, [isCameraOff]);

  const toggleScreenShare = useCallback(async () => {
    if (!roomRef.current) return;
    
    const screenTrack = roomRef.current.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    
    if (screenTrack) {
      await roomRef.current.localParticipant.unpublishTrack(screenTrack.track!);
      setIsScreenSharing(false);
    } else {
      try {
        await roomRef.current.localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
      } catch (err) {
        console.error("Failed to start screen share:", err);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    room,
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
  };
}