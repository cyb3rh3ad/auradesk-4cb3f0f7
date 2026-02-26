import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * BULLETPROOF AUDIO-ONLY WebRTC
 * - Forces TURN relay (bypasses ALL NAT issues)
 * - Extensive logging to diagnose failures
 * - Simple offer/answer with perfect negotiation
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

// Force TURN relay — this bypasses ALL NAT/firewall issues
// Uses OpenRelay (free, run by metered.ca)
const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: "stun:a.relay.metered.ca:80",
    },
    {
      urls: "turn:a.relay.metered.ca:80",
      username: "e8dd65f92eb0895c19533add",
      credential: "FU+f1s+Y0GhQSXFR",
    },
    {
      urls: "turn:a.relay.metered.ca:80?transport=tcp",
      username: "e8dd65f92eb0895c19533add",
      credential: "FU+f1s+Y0GhQSXFR",
    },
    {
      urls: "turn:a.relay.metered.ca:443",
      username: "e8dd65f92eb0895c19533add",
      credential: "FU+f1s+Y0GhQSXFR",
    },
    {
      urls: "turn:a.relay.metered.ca:443?transport=tcp",
      username: "e8dd65f92eb0895c19533add",
      credential: "FU+f1s+Y0GhQSXFR",
    },
  ],
  iceTransportPolicy: "relay", // FORCE relay — no direct P2P, always TURN
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

const log = (...args: any[]) => console.log("[WebRTC]", ...args);
const warn = (...args: any[]) => console.warn("[WebRTC]", ...args);
const err = (...args: any[]) => console.error("[WebRTC]", ...args);

