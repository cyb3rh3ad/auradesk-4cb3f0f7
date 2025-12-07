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
  const candidatesQueue = useRef<RTCIceCandidate[]>([]);

  const getInitials = (name?: string) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  // AGGRESSIVE RENDER LOOP: Retries playback until gesture is detected
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
          /* Pending Interaction */
        }
      };
      playTimer = setInterval(refreshMedia, 1000);
      refreshMedia();
    }
    return () => clearInterval(playTimer);
  }, [remoteStream]);

  useEffect(() => {
    if (localStream && localVideoRef.current && !isVideoOff) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isVideoOff]);

  useEffect(() => {
    if (!open || !user || !conversationId) return;
    let mounted = true;

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
          // ROUTING CHANGE: Force relay only to bypass standard router stalls
          iceTransportPolicy: "relay",
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

            // SIGNALING LOCK: Flush candidates only after description is solid
            while (candidatesQueue.current.length > 0) {
              const cand = candidatesQueue.current.shift();
              if (cand) await pcRef.current.addIceCandidate(cand);
            }

            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
            channel.send({ type: "broadcast", event: "answer", payload: { answer, from: user.id } });
          })
          .on("broadcast", { event: "answer" }, async ({ payload }) => {
            if (payload.from === user.id || !pcRef.current) return;
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
            while (candidatesQueue.current.length > 0) {
              const cand = candidatesQueue.current.shift();
              if (cand) await pcRef.current.addIceCandidate(cand);
            }
          })
          .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
            if (payload.from === user.id || !pcRef.current) return;
            const cand = new RTCIceCandidate(payload.candidate);
            if (pcRef.current.remoteDescription) {
              await pcRef.current.addIceCandidate(cand).catch(() => {});
            } else {
              candidatesQueue.current.push(cand);
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
      remoteVideoRef.current?.play().catch(() => {}); // удовлетворить gesture policy
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="p-0 border-border/50 overflow-hidden max-w-2xl w-full bg-zinc-950">
        <VisuallyHidden.Root>
          <DialogTitle>Connection</DialogTitle>
        </VisuallyHidden.Root>
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {connectionState === "connected" && remoteVideoEnabled ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="text-center space-y-6">
              <Avatar className="w-32 h-32 mx-auto ring-4 ring-primary/20 scale-110">
                <AvatarFallback className="bg-primary text-primary-foreground text-4xl font-bold">
                  {getInitials(conversationName)}
                </AvatarFallback>
              </Avatar>
              <div className="text-white space-y-1">
                <p className="font-semibold text-2xl tracking-tight uppercase">{conversationName}</p>
                <p className="text-white/40 text-xs flex items-center justify-center gap-2 tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  {connectionState === "connecting" ? "Establishing Routing..." : "Waiting for Audio"}
                </p>
              </div>
            </div>
          )}
          <div className="absolute bottom-4 right-4 w-44 aspect-video rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 shadow-2xl transition-all duration-300">
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
              <div className="w-full h-full flex items-center justify-center">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-zinc-800 text-xs uppercase text-white/50 font-bold">You</AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-center gap-8 py-8 bg-zinc-900/40 backdrop-blur-md border-t border-white/5">
          <Button
            variant="ghost"
            onClick={toggleMute}
            className={cn(
              "w-16 h-16 rounded-full border border-white/10 transition-all active:scale-90",
              isMuted && "bg-red-500/10 text-red-500 border-red-500/20",
            )}
          >
            {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
          </Button>
          <Button
            variant="destructive"
            onClick={onClose}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 shadow-xl shadow-red-950/20 active:scale-90 transition-all"
          >
            <PhoneOff size={28} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
