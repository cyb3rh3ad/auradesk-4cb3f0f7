import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * MINIMAL AUDIO-ONLY WebRTC
 * - One ICE config (STUN + TURN together)
 * - Simple offer/answer
 * - No bandwidth monitoring, no adaptive quality, no mode switching
 * - Just. Make. Audio. Work.
 */

interface Participant {
  id: string;
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
  inboundBitrate: number;
  outboundBitrate: number;
  totalBandwidth: number;
  isBelowMinimum: boolean;
  adaptiveMode: 'high' | 'medium' | 'low' | 'audio-only';
}

export type CallPhase = 'idle' | 'getting-media' | 'joining-room' | 'waiting-for-peer' | 'negotiating' | 'connected';

// Single ICE config — STUN for direct P2P, TURN as automatic fallback
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: [
        "turn:a.relay.metered.ca:443?transport=tcp",
        "turn:a.relay.metered.ca:80?transport=tcp",
        "turn:a.relay.metered.ca:3478",
      ],
      username: "e8dd65f92eb0895c19533add",
      credential: "FU+f1s+Y0GhQSXFR",
    },
    {
      urls: [
        "turn:openrelay.metered.ca:443?transport=tcp",
        "turn:openrelay.metered.ca:80?transport=tcp",
        "turn:openrelay.metered.ca:3478",
      ],
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 4,
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

export const useWebRTC = (roomId: string | null, userName: string) => {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<"IDLE" | "RINGING" | "IN_CALL">("IDLE");
  const [callPhase, setCallPhase] = useState<CallPhase>('idle');
  const [connectionMode, setConnectionMode] = useState<string>('hybrid');

  const pcRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceBufferRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const makingOfferRef = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stable refs for signaling handlers
  const sendOfferFnRef = useRef<((peerId: string, peerName: string) => void) | null>(null);
  const handleOfferFnRef = useRef<((from: string, fromName: string, offer: RTCSessionDescriptionInit) => void) | null>(null);
  const handleAnswerFnRef = useRef<((from: string, answer: RTCSessionDescriptionInit) => void) | null>(null);
  const handleIceFnRef = useRef<((from: string, candidate: RTCIceCandidateInit) => void) | null>(null);

  // Am I the polite peer? (lower ID = polite = sends offer first)
  const isPolite = useCallback((remoteId: string) => {
    return (user?.id || '') < remoteId;
  }, [user]);

  // ── GET AUDIO ──
  const getAudio = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.error("[WebRTC] Mic error:", err.name);
      if (err.name === 'NotAllowedError') {
        setError("Microphone permission denied. Please allow access and try again.");
      } else if (err.name === 'NotFoundError') {
        setError("No microphone found.");
      } else {
        setError("Could not access microphone: " + err.message);
      }
      return null;
    }
  }, []);

  // ── CREATE PEER CONNECTION ──
  const createPC = useCallback((remoteId: string, remoteName: string): RTCPeerConnection | null => {
    if (!localStreamRef.current || !user) return null;

    // Reuse healthy connection
    const existing = pcRef.current.get(remoteId);
    if (existing && (existing.connectionState === 'connected' || existing.connectionState === 'connecting')) {
      return existing;
    }
    if (existing) {
      existing.close();
      pcRef.current.delete(remoteId);
    }

    console.log("[WebRTC] Creating peer connection for:", remoteId);
    const pc = new RTCPeerConnection(ICE_CONFIG);

    // Add audio track
    localStreamRef.current.getAudioTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Receive remote audio
    const remoteStream = new MediaStream();
    pc.ontrack = (e) => {
      console.log("[WebRTC] Got remote track:", e.track.kind);
      e.track.enabled = true;
      remoteStream.addTrack(e.track);
      setParticipants(prev => {
        const next = new Map(prev);
        next.set(remoteId, { id: remoteId, stream: new MediaStream(remoteStream.getTracks()), name: remoteName });
        return next;
      });
      setCallStatus("IN_CALL");
    };

    // Send ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate: e.candidate.toJSON(), from: user.id, to: remoteId },
        });
      }
    };

    // Connection state
    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state:", pc.connectionState, "for:", remoteId);
      if (pc.connectionState === 'connected') {
        setIsConnected(true);
        setCallPhase('connected');
        setCallStatus("IN_CALL");
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      } else if (pc.connectionState === 'failed') {
        console.warn("[WebRTC] Connection failed, attempting ICE restart");
        try { pc.restartIce(); } catch {}
      } else if (pc.connectionState === 'disconnected') {
        // Wait 5s then try ICE restart
        setTimeout(() => {
          if (pc.connectionState === 'disconnected') {
            try { pc.restartIce(); } catch {}
          }
        }, 5000);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE state:", pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        try { pc.restartIce(); } catch {}
      }
    };

    pcRef.current.set(remoteId, pc);
    return pc;
  }, [user]);

  // ── SEND OFFER ──
  const sendOffer = useCallback(async (remoteId: string, remoteName: string) => {
    if (!channelRef.current || !user) return;
    if (makingOfferRef.current.has(remoteId)) return;

    const pc = createPC(remoteId, remoteName);
    if (!pc) return;

    try {
      makingOfferRef.current.add(remoteId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("[WebRTC] Sending offer to:", remoteId);
      await channelRef.current.send({
        type: "broadcast",
        event: "offer",
        payload: { offer: pc.localDescription, from: user.id, fromName: userName, to: remoteId },
      });
    } catch (err) {
      console.error("[WebRTC] Offer error:", err);
    } finally {
      makingOfferRef.current.delete(remoteId);
    }
  }, [createPC, userName, user]);

  // ── HANDLE OFFER ──
  const handleOffer = useCallback(async (from: string, fromName: string, offer: RTCSessionDescriptionInit) => {
    if (!user || !channelRef.current) return;
    console.log("[WebRTC] Received offer from:", from);

    if (!localStreamRef.current) {
      await getAudio();
    }

    const pc = createPC(from, fromName);
    if (!pc) return;

    try {
      // Handle glare
      const collision = makingOfferRef.current.has(from) || pc.signalingState !== 'stable';
      if (collision && !isPolite(from)) {
        console.log("[WebRTC] Ignoring offer (glare, impolite)");
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log("[WebRTC] Sending answer to:", from);
      await channelRef.current.send({
        type: "broadcast",
        event: "answer",
        payload: { answer: pc.localDescription, from: user.id, to: from },
      });

      // Flush buffered ICE candidates
      const buffered = iceBufferRef.current.get(from);
      if (buffered) {
        for (const c of buffered) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        iceBufferRef.current.delete(from);
      }
    } catch (err) {
      console.error("[WebRTC] Handle offer error:", err);
    }
  }, [createPC, user, getAudio, isPolite]);

  // ── HANDLE ANSWER ──
  const handleAnswer = useCallback(async (from: string, answer: RTCSessionDescriptionInit) => {
    const pc = pcRef.current.get(from);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      const buffered = iceBufferRef.current.get(from);
      if (buffered) {
        for (const c of buffered) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        iceBufferRef.current.delete(from);
      }
    } catch (err) {
      console.error("[WebRTC] Handle answer error:", err);
    }
  }, []);

  // ── HANDLE ICE ──
  const handleIce = useCallback(async (from: string, candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current.get(from);
    if (!pc || !pc.remoteDescription) {
      const buf = iceBufferRef.current.get(from) || [];
      buf.push(candidate);
      iceBufferRef.current.set(from, buf);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {}
  }, []);

  // Keep refs in sync
  useEffect(() => { sendOfferFnRef.current = sendOffer; }, [sendOffer]);
  useEffect(() => { handleOfferFnRef.current = handleOffer; }, [handleOffer]);
  useEffect(() => { handleAnswerFnRef.current = handleAnswer; }, [handleAnswer]);
  useEffect(() => { handleIceFnRef.current = handleIce; }, [handleIce]);

  // ── JOIN ROOM ──
  const joinRoom = useCallback(async (_video: boolean = true, _audio: boolean = true) => {
    if (!roomId || !user) return;
    console.log("[WebRTC] Joining room:", roomId);
    setIsConnecting(true);
    setCallPhase('getting-media');
    setError(null);

    const stream = await getAudio();
    if (!stream) { setIsConnecting(false); setCallPhase('idle'); return; }

    setCallPhase('joining-room');
    const channelName = `webrtc-room-${roomId}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const peers = Object.keys(state).filter(id => id !== user.id);
        console.log("[WebRTC] Presence sync, peers:", peers);
        if (peers.length > 0) {
          setCallPhase(prev => prev === 'waiting-for-peer' || prev === 'joining-room' ? 'negotiating' : prev);
        }
        // Send offer to all peers we don't have a connection to
        peers.forEach(peerId => {
          if (!pcRef.current.has(peerId)) {
            const peerData = state[peerId]?.[0] as any;
            const peerName = peerData?.name || 'User';
            setTimeout(() => sendOfferFnRef.current?.(peerId, peerName), 300);
          }
        });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key === user.id) return;
        const peerName = (newPresences[0] as any)?.name || 'User';
        console.log("[WebRTC] Peer joined:", key);
        setCallPhase(prev => prev === 'waiting-for-peer' ? 'negotiating' : prev);
        // Small delay then send offer
        setTimeout(() => sendOfferFnRef.current?.(key, peerName), 500);
        // Safety re-offer after 5s
        setTimeout(() => {
          const pc = pcRef.current.get(key);
          if (!pc || pc.connectionState !== 'connected') {
            console.log("[WebRTC] Re-sending offer after 5s to:", key);
            if (pc) { pc.close(); pcRef.current.delete(key); }
            sendOfferFnRef.current?.(key, peerName);
          }
        }, 5000);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key === user.id) return;
        console.log("[WebRTC] Peer left:", key);
        const pc = pcRef.current.get(key);
        if (pc) { pc.close(); pcRef.current.delete(key); }
        setParticipants(prev => { const n = new Map(prev); n.delete(key); return n; });
      })
      .on("broadcast", { event: "offer" }, ({ payload }) => {
        if (payload.to === user.id) handleOfferFnRef.current?.(payload.from, payload.fromName, payload.offer);
      })
      .on("broadcast", { event: "answer" }, ({ payload }) => {
        if (payload.to === user.id) handleAnswerFnRef.current?.(payload.from, payload.answer);
      })
      .on("broadcast", { event: "ice-candidate" }, ({ payload }) => {
        if (payload.to === user.id) handleIceFnRef.current?.(payload.from, payload.candidate);
      })
      .subscribe(async (status) => {
        console.log("[WebRTC] Channel status:", status);
        if (status === "SUBSCRIBED") {
          await channel.track({ name: userName, joined_at: Date.now() });
          setIsConnecting(false);
          setCallPhase('waiting-for-peer');

          // Timeout after 30s
          timeoutRef.current = setTimeout(() => {
            const anyConnected = Array.from(pcRef.current.values()).some(pc => pc.connectionState === 'connected');
            if (!anyConnected) {
              setError("Could not connect. The other person may not be available, or your network may be blocking the connection.");
            }
          }, 30000);
        }
      });

    channelRef.current = channel;
  }, [roomId, user, userName, getAudio]);

  // ── LEAVE ROOM ──
  const leaveRoom = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (channelRef.current) {
      channelRef.current.untrack();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    pcRef.current.forEach(pc => pc.close());
    pcRef.current.clear();
    iceBufferRef.current.clear();
    makingOfferRef.current.clear();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    setParticipants(new Map());
    setCallStatus("IDLE");
    setIsConnected(false);
    setCallPhase('idle');
  }, []);

  const toggleAudio = useCallback((muted: boolean) => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !muted; });
  }, []);

  const toggleVideo = useCallback((_videoOff: boolean) => {
    // No-op for audio-only mode
  }, []);

  useEffect(() => {
    return () => leaveRoom();
  }, [leaveRoom]);

  return {
    localStream, participants, isConnecting, isConnected, error, callStatus,
    connectionStats: null as ConnectionStats | null,
    connectionMode, callPhase, joinRoom, leaveRoom, toggleAudio, toggleVideo,
  };
};
