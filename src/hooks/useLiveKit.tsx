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
  VideoPresets,
  RoomOptions,
  TrackPublication,
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
  screenShareTrack?: RemoteTrack | Track;
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
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Attach audio track to audio element for playback
  const attachAudioTrack = useCallback((participantId: string, track: RemoteTrack | Track) => {
    if (!track || track.kind !== Track.Kind.Audio) return;

    // Get or create audio element for this participant
    let audioEl = audioElementsRef.current.get(participantId);
    if (!audioEl) {
      audioEl = new Audio();
      audioEl.autoplay = true;
      audioElementsRef.current.set(participantId, audioEl);
    }

    // Attach track to audio element
    if ('attach' in track) {
      track.attach(audioEl);
      console.log(`Audio track attached for participant: ${participantId}`);
    }
  }, []);

  // Detach audio track
  const detachAudioTrack = useCallback((participantId: string, track?: RemoteTrack | Track) => {
    const audioEl = audioElementsRef.current.get(participantId);
    if (audioEl && track && 'detach' in track) {
      track.detach(audioEl);
    }
    if (audioEl) {
      audioEl.srcObject = null;
      audioElementsRef.current.delete(participantId);
    }
  }, []);

  const updateParticipantState = useCallback((participant: Participant, isLocal: boolean) => {
    const audioPublication = participant.getTrackPublication(Track.Source.Microphone);
    const videoPublication = participant.getTrackPublication(Track.Source.Camera);
    const screenSharePublication = participant.getTrackPublication(Track.Source.ScreenShare);

    const state: ParticipantState = {
      identity: participant.identity,
      name: participant.name || participant.identity,
      isSpeaking: participant.isSpeaking,
      isMuted: !audioPublication?.track || audioPublication.isMuted,
      isCameraOff: !videoPublication?.track || videoPublication.isMuted,
      videoTrack: videoPublication?.track ?? undefined,
      audioTrack: audioPublication?.track ?? undefined,
      screenShareTrack: screenSharePublication?.track ?? undefined,
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
      const state = updateParticipantState(participant, false);
      participants.push(state);
      
      // Ensure audio tracks are attached for remote participants
      if (state.audioTrack) {
        attachAudioTrack(participant.identity, state.audioTrack);
      }
    });
    
    setRemoteParticipants(participants);
  }, [updateParticipantState, attachAudioTrack]);

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

        console.log("Connecting to LiveKit URL:", url);

        // Room options optimized for better connectivity and quality
        const roomOptions: RoomOptions = {
          adaptiveStream: true,
          dynacast: true,
          // Better video quality defaults
          publishDefaults: {
            videoCodec: "vp8",
            simulcast: true,
            videoSimulcastLayers: [
              VideoPresets.h90,
              VideoPresets.h216,
              VideoPresets.h540,
            ],
            screenShareEncoding: {
              maxBitrate: 3_000_000,
              maxFramerate: 30,
            },
            screenShareSimulcastLayers: [VideoPresets.h1080],
          },
          videoCaptureDefaults: {
            resolution: { width: 1280, height: 720, frameRate: 30 },
          },
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        };

        const newRoom = new Room(roomOptions);

        roomRef.current = newRoom;
        setRoom(newRoom);

        // Connection state changes
        newRoom.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          console.log("Connection state changed:", state);
          if (state === ConnectionState.Disconnected) {
            setIsConnected(false);
          } else if (state === ConnectionState.Connected) {
            setIsConnected(true);
          }
        });

        newRoom.on(RoomEvent.Connected, () => {
          console.log("Connected to LiveKit room");
          setIsConnected(true);
          setIsConnecting(false);
          updateParticipantState(newRoom.localParticipant, true);
          updateRemoteParticipants();
        });

        newRoom.on(RoomEvent.Disconnected, (reason) => {
          console.log("Disconnected from LiveKit room, reason:", reason);
          setIsConnected(false);
          setLocalParticipant(null);
          setRemoteParticipants([]);
          // Clean up all audio elements
          audioElementsRef.current.forEach((audioEl, id) => {
            audioEl.srcObject = null;
          });
          audioElementsRef.current.clear();
        });

        newRoom.on(RoomEvent.Reconnecting, () => {
          console.log("Reconnecting to LiveKit room...");
        });

        newRoom.on(RoomEvent.Reconnected, () => {
          console.log("Reconnected to LiveKit room");
          updateRemoteParticipants();
        });

        newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
          console.log("Participant connected:", participant.identity);
          updateRemoteParticipants();
        });

        newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          console.log("Participant disconnected:", participant.identity);
          // Clean up audio element for this participant
          detachAudioTrack(participant.identity);
          updateRemoteParticipants();
        });

        // Track subscribed - critical for receiving audio/video
        newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          console.log(`Track subscribed: ${track.kind} from ${participant.identity}`);
          
          // Auto-attach audio tracks
          if (track.kind === Track.Kind.Audio) {
            attachAudioTrack(participant.identity, track);
          }
          
          updateRemoteParticipants();
        });

        newRoom.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
          console.log(`Track unsubscribed: ${track.kind} from ${participant.identity}`);
          
          if (track.kind === Track.Kind.Audio) {
            detachAudioTrack(participant.identity, track);
          }
          
          updateRemoteParticipants();
        });

        // Track muted/unmuted
        newRoom.on(RoomEvent.TrackMuted, (publication, participant) => {
          console.log(`Track muted: ${publication.source} from ${participant.identity}`);
          if (participant === newRoom.localParticipant) {
            updateParticipantState(participant, true);
          } else {
            updateRemoteParticipants();
          }
        });

        newRoom.on(RoomEvent.TrackUnmuted, (publication, participant) => {
          console.log(`Track unmuted: ${publication.source} from ${participant.identity}`);
          if (participant === newRoom.localParticipant) {
            updateParticipantState(participant, true);
          } else {
            updateRemoteParticipants();
          }
        });

        newRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
          console.log("Local track published:", publication.source);
          updateParticipantState(newRoom.localParticipant, true);
          
          // Update screen sharing state
          if (publication.source === Track.Source.ScreenShare) {
            setIsScreenSharing(true);
          }
        });

        newRoom.on(RoomEvent.LocalTrackUnpublished, (publication) => {
          console.log("Local track unpublished:", publication.source);
          updateParticipantState(newRoom.localParticipant, true);
          
          if (publication.source === Track.Source.ScreenShare) {
            setIsScreenSharing(false);
          }
        });

        newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          updateParticipantState(newRoom.localParticipant, true);
          updateRemoteParticipants();
        });

        // Media device failures
        newRoom.on(RoomEvent.MediaDevicesError, (error) => {
          console.error("Media devices error:", error);
        });

        // Connect to room
        await newRoom.connect(url, token);

        // Create and publish local tracks based on initial settings
        if (initialAudio || initialVideo) {
          try {
            const tracks = await createLocalTracks({
              audio: initialAudio,
              video: initialVideo ? {
                resolution: { width: 1280, height: 720, frameRate: 30 },
              } : false,
            });

            for (const track of tracks) {
              await newRoom.localParticipant.publishTrack(track, {
                simulcast: track.kind === Track.Kind.Video,
              });
              console.log(`Published local ${track.kind} track`);
            }
          } catch (mediaErr) {
            console.error("Failed to create local tracks:", mediaErr);
            // Don't fail the connection, just log the error
          }
        }

        setIsMuted(!initialAudio);
        setIsCameraOff(!initialVideo);

        updateParticipantState(newRoom.localParticipant, true);
      } catch (err) {
        console.error("LiveKit connection error:", err);
        setError(err instanceof Error ? err.message : "Failed to connect");
        setIsConnecting(false);
      }
    },
    [updateParticipantState, updateRemoteParticipants, attachAudioTrack, detachAudioTrack],
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

      // Clean up all audio elements
      audioElementsRef.current.forEach((audioEl, id) => {
        audioEl.srcObject = null;
      });
      audioElementsRef.current.clear();

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
    
    const audioPublication = roomRef.current.localParticipant.getTrackPublication(Track.Source.Microphone);
    
    if (audioPublication?.track) {
      if (audioPublication.isMuted) {
        await audioPublication.unmute();
        setIsMuted(false);
        console.log("Microphone unmuted");
      } else {
        await audioPublication.mute();
        setIsMuted(true);
        console.log("Microphone muted");
      }
    } else {
      // No audio track exists, try to create one
      try {
        const tracks = await createLocalTracks({ audio: true, video: false });
        for (const track of tracks) {
          await roomRef.current!.localParticipant.publishTrack(track);
        }
        setIsMuted(false);
        console.log("Microphone enabled");
      } catch (err) {
        console.error("Failed to enable microphone:", err);
      }
    }
    
    updateParticipantState(roomRef.current.localParticipant, true);
  }, [updateParticipantState]);

  const toggleCamera = useCallback(async () => {
    if (!roomRef.current) return;
    
    const videoPublication = roomRef.current.localParticipant.getTrackPublication(Track.Source.Camera);
    
    if (videoPublication?.track) {
      if (videoPublication.isMuted) {
        await videoPublication.unmute();
        setIsCameraOff(false);
        console.log("Camera enabled");
      } else {
        await videoPublication.mute();
        setIsCameraOff(true);
        console.log("Camera disabled");
      }
    } else {
      // No video track exists, try to create one
      try {
        const tracks = await createLocalTracks({ 
          audio: false, 
          video: { resolution: { width: 1280, height: 720, frameRate: 30 } }
        });
        for (const track of tracks) {
          await roomRef.current!.localParticipant.publishTrack(track, { simulcast: true });
        }
        setIsCameraOff(false);
        console.log("Camera track created and published");
      } catch (err) {
        console.error("Failed to enable camera:", err);
      }
    }
    
    updateParticipantState(roomRef.current.localParticipant, true);
  }, [updateParticipantState]);

  const toggleScreenShare = useCallback(async () => {
    if (!roomRef.current) return;
    
    const screenPublication = roomRef.current.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    
    if (screenPublication?.track) {
      // Stop screen sharing
      try {
        await roomRef.current.localParticipant.unpublishTrack(screenPublication.track);
        screenPublication.track.stop();
        setIsScreenSharing(false);
        console.log("Screen sharing stopped");
      } catch (err) {
        console.error("Failed to stop screen share:", err);
      }
    } else {
      // Start screen sharing with audio
      try {
        // Use setScreenShareEnabled with options for audio capture
        await roomRef.current.localParticipant.setScreenShareEnabled(true, {
          audio: true, // Capture system audio
          video: {
            displaySurface: 'monitor', // Can be 'monitor', 'window', or 'browser'
          },
          surfaceSwitching: 'include',
          selfBrowserSurface: 'include',
          systemAudio: 'include',
        });
        setIsScreenSharing(true);
        console.log("Screen sharing started with audio");
      } catch (err) {
        console.error("Failed to start screen share:", err);
        // User cancelled or error occurred
        setIsScreenSharing(false);
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
