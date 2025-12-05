import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mic, MicOff, Video, VideoOff, Phone, 
  Users, Loader2, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Team } from '@/hooks/useTeams';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

interface TeamCallDialogProps {
  team: Team;
  isVideo: boolean;
  open: boolean;
  onClose: () => void;
}

interface Participant {
  odakle: string;
  name: string;
  stream: MediaStream | null;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export const TeamCallDialog = ({ team, isVideo, open, onClose }: TeamCallDialogProps) => {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideo);
  const [callTime, setCallTime] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  const [profile, setProfile] = useState<{ full_name: string | null; email: string; avatar_url: string | null } | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callStartTime = useRef<number | null>(null);
  const iceCandidateQueues = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  const userName = profile?.full_name || profile?.email || 'Anonymous';
  const roomId = `team-call-${team.id}`;

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [user]);

  const createPeerConnection = useCallback((remoteUserId: string, remoteName: string) => {
    const stream = localStreamRef.current;
    console.log('Creating peer connection for:', remoteUserId, 'stream:', !!stream);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        console.log('Sending ICE candidate to:', remoteUserId);
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            from: user?.id,
            to: remoteUserId,
            candidate: event.candidate.toJSON()
          }
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track from:', remoteUserId);
      if (event.streams[0]) {
        setParticipants(prev => {
          const updated = new Map(prev);
          updated.set(remoteUserId, {
            odakle: remoteUserId,
            name: remoteName,
            stream: event.streams[0]
          });
          return updated;
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('Connection state for', remoteUserId, ':', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectionState('connected');
        if (!callStartTime.current) callStartTime.current = Date.now();
      }
    };

    // Add local tracks from ref
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log('Adding track to peer connection:', track.kind);
        pc.addTrack(track, stream);
      });
    }

    peerConnections.current.set(remoteUserId, pc);
    return pc;
  }, [user?.id]);

  const sendOffer = useCallback(async (remoteUserId: string, remoteName: string) => {
    const pc = createPeerConnection(remoteUserId, remoteName);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    channelRef.current?.send({
      type: 'broadcast',
      event: 'offer',
      payload: {
        from: user?.id,
        fromName: userName,
        to: remoteUserId,
        offer: offer
      }
    });
  }, [createPeerConnection, user?.id, userName]);

  const handleOffer = useCallback(async (from: string, fromName: string, offer: RTCSessionDescriptionInit) => {
    console.log('Handling offer from:', from);
    let pc = peerConnections.current.get(from);
    if (!pc) {
      pc = createPeerConnection(from, fromName);
    }
    
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    
    // Process queued candidates
    const queue = iceCandidateQueues.current.get(from) || [];
    for (const candidate of queue) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    iceCandidateQueues.current.delete(from);
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    channelRef.current?.send({
      type: 'broadcast',
      event: 'answer',
      payload: {
        from: user?.id,
        fromName: userName,
        to: from,
        answer: answer
      }
    });
  }, [createPeerConnection, user?.id, userName]);

  const handleAnswer = useCallback(async (from: string, answer: RTCSessionDescriptionInit) => {
    console.log('Handling answer from:', from);
    const pc = peerConnections.current.get(from);
    if (pc && pc.signalingState !== 'stable') {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      
      // Process queued candidates
      const queue = iceCandidateQueues.current.get(from) || [];
      for (const candidate of queue) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      iceCandidateQueues.current.delete(from);
    }
  }, []);

  const handleIceCandidate = useCallback(async (from: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnections.current.get(from);
    if (pc && pc.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      // Queue the candidate
      const queue = iceCandidateQueues.current.get(from) || [];
      queue.push(candidate);
      iceCandidateQueues.current.set(from, queue);
    }
  }, []);

  // Initialize media and join room
  useEffect(() => {
    if (!open || !user || !profile) return;

    let mounted = true;

    const initialize = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo
        });
        
        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        
        // Set both state and ref
        localStreamRef.current = stream;
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Join signaling channel
        const channel = supabase.channel(roomId, {
          config: { broadcast: { self: false } }
        });

        channel
          .on('broadcast', { event: 'join' }, ({ payload }) => {
            if (payload.userId !== user.id && mounted) {
              console.log('User joined:', payload.userId);
              // Send offer to new user
              sendOffer(payload.userId, payload.userName);
            }
          })
          .on('broadcast', { event: 'offer' }, ({ payload }) => {
            if (payload.to === user.id && mounted) {
              handleOffer(payload.from, payload.fromName, payload.offer);
            }
          })
          .on('broadcast', { event: 'answer' }, ({ payload }) => {
            if (payload.to === user.id && mounted) {
              handleAnswer(payload.from, payload.answer);
            }
          })
          .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
            if (payload.to === user.id && mounted) {
              handleIceCandidate(payload.from, payload.candidate);
            }
          })
          .on('broadcast', { event: 'leave' }, ({ payload }) => {
            if (mounted) {
              console.log('User left:', payload.userId);
              const pc = peerConnections.current.get(payload.userId);
              if (pc) {
                pc.close();
                peerConnections.current.delete(payload.userId);
              }
              setParticipants(prev => {
                const updated = new Map(prev);
                updated.delete(payload.userId);
                return updated;
              });
            }
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && mounted) {
              console.log('Joined team call room');
              // Announce presence
              channel.send({
                type: 'broadcast',
                event: 'join',
                payload: { userId: user.id, userName }
              });
              setConnectionState('connected');
              callStartTime.current = Date.now();
            }
          });

        channelRef.current = channel;
      } catch (err) {
        console.error('Failed to initialize call:', err);
        setConnectionState('failed');
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [open, user, profile, isVideo, roomId, userName, sendOffer, handleOffer, handleAnswer, handleIceCandidate]);

  // Timer
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setCallTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      // Leave room
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'leave',
          payload: { userId: user?.id }
        });
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      // Stop media
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      localStream?.getTracks().forEach(t => t.stop());
      setLocalStream(null);
      
      // Close peer connections
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      
      // Reset state
      setParticipants(new Map());
      setCallTime(0);
      setConnectionState('connecting');
      callStartTime.current = null;
    }
  }, [open, user?.id, localStream]);

  const handleToggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  const handleToggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
    }
    setIsVideoOff(!isVideoOff);
  };

  const handleEndCall = () => {
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const participantCount = participants.size + 1;
  const participantArray = Array.from(participants.values());

  const getGridClass = () => {
    if (participantCount === 1) return 'grid-cols-1';
    if (participantCount === 2) return 'grid-cols-1 md:grid-cols-2';
    if (participantCount <= 4) return 'grid-cols-2';
    return 'grid-cols-2 md:grid-cols-3';
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0 flex flex-col">
        <VisuallyHidden.Root>
          <DialogTitle>Team Call - {team.name}</DialogTitle>
          <DialogDescription>Group call with team members</DialogDescription>
        </VisuallyHidden.Root>

        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-border/40 bg-card/50 shrink-0">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-semibold truncate">{team.name}</h2>
            <Badge variant="outline" className="text-xs gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {formatTime(callTime)}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {participantCount} in call
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Video Area */}
        <div className="flex-1 p-4 bg-gradient-to-br from-background to-card/50 relative overflow-hidden">
          {connectionState === 'connecting' ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Connecting to call...</p>
            </div>
          ) : connectionState === 'failed' ? (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-destructive mb-4">Failed to connect</p>
              <Button onClick={onClose}>Go Back</Button>
            </div>
          ) : (
            <div className={cn("grid gap-4 h-full", getGridClass())}>
              {/* Local Video */}
              <div className="relative rounded-2xl overflow-hidden bg-card shadow-xl min-h-[200px]">
                {isVideoOff || !isVideo ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-card to-muted">
                    <div className="text-center space-y-3">
                      <Avatar className="w-20 h-20 mx-auto ring-4 ring-border/50">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xl font-semibold">
                          {getInitials(userName)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">{profile?.full_name || 'You'}</p>
                    </div>
                  </div>
                ) : (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <Badge className="bg-background/80 backdrop-blur-sm text-foreground text-xs">
                    You
                    {isMuted && <MicOff className="w-3 h-3 ml-1 text-destructive" />}
                  </Badge>
                </div>
              </div>

              {/* Remote Participants */}
              {participantArray.map((participant) => (
                <RemoteVideo
                  key={participant.odakle}
                  stream={participant.stream}
                  name={participant.name}
                />
              ))}
            </div>
          )}

          {/* Waiting indicator */}
          {connectionState === 'connected' && participantCount === 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
              <Badge variant="secondary" className="gap-2 py-2 px-4">
                <Loader2 className="w-3 h-3 animate-spin" />
                Waiting for team members...
              </Badge>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="h-20 px-4 flex items-center justify-center gap-3 bg-card/50 border-t border-border/40 shrink-0">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="lg"
            className="w-14 h-14 rounded-full"
            onClick={handleToggleMute}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          {isVideo && (
            <Button
              variant={isVideoOff ? "destructive" : "secondary"}
              size="lg"
              className="w-14 h-14 rounded-full"
              onClick={handleToggleVideo}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </Button>
          )}
          <div className="w-px h-10 bg-border mx-2" />
          <Button
            variant="destructive"
            size="lg"
            className="px-8 h-14 rounded-full gap-2"
            onClick={handleEndCall}
          >
            <Phone className="w-5 h-5 rotate-[135deg]" />
            Leave
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Remote video component
const RemoteVideo = ({ stream, name }: { stream: MediaStream | null; name: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (stream) {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.log('Video play error:', e));
      }
      if (audioRef.current) {
        audioRef.current.srcObject = stream;
        audioRef.current.play().catch(e => console.log('Audio play error:', e));
      }
    }
  }, [stream]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const hasVideo = stream?.getVideoTracks().some(t => t.enabled);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-card shadow-xl min-h-[200px]">
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-card to-muted">
          <div className="text-center space-y-3">
            <Avatar className="w-20 h-20 mx-auto ring-4 ring-border/50">
              <AvatarFallback className="bg-gradient-to-br from-secondary to-muted text-secondary-foreground text-xl font-semibold">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm font-medium">{name}</p>
          </div>
        </div>
      )}
      {/* Hidden audio element for audio playback */}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      <div className="absolute bottom-3 left-3">
        <Badge className="bg-background/80 backdrop-blur-sm text-foreground text-xs">
          {name}
        </Badge>
      </div>
    </div>
  );
};
