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
  let gridCols = "grid-cols-1";
  if (numParticipants === 2) {
    gridCols = "md:grid-cols-2 grid-cols-1";
  } else if (numParticipants <= 4) {
    gridCols = "md:grid-cols-2 grid-cols-1";
  } else {
    gridCols = "md:grid-cols-3 grid-cols-2";
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Connection Quality Indicator */}
      {connectionStats && (
        <ConnectionQualityIndicator stats={connectionStats} />
      )}
      
      {/* Participants grid */}
      <div className={cn("p-4 grid gap-4 flex-1", gridCols)}>
        {allParticipants.map((participant) => {
          const hasVideo = participant.stream?.getVideoTracks().some(t => t.enabled);
          const displayName = participant.isLocal ? "You" : participant.name;

          return (
            <div
              key={participant.id}
              className={cn(
                "relative rounded-xl overflow-hidden bg-muted aspect-video group transition-all duration-200 border-2 border-border",
                participant.isLocal && "order-first"
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
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <Avatar className="h-16 w-16 md:h-20 md:w-20">
                    <AvatarFallback className="text-xl md:text-2xl">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}

              {/* Name label */}
              <div className="absolute top-2 left-2 px-2 py-1 bg-background/70 rounded text-foreground text-sm flex items-center gap-2">
                {displayName}
                {isHost && participant.isLocal && (
                  <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">Host</span>
                )}
              </div>

              {/* Status icons */}
              <div className="absolute top-2 right-2 flex gap-1">
                {participant.isLocal && isMuted && (
                  <MicOff className="h-6 w-6 text-red-500 bg-background/70 p-1 rounded-full" />
                )}
                {participant.isLocal && isCameraOff && (
                  <VideoOff className="h-6 w-6 text-red-500 bg-background/70 p-1 rounded-full" />
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

      {/* Controls */}
      <div className="flex justify-center gap-2 p-4 bg-muted border-t border-border flex-wrap">
        <Button 
          onClick={handleToggleMute} 
          variant={isMuted ? "destructive" : "secondary"}
          size="icon"
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button 
          onClick={handleToggleCamera} 
          variant={isCameraOff ? "destructive" : "secondary"}
          size="icon"
        >
          {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>

        <Button 
          onClick={handleToggleScreenShare} 
          variant={isScreenSharing ? "default" : "secondary"}
          size="icon"
        >
          {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
        </Button>

        <Button 
          onClick={toggleAITranscription} 
          variant={isRecording ? "default" : "secondary"}
          size="icon"
          title="AI Transcription"
        >
          <Sparkles className={cn("h-5 w-5", isRecording && "text-yellow-400")} />
        </Button>

        {isRecording && (
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
          <Button onClick={handleEndCallForAll} variant="destructive" size="icon" title="End call for all">
            <PhoneOff className="h-5 w-5" />
          </Button>
        ) : (
          <Button onClick={handleDisconnect} variant="destructive" size="icon">
            <PhoneOff className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Connection quality indicator component
function ConnectionQualityIndicator({ stats }: { stats: ConnectionStats }) {
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
            "absolute top-2 right-2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full",
            qualityBgColors[stats.connectionQuality],
            "backdrop-blur-sm border border-border/50"
          )}>
            {stats.isRelay ? (
              <Server className={cn("h-4 w-4", qualityColors[stats.connectionQuality])} />
            ) : (
              <Radio className={cn("h-4 w-4", qualityColors[stats.connectionQuality])} />
            )}
            <span className={cn("text-xs font-medium", qualityColors[stats.connectionQuality])}>
              {stats.isRelay ? 'Relay' : 'P2P'}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className={cn("text-xs font-medium", adaptiveModeColors[stats.adaptiveMode])}>
              {adaptiveModeLabels[stats.adaptiveMode]}
            </span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={cn(
                    "w-1 rounded-full transition-all",
                    bar === 1 && "h-1.5",
                    bar === 2 && "h-2",
                    bar === 3 && "h-2.5",
                    bar === 4 && "h-3",
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

// Helper component for video elements
function VideoElement({ stream, muted, isLocal }: { stream: MediaStream; muted: boolean; isLocal: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={cn("w-full h-full object-cover", isLocal && "transform scale-x-[-1]")}
    />
  );
}
