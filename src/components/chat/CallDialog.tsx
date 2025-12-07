import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2 } from "lucide-react";
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

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "failed">("connecting");
  const [remoteProfile, setRemoteProfile] = useState<Profile | null>(null);

  // Track visibility state for Meet-style UI
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // FIX 1: Explicitly bind local stream to srcObject and trigger play
  useEffect(() => {
    if (localStream && localVideoRef.current && !isVideoOff) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isVideoOff]);

  // FIX 2: Bind remote stream and monitor track state
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});

      // Watch for track enablement changes to toggle between video and profile pic
      const videoTrack = remoteStream.getVideoTracks()[0];
      if (videoTrack) {
        setRemoteVideoEnabled(videoTrack.enabled);
        videoTrack.onmute = () => setRemoteVideoEnabled(false);
        videoTrack.onunmute = () => setRemoteVideoEnabled(true);
      }
    }
  }, [remoteStream]);

  // Main WebRTC initialization
  useEffect(() => {
    if (!open || !user) return;
    let mounted = true;
    let stream: MediaStream | null = null;

    const initializeCall = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        // Disable initial video track if user requested it off
        stream.getVideoTracks().forEach((t) => (t.enabled = !isVideoOff));
        setLocalStream(stream);

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
        });
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream!));

        pc.ontrack = (event) => {
          if (event.streams[0] && mounted) {
            setRemoteStream(event.streams[0]);
            setConnectionState("connected");
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === "failed") setConnectionState("failed");
        };

        const channel = supabase.channel(`webrtc:${conversationId}`);
        channelRef.current = channel;
        channel.subscribe();
      } catch (e) {
        setConnectionState("failed");
      }
    };
    initializeCall();
    return () => {
      mounted = false;
      pcRef.current?.close();
    };
  }, [open, user, conversationId]);

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
      <DialogContent
        className={cn(
          "p-0 border-border/50 overflow-hidden",
          isFullscreen ? "max-w-full w-full h-full" : "max-w-2xl w-full",
        )}
      >
        <VisuallyHidden.Root>
          <DialogTitle>Call with {displayName}</DialogTitle>
          <DialogDescription>Video and voice call interface</DialogDescription>
        </VisuallyHidden.Root>

        {/* Meet-style Video Area */}
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {/* Remote Feed */}
          {remoteVideoEnabled ? (
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <div className="text-center space-y-4">
              <Avatar className="w-32 h-32 mx-auto">
                <AvatarImage src={remoteProfile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="text-white">
                <p className="font-medium text-xl">{displayName}</p>
                <p className="text-white/60 text-sm">
                  {connectionState === "connecting" ? "Connecting..." : "Camera Off"}
                </p>
              </div>
            </div>
          )}

          {/* Local Feed (PiP Style) */}
          <div className="absolute bottom-4 right-4 w-40 aspect-video rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-card">
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
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-secondary text-xs">{getInitials(user?.email || "You")}</AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
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
