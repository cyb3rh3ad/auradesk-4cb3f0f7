import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Participant {
  odakle: string;
  stream: MediaStream | null;
  name: string;
}

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: "turn:relay1.expressturn.com:3480",
    username: "000000002080378788",
    credential: "SiOBU1v7dEq/nYEK68gtSnz1en0=",
  },
];

export const useWebRTC = (meetingId: string | null, userName: string) => {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<"IDLE" | "RINGING" | "IN_CALL">("IDLE");

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceCandidateBuffer = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // SDP Optimizer: Capping audio at 24kbps for high-density group calls
  const mangleAudioBitrate = (sdp: string, bitrate = 24) => {
    return sdp.replace(/a=fmtp:111 (.*)/g, `a=fmtp:111 $1;maxaveragebitrate=${bitrate * 1000}`);
  };

  const initializeMedia = useCallback(async (video: boolean = true, audio: boolean = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video
          ? {
              width: { ideal: 1280, max: 1280 },
              height: { ideal: 720, max: 720 },
              frameRate: { ideal: 30, max: 30 },
            }
          : false,
        audio: audio ? { echoCancellation: true, noiseSuppression: true } : false,
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      setError("Check camera/microphone permissions.");
      return null;
    }
  }, []);

  const createPeerConnection = useCallback(
    (remoteUserId: string, remoteName: string) => {
      if (!localStreamRef.current || !user) return null;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));

      pc.ontrack = (event) => {
        if (event.streams[0]) {
          setParticipants((prev) => {
            const newMap = new Map(prev);
            newMap.set(remoteUserId, { odakle: remoteUserId, stream: event.streams[0], name: remoteName });
            return newMap;
          });
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          if (pc.signalingState !== "stable" && !pc.remoteDescription) {
            const buffer = iceCandidateBuffer.current.get(remoteUserId) || [];
            buffer.push(event.candidate.toJSON());
            iceCandidateBuffer.current.set(remoteUserId, buffer);
            return;
          }
          channelRef.current.send({
            type: "broadcast",
            event: "ice-candidate",
            payload: { candidate: event.candidate, from: user.id, to: remoteUserId },
          });
        }
      };

      peerConnections.current.set(remoteUserId, pc);
      return pc;
    },
    [user],
  );

  const sendOffer = useCallback(
    async (remoteUserId: string, remoteName: string) => {
      const pc = createPeerConnection(remoteUserId, remoteName);
      if (!pc || !channelRef.current || !user) return;
      try {
        const offer = await pc.createOffer();
        offer.sdp = mangleAudioBitrate(offer.sdp!); // Apply bitrate cap
        await pc.setLocalDescription(offer);
        channelRef.current.send({
          type: "broadcast",
          event: "offer",
          payload: { offer: pc.localDescription, from: user.id, fromName: userName, to: remoteUserId },
        });
      } catch (err) {
        console.error("Offer Error:", err);
      }
    },
    [createPeerConnection, userName, user],
  );

  const handleOffer = useCallback(
    async (from: string, fromName: string, offer: RTCSessionDescriptionInit) => {
      if (!user) return;
      if (!localStreamRef.current) await initializeMedia(true, true);

      let pc = peerConnections.current.get(from) || createPeerConnection(from, fromName);
      if (!pc || !channelRef.current) return;
      setCallStatus("RINGING");

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        answer.sdp = mangleAudioBitrate(answer.sdp!); // Apply bitrate cap
        await pc.setLocalDescription(answer);

        channelRef.current.send({
          type: "broadcast",
          event: "answer",
          payload: { answer: pc.localDescription, from: user.id, to: from },
        });
        channelRef.current.send({ type: "broadcast", event: "call-answered", payload: { from: user.id, to: from } });
        setCallStatus("IN_CALL");

        const bufferedCandidates = iceCandidateBuffer.current.get(from);
        if (bufferedCandidates) {
          bufferedCandidates.forEach((cand) => pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {}));
          iceCandidateBuffer.current.delete(from);
        }
      } catch (err) {
        console.error("Signaling Negotiation Error:", err);
      }
    },
    [createPeerConnection, user, initializeMedia],
  );

  const handleAnswer = useCallback(async (from: string, answer: RTCSessionDescriptionInit) => {
    const pc = peerConnections.current.get(from);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      const bufferedCandidates = iceCandidateBuffer.current.get(from);
      if (bufferedCandidates) {
        bufferedCandidates.forEach((cand) => pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {}));
        iceCandidateBuffer.current.delete(from);
      }
    } catch (err) {
      console.error("Answer Process Error:", err);
    }
  }, []);

  const handleIceCandidate = useCallback(async (from: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnections.current.get(from);
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn("ICE candidate skipped.");
    }
  }, []);

  const joinRoom = useCallback(
    async (video: boolean = true, audio: boolean = true) => {
      if (!meetingId || !user) return;
      setIsConnecting(true);
      const stream = await initializeMedia(video, audio);
      if (!stream) {
        setIsConnecting(false);
        return;
      }

      const channel = supabase.channel(`meeting-${meetingId}`);
      channel
        .on("broadcast", { event: "user-joined" }, ({ payload }) => {
          if (payload.userId !== user.id) {
            // RESTORED: Signaling Handshake
            channel.send({ type: "broadcast", event: "ready", payload: { from: user.id } });
          }
        })
        .on("broadcast", { event: "ready" }, ({ payload }) => {
          // HANDSHAKE: Trigger offer only when callee is ready
          if (payload.from !== user.id) sendOffer(payload.from, userName);
        })
        .on("broadcast", { event: "offer" }, ({ payload }) => {
          if (payload.to === user.id) handleOffer(payload.from, payload.fromName, payload.offer);
        })
        .on("broadcast", { event: "answer" }, ({ payload }) => {
          if (payload.to === user.id) handleAnswer(payload.from, payload.answer);
        })
        .on("broadcast", { event: "ice-candidate" }, ({ payload }) => {
          if (payload.to === user.id) handleIceCandidate(payload.from, payload.candidate);
        })
        .on("broadcast", { event: "call-answered" }, () => setCallStatus("IN_CALL"))
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            channel.send({ type: "broadcast", event: "user-joined", payload: { userId: user.id, userName } });
            setIsConnecting(false);
          }
        });
      channelRef.current = channel;
    },
    [meetingId, user, userName, initializeMedia, sendOffer, handleOffer, handleAnswer, handleIceCandidate],
  );

  const leaveRoom = useCallback(() => {
    if (channelRef.current && user) {
      channelRef.current.send({ type: "broadcast", event: "user-left", payload: { userId: user.id } });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    setParticipants(new Map());
    setCallStatus("IDLE");
  }, [user]);

  const toggleAudio = useCallback((muted: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }, []);

  const toggleVideo = useCallback((videoOff: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !videoOff;
      });
    }
  }, []);

  useEffect(() => {
    return () => leaveRoom();
  }, [leaveRoom]);

  return { localStream, participants, isConnecting, error, callStatus, joinRoom, leaveRoom, toggleAudio, toggleVideo };
};
