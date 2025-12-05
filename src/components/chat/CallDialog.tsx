import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
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
  isCaller?: boolean; // true if this user initiated the call
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

export const CallDialog = ({ open, onClose, conversationName, conversationId, initialVideo, isCaller = true }: CallDialogProps) => {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!initialVideo);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  const [remoteProfile, setRemoteProfile] = useState<Profile | null>(null);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callStartTime = useRef<number | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]);

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
    let offerRetryInterval: NodeJS.Timeout | null = null;
    let signalRetryInterval: NodeJS.Timeout | null = null;

    const initializeCall = async () => {
      try {
        console.log('Initializing call, isCaller:', isCaller);
        
        // Get local media
        stream = await navigator.mediaDevices.getUserMedia({
          video: initialVideo,
          audio: true,
        });

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        console.log('Got local media stream with tracks:', stream.getTracks().map(t => t.kind));
        setLocalStream(stream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create peer connection with STUN/TURN servers
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
          ],
        });
        pcRef.current = pc;

        // Add local tracks to peer connection
        stream.getTracks().forEach(track => {
          console.log('Adding track to peer connection:', track.kind);
          pc.addTrack(track, stream!);
        });

        // Handle incoming tracks
        pc.ontrack = (event) => {
          console.log('Received remote track:', event.track.kind, 'enabled:', event.track.enabled);
          if (event.streams[0] && mounted) {
            const remoteMediaStream = event.streams[0];
            console.log('Setting remote stream with tracks:', remoteMediaStream.getTracks().map(t => `${t.kind}:${t.enabled}`));
            setRemoteStream(remoteMediaStream);
            
            // Set srcObject and force play
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteMediaStream;
              remoteVideoRef.current.play().catch(e => console.log('Video play error:', e));
            }
            
            // Also create a hidden audio element as backup for audio playback
            const audioEl = document.createElement('audio');
            audioEl.srcObject = remoteMediaStream;
            audioEl.autoplay = true;
            audioEl.play().catch(e => console.log('Audio play error:', e));
            
            setConnectionState('connected');
            callStartTime.current = Date.now();
          }
        };

        pc.oniceconnectionstatechange = () => {
          console.log('ICE connection state:', pc.iceConnectionState);
          if (!mounted) return;
          if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            setConnectionState('connected');
            if (!callStartTime.current) {
              callStartTime.current = Date.now();
            }
          } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            setConnectionState('failed');
          }
        };

        pc.onconnectionstatechange = () => {
          console.log('Connection state:', pc.connectionState);
        };

        // Set up signaling channel
        const channelName = `webrtc:${conversationId}`;
        console.log('Creating signaling channel:', channelName);
        
        const channel = supabase.channel(channelName, {
          config: { broadcast: { self: false } }
        });
        channelRef.current = channel;

        // Process queued ICE candidates
        const processQueuedCandidates = async () => {
          console.log('Processing queued ICE candidates:', iceCandidatesQueue.current.length);
          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            if (candidate && pc.remoteDescription) {
              try {
                await pc.addIceCandidate(candidate);
                console.log('Added queued ICE candidate');
              } catch (e) {
                console.error('Error adding queued ICE candidate:', e);
              }
            }
          }
        };

        // Create and send offer (caller only)
        const createAndSendOffer = async () => {
          if (!pcRef.current || pcRef.current.signalingState !== 'stable') {
            console.log('Skipping offer - not in stable state:', pcRef.current?.signalingState);
            return;
          }
          
          console.log('Creating offer...');
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);
          console.log('Set local description (offer)');
          
          channel.send({
            type: 'broadcast',
            event: 'offer',
            payload: { offer, from: user.id },
          });
          console.log('Sent offer');
        };

        channel
          .on('broadcast', { event: 'ready' }, async ({ payload }) => {
            // Callee signals they're ready - caller RE-SENDS existing offer or creates new one
            console.log('Received ready signal from:', payload.from);
            if (payload.from === user.id) return;
            
            if (isCaller && pcRef.current) {
              // If we already have a local offer, just re-send it
              if (pcRef.current.localDescription && pcRef.current.signalingState === 'have-local-offer') {
                console.log('Re-sending existing offer to callee');
                channel.send({
                  type: 'broadcast',
                  event: 'offer',
                  payload: { offer: pcRef.current.localDescription, from: user.id },
                });
              } else if (pcRef.current.signalingState === 'stable') {
                // Only create new offer if in stable state
                await createAndSendOffer();
              }
            }
          })
          .on('broadcast', { event: 'offer' }, async ({ payload }) => {
            console.log('Received offer from:', payload.from);
            if (payload.from === user.id || !pcRef.current) return;
            
            // Stop retry interval if we're receiving offers
            if (offerRetryInterval) {
              clearInterval(offerRetryInterval);
              offerRetryInterval = null;
            }
            
            try {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.offer));
              console.log('Set remote description (offer)');
              
              await processQueuedCandidates();
              
              const answer = await pcRef.current.createAnswer();
              await pcRef.current.setLocalDescription(answer);
              console.log('Created and set local description (answer)');
              
              channel.send({
                type: 'broadcast',
                event: 'answer',
                payload: { answer, from: user.id },
              });
              console.log('Sent answer');
            } catch (e) {
              console.error('Error handling offer:', e);
            }
          })
          .on('broadcast', { event: 'answer' }, async ({ payload }) => {
            console.log('Received answer from:', payload.from);
            if (payload.from === user.id || !pcRef.current) return;
            
            // Stop retry interval - we got an answer
            if (offerRetryInterval) {
              clearInterval(offerRetryInterval);
              offerRetryInterval = null;
            }
            
            try {
              await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer));
              console.log('Set remote description (answer)');
              await processQueuedCandidates();
            } catch (e) {
              console.error('Error handling answer:', e);
            }
          })
          .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
            if (payload.from === user.id || !pcRef.current) return;
            
            try {
              const candidate = new RTCIceCandidate(payload.candidate);
              if (pcRef.current.remoteDescription) {
                await pcRef.current.addIceCandidate(candidate);
                console.log('Added ICE candidate');
              } else {
                console.log('Queuing ICE candidate');
                iceCandidatesQueue.current.push(candidate);
              }
            } catch (e) {
              console.error('Error adding ICE candidate:', e);
            }
          })
          .on('broadcast', { event: 'end-call' }, () => {
            console.log('Received end-call signal');
            if (mounted) onClose();
          });

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate && channelRef.current) {
            console.log('Sending ICE candidate');
            channelRef.current.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: { candidate: event.candidate, from: user.id },
            });
          }
        };

        // Subscribe and wait for channel to be ready
        await new Promise<void>((resolve) => {
          channel.subscribe((status) => {
            console.log('Signaling channel status:', status);
            if (status === 'SUBSCRIBED') {
              resolve();
            }
          });
        });

        console.log('Channel subscribed, isCaller:', isCaller);

        // Both sides need to retry their signals until connection is established
        let hasReceivedSignal = false;

        const stopRetrying = () => {
          if (signalRetryInterval) {
            clearInterval(signalRetryInterval);
            signalRetryInterval = null;
          }
          if (offerRetryInterval) {
            clearInterval(offerRetryInterval);
            offerRetryInterval = null;
          }
        };

        // Update handlers to stop retrying when we receive the expected signal
        const originalOnTrack = pc.ontrack;
        pc.ontrack = (event) => {
          hasReceivedSignal = true;
          stopRetrying();
          if (originalOnTrack) originalOnTrack.call(pc, event);
        };

        if (isCaller) {
          // Caller: send offer immediately and retry every 2 seconds
          await new Promise(resolve => setTimeout(resolve, 300));
          await createAndSendOffer();
          
          let retryCount = 0;
          offerRetryInterval = setInterval(async () => {
            retryCount++;
            if (retryCount > 20 || !mounted || hasReceivedSignal) {
              stopRetrying();
              return;
            }
            if (pcRef.current && pcRef.current.connectionState !== 'connected') {
              console.log(`Caller: Retrying offer (attempt ${retryCount})...`);
              if (pcRef.current.signalingState === 'stable') {
                await createAndSendOffer();
              } else if (pcRef.current.localDescription) {
                channel.send({
                  type: 'broadcast',
                  event: 'offer',
                  payload: { offer: pcRef.current.localDescription, from: user.id },
                });
              }
            }
          }, 1500);
        } else {
          // Callee: signal ready repeatedly until we receive an offer
          console.log('Sending initial ready signal');
          channel.send({
            type: 'broadcast',
            event: 'ready',
            payload: { from: user.id },
          });
          
          let retryCount = 0;
          signalRetryInterval = setInterval(() => {
            retryCount++;
            if (retryCount > 20 || !mounted || hasReceivedSignal) {
              stopRetrying();
              return;
            }
            // Keep sending ready until we have a remote description (received offer)
            if (pcRef.current && !pcRef.current.remoteDescription) {
              console.log(`Callee: Retrying ready signal (attempt ${retryCount})...`);
              channel.send({
                type: 'broadcast',
                event: 'ready',
                payload: { from: user.id },
              });
            } else {
              stopRetrying();
            }
          }, 1500);
        }

      } catch (error) {
        console.error('Error initializing call:', error);
        setConnectionState('failed');
      }
    };

    initializeCall();

    return () => {
      mounted = false;
      console.log('Cleaning up call');
      if (offerRetryInterval) clearInterval(offerRetryInterval);
      if (signalRetryInterval) clearInterval(signalRetryInterval);
      stream?.getTracks().forEach(track => track.stop());
      pcRef.current?.close();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [open, user, conversationId, initialVideo, isCaller, onClose]);

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
        try {
          const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const videoTrack = newStream.getVideoTracks()[0];
          localStream.addTrack(videoTrack);
          
          if (pcRef.current) {
            const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
            if (sender) {
              sender.replaceTrack(videoTrack);
            } else {
              pcRef.current.addTrack(videoTrack, localStream);
            }
          }
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStream;
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
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'end-call',
        payload: {},
      });
    }
    onClose();
  };

  const displayName = remoteProfile?.full_name || remoteProfile?.email || conversationName;
  const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().some(t => t.enabled);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className={cn(
          "p-0 gap-0 border-border/50 bg-background/95 backdrop-blur-xl overflow-hidden",
          isFullscreen ? "max-w-full w-full h-full" : "max-w-2xl w-full"
        )}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <VisuallyHidden.Root>
          <DialogTitle>Call with {displayName}</DialogTitle>
          <DialogDescription>Video and voice call interface</DialogDescription>
        </VisuallyHidden.Root>
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
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={cn(
              "w-full h-full object-cover",
              !remoteStream && "hidden"
            )}
            onLoadedMetadata={(e) => {
              const video = e.target as HTMLVideoElement;
              video.play().catch(err => console.log('Play on metadata error:', err));
            }}
          />
          {!remoteStream && (
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
                className="w-full h-full object-cover"
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