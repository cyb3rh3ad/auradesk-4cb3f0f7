import { useEffect, useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  MonitorOff,
  Sparkles,
  Loader2,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDaily } from "@/hooks/useDaily";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export interface DailyRoomProps {
  roomName: string;
  participantName: string;
  onDisconnect: () => void;
  className?: string;
  initialVideo?: boolean;
  initialAudio?: boolean;
  isHost?: boolean;
}

export function DailyRoom({
  roomName,
  participantName,
  onDisconnect,
  className,
  initialVideo = true,
  initialAudio = true,
  isHost = false,
}: DailyRoomProps) {
  const { toast } = useToast();
  const {
    participants,
    localParticipant,
    isConnecting,
    isConnected,
    error,
    join,
    leave,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    isMuted,
    isCameraOff,
    isScreenSharing,
  } = useDaily();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Set up broadcast channel for call control
  useEffect(() => {
    if (!roomName) return;

    const channel = supabase.channel(`call-control-${roomName}`);

    channel
      .on("broadcast", { event: "call-ended" }, () => {
        toast({
          title: "Call Ended",
          description: "The host has ended the call",
        });
        handleDisconnect();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomName]);

  // Join on mount
  useEffect(() => {
    console.log("[DailyRoom] Joining room:", roomName);
    join(roomName, participantName, initialVideo, initialAudio);

    return () => {
      console.log("[DailyRoom] Leaving room on unmount");
      leave();
    };
  }, [roomName, participantName, initialVideo, initialAudio]);

  // Attach local video
  useEffect(() => {
    if (localVideoRef.current && localParticipant?.videoTrack) {
      const stream = new MediaStream([localParticipant.videoTrack]);
      localVideoRef.current.srcObject = stream;
    } else if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, [localParticipant?.videoTrack]);

  // Attach remote videos
  useEffect(() => {
    participants.forEach((participant, sessionId) => {
      const videoEl = remoteVideoRefs.current.get(sessionId);
      if (videoEl && participant.videoTrack) {
        const stream = new MediaStream([participant.videoTrack]);
        if (videoEl.srcObject !== stream) {
          videoEl.srcObject = stream;
        }
      } else if (videoEl) {
        videoEl.srcObject = null;
      }

      // Handle audio separately - create audio elements
      if (participant.audioTrack && !participant.isLocal) {
        const audioId = `audio-${sessionId}`;
        let audioEl = document.getElementById(audioId) as HTMLAudioElement;
        if (!audioEl) {
          audioEl = document.createElement("audio");
          audioEl.id = audioId;
          audioEl.autoplay = true;
          document.body.appendChild(audioEl);
        }
        const audioStream = new MediaStream([participant.audioTrack]);
        if (audioEl.srcObject !== audioStream) {
          audioEl.srcObject = audioStream;
          audioEl.play().catch(() => {});
        }
      }
    });

    // Cleanup audio elements for participants that left
    document.querySelectorAll("audio[id^='audio-']").forEach((el) => {
      const sessionId = el.id.replace("audio-", "");
      if (!participants.has(sessionId)) {
        el.remove();
      }
    });
  }, [participants]);

  const handleDisconnect = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    // Clean up audio elements
    document.querySelectorAll("audio[id^='audio-']").forEach((el) => el.remove());
    leave();
    onDisconnect();
  }, [leave, onDisconnect]);

  const handleEndCallForAll = useCallback(async () => {
    if (channelRef.current && isHost) {
      await channelRef.current.send({
        type: "broadcast",
        event: "call-ended",
        payload: {},
      });
    }
    handleDisconnect();
  }, [isHost, handleDisconnect]);

  // AI Transcription
  const toggleAITranscription = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser",
        variant: "destructive",
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          }
        }
        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript);
        }
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => {
        if (isRecording) recognition.start();
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      toast({
        title: "AI Recording Started",
        description: "The meeting is now being transcribed",
      });
    }
  }, [isRecording, toast]);

  const handleSummarize = async () => {
    if (!transcript.trim()) {
      toast({
        title: "No Transcript",
        description: "Start AI transcription first to generate a summary",
        variant: "destructive",
      });
      return;
    }

    setIsSummarizing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ text: transcript }),
        }
      );

      if (!response.ok) throw new Error("Failed to summarize");

      const data = await response.json();
      toast({
        title: "Summary Generated",
        description: data.summary.slice(0, 100) + "...",
      });
    } catch (err) {
      console.error("Summarization error:", err);
      toast({
        title: "Error",
        description: "Failed to generate summary",
        variant: "destructive",
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  const setRemoteVideoRef = useCallback(
    (sessionId: string, el: HTMLVideoElement | null) => {
      if (el) {
        remoteVideoRefs.current.set(sessionId, el);
        // Immediately attach if we have a track
        const participant = participants.get(sessionId);
        if (participant?.videoTrack) {
          const stream = new MediaStream([participant.videoTrack]);
          el.srcObject = stream;
        }
      } else {
        remoteVideoRefs.current.delete(sessionId);
      }
    },
    [participants]
  );

  // Loading state
  if (isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background text-foreground p-4 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Connecting to call...</p>
      </div>
    );
  }

  // Error state
  if (error && !isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background text-foreground p-4 gap-4">
        <p className="text-lg font-medium text-destructive">Connection Error</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <div className="flex gap-2">
          <Button onClick={() => join(roomName, participantName, initialVideo, initialAudio)}>
            Try Again
          </Button>
          <Button onClick={handleDisconnect} variant="outline">
            Leave
          </Button>
        </div>
      </div>
    );
  }

  // Disconnected state
  if (!isConnected && !isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background text-foreground p-4 gap-4">
        <p className="text-lg font-medium">Disconnected</p>
        <div className="flex gap-2">
          <Button onClick={() => join(roomName, participantName, initialVideo, initialAudio)}>
            Reconnect
          </Button>
          <Button onClick={handleDisconnect} variant="outline">
            Leave Call
          </Button>
        </div>
      </div>
    );
  }

  // Build participant list for rendering
  const allParticipants = [
    ...(localParticipant ? [{ ...localParticipant, sessionId: "local" }] : []),
    ...Array.from(participants.entries()).map(([sessionId, p]) => ({ ...p, sessionId })),
  ];

  const numParticipants = allParticipants.length;

  let gridCols = "grid-cols-1";
  if (numParticipants === 2) {
    gridCols = "md:grid-cols-2 grid-cols-1";
  } else if (numParticipants <= 4) {
    gridCols = "md:grid-cols-2 grid-cols-1";
  } else {
    gridCols = "md:grid-cols-3 grid-cols-2";
  }

  return (
    <div className={cn("flex flex-col h-full bg-background relative", className)}>
      {/* Connection indicator */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2 bg-background/70 rounded-full px-3 py-1.5">
        <Wifi className="h-4 w-4 text-green-500" />
        <span className="text-xs text-green-500">Connected (Daily)</span>
      </div>

      {/* Participants grid */}
      <div className={cn("flex-1 p-4 grid gap-4", gridCols)}>
        {allParticipants.map((participant) => {
          const isLocal = participant.isLocal;
          const hasVideo = participant.videoTrack && !participant.isCameraOff;
          const displayName = isLocal ? "You" : participant.name;

          return (
            <div
              key={participant.sessionId}
              className={cn(
                "relative rounded-xl overflow-hidden bg-muted aspect-video transition-all duration-200",
                participant.isSpeaking
                  ? "border-[3px] border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                  : "border-2 border-border",
                isLocal && "order-first"
              )}
            >
              {/* Video */}
              {hasVideo ? (
                <video
                  ref={isLocal ? localVideoRef : (el) => setRemoteVideoRef(participant.sessionId, el)}
                  autoPlay
                  playsInline
                  muted={isLocal}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="text-2xl">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}

              {/* Name badge */}
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/70 rounded text-foreground text-sm flex items-center gap-2">
                {participant.isMuted && <MicOff className="h-3 w-3 text-destructive" />}
                {participant.isCameraOff && <VideoOff className="h-3 w-3 text-destructive" />}
                <span>{displayName}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3 p-4 border-t border-border bg-background/80 backdrop-blur-sm">
        <Button
          variant={isMuted ? "destructive" : "secondary"}
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={toggleAudio}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button
          variant={isCameraOff ? "destructive" : "secondary"}
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={toggleVideo}
        >
          {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>

        <Button
          variant={isScreenSharing ? "default" : "secondary"}
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={toggleScreenShare}
        >
          {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
        </Button>

        <Button
          variant={isRecording ? "default" : "secondary"}
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={toggleAITranscription}
        >
          <Sparkles className={cn("h-5 w-5", isRecording && "text-primary-foreground")} />
        </Button>

        <Button
          variant="destructive"
          size="icon"
          className="rounded-full h-12 w-12"
          onClick={isHost ? handleEndCallForAll : handleDisconnect}
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
