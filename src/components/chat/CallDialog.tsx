import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface CallDialogProps {
  open: boolean;
  onClose: () => void;
  conversationName: string;
  conversationId: string;
  initialVideo: boolean;
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

export const CallDialog = ({ open, onClose, conversationName, conversationId, initialVideo }: CallDialogProps) => {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!initialVideo);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  const [remoteProfile, setRemoteProfile] = useState<Profile | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callStartTime = useRef<number | null>(null);

  // Format call duration
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Fetch remote user profile
  useEffect(() => {
    const fetchRemoteProfile = async () => {
      if (!conversationId || !user) return;
      
      const { data: members } = await supabase
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id);
      
      if (members && members.length > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .eq('id', members[0].user_id)
          .single();
        
        if (profile) {
          setRemoteProfile(profile);
        }
      }
    };
    
    if (open) {
      fetchRemoteProfile();
    }
  }, [conversationId, user, open]);

  // Initialize media and WebRTC
  useEffect(() => {
    if (!open || !user) return;

    let mounted = true;
    let stream: MediaStream | null = null;
    let pc: RTCPeerConnection | null = null;

    const initializeCall = async () => {
      try {
        // Get local media
        stream = await navigator.mediaDevices.getUserMedia({
          video: initialVideo,
          audio: true,
        });

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create peer connection with STUN servers
        pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        });
        setPeerConnection(pc);

        // Add local tracks to peer connection
        stream.getTracks().forEach(track => {
          pc!.addTrack(track, stream!);
        });

        // Handle incoming tracks
        pc.ontrack = (event) => {
          if (event.streams[0] && mounted) {
            setRemoteStream(event.streams[0]);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = event.streams[0];
            }
            setConnectionState('connected');
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (!mounted) return;
          if (pc?.iceConnectionState === 'connected' || pc?.iceConnectionState === 'completed') {
            setConnectionState('connected');
          } else if (pc?.iceConnectionState === 'failed' || pc?.iceConnectionState === 'disconnected') {
            setConnectionState('failed');
          }
        };

        // Set up signaling channel
        const channel = supabase
          .channel(`call:${conversationId}`)
          .on('broadcast', { event: 'offer' }, async ({ payload }) => {
            if (payload.from === user.id || !pc) return;
            
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            channel.send({
              type: 'broadcast',
              event: 'answer',
              payload: { answer, from: user.id },
            });
          })
          .on('broadcast', { event: 'answer' }, async ({ payload }) => {
            if (payload.from === user.id || !pc) return;
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
          })
          .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
            if (payload.from === user.id || !pc) return;
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          })
          .on('broadcast', { event: 'end-call' }, () => {
            if (mounted) onClose();
          })
          .subscribe();

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: { candidate: event.candidate, from: user.id },
            });
          }
        };

        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        channel.send({
          type: 'broadcast',
          event: 'offer',
          payload: { offer, from: user.id },
        });

        // Start call timer
        callStartTime.current = Date.now();

      } catch (error) {
        console.error('Error initializing call:', error);
        setConnectionState('failed');
      }
    };

    initializeCall();

    return () => {
      mounted = false;
      stream?.getTracks().forEach(track => track.stop());
      pc?.close();
      supabase.removeChannel(supabase.channel(`call:${conversationId}`));
    };
  }, [open, user, conversationId, initialVideo]);

  // Update call duration
  useEffect(() => {
    if (!open) return;
    
    const interval = setInterval(() => {
      if (callStartTime.current) {
        setCallDuration(Math.floor((Date.now() - callStartTime.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [open]);

  // Handle mute toggle
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // Handle video toggle
  const toggleVideo = async () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks.forEach(track => {
          track.enabled = !track.enabled;
        });
        setIsVideoOff(!isVideoOff);
      } else if (isVideoOff) {
        // Enable video if it was off initially
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const videoTrack = newStream.getVideoTracks()[0];
          localStream.addTrack(videoTrack);
          if (peerConnection) {
            peerConnection.addTrack(videoTrack, localStream);
          }
          setIsVideoOff(false);
        } catch (error) {
          console.error('Error enabling video:', error);
        }
      }
    }
  };

  // End call
  const endCall = () => {
    const channel = supabase.channel(`call:${conversationId}`);
    channel.send({
      type: 'broadcast',
      event: 'end-call',
      payload: {},
    });
    onClose();
  };

  const displayName = remoteProfile?.full_name || remoteProfile?.email || conversationName;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && endCall()}>
      <DialogContent 
        className={cn(
          "p-0 gap-0 border-border/50 bg-background/95 backdrop-blur-xl overflow-hidden",
          isFullscreen ? "max-w-full w-full h-full" : "max-w-2xl w-full"
        )}
      >
        {/* Call Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-card/50 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                connectionState === 'connected' ? "bg-green-500" : 
                connectionState === 'connecting' ? "bg-yellow-500 animate-pulse" : "bg-red-500"
              )} />
              <span className="text-sm font-medium text-foreground">{displayName}</span>
            </div>
            <span className="text-xs text-muted-foreground">{formatTime(callDuration)}</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-muted-foreground hover:text-foreground"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>

        {/* Video Area */}
        <div className={cn(
          "relative bg-black/90",
          isFullscreen ? "h-[calc(100vh-120px)]" : "aspect-video"
        )}>
          {/* Remote Video / Placeholder */}
          {remoteStream && !isVideoOff ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <Avatar className="w-24 h-24 mx-auto ring-4 ring-primary/20">
                  <AvatarImage src={remoteProfile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-white font-medium">{displayName}</p>
                  <p className="text-white/60 text-sm">
                    {connectionState === 'connecting' ? 'Connecting...' : 
                     connectionState === 'connected' ? 'Connected' : 'Connection failed'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Local Video (Picture-in-Picture) */}
          <div className="absolute bottom-4 right-4 w-32 h-24 md:w-40 md:h-28 rounded-lg overflow-hidden bg-black/50 border border-white/10 shadow-lg">
            {localStream && !isVideoOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-card/80">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm">
                    {getInitials(user?.user_metadata?.full_name || user?.email || 'You')}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        </div>

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-4 py-4 bg-card/50 border-t border-border/30">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-12 h-12 rounded-full",
              isMuted ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "bg-card hover:bg-muted"
            )}
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-12 h-12 rounded-full",
              isVideoOff ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "bg-card hover:bg-muted"
            )}
            onClick={toggleVideo}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>

          <Button
            variant="destructive"
            size="icon"
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600"
            onClick={endCall}
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};