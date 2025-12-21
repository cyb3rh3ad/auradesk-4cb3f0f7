import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Participant {
  odakle: string;
  stream: MediaStream | null;
  name: string;
}

// Multiple STUN servers for better NAT traversal success
// TURN servers provide relay fallback when P2P fails (~30% of connections)
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // Google STUN servers (free, reliable)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    // Additional public STUN servers for redundancy
    { urls: "stun:stun.stunprotocol.org:3478" },
    { urls: "stun:stun.voip.eutelia.it:3478" },
    // OpenRelay TURN servers (free tier - relay when P2P fails)
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    // Xirsys free TURN (backup)
    {
      urls: "turn:turn.anyfirewall.com:443?transport=tcp",
      username: "webrtc",
      credential: "webrtc",
    },
  ],
  iceCandidatePoolSize: 10,
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

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceCandidateBuffer = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const makingOffer = useRef<Set<string>>(new Set());
  const knownPeers = useRef<Map<string, string>>(new Map()); // peerId -> peerName

  const initializeMedia = useCallback(async (video: boolean = true, audio: boolean = true) => {
    try {
      console.log("[WebRTC] Requesting media:", { video, audio });
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video
          ? {
              width: { ideal: 1280, max: 1280 },
              height: { ideal: 720, max: 720 },
              frameRate: { ideal: 30, max: 30 },
            }
          : false,
        audio: audio ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
      });
      console.log("[WebRTC] Media obtained, tracks:", stream.getTracks().map(t => t.kind));
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (err: any) {
      console.error("[WebRTC] Media error:", err);
      setError(err.name === 'NotAllowedError' 
        ? "Camera/microphone permission denied. Please allow access." 
        : "Failed to access camera/microphone.");
      return null;
    }
  }, []);

  const createPeerConnection = useCallback(
    (remoteUserId: string, remoteName: string) => {
      if (!localStreamRef.current || !user) {
        console.error("[WebRTC] Cannot create peer connection - no local stream or user");
        return null;
      }

      // Check if connection already exists
      if (peerConnections.current.has(remoteUserId)) {
        console.log("[WebRTC] Peer connection already exists for:", remoteUserId);
        return peerConnections.current.get(remoteUserId)!;
      }

      console.log("[WebRTC] Creating peer connection for:", remoteUserId, remoteName);
      const pc = new RTCPeerConnection(ICE_SERVERS);
      
      // Add local tracks to the connection
      localStreamRef.current.getTracks().forEach((track) => {
        console.log("[WebRTC] Adding local track:", track.kind);
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.ontrack = (event) => {
        console.log("[WebRTC] Received remote track:", event.track.kind, "from:", remoteUserId);
        if (event.streams[0]) {
          setParticipants((prev) => {
            const newMap = new Map(prev);
            newMap.set(remoteUserId, { odakle: remoteUserId, stream: event.streams[0], name: remoteName });
            return newMap;
          });
          setCallStatus("IN_CALL");
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          console.log("[WebRTC] Sending ICE candidate to:", remoteUserId);
          channelRef.current.send({
            type: "broadcast",
            event: "ice-candidate",
            payload: { candidate: event.candidate.toJSON(), from: user.id, to: remoteUserId },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log("[WebRTC] Connection state for", remoteUserId, ":", pc.connectionState);
        if (pc.connectionState === 'connected') {
          setIsConnected(true);
          setCallStatus("IN_CALL");
        } else if (pc.connectionState === 'failed') {
          console.warn("[WebRTC] Connection failed for:", remoteUserId, "- attempting recovery");
          // Try ICE restart for failed connections
          pc.restartIce();
        } else if (pc.connectionState === 'disconnected') {
          console.warn("[WebRTC] Connection disconnected for:", remoteUserId, "- waiting for recovery");
          // Give it a moment to reconnect before taking action
          setTimeout(() => {
            if (pc.connectionState === 'disconnected') {
              console.log("[WebRTC] Still disconnected, attempting ICE restart");
              pc.restartIce();
            }
          }, 3000);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[WebRTC] ICE connection state for", remoteUserId, ":", pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          console.log("[WebRTC] ICE failed, restarting ICE");
          pc.restartIce();
        }
      };

      // Handle negotiation needed (for dynamic track changes)
      pc.onnegotiationneeded = async () => {
        console.log("[WebRTC] Negotiation needed for:", remoteUserId);
        if (isPolite(remoteUserId) && !makingOffer.current.has(remoteUserId)) {
          try {
            makingOffer.current.add(remoteUserId);
            const offer = await pc.createOffer();
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
    [user],
  );

  // Determine if this user should be the "polite" peer (sends offer)
  const isPolite = useCallback((remoteUserId: string) => {
    if (!user) return false;
    // Alphabetically lower ID is "polite" and initiates the offer
    return user.id < remoteUserId;
  }, [user]);

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

  return { localStream, participants, isConnecting, isConnected, error, callStatus, joinRoom, leaveRoom, toggleAudio, toggleVideo };
};
