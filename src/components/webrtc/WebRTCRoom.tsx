import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff, 
  Sparkles, Loader2, Wifi, WifiOff, Radio, Server
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebRTC, ConnectionStats } from "@/hooks/useWebRTC";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getSupabaseFunctionsUrl } from "@/lib/supabase-config";
import { useOrientation } from "@/hooks/useOrientation";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface WebRTCRoomProps {
  roomName: string;
  participantName: string;
  onDisconnect: () => void;
  className?: string;
  initialVideo?: boolean;
  initialAudio?: boolean;
  isHost?: boolean;
}

export function WebRTCRoom({ 
  roomName, 
  participantName, 
  onDisconnect, 
  className,
  initialVideo = true,
  initialAudio = true,
  isHost = false,
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
  const recognitionRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const channelRef = useRef<any>(null);
  const orientation = useOrientation();
  const isMobile = useIsMobile();

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
      localVideoRef.current.play().catch(err => {
        console.warn('[WebRTCRoom] Local video play error:', err);
      });
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
      // Stop screen sharing - replace with camera
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
      // Start screen sharing
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
          
          // Handle when user stops sharing via browser UI
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
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Connecting to call...</p>
      </div>
    );
  }

  // Build participant list: local + remote
  const allParticipants = [
    { id: user?.id || 'local', name: participantName, stream: localStream, isLocal: true },
    ...Array.from(participants.values()).map(p => ({
      id: p.odakle,
      name: p.name,
      stream: p.stream,
      isLocal: false,
    })),
  ];

  const numParticipants = allParticipants.length;
  
  // Adaptive grid based on participant count, orientation, and device type
  const getGridClasses = () => {
    // Mobile-specific grid that fits all participants without cutting off
    if (isMobile) {
      if (numParticipants === 1) {
        return "grid-cols-1";
      } else if (numParticipants === 2) {
        return "grid-cols-2";
      } else if (numParticipants <= 4) {
        return "grid-cols-2 grid-rows-2";
      } else {
        return "grid-cols-2 grid-rows-3";
      }
    }
    
    // Desktop behavior
    if (numParticipants === 1) {
      return "grid-cols-1";
    } else if (numParticipants === 2) {
      return orientation === 'portrait' 
        ? "grid-cols-1 grid-rows-2" 
        : "grid-cols-2 grid-rows-1";
    } else if (numParticipants <= 4) {
      return orientation === 'portrait'
        ? "grid-cols-2"
        : "grid-cols-2";
    } else {
      return orientation === 'portrait'
        ? "grid-cols-2"
        : "grid-cols-3";
    }
  };

  // Get aspect ratio class based on camera state, orientation, and device
  const getAspectRatioClass = (hasVideo: boolean) => {
    // Mobile: use square aspect ratio to fit more participants
    if (isMobile) {
      return "aspect-square";
    }
    
    if (!hasVideo) {
      return orientation === 'portrait' 
        ? "aspect-[3/4]"
        : "aspect-square";
    }
    return orientation === 'portrait' 
      ? "aspect-[3/4]"
      : "aspect-video";
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Connection Quality Indicator */}
      {connectionStats && (
        <ConnectionQualityIndicator stats={connectionStats} isMobile={isMobile} />
      )}
      
      {/* Participants grid - with proper mobile spacing */}
      <div className={cn(
        "grid gap-1.5 flex-1 auto-rows-fr overflow-hidden",
        isMobile ? "p-1.5 pb-0" : "p-2 sm:p-4 gap-2 sm:gap-4",
        getGridClasses()
      )}>
        {allParticipants.map((participant) => {
          const hasVideoTrack = participant.stream?.getVideoTracks().length > 0;
          const isVideoEnabled = participant.stream?.getVideoTracks().some(t => t.enabled) ?? false;
          const hasVideo = hasVideoTrack && (participant.isLocal ? !isCameraOff : isVideoEnabled);
          const displayName = participant.isLocal ? "You" : participant.name;

          return (
            <div
              key={participant.id}
              className={cn(
                "relative rounded-lg overflow-hidden bg-muted group transition-all duration-300 border border-border",
                isMobile ? "rounded-md" : "rounded-xl border-2",
                getAspectRatioClass(!!hasVideo && !isCameraOff),
                participant.isLocal && "order-first",
                hasVideo && !isCameraOff && "shadow-lg"
              )}
            >
              {/* Video display */}
              {participant.stream && (
                <VideoElement 
                  stream={participant.stream} 
                  muted={participant.isLocal}
                  isLocal={participant.isLocal}
                  participantId={participant.id}
                  hasVideo={!!hasVideo}
                  isMobile={isMobile}
                />
              )}

              {/* Avatar when camera off - smaller on mobile */}
              {(!participant.stream || !hasVideo) && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/80">
                  <Avatar className={cn(
                    "transition-all duration-300",
                    isMobile ? "h-12 w-12" : (orientation === 'portrait' ? "h-20 w-20 md:h-24 md:w-24" : "h-16 w-16 md:h-20 md:w-20")
                  )}>
                    <AvatarFallback className={cn(
                      "bg-primary/20 text-primary",
                      isMobile ? "text-lg" : "text-xl md:text-2xl"
                    )}>
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}

              {/* Name label - compact on mobile */}
              <div className={cn(
                "absolute bg-background/70 backdrop-blur-sm rounded text-foreground flex items-center gap-1",
                isMobile ? "bottom-1 left-1 px-1.5 py-0.5 text-[10px]" : "top-2 left-2 px-2 py-1 text-xs sm:text-sm gap-2"
              )}>
                <span className="truncate max-w-[80px]">{displayName}</span>
                {isHost && participant.isLocal && (
                  <span className={cn(
                    "bg-primary/20 text-primary px-1 py-0.5 rounded",
                    isMobile ? "text-[8px]" : "text-[10px] px-1.5"
                  )}>Host</span>
                )}
              </div>

              {/* Status icons - smaller on mobile */}
              <div className={cn(
                "absolute flex gap-0.5",
                isMobile ? "top-1 right-1" : "top-2 right-2 gap-1"
              )}>
                {participant.isLocal && isMuted && (
                  <div className={cn(
                    "bg-background/70 backdrop-blur-sm rounded-full",
                    isMobile ? "p-0.5" : "p-1"
                  )}>
                    <MicOff className={cn("text-destructive", isMobile ? "h-3 w-3" : "h-4 w-4")} />
                  </div>
                )}
                {participant.isLocal && isCameraOff && (
                  <div className={cn(
                    "bg-background/70 backdrop-blur-sm rounded-full",
                    isMobile ? "p-0.5" : "p-1"
                  )}>
                    <VideoOff className={cn("text-destructive", isMobile ? "h-3 w-3" : "h-4 w-4")} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transcript display */}
      {isRecording && transcript && (
        <div className="mx-4 mb-2 p-3 bg-muted/50 rounded-lg max-h-24 overflow-y-auto">
          <p className="text-sm text-muted-foreground">{transcript.slice(-200)}</p>
        </div>
      )}

      {/* Controls - positioned higher on mobile with safe area */}
      <div className={cn(
        "flex justify-center gap-2 bg-muted border-t border-border flex-wrap",
        isMobile 
          ? "p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]" 
          : "p-4"
      )}>
        <Button 
          onClick={handleToggleMute} 
          variant={isMuted ? "destructive" : "secondary"}
          size="icon"
          className={cn(isMobile && "h-11 w-11 min-h-[44px] min-w-[44px]")}
        >
          {isMuted ? <MicOff className={cn(isMobile ? "h-5 w-5" : "h-5 w-5")} /> : <Mic className={cn(isMobile ? "h-5 w-5" : "h-5 w-5")} />}
        </Button>

        <Button 
          onClick={handleToggleCamera} 
          variant={isCameraOff ? "destructive" : "secondary"}
          size="icon"
          className={cn(isMobile && "h-11 w-11 min-h-[44px] min-w-[44px]")}
        >
          {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>

        {/* Hide screen share on mobile - not useful */}
        {!isMobile && (
          <Button 
            onClick={handleToggleScreenShare} 
            variant={isScreenSharing ? "default" : "secondary"}
            size="icon"
          >
            {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          </Button>
        )}

        <Button 
          onClick={toggleAITranscription} 
          variant={isRecording ? "default" : "secondary"}
          size="icon"
          title="AI Transcription"
          className={cn(isMobile && "h-11 w-11 min-h-[44px] min-w-[44px]")}
        >
          <Sparkles className={cn("h-5 w-5", isRecording && "text-yellow-400")} />
        </Button>

        {isRecording && !isMobile && (
          <Button 
            onClick={handleSummarize} 
            variant="outline"
            size="sm"
            disabled={isSummarizing}
            className="gap-2"
          >
            {isSummarizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Summarize"
            )}
          </Button>
        )}

        {isHost ? (
          <Button 
            onClick={handleEndCallForAll} 
            variant="destructive" 
            size="icon" 
            title="End call for all"
            className={cn(isMobile && "h-11 w-11 min-h-[44px] min-w-[44px]")}
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        ) : (
          <Button 
            onClick={handleDisconnect} 
            variant="destructive" 
            size="icon"
            className={cn(isMobile && "h-11 w-11 min-h-[44px] min-w-[44px]")}
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Connection quality indicator component
function ConnectionQualityIndicator({ stats, isMobile }: { stats: ConnectionStats; isMobile: boolean }) {
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

  const formatBandwidth = (kbps: number) => {
    if (kbps >= 1000) {
      return `${(kbps / 1000).toFixed(1)} Mbps`;
    }
    return `${kbps} kbps`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "absolute z-10 flex items-center gap-1.5 rounded-full backdrop-blur-sm border border-border/50",
            isMobile ? "top-1 right-1 px-2 py-1" : "top-2 right-2 px-3 py-1.5 gap-2",
            qualityBgColors[stats.connectionQuality]
          )}>
            {stats.isRelay ? (
              <Server className={cn(isMobile ? "h-3 w-3" : "h-4 w-4", qualityColors[stats.connectionQuality])} />
            ) : (
              <Radio className={cn(isMobile ? "h-3 w-3" : "h-4 w-4", qualityColors[stats.connectionQuality])} />
            )}
            {!isMobile && (
              <>
                <span className={cn("text-xs font-medium", qualityColors[stats.connectionQuality])}>
                  {stats.isRelay ? 'Relay' : 'P2P'}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className={cn("text-xs font-medium", adaptiveModeColors[stats.adaptiveMode])}>
                  {adaptiveModeLabels[stats.adaptiveMode]}
                </span>
              </>
            )}
            <div className="flex gap-0.5">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={cn(
                    "rounded-full transition-all",
                    isMobile ? "w-0.5" : "w-1",
                    bar === 1 && (isMobile ? "h-1" : "h-1.5"),
                    bar === 2 && (isMobile ? "h-1.5" : "h-2"),
                    bar === 3 && (isMobile ? "h-2" : "h-2.5"),
                    bar === 4 && (isMobile ? "h-2.5" : "h-3"),
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
              {stats.isRelay ? '🔄 Using TURN Relay' : '⚡ Direct P2P Connection'}
            </div>
            <div className="text-muted-foreground">
              {stats.isRelay 
                ? 'Traffic routed through relay server (works through strict firewalls)'
                : 'Direct peer-to-peer connection (fastest, lowest latency)'
              }
            </div>
            
            {/* Bandwidth section */}
            <div className="pt-1 border-t border-border/50 space-y-0.5">
              <div className="font-medium text-foreground">📊 Bandwidth</div>
              <div>Download: <span className="font-medium">{formatBandwidth(stats.inboundBitrate)}</span></div>
              <div>Upload: <span className="font-medium">{formatBandwidth(stats.outboundBitrate)}</span></div>
              <div>Total: <span className={cn("font-medium", stats.isBelowMinimum && "text-yellow-500")}>
                {formatBandwidth(stats.totalBandwidth)}
                {stats.isBelowMinimum && " ⚠️"}
              </span></div>
            </div>

            {/* Adaptive mode */}
            <div className="pt-1 border-t border-border/50">
              <div>
                Quality Mode: <span className={cn("font-medium", adaptiveModeColors[stats.adaptiveMode])}>
                  {stats.adaptiveMode === 'high' && '🎬 High Definition'}
                  {stats.adaptiveMode === 'medium' && '📺 Standard Definition'}
                  {stats.adaptiveMode === 'low' && '📱 Low Quality'}
                  {stats.adaptiveMode === 'audio-only' && '🎤 Audio Only'}
                </span>
              </div>
              {stats.adaptiveMode !== 'high' && (
                <div className="text-muted-foreground mt-0.5">
                  Auto-adjusted for your connection
                </div>
              )}
            </div>

            {/* Connection stats */}
            <div className="pt-1 border-t border-border/50 space-y-0.5">
              <div className="font-medium text-foreground">📡 Connection</div>
              <div>Latency: <span className="font-medium">{stats.roundTripTime}ms</span></div>
              <div>Jitter: <span className="font-medium">{stats.jitter}ms</span></div>
              <div>Packets lost: <span className="font-medium">{stats.packetsLost}</span></div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Helper component for video elements with proper audio handling
interface VideoElementProps {
  stream: MediaStream;
  muted: boolean;
  isMobile?: boolean;
  isLocal: boolean;
  participantId: string;
  hasVideo: boolean;
}

function VideoElement({ stream, muted, isLocal, participantId, hasVideo, isMobile = false }: VideoElementProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playAttemptRef = useRef<number>(0);
  const streamIdRef = useRef<string>('');
  const [audioPlaying, setAudioPlaying] = useState(false);

  // Force re-attachment when stream changes or tracks are updated
  useEffect(() => {
    if (!stream) return;

    const streamId = stream.id;
    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();
    
    console.log(`[VideoElement ${participantId}] Stream update - ID: ${streamId}, video tracks: ${videoTracks.length}, audio tracks: ${audioTracks.length}`);
    
    // Attach video stream to video element
    if (videoRef.current) {
      // Always re-attach the stream
      videoRef.current.srcObject = stream;
      
      // Force play for video
      const playVideo = () => {
        if (!videoRef.current) return;
        videoRef.current.play()
          .then(() => {
            console.log(`[VideoElement ${participantId}] Video playing successfully`);
          })
          .catch((err) => {
            console.warn(`[VideoElement ${participantId}] Video autoplay blocked:`, err.name);
            // Retry on user interaction
            const resumeVideo = () => {
              videoRef.current?.play().catch(() => {});
              document.removeEventListener('click', resumeVideo);
              document.removeEventListener('touchstart', resumeVideo);
            };
            document.addEventListener('click', resumeVideo, { once: true });
            document.addEventListener('touchstart', resumeVideo, { once: true });
          });
      };
      
      playVideo();
    }

    // For remote participants, handle audio through a separate element for reliability
    if (!isLocal && audioTracks.length > 0) {
      console.log(`[VideoElement ${participantId}] Setting up remote audio - tracks:`, audioTracks.map(t => ({ 
        enabled: t.enabled, 
        muted: t.muted, 
        readyState: t.readyState 
      })));
      
      // Create audio element if needed
      if (!audioRef.current) {
        const audio = document.createElement('audio');
        audio.id = `remote-audio-${participantId}-${Date.now()}`;
        audio.autoplay = true;
        (audio as any).playsInline = true;
        audio.volume = 1.0;
        audio.style.cssText = 'position:fixed;left:-9999px;top:-9999px;pointer-events:none;';
        document.body.appendChild(audio);
        audioRef.current = audio;
        console.log(`[VideoElement ${participantId}] Created new audio element`);
      }
      
      // Always re-set the stream on the audio element
      const audioElement = audioRef.current;
      audioElement.srcObject = stream;
      audioElement.muted = false;
      audioElement.volume = 1.0;
      
      playAttemptRef.current = 0;
      
      // Aggressive audio playback with multiple retry strategies
      const tryPlayAudio = async () => {
        if (!audioElement) return;
        
        playAttemptRef.current++;
        const attempt = playAttemptRef.current;
        
        try {
          // Ensure audio context is unlocked
          if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
            const AudioContextClass = AudioContext || (window as any).webkitAudioContext;
            const testContext = new AudioContextClass();
            if (testContext.state === 'suspended') {
              await testContext.resume();
            }
            testContext.close();
          }
          
          await audioElement.play();
          console.log(`[VideoElement ${participantId}] Audio play attempt ${attempt} succeeded`);
          setAudioPlaying(true);
        } catch (err: any) {
          console.warn(`[VideoElement ${participantId}] Audio play attempt ${attempt} failed:`, err.name);
          setAudioPlaying(false);
          
          // Set up user interaction listeners if not playing
          if (attempt <= 3) {
            const resumeAudio = async () => {
              try {
                if (audioElement) {
                  audioElement.muted = false;
                  audioElement.volume = 1.0;
                  await audioElement.play();
                  console.log(`[VideoElement ${participantId}] Audio resumed after user interaction`);
                  setAudioPlaying(true);
                }
              } catch (e) {
                console.warn(`[VideoElement ${participantId}] Resume audio failed:`, e);
              }
              document.removeEventListener('click', resumeAudio);
              document.removeEventListener('touchstart', resumeAudio);
              document.removeEventListener('keydown', resumeAudio);
            };
            
            document.addEventListener('click', resumeAudio, { once: true });
            document.addEventListener('touchstart', resumeAudio, { once: true });
            document.addEventListener('keydown', resumeAudio, { once: true });
            
            // Also retry after a delay
            setTimeout(() => {
              if (!audioPlaying && audioRef.current) {
                tryPlayAudio();
              }
            }, 500 * attempt);
          }
        }
      };
      
      // Start playback attempts
      tryPlayAudio();
      
      // Also try again after the stream has time to settle
      setTimeout(tryPlayAudio, 100);
      setTimeout(tryPlayAudio, 500);
      
      // Listen for track changes
      const handleTrackEvent = () => {
        console.log(`[VideoElement ${participantId}] Track event - re-attaching stream`);
        if (audioRef.current) {
          audioRef.current.srcObject = stream;
          tryPlayAudio();
        }
      };
      
      stream.addEventListener('addtrack', handleTrackEvent);
      stream.addEventListener('removetrack', handleTrackEvent);
      
      return () => {
        stream.removeEventListener('addtrack', handleTrackEvent);
        stream.removeEventListener('removetrack', handleTrackEvent);
      };
    }
  }, [stream, isLocal, participantId, audioPlaying]);

  // Cleanup audio element on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        console.log(`[VideoElement ${participantId}] Cleaning up audio element`);
        audioRef.current.pause();
        audioRef.current.srcObject = null;
        audioRef.current.remove();
        audioRef.current = null;
      }
    };
  }, [participantId]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Only mute local video to prevent echo
        className={cn(
          "w-full h-full object-cover",
          isLocal && "transform scale-x-[-1]",
          !hasVideo && "hidden"
        )}
      />
      {/* Audio debug indicator for remote participants - smaller on mobile */}
      {!isLocal && (
        <div className={cn(
          "absolute flex items-center gap-1",
          isMobile ? "bottom-1 right-1" : "bottom-2 left-2"
        )}>
          {audioPlaying ? (
            <div className={cn(
              "bg-green-500/20 backdrop-blur-sm rounded-full",
              isMobile ? "p-0.5" : "p-1"
            )}>
              <Mic className={cn("text-green-500", isMobile ? "h-2.5 w-2.5" : "h-3 w-3")} />
            </div>
          ) : (
            <div 
              className={cn(
                "bg-red-500/20 backdrop-blur-sm rounded-full cursor-pointer",
                isMobile ? "p-0.5" : "p-1"
              )}
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.play().then(() => setAudioPlaying(true)).catch(() => {});
                }
              }}
              title="Click to enable audio"
            >
              <MicOff className={cn("text-red-500", isMobile ? "h-2.5 w-2.5" : "h-3 w-3")} />
            </div>
          )}
        </div>
      )}
    </>
  );
}
