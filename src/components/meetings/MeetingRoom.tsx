import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, Loader2 } from "lucide-react";

interface Participant {
  odakle: string;
  stream: MediaStream | null;
  name: string;
}

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun.services.mozilla.com" },
  {
    urls: "turn:relay1.expressturn.com:3480",
    username: "000000002080378788",
    credential: "SiOBU1v7dEq/nYEK68gtSnz1en0=",
  },
];

const useWebRTC = (meetingId: string | null, userName: string) => {
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
        audio: audio
          ? {
              echoCancellation: true,
              noiseSuppression: true,
            }
          : false,
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error("Error accessing media:", err);
      setError("Check camera/microphone permissions.");
      return null;
    }
  }, []);

  const createPeerConnection = useCallback(
    (remoteUserId: string, remoteName: string) => {
      if (!localStreamRef.current || !user) return null;
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      pc.ontrack = (event) => {
        setParticipants((prev) => {
          const newMap = new Map(prev);
          newMap.set(remoteUserId, { odakle: remoteUserId, stream: event.streams[0], name: remoteName });
          return newMap;
        });
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
        let offer = await pc.createOffer();
        offer.sdp = mangleAudioBitrate(offer.sdp!);
        await pc.setLocalDescription(offer);

        channelRef.current.send({
          type: "broadcast",
          event: "offer",
          payload: { offer: pc.localDescription, from: user.id, fromName: userName, to: remoteUserId },
        });
        setCallStatus("RINGING");
      } catch (err) {
        console.error("Offer error:", err);
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
        let answer = await pc.createAnswer();
        answer.sdp = mangleAudioBitrate(answer.sdp!);
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
          bufferedCandidates.forEach((cand) => pc.addIceCandidate(new RTCIceCandidate(cand)));
          iceCandidateBuffer.current.delete(from);
        }
      } catch (err) {
        console.error("Handle offer error:", err);
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
        bufferedCandidates.forEach((cand) => pc.addIceCandidate(new RTCIceCandidate(cand)));
        iceCandidateBuffer.current.delete(from);
      }
    } catch (err) {
      console.error("Answer handle error:", err);
    }
  }, []);

  const handleIceCandidate = useCallback(async (from: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnections.current.get(from);
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("ICE error:", err);
    }
  }, []);

  const joinRoom = useCallback(
    async (video = true, audio = true) => {
      if (!meetingId || !user) return;
      setIsConnecting(true);
      const stream = await initializeMedia(video, audio);
      if (!stream) {
        setIsConnecting(false);
        return;
      }

      const channel = supabase
        .channel(`meeting-${meetingId}`)
        .on("broadcast", { event: "user-joined" }, ({ payload }) => {
          if (payload.userId !== user.id) sendOffer(payload.userId, payload.userName);
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
        .on("broadcast", { event: "call-answered" }, ({ payload }) => {
          if (payload.to === user.id) setCallStatus("IN_CALL");
        })
        .on("broadcast", { event: "user-left" }, ({ payload }) => {
          if (payload.userId !== user.id) {
            const pc = peerConnections.current.get(payload.userId);
            if (pc) {
              pc.close();
              peerConnections.current.delete(payload.userId);
            }
            setParticipants((prev) => {
              const newMap = new Map(prev);
              newMap.delete(payload.userId);
              return newMap;
            });
          }
        })
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
    iceCandidateBuffer.current.clear();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    setParticipants(new Map());
    setCallStatus("IDLE");
  }, [user]);

  const toggleAudio = useCallback((enabled: boolean) => {
    if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = enabled));
  }, []);

  const toggleVideo = useCallback((enabled: boolean) => {
    if (localStreamRef.current) localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }, []);

  useEffect(() => {
    return () => leaveRoom();
  }, [leaveRoom]);

  return { localStream, participants, isConnecting, error, callStatus, joinRoom, leaveRoom, toggleAudio, toggleVideo };
};

// Remote Video Component
const RemoteVideo = ({ stream, name }: { stream: MediaStream | null; name: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/80 rounded text-xs font-medium">
        {name}
      </div>
    </div>
  );
};

// MeetingRoom Component
interface MeetingRoomProps {
  meetingId: string;
  meetingTitle: string;
  initialVideo?: boolean;
  onClose: () => void;
}

export const MeetingRoom = ({ meetingId, meetingTitle, initialVideo = true, onClose }: MeetingRoomProps) => {
  const { user } = useAuth();
  const [userName, setUserName] = useState(user?.email || "User");
  const { localStream, participants, isConnecting, error, joinRoom, leaveRoom, toggleAudio, toggleVideo } = useWebRTC(meetingId, userName);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!initialVideo);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Fetch profile for display name
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .single();
      if (data) {
        setUserName(data.full_name || data.username || user.email || "User");
      }
    };
    fetchProfile();
  }, [user]);

  // Join room on mount
  useEffect(() => {
    joinRoom(initialVideo, true);
  }, []);

  // Set local video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    toggleAudio(!newMuted);
  };

  const handleToggleVideo = () => {
    const newVideoOff = !isVideoOff;
    setIsVideoOff(newVideoOff);
    toggleVideo(!newVideoOff);
  };

  const handleEndCall = () => {
    leaveRoom();
    onClose();
  };

  const participantCount = participants.size + 1;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">{meetingTitle}</h3>
          <Badge variant="secondary" className="gap-1">
            <Users className="w-3 h-3" />
            {participantCount}
          </Badge>
          {isConnecting && (
            <Badge variant="outline" className="gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Connecting...
            </Badge>
          )}
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4 overflow-auto">
        {error ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-destructive">{error}</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {/* Local Video */}
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
              />
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/80 rounded text-xs font-medium">
                You
              </div>
              {isMuted && (
                <div className="absolute top-2 right-2">
                  <MicOff className="w-4 h-4 text-destructive" />
                </div>
              )}
            </div>

            {/* Remote Participants */}
            {Array.from(participants.values()).map((participant) => (
              <RemoteVideo
                key={participant.odakle}
                stream={participant.stream}
                name={participant.name}
              />
            ))}

            {/* Waiting indicator */}
            {participants.size === 0 && !isConnecting && (
              <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center border-2 border-dashed border-border">
                <p className="text-sm text-muted-foreground">Waiting for others to join...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={handleToggleMute}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Button
            variant={isVideoOff ? "destructive" : "secondary"}
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={handleToggleVideo}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14"
            onClick={handleEndCall}
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
