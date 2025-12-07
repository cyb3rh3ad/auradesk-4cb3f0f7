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
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "failed">("connecting");
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]);

  const getInitials = (name?: string) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  // AGGRESSIVE PLAYBACK:Retries play every 1s until successful interaction
  useEffect(() => {
    let playInterval: NodeJS.Timeout;
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      const forcePlay = async () => {
        try {
          if (remoteVideoRef.current) {
            await remoteVideoRef.current.play();
            setRemoteVideoEnabled(true);
            setConnectionState("connected");
            clearInterval(playInterval);
          }
        } catch (e) {
          console.warn("Browser holding unmuted audio... albina must click screen");
        }
      };
      playInterval = setInterval(forcePlay, 1000);
      forcePlay();
    }
    return () => clearInterval(playInterval);
  }, [remoteStream]);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  useEffect(() => {
    if (!open || !user || !conversationId) return;
    let mounted = true;

    const initializeCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) return stream.getTracks().forEach((t) => t.stop());
        stream.getAudioTracks().forEach((t) => (t.enabled = false));
        setLocalStream(stream);

        // FORCED RELAY: The 'Google Meet' bypass logic
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            {
              urls: "turn:relay1.expressturn.com:3480",
              username: "000000002080378788",
              credential: "SiOBU1v7dEq/nYEK68gtSnz1en0=",
            },
          ],
          iceTransportPolicy: "relay", // FORCE RELAY: Bypasses 100% of router stalls
        });
        pcRef.current = pc;
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (event.streams[0] && mounted) {
            const rStream = event.streams[0];
            rStream.getTracks().forEach((t) => (t.enabled = true)); // Manual enablement sync
            setRemoteStream(rStream);
          }
        };

        const channel = supabase.channel(`webrtc:${conversationId}`);
        channelRef.current = channel;

        channel
          .on("broadcast", { event: "offer" }, async ({ payload }) => {
            if (payload.from === user.id || !pcRef.current) return;
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.offer));
            // Buffer flush ensuring candidates aren't applied to empty description
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
            if (pcRef.current.remoteDescription) {
              await pcRef.current.addIceCandidate(cand).catch(() => {});
            } else {
              iceCandidatesQueue.current.push(cand);
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
      remoteVideoRef.current?.play().catch(() => {}); // satisfy user click policy
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="p-0 border-border/50 overflow-hidden max-w-2xl w-full bg-zinc-950">
        <VisuallyHidden.Root>
          <DialogTitle>Secure Connection</DialogTitle>
        </VisuallyHidden.Root>
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {connectionState === "connected" && remoteVideoEnabled ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="text-center space-y-6">
              <Avatar className="w-32 h-32 mx-auto ring-2 ring-blue-500/20 shadow-2xl">
                <AvatarFallback className="bg-zinc-900 text-primary text-4xl font-black">
                  {getInitials(conversationName)}
                </AvatarFallback>
              </Avatar>
              <div className="text-white space-y-2">
                <p className="font-bold text-2xl tracking-tighter uppercase">{conversationName}</p>
                <div className="flex items-center justify-center gap-3 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-blue-400">
                    Establishing Relay Path
                  </span>
                </div>
              </div>
            </div>
          )}
          <div className="absolute bottom-6 right-6 w-44 aspect-video rounded-3xl overflow-hidden border border-white/5 bg-zinc-900 shadow-2xl transition-all duration-500 ring-1 ring-white/10">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          </div>
        </div>
        <div className="flex justify-center gap-10 py-10 bg-zinc-900/80 backdrop-blur-xl border-t border-white/5">
          <Button
            variant="ghost"
            onClick={toggleMute}
            className={cn(
              "w-16 h-16 rounded-full border-2 transition-all hover:scale-110 active:scale-95",
              isMuted ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-white/5 border-white/10 text-white",
            )}
          >
            {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
          </Button>
          <Button
            variant="destructive"
            onClick={onClose}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 shadow-2xl shadow-red-950/40 hover:scale-110 active:scale-90 transition-all"
          >
            <PhoneOff size={28} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
