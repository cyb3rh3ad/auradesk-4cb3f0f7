import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Participant {
  odakle: string;
  stream: MediaStream | null;
  name: string;
}

export interface ConnectionStats {
  isRelay: boolean;
  localCandidateType: string;
  remoteCandidateType: string;
  bytesReceived: number;
  bytesSent: number;
  packetsLost: number;
  roundTripTime: number;
  jitter: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  // Bandwidth stats
  inboundBitrate: number; // kbps
  outboundBitrate: number; // kbps
  totalBandwidth: number; // kbps
  isBelowMinimum: boolean; // true if below 3mbps
  adaptiveMode: 'high' | 'medium' | 'low' | 'audio-only';
}

// Minimum bandwidth threshold (3 Mbps = 3000 kbps)
const MIN_BANDWIDTH_KBPS = 3000;
// Adaptive quality thresholds
const HIGH_QUALITY_THRESHOLD = 5000; // 5 Mbps
const MEDIUM_QUALITY_THRESHOLD = 2000; // 2 Mbps
const LOW_QUALITY_THRESHOLD = 500; // 500 kbps

// TURN-only configuration for maximum firewall compatibility
// Using relay-only mode - STUN is disabled as it's useless in relay mode
// Multiple providers for redundancy, prioritizing TURNS (TLS) on port 443
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // === PRIMARY: METERED.CA TURNS on 443 (looks like HTTPS traffic) ===
    {
      urls: "turns:a.relay.metered.ca:443?transport=tcp",
      username: "e8dd65f92eb0895c19533add",
      credential: "FU+f1s+Y0GhQSXFR",
    },
    // TURNS on standard port 5349
    {
      urls: "turns:a.relay.metered.ca:5349?transport=tcp",
      username: "e8dd65f92eb0895c19533add",
      credential: "FU+f1s+Y0GhQSXFR",
    },
    // TURN TCP on port 443 (alternative)
    {
      urls: "turn:a.relay.metered.ca:443?transport=tcp",
      username: "e8dd65f92eb0895c19533add",
      credential: "FU+f1s+Y0GhQSXFR",
    },
    // TURN on standard port 3478 (UDP and TCP)
    {
      urls: "turn:a.relay.metered.ca:3478",
      username: "e8dd65f92eb0895c19533add",
      credential: "FU+f1s+Y0GhQSXFR",
    },
    {
      urls: "turn:a.relay.metered.ca:3478?transport=tcp",
      username: "e8dd65f92eb0895c19533add",
      credential: "FU+f1s+Y0GhQSXFR",
    },
    // TURN on port 80 (HTTP-like traffic)
    {
      urls: "turn:a.relay.metered.ca:80?transport=tcp",
      username: "e8dd65f92eb0895c19533add",
      credential: "FU+f1s+Y0GhQSXFR",
    },
    
    // === BACKUP: OPENRELAY (public free TURN) ===
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:3478?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:80?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 5, // Reduced since we're relay-only
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
  // Force relay mode - all traffic goes through TURN servers
  iceTransportPolicy: "relay",
};

// P2P-first configuration for when relay isn't needed
const ICE_SERVERS_P2P: RTCConfiguration = {
  ...ICE_SERVERS,
  iceTransportPolicy: "all",
};

