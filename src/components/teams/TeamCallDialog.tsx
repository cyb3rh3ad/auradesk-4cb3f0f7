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

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

// Remote video component
const RemoteVideo = ({ stream, name }: { stream: MediaStream | null; name: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      const videoTracks = stream.getVideoTracks();
      setHasVideo(videoTracks.length > 0 && videoTracks[0].enabled);
    }
  }, [stream]);

  const getInitials = (n: string) => {
    return n.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden bg-card shadow-xl min-h-[200px]">
      {!hasVideo ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-card to-muted">
          <div className="text-center space-y-3">
            <Avatar className="w-20 h-20 mx-auto ring-4 ring-border/50">
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xl font-semibold">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm font-medium">{name}</p>
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute bottom-3 left-3">
        <Badge className="bg-background/80 backdrop-blur-sm text-foreground text-xs">
          {name}
        </Badge>
      </div>
    </div>
  );
};

export const TeamCallDialog = ({ team, isVideo, open, onClose }: TeamCallDialogProps) => {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideo);
  const [callTime, setCallTime] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  const [userName, setUserName] = useState<string>('Anonymous');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceCandidateQueues = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const roomId = `team-call-room:${team.id}`;

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', user.id)
        .single();
      if (data) {
        setUserName(data.full_name || data.email || 'Anonymous');
        setUserAvatar(data.avatar_url);
      }
    };
    fetchProfile();
  }, [user]);

  // Create peer connection
  const createPeerConnection = useCallback((remoteUserId: string, remoteName: string) => {
    if (!user) return null;
    
    console.log('[WebRTC] Creating peer connection for:', remoteUserId);
    
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        console.log('[WebRTC] Sending ICE candidate to:', remoteUserId);
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            from: user.id,
            to: remoteUserId,
            candidate: event.candidate.toJSON()
          }
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('[WebRTC] Received track from:', remoteUserId, event.streams);
      if (event.streams[0] && mountedRef.current) {
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
      console.log('[WebRTC] Connection state for', remoteUserId, ':', pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state for', remoteUserId, ':', pc.iceConnectionState);
    };

    // Add local tracks
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => {
        console.log('[WebRTC] Adding local track:', track.kind);
        pc.addTrack(track, stream);
      });
    }

    peerConnections.current.set(remoteUserId, pc);
    return pc;
  }, [user]);

  // Initialize call
  useEffect(() => {
    if (!open || !user) return;

    mountedRef.current = true;
    let announceInterval: NodeJS.Timeout | null = null;

    const initialize = async () => {
      try {
        console.log('[Call] Initializing call for team:', team.id);
        
        // Get media stream
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo
        });
        
        if (!mountedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        
        console.log('[Call] Got local stream with tracks:', stream.getTracks().map(t => t.kind));
        
        localStreamRef.current = stream;
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create signaling channel
        const channel = supabase.channel(roomId, {
          config: { broadcast: { self: false } }
        });

        // Handle join events
        channel.on('broadcast', { event: 'join' }, async ({ payload }) => {
          if (!mountedRef.current || payload.userId === user.id) return;
          
          // Don't create duplicate connections
          if (peerConnections.current.has(payload.userId)) {
            console.log('[Call] Already have connection to:', payload.userId);
            return;
          }
          
          console.log('[Call] User joined:', payload.userId, payload.userName);
          
          // Create peer connection and send offer
          const pc = createPeerConnection(payload.userId, payload.userName);
          if (!pc) return;
          
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            console.log('[Call] Sending offer to:', payload.userId);
            channel.send({
              type: 'broadcast',
              event: 'offer',
              payload: {
                from: user.id,
                fromName: userName,
                to: payload.userId,
                offer: { type: offer.type, sdp: offer.sdp }
              }
            });
          } catch (err) {
            console.error('[Call] Error creating offer:', err);
          }
        });

        // Handle offer
        channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
          if (!mountedRef.current || payload.to !== user.id) return;
          
          console.log('[Call] Received offer from:', payload.from);
          
          let pc = peerConnections.current.get(payload.from);
          if (!pc) {
            pc = createPeerConnection(payload.from, payload.fromName);
          }
          if (!pc) return;
          
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
            
            // Process queued ICE candidates
            const queue = iceCandidateQueues.current.get(payload.from) || [];
            console.log('[Call] Processing', queue.length, 'queued ICE candidates');
            for (const candidate of queue) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            iceCandidateQueues.current.delete(payload.from);
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            console.log('[Call] Sending answer to:', payload.from);
            channel.send({
              type: 'broadcast',
              event: 'answer',
              payload: {
                from: user.id,
                fromName: userName,
                to: payload.from,
                answer: { type: answer.type, sdp: answer.sdp }
              }
            });
          } catch (err) {
            console.error('[Call] Error handling offer:', err);
          }
        });

        // Handle answer
        channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
          if (!mountedRef.current || payload.to !== user.id) return;
          
          console.log('[Call] Received answer from:', payload.from);
          
          const pc = peerConnections.current.get(payload.from);
          if (!pc) return;
          
          try {
            if (pc.signalingState !== 'stable') {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
              
              // Process queued ICE candidates
              const queue = iceCandidateQueues.current.get(payload.from) || [];
              console.log('[Call] Processing', queue.length, 'queued ICE candidates');
              for (const candidate of queue) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              }
              iceCandidateQueues.current.delete(payload.from);
            }
          } catch (err) {
            console.error('[Call] Error handling answer:', err);
          }
        });

        // Handle ICE candidates
        channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (!mountedRef.current || payload.to !== user.id) return;
          
          const pc = peerConnections.current.get(payload.from);
          if (pc && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (err) {
              console.error('[Call] Error adding ICE candidate:', err);
            }
          } else {
            // Queue the candidate
            const queue = iceCandidateQueues.current.get(payload.from) || [];
            queue.push(payload.candidate);
            iceCandidateQueues.current.set(payload.from, queue);
          }
        });

        // Handle leave
        channel.on('broadcast', { event: 'leave' }, ({ payload }) => {
          if (!mountedRef.current) return;
          
          console.log('[Call] User left:', payload.userId);
          
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
        });

        // Subscribe and announce presence
        channel.subscribe((status) => {
          console.log('[Call] Channel status:', status);
          
          if (status === 'SUBSCRIBED' && mountedRef.current) {
            setConnectionState('connected');
            
            // Announce join
            const announceJoin = () => {
              if (!mountedRef.current) return;
              console.log('[Call] Announcing join');
              channel.send({
                type: 'broadcast',
                event: 'join',
                payload: { userId: user.id, userName }
              });
            };
            
            // Announce immediately and then every 2 seconds for 10 seconds
            announceJoin();
            let count = 0;
            announceInterval = setInterval(() => {
              count++;
              if (count >= 5 || !mountedRef.current) {
                if (announceInterval) clearInterval(announceInterval);
                return;
              }
              announceJoin();
            }, 2000);
          }
        });

        channelRef.current = channel;
        
      } catch (err) {
        console.error('[Call] Failed to initialize:', err);
        if (mountedRef.current) {
          setConnectionState('failed');
        }
      }
    };

    initialize();

    return () => {
      mountedRef.current = false;
      if (announceInterval) clearInterval(announceInterval);
    };
  }, [open, user, team.id, isVideo, roomId, userName, createPeerConnection]);

  // Timer
  useEffect(() => {
    if (!open || connectionState !== 'connected') return;
    
    const interval = setInterval(() => {
      setCallTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [open, connectionState]);

  // Cleanup on close
  useEffect(() => {
    if (open) return;
    
    console.log('[Call] Cleaning up');
    
    // Leave room
    if (channelRef.current && user) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'leave',
        payload: { userId: user.id }
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
    iceCandidateQueues.current.clear();
    
    // Reset state
    setParticipants(new Map());
    setCallTime(0);
    setConnectionState('connecting');
  }, [open, user, localStream]);

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
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-5xl h-[90vh] p-0 gap-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
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
                        <AvatarImage src={userAvatar || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xl font-semibold">
                          {getInitials(userName)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">{userName}</p>
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
            size="icon"
            className="w-12 h-12 rounded-full"
            onClick={handleToggleMute}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          
          {isVideo && (
            <Button
              variant={isVideoOff ? "destructive" : "secondary"}
              size="icon"
              className="w-12 h-12 rounded-full"
              onClick={handleToggleVideo}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </Button>
          )}
          
          <Button
            variant="destructive"
            size="icon"
            className="w-14 h-14 rounded-full"
            onClick={onClose}
          >
            <Phone className="w-6 h-6 rotate-[135deg]" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
