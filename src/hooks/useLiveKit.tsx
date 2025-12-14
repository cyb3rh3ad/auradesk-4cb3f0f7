import { useState, useCallback, useRef, useEffect } from "react";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  Track,
  RemoteTrack,
  Participant,
  ConnectionState,
  createLocalTracks,
  VideoPresets,
  RoomOptions,
  ConnectionQuality,
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
  connectionQuality?: ConnectionQuality;
}

interface UseLiveKitReturn {
  room: Room | null;
  isConnecting: boolean;
  isConnected: boolean;
  isReconnecting: boolean;
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
  connectionQuality: ConnectionQuality | null;
  reconnect: () => Promise<void>;
}

// Connection configuration for reliability
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_DELAY = 1000;
const CONNECTION_HEALTH_CHECK_INTERVAL = 5000;
const TOKEN_REFRESH_BUFFER = 300000; // 5 minutes before expiry

export function useLiveKit(): UseLiveKitReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [localParticipant, setLocalParticipant] = useState<ParticipantState | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<ParticipantState[]>([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality | null>(null);
  
  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const connectionParamsRef = useRef<{
    roomName: string;
    participantName: string;
    initialVideo: boolean;
    initialAudio: boolean;
    token?: string;
    url?: string;
  } | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const tokenExpiryRef = useRef<number | null>(null);
  const tokenRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
    if (tokenRefreshTimeoutRef.current) {
      clearTimeout(tokenRefreshTimeoutRef.current);
      tokenRefreshTimeoutRef.current = null;
    }
  }, []);

  // Attach audio track to audio element for playback
  const attachAudioTrack = useCallback((participantId: string, track: RemoteTrack | Track) => {
    if (!track || track.kind !== Track.Kind.Audio) return;

    let audioEl = audioElementsRef.current.get(participantId);
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioEl.setAttribute('playsinline', 'true');
      audioEl.volume = 1.0;
      document.body.appendChild(audioEl);
      audioElementsRef.current.set(participantId, audioEl);
      console.log(`[LiveKit] Created audio element for: ${participantId}`);
    }

    if ('attach' in track) {
      track.attach(audioEl);
      audioEl.play().catch(err => {
        console.warn(`[LiveKit] Audio autoplay blocked for ${participantId}:`, err);
      });
      console.log(`[LiveKit] Audio attached for: ${participantId}`);
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
      console.log(`[LiveKit] Audio detached for: ${participantId}`);
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
      connectionQuality: participant.connectionQuality,
    };

    if (isLocal) {
      setLocalParticipant(state);
      setIsMuted(state.isMuted);
      setIsCameraOff(state.isCameraOff);
      setConnectionQuality(participant.connectionQuality);
    }

    return state;
  }, []);

  const updateRemoteParticipants = useCallback(() => {
    if (!roomRef.current) return;
    const participants: ParticipantState[] = [];
    
    roomRef.current.remoteParticipants.forEach((participant) => {
      const state = updateParticipantState(participant, false);
      participants.push(state);
      
      if (state.audioTrack) {
        attachAudioTrack(participant.identity, state.audioTrack);
      }
    });
    
    setRemoteParticipants(participants);
  }, [updateParticipantState, attachAudioTrack]);

  // Get fresh token
  const getToken = useCallback(async (roomName: string, participantName: string) => {
    console.log(`[LiveKit] Requesting token for room: ${roomName}`);
    
    const { data, error: tokenError } = await supabase.functions.invoke("livekit-token", {
      body: { roomName, participantName },
    });

    if (tokenError || !data?.token) {
      console.error("[LiveKit] Token error:", tokenError);
      throw new Error(tokenError?.message || "Failed to get LiveKit token");
    }

    console.log(`[LiveKit] Token received for room: ${roomName}`);
    
    // Store token expiry (1 hour from now as per edge function)
    tokenExpiryRef.current = Date.now() + 3600000;
    
    return { token: data.token, url: data.url };
  }, []);

  // Schedule token refresh before expiry
  const scheduleTokenRefresh = useCallback(() => {
    if (tokenRefreshTimeoutRef.current) {
      clearTimeout(tokenRefreshTimeoutRef.current);
    }

    if (!tokenExpiryRef.current || !connectionParamsRef.current) return;

    const timeUntilExpiry = tokenExpiryRef.current - Date.now();
    const refreshTime = Math.max(timeUntilExpiry - TOKEN_REFRESH_BUFFER, 0);

    console.log(`[LiveKit] Token refresh scheduled in ${Math.round(refreshTime / 1000)}s`);

    tokenRefreshTimeoutRef.current = setTimeout(async () => {
      if (!roomRef.current || !connectionParamsRef.current) return;
      
      try {
        console.log("[LiveKit] Refreshing token before expiry...");
        const { token, url } = await getToken(
          connectionParamsRef.current.roomName,
          connectionParamsRef.current.participantName
        );
        connectionParamsRef.current.token = token;
        connectionParamsRef.current.url = url;
        console.log("[LiveKit] Token refreshed successfully");
        scheduleTokenRefresh();
      } catch (err) {
        console.error("[LiveKit] Token refresh failed:", err);
      }
    }, refreshTime);
  }, [getToken]);

  // Perform reconnection with exponential backoff
  const performReconnect = useCallback(async () => {
    if (!connectionParamsRef.current) {
      console.error("[LiveKit] No connection params for reconnect");
      return;
    }

    const { roomName, participantName, initialVideo, initialAudio } = connectionParamsRef.current;
    
    setIsReconnecting(true);
    setError(null);
    
    const attempt = reconnectAttemptsRef.current + 1;
    const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, attempt - 1), 10000);
    
    console.log(`[LiveKit] Reconnect attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      // Get fresh token for reconnection
      const { token, url } = await getToken(roomName, participantName);
      connectionParamsRef.current.token = token;
      connectionParamsRef.current.url = url;

      // Disconnect existing room if any
      if (roomRef.current) {
        try {
          roomRef.current.disconnect();
        } catch (e) {
          console.warn("[LiveKit] Error disconnecting old room:", e);
        }
        roomRef.current = null;
      }

      // Create and connect new room
      const roomOptions: RoomOptions = {
        adaptiveStream: true,
        dynacast: true,
        disconnectOnPageLeave: false,
        stopLocalTrackOnUnpublish: true,
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
      setupRoomEventHandlers(newRoom, initialVideo, initialAudio);
      
      await newRoom.connect(url, token);
      
      roomRef.current = newRoom;
      setRoom(newRoom);
      reconnectAttemptsRef.current = 0;
      setIsReconnecting(false);
      
      console.log("[LiveKit] Reconnection successful");

      // Republish tracks
      await publishLocalTracks(newRoom, initialVideo, initialAudio);
      
      scheduleTokenRefresh();
      startHealthCheck();
      
    } catch (err) {
      console.error(`[LiveKit] Reconnect attempt ${attempt} failed:`, err);
      reconnectAttemptsRef.current = attempt;
      
      if (attempt < MAX_RECONNECT_ATTEMPTS) {
        performReconnect();
      } else {
        setError("Connection failed after multiple attempts. Please try again.");
        setIsReconnecting(false);
        setIsConnected(false);
      }
    }
  }, [getToken, scheduleTokenRefresh]);

  // Publish local tracks
  const publishLocalTracks = useCallback(async (newRoom: Room, initialVideo: boolean, initialAudio: boolean) => {
    if (!initialAudio && !initialVideo) return;

    try {
      console.log(`[LiveKit] Requesting media: audio=${initialAudio}, video=${initialVideo}`);
      
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

      const testStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("[LiveKit] Media permission granted");
      testStream.getTracks().forEach(track => track.stop());

      const tracks = await createLocalTracks({
        audio: initialAudio,
        video: initialVideo ? {
          resolution: { width: 1280, height: 720, frameRate: 30 },
        } : false,
      });

      console.log("[LiveKit] Created local tracks:", tracks.map(t => t.kind));

      for (const track of tracks) {
        await newRoom.localParticipant.publishTrack(track, {
          simulcast: track.kind === Track.Kind.Video,
        });
        console.log(`[LiveKit] Published ${track.kind} track`);
      }
    } catch (mediaErr: any) {
      console.error("[LiveKit] Failed to create local tracks:", mediaErr);
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
    }
  }, []);

  // Start connection health monitoring
  const startHealthCheck = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
    }

    healthCheckIntervalRef.current = setInterval(() => {
      if (!roomRef.current) return;
      
      const state = roomRef.current.state;
      const quality = roomRef.current.localParticipant?.connectionQuality;
      
      console.log(`[LiveKit] Health check - State: ${state}, Quality: ${quality}`);
      
      // Check for poor connection quality
      if (quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost) {
        console.warn("[LiveKit] Poor connection quality detected");
        setConnectionQuality(quality);
      }
    }, CONNECTION_HEALTH_CHECK_INTERVAL);
  }, [performReconnect]);

  // Setup room event handlers
  const setupRoomEventHandlers = useCallback((newRoom: Room, initialVideo: boolean, initialAudio: boolean) => {
    newRoom.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      console.log("[LiveKit] Connection state:", state);
      if (state === ConnectionState.Disconnected) {
        setIsConnected(false);
        // If we didn't explicitly hang up, try a controlled reconnect
        if (connectionParamsRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          console.log("[LiveKit] Unexpected disconnect, scheduling reconnect...");
          performReconnect();
        }
      } else if (state === ConnectionState.Connected) {
        setIsConnected(true);
        setIsReconnecting(false);
        reconnectAttemptsRef.current = 0;
      }
    });

    newRoom.on(RoomEvent.Connected, () => {
      console.log("[LiveKit] Connected");
      setIsConnected(true);
      setIsConnecting(false);
      setIsReconnecting(false);
      updateParticipantState(newRoom.localParticipant, true);
      updateRemoteParticipants();
    });

    newRoom.on(RoomEvent.Disconnected, (reason) => {
      console.log("[LiveKit] Disconnected, reason:", reason);
      setIsConnected(false);
      setIsConnecting(false);
      setIsReconnecting(false);
      setError(`Disconnected: ${reason || "Connection lost"}`);
      setLocalParticipant(null);
      setRemoteParticipants([]);
    });

    newRoom.on(RoomEvent.Reconnecting, () => {
      console.log("[LiveKit] Reconnecting (automatic)...");
      setIsReconnecting(true);
    });

    newRoom.on(RoomEvent.Reconnected, () => {
      console.log("[LiveKit] Reconnected");
      setIsReconnecting(false);
      reconnectAttemptsRef.current = 0;
      updateRemoteParticipants();
    });

    newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log("[LiveKit] Participant connected:", participant.identity);
      updateRemoteParticipants();
    });

    newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log("[LiveKit] Participant disconnected:", participant.identity);
      detachAudioTrack(participant.identity);
      updateRemoteParticipants();
    });

    newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      console.log(`[LiveKit] Track subscribed: ${track.kind} from ${participant.identity}`);
      
      if (track.kind === Track.Kind.Audio) {
        setTimeout(() => {
          attachAudioTrack(participant.identity, track);
        }, 100);
      }
      
      updateRemoteParticipants();
    });

    newRoom.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      console.log(`[LiveKit] Track unsubscribed: ${track.kind} from ${participant.identity}`);
      
      if (track.kind === Track.Kind.Audio) {
        detachAudioTrack(participant.identity, track);
      }
      
      updateRemoteParticipants();
    });

    newRoom.on(RoomEvent.TrackPublished, (publication, participant) => {
      console.log(`[LiveKit] Track published: ${publication.source} from ${participant.identity}`);
    });

    newRoom.on(RoomEvent.TrackMuted, (publication, participant) => {
      console.log(`[LiveKit] Track muted: ${publication.source} from ${participant.identity}`);
      if (participant === newRoom.localParticipant) {
        updateParticipantState(participant, true);
      } else {
        updateRemoteParticipants();
      }
    });

    newRoom.on(RoomEvent.TrackUnmuted, (publication, participant) => {
      console.log(`[LiveKit] Track unmuted: ${publication.source} from ${participant.identity}`);
      if (participant === newRoom.localParticipant) {
        updateParticipantState(participant, true);
      } else {
        updateRemoteParticipants();
      }
    });

    newRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
      console.log("[LiveKit] Local track published:", publication.source);
      updateParticipantState(newRoom.localParticipant, true);
      
      if (publication.source === Track.Source.ScreenShare) {
        setIsScreenSharing(true);
      }
    });

    newRoom.on(RoomEvent.LocalTrackUnpublished, (publication) => {
      console.log("[LiveKit] Local track unpublished:", publication.source);
      updateParticipantState(newRoom.localParticipant, true);
      
      if (publication.source === Track.Source.ScreenShare) {
        setIsScreenSharing(false);
      }
    });

    newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
      updateParticipantState(newRoom.localParticipant, true);
      updateRemoteParticipants();
    });

    newRoom.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      console.log(`[LiveKit] Connection quality for ${participant.identity}: ${quality}`);
      if (participant === newRoom.localParticipant) {
        setConnectionQuality(quality);
      }
      updateRemoteParticipants();
    });

    newRoom.on(RoomEvent.MediaDevicesError, (error) => {
      console.error("[LiveKit] Media devices error:", error);
    });

    newRoom.on(RoomEvent.SignalConnected, () => {
      console.log("[LiveKit] Signal connection established");
    });
  }, [updateParticipantState, updateRemoteParticipants, attachAudioTrack, detachAudioTrack, performReconnect]);

  const connect = useCallback(
    async (roomName: string, participantName: string, initialVideo: boolean, initialAudio: boolean) => {
      setIsConnecting(true);
      setError(null);
      setMediaError(null);
      reconnectAttemptsRef.current = 0;

      // Avoid duplicate connections if a room is already active
      if (roomRef.current &&
        (roomRef.current.state === ConnectionState.Connected ||
          roomRef.current.state === ConnectionState.Connecting)) {
        console.log("[LiveKit] Already connected/connecting, skipping connect() call");
        setIsConnecting(false);
        return;
      }

      // Store connection params for reconnection
      connectionParamsRef.current = { roomName, participantName, initialVideo, initialAudio };

      try {
        const { token, url } = await getToken(roomName, participantName);
        connectionParamsRef.current.token = token;
        connectionParamsRef.current.url = url;

        console.log("[LiveKit] Connecting to:", url);

        const roomOptions: RoomOptions = {
          adaptiveStream: true,
          dynacast: true,
          disconnectOnPageLeave: false,
          stopLocalTrackOnUnpublish: true,
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
        setupRoomEventHandlers(newRoom, initialVideo, initialAudio);

        roomRef.current = newRoom;
        setRoom(newRoom);

        await newRoom.connect(url, token);
        console.log("[LiveKit] Connected, publishing tracks...");

        await publishLocalTracks(newRoom, initialVideo, initialAudio);

        setIsMuted(!initialAudio);
        setIsCameraOff(!initialVideo);
        updateParticipantState(newRoom.localParticipant, true);
        
        scheduleTokenRefresh();
        startHealthCheck();
        
      } catch (err) {
        console.error("[LiveKit] Connection error:", err);
        setError(err instanceof Error ? err.message : "Failed to connect");
        setIsConnecting(false);
      }
    },
    [getToken, setupRoomEventHandlers, publishLocalTracks, updateParticipantState, scheduleTokenRefresh, startHealthCheck, performReconnect],
  );

  const disconnect = useCallback(async () => {
    console.log("[LiveKit] Disconnecting...");
    clearTimers();
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS; // Prevent auto-reconnect
    
    if (roomRef.current) {
      const localParticipant = roomRef.current.localParticipant;
      const publications = Array.from(localParticipant.trackPublications.values());
      
      for (const publication of publications) {
        if (publication.track) {
          publication.track.stop();
          try {
            await localParticipant.unpublishTrack(publication.track);
          } catch (err) {
            console.warn("[LiveKit] Error unpublishing track:", err);
          }
        }
      }

      try {
        roomRef.current.disconnect();
      } catch (err) {
        console.warn("[LiveKit] Error during disconnect:", err);
      }
      
      roomRef.current = null;
      setRoom(null);
      setIsConnected(false);
      setLocalParticipant(null);
      setRemoteParticipants([]);
      setIsScreenSharing(false);
      setIsMuted(false);
      setIsCameraOff(false);
      setConnectionQuality(null);
    }

    // Always ensure all audio elements are removed, even if the room was already cleared
    audioElementsRef.current.forEach((audioEl) => {
      audioEl.srcObject = null;
      audioEl.pause();
      audioEl.remove();
    });
    audioElementsRef.current.clear();
    
    connectionParamsRef.current = null;
  }, [clearTimers]);

  const reconnect = useCallback(async () => {
    if (!connectionParamsRef.current) {
      console.error("[LiveKit] No connection params for manual reconnect");
      return;
    }

    const { roomName, participantName, initialVideo, initialAudio } = connectionParamsRef.current;

    await disconnect();
    await connect(roomName, participantName, initialVideo, initialAudio);
  }, [disconnect, connect]);

  const toggleMute = useCallback(async () => {
    if (!roomRef.current) return;
    
    const audioPublication = roomRef.current.localParticipant.getTrackPublication(Track.Source.Microphone);
    
    if (audioPublication?.track) {
      if (audioPublication.isMuted) {
        await audioPublication.unmute();
        setIsMuted(false);
        console.log("[LiveKit] Microphone unmuted");
      } else {
        await audioPublication.mute();
        setIsMuted(true);
        console.log("[LiveKit] Microphone muted");
      }
    } else {
      try {
        const tracks = await createLocalTracks({ audio: true, video: false });
        for (const track of tracks) {
          await roomRef.current!.localParticipant.publishTrack(track);
        }
        setIsMuted(false);
        console.log("[LiveKit] Microphone enabled");
      } catch (err) {
        console.error("[LiveKit] Failed to enable microphone:", err);
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
        console.log("[LiveKit] Camera enabled");
      } else {
        await videoPublication.mute();
        setIsCameraOff(true);
        console.log("[LiveKit] Camera disabled");
      }
    } else {
      try {
        const tracks = await createLocalTracks({ 
          audio: false, 
          video: { resolution: { width: 1280, height: 720, frameRate: 30 } }
        });
        for (const track of tracks) {
          await roomRef.current!.localParticipant.publishTrack(track, { simulcast: true });
        }
        setIsCameraOff(false);
        console.log("[LiveKit] Camera track created and published");
      } catch (err) {
        console.error("[LiveKit] Failed to enable camera:", err);
      }
    }
    
    updateParticipantState(roomRef.current.localParticipant, true);
  }, [updateParticipantState]);

  const toggleScreenShare = useCallback(async () => {
    if (!roomRef.current) return;
    
    const screenPublication = roomRef.current.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    
    if (screenPublication?.track) {
      try {
        await roomRef.current.localParticipant.unpublishTrack(screenPublication.track);
        screenPublication.track.stop();
        setIsScreenSharing(false);
        console.log("[LiveKit] Screen sharing stopped");
      } catch (err) {
        console.error("[LiveKit] Failed to stop screen share:", err);
      }
    } else {
      try {
        await roomRef.current.localParticipant.setScreenShareEnabled(true, {
          audio: true,
          video: {
            displaySurface: 'monitor',
          },
          surfaceSwitching: 'include',
          selfBrowserSurface: 'include',
          systemAudio: 'include',
        });
        setIsScreenSharing(true);
        console.log("[LiveKit] Screen sharing started");
      } catch (err) {
        console.error("[LiveKit] Failed to start screen share:", err);
        setIsScreenSharing(false);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const screenShareParticipant = remoteParticipants.find(p => p.screenShareTrack) || 
    (localParticipant?.screenShareTrack ? localParticipant : null);

  return {
    room,
    isConnecting,
    isConnected,
    isReconnecting,
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
    connectionQuality,
    reconnect,
  };
}