export const useWebRTC = (roomId: string | null, userName: string) => {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<"IDLE" | "RINGING" | "IN_CALL">("IDLE");
  const [connectionStats, setConnectionStats] = useState<ConnectionStats | null>(null);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceCandidateBuffer = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const makingOffer = useRef<Set<string>>(new Set());
  const knownPeers = useRef<Map<string, string>>(new Map()); // peerId -> peerName
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastBytesReceived = useRef<number>(0);
  const lastBytesSent = useRef<number>(0);
  const lastStatsTime = useRef<number>(Date.now());
  const lowBandwidthCount = useRef<number>(0);
  const currentAdaptiveMode = useRef<'high' | 'medium' | 'low' | 'audio-only'>('high');
  
  // Ref to hold sendOffer function for use in createPeerConnection
  const sendOfferRef = useRef<((remoteUserId: string, remoteName: string) => Promise<void>) | null>(null);

  // Adapt video quality based on bandwidth
  const adaptVideoQuality = useCallback(async (mode: 'high' | 'medium' | 'low' | 'audio-only') => {
    if (currentAdaptiveMode.current === mode) return;
    
    console.log("[WebRTC] Adapting video quality to:", mode);
    currentAdaptiveMode.current = mode;

    const connections = Array.from(peerConnections.current.values());
    
    for (const pc of connections) {
      const senders = pc.getSenders();
      const videoSender = senders.find(s => s.track?.kind === 'video');
      
      if (videoSender && videoSender.track) {
        const params = videoSender.getParameters();
        
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }

        switch (mode) {
          case 'high':
            params.encodings[0].maxBitrate = 2500000; // 2.5 Mbps
            params.encodings[0].scaleResolutionDownBy = 1;
            if (localStreamRef.current) {
              localStreamRef.current.getVideoTracks().forEach(t => t.enabled = true);
            }
            break;
          case 'medium':
            params.encodings[0].maxBitrate = 1000000; // 1 Mbps
            params.encodings[0].scaleResolutionDownBy = 1.5;
            if (localStreamRef.current) {
              localStreamRef.current.getVideoTracks().forEach(t => t.enabled = true);
            }
            break;
          case 'low':
            params.encodings[0].maxBitrate = 400000; // 400 kbps
            params.encodings[0].scaleResolutionDownBy = 2;
            if (localStreamRef.current) {
              localStreamRef.current.getVideoTracks().forEach(t => t.enabled = true);
            }
            break;
          case 'audio-only':
            params.encodings[0].maxBitrate = 50000; // Minimal
            if (localStreamRef.current) {
              localStreamRef.current.getVideoTracks().forEach(t => t.enabled = false);
            }
            break;
        }

        try {
          await videoSender.setParameters(params);
        } catch (err) {
          console.warn("[WebRTC] Failed to set video parameters:", err);
        }
      }
    }
  }, []);

  // Collect connection statistics from peer connections
  const collectStats = useCallback(async () => {
    const connections = Array.from(peerConnections.current.values());
    if (connections.length === 0) {
      setConnectionStats(null);
      return;
    }

    try {
      // Get stats from first active connection
      const pc = connections[0];
      if (pc.connectionState !== 'connected') return;

      const stats = await pc.getStats();
      let isRelay = false;
      let localCandidateType = 'unknown';
      let remoteCandidateType = 'unknown';
      let bytesReceived = 0;
      let bytesSent = 0;
      let packetsLost = 0;
      let roundTripTime = 0;
      let jitter = 0;

      stats.forEach((report) => {
        // Check candidate pair to determine if using relay
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          const localCandidate = stats.get(report.localCandidateId);
          const remoteCandidate = stats.get(report.remoteCandidateId);
          
          if (localCandidate) {
            localCandidateType = localCandidate.candidateType || 'unknown';
            isRelay = localCandidate.candidateType === 'relay';
          }
          if (remoteCandidate) {
            remoteCandidateType = remoteCandidate.candidateType || 'unknown';
            if (remoteCandidate.candidateType === 'relay') isRelay = true;
          }
          
          roundTripTime = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
        }

        // Get inbound stats
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          bytesReceived = report.bytesReceived || 0;
          packetsLost = report.packetsLost || 0;
          jitter = report.jitter ? report.jitter * 1000 : 0;
        }

        // Get outbound stats
        if (report.type === 'outbound-rtp' && report.kind === 'video') {
          bytesSent = report.bytesSent || 0;
        }
      });

      // Calculate bitrate (kbps)
      const now = Date.now();
      const timeDelta = (now - lastStatsTime.current) / 1000; // seconds
      
      const inboundBitrate = timeDelta > 0 
        ? Math.round(((bytesReceived - lastBytesReceived.current) * 8) / timeDelta / 1000) 
        : 0;
      const outboundBitrate = timeDelta > 0 
        ? Math.round(((bytesSent - lastBytesSent.current) * 8) / timeDelta / 1000) 
        : 0;
      const totalBandwidth = inboundBitrate + outboundBitrate;

      // Update last values for next calculation
      lastBytesReceived.current = bytesReceived;
      lastBytesSent.current = bytesSent;
      lastStatsTime.current = now;

      // Check if below minimum bandwidth (3 Mbps)
      const isBelowMinimum = totalBandwidth > 0 && totalBandwidth < MIN_BANDWIDTH_KBPS;

      // Adaptive quality based on bandwidth
      let adaptiveMode: 'high' | 'medium' | 'low' | 'audio-only' = 'high';
      if (totalBandwidth > 0) {
        if (totalBandwidth >= HIGH_QUALITY_THRESHOLD) {
          adaptiveMode = 'high';
          lowBandwidthCount.current = 0;
        } else if (totalBandwidth >= MEDIUM_QUALITY_THRESHOLD) {
          adaptiveMode = 'medium';
          lowBandwidthCount.current = 0;
        } else if (totalBandwidth >= LOW_QUALITY_THRESHOLD) {
          adaptiveMode = 'low';
          lowBandwidthCount.current = 0;
        } else {
          adaptiveMode = 'audio-only';
          lowBandwidthCount.current++;
        }

        // Apply adaptive quality
        adaptVideoQuality(adaptiveMode);

        // Only disconnect after sustained very low bandwidth (10 consecutive checks = 20 seconds)
        // AND bandwidth is below absolute minimum
        if (lowBandwidthCount.current >= 10 && totalBandwidth < 100) {
          console.warn("[WebRTC] Sustained critically low bandwidth, but keeping connection alive");
          // We don't disconnect - just warn. User can manually disconnect if needed
        }
      }

      // Calculate connection quality based on RTT, packet loss, and bandwidth
      let connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
      if (roundTripTime > 300 || packetsLost > 50 || (totalBandwidth > 0 && totalBandwidth < LOW_QUALITY_THRESHOLD)) {
        connectionQuality = 'poor';
      } else if (roundTripTime > 150 || packetsLost > 20 || (totalBandwidth > 0 && totalBandwidth < MEDIUM_QUALITY_THRESHOLD)) {
        connectionQuality = 'fair';
      } else if (roundTripTime > 50 || packetsLost > 5 || (totalBandwidth > 0 && totalBandwidth < HIGH_QUALITY_THRESHOLD)) {
        connectionQuality = 'good';
      }

      setConnectionStats({
        isRelay,
        localCandidateType,
        remoteCandidateType,
        bytesReceived,
        bytesSent,
        packetsLost,
        roundTripTime: Math.round(roundTripTime),
        jitter: Math.round(jitter),
        connectionQuality,
        inboundBitrate: Math.max(0, inboundBitrate),
        outboundBitrate: Math.max(0, outboundBitrate),
        totalBandwidth: Math.max(0, totalBandwidth),
        isBelowMinimum,
        adaptiveMode,
      });
    } catch (err) {
      console.error("[WebRTC] Failed to collect stats:", err);
    }
  }, [adaptVideoQuality]);

  // Start/stop stats collection based on connection state
  useEffect(() => {
    if (isConnected && peerConnections.current.size > 0) {
      // Collect stats every 2 seconds
      statsIntervalRef.current = setInterval(collectStats, 2000);
      collectStats(); // Initial collection
    } else {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      setConnectionStats(null);
    }

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, [isConnected, collectStats]);

  const initializeMedia = useCallback(async (video: boolean = true, audio: boolean = true) => {
    try {
      console.log("[WebRTC] Requesting media:", { video, audio });
      
      // Try with both audio and video first
      let stream: MediaStream | null = null;
      
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: video
            ? {
                width: { ideal: 1280, max: 1280 },
                height: { ideal: 720, max: 720 },
                frameRate: { ideal: 30, max: 30 },
              }
            : false,
          audio: audio ? { 
            echoCancellation: true, 
            noiseSuppression: true, 
            autoGainControl: true,
            // Ensure we get audio even with strict constraints
            sampleRate: { ideal: 48000 },
            channelCount: { ideal: 1 },
          } : false,
        });
      } catch (primaryErr: any) {
        console.warn("[WebRTC] Primary media request failed:", primaryErr.name, primaryErr.message);
        
        // Fallback: try audio-only if video fails
        if (video && audio) {
          console.log("[WebRTC] Falling back to audio-only");
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
          } catch (audioErr) {
            console.error("[WebRTC] Audio-only fallback failed:", audioErr);
            throw primaryErr;
          }
        } else {
          throw primaryErr;
        }
      }
      
      if (!stream) {
        throw new Error("Failed to get media stream");
      }

      console.log("[WebRTC] Media obtained, tracks:", stream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));
      
      // Ensure all tracks are enabled
      stream.getTracks().forEach(track => {
        track.enabled = true;
        console.log("[WebRTC] Track enabled:", track.kind, track.id);
      });
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (err: any) {
      console.error("[WebRTC] Media error:", err);
      let errorMessage = "Failed to access camera/microphone.";
      
      if (err.name === 'NotAllowedError') {
        errorMessage = "Camera/microphone permission denied. Please allow access in your browser settings.";
      } else if (err.name === 'NotFoundError') {
        errorMessage = "No camera or microphone found. Please connect a device.";
      } else if (err.name === 'NotReadableError') {
        errorMessage = "Camera/microphone is in use by another application.";
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = "Camera does not meet requirements. Trying with lower quality...";
      }
      
      setError(errorMessage);
      return null;
    }
  }, []);

  // Determine if this user should be the "polite" peer (sends offer)
  const isPolite = useCallback((remoteUserId: string) => {
    if (!user) return false;
    // Alphabetically lower ID is "polite" and initiates the offer
    return user.id < remoteUserId;
  }, [user]);

  // Track failed connections for relay fallback
  const failedConnections = useRef<Set<string>>(new Set());
  
  const createPeerConnection = useCallback(
    (remoteUserId: string, remoteName: string, forceRelay: boolean = false) => {
      if (!localStreamRef.current || !user) {
        console.error("[WebRTC] Cannot create peer connection - no local stream or user");
        return null;
      }

      // Check if connection already exists and is healthy
      const existingPc = peerConnections.current.get(remoteUserId);
      if (existingPc) {
        const state = existingPc.connectionState;
        if (state === 'connected' || state === 'connecting') {
          console.log("[WebRTC] Healthy peer connection already exists for:", remoteUserId);
          return existingPc;
        }
        // Close unhealthy connection
        console.log("[WebRTC] Closing unhealthy connection for:", remoteUserId, "state:", state);
        existingPc.close();
        peerConnections.current.delete(remoteUserId);
      }

      // ICE_SERVERS is already relay-only by default for firewall compatibility
      // forceRelay parameter is now redundant but kept for API compatibility
      console.log("[WebRTC] Creating new peer connection for:", remoteUserId, remoteName, "(RELAY MODE)");
      const pc = new RTCPeerConnection(ICE_SERVERS);
      
      // Add local tracks to the connection with proper transceiver configuration
      localStreamRef.current.getTracks().forEach((track) => {
        console.log("[WebRTC] Adding local track:", track.kind, "enabled:", track.enabled, "id:", track.id);
        try {
          // Use addTransceiver for better control
          const transceiver = pc.addTransceiver(track, {
            direction: 'sendrecv',
            streams: [localStreamRef.current!],
          });
          console.log("[WebRTC] Added transceiver for:", track.kind);
        } catch (err) {
          console.warn("[WebRTC] addTransceiver failed, falling back to addTrack:", err);
          try {
            pc.addTrack(track, localStreamRef.current!);
          } catch (addErr) {
            console.error("[WebRTC] Failed to add track:", addErr);
          }
        }
      });

      // Create a MediaStream to collect remote tracks
      const remoteStream = new MediaStream();
      let hasReceivedTrack = false;

      pc.ontrack = (event) => {
        console.log("[WebRTC] Received remote track:", event.track.kind, "from:", remoteUserId, 
          "readyState:", event.track.readyState, "enabled:", event.track.enabled);
        
        // Ensure track is enabled
        if (!event.track.enabled) {
          console.log("[WebRTC] Enabling disabled remote track");
          event.track.enabled = true;
        }
        
        // Add track to the remote stream
        remoteStream.addTrack(event.track);
        hasReceivedTrack = true;
        
        // Handle track ended event
        event.track.onended = () => {
          console.log("[WebRTC] Remote track ended:", event.track.kind);
        };
        
        event.track.onmute = () => {
          console.log("[WebRTC] Remote track muted:", event.track.kind);
        };
        
        event.track.onunmute = () => {
          console.log("[WebRTC] Remote track unmuted:", event.track.kind);
        };

        // Update participants with the combined stream - use a fresh stream reference
        console.log("[WebRTC] Updating participants with stream, tracks:", 
          remoteStream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));
          
        setParticipants((prev) => {
          const newMap = new Map(prev);
          newMap.set(remoteUserId, { 
            odakle: remoteUserId, 
            stream: remoteStream, 
            name: remoteName 
          });
          return newMap;
        });
        setCallStatus("IN_CALL");
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          console.log("[WebRTC] Sending ICE candidate to:", remoteUserId, 
            "type:", event.candidate.type, "protocol:", event.candidate.protocol);
          channelRef.current.send({
            type: "broadcast",
            event: "ice-candidate",
            payload: { candidate: event.candidate.toJSON(), from: user.id, to: remoteUserId },
          }).catch(err => console.error("[WebRTC] Failed to send ICE candidate:", err));
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log("[WebRTC] ICE gathering state for", remoteUserId, ":", pc.iceGatheringState);
        if (pc.iceGatheringState === 'complete') {
          console.log("[WebRTC] ICE gathering complete, candidates collected");
        }
      };

      // Connection state handling with relay fallback
      let connectionTimeout: NodeJS.Timeout | null = null;
      
      pc.onconnectionstatechange = () => {
        console.log("[WebRTC] Connection state for", remoteUserId, ":", pc.connectionState);
        
        // Clear any pending timeout
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
        
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
          setCallStatus("IN_CALL");
          // Clear from failed list on success
          failedConnections.current.delete(remoteUserId);
          console.log("[WebRTC] Successfully connected to:", remoteUserId);
        } else if (pc.connectionState === 'failed') {
          console.warn("[WebRTC] Connection failed for:", remoteUserId);
          
          // If not already using relay, try again with relay-only
          if (!forceRelay) {
            console.log("[WebRTC] Attempting reconnection with TURN relay...");
            failedConnections.current.add(remoteUserId);
            pc.close();
            peerConnections.current.delete(remoteUserId);
            
            // Recreate with relay
            setTimeout(() => {
              const newPc = createPeerConnection(remoteUserId, remoteName, true);
              if (newPc && channelRef.current) {
                // Re-initiate offer if we're polite
                if (isPolite(remoteUserId)) {
                  sendOfferRef.current?.(remoteUserId, remoteName);
                }
              }
            }, 500);
          } else {
            // Already tried relay, do ICE restart
            console.log("[WebRTC] Already using relay, attempting ICE restart");
            try {
              pc.restartIce();
            } catch (err) {
              console.error("[WebRTC] ICE restart failed:", err);
            }
          }
        } else if (pc.connectionState === 'connecting') {
          // Set a timeout for connection attempt
          connectionTimeout = setTimeout(() => {
            if (pc.connectionState === 'connecting') {
              console.warn("[WebRTC] Connection timeout after 15s, attempting reconnect with relay");
              failedConnections.current.add(remoteUserId);
              pc.close();
              peerConnections.current.delete(remoteUserId);
              
              if (!forceRelay) {
                setTimeout(() => {
                  const newPc = createPeerConnection(remoteUserId, remoteName, true);
                  if (newPc && isPolite(remoteUserId)) {
                    sendOfferRef.current?.(remoteUserId, remoteName);
                  }
                }, 500);
              }
            }
          }, 15000);
        } else if (pc.connectionState === 'disconnected') {
          console.warn("[WebRTC] Connection disconnected for:", remoteUserId, "- monitoring for recovery");
          connectionTimeout = setTimeout(() => {
            if (pc.connectionState === 'disconnected') {
              console.log("[WebRTC] Still disconnected after 5s, attempting ICE restart");
              try {
                pc.restartIce();
              } catch (err) {
                console.error("[WebRTC] ICE restart failed:", err);
              }
            }
          }, 5000);
        } else if (pc.connectionState === 'closed') {
          console.log("[WebRTC] Connection closed for:", remoteUserId);
          peerConnections.current.delete(remoteUserId);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[WebRTC] ICE connection state for", remoteUserId, ":", pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          console.log("[WebRTC] ICE connection failed, attempting restart");
          try {
            pc.restartIce();
          } catch (err) {
            console.error("[WebRTC] ICE restart failed:", err);
          }
        } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          console.log("[WebRTC] ICE connected successfully for:", remoteUserId);
        }
      };

      pc.onsignalingstatechange = () => {
        console.log("[WebRTC] Signaling state for", remoteUserId, ":", pc.signalingState);
      };

      // Handle negotiation needed (for dynamic track changes)
      pc.onnegotiationneeded = async () => {
        console.log("[WebRTC] Negotiation needed for:", remoteUserId, "polite:", isPolite(remoteUserId));
        if (isPolite(remoteUserId) && !makingOffer.current.has(remoteUserId)) {
          try {
            makingOffer.current.add(remoteUserId);
            console.log("[WebRTC] Creating offer for renegotiation");
            const offer = await pc.createOffer();
            if (pc.signalingState !== 'stable') {
              console.log("[WebRTC] Signaling state changed during offer creation, aborting");
              return;
            }
            await pc.setLocalDescription(offer);
            if (channelRef.current && user) {
              await channelRef.current.send({
                type: "broadcast",
                event: "offer",
                payload: { 
                  offer: pc.localDescription, 
                  from: user.id, 
                  fromName: userName, 
                  to: remoteUserId 
                },
              });
              console.log("[WebRTC] Sent renegotiation offer to:", remoteUserId);
            }
          } catch (err) {
            console.error("[WebRTC] Renegotiation error:", err);
          } finally {
            makingOffer.current.delete(remoteUserId);
          }
        }
      };

      peerConnections.current.set(remoteUserId, pc);
      knownPeers.current.set(remoteUserId, remoteName);
      return pc;
    },
    [user, userName, isPolite],
  );
  const sendOffer = useCallback(
    async (remoteUserId: string, remoteName: string) => {
      if (!channelRef.current || !user) return;
      
      const pc = createPeerConnection(remoteUserId, remoteName);
      if (!pc) return;

      // Prevent multiple simultaneous offers
      if (makingOffer.current.has(remoteUserId)) {
        console.log("[WebRTC] Already making offer to:", remoteUserId);
        return;
      }

      try {
        makingOffer.current.add(remoteUserId);
        console.log("[WebRTC] Creating offer for:", remoteUserId);
        
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        console.log("[WebRTC] Sending offer to:", remoteUserId);
        await channelRef.current.send({
          type: "broadcast",
          event: "offer",
          payload: { 
            offer: pc.localDescription, 
            from: user.id, 
            fromName: userName, 
            to: remoteUserId 
          },
        });
      } catch (err) {
        console.error("[WebRTC] Offer Error:", err);
      } finally {
        makingOffer.current.delete(remoteUserId);
      }
    },
    [createPeerConnection, userName, user],
  );

  // Store sendOffer in ref for use in createPeerConnection callbacks
  useEffect(() => {
    sendOfferRef.current = sendOffer;
  }, [sendOffer]);

  const handleOffer = useCallback(
    async (from: string, fromName: string, offer: RTCSessionDescriptionInit) => {
      if (!user || !channelRef.current) return;
      
      console.log("[WebRTC] Received offer from:", from, fromName);
      
      if (!localStreamRef.current) {
        console.log("[WebRTC] No local stream, initializing media first...");
        await initializeMedia(true, true);
      }

      const pc = createPeerConnection(from, fromName);
      if (!pc) return;

      try {
        // Handle glare (simultaneous offers) - impolite peer ignores incoming offer if making one
        const offerCollision = makingOffer.current.has(from) || pc.signalingState !== "stable";
        const polite = isPolite(from);
        
        if (offerCollision && !polite) {
          console.log("[WebRTC] Ignoring offer due to glare, we are impolite");
          return;
        }

        console.log("[WebRTC] Setting remote description from offer");
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        console.log("[WebRTC] Creating answer");
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        console.log("[WebRTC] Sending answer to:", from);
        await channelRef.current.send({
          type: "broadcast",
          event: "answer",
          payload: { answer: pc.localDescription, from: user.id, to: from },
        });

        // Process any buffered ICE candidates
        const bufferedCandidates = iceCandidateBuffer.current.get(from);
        if (bufferedCandidates) {
          console.log("[WebRTC] Processing", bufferedCandidates.length, "buffered ICE candidates");
          for (const cand of bufferedCandidates) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }
          iceCandidateBuffer.current.delete(from);
        }
      } catch (err) {
        console.error("[WebRTC] Handle Offer Error:", err);
      }
    },
    [createPeerConnection, user, initializeMedia, isPolite],
  );

  const handleAnswer = useCallback(async (from: string, answer: RTCSessionDescriptionInit) => {
    const pc = peerConnections.current.get(from);
    if (!pc) {
      console.warn("[WebRTC] No peer connection for answer from:", from);
      return;
    }
    
    try {
      console.log("[WebRTC] Setting remote description from answer");
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      
      // Process any buffered ICE candidates
      const bufferedCandidates = iceCandidateBuffer.current.get(from);
      if (bufferedCandidates) {
        console.log("[WebRTC] Processing", bufferedCandidates.length, "buffered ICE candidates");
        for (const cand of bufferedCandidates) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
        iceCandidateBuffer.current.delete(from);
      }
    } catch (err) {
      console.error("[WebRTC] Handle Answer Error:", err);
    }
  }, []);

  const handleIceCandidate = useCallback(async (from: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnections.current.get(from);
    
    if (!pc || !pc.remoteDescription) {
      // Buffer the candidate if we don't have a remote description yet
      console.log("[WebRTC] Buffering ICE candidate from:", from);
      const buffer = iceCandidateBuffer.current.get(from) || [];
      buffer.push(candidate);
      iceCandidateBuffer.current.set(from, buffer);
      return;
    }
    
    try {
      console.log("[WebRTC] Adding ICE candidate from:", from);
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn("[WebRTC] Failed to add ICE candidate:", e);
    }
  }, []);

  const joinRoom = useCallback(
    async (video: boolean = true, audio: boolean = true) => {
      if (!roomId || !user) {
        console.error("[WebRTC] Cannot join room - no roomId or user");
        return;
      }
      
      console.log("[WebRTC] Joining room:", roomId);
      setIsConnecting(true);
      setError(null);
      
      const stream = await initializeMedia(video, audio);
      if (!stream) {
        setIsConnecting(false);
        return;
      }

      const channelName = `webrtc-room-${roomId}`;
      console.log("[WebRTC] Creating channel:", channelName);
      
      const channel = supabase.channel(channelName, {
        config: {
          presence: { key: user.id },
        },
      });

      channel
        // Handle presence for peer discovery
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          console.log("[WebRTC] Presence sync:", Object.keys(state));
          
          // Connect to all present peers we haven't connected to yet
          Object.keys(state).forEach(peerId => {
            if (peerId !== user.id && !peerConnections.current.has(peerId)) {
              const peerData = state[peerId]?.[0] as any;
              const peerName = peerData?.name || 'User';
              console.log("[WebRTC] Discovered peer:", peerId, peerName);
              
              // Only the "polite" peer sends the offer
              if (isPolite(peerId)) {
                console.log("[WebRTC] We are polite, sending offer to:", peerId);
                sendOffer(peerId, peerName);
              } else {
                console.log("[WebRTC] We are impolite, waiting for offer from:", peerId);
                // Still create the connection so we're ready
                createPeerConnection(peerId, peerName);
              }
            }
          });
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (key !== user.id) {
            const peerData = newPresences[0] as any;
            const peerName = peerData?.name || 'User';
            console.log("[WebRTC] Peer joined:", key, peerName);
            
            if (isPolite(key)) {
              console.log("[WebRTC] New peer joined, we are polite, sending offer");
              sendOffer(key, peerName);
            }
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          if (key !== user.id) {
            console.log("[WebRTC] Peer left:", key);
            const pc = peerConnections.current.get(key);
            if (pc) {
              pc.close();
              peerConnections.current.delete(key);
            }
            knownPeers.current.delete(key);
            setParticipants(prev => {
              const newMap = new Map(prev);
              newMap.delete(key);
              return newMap;
            });
          }
        })
        // Handle signaling messages
        .on("broadcast", { event: "offer" }, ({ payload }) => {
          if (payload.to === user.id) {
            handleOffer(payload.from, payload.fromName, payload.offer);
          }
        })
        .on("broadcast", { event: "answer" }, ({ payload }) => {
          if (payload.to === user.id) {
            handleAnswer(payload.from, payload.answer);
          }
        })
        .on("broadcast", { event: "ice-candidate" }, ({ payload }) => {
          if (payload.to === user.id) {
            handleIceCandidate(payload.from, payload.candidate);
          }
        })
        .subscribe(async (status) => {
          console.log("[WebRTC] Channel status:", status);
          if (status === "SUBSCRIBED") {
            // Track our presence so others can discover us
            await channel.track({ name: userName, joined_at: Date.now() });
            console.log("[WebRTC] Presence tracked, we are in the room");
            setIsConnecting(false);
            setIsConnected(true);
          }
        });
        
      channelRef.current = channel;
    },
    [roomId, user, userName, initializeMedia, sendOffer, handleOffer, handleAnswer, handleIceCandidate, isPolite, createPeerConnection],
  );

  const leaveRoom = useCallback(() => {
    console.log("[WebRTC] Leaving room");
    
    if (channelRef.current) {
      channelRef.current.untrack();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    peerConnections.current.forEach((pc, id) => {
      console.log("[WebRTC] Closing peer connection:", id);
      pc.close();
    });
    peerConnections.current.clear();
    knownPeers.current.clear();
    iceCandidateBuffer.current.clear();
    makingOffer.current.clear();
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        console.log("[WebRTC] Stopping track:", t.kind);
        t.stop();
      });
      localStreamRef.current = null;
      setLocalStream(null);
    }
    
    setParticipants(new Map());
    setCallStatus("IDLE");
    setIsConnected(false);
  }, []);

  const toggleAudio = useCallback((muted: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !muted;
        console.log("[WebRTC] Audio track enabled:", !muted);
      });
    }
  }, []);

  const toggleVideo = useCallback((videoOff: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !videoOff;
        console.log("[WebRTC] Video track enabled:", !videoOff);
      });
    }
  }, []);

  useEffect(() => {
    return () => leaveRoom();
  }, [leaveRoom]);

  return { localStream, participants, isConnecting, isConnected, error, callStatus, connectionStats, joinRoom, leaveRoom, toggleAudio, toggleVideo };
};
