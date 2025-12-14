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
  isConnected: boolean;
  error: string | null;
  mediaError: string | null;
  localParticipant: ParticipantState | null;
  remoteParticipants: ParticipantState[];
  screenShareParticipant: ParticipantState | null;
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
  const [mediaError, setMediaError] = useState<string | null>(null);
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
      audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.setAttribute('playsinline', 'true');
      // Ensure audio plays immediately
      audioEl.volume = 1.0;
      document.body.appendChild(audioEl);
      audioElementsRef.current.set(participantId, audioEl);
      console.log(`Created audio element for participant: ${participantId}`);
    }

    // Attach track to audio element
    if ('attach' in track) {
      track.attach(audioEl);
      // Force play in case autoplay is blocked
      audioEl.play().catch(err => {
        console.warn(`Audio autoplay blocked for ${participantId}, will play on user interaction:`, err);
      });
      console.log(`Audio track attached and playing for participant: ${participantId}`);
    }
  }, []);

  // Detach audio track
  const detachAudioTrack = useCallback((participantId: string, track?: RemoteTrack | Track) => {
    const audioEl = audioElementsRef.current.get(participantId);
    if (audioEl) {
      if (track && 'detach' in track) {
        track.detach(audioEl);
      }
      audioEl.pause();
      audioEl.srcObject = null;
      audioEl.remove();
      audioElementsRef.current.delete(participantId);
      console.log(`Audio element removed for participant: ${participantId}`);
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
          console.log(`Track subscribed: ${track.kind} from ${participant.identity}, source: ${publication.source}`);
          
          // Auto-attach audio tracks immediately
          if (track.kind === Track.Kind.Audio) {
            // Small delay to ensure track is fully ready
            setTimeout(() => {
              attachAudioTrack(participant.identity, track);
            }, 100);
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

        // Track published by remote participant - prepare for subscription
        newRoom.on(RoomEvent.TrackPublished, (publication, participant) => {
          console.log(`Remote track published: ${publication.source} from ${participant.identity}`);
          // Track will be auto-subscribed, then TrackSubscribed fires
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

        newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
          console.log("Active speakers changed:", speakers.map(s => s.identity));
          // Update speaking states for all participants
          updateParticipantState(newRoom.localParticipant, true);
          updateRemoteParticipants();
        });

        // Media device failures
        newRoom.on(RoomEvent.MediaDevicesError, (error) => {
          console.error("Media devices error:", error);
        });

        // Connect to room
        await newRoom.connect(url, token);
        console.log("Connected to LiveKit room, now creating local tracks...");

        // Create and publish local tracks based on initial settings
        // Request permissions explicitly for better browser compatibility
        if (initialAudio || initialVideo) {
          try {
            // First, request permission explicitly
            console.log(`Requesting media: audio=${initialAudio}, video=${initialVideo}`);
            
            const constraints: MediaStreamConstraints = {
              audio: initialAudio ? {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              } : false,
              video: initialVideo ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 },
              } : false,
            };

            // Pre-request permission to ensure browser grants access
            const testStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log("Media permission granted, got tracks:", testStream.getTracks().map(t => t.kind));
            
            // Stop the test stream immediately
            testStream.getTracks().forEach(track => track.stop());

            // Now create LiveKit tracks
            const tracks = await createLocalTracks({
              audio: initialAudio,
              video: initialVideo ? {
                resolution: { width: 1280, height: 720, frameRate: 30 },
              } : false,
            });

            console.log("Created local tracks:", tracks.map(t => t.kind));

            for (const track of tracks) {
              await newRoom.localParticipant.publishTrack(track, {
                simulcast: track.kind === Track.Kind.Video,
              });
              console.log(`Published local ${track.kind} track successfully`);
            }
          } catch (mediaErr: any) {
            console.error("Failed to create local tracks:", mediaErr);
            // Show more specific error
            let errorMessage = "Failed to access microphone/camera";
            if (mediaErr.name === 'NotAllowedError') {
              errorMessage = "Camera/microphone permission denied. Please allow access in your browser settings.";
            } else if (mediaErr.name === 'NotFoundError') {
              errorMessage = "No camera or microphone found on this device.";
            } else if (mediaErr.name === 'NotReadableError') {
              errorMessage = "Camera or microphone is already in use by another application.";
            } else if (mediaErr.name === 'OverconstrainedError') {
              errorMessage = "Camera/microphone doesn't support the required settings.";
            }
            setMediaError(errorMessage);
            console.error("Media error:", errorMessage);
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

  // Find screen share participant
  const screenShareParticipant = remoteParticipants.find(p => p.screenShareTrack) || 
    (localParticipant?.screenShareTrack ? localParticipant : null);

  return {
    room,
    isConnecting,
    isConnected,
    error,
    mediaError,
    localParticipant,
    remoteParticipants,
    screenShareParticipant,
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
