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

  if (isConnecting || isLeaving) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">
          {isLeaving ? 'Disconnecting...' : 'Connecting to voice channel...'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card/50">
        <Volume2 className="w-5 h-5 text-green-500" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{channel.name}</h3>
          <p className="text-xs text-muted-foreground">
            {participants.length} connected • {teamName}
          </p>
        </div>
      </div>

      {/* Participants Grid */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Local participant */}
          {hasJoined && (
            <div className="relative aspect-video rounded-xl bg-muted flex items-center justify-center border-2 border-green-500/50">
              {localStream && !isCameraOff ? (
                <video
                  autoPlay
                  muted
                  playsInline
                  ref={(el) => {
                    if (el && localStream) el.srcObject = localStream;
                  }}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="w-16 h-16">
                    <AvatarFallback className="bg-primary/20 text-primary text-lg">
                      {user?.email?.slice(0, 2).toUpperCase() || 'ME'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">You</span>
                </div>
              )}
              {isMuted && (
                <div className="absolute bottom-2 right-2 p-1 rounded-full bg-destructive/80">
                  <MicOff className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          )}

          {/* Remote participants */}
          {participants
            .filter((p) => p.user_id !== user?.id)
            .map((participant) => (
              <div
                key={participant.id}
                className="relative aspect-video rounded-xl bg-muted flex items-center justify-center"
              >
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="w-16 h-16">
                    {participant.profile?.avatar_url ? (
                      <AvatarImage src={participant.profile.avatar_url} />
                    ) : null}
                    <AvatarFallback className="bg-secondary text-lg">
                      {getInitials(participant.profile)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate max-w-full px-2">
                    {participant.profile?.full_name ||
                      participant.profile?.username ||
                      participant.profile?.email?.split('@')[0]}
                  </span>
                </div>
                {participant.is_muted && (
                  <div className="absolute bottom-2 right-2 p-1 rounded-full bg-destructive/80">
                    <MicOff className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            ))}
        </div>

        {/* Empty state */}
        {!hasJoined && participants.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
            <Volume2 className="w-12 h-12 opacity-30" />
            <p>No one is in this voice channel</p>
            <Button onClick={handleJoin}>Join Voice</Button>
          </div>
        )}
      </div>

      {/* Controls */}
      {hasJoined && (
        <div className="flex justify-center gap-2 p-4 bg-muted border-t">
          <Button
            onClick={handleToggleMute}
            variant={isMuted ? 'destructive' : 'secondary'}
            size="icon"
            disabled={isLeaving}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          <Button
            onClick={handleToggleCamera}
            variant={isCameraOff ? 'destructive' : 'secondary'}
            size="icon"
            disabled={isLeaving}
          >
            {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>

          <Button 
            onClick={handleLeave} 
            variant="destructive" 
            size="icon"
            disabled={isLeaving}
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
