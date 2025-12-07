import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface CallDialogProps {
  open: boolean;
  onClose: () => void;
  conversationName: string;
  conversationId: string;
  initialVideo: boolean;
  isCaller?: boolean;
}

export const CallDialog = ({
  open,
  onClose,
  conversationName,
  conversationId,
  initialVideo,
  isCaller = true,
}: CallDialogProps) => {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!initialVideo);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "failed">("connecting");
  const [remoteProfile, setRemoteProfile] = useState<any>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]);

  const getInitials = (name: string) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  // FETCH PROFILE: Required for Google Meet look
  useEffect(() => {
    const fetchRemoteProfile = async () => {
      if (!conversationId || !user || !open) return;
      const { data: members } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", user.id);
      if (members?.[0]) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", members[0].user_id).single();
        if (profile) setRemoteProfile(profile);
      }
    };
    fetchRemoteProfile();
  }, [conversationId, user, open]);

  // UI BINDING: Force rendering
  useEffect(() => {
    if (localStream && localVideoRef.current && !isVideoOff) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isVideoOff]);

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((e) => console.error("Remote feed block:", e));
    }
  }, [remoteStream]);

  // MAIN WEBRTC ENGINE: Restored with Retries
  useEffect(() => {
    if (!open || !user || !conversationId) return;
    let mounted = true;
    let signalingPulse: NodeJS.Timeout;

    const initializeCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.getVideoTracks().forEach((t) => (t.enabled = !isVideoOff));
        setLocalStream(stream);

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            {
              urls: "turn:relay1.expressturn.com:3480",
              username: "000000002080378788",
              credential: "SiOBU1v7dEq/nYEK68gtSnz1en0=",
            },
          ],
        });
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream!));

        pc.ontrack = (event) => {
          if (event.streams[0] && mounted) {
            setRemoteStream(event.streams[0]);
            setConnectionState("connected");
          }
        };

        const channel = supabase.channel(`webrtc:${conversationId}`);
        channelRef.current = channel;

        // REDUNDANT SIGNALING: Handles race conditions
        channel
          .on("broadcast", { event: "offer" }, async ({ payload }) => {
            if (payload.from === user.id || !pcRef.current) return;
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.offer));

            while (iceCandidatesQueue.current.length > 0) {
              const cand = iceCandidatesQueue.current.shift();
              if (cand) await pcRef.current.addIceCandidate(cand);
            }

            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            channel.send({ type: "broadcast", event: "answer", payload: { answer, from: user.id } });
          })
          .on("broadcast", { event: "answer" }, async ({ payload }) => {
            if (payload.from === user.id || !pcRef.current) return;
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
          })
          .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
            if (payload.from === user.id || !pcRef.current) return;
            const cand = new RTCIceCandidate(payload.candidate);
            if (pcRef.current?.remoteDescription) {
              await pcRef.current.addIceCandidate(cand);
            } else {
              iceCandidatesQueue.current.push(cand);
            }
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              // HANDSHAKE LOOP: Pulse the offer until connection state changes
              signalingPulse = setInterval(async () => {
                if (pcRef.current?.connectionState === "connected" || !mounted) {
                  clearInterval(signalingPulse);
                  return;
                }
                if (isCaller && pcRef.current?.signalingState === "stable") {
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);
                  channel.send({ type: "broadcast", event: "offer", payload: { offer, from: user.id } });
                }
              }, 2000);
            }
          });

        pc.onicecandidate = (event) => {
          if (event.candidate && channelRef.current) {
            channelRef.current.send({
              type: "broadcast",
              event: "ice-candidate",
              payload: { candidate: event.candidate, from: user.id },
            });
          }
        };
      } catch (e) {
        if (mounted) setConnectionState("failed");
      }
    };

    initializeCall();
    return () => {
      mounted = false;
      pcRef.current?.close();
      if (signalingPulse) clearInterval(signalingPulse);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [open, user, conversationId, isCaller]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = isMuted));
      setIsMuted(!isMuted);
    }
  };
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = isVideoOff));
      setIsVideoOff(!isVideoOff);
    }
  };

  const displayName = remoteProfile?.full_name || conversationName;

  return (
    <Dialog open={open}>
      <DialogContent className="p-0 border-border/50 overflow-hidden max-w-2xl w-full">
        <VisuallyHidden.Root>
          <DialogTitle>Meeting Room</DialogTitle>
        </VisuallyHidden.Root>

        <div className="relative aspect-video bg-black flex items-center justify-center">
          {connectionState === "connected" ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="text-center space-y-4">
              <Avatar className="w-32 h-32 mx-auto ring-4 ring-primary/20">
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="text-white">
                <p className="font-medium text-xl">{displayName}</p>
                <p className="animate-pulse">{connectionState === "connecting" ? "Connecting..." : "Call Failed"}</p>
              </div>
            </div>
          )}

          <div className="absolute bottom-4 right-4 w-40 aspect-video rounded-xl overflow-hidden border border-white/20 bg-card shadow-2xl">
            {!isVideoOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-card">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-secondary text-xs">You</AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-6 py-4 bg-card/50 border-t">
          <Button
            variant="ghost"
            onClick={toggleMute}
            className={cn("w-14 h-14 rounded-full", isMuted && "bg-red-500/10 text-red-500")}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </Button>
          <Button
            variant="ghost"
            onClick={toggleVideo}
            className={cn("w-14 h-14 rounded-full", isVideoOff && "bg-red-500/10 text-red-500")}
          >
            {isVideoOff ? <VideoOff /> : <Video />}
          </Button>
          <Button
            variant="destructive"
            onClick={onClose}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600"
          >
            <PhoneOff />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
