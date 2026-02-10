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

// ============================================================================
// MAXIMUM RELIABILITY CONNECTION STRATEGY
// ============================================================================
// 1. Same network detection → Direct P2P (no servers, fastest)
// 2. Different network → STUN first (try direct P2P via NAT)
// 3. Fallback → TURN relay with multiple providers for redundancy
// 4. Aggressive reconnection and health monitoring
// ============================================================================

// Direct P2P - for same network connections (no servers needed)
const ICE_CONFIG_DIRECT: RTCConfiguration = {
  iceServers: [], // No servers needed for same network
  iceCandidatePoolSize: 2,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
  iceTransportPolicy: "all",
};

// STUN-first - tries direct P2P via NAT traversal (free, works ~70-80% of the time)
// Added more STUN servers for redundancy
const ICE_CONFIG_STUN: RTCConfiguration = {
  iceServers: [
    // Google STUN servers (most reliable, globally distributed)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    // Twilio STUN (reliable backup)
    { urls: "stun:global.stun.twilio.com:3478" },
    // Cloudflare STUN
    { urls: "stun:stun.cloudflare.com:3478" },
    // Mozilla STUN
    { urls: "stun:stun.services.mozilla.com:3478" },
    // Additional backups
    { urls: "stun:stun.stunprotocol.org:3478" },
    { urls: "stun:stun.nextcloud.com:443" },
  ],
  iceCandidatePoolSize: 6,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
  iceTransportPolicy: "all", // Try direct first
};

// TURN relay - maximum redundancy for restrictive firewalls
// Priority: TURNS on 443 (looks like HTTPS) > TURN TCP 443 > TURN TCP other ports > TURN UDP
const ICE_CONFIG_RELAY: RTCConfiguration = {
  iceServers: [
    // === PRIMARY: METERED.CA (reliable, free tier) ===
    // TURNS on 443 - highest priority (TLS encrypted, looks like HTTPS)
    {
      urls: "turns:a.relay.metered.ca:443?transport=tcp",
      username: "e8dd65f92eb0895c19533add",
      credential: "FU+f1s+Y0GhQSXFR",
    },
    // TURNS on 5349 (standard TURNS port)
    {
      urls: "turns:a.relay.metered.ca:5349?transport=tcp",
      username: "e8dd65f92eb0895c19533add",
      credential: "FU+f1s+Y0GhQSXFR",
    },
    // TURN TCP on 443 (non-TLS but still port 443)
    {
      urls: "turn:a.relay.metered.ca:443?transport=tcp",
      username: "e8dd65f92eb0895c19533add",
      credential: "FU+f1s+Y0GhQSXFR",
    },
    // TURN on port 80 (HTTP-like)
    {
      urls: "turn:a.relay.metered.ca:80?transport=tcp",
      username: "e8dd65f92eb0895c19533add",
      credential: "FU+f1s+Y0GhQSXFR",
    },
    // TURN UDP (fastest when not blocked)
    {
      urls: "turn:a.relay.metered.ca:3478",
      username: "e8dd65f92eb0895c19533add",
      credential: "FU+f1s+Y0GhQSXFR",
    },
    // TURN TCP 3478
    {
      urls: "turn:a.relay.metered.ca:3478?transport=tcp",
      username: "e8dd65f92eb0895c19533add",
      credential: "FU+f1s+Y0GhQSXFR",
    },
    
    // === SECONDARY: OPENRELAY (public free TURN) ===
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:80?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:3478",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:3478?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    
    // === TERTIARY: ADDITIONAL FREE TURN SERVERS ===
    // Viagénie TURN (Canada-based, reliable)
    {
      urls: "turn:numb.viagenie.ca:3478",
      username: "webrtc@live.com",
      credential: "muazkh",
    },
    {
      urls: "turn:numb.viagenie.ca:3478?transport=tcp",
      username: "webrtc@live.com",
      credential: "muazkh",
    },
  ],
  iceCandidatePoolSize: 8, // More candidates for better chance of connection
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
  iceTransportPolicy: "relay", // Force TURN
};

