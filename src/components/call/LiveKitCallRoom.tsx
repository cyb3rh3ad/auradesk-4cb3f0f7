import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LiveKitRoom,
  useRoomContext,
  useParticipants,
  useLocalParticipant,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { RoomEvent } from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mic, MicOff, PhoneOff, Loader2, Video, VideoOff, RefreshCw, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type PiPMode = 'mini' | 'small' | 'medium' | 'full';

export interface LiveKitCallRoomProps {
  roomName: string;
  participantName: string;
  onDisconnect: () => void;
  className?: string;
  initialVideo?: boolean;
  initialAudio?: boolean;
  isHost?: boolean;
  pipMode?: PiPMode;
}

const MAX_TOKEN_RETRIES = 3;
const TOKEN_RETRY_DELAY = 1500;

export function LiveKitCallRoom({
  roomName,
  participantName,
  onDisconnect,
  className,
  initialVideo = false,
  initialAudio = true,
  isHost = false,
  pipMode = 'full',
}: LiveKitCallRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const fetchedRef = useRef(false);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const fetchToken = useCallback(async (attempt = 0) => {
    if (!mountedRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log(`[LiveKit] Requesting token (attempt ${attempt + 1}/${MAX_TOKEN_RETRIES}) for room: ${roomName}`);

      // Use supabase.functions.invoke — handles auth headers automatically
      const { data, error: fnError } = await supabase.functions.invoke('livekit-token', {
        body: { roomName, participantName },
      });

      if (!mountedRef.current) return;

      if (fnError) {
        throw new Error(fnError.message || 'Failed to get call token');
      }

      if (!data?.token || !data?.url) {
        throw new Error(data?.error || 'Invalid response from call server');
      }

      console.log('[LiveKit] Token acquired successfully');
      setToken(data.token);
      setLivekitUrl(data.url);
      setRetryCount(0);
    } catch (err: any) {
      if (!mountedRef.current) return;

      const errorMsg = err.message || 'Failed to connect to call';
      console.error(`[LiveKit] Token fetch failed (attempt ${attempt + 1}):`, errorMsg);

      if (attempt < MAX_TOKEN_RETRIES - 1) {
        const delay = TOKEN_RETRY_DELAY * Math.pow(2, attempt);
        console.log(`[LiveKit] Retrying in ${delay}ms...`);
        timeoutRef.current = setTimeout(() => {
          if (mountedRef.current) fetchToken(attempt + 1);
        }, delay);
        return;
      }

      setError(errorMsg);
      setRetryCount(attempt + 1);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [roomName, participantName]);

  // Initial fetch
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchToken();
  }, [fetchToken]);

  const handleRetry = useCallback(() => {
    fetchedRef.current = false;
    setToken(null);
    setLivekitUrl(null);
    setError(null);
    fetchToken();
  }, [fetchToken]);

  const handleRoomError = useCallback((err: Error) => {
    console.error('[LiveKit] Room error:', err);
    // Don't immediately show error for transient issues
    if (err.message?.includes('signal') || err.message?.includes('websocket')) {
      console.log('[LiveKit] Transient connection error, LiveKit will auto-reconnect');
      return;
    }
    setError(err.message);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full bg-background", className)}>
        <motion.div
          className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </motion.div>
        <p className="mt-4 text-sm text-muted-foreground">
          {retryCount > 0 ? `Retrying connection (${retryCount}/${MAX_TOKEN_RETRIES})...` : 'Connecting to call...'}
        </p>
        <Button onClick={onDisconnect} variant="outline" size="sm" className="mt-4 rounded-full px-6 gap-2">
          <PhoneOff className="w-4 h-4" /> Cancel
        </Button>
      </div>
    );
  }

  // Error state
  if (error || !token || !livekitUrl) {
    return (
      <div className={cn("flex flex-col items-center justify-center h-full bg-background gap-4", className)}>
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <WifiOff className="w-8 h-8 text-destructive" />
        </div>
        <p className="text-destructive text-sm font-medium text-center max-w-xs">{error || 'Connection failed'}</p>
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Check your internet connection and try again
        </p>
        <div className="flex gap-3">
          <Button onClick={handleRetry} className="rounded-full px-6 gap-2">
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
          <Button onClick={onDisconnect} variant="outline" className="rounded-full px-6">
            Leave
          </Button>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={livekitUrl}
      connect={true}
      audio={initialAudio}
      video={initialVideo}
      onDisconnected={onDisconnect}
      onError={handleRoomError}
      options={{
        adaptiveStream: true,
        dynacast: true,
        disconnectOnPageLeave: false,
      }}
      className={cn("h-full", className)}
      style={{ 
        background: 'hsl(var(--background))',
        '--lk-bg': 'hsl(var(--background))',
        '--lk-bg2': 'hsl(var(--card))',
        '--lk-border-color': 'hsl(var(--border))',
        '--lk-control-bar-background': 'hsl(var(--card))',
      } as React.CSSProperties}
    >
      <CallUI 
        onDisconnect={onDisconnect} 
        pipMode={pipMode} 
        isHost={isHost}
        initialVideo={initialVideo}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

// Inner component that uses LiveKit hooks (must be inside LiveKitRoom)
function CallUI({ 
  onDisconnect, 
  pipMode, 
  isHost,
  initialVideo,
}: { 
  onDisconnect: () => void; 
  pipMode: PiPMode; 
  isHost: boolean;
  initialVideo: boolean;
}) {
  const room = useRoomContext();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(!initialVideo);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    durationRef.current = setInterval(() => {
      setCallDuration(d => d + 1);
    }, 1000);
    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, []);

  useEffect(() => {
    if (!room) return;
    const handleReconnecting = () => setIsReconnecting(true);
    const handleReconnected = () => setIsReconnecting(false);
    
    room.on(RoomEvent.Reconnecting, handleReconnecting);
    room.on(RoomEvent.Reconnected, handleReconnected);
    
    return () => {
      room.off(RoomEvent.Reconnecting, handleReconnecting);
      room.off(RoomEvent.Reconnected, handleReconnected);
    };
  }, [room]);

  useEffect(() => {
    if (localParticipant) {
      setIsMuted(!localParticipant.isMicrophoneEnabled);
      setIsCameraOff(!localParticipant.isCameraEnabled);
    }
  }, [localParticipant?.isMicrophoneEnabled, localParticipant?.isCameraEnabled]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleToggleMute = async () => {
    try {
      await localParticipant.setMicrophoneEnabled(isMuted);
    } catch (err) {
      console.error('[LiveKit] Failed to toggle mic:', err);
    }
  };

  const handleToggleCamera = async () => {
    try {
      await localParticipant.setCameraEnabled(isCameraOff);
    } catch (err) {
      console.error('[LiveKit] Failed to toggle camera:', err);
    }
  };

  const handleEndCall = () => {
    try {
      room.disconnect();
    } catch (err) {
      console.error('[LiveKit] Error during disconnect:', err);
    }
    onDisconnect();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const remoteParticipants = participants.filter(p => !p.isLocal);
  const isCompact = pipMode === 'mini' || pipMode === 'small';

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-accent/[0.03] blur-[80px]" />
      </div>

      <AnimatePresence>
        {isReconnecting && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative z-20 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 flex items-center justify-center gap-2"
          >
            <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />
            <span className="text-xs text-yellow-500 font-medium">Reconnecting...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!isCompact && (
        <div className="relative z-10 flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              isReconnecting ? "bg-yellow-500" : "bg-green-500"
            )} />
            <span className="text-xs text-muted-foreground font-mono">{formatDuration(callDuration)}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center relative z-10 p-4">
        <div className={cn(
          "grid gap-4 w-full max-w-2xl",
          participants.length <= 2 ? "grid-cols-1" : "grid-cols-2",
        )}>
          <AnimatePresence mode="popLayout">
            {participants.map((participant) => {
              const isSpeaking = participant.isSpeaking;
              const name = participant.name || participant.identity || 'User';
              const hasMic = participant.isMicrophoneEnabled;

              return (
                <motion.div
                  key={participant.identity}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={cn(
                    "relative flex flex-col items-center justify-center rounded-2xl p-6",
                    "bg-card/50 backdrop-blur-sm border border-border/30",
                    isSpeaking && "ring-2 ring-primary/50",
                    isCompact && "p-3"
                  )}
                >
                  {isSpeaking && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl bg-primary/5"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}

                  <div className="relative">
                    <Avatar className={cn("border-2 border-border/50", isCompact ? "h-12 w-12" : "h-20 w-20")}>
                      <AvatarFallback className={cn(
                        "bg-primary/10 text-primary font-semibold",
                        isCompact ? "text-sm" : "text-xl"
                      )}>
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>

                    {isSpeaking && (
                      <motion.div
                        className="absolute inset-[-4px] rounded-full border-2 border-primary/60"
                        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                    )}

                    {!hasMic && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-destructive rounded-full flex items-center justify-center">
                        <MicOff className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  {!isCompact && (
                    <p className="mt-3 text-sm font-medium text-foreground/80 truncate max-w-[120px]">
                      {name}{participant.isLocal ? ' (You)' : ''}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {remoteParticipants.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center p-6 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3"
              >
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </motion.div>
              <p className="text-sm text-muted-foreground">Waiting for others to join...</p>
            </motion.div>
          )}
        </div>
      </div>

      <div className={cn(
        "relative z-10 flex items-center justify-center gap-4 pb-6 pt-3",
        isCompact && "pb-3 pt-2 gap-3"
      )}>
        <Button
          onClick={handleToggleMute}
          variant="outline"
          size="icon"
          className={cn(
            "rounded-full transition-all",
            isCompact ? "h-10 w-10" : "h-14 w-14",
            isMuted 
              ? "bg-muted/80 text-muted-foreground border-border/50" 
              : "bg-card/80 text-foreground border-border/30 hover:bg-card"
          )}
        >
          {isMuted ? <MicOff className={isCompact ? "w-4 h-4" : "w-5 h-5"} /> : <Mic className={isCompact ? "w-4 h-4" : "w-5 h-5"} />}
        </Button>

        <Button
          onClick={handleToggleCamera}
          variant="outline"
          size="icon"
          className={cn(
            "rounded-full transition-all",
            isCompact ? "h-10 w-10" : "h-14 w-14",
            isCameraOff 
              ? "bg-muted/80 text-muted-foreground border-border/50" 
              : "bg-card/80 text-foreground border-border/30 hover:bg-card"
          )}
        >
          {isCameraOff ? <VideoOff className={isCompact ? "w-4 h-4" : "w-5 h-5"} /> : <Video className={isCompact ? "w-4 h-4" : "w-5 h-5"} />}
        </Button>

        <Button
          onClick={handleEndCall}
          size="icon"
          className={cn(
            "rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20",
            isCompact ? "h-10 w-10" : "h-14 w-14"
          )}
        >
          <PhoneOff className={isCompact ? "w-4 h-4" : "w-5 h-5"} />
        </Button>
      </div>
    </div>
  );
}
