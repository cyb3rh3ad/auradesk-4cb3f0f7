import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff, 
  Sparkles, Loader2, Radio, Server, MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebRTC, ConnectionStats } from "@/hooks/useWebRTC";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getSupabaseFunctionsUrl } from "@/lib/supabase-config";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";

type PiPMode = 'mini' | 'small' | 'medium' | 'full';

export interface WebRTCRoomProps {
  roomName: string;
  participantName: string;
  onDisconnect: () => void;
  className?: string;
  initialVideo?: boolean;
  initialAudio?: boolean;
  isHost?: boolean;
  pipMode?: PiPMode;
}

export function WebRTCRoom({ 
  roomName, 
  participantName, 
  onDisconnect, 
  className,
  initialVideo = true,
  initialAudio = true,
  isHost = false,
  pipMode = 'full',
}: WebRTCRoomProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    localStream,
    participants,
    isConnecting,
    isConnected,
    error,
    callStatus,
    connectionStats,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
  } = useWebRTC(roomName, participantName);

  const [isMuted, setIsMuted] = useState(!initialAudio);
  const [isCameraOff, setIsCameraOff] = useState(!initialVideo);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const recognitionRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const channelRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-hide controls in mini/small mode
  useEffect(() => {
    if (pipMode === 'mini' || pipMode === 'small') {
      setShowControls(true);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    } else {
      setShowControls(true);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [pipMode]);

  // Show controls on interaction
  const handleInteraction = () => {
    if (pipMode === 'mini' || pipMode === 'small') {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // Set up real-time channel for call control events
  useEffect(() => {
    if (!roomName) return;

    const channel = supabase.channel(`call-control-${roomName}`);
    
    channel
      .on('broadcast', { event: 'call-ended' }, () => {
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

  // Connect on mount
  useEffect(() => {
    console.log("WebRTCRoom: Joining room", roomName);
    joinRoom(initialVideo, initialAudio);

    return () => {
      console.log("WebRTCRoom: Leaving room on unmount");
      leaveRoom();
    };
  }, [roomName]);

  // Attach local video
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Apply initial mute/camera states
  useEffect(() => {
    if (localStream) {
      toggleAudio(isMuted);
      toggleVideo(isCameraOff);
    }
  }, [localStream, isMuted, isCameraOff, toggleAudio, toggleVideo]);

  const handleDisconnect = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    leaveRoom();
    onDisconnect();
  }, [leaveRoom, onDisconnect]);

  const handleEndCallForAll = useCallback(async () => {
    if (channelRef.current && isHost) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'call-ended',
        payload: {},
      });
    }
    handleDisconnect();
  }, [isHost, handleDisconnect]);

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    toggleAudio(newMuted);
  };

  const handleToggleCamera = () => {
    const newCameraOff = !isCameraOff;
    setIsCameraOff(newCameraOff);
    toggleVideo(newCameraOff);
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
        }
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });
          const newVideoTrack = newStream.getVideoTracks()[0];
          localStream.removeTrack(localStream.getVideoTracks()[0]);
          localStream.addTrack(newVideoTrack);
          setIsScreenSharing(false);
        } catch (err) {
          console.error("Failed to switch back to camera:", err);
        }
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        if (localStream) {
          const videoTrack = localStream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.stop();
            localStream.removeTrack(videoTrack);
          }
          localStream.addTrack(screenStream.getVideoTracks()[0]);
          setIsScreenSharing(true);
          
          screenStream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
            handleToggleScreenShare();
          };
        }
      } catch (err) {
        console.error("Failed to start screen share:", err);
      }
    }
  };

  // AI Transcription
  const toggleAITranscription = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
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
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += t + ' ';
          }
        }
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${getSupabaseFunctionsUrl()}/summarize`,
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background text-foreground p-4 gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => joinRoom(initialVideo, initialAudio)} variant="default">Reconnect</Button>
        <Button onClick={handleDisconnect} variant="outline">Leave</Button>
      </div>
    );
  }

  if (isConnecting || !isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background text-foreground p-4 gap-4">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
        </div>
        <p className="text-muted-foreground">Connecting to call...</p>
      </div>
    );
  }

  // Build participant list
  const allParticipants = [
    { id: user?.id || 'local', name: participantName, stream: localStream, isLocal: true },
    ...Array.from(participants.values()).map(p => ({
      id: p.odakle,
      name: p.name,
      stream: p.stream,
      isLocal: false,
    })),
  ];

  // Determine visible participants based on PiP mode
  const getVisibleParticipants = () => {
    switch (pipMode) {
      case 'mini':
        // Show only active speaker or first remote participant
        const remote = allParticipants.find(p => !p.isLocal);
        return remote ? [remote] : [allParticipants[0]];
      case 'small':
        // Show remote + small self preview
        return allParticipants.slice(0, 2);
      case 'medium':
        return allParticipants.slice(0, 3);
      default:
        return allParticipants;
    }
  };

  const visibleParticipants = getVisibleParticipants();
  const numParticipants = visibleParticipants.length;

  // Grid layout based on participants and mode
  const getGridClass = () => {
    if (pipMode === 'mini') return "grid-cols-1";
    if (pipMode === 'small') return numParticipants > 1 ? "grid-cols-2" : "grid-cols-1";
    if (numParticipants === 1) return "grid-cols-1";
    if (numParticipants === 2) return "md:grid-cols-2 grid-cols-1";
    if (numParticipants <= 4) return "md:grid-cols-2 grid-cols-2";
    return "md:grid-cols-3 grid-cols-2";
  };

  // Button size based on mode
  const buttonSize = pipMode === 'mini' || pipMode === 'small' ? 'sm' : 'default';
  const iconSize = pipMode === 'mini' || pipMode === 'small' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div 
      className={cn("flex flex-col h-full bg-background relative overflow-hidden", className)}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {/* Connection Quality Indicator - hide in mini mode */}
      {connectionStats && pipMode !== 'mini' && (
        <ConnectionQualityIndicator stats={connectionStats} compact={pipMode === 'small'} />
      )}
      
      {/* Participants grid */}
      <div className={cn(
        "flex-1 grid gap-1 p-1",
        getGridClass(),
        pipMode === 'mini' && "p-0 gap-0"
      )}>
        <AnimatePresence mode="popLayout">
          {visibleParticipants.map((participant, index) => {
            const hasVideo = participant.stream?.getVideoTracks().some(t => t.enabled);
            const displayName = participant.isLocal ? "You" : participant.name;
            
            // In small mode, make local video a PiP overlay
            const isOverlay = pipMode === 'small' && participant.isLocal && numParticipants > 1;

            return (
              <motion.div
                key={participant.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className={cn(
                  "relative rounded-lg overflow-hidden bg-muted/50 group transition-all duration-200",
                  isOverlay && "absolute bottom-14 right-2 w-24 h-32 z-20 rounded-xl shadow-lg border border-border/50",
                  !isOverlay && "aspect-video border border-border/30",
                  participant.isLocal && !isOverlay && "order-last"
                )}
              >
                {/* Video display */}
                {participant.stream && hasVideo && (
                  <VideoElement 
                    stream={participant.stream} 
                    muted={participant.isLocal}
                    isLocal={participant.isLocal}
                  />
                )}

                {/* Avatar when camera off */}
                {(!participant.stream || !hasVideo) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/80">
                    <Avatar className={cn(
                      "ring-2 ring-border/50",
                      pipMode === 'mini' ? "h-12 w-12" : "h-16 w-16 md:h-20 md:w-20"
                    )}>
                      <AvatarFallback className={cn(
                        "bg-gradient-to-br from-primary/80 to-accent/80 text-primary-foreground font-semibold",
                        pipMode === 'mini' ? "text-lg" : "text-xl md:text-2xl"
                      )}>
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}

                {/* Name label - hide in mini mode overlay */}
                {!(isOverlay || pipMode === 'mini') && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/70 backdrop-blur-sm rounded-md text-foreground text-xs flex items-center gap-1.5">
                    {displayName}
                    {isHost && participant.isLocal && (
                      <span className="text-[10px] bg-primary/20 text-primary px-1 py-0.5 rounded">Host</span>
                    )}
                  </div>
                )}

                {/* Status icons */}
                {participant.isLocal && (isMuted || isCameraOff) && !isOverlay && (
                  <div className="absolute top-2 right-2 flex gap-1">
                    {isMuted && (
                      <div className="p-1 bg-red-500/80 rounded-full">
                        <MicOff className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {isCameraOff && (
                      <div className="p-1 bg-red-500/80 rounded-full">
                        <VideoOff className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Transcript display - hide in mini/small mode */}
      {isRecording && transcript && pipMode === 'full' && (
        <div className="mx-2 mb-1 p-2 bg-muted/50 backdrop-blur-sm rounded-lg max-h-16 overflow-y-auto">
          <p className="text-xs text-muted-foreground">{transcript.slice(-200)}</p>
        </div>
      )}

      {/* Controls - Glassmorphism bar */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "flex justify-center items-center gap-1.5 p-2",
              "bg-muted/80 backdrop-blur-md border-t border-border/30",
              pipMode === 'mini' && "p-1 gap-1"
            )}
          >
            <Button 
              onClick={handleToggleMute} 
              variant={isMuted ? "destructive" : "secondary"}
              size="icon"
              className={cn(
                "rounded-full transition-all",
                pipMode === 'mini' ? "h-8 w-8" : "h-10 w-10"
              )}
            >
              {isMuted ? <MicOff className={iconSize} /> : <Mic className={iconSize} />}
            </Button>

            <Button 
              onClick={handleToggleCamera} 
              variant={isCameraOff ? "destructive" : "secondary"}
              size="icon"
              className={cn(
                "rounded-full transition-all",
                pipMode === 'mini' ? "h-8 w-8" : "h-10 w-10"
              )}
            >
              {isCameraOff ? <VideoOff className={iconSize} /> : <Video className={iconSize} />}
            </Button>

            {/* Additional controls - hide in mini mode */}
            {pipMode !== 'mini' && (
              <>
                <Button 
                  onClick={handleToggleScreenShare} 
                  variant={isScreenSharing ? "default" : "secondary"}
                  size="icon"
                  className="rounded-full h-10 w-10"
                >
                  {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                </Button>

                {pipMode === 'full' && (
                  <Button 
                    onClick={toggleAITranscription} 
                    variant={isRecording ? "default" : "secondary"}
                    size="icon"
                    className="rounded-full h-10 w-10"
                    title="AI Transcription"
                  >
                    <Sparkles className={cn("w-5 h-5", isRecording && "text-yellow-400")} />
                  </Button>
                )}

                {isRecording && pipMode === 'full' && (
                  <Button 
                    onClick={handleSummarize} 
                    variant="outline"
                    size="sm"
                    disabled={isSummarizing}
                    className="gap-1 rounded-full"
                  >
                    {isSummarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Summarize"}
                  </Button>
                )}
              </>
            )}

            {/* End call button */}
            <Button 
              onClick={isHost ? handleEndCallForAll : handleDisconnect} 
              variant="destructive" 
              size="icon"
              className={cn(
                "rounded-full transition-all",
                pipMode === 'mini' ? "h-8 w-8" : "h-10 w-10"
              )}
              title={isHost ? "End call for all" : "Leave call"}
            >
              <PhoneOff className={iconSize} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Connection quality indicator component
function ConnectionQualityIndicator({ stats, compact = false }: { stats: ConnectionStats; compact?: boolean }) {
  const qualityColors = {
    excellent: 'text-green-500',
    good: 'text-green-400',
    fair: 'text-yellow-500',
    poor: 'text-red-500',
  };

  const qualityBgColors = {
    excellent: 'bg-green-500/20',
    good: 'bg-green-400/20',
    fair: 'bg-yellow-500/20',
    poor: 'bg-red-500/20',
  };

  if (compact) {
    return (
      <div className={cn(
        "absolute top-1 right-1 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full",
        qualityBgColors[stats.connectionQuality],
        "backdrop-blur-sm"
      )}>
        {stats.isRelay ? (
          <Server className={cn("h-3 w-3", qualityColors[stats.connectionQuality])} />
        ) : (
          <Radio className={cn("h-3 w-3", qualityColors[stats.connectionQuality])} />
        )}
      </div>
    );
  }

  const formatBandwidth = (kbps: number) => {
    if (kbps >= 1000) {
      return `${(kbps / 1000).toFixed(1)} Mbps`;
    }
    return `${kbps} kbps`;
  };

  const adaptiveModeLabels = {
    'high': 'HD',
    'medium': 'SD',
    'low': 'Low',
    'audio-only': 'Audio',
  };

  const adaptiveModeColors = {
    'high': 'text-green-500',
    'medium': 'text-blue-500',
    'low': 'text-yellow-500',
    'audio-only': 'text-orange-500',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full",
            qualityBgColors[stats.connectionQuality],
            "backdrop-blur-sm border border-border/30"
          )}>
            {stats.isRelay ? (
              <Server className={cn("h-3.5 w-3.5", qualityColors[stats.connectionQuality])} />
            ) : (
              <Radio className={cn("h-3.5 w-3.5", qualityColors[stats.connectionQuality])} />
            )}
            <span className={cn("text-[10px] font-medium", qualityColors[stats.connectionQuality])}>
              {stats.isRelay ? 'Relay' : 'P2P'}
            </span>
            <span className={cn("text-[10px] font-medium", adaptiveModeColors[stats.adaptiveMode])}>
              {adaptiveModeLabels[stats.adaptiveMode]}
            </span>
            <div className="flex gap-0.5 ml-0.5">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={cn(
                    "w-0.5 rounded-full transition-all",
                    bar === 1 && "h-1",
                    bar === 2 && "h-1.5",
                    bar === 3 && "h-2",
                    bar === 4 && "h-2.5",
                    (stats.connectionQuality === 'excellent' && bar <= 4) ||
                    (stats.connectionQuality === 'good' && bar <= 3) ||
                    (stats.connectionQuality === 'fair' && bar <= 2) ||
                    (stats.connectionQuality === 'poor' && bar <= 1)
                      ? qualityColors[stats.connectionQuality].replace('text-', 'bg-')
                      : 'bg-muted-foreground/30'
                  )}
                />
              ))}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <div className="font-medium">
              {stats.isRelay ? '🔄 TURN Relay' : '⚡ Direct P2P'}
            </div>
            <div className="text-muted-foreground text-[10px]">
              {stats.isRelay ? 'Routed through relay server' : 'Direct peer-to-peer connection'}
            </div>
            <div className="pt-1 border-t border-border/50 space-y-0.5">
              <div>↓ {formatBandwidth(stats.inboundBitrate)} ↑ {formatBandwidth(stats.outboundBitrate)}</div>
              <div>Latency: {stats.roundTripTime}ms</div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Helper component for video elements with proper audio handling
function VideoElement({ stream, muted, isLocal }: { stream: MediaStream; muted: boolean; isLocal: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!stream) return;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }

    if (!isLocal && !muted) {
      const hasAudio = stream.getAudioTracks().length > 0;
      if (hasAudio) {
        if (!audioRef.current) {
          const audio = document.createElement('audio');
          audio.autoplay = true;
          (audio as any).playsInline = true;
          audio.style.display = 'none';
          document.body.appendChild(audio);
          audioRef.current = audio;
        }
        
        audioRef.current.srcObject = stream;
        
        audioRef.current.play().catch((err) => {
          console.warn('[VideoElement] Audio autoplay blocked:', err);
          const resumeAudio = () => {
            audioRef.current?.play().catch(() => {});
            document.removeEventListener('click', resumeAudio);
            document.removeEventListener('touchstart', resumeAudio);
          };
          document.addEventListener('click', resumeAudio, { once: true });
          document.addEventListener('touchstart', resumeAudio, { once: true });
        });
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
        audioRef.current.remove();
        audioRef.current = null;
      }
    };
  }, [stream, isLocal, muted]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal || muted}
      className={cn("w-full h-full object-cover", isLocal && "transform scale-x-[-1]")}
    />
  );
}
