import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff, 
  Sparkles, Loader2, Radio, Server, Volume2, ScreenShare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWebRTC, ConnectionStats } from "@/hooks/useWebRTC";
import { useAuth } from "@/contexts/AuthContext";
import { useAudioLevel } from "@/hooks/useAudioLevel";
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
    connectionMode,
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
  const [callDuration, setCallDuration] = useState(0);
  const recognitionRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const channelRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  // Call duration timer
  useEffect(() => {
    if (isConnected) {
      durationRef.current = setInterval(() => {
        setCallDuration(d => d + 1);
      }, 1000);
    }
    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [pipMode]);

  const handleInteraction = () => {
    if (pipMode === 'mini' || pipMode === 'small') {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  // Set up real-time channel for call control events
  useEffect(() => {
    if (!roomName) return;
    const channel = supabase.channel(`call-control-${roomName}`);
    channel
      .on('broadcast', { event: 'call-ended' }, () => {
        toast({ title: "Call Ended", description: "The host has ended the call" });
        handleDisconnect();
      })
      .subscribe();
    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [roomName]);

  // Connect on mount
  useEffect(() => {
    joinRoom(initialVideo, initialAudio);
    return () => { leaveRoom(); };
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
      await channelRef.current.send({ type: 'broadcast', event: 'call-ended', payload: {} });
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
        if (videoTrack) videoTrack.stop();
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
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
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
      toast({ title: "Not Supported", description: "Speech recognition is not supported in this browser", variant: "destructive" });
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
          if (event.results[i].isFinal) finalTranscript += t + ' ';
        }
        if (finalTranscript) setTranscript(prev => prev + finalTranscript);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => { if (isRecording) recognition.start(); };
      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      toast({ title: "AI Recording Started", description: "The meeting is now being transcribed" });
    }
  }, [isRecording, toast]);

  const handleSummarize = async () => {
    if (!transcript.trim()) {
      toast({ title: "No Transcript", description: "Start AI transcription first to generate a summary", variant: "destructive" });
      return;
    }
    setIsSummarizing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const response = await fetch(`${getSupabaseFunctionsUrl()}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ text: transcript }),
      });
      if (!response.ok) throw new Error("Failed to summarize");
      const data = await response.json();
      toast({ title: "Summary Generated", description: data.summary.slice(0, 100) + "..." });
    } catch (err) {
      console.error("Summarization error:", err);
      toast({ title: "Error", description: "Failed to generate summary", variant: "destructive" });
    } finally {
      setIsSummarizing(false);
    }
  };

  // ── ERROR STATE ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background text-foreground p-6 gap-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <PhoneOff className="w-8 h-8 text-destructive" />
          </div>
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-destructive/30"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium text-sm">{error}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => joinRoom(initialVideo, initialAudio)} className="rounded-full px-6 gap-2">
            Reconnect
          </Button>
          <Button onClick={handleDisconnect} variant="outline" className="rounded-full px-6">
            Leave
          </Button>
        </div>
      </div>
    );
  }

  // ── CONNECTING STATE ──
  if (isConnecting || !isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background relative overflow-hidden p-6">
        {/* Cosmic background nebula */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-primary/5 blur-[80px]" />
          <div className="absolute top-1/3 left-1/3 w-[200px] h-[200px] rounded-full bg-[hsl(var(--cosmic-cyan))]/5 blur-[60px]" />
        </div>

        {/* Animated rings */}
        <div className="relative z-10">
          <motion.div
            className="absolute inset-[-30px] rounded-full border border-primary/20"
            animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-[-18px] rounded-full border border-primary/30"
            animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
          />
          <motion.div
            className="w-20 h-20 rounded-full glass-cosmic flex items-center justify-center"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </motion.div>
        </div>

        <motion.div
          className="mt-8 text-center space-y-2 z-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-foreground font-medium">Connecting...</p>
          <p className="text-muted-foreground text-xs">Establishing secure connection</p>
        </motion.div>
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

  const getVisibleParticipants = () => {
    switch (pipMode) {
      case 'mini': {
        const remote = allParticipants.find(p => !p.isLocal);
        return remote ? [remote] : [allParticipants[0]];
      }
      case 'small':
        return allParticipants.slice(0, 2);
      case 'medium':
        return allParticipants.slice(0, 3);
      default:
        return allParticipants;
    }
  };

  const visibleParticipants = getVisibleParticipants();
  const numParticipants = visibleParticipants.length;

  const getGridClass = () => {
    if (pipMode === 'mini') return "grid-cols-1";
    if (pipMode === 'small') return numParticipants > 1 ? "grid-cols-2" : "grid-cols-1";
    if (numParticipants === 1) return "grid-cols-1";
    if (numParticipants === 2) return "md:grid-cols-2 grid-cols-1";
    if (numParticipants <= 4) return "md:grid-cols-2 grid-cols-2";
    return "md:grid-cols-3 grid-cols-2";
  };

  const iconSize = pipMode === 'mini' || pipMode === 'small' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div 
      className={cn("flex flex-col h-full relative overflow-hidden", className)}
      style={{ background: 'hsl(var(--background))' }}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {/* Subtle cosmic background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-[hsl(var(--cosmic-cyan))]/[0.03] blur-[80px]" />
      </div>

      {/* Top bar - duration + connection quality */}
      {pipMode !== 'mini' && (
        <div className="relative z-10 flex items-center justify-between px-3 py-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground font-mono">{formatDuration(callDuration)}</span>
            {isRecording && (
              <span className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                REC
              </span>
            )}
          </div>
          {connectionStats && (
            <ConnectionQualityBadge stats={connectionStats} compact={pipMode === 'small'} mode={connectionMode} />
          )}
        </div>
      )}
      
      {/* Participants grid */}
      <div className={cn(
        "flex-1 grid gap-2 p-2 relative z-10",
        getGridClass(),
        pipMode === 'mini' && "p-0 gap-0"
      )}>
        <AnimatePresence mode="popLayout">
          {visibleParticipants.map((participant) => {
            const isOverlay = pipMode === 'small' && participant.isLocal && numParticipants > 1;

            return (
              <ParticipantTile
                key={participant.id}
                participant={participant}
                isOverlay={isOverlay}
                pipMode={pipMode}
                isMuted={participant.isLocal ? isMuted : false}
                isCameraOff={participant.isLocal ? isCameraOff : false}
                isHost={isHost}
                isScreenSharing={participant.isLocal ? isScreenSharing : false}
              />
            );
          })}
        </AnimatePresence>
      </div>

      {/* Transcript display */}
      {isRecording && transcript && pipMode === 'full' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-3 mb-1 p-3 glass-cosmic rounded-xl max-h-20 overflow-y-auto relative z-10"
        >
          <p className="text-xs text-foreground/80 leading-relaxed">{transcript.slice(-200)}</p>
        </motion.div>
      )}

      {/* ── CONTROL BAR ── Floating pill with cosmic glass */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className={cn(
              "relative z-20 mx-auto mb-3",
              pipMode === 'mini' && "mb-1"
            )}
          >
            <div className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-full",
              "bg-card/90 backdrop-blur-xl",
              "border border-border/30",
              "shadow-xl shadow-black/20",
              pipMode === 'mini' && "gap-1 px-2 py-1.5"
            )}>
              {/* Mic */}
              <ControlButton
                onClick={handleToggleMute}
                active={!isMuted}
                destructive={isMuted}
                icon={isMuted ? <MicOff className={iconSize} /> : <Mic className={iconSize} />}
                label={isMuted ? "Unmute" : "Mute"}
                compact={pipMode === 'mini'}
              />

              {/* Camera */}
              <ControlButton
                onClick={handleToggleCamera}
                active={!isCameraOff}
                destructive={isCameraOff}
                icon={isCameraOff ? <VideoOff className={iconSize} /> : <Video className={iconSize} />}
                label={isCameraOff ? "Camera On" : "Camera Off"}
                compact={pipMode === 'mini'}
              />

              {/* Extended controls */}
              {pipMode !== 'mini' && (
                <>
                  <div className="w-px h-6 bg-border/30" />

                  {/* Screen share */}
                  <ControlButton
                    onClick={handleToggleScreenShare}
                    active={isScreenSharing}
                    icon={isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                    label={isScreenSharing ? "Stop Share" : "Share Screen"}
                  />

                  {/* AI Transcription */}
                  {pipMode === 'full' && (
                    <ControlButton
                      onClick={toggleAITranscription}
                      active={isRecording}
                      icon={<Sparkles className={cn("w-5 h-5", isRecording && "text-amber-400")} />}
                      label={isRecording ? "Stop AI" : "AI Transcribe"}
                    />
                  )}

                  {/* Summarize */}
                  {isRecording && pipMode === 'full' && (
                    <Button
                      onClick={handleSummarize}
                      variant="outline"
                      size="sm"
                      disabled={isSummarizing}
                      className="gap-1.5 rounded-full h-8 text-xs border-border/30 bg-card/50"
                    >
                      {isSummarizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Summarize"}
                    </Button>
                  )}
                </>
              )}

              <div className="w-px h-6 bg-border/30" />

              {/* End call - red cosmic button */}
              <motion.button
                onClick={isHost ? handleEndCallForAll : handleDisconnect}
                className={cn(
                  "rounded-full flex items-center justify-center transition-all",
                  "bg-red-500 hover:bg-red-400 text-white",
                  "shadow-lg shadow-red-500/30 hover:shadow-red-500/50",
                  pipMode === 'mini' ? "h-8 w-8" : "h-10 w-10"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={isHost ? "End call for all" : "Leave call"}
              >
                <PhoneOff className={iconSize} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Participant Tile with Speaking Indicator ──
interface ParticipantTileProps {
  participant: { id: string; name: string; stream: MediaStream | null; isLocal: boolean };
  isOverlay: boolean;
  pipMode: PiPMode;
  isMuted: boolean;
  isCameraOff: boolean;
  isHost: boolean;
  isScreenSharing: boolean;
}

function ParticipantTile({ participant, isOverlay, pipMode, isMuted, isCameraOff, isHost, isScreenSharing }: ParticipantTileProps) {
  const hasVideo = participant.stream?.getVideoTracks().some(t => t.enabled);
  const displayName = participant.isLocal ? "You" : participant.name;
  const { level, isSpeaking } = useAudioLevel(participant.stream, true);

  // Dynamic glow intensity based on audio level
  const glowIntensity = Math.min(1, level * 3);
  const glowColor = `hsl(var(--primary))`;
  const glowShadow = isSpeaking
    ? `0 0 ${8 + glowIntensity * 20}px ${glowIntensity * 8}px hsl(var(--primary) / ${0.3 + glowIntensity * 0.4}), 0 0 ${4 + glowIntensity * 10}px ${glowIntensity * 4}px hsl(var(--cosmic-cyan) / ${0.2 + glowIntensity * 0.3})`
    : 'none';

  return (
    <motion.div
      key={participant.id}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      className={cn(
        "relative rounded-2xl overflow-hidden group",
        isOverlay 
          ? "absolute bottom-16 right-3 w-28 h-36 z-20 rounded-xl shadow-2xl shadow-black/40 border border-border/30" 
          : "aspect-video",
        !isOverlay && "bg-card/50 border border-border/20",
        participant.isLocal && !isOverlay && "order-last",
        isSpeaking && !isOverlay && "border-primary/60"
      )}
      style={{
        boxShadow: !isOverlay ? glowShadow : undefined,
        transition: 'box-shadow 0.15s ease-out, border-color 0.15s ease-out',
      }}
    >
      {/* Speaking glow border overlay */}
      {isSpeaking && !isOverlay && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            border: `2px solid hsl(var(--primary) / ${0.4 + glowIntensity * 0.5})`,
            borderRadius: 'inherit',
          }}
        />
      )}

      {/* Audio level bar - bottom edge visualizer */}
      {!isOverlay && pipMode !== 'mini' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 z-20 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--cosmic-cyan)))`,
              width: `${Math.max(0, level * 100)}%`,
              opacity: level > 0.05 ? 0.8 : 0,
              transition: 'width 0.08s ease-out, opacity 0.15s ease-out',
            }}
          />
        </div>
      )}

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
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-muted" />
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full bg-primary/10 blur-[40px]" />
          </div>
          
          <div className="relative">
            {/* Speaking ring animation around avatar */}
            {isSpeaking && (
              <>
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    inset: pipMode === 'mini' ? '-12px' : '-16px',
                    border: `2px solid hsl(var(--primary) / ${0.3 + glowIntensity * 0.5})`,
                    boxShadow: `0 0 ${10 + glowIntensity * 15}px hsl(var(--primary) / ${0.2 + glowIntensity * 0.3})`,
                  }}
                  animate={{ 
                    scale: [1, 1.08 + glowIntensity * 0.1, 1],
                    opacity: [0.6, 0.3 + glowIntensity * 0.4, 0.6]
                  }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    inset: pipMode === 'mini' ? '-6px' : '-8px',
                    border: `1.5px solid hsl(var(--cosmic-cyan) / ${0.4 + glowIntensity * 0.4})`,
                  }}
                  animate={{ 
                    scale: [1, 1.05 + glowIntensity * 0.08, 1],
                    opacity: [0.7, 0.4 + glowIntensity * 0.4, 0.7]
                  }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
                />
              </>
            )}
            
            {/* Static ring when not speaking */}
            {!isSpeaking && (
              <motion.div
                className="absolute inset-[-8px] rounded-full border border-primary/20"
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.1, 0.3] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            )}
            
            <Avatar className={cn(
              "shadow-lg",
              pipMode === 'mini' ? "h-12 w-12" : "h-16 w-16 md:h-20 md:w-20",
              isSpeaking 
                ? "ring-2 ring-primary/60 shadow-primary/30" 
                : "ring-2 ring-primary/20 shadow-primary/10"
            )}>
              <AvatarFallback className={cn(
                "bg-gradient-to-br from-primary/80 to-[hsl(var(--cosmic-purple))]/80 text-primary-foreground font-semibold",
                pipMode === 'mini' ? "text-lg" : "text-xl md:text-2xl"
              )}>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      )}

      {/* Bottom name label with glassmorphism */}
      {!(isOverlay || pipMode === 'mini') && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent p-3 pt-6 z-10">
          <div className="flex items-center gap-2">
            {/* Speaking indicator dot */}
            {isSpeaking && (
              <motion.div
                className="w-2 h-2 rounded-full bg-green-400 shrink-0"
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            <span className="text-xs font-medium text-white/90 truncate">{displayName}</span>
            {isHost && participant.isLocal && (
              <span className="text-[9px] bg-primary/30 text-primary-foreground px-1.5 py-0.5 rounded-full font-medium backdrop-blur-sm">
                Host
              </span>
            )}
          </div>
        </div>
      )}

      {/* Status indicators - top right */}
      {participant.isLocal && (isMuted || isCameraOff) && !isOverlay && (
        <div className="absolute top-2 right-2 flex gap-1.5 z-10">
          {isMuted && (
            <div className="p-1.5 bg-red-500/90 rounded-full shadow-lg shadow-red-500/30 backdrop-blur-sm">
              <MicOff className="h-3 w-3 text-white" />
            </div>
          )}
          {isCameraOff && (
            <div className="p-1.5 bg-red-500/90 rounded-full shadow-lg shadow-red-500/30 backdrop-blur-sm">
              <VideoOff className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
      )}

      {/* Screen sharing indicator */}
      {participant.isLocal && isScreenSharing && !isOverlay && (
        <div className="absolute top-2 left-2 z-10">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/80 backdrop-blur-sm text-primary-foreground text-[10px] font-medium">
            <ScreenShare className="w-3 h-3" />
            Sharing
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Control Button Component ──
function ControlButton({ 
  onClick, active, destructive, icon, label, compact 
}: { 
  onClick: () => void; 
  active?: boolean; 
  destructive?: boolean; 
  icon: React.ReactNode; 
  label: string;
  compact?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            onClick={onClick}
            className={cn(
              "rounded-full flex items-center justify-center transition-colors",
              compact ? "h-8 w-8" : "h-10 w-10",
              destructive 
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
                : active 
                  ? "bg-primary/20 text-primary hover:bg-primary/30"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {icon}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Connection Quality Badge ──
type ConnectionModeType = 'direct' | 'stun' | 'hybrid' | 'relay';

function ConnectionQualityBadge({ stats, compact, mode }: { stats: ConnectionStats; compact?: boolean; mode?: ConnectionModeType }) {
  const qualityConfig = {
    excellent: { color: 'text-green-400', bg: 'bg-green-500/15', bars: 4 },
    good: { color: 'text-green-400', bg: 'bg-green-500/15', bars: 3 },
    fair: { color: 'text-amber-400', bg: 'bg-amber-500/15', bars: 2 },
    poor: { color: 'text-red-400', bg: 'bg-red-500/15', bars: 1 },
  };

  const config = qualityConfig[stats.connectionQuality];
  const displayMode = mode === 'direct' ? 'direct' : (stats.isRelay ? 'relay' : 'p2p');
  const modeIcons = { direct: '⚡', relay: '🔄', p2p: '🌐' };
  const modeLabels = { direct: 'Direct', relay: 'Relay', p2p: 'P2P' };

  const formatBw = (kbps: number) => kbps >= 1000 ? `${(kbps / 1000).toFixed(1)}M` : `${kbps}k`;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]", config.bg, config.color)}>
        <SignalBars bars={config.bars} color={config.color} />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium cursor-default",
            config.bg, config.color, "backdrop-blur-sm"
          )}>
            <span>{modeIcons[displayMode]}</span>
            <span>{modeLabels[displayMode]}</span>
            <SignalBars bars={config.bars} color={config.color} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs space-y-1">
          <div className="font-medium">{stats.connectionQuality.charAt(0).toUpperCase() + stats.connectionQuality.slice(1)} Connection</div>
          <div className="text-muted-foreground">
            ↓ {formatBw(stats.inboundBitrate)} ↑ {formatBw(stats.outboundBitrate)}
          </div>
          <div className="text-muted-foreground">Latency: {stats.roundTripTime}ms</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Signal Bars ──
function SignalBars({ bars, color }: { bars: number; color: string }) {
  return (
    <div className="flex items-end gap-px ml-0.5">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className={cn(
            "w-[3px] rounded-full transition-all",
            i === 1 && "h-1",
            i === 2 && "h-1.5",
            i === 3 && "h-2",
            i === 4 && "h-2.5",
            i <= bars ? color.replace('text-', 'bg-') : 'bg-muted-foreground/20'
          )}
        />
      ))}
    </div>
  );
}

// ── Video Element ──
function VideoElement({ stream, muted, isLocal }: { stream: MediaStream; muted: boolean; isLocal: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playRetryRef = useRef<number>(0);
  const [needsInteraction, setNeedsInteraction] = useState(false);

  const forcePlay = useCallback(async () => {
    const video = videoRef.current;
    const audio = audioRef.current;
    try {
      if (video && video.paused) {
        video.muted = isLocal;
        await video.play();
      }
      if (audio && audio.paused && !isLocal) {
        audio.muted = false;
        audio.volume = 1.0;
        await audio.play();
      }
      setNeedsInteraction(false);
    } catch (err) {
      console.warn("[VideoElement] Force play failed:", err);
    }
  }, [isLocal]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = isLocal;
    if (!isLocal) video.muted = false;

    const playVideo = async () => {
      if (!video) return;
      try {
        video.muted = isLocal;
        await video.play();
        setNeedsInteraction(false);
      } catch {
        if (!isLocal) {
          try {
            video.muted = true;
            await video.play();
            setNeedsInteraction(true);
          } catch (e) { /* silent */ }
        }
      }
    };

    playVideo();
    const t1 = setTimeout(playVideo, 300);
    const t2 = setTimeout(playVideo, 1000);

    const handleTrackChange = () => {
      video.srcObject = null;
      setTimeout(() => { video.srcObject = stream; playVideo(); }, 50);
    };
    stream.onaddtrack = handleTrackChange;
    stream.onremovetrack = handleTrackChange;

    const handlePause = () => { if (!video.ended) playVideo(); };
    video.addEventListener('pause', handlePause);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      stream.onaddtrack = null;
      stream.onremovetrack = null;
      video.removeEventListener('pause', handlePause);
    };
  }, [stream, isLocal]);

  // Dedicated audio element for remote streams
  useEffect(() => {
    if (!stream || isLocal) return;
    let audio = audioRef.current;
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = `remote-audio-${stream.id}-${Date.now()}`;
      audio.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;pointer-events:none;opacity:0;';
      document.body.appendChild(audio);
      audioRef.current = audio;
    }
    audio.autoplay = true;
    (audio as any).playsInline = true;
    audio.muted = false;
    audio.volume = 1.0;

    const updateAudioStream = () => {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return false;
      audioTracks.forEach(track => { track.enabled = true; });
      const audioStream = new MediaStream(audioTracks);
      audio!.srcObject = audioStream;
      return true;
    };

    const playAudio = async () => {
      if (!audio) return;
      if (!updateAudioStream()) return;
      try {
        audio.muted = false;
        audio.volume = 1.0;
        await audio.play();
        setNeedsInteraction(false);
        playRetryRef.current = 0;
      } catch {
        playRetryRef.current++;
        setNeedsInteraction(true);
      }
    };

    updateAudioStream();
    const timeouts = [100, 500, 1000, 2000].map(d => setTimeout(playAudio, d));

    const handleTrackAdded = (e: MediaStreamTrackEvent) => {
      if (e.track.kind === 'audio') { updateAudioStream(); setTimeout(playAudio, 100); }
    };
    stream.addEventListener('addtrack', handleTrackAdded);

    const checkInterval = setInterval(() => {
      if (!audio) return;
      const tracks = stream.getAudioTracks();
      const hasLive = tracks.some(t => t.enabled && t.readyState === 'live');
      if (audio.paused && hasLive) playAudio();
    }, 2000);

    return () => {
      timeouts.forEach(t => clearTimeout(t));
      clearInterval(checkInterval);
      stream.removeEventListener('addtrack', handleTrackAdded);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
        audioRef.current.remove();
        audioRef.current = null;
      }
    };
  }, [stream, isLocal]);

  // Resume on interaction
  useEffect(() => {
    if (!needsInteraction) return;
    const handler = () => forcePlay();
    document.addEventListener('click', handler, { once: true });
    document.addEventListener('touchstart', handler, { once: true });
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [needsInteraction, forcePlay]);

  return (
    <>
      <video
        ref={videoRef}
        className={cn(
          "absolute inset-0 w-full h-full object-cover",
          isLocal && "transform -scale-x-100"
        )}
        autoPlay
        playsInline
        muted={isLocal}
      />
      {needsInteraction && !isLocal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10 cursor-pointer"
          onClick={forcePlay}
        >
          <div className="flex flex-col items-center gap-2 text-white">
            <Volume2 className="w-6 h-6" />
            <span className="text-xs font-medium">Tap to unmute</span>
          </div>
        </motion.div>
      )}
    </>
  );
}
