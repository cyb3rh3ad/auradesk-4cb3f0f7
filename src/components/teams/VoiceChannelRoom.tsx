import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVoiceChannel, TeamChannel } from '@/hooks/useTeamChannels';
import { useWebRTC } from '@/hooks/useWebRTC';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Volume2,
  Loader2,
  Settings,
  Headphones,
  MonitorSpeaker,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceChannelRoomProps {
  channel: TeamChannel;
  teamName: string;
  onLeave: () => void;
}

export function VoiceChannelRoom({ channel, teamName, onLeave }: VoiceChannelRoomProps) {
  const { user } = useAuth();
  const { participants, isJoined, joinChannel, leaveChannel, updateStatus } = useVoiceChannel(channel.id);
  const {
    localStream,
    isConnecting,
    isConnected,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
  } = useWebRTC(`voice-${channel.id}`, user?.email?.split('@')[0] || 'User');

  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  
  // Use refs to track state for cleanup
  const hasJoinedRef = useRef(false);
  const isLeavingRef = useRef(false);
  const hasInitialized = useRef(false);

  // Join the voice channel
  const handleJoin = useCallback(async () => {
    if (hasJoinedRef.current || isLeavingRef.current) return;
    
    try {
      const success = await joinChannel();
      if (success) {
        setHasJoined(true);
        hasJoinedRef.current = true;
        // Join WebRTC room with audio only by default
        await joinRoom(false, true);
      }
    } catch (err) {
      console.error('[VoiceChannel] Error joining:', err);
    }
  }, [joinChannel, joinRoom]);

  // Leave the voice channel - fire and forget for responsiveness
  const handleLeave = useCallback(() => {
    if (isLeavingRef.current) return;
    
    isLeavingRef.current = true;
    setIsLeaving(true);
    
    // Immediately stop local WebRTC and update UI
    leaveRoom();
    setHasJoined(false);
    hasJoinedRef.current = false;
    
    // Fire database cleanup without waiting
    leaveChannel().catch(err => {
      console.error('[VoiceChannel] Error leaving channel:', err);
    });
    
    // Call onLeave immediately for responsive UI
    onLeave();
  }, [leaveRoom, leaveChannel, onLeave]);

  // Toggle mute - optimistic UI update
  const handleToggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    toggleAudio(newMuted);
    // Fire and forget database update
    updateStatus(newMuted, isCameraOff).catch(() => {});
  }, [isMuted, isCameraOff, toggleAudio, updateStatus]);

  // Toggle deafen
  const handleToggleDeafen = useCallback(() => {
    const newDeafened = !isDeafened;
    setIsDeafened(newDeafened);
    // When deafened, also mute
    if (newDeafened && !isMuted) {
      setIsMuted(true);
      toggleAudio(true);
    }
  }, [isDeafened, isMuted, toggleAudio]);

  // Toggle camera - optimistic UI update
  const handleToggleCamera = useCallback(() => {
    const newCameraOff = !isCameraOff;
    setIsCameraOff(newCameraOff);
    toggleVideo(newCameraOff);
    // Fire and forget database update
    updateStatus(isMuted, newCameraOff).catch(() => {});
  }, [isCameraOff, isMuted, toggleVideo, updateStatus]);

  // Clean up on unmount - use refs to avoid stale closures
  useEffect(() => {
    return () => {
      if (hasJoinedRef.current && !isLeavingRef.current) {
        leaveRoom();
        leaveChannel().catch(() => {});
      }
    };
  }, [leaveRoom, leaveChannel]);

  // Auto-join on mount - only once
  useEffect(() => {
    if (!hasInitialized.current && !hasJoinedRef.current && !isJoined) {
      hasInitialized.current = true;
      handleJoin();
    }
  }, [handleJoin, isJoined]);

  // Handle page unload/refresh - use navigator.sendBeacon for reliability
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasJoinedRef.current && user) {
        // Use sendBeacon for reliable cleanup during page unload
        const data = JSON.stringify({
          channel_id: channel.id,
          user_id: user.id,
        });
        
        // Try to clean up via REST API if available
        try {
          navigator.sendBeacon(
            `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/voice_channel_participants?channel_id=eq.${channel.id}&user_id=eq.${user.id}`,
            data
          );
        } catch {
          // Fallback - the realtime subscription will eventually clean up stale entries
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [channel.id, user]);

  const getInitials = (profile: typeof participants[0]['profile']) => {
    if (!profile) return '?';
    if (profile.full_name) {
      return profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (profile.username) {
      return profile.username.slice(0, 2).toUpperCase();
    }
    return profile.email.slice(0, 2).toUpperCase();
  };

  const getName = (profile: typeof participants[0]['profile']) => {
    if (!profile) return 'Unknown';
    return profile.full_name || profile.username || profile.email?.split('@')[0] || 'Unknown';
  };

  if (isConnecting || isLeaving) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 bg-[hsl(var(--sidebar-background))]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">
          {isLeaving ? 'Disconnecting...' : 'Connecting to voice channel...'}
        </p>
      </div>
    );
  }

  // Discord-style voice channel layout
  return (
    <div className="flex flex-col h-full bg-[hsl(var(--sidebar-background))]">
      {/* Header - Discord style */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-[hsl(var(--sidebar-background))]">
        <Volume2 className="w-5 h-5 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{channel.name}</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{participants.length + (hasJoined ? 1 : 0)}</span>
        </div>
      </div>

      {/* Main content area - Grid of video/avatars */}
      <div className="flex-1 p-4 overflow-auto">
        {!hasJoined && participants.length === 0 ? (
          // Empty state - Nobody in channel
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center">
              <Volume2 className="w-10 h-10 opacity-30" />
            </div>
            <p className="text-sm">No one is in this voice channel</p>
            <Button 
              onClick={handleJoin}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              Join Voice
            </Button>
          </div>
        ) : (
          // Participants grid - Discord style tiles - Responsive for mobile
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3">
            {/* Local participant */}
            {hasJoined && (
              <div className={cn(
                "relative aspect-video rounded-lg overflow-hidden bg-[hsl(220,10%,18%)] border border-border/30",
                "hover:border-primary/50 transition-colors group",
                !isMuted && "ring-2 ring-green-500/50"
              )}>
                {localStream && !isCameraOff ? (
                  <video
                    autoPlay
                    muted
                    playsInline
                    ref={(el) => {
                      if (el && localStream) el.srcObject = localStream;
                    }}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <Avatar className="w-16 h-16 ring-2 ring-green-500/30">
                      <AvatarFallback className="bg-green-600 text-white text-lg">
                        {user?.email?.slice(0, 2).toUpperCase() || 'ME'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}
                {/* Name overlay */}
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center gap-1.5">
                    {isMuted ? (
                      <MicOff className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-green-400" />
                    )}
                    <span className="text-xs text-white font-medium truncate">You</span>
                  </div>
                </div>
              </div>
            )}

            {/* Remote participants */}
            {participants
              .filter((p) => p.user_id !== user?.id)
              .map((participant) => (
                <div
                  key={participant.id}
                  className={cn(
                    "relative aspect-video rounded-lg overflow-hidden bg-[hsl(220,10%,18%)] border border-border/30",
                    "hover:border-primary/50 transition-colors group",
                    !participant.is_muted && "ring-2 ring-green-500/50"
                  )}
                >
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <Avatar className="w-16 h-16">
                      {participant.profile?.avatar_url ? (
                        <AvatarImage src={participant.profile.avatar_url} />
                      ) : null}
                      <AvatarFallback className="bg-primary/80 text-primary-foreground text-lg">
                        {getInitials(participant.profile)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {/* Name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center gap-1.5">
                      {participant.is_muted ? (
                        <MicOff className="w-3.5 h-3.5 text-red-400" />
                      ) : (
                        <Mic className="w-3.5 h-3.5 text-green-400" />
                      )}
                      <span className="text-xs text-white font-medium truncate">
                        {getName(participant.profile)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Controls bar - Discord style at bottom - Mobile optimized */}
      {hasJoined && (
        <div className="flex items-center justify-center gap-3 p-4 bg-[hsl(220,10%,12%)] border-t border-border/30 safe-area-pb">
          {/* Mute button - 44px minimum touch target */}
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToggleMute();
            }}
            variant="ghost"
            size="icon"
            disabled={isLeaving}
            className={cn(
              "w-12 h-12 md:w-11 md:h-11 rounded-full transition-all hover:scale-105 active:scale-95 touch-manipulation",
              isMuted 
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300" 
                : "bg-secondary/50 text-foreground hover:bg-secondary"
            )}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </Button>

          {/* Deafen button */}
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToggleDeafen();
            }}
            variant="ghost"
            size="icon"
            disabled={isLeaving}
            className={cn(
              "w-12 h-12 md:w-11 md:h-11 rounded-full transition-all hover:scale-105 active:scale-95 touch-manipulation",
              isDeafened 
                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300" 
                : "bg-secondary/50 text-foreground hover:bg-secondary"
            )}
          >
            {isDeafened ? <MonitorSpeaker className="w-6 h-6" /> : <Headphones className="w-6 h-6" />}
          </Button>

          {/* Camera button */}
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToggleCamera();
            }}
            variant="ghost"
            size="icon"
            disabled={isLeaving}
            className={cn(
              "w-12 h-12 md:w-11 md:h-11 rounded-full transition-all hover:scale-105 active:scale-95 touch-manipulation",
              isCameraOff 
                ? "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground" 
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </Button>

          {/* Disconnect button */}
          <Button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleLeave();
            }} 
            variant="ghost" 
            size="icon"
            disabled={isLeaving}
            className="w-12 h-12 md:w-11 md:h-11 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all hover:scale-105 active:scale-95 touch-manipulation"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      )}
    </div>
  );
}