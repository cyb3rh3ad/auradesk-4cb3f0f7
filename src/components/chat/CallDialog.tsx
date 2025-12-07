import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2 } from "lucide-react";
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

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
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
  ],
  iceCandidatePoolSize: 10,
};

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
  const [connectionState, setConnectionState] = useState<"initializing" | "connecting" | "connected" | "failed">("initializing");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);
  const hasRemoteDescription = useRef(false);
  const makingOffer = useRef(false);
  const ignoreOffer = useRef(false);
  const polite = useRef(!isCaller); // Receiver is polite, caller is impolite

  const getInitials = (name: string) =>
    name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";

  // Set local video stream
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(console.warn);
    }
  }, [localStream]);

  // Set remote video stream
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(console.warn);
    }
  }, [remoteStream]);

  // Process queued ICE candidates
  const processIceCandidateQueue = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !hasRemoteDescription.current) return;

    console.log(`Processing ${iceCandidatesQueue.current.length} queued ICE candidates`);
    
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("Added queued ICE candidate");
        } catch (err) {
          console.warn("Failed to add queued ICE candidate:", err);
        }
      }
    }
  }, []);

  // Main call initialization
  useEffect(() => {
    if (!open || !user || !conversationId) return;

    let mounted = true;
    const cleanup = () => {
      mounted = false;
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
      hasRemoteDescription.current = false;
      iceCandidatesQueue.current = [];
    };

    const initializeCall = async () => {
      try {
        console.log(`[WebRTC] Initializing call, isCaller: ${isCaller}`);
        setConnectionState("initializing");

        // Get media stream
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        // Apply initial mute states
        stream.getAudioTracks().forEach((t) => (t.enabled = false));
        stream.getVideoTracks().forEach((t) => (t.enabled = !isVideoOff));
        setLocalStream(stream);
        console.log("[WebRTC] Got local stream");

        // Create peer connection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        // Add local tracks
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
          console.log(`[WebRTC] Added ${track.kind} track`);
        });

        // Handle incoming tracks
        pc.ontrack = (event) => {
          console.log("[WebRTC] Received remote track:", event.track.kind);
          if (event.streams[0] && mounted) {
            setRemoteStream(event.streams[0]);
            setConnectionState("connected");
          }
        };

        // Connection state monitoring
        pc.onconnectionstatechange = () => {
          console.log("[WebRTC] Connection state:", pc.connectionState);
          if (pc.connectionState === "connected") {
            setConnectionState("connected");
          } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            setConnectionState("failed");
          }
        };

        pc.oniceconnectionstatechange = () => {
          console.log("[WebRTC] ICE connection state:", pc.iceConnectionState);
        };

        // Setup signaling channel
        const channelName = `webrtc:${conversationId}`;
        const channel = supabase.channel(channelName, {
          config: { broadcast: { self: false } },
        });
        channelRef.current = channel;

        // Handle ICE candidates from local peer
        pc.onicecandidate = (event) => {
          if (event.candidate && channel) {
            console.log("[WebRTC] Sending ICE candidate");
            channel.send({
              type: "broadcast",
              event: "ice-candidate",
              payload: { candidate: event.candidate.toJSON(), from: user.id },
            });
          }
        };

        // Handle negotiation needed (for renegotiation)
        pc.onnegotiationneeded = async () => {
          try {
            makingOffer.current = true;
            await pc.setLocalDescription();
            console.log("[WebRTC] Sending offer (negotiation needed)");
            channel.send({
              type: "broadcast",
              event: "offer",
              payload: { description: pc.localDescription, from: user.id },
            });
          } catch (err) {
            console.error("[WebRTC] Negotiation error:", err);
          } finally {
            makingOffer.current = false;
          }
        };

        // Handle incoming offer
        channel.on("broadcast", { event: "offer" }, async ({ payload }) => {
          if (payload.from === user.id || !pcRef.current) return;
          console.log("[WebRTC] Received offer");

          const pc = pcRef.current;
          const offerCollision = makingOffer.current || pc.signalingState !== "stable";
          ignoreOffer.current = !polite.current && offerCollision;

          if (ignoreOffer.current) {
            console.log("[WebRTC] Ignoring offer (collision)");
            return;
          }

          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.description));
            hasRemoteDescription.current = true;
            await processIceCandidateQueue();

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            console.log("[WebRTC] Sending answer");
            channel.send({
              type: "broadcast",
              event: "answer",
              payload: { description: pc.localDescription, from: user.id },
            });
            
            setConnectionState("connecting");
          } catch (err) {
            console.error("[WebRTC] Error handling offer:", err);
          }
        });

        // Handle incoming answer
        channel.on("broadcast", { event: "answer" }, async ({ payload }) => {
          if (payload.from === user.id || !pcRef.current) return;
          console.log("[WebRTC] Received answer");

          try {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.description));
            hasRemoteDescription.current = true;
            await processIceCandidateQueue();
            setConnectionState("connecting");
          } catch (err) {
            console.error("[WebRTC] Error handling answer:", err);
          }
        });

        // Handle incoming ICE candidate
        channel.on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
          if (payload.from === user.id || !pcRef.current) return;
          console.log("[WebRTC] Received ICE candidate");

          if (!hasRemoteDescription.current) {
            console.log("[WebRTC] Queueing ICE candidate (no remote description yet)");
            iceCandidatesQueue.current.push(payload.candidate);
            return;
          }

          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
            console.log("[WebRTC] Added ICE candidate");
          } catch (err) {
            console.warn("[WebRTC] Failed to add ICE candidate:", err);
          }
        });

        // Handle ready signal
        channel.on("broadcast", { event: "ready" }, async ({ payload }) => {
          if (payload.from === user.id || !pcRef.current || !isCaller) return;
          console.log("[WebRTC] Received ready signal, creating offer");

          try {
            makingOffer.current = true;
            const offer = await pcRef.current.createOffer();
            await pcRef.current.setLocalDescription(offer);
            
            channel.send({
              type: "broadcast",
              event: "offer",
              payload: { description: pcRef.current.localDescription, from: user.id },
            });
            setConnectionState("connecting");
          } catch (err) {
            console.error("[WebRTC] Error creating offer:", err);
          } finally {
            makingOffer.current = false;
          }
        });

        // Subscribe to channel
        channel.subscribe(async (status) => {
          console.log("[WebRTC] Channel status:", status);
          if (status === "SUBSCRIBED") {
            if (!isCaller) {
              // Receiver sends ready signal
              console.log("[WebRTC] Sending ready signal");
              await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay
              channel.send({
                type: "broadcast",
                event: "ready",
                payload: { from: user.id },
              });
            }
            setConnectionState("connecting");
          }
        });

      } catch (err) {
        console.error("[WebRTC] Initialization error:", err);
        if (mounted) setConnectionState("failed");
      }
    };

    initializeCall();
    return cleanup;
  }, [open, user, conversationId, isCaller, processIceCandidateQueue]);

  const toggleMute = () => {
    if (localStream) {
      const newState = !isMuted;
      localStream.getAudioTracks().forEach((t) => (t.enabled = !newState));
      setIsMuted(newState);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = isVideoOff));
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleClose = () => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    onClose();
  };

  return (
    <Dialog open={open}>
      <DialogContent className="p-0 border-border/50 overflow-hidden max-w-2xl w-full bg-background/95">
        <VisuallyHidden.Root>
          <DialogTitle>Call with {conversationName}</DialogTitle>
        </VisuallyHidden.Root>
        
        <div className="relative aspect-video bg-black flex items-center justify-center">
          {/* Remote video or placeholder */}
          {connectionState === "connected" && remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center space-y-4">
              <Avatar className="w-32 h-32 mx-auto ring-4 ring-primary/20">
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                  {getInitials(conversationName)}
                </AvatarFallback>
              </Avatar>
              <div className="text-white">
                <p className="font-medium text-xl">{conversationName}</p>
                <p className="text-white/70 flex items-center justify-center gap-2">
                  {connectionState === "initializing" && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Initializing...</span>
                    </>
                  )}
                  {connectionState === "connecting" && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  )}
                  {connectionState === "failed" && (
                    <span className="text-red-400">Connection failed. Try again.</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Local video preview */}
          <div className="absolute bottom-4 right-4 w-40 aspect-video rounded-xl overflow-hidden border border-white/20 bg-card shadow-2xl">
            {!isVideoOff && localStream ? (
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

        {/* Controls */}
        <div className="flex justify-center gap-6 py-4 bg-card/50 border-t border-border/20">
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
            onClick={handleClose}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600"
          >
            <PhoneOff />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};