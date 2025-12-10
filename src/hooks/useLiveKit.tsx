import { useState, useCallback, useRef, useEffect } from 'react';
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
} from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';

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
  isConnected: boolean;
  error: string | null;
  localParticipant: ParticipantState | null;
  remoteParticipants: ParticipantState[];
  connect: (roomName: string, participantName: string) => Promise<void>;
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

  const connect = useCallback(async (roomName: string, participantName: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      // Get token from edge function
      const { data, error: tokenError } = await supabase.functions.invoke('livekit-token', {
        body: { roomName, participantName },
      });

      if (tokenError || !data?.token) {
        throw new Error(tokenError?.message || 'Failed to get LiveKit token');
      }

      const { token, url } = data;

      // Create and connect room
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
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

      // Set up event handlers
      newRoom.on(RoomEvent.Connected, () => {
        console.log('Connected to LiveKit room');
        setIsConnected(true);
        setIsConnecting(false);
        updateParticipantState(newRoom.localParticipant, true);
        updateRemoteParticipants();
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log('Disconnected from LiveKit room');
        setIsConnected(false);
        setLocalParticipant(null);
        setRemoteParticipants([]);
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log('Participant connected:', participant.identity);
        updateRemoteParticipants();
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log('Participant disconnected:', participant.identity);
        updateRemoteParticipants();
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        console.log('Track subscribed:', track.kind, participant.identity);
        updateRemoteParticipants();
      });

      newRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        console.log('Track unsubscribed:', track.kind, participant.identity);
        updateRemoteParticipants();
      });

      newRoom.on(RoomEvent.TrackMuted, (publication: RemoteTrackPublication | LocalTrackPublication, participant: Participant) => {
        if (participant === newRoom.localParticipant) {
          updateParticipantState(participant, true);
        } else {
          updateRemoteParticipants();
        }
      });

      newRoom.on(RoomEvent.TrackUnmuted, (publication: RemoteTrackPublication | LocalTrackPublication, participant: Participant) => {
        if (participant === newRoom.localParticipant) {
          updateParticipantState(participant, true);
        } else {
          updateRemoteParticipants();
        }
      });

      newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
        updateRemoteParticipants();
        if (newRoom.localParticipant) {
          updateParticipantState(newRoom.localParticipant, true);
        }
      });

      newRoom.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        console.log('Connection state:', state);
        if (state === ConnectionState.Disconnected) {
          setIsConnected(false);
          setIsConnecting(false);
        }
      });

      newRoom.on(RoomEvent.LocalTrackPublished, (publication: LocalTrackPublication, participant: LocalParticipant) => {
        console.log('Local track published:', publication.kind);
        updateParticipantState(participant, true);
      });

      // Connect to room
      await newRoom.connect(url, token);

      // Enable camera and microphone
      await newRoom.localParticipant.enableCameraAndMicrophone();
      updateParticipantState(newRoom.localParticipant, true);

    } catch (err) {
      console.error('LiveKit connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setIsConnecting(false);
    }
  }, [updateParticipantState, updateRemoteParticipants]);

  const disconnect = useCallback(() => {
    if (roomRef.current) {
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
    if (!roomRef.current?.localParticipant) return;
    
    const newMuted = !isMuted;
    await roomRef.current.localParticipant.setMicrophoneEnabled(!newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  const toggleCamera = useCallback(async () => {
    if (!roomRef.current?.localParticipant) return;
    
    const newCameraOff = !isCameraOff;
    await roomRef.current.localParticipant.setCameraEnabled(!newCameraOff);
    setIsCameraOff(newCameraOff);
  }, [isCameraOff]);

  const toggleScreenShare = useCallback(async () => {
    if (!roomRef.current?.localParticipant) return;

    try {
      if (isScreenSharing) {
        await roomRef.current.localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
      } else {
        await roomRef.current.localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error('Screen share error:', err);
    }
  }, [isScreenSharing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  return {
    room,
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
  };
}