export const useWebRTC = (roomId: string | null, userName: string) => {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<"IDLE" | "RINGING" | "IN_CALL">("IDLE");
  const [callPhase, setCallPhase] = useState<CallPhase>('idle');
  const [connectionMode] = useState<string>('relay');

  const pcRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceBufferRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const makingOfferRef = useRef<Set<string>>(new Set());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Stable refs for signaling handlers
  const sendOfferFnRef = useRef<((peerId: string, peerName: string) => void) | null>(null);
  const handleOfferFnRef = useRef<((from: string, fromName: string, offer: RTCSessionDescriptionInit) => void) | null>(null);
  const handleAnswerFnRef = useRef<((from: string, answer: RTCSessionDescriptionInit) => void) | null>(null);
  const handleIceFnRef = useRef<((from: string, candidate: RTCIceCandidateInit) => void) | null>(null);

  // Am I the polite peer? (lower ID = polite)
  const isPolite = useCallback((remoteId: string) => {
    return (user?.id || '') < remoteId;
  }, [user]);

  // ── GET AUDIO ──
  const getAudio = useCallback(async (): Promise<MediaStream | null> => {
    try {
      log("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      log("✅ Got microphone stream, tracks:", stream.getAudioTracks().length);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (e: any) {
      err("❌ Mic error:", e.name, e.message);
      if (e.name === 'NotAllowedError') {
        setError("Microphone permission denied. Please allow access and try again.");
      } else if (e.name === 'NotFoundError') {
        setError("No microphone found.");
      } else {
        setError("Could not access microphone: " + e.message);
      }
      return null;
    }
  }, []);

  // ── TEST TURN SERVERS ──
  const testTurnServers = useCallback(async () => {
    log("🔍 Testing TURN server connectivity...");
    return new Promise<boolean>((resolve) => {
      const pc = new RTCPeerConnection(ICE_CONFIG);
      let foundRelay = false;
      const timeout = setTimeout(() => {
        pc.close();
        if (!foundRelay) {
          warn("⚠️ TURN server test: NO relay candidates found in 10s");
        }
        resolve(foundRelay);
      }, 10000);

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          log("  ICE candidate:", e.candidate.type, e.candidate.protocol, e.candidate.address);
          if (e.candidate.type === 'relay') {
            log("  ✅ TURN relay candidate found!");
            foundRelay = true;
          }
        }
      };

      pc.onicegatheringstatechange = () => {
        log("  ICE gathering state:", pc.iceGatheringState);
        if (pc.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          pc.close();
          if (foundRelay) {
            log("✅ TURN servers working!");
          } else {
            warn("❌ TURN servers NOT working - no relay candidates gathered");
          }
          resolve(foundRelay);
        }
      };

      // Create a data channel to trigger ICE gathering
      pc.createDataChannel("test");
      pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => {
        clearTimeout(timeout);
        pc.close();
        resolve(false);
      });
    });
  }, []);

  // ── CREATE PEER CONNECTION ──
  const createPC = useCallback((remoteId: string, remoteName: string): RTCPeerConnection | null => {
    if (!localStreamRef.current || !user) {
      warn("Cannot create PC: no stream or user", { hasStream: !!localStreamRef.current, hasUser: !!user });
      return null;
    }

    // Reuse healthy connection
    const existing = pcRef.current.get(remoteId);
    if (existing && (existing.connectionState === 'connected' || existing.connectionState === 'connecting')) {
      log("Reusing existing PC for:", remoteId, "state:", existing.connectionState);
      return existing;
    }
    if (existing) {
      log("Closing stale PC for:", remoteId, "state:", existing.connectionState);
      existing.close();
      pcRef.current.delete(remoteId);
    }

    log("🔧 Creating NEW peer connection for:", remoteId);
    const pc = new RTCPeerConnection(ICE_CONFIG);

    // Add audio track
    const tracks = localStreamRef.current.getAudioTracks();
    log("  Adding", tracks.length, "audio tracks to PC");
    tracks.forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Receive remote audio
    const remoteStream = new MediaStream();
    pc.ontrack = (e) => {
      log("🎵 Got remote track:", e.track.kind, "enabled:", e.track.enabled, "readyState:", e.track.readyState);
      e.track.enabled = true;
      remoteStream.addTrack(e.track);
      
      // Create a new stream reference to trigger React re-render
      const freshStream = new MediaStream(remoteStream.getTracks());
      log("  Remote stream now has", freshStream.getTracks().length, "tracks");
      
      if (mountedRef.current) {
        setParticipants(prev => {
          const next = new Map(prev);
          next.set(remoteId, { id: remoteId, stream: freshStream, name: remoteName });
          return next;
        });
        setCallStatus("IN_CALL");
      }
    };

    // Send ICE candidates
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        log("📤 Sending ICE candidate:", e.candidate.type, e.candidate.protocol);
        if (channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "ice-candidate",
            payload: { candidate: e.candidate.toJSON(), from: user.id, to: remoteId },
          });
        }
      } else {
        log("  ICE gathering complete for peer:", remoteId);
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      log("🔌 Connection state:", pc.connectionState, "for:", remoteId);
      if (!mountedRef.current) return;
      
      if (pc.connectionState === 'connected') {
        log("✅✅✅ CONNECTED to peer:", remoteId);
        setIsConnected(true);
        setCallPhase('connected');
        setCallStatus("IN_CALL");
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      } else if (pc.connectionState === 'failed') {
        warn("❌ Connection FAILED for:", remoteId);
        try { pc.restartIce(); } catch {}
      } else if (pc.connectionState === 'disconnected') {
        warn("⚠️ Peer disconnected:", remoteId, "- waiting 5s before ICE restart");
        setTimeout(() => {
          if (pc.connectionState === 'disconnected') {
            try { pc.restartIce(); } catch {}
          }
        }, 5000);
      }
    };

    pc.oniceconnectionstatechange = () => {
      log("🧊 ICE connection state:", pc.iceConnectionState, "for:", remoteId);
      if (pc.iceConnectionState === 'failed') {
        warn("❌ ICE connection failed, restarting");
        try { pc.restartIce(); } catch {}
      }
    };

    pc.onicegatheringstatechange = () => {
      log("🧊 ICE gathering state:", pc.iceGatheringState, "for:", remoteId);
    };

    pc.onsignalingstatechange = () => {
      log("📡 Signaling state:", pc.signalingState, "for:", remoteId);
    };

    pcRef.current.set(remoteId, pc);
    return pc;
  }, [user]);

  // ── SEND OFFER ──
  const sendOffer = useCallback(async (remoteId: string, remoteName: string) => {
    if (!channelRef.current || !user) {
      warn("Cannot send offer: no channel or user");
      return;
    }
    if (makingOfferRef.current.has(remoteId)) {
      log("Already making offer to:", remoteId, "- skipping");
      return;
    }

    const pc = createPC(remoteId, remoteName);
    if (!pc) return;

    try {
      makingOfferRef.current.add(remoteId);
      log("📤 Creating offer for:", remoteId);
      const offer = await pc.createOffer();
      log("📤 Setting local description...");
      await pc.setLocalDescription(offer);
      log("📤 Sending offer via broadcast to:", remoteId);
      await channelRef.current.send({
        type: "broadcast",
        event: "offer",
        payload: { offer: pc.localDescription, from: user.id, fromName: userName, to: remoteId },
      });
      log("📤 ✅ Offer sent to:", remoteId);
    } catch (e) {
      err("❌ Offer error:", e);
    } finally {
      makingOfferRef.current.delete(remoteId);
    }
  }, [createPC, userName, user]);

  // ── HANDLE OFFER ──
  const handleOffer = useCallback(async (from: string, fromName: string, offer: RTCSessionDescriptionInit) => {
    if (!user || !channelRef.current) return;
    log("📥 Received offer from:", from);

    if (!localStreamRef.current) {
      log("  No local stream, getting audio first...");
      await getAudio();
    }

    const pc = createPC(from, fromName);
    if (!pc) {
      warn("  Could not create PC for offer handler");
      return;
    }

    try {
      // Handle glare (both peers sent offers simultaneously)
      const collision = makingOfferRef.current.has(from) || pc.signalingState !== 'stable';
      if (collision) {
        log("  ⚠️ Collision detected! signalingState:", pc.signalingState, "isPolite:", isPolite(from));
        if (!isPolite(from)) {
          log("  Ignoring offer (I'm impolite in this collision)");
          return;
        }
        log("  I'm polite, rolling back and accepting their offer");
      }

      log("  Setting remote description (offer)...");
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      log("  Creating answer...");
      const answer = await pc.createAnswer();
      log("  Setting local description (answer)...");
      await pc.setLocalDescription(answer);

      log("  📤 Sending answer to:", from);
      await channelRef.current.send({
        type: "broadcast",
        event: "answer",
        payload: { answer: pc.localDescription, from: user.id, to: from },
      });
      log("  ✅ Answer sent to:", from);

      // Flush buffered ICE candidates
      const buffered = iceBufferRef.current.get(from);
      if (buffered && buffered.length > 0) {
        log("  Flushing", buffered.length, "buffered ICE candidates");
        for (const c of buffered) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        iceBufferRef.current.delete(from);
      }
    } catch (e) {
      err("❌ Handle offer error:", e);
    }
  }, [createPC, user, getAudio, isPolite]);

  // ── HANDLE ANSWER ──
  const handleAnswer = useCallback(async (from: string, answer: RTCSessionDescriptionInit) => {
    log("📥 Received answer from:", from);
    const pc = pcRef.current.get(from);
    if (!pc) {
      warn("  No PC for answer from:", from);
      return;
    }
    try {
      log("  Setting remote description (answer)... signalingState:", pc.signalingState);
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      log("  ✅ Remote description set");
      
      const buffered = iceBufferRef.current.get(from);
      if (buffered && buffered.length > 0) {
        log("  Flushing", buffered.length, "buffered ICE candidates");
        for (const c of buffered) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        iceBufferRef.current.delete(from);
      }
    } catch (e) {
      err("❌ Handle answer error:", e);
    }
  }, []);

  // ── HANDLE ICE ──
  const handleIce = useCallback(async (from: string, candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current.get(from);
    if (!pc || !pc.remoteDescription) {
      log("📥 Buffering ICE candidate from:", from, "(no PC or remote desc yet)");
      const buf = iceBufferRef.current.get(from) || [];
      buf.push(candidate);
      iceBufferRef.current.set(from, buf);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      log("📥 Added ICE candidate from:", from);
    } catch (e) {
      warn("  ICE candidate add failed:", e);
    }
  }, []);

  // Keep refs in sync
  useEffect(() => { sendOfferFnRef.current = sendOffer; }, [sendOffer]);
  useEffect(() => { handleOfferFnRef.current = handleOffer; }, [handleOffer]);
  useEffect(() => { handleAnswerFnRef.current = handleAnswer; }, [handleAnswer]);
  useEffect(() => { handleIceFnRef.current = handleIce; }, [handleIce]);

  // ── JOIN ROOM ──
  const joinRoom = useCallback(async (_video: boolean = true, _audio: boolean = true) => {
    if (!roomId || !user) {
      warn("Cannot join: no roomId or user", { roomId, userId: user?.id });
      return;
    }
    log("🚀 Joining room:", roomId, "as:", userName, "(userId:", user.id, ")");
    setIsConnecting(true);
    setCallPhase('getting-media');
    setError(null);

    // Step 1: Test TURN servers
    const turnWorks = await testTurnServers();
    if (!turnWorks) {
      warn("⚠️ TURN servers may not be working, trying anyway...");
    }

    // Step 2: Get audio
    const stream = await getAudio();
    if (!stream) { 
      setIsConnecting(false); 
      setCallPhase('idle'); 
      return; 
    }

    // Step 3: Join Supabase channel
    setCallPhase('joining-room');
    const channelName = `webrtc-room-${roomId}`;
    log("📡 Creating Supabase channel:", channelName);
    
    const channel = supabase.channel(channelName, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const peers = Object.keys(state).filter(id => id !== user.id);
        log("👥 Presence sync — peers in room:", peers.length, peers);
        if (peers.length > 0 && mountedRef.current) {
          setCallPhase(prev => prev === 'waiting-for-peer' || prev === 'joining-room' ? 'negotiating' : prev);
        }
        // Send offer to peers we don't have a connection to
        peers.forEach(peerId => {
          const existingPC = pcRef.current.get(peerId);
          if (!existingPC || existingPC.connectionState === 'failed' || existingPC.connectionState === 'closed') {
            const peerData = state[peerId]?.[0] as any;
            const peerName = peerData?.name || 'User';
            log("  Will send offer to:", peerId, "in 500ms");
            setTimeout(() => sendOfferFnRef.current?.(peerId, peerName), 500);
          }
        });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key === user.id) return;
        const peerName = (newPresences[0] as any)?.name || 'User';
        log("➕ Peer joined:", key, "name:", peerName);
        if (mountedRef.current) {
          setCallPhase(prev => prev === 'waiting-for-peer' ? 'negotiating' : prev);
        }
        // Send offer with small delay
        setTimeout(() => sendOfferFnRef.current?.(key, peerName), 800);
        // Safety retry after 8s
        setTimeout(() => {
          const pc = pcRef.current.get(key);
          if (!pc || pc.connectionState !== 'connected') {
            log("🔄 Retrying offer to:", key, "after 8s (current state:", pc?.connectionState, ")");
            if (pc) { pc.close(); pcRef.current.delete(key); }
            sendOfferFnRef.current?.(key, peerName);
          }
        }, 8000);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key === user.id) return;
        log("➖ Peer left:", key);
        const pc = pcRef.current.get(key);
        if (pc) { pc.close(); pcRef.current.delete(key); }
        if (mountedRef.current) {
          setParticipants(prev => { const n = new Map(prev); n.delete(key); return n; });
        }
      })
      .on("broadcast", { event: "offer" }, ({ payload }) => {
        log("📨 Broadcast: offer from:", payload.from, "to:", payload.to, "(me:", user.id, ")");
        if (payload.to === user.id) {
          handleOfferFnRef.current?.(payload.from, payload.fromName, payload.offer);
        }
      })
      .on("broadcast", { event: "answer" }, ({ payload }) => {
        log("📨 Broadcast: answer from:", payload.from, "to:", payload.to, "(me:", user.id, ")");
        if (payload.to === user.id) {
          handleAnswerFnRef.current?.(payload.from, payload.answer);
        }
      })
      .on("broadcast", { event: "ice-candidate" }, ({ payload }) => {
        if (payload.to === user.id) {
          handleIceFnRef.current?.(payload.from, payload.candidate);
        }
      })
      .subscribe(async (status) => {
        log("📡 Channel subscription status:", status);
        if (status === "SUBSCRIBED") {
          log("✅ Channel subscribed, tracking presence...");
          await channel.track({ name: userName, joined_at: Date.now() });
          log("✅ Presence tracked");
          if (mountedRef.current) {
            setIsConnecting(false);
            setCallPhase('waiting-for-peer');
          }

          // Timeout after 45s
          timeoutRef.current = setTimeout(() => {
            const anyConnected = Array.from(pcRef.current.values()).some(pc => pc.connectionState === 'connected');
            log("⏰ 45s timeout check — anyConnected:", anyConnected);
            if (!anyConnected && mountedRef.current) {
              setError("Could not connect after 45 seconds. The other person may not be available, or the TURN servers may be unreachable.");
            }
          }, 45000);
        } else if (status === "CHANNEL_ERROR") {
          err("❌ Channel error!");
          if (mountedRef.current) {
            setError("Failed to join signaling channel. Check your internet connection.");
            setIsConnecting(false);
          }
        }
      });

    channelRef.current = channel;
  }, [roomId, user, userName, getAudio, testTurnServers]);

  // ── LEAVE ROOM ──
  const leaveRoom = useCallback(() => {
    log("👋 Leaving room");
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
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      leaveRoom();
    };
  }, [leaveRoom]);

  return {
    localStream, participants, isConnecting, isConnected, error, callStatus,
    connectionStats: null as ConnectionStats | null,
    connectionMode, callPhase, joinRoom, leaveRoom, toggleAudio, toggleVideo,
  };
};
