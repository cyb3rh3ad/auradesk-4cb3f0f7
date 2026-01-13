import { useState, useEffect, useCallback } from 'react';
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
  Monitor,
  MonitorOff,
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
    participants: webrtcParticipants,
    isConnecting,
    isConnected,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo,
  } = useWebRTC(`voice-${channel.id}`, user?.email?.split('@')[0] || 'User');

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  // Join the voice channel
  const handleJoin = useCallback(async () => {
    const success = await joinChannel();
    if (success) {
      setHasJoined(true);
      // Join WebRTC room with audio only by default
      await joinRoom(false, true);
    }
  }, [joinChannel, joinRoom]);

  // Leave the voice channel
  const handleLeave = useCallback(async () => {
    leaveRoom();
    await leaveChannel();
    setHasJoined(false);
    onLeave();
  }, [leaveRoom, leaveChannel, onLeave]);

  // Toggle mute
  const handleToggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    toggleAudio(newMuted);
    updateStatus(newMuted, isCameraOff);
  }, [isMuted, isCameraOff, toggleAudio, updateStatus]);

  // Toggle camera
  const handleToggleCamera = useCallback(() => {
    const newCameraOff = !isCameraOff;
    setIsCameraOff(newCameraOff);
    toggleVideo(newCameraOff);
    updateStatus(isMuted, newCameraOff);
  }, [isCameraOff, isMuted, toggleVideo, updateStatus]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (hasJoined) {
        leaveRoom();
        leaveChannel();
      }
    };
  }, [hasJoined, leaveRoom, leaveChannel]);

  // Auto-join on mount
  useEffect(() => {
    if (!hasJoined && !isJoined) {
      handleJoin();
    }
  }, [hasJoined, isJoined, handleJoin]);

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

  if (isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Connecting to voice channel...</p>
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
                  ref={(el) => {
                    if (el && localStream) el.srcObject = localStream;
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="text-2xl">You</AvatarFallback>
                </Avatar>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/80 rounded text-sm flex items-center gap-2">
                <span>You</span>
                {isMuted && <MicOff className="w-3 h-3 text-red-500" />}
              </div>
            </div>
          )}

          {/* Other participants */}
          {participants
            .filter((p) => p.user_id !== user?.id)
            .map((participant) => (
              <div
                key={participant.id}
                className="relative aspect-video rounded-xl bg-muted flex items-center justify-center border-2 border-border"
              >
                <Avatar className="w-16 h-16">
                  <AvatarImage src={participant.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(participant.profile)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/80 rounded text-sm flex items-center gap-2">
                  <span className="truncate max-w-[100px]">
                    {participant.profile?.full_name ||
                      participant.profile?.username ||
                      'User'}
                  </span>
                  {participant.is_muted && <MicOff className="w-3 h-3 text-red-500" />}
                </div>
              </div>
            ))}
        </div>

        {participants.length === 0 && !hasJoined && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Volume2 className="w-12 h-12 mb-2 opacity-50" />
            <p className="font-medium">Voice Channel Empty</p>
            <p className="text-sm mb-4">Be the first to join!</p>
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
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>

          <Button
            onClick={handleToggleCamera}
            variant={isCameraOff ? 'destructive' : 'secondary'}
            size="icon"
          >
            {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>

          <Button onClick={handleLeave} variant="destructive" size="icon">
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
