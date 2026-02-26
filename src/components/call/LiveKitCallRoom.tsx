import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LiveKitRoom,
  AudioConference,
  useRoomContext,
  useParticipants,
  useLocalParticipant,
  RoomAudioRenderer,
  useTracks,
  TrackToggle,
  DisconnectButton,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track, RoomEvent } from 'livekit-client';
import { supabase } from '@/integrations/supabase/client';
import { getSupabaseFunctionsUrl } from '@/lib/supabase-config';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mic, MicOff, PhoneOff, Loader2, Video, VideoOff } from 'lucide-react';
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
  const fetchedRef = useRef(false);

  // Fetch LiveKit token from edge function
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchToken = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Not authenticated');
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${getSupabaseFunctionsUrl()}/livekit-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            roomName,
            participantName,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: 'Failed to get token' }));
          throw new Error(errData.error || 'Failed to get token');
        }

        const data = await response.json();
        console.log('[LiveKit] Got token, URL:', data.url);
        setToken(data.token);
        setLivekitUrl(data.url);
      } catch (err: any) {
        console.error('[LiveKit] Token fetch error:', err);
        setError(err.message || 'Failed to connect');
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
  }, [roomName, participantName]);

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
        <p className="mt-4 text-sm text-muted-foreground">Connecting to call...</p>
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
          <PhoneOff className="w-8 h-8 text-destructive" />
        </div>
        <p className="text-destructive text-sm font-medium">{error || 'Connection failed'}</p>
        <div className="flex gap-3">
          <Button onClick={() => { fetchedRef.current = false; setIsLoading(true); setError(null); }} className="rounded-full px-6">
            Retry
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
      onError={(err) => {
        console.error('[LiveKit] Room error:', err);
        setError(err.message);
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
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  // Start duration timer when connected
  useEffect(() => {
    durationRef.current = setInterval(() => {
      setCallDuration(d => d + 1);
    }, 1000);
    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, []);

  // Sync mute state with LiveKit
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
    await localParticipant.setMicrophoneEnabled(isMuted);
  };

  const handleToggleCamera = async () => {
    await localParticipant.setCameraEnabled(isCameraOff);
  };

  const handleEndCall = () => {
    room.disconnect();
    onDisconnect();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const remoteParticipants = participants.filter(p => !p.isLocal);
  const isCompact = pipMode === 'mini' || pipMode === 'small';

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-[hsl(var(--cosmic-cyan))]/[0.03] blur-[80px]" />
      </div>

      {/* Top bar */}
      {!isCompact && (
        <div className="relative z-10 flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground font-mono">{formatDuration(callDuration)}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {participants.length} participant{participants.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Participants area */}
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
                  {/* Speaking glow */}
                  {isSpeaking && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl bg-primary/5"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  )}

                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className={cn("border-2 border-border/50", isCompact ? "h-12 w-12" : "h-20 w-20")}>
                      <AvatarFallback className={cn(
                        "bg-primary/10 text-primary font-semibold",
                        isCompact ? "text-sm" : "text-xl"
                      )}>
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Speaking ring */}
                    {isSpeaking && (
                      <motion.div
                        className="absolute inset-[-4px] rounded-full border-2 border-primary/60"
                        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                    )}

                    {/* Mute indicator */}
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

          {/* Waiting state when alone */}
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

      {/* Controls bar - WhatsApp style */}
      <div className={cn(
        "relative z-10 flex items-center justify-center gap-4 pb-6 pt-3",
        isCompact && "pb-3 pt-2 gap-3"
      )}>
        {/* Mute toggle */}
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

        {/* Camera toggle */}
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

        {/* End call */}
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