// Hybrid mode - STUN + TURN together for maximum reliability
// Used after first escalation from STUN-only
const ICE_CONFIG_HYBRID: RTCConfiguration = {
  iceServers: [
    // STUN servers
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
    // TURN servers (as fallback within same connection)
    {
      urls: "turns:a.relay.metered.ca:443?transport=tcp",
      username: "e8dd65f92eb0895c19533add",
      credential: "FU+f1s+Y0GhQSXFR",
    },
    {
      urls: "turn:a.relay.metered.ca:443?transport=tcp",
      username: "e8dd65f92eb0895c19533add",
      credential: "FU+f1s+Y0GhQSXFR",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 8,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
  iceTransportPolicy: "all", // Try direct, fall back to relay automatically
};

// Detect local IP to check if peers are on same network
const getLocalIPs = async (): Promise<string[]> => {
  return new Promise((resolve) => {
    const ips: string[] = [];
    const pc = new RTCPeerConnection({ iceServers: [] });
    
    pc.createDataChannel('');
    pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => {});
    
    const timeout = setTimeout(() => {
      pc.close();
      resolve(ips);
    }, 2000);
    
    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        clearTimeout(timeout);
        pc.close();
        resolve(ips);
        return;
      }
      
      const candidate = event.candidate.candidate;
      // Extract IP from candidate string
      const ipMatch = candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
      if (ipMatch) {
        const ip = ipMatch[0];
        // Only include private IPs (local network)
        if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)) {
          if (!ips.includes(ip)) {
            ips.push(ip);
          }
        }
      }
    };
  });
};

// Check if two IPs are on the same subnet (simple /24 check)
const isSameNetwork = (ip1: string, ip2: string): boolean => {
  if (!ip1 || !ip2) return false;
  const parts1 = ip1.split('.');
  const parts2 = ip2.split('.');
  // Same /24 subnet
  return parts1[0] === parts2[0] && parts1[1] === parts2[1] && parts1[2] === parts2[2];
};

// Connection modes with escalation path: direct -> stun -> hybrid -> relay
type ConnectionMode = 'direct' | 'stun' | 'hybrid' | 'relay';

// Legacy alias for compatibility
const ICE_SERVERS = ICE_CONFIG_RELAY;

