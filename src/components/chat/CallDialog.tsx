import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mic, MicOff, PhoneOff } from "lucide-react";
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
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOff, setIsVideoOff] = useState(!initialVideo);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "failed">("connecting");
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]); // Strict buffer for network info

  const getInitials = (name?: string) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  // Bind local preview
  useEffect(() => {
    if (localStream && localVideoRef.current && !isVideoOff) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isVideoOff]);

  // Wake up remote rendering loop
  useEffect(() => {
    let playTimer: NodeJS.Timeout;
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      const refreshMedia = async () => {
        try {
          if (remoteVideoRef.current) {
            await remoteVideoRef.current.play();
            setRemoteVideoEnabled(true);
            clearInterval(playTimer);
          }
        } catch (e) {
          /* Interaction bypass pending gesture */
        }
      };
      playTimer = setInterval(refreshMedia, 1500);
      refreshMedia();
    }
    return () => clearInterval(playTimer);
  }, [remoteStream]);

  useEffect(() => {
    if (!open || !user || !conversationId) return;
    let mounted = true;

    const flushQueue = async (pc: RTCPeerConnection) => {
      while (iceCandidatesQueue.current.length > 0) {
        const cand = iceCandidatesQueue.current.shift();
        if (cand) await pc.addIceCandidate(cand).catch(() => {});
      }
    };

    const initializeCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) return stream.getTracks().forEach((t) => t.stop());
        stream.getAudioTracks().forEach((t) => (t.enabled = false));
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
          iceTransportPolicy: "relay", // Ensure we use the bridge immediately
        });
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (event.streams[0] && mounted) {
            const incoming = event.streams[0];
            incoming.getTracks().forEach((t) => (t.enabled = true));
            setRemoteStream(incoming);
            setConnectionState("connected");
          }
        };

        const channel = supabase.channel(`webrtc:${conversationId}`);
        channelRef.current = channel;

        channel
          .on("broadcast", { event: "offer" }, async ({ payload }) => {
            if (payload.from === user.id || !pcRef.current) return;
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.offer));
            await flushQueue(pcRef.current); // Process buffer once offer is safe
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            channel.send({ type: "broadcast", event: "answer", payload: { answer, from: user.id } });
          })
          .on("broadcast", { event: "answer" }, async ({ payload }) => {
            if (payload.from === user.id || !pcRef.current) return;
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
            await flushQueue(pcRef.current);
          })
          .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
            if (payload.from === user.id || !pcRef.current) return;
            const cand = new RTCIceCandidate(payload.candidate);
            if (pcRef.current.remoteDescription) {
              await pcRef.current.addIceCandidate(cand).catch(() => {});
            } else {
              iceCandidatesQueue.current.push(cand); // Safe storage
            }
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED" && isCaller) {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              channel.send({ type: "broadcast", event: "offer", payload: { offer, from: user.id } });
            } else {
              channel.send({ type: "broadcast", event: "ready", payload: { from: user.id } });
            }
          });

        pc.onicecandidate = (event) => {
          if (event.candidate && channelRef.current) {
            channel.send({
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
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [open, user, conversationId, isCaller]);

  const toggleMute = () => {
    if (localStream) {
      const newState = !isMuted;
      localStream.getAudioTracks().forEach((t) => (t.enabled = !newState));
      setIsMuted(newState);
      remoteVideoRef.current?.play().catch(() => {}); // satisfy user gesture unblock
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="p-0 border-border/50 overflow-hidden max-w-2xl w-full bg-[#0a0a0a]">
        <VisuallyHidden.Root>
          <DialogTitle>Secure Meeting Room</DialogTitle>
        </VisuallyHidden.Root>
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {connectionState === "connected" && remoteVideoEnabled ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="text-center space-y-6">
              <Avatar className="w-32 h-32 mx-auto ring-4 ring-primary/20">
                <AvatarFallback className="bg-primary text-primary-foreground text-4xl font-bold">
                  {getInitials(conversationName)}
                </AvatarFallback>
              </Avatar>
              <div className="text-white space-y-2">
                <p className="font-semibold text-2xl tracking-tight">{conversationName}</p>
                {/* REMOVED CHINESE SYSTEM TEXT - Replaced with clean status */}
                <p className="text-white/60 text-sm flex items-center justify-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  {connectionState === "connecting" ? "Establishing secure link..." : "Verifying media tracks..."}
                </p>
              </div>
            </div>
          )}
          <div className="absolute bottom-4 right-4 w-44 aspect-video rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/80 backdrop-blur-md shadow-2xl transition-all duration-300">
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
              <Avatar className="w-full h-full flex items-center justify-center">
                <AvatarFallback className="bg-secondary/40 text-xs font-medium uppercase tracking-widest text-white/50">
                  You
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
        <div className="flex justify-center gap-6 py-6 bg-zinc-900/50 backdrop-blur-lg border-t border-white/5">
          <Button
            variant="ghost"
            onClick={toggleMute}
            className={cn(
              "w-16 h-16 rounded-full border-2 border-white/5 bg-white/5 transition-all active:scale-95",
              isMuted && "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20",
            )}
          >
            {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
          </Button>
          <Button
            variant="destructive"
            onClick={onClose}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 active:scale-90 shadow-lg shadow-red-600/20"
          >
            <PhoneOff size={28} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
