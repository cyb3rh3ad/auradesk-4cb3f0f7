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

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const getInitials = (name?: string) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  // RE-ENABLE LOCAL PREVIEW
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // RE-ENABLE REMOTE VIEW
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteStream.getTracks().forEach((t) => (t.enabled = true));
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!open || !user || !conversationId) return;
    let mounted = true;

    const initializeCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) return stream.getTracks().forEach((t) => t.stop());

        // MIC OFF BY DEFAULT
        stream.getAudioTracks().forEach((t) => (t.enabled = false));
        setLocalStream(stream);

        // RESTORE DIRECT P2P (Standard routing)
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          iceTransportPolicy: "all",
        });
        pcRef.current = pc;

        // CLONE TRACKS to solve preview vs upload conflict
        stream.getTracks().forEach((track) => {
          pc.addTrack(track.clone(), stream);
        });

        pc.ontrack = (event) => {
          if (event.streams[0] && mounted) setRemoteStream(event.streams[0]);
        };

        pc.onconnectionstatechange = () => {
          if (mounted) setConnectionState(pc.connectionState as any);
        };

        const channel = supabase.channel(`webrtc:${conversationId}`);
        channelRef.current = channel;

        channel
          .on("broadcast", { event: "offer" }, async ({ payload }) => {
            if (payload.from === user.id || !pcRef.current) return;
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.offer));
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
            try {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {}
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              if (isCaller) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                channel.send({ type: "broadcast", event: "offer", payload: { offer, from: user.id } });
              }
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
      remoteVideoRef.current?.play().catch(() => {});
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="p-0 border-none overflow-hidden max-w-2xl w-full bg-[#111]">
        <VisuallyHidden.Root>
          <DialogTitle>Call Room</DialogTitle>
        </VisuallyHidden.Root>
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {connectionState === "connected" ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="text-center space-y-6">
              <Avatar className="w-32 h-32 mx-auto">
                <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                  {getInitials(conversationName)}
                </AvatarFallback>
              </Avatar>
              <div className="text-white">
                <p className="font-semibold text-xl">{conversationName}</p>
                <p className="animate-pulse opacity-50">
                  {connectionState === "connecting" ? "Connecting P2P..." : "Connection Failed"}
                </p>
              </div>
            </div>
          )}
          {/* Direct hardware preview small square */}
          <div className="absolute bottom-4 right-4 w-40 aspect-video rounded-xl overflow-hidden border border-white/20 bg-zinc-900 shadow-2xl">
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
        <div className="flex justify-center gap-6 py-6 bg-zinc-900/50">
          <Button
            variant="ghost"
            onClick={toggleMute}
            className={cn("w-14 h-14 rounded-full", isMuted && "bg-red-500/10 text-red-500")}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </Button>
          <Button
            variant="destructive"
            onClick={onClose}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700"
          >
            <PhoneOff />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