export const useWebRTC = (roomId: string | null, userName: string) => {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<"IDLE" | "RINGING" | "IN_CALL">("IDLE");
  const [connectionStats, setConnectionStats] = useState<ConnectionStats | null>(null);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('hybrid');

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceCandidateBuffer = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const makingOffer = useRef<Set<string>>(new Set());
  const initialSetup = useRef<Set<string>>(new Set()); // Suppress onnegotiationneeded during initial addTrack
  const knownPeers = useRef<Map<string, string>>(new Map()); // peerId -> peerName
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastBytesReceived = useRef<number>(0);
  const lastBytesSent = useRef<number>(0);
  const lastStatsTime = useRef<number>(Date.now());
  const lowBandwidthCount = useRef<number>(0);
  const localIPsRef = useRef<string[]>([]);
  const peerIPsRef = useRef<Map<string, string[]>>(new Map()); // peerId -> IPs
  const connectionModeRef = useRef<Map<string, ConnectionMode>>(new Map()); // peerId -> mode
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
  
  // Get the appropriate ICE config based on network detection
  const getICEConfig = useCallback((remoteUserId: string, mode: ConnectionMode): RTCConfiguration => {
    console.log(`[WebRTC] Using connection mode: ${mode} for peer: ${remoteUserId}`);
    
    switch (mode) {
      case 'direct':
        console.log("[WebRTC] ⚡ DIRECT P2P - Same network detected, no servers needed");
        return ICE_CONFIG_DIRECT;
      case 'stun':
        console.log("[WebRTC] 🌐 STUN MODE - Trying direct P2P via NAT traversal");
        return ICE_CONFIG_STUN;
      case 'hybrid':
        console.log("[WebRTC] 🔀 HYBRID MODE - P2P with TURN fallback ready");
        return ICE_CONFIG_HYBRID;
      case 'relay':
        console.log("[WebRTC] 🔒 RELAY MODE - Using TURN servers for firewall bypass");
        return ICE_CONFIG_RELAY;
      default:
        return ICE_CONFIG_STUN;
    }
  }, []);

  const createPeerConnection = useCallback(
    (remoteUserId: string, remoteName: string, mode: ConnectionMode = 'hybrid') => {
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

      // Check if peer is on same network for direct P2P
      const peerIPs = peerIPsRef.current.get(remoteUserId) || [];
      const localIPs = localIPsRef.current;
      const sameNetwork = localIPs.some(localIP => 
        peerIPs.some(peerIP => isSameNetwork(localIP, peerIP))
      );
      
      // Override mode to 'direct' if same network detected
      let effectiveMode = mode;
      if (sameNetwork && mode !== 'relay') {
        console.log("[WebRTC] 🎯 Same network detected! Switching to DIRECT P2P mode");
        effectiveMode = 'direct';
      }
      
      // Store the mode for this peer
      connectionModeRef.current.set(remoteUserId, effectiveMode);
      setConnectionMode(effectiveMode);
      
      const iceConfig = getICEConfig(remoteUserId, effectiveMode);
      console.log("[WebRTC] Creating peer connection for:", remoteUserId, remoteName, `(${effectiveMode.toUpperCase()} MODE)`);
      const pc = new RTCPeerConnection(iceConfig);
      
      // Suppress onnegotiationneeded during initial track setup
      initialSetup.current.add(remoteUserId);
      
      // Add local tracks using addTrack (compatible with perfect negotiation pattern)
      localStreamRef.current.getTracks().forEach((track) => {
        console.log("[WebRTC] Adding local track:", track.kind, "enabled:", track.enabled, "id:", track.id);
        try {
          pc.addTrack(track, localStreamRef.current!);
          console.log("[WebRTC] Added track:", track.kind);
        } catch (err) {
          console.error("[WebRTC] Failed to add track:", err);
        }
      });
      
      // Allow onnegotiationneeded to fire again after initial setup
      // Use microtask to ensure all synchronous addTrack calls complete first
      queueMicrotask(() => {
        initialSetup.current.delete(remoteUserId);
      });

      // Create a MediaStream to collect remote tracks
      const remoteStream = new MediaStream();
      let hasReceivedTrack = false;
      let trackUpdateTimeout: NodeJS.Timeout | null = null;

      pc.ontrack = (event) => {
        console.log("[WebRTC] 🎬 Received remote track:", event.track.kind, "from:", remoteUserId, 
          "readyState:", event.track.readyState, "enabled:", event.track.enabled,
          "streams:", event.streams.length);
        
        // CRITICAL: Ensure track is enabled
        event.track.enabled = true;
        console.log("[WebRTC] Track enabled set to true");
        
        // Add track to the remote stream
        const existingTrack = remoteStream.getTracks().find(t => t.kind === event.track.kind);
        if (existingTrack) {
          console.log("[WebRTC] Replacing existing", event.track.kind, "track");
          remoteStream.removeTrack(existingTrack);
        }
        remoteStream.addTrack(event.track);
        hasReceivedTrack = true;
        
        console.log("[WebRTC] Remote stream now has tracks:", 
          remoteStream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));
        
        // Handle track ended event with recovery attempt
        event.track.onended = () => {
          console.warn("[WebRTC] ⚠️ Remote track ended unexpectedly:", event.track.kind);
          // Attempt to recover by requesting renegotiation
          if (pc.connectionState === 'connected') {
            console.log("[WebRTC] Attempting track recovery via ICE restart");
            try {
              pc.restartIce();
            } catch (err) {
              console.error("[WebRTC] Track recovery failed:", err);
            }
          }
        };
        
        event.track.onmute = () => {
          console.log("[WebRTC] Remote track muted:", event.track.kind);
        };
        
        event.track.onunmute = () => {
          console.log("[WebRTC] Remote track unmuted:", event.track.kind);
          // Re-enable the track when unmuted
          event.track.enabled = true;
        };

        // Debounce participant update to batch multiple track additions
        if (trackUpdateTimeout) {
          clearTimeout(trackUpdateTimeout);
        }
        
        trackUpdateTimeout = setTimeout(() => {
          // Update participants with the combined stream
          console.log("[WebRTC] Updating participants with stream, tracks:", 
            remoteStream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));
            
          setParticipants((prev) => {
            const newMap = new Map(prev);
            // Create a new stream reference to ensure React detects the change
            const updatedStream = new MediaStream(remoteStream.getTracks());
            newMap.set(remoteUserId, { 
              odakle: remoteUserId, 
              stream: updatedStream, 
              name: remoteName 
            });
            return newMap;
          });
          setCallStatus("IN_CALL");
        }, 100);
      };

      // Connection health monitoring - periodic check for silent failures
      const healthCheckInterval = setInterval(() => {
        if (pc.connectionState === 'connected') {
          // Check if we're still receiving data
          pc.getStats().then(stats => {
            let hasInboundRtp = false;
            stats.forEach(report => {
              if (report.type === 'inbound-rtp' && report.bytesReceived > 0) {
                hasInboundRtp = true;
              }
            });
            
            if (!hasInboundRtp && hasReceivedTrack) {
              console.warn("[WebRTC] ⚠️ No inbound data detected, connection may be stale");
              // Don't auto-restart, but log for debugging
            }
          }).catch(() => {});
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          clearInterval(healthCheckInterval);
        }
      }, 10000); // Check every 10 seconds

      // Clean up health check on connection close
      pc.addEventListener('connectionstatechange', () => {
        if (pc.connectionState === 'closed' || pc.connectionState === 'failed') {
          clearInterval(healthCheckInterval);
        }
      });

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

      // Connection state handling - simplified: hybrid handles P2P+TURN natively,
      // only escalate to forced relay as last resort
      let connectionTimeout: NodeJS.Timeout | null = null;
      let reconnectAttempts = 0;
      const MAX_RECONNECT_ATTEMPTS = 2;
      
      pc.onconnectionstatechange = () => {
        console.log("[WebRTC] Connection state for", remoteUserId, ":", pc.connectionState);
        
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
          connectionTimeout = null;
        }
        
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
          setCallStatus("IN_CALL");
          reconnectAttempts = 0;
          failedConnections.current.delete(remoteUserId);
          console.log("[WebRTC] ✅ Successfully connected to:", remoteUserId);
        } else if (pc.connectionState === 'failed') {
          console.warn("[WebRTC] Connection failed for:", remoteUserId);
          reconnectAttempts++;
          
          const currentMode = connectionModeRef.current.get(remoteUserId) || 'hybrid';
          
          if (currentMode !== 'relay' && reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
            // Escalate to forced relay mode
            console.log("[WebRTC] 🔄 Escalating to forced RELAY mode");
            failedConnections.current.add(remoteUserId);
            pc.close();
            peerConnections.current.delete(remoteUserId);
            
            setTimeout(() => {
              const newPc = createPeerConnection(remoteUserId, remoteName, 'relay');
              if (newPc && isPolite(remoteUserId)) {
                sendOfferRef.current?.(remoteUserId, remoteName);
              }
            }, 500);
          } else {
            // Already at relay or max attempts, try ICE restart
            console.log("[WebRTC] Attempting ICE restart (attempt", reconnectAttempts, ")");
            try {
              pc.restartIce();
            } catch (err) {
              console.error("[WebRTC] ICE restart failed:", err);
            }
          }
        } else if (pc.connectionState === 'connecting') {
          // Simple timeout - 15s for hybrid, 20s for relay
          const currentMode = connectionModeRef.current.get(remoteUserId) || 'hybrid';
          const timeoutMs = currentMode === 'relay' ? 20000 : 15000;
          
          connectionTimeout = setTimeout(() => {
            if (pc.connectionState === 'connecting') {
              console.warn("[WebRTC] ⏱️ Connection timeout, attempting ICE restart");
              try {
                pc.restartIce();
              } catch (err) {
                console.error("[WebRTC] ICE restart failed:", err);
              }
            }
          }, timeoutMs);
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
        // Skip during initial addTrack setup — sendOffer handles the first offer
        if (initialSetup.current.has(remoteUserId)) {
          console.log("[WebRTC] Skipping negotiation during initial setup for:", remoteUserId);
          return;
        }
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
    [user, userName, isPolite, getICEConfig],
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
      
      // Detect local IPs for same-network detection
      console.log("[WebRTC] Detecting local network IPs...");
      const localIPs = await getLocalIPs();
      localIPsRef.current = localIPs;
      console.log("[WebRTC] Local IPs detected:", localIPs);
      
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
              const peerIPs = peerData?.localIPs || [];
              
              // Store peer's IPs for network detection
              if (peerIPs.length > 0) {
                peerIPsRef.current.set(peerId, peerIPs);
                console.log("[WebRTC] Peer", peerId, "IPs:", peerIPs);
              }
              
              console.log("[WebRTC] Discovered peer:", peerId, peerName);
              
              // Only the "polite" peer sends the offer
              if (isPolite(peerId)) {
                console.log("[WebRTC] We are polite, sending offer to:", peerId);
                sendOffer(peerId, peerName);
              } else {
                console.log("[WebRTC] We are impolite, waiting for offer from:", peerId);
                // Do NOT pre-create peer connection here - let handleOffer create it
                // Pre-creating causes transceiver conflicts with the incoming offer SDP
              }
            }
          });
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (key !== user.id) {
            const peerData = newPresences[0] as any;
            const peerName = peerData?.name || 'User';
            const peerIPs = peerData?.localIPs || [];
            
            // Store peer's IPs for network detection
            if (peerIPs.length > 0) {
              peerIPsRef.current.set(key, peerIPs);
              console.log("[WebRTC] New peer", key, "IPs:", peerIPs);
            }
            
            console.log("[WebRTC] Peer joined:", key, peerName);
            
            if (isPolite(key)) {
              console.log("[WebRTC] New peer joined, we are polite, sending offer");
              sendOffer(key, peerName);
            } else {
              console.log("[WebRTC] New peer joined, we are impolite, waiting for their offer");
              // Do NOT pre-create peer connection - let handleOffer do it
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
            peerIPsRef.current.delete(key);
            connectionModeRef.current.delete(key);
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
            // Track our presence with local IPs so peers can detect same-network
            await channel.track({ 
              name: userName, 
              joined_at: Date.now(),
              localIPs: localIPsRef.current, // Share our local IPs
            });
            console.log("[WebRTC] Presence tracked with local IPs:", localIPsRef.current);
            setIsConnecting(false);
            // Don't set isConnected here - wait for actual peer connection
            // isConnected will be set in onconnectionstatechange when pc.connectionState === 'connected'
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
    initialSetup.current.clear();
    peerIPsRef.current.clear();
    connectionModeRef.current.clear();
    localIPsRef.current = [];
    failedConnections.current.clear();
    
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
    setConnectionMode('hybrid');
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

  return { localStream, participants, isConnecting, isConnected, error, callStatus, connectionStats, connectionMode, joinRoom, leaveRoom, toggleAudio, toggleVideo };
};
