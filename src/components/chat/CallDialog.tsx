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

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callStartTime = useRef<number | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]);

  // 1. FIX: Explicitly bind local stream to the video element's srcObject property
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log("Binding local stream to srcObject");
      localVideoRef.current.srcObject = localStream;

      // Mandatory play command to prevent frozen/blank frames in browsers
      localVideoRef.current.play().catch((err) => console.error("Self-view playback failed:", err));
    }
  }, [localStream]);

  // Rest of profile logic...
  useEffect(() => {
    const fetchRemoteProfile = async () => {
      if (!conversationId || !user) return;
      const { data: members } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", user.id);
      if (members && members.length > 0) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", members[0].user_id).single();
        if (profile) setRemoteProfile(profile);
      }
    };
    if (open) fetchRemoteProfile();
  }, [conversationId, user, open]);

  // Webrtc Handshake...
  useEffect(() => {
    if (!open || !user) return;
    let mounted = true;
    let stream: MediaStream | null = null;

    const initializeCall = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: initialVideo, audio: true });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setLocalStream(stream);

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
        });
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream!));

        pc.ontrack = (event) => {
          if (event.streams[0] && mounted) {
            const rStream = event.streams[0];
            setRemoteStream(rStream);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = rStream;
              remoteVideoRef.current.play().catch(() => {});
            }
            setConnectionState("connected");
          }
        };

        const channel = supabase.channel(`webrtc:${conversationId}`);
        channelRef.current = channel;
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") console.log("Ready for offer");
        });

        // offer/answer logic continues here...
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

  const endCall = () => {
    onClose();
  };
  const toggleMute = () => {
    if (localStream) localStream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsMuted(!isMuted);
  };
  const toggleVideo = () => {
    if (localStream) localStream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setIsVideoOff(!isVideoOff);
  };

  const displayName = remoteProfile?.full_name || conversationName;
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <Dialog open={open}>
      <DialogContent
        className={cn("p-0 p-0 border-border/50", isFullscreen ? "max-w-full w-full h-full" : "max-w-2xl")}
      >
        <VisuallyHidden.Root>
          <DialogTitle>Call with {displayName}</DialogTitle>
          <DialogDescription>Media stream display</DialogDescription>
        </VisuallyHidden.Root>

        <div className="flex justify-between px-4 py-3 bg-card/50">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                connectionState === "connected" ? "bg-green-500" : "bg-yellow-500 animate-pulse",
              )}
            />
            <span className="text-sm">{displayName}</span>
          </div>
          <span className="text-xs">{formatTime(callDuration)}</span>
        </div>

        <div className="relative aspect-video bg-black">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

          <div className="absolute bottom-4 right-4 w-32 md:w-40 rounded-lg overflow-hidden border border-white/10 shadow-lg">
            {localStream && !isVideoOff ? (
              // 2. FIX: Added muted, autoPlay, and playsInline for consistent rendering
              <video
                ref={localVideoRef}
                autoPlay
                muted // Mandatory to avoid loopback audio and follow browser privacy rules
                playsInline // Required for mobile Safari internal rendering
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }} // Mirror effect for natural feel
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-card/80 aspect-video">
                <Avatar>
                  <AvatarFallback>You</AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-4 py-4 bg-card/50 border-t">
          <Button variant="ghost" onClick={toggleMute} className="w-12 h-12 rounded-full">
            {isMuted ? <MicOff /> : <Mic />}
          </Button>
          <Button variant="ghost" onClick={toggleVideo} className="w-12 h-12 rounded-full">
            {isVideoOff ? <VideoOff /> : <Video />}
          </Button>
          <Button variant="destructive" onClick={endCall} className="w-14 h-14 rounded-full">
            <PhoneOff />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
