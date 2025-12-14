import { useEffect, useRef, useState, useCallback } from "react";
import { Track, ConnectionQuality } from "livekit-client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff, 
  Sparkles, MoreVertical, UserX, Volume2, VolumeX, Loader2, Wifi, WifiOff, Signal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveKit } from "@/hooks/useLiveKit";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface LiveKitRoomProps {
  roomName: string;
  participantName: string;
  onDisconnect: () => void;
  className?: string;
  initialVideo?: boolean;
  initialAudio?: boolean;
  isHost?: boolean;
}

export function LiveKitRoom({ 
  roomName, 
  participantName, 
  onDisconnect, 
  className,
  initialVideo = true,
  initialAudio = true,
  isHost = false,
}: LiveKitRoomProps) {
  const { toast } = useToast();
  const {
    room,
    isConnecting,
    isConnected,
    isReconnecting,
    error,
    mediaError,
    localParticipant,
    remoteParticipants,
    connect,
    disconnect,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    isScreenSharing,
    isMuted,
    isCameraOff,
    screenShareParticipant,
    connectionQuality,
    reconnect,
  } = useLiveKit();

  // Show toast when media error occurs
  useEffect(() => {
    if (mediaError) {
      toast({
        title: "Media Access Error",
        description: mediaError,
        variant: "destructive",
      });
    }
  }, [mediaError, toast]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const attachedTracksRef = useRef<Set<string>>(new Set()); // Track which videos are already attached
  const [transcript, setTranscript] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const [kickDialogOpen, setKickDialogOpen] = useState(false);
  const [participantToKick, setParticipantToKick] = useState<string | null>(null);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);

  // Set up real-time channel for call events
  useEffect(() => {
    if (!roomName) return;

    const channel = supabase.channel(`call-control-${roomName}`);
    
    channel
      .on('broadcast', { event: 'call-ended' }, () => {
        toast({
          title: "Call Ended",
          description: "The host has ended the call",
        });
        handleDisconnect();
      })
      .on('broadcast', { event: 'participant-kicked' }, (payload: any) => {
        if (payload.payload?.participantId === localParticipant?.identity) {
          toast({
            title: "Removed from Call",
            description: "You have been removed from this call by the host",
            variant: "destructive",
          });
          handleDisconnect();
        }
      })
      .on('broadcast', { event: 'participant-muted' }, (payload: any) => {
        if (payload.payload?.participantId === localParticipant?.identity) {
          toggleMute();
          toast({
            title: "Muted by Host",
            description: "The host has muted your microphone",
          });
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomName, localParticipant?.identity]);

  // Connect on mount
  useEffect(() => {
    connect(roomName, participantName, initialVideo, initialAudio);

    return () => {
      disconnect();
    };
  }, [roomName, participantName, connect, disconnect, initialVideo, initialAudio]);

  // Track if we've ever successfully connected to improve UX on disconnects
  useEffect(() => {
    if (isConnected) {
      setHasConnectedOnce(true);
    }
  }, [isConnected]);

  // Attach local video track
  useEffect(() => {
    if (localVideoRef.current && localParticipant?.videoTrack) {
      const track = localParticipant.videoTrack;
      if ('attach' in track) {
        track.attach(localVideoRef.current);
        return () => {
          track.detach(localVideoRef.current!);
        };
      }
    }
  }, [localParticipant?.videoTrack]);

  // Attach screen share track
  useEffect(() => {
    if (screenShareRef.current && screenShareParticipant?.screenShareTrack) {
      const track = screenShareParticipant.screenShareTrack;
      if ('attach' in track) {
        track.attach(screenShareRef.current);
        return () => {
          track.detach(screenShareRef.current!);
        };
      }
    }
  }, [screenShareParticipant?.screenShareTrack]);

  // Attach remote video tracks - only attach if not already attached to prevent flickering
  useEffect(() => {
    remoteParticipants.forEach((participant) => {
      const videoEl = remoteVideoRefs.current.get(participant.identity);
      const trackId = participant.videoTrack ? `${participant.identity}-video` : null;
      
      if (videoEl && participant.videoTrack && 'attach' in participant.videoTrack) {
        // Only attach if not already attached
        if (trackId && !attachedTracksRef.current.has(trackId)) {
          participant.videoTrack.attach(videoEl);
          attachedTracksRef.current.add(trackId);
          console.log(`Attached video for ${participant.identity}`);
        }
      } else if (trackId && attachedTracksRef.current.has(trackId)) {
        // Track was removed, clean up
        attachedTracksRef.current.delete(trackId);
      }
    });

    // Clean up tracks for participants that left
    const currentIdentities = new Set(remoteParticipants.map(p => p.identity));
    attachedTracksRef.current.forEach((trackId) => {
      const identity = trackId.replace('-video', '');
      if (!currentIdentities.has(identity)) {
        const videoEl = remoteVideoRefs.current.get(identity);
        const participant = remoteParticipants.find(p => p.identity === identity);
        if (videoEl && participant?.videoTrack && 'detach' in participant.videoTrack) {
          participant.videoTrack.detach(videoEl);
        }
        attachedTracksRef.current.delete(trackId);
      }
    });
  }, [remoteParticipants]);

  const setRemoteVideoRef = useCallback((id: string, el: HTMLVideoElement | null) => {
    if (el) {
      remoteVideoRefs.current.set(id, el);
      // If we have a participant with this id and a track, attach it
      const participant = remoteParticipants.find(p => p.identity === id);
      if (participant?.videoTrack && 'attach' in participant.videoTrack) {
        const trackId = `${id}-video`;
        if (!attachedTracksRef.current.has(trackId)) {
          participant.videoTrack.attach(el);
          attachedTracksRef.current.add(trackId);
          console.log(`Attached video on ref set for ${id}`);
        }
      }
    } else {
      // Element removed, clean up
      const trackId = `${id}-video`;
      attachedTracksRef.current.delete(trackId);
      remoteVideoRefs.current.delete(id);
    }
  }, [remoteParticipants]);

  const handleDisconnect = useCallback(() => {
    // Stop recording if active
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    disconnect();
    onDisconnect();
  }, [disconnect, onDisconnect]);

  const handleReconnect = useCallback(() => {
    console.log("User requested reconnect to room:", roomName);
    reconnect();
  }, [reconnect]);

  const handleEndCallForAll = useCallback(async () => {
    if (channelRef.current && isHost) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'call-ended',
        payload: {},
      });
    }
    handleDisconnect();
  }, [isHost, handleDisconnect]);

  const handleKickParticipant = async (participantId: string) => {
    if (channelRef.current && isHost) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'participant-kicked',
        payload: { participantId },
      });
      toast({
        title: "Participant Removed",
        description: "The participant has been removed from the call",
      });
    }
    setKickDialogOpen(false);
    setParticipantToKick(null);
  };

  const handleMuteParticipant = async (participantId: string) => {
    if (channelRef.current && isHost) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'participant-muted',
        payload: { participantId },
      });
      toast({
        title: "Participant Muted",
        description: "The participant has been muted",
      });
    }
  };

  // AI Transcription
  const toggleAITranscription = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in this browser",
        variant: "destructive",
      });
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
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        if (isRecording) {
          recognition.start();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      toast({
        title: "AI Recording Started",
        description: "The meeting is now being transcribed",
      });
    }
  }, [isRecording, toast]);

  const handleSummarize = async () => {
    if (!transcript.trim()) {
      toast({
        title: "No Transcript",
        description: "Start AI transcription first to generate a summary",
        variant: "destructive",
      });
      return;
    }

    setIsSummarizing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ text: transcript }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to summarize");
      }

      const data = await response.json();
      toast({
        title: "Summary Generated",
        description: data.summary.slice(0, 100) + "...",
      });
    } catch (err) {
      console.error("Summarization error:", err);
      toast({
        title: "Error",
        description: "Failed to generate summary",
        variant: "destructive",
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  if (!isConnected) {
    // Initial connect or reconnect states
    if (isConnecting || !hasConnectedOnce) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-background text-foreground p-4 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Connecting to call...</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full bg-background text-foreground p-4 gap-4">
        <p className="text-lg font-medium">
          {error ? `Connection lost: ${error}` : "Connection lost. You can try reconnecting."}
        </p>
        <div className="flex gap-2">
          <Button onClick={handleReconnect} variant="default">
            Reconnect
          </Button>
          <Button onClick={handleDisconnect} variant="outline">
            Leave call
          </Button>
        </div>
      </div>
    );
  }

  const allParticipants = [localParticipant, ...remoteParticipants].filter(Boolean);
  const numParticipants = allParticipants.length;
  
  let gridCols = "grid-cols-1";
  if (numParticipants === 2) {
    gridCols = "md:grid-cols-2 grid-cols-1";
  } else if (numParticipants <= 4) {
    gridCols = "md:grid-cols-2 grid-cols-1";
  } else {
    gridCols = "md:grid-cols-3 grid-cols-2";
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Connection quality indicator */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2 bg-background/70 rounded-full px-3 py-1.5">
        {connectionQuality === ConnectionQuality.Excellent && (
          <>
            <Signal className="h-4 w-4 text-green-500" />
            <span className="text-xs text-green-500">Excellent</span>
          </>
        )}
        {connectionQuality === ConnectionQuality.Good && (
          <>
            <Signal className="h-4 w-4 text-yellow-500" />
            <span className="text-xs text-yellow-500">Good</span>
          </>
        )}
        {connectionQuality === ConnectionQuality.Poor && (
          <>
            <WifiOff className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-orange-500">Poor</span>
          </>
        )}
        {connectionQuality === ConnectionQuality.Lost && (
          <>
            <WifiOff className="h-4 w-4 text-red-500" />
            <span className="text-xs text-red-500">Lost</span>
          </>
        )}
        {(!connectionQuality || connectionQuality === ConnectionQuality.Unknown) && (
          <>
            <Wifi className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Connecting...</span>
          </>
        )}
      </div>

      {/* Reconnecting overlay */}
      {isReconnecting && (
        <div className="absolute inset-0 z-50 bg-background/80 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Reconnecting...</p>
          </div>
        </div>
      )}

      {/* Screen share display */}
      {screenShareParticipant && (
        <div className="flex-1 p-2 bg-muted relative min-h-0">
          <video
            ref={screenShareRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          <div className="absolute top-2 left-2 px-2 py-1 bg-background/70 rounded text-foreground text-sm">
            {screenShareParticipant.name} is sharing screen
          </div>
        </div>
      )}

      {/* Participants grid */}
      <div
        className={cn(
          "p-4 grid gap-4",
          gridCols,
          screenShareParticipant ? "h-32 flex-shrink-0" : "flex-1"
        )}
      >
        {allParticipants.map((participant) => {
          if (!participant) return null;
          
          const isLocal = participant.identity === localParticipant?.identity;
          const hasVideo = participant.videoTrack && !participant.isCameraOff;
          const displayName = isLocal ? "You" : participant.name || participant.identity;

          return (
            <div
              key={participant.identity}
              className={cn(
                "relative rounded-xl overflow-hidden bg-muted aspect-video group transition-all duration-200",
                participant.isSpeaking 
                  ? "border-[3px] border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]" 
                  : "border-2 border-border",
                isLocal && "order-first"
              )}
            >
              {/* Video display */}
              {isLocal && hasVideo && (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}

              {!isLocal && hasVideo && (
                <video
                  ref={(el) => setRemoteVideoRef(participant.identity, el)}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}

              {/* Avatar when camera off */}
              {!hasVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <Avatar className="h-16 w-16 md:h-20 md:w-20">
                    <AvatarFallback className="text-xl md:text-2xl">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}

              {/* Name label */}
              <div className="absolute top-2 left-2 px-2 py-1 bg-background/70 rounded text-foreground text-sm flex items-center gap-2">
                {displayName}
                {isHost && isLocal && (
                  <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">Host</span>
                )}
              </div>

              {/* Status icons */}
              <div className="absolute top-2 right-2 flex gap-1">
                {participant.isMuted && (
                  <MicOff className="h-6 w-6 text-red-500 bg-background/70 p-1 rounded-full" />
                )}
                {participant.isCameraOff && (
                  <VideoOff className="h-6 w-6 text-red-500 bg-background/70 p-1 rounded-full" />
                )}
              </div>

              {/* Host controls for remote participants */}
              {isHost && !isLocal && (
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleMuteParticipant(participant.identity)}>
                        {participant.isMuted ? (
                          <><Volume2 className="h-4 w-4 mr-2" /> Unmute</>
                        ) : (
                          <><VolumeX className="h-4 w-4 mr-2" /> Mute</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => {
                          setParticipantToKick(participant.identity);
                          setKickDialogOpen(true);
                        }}
                      >
                        <UserX className="h-4 w-4 mr-2" /> Remove from call
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Transcript display */}
      {isRecording && transcript && (
        <div className="mx-4 mb-2 p-3 bg-muted/50 rounded-lg max-h-24 overflow-y-auto">
          <p className="text-sm text-muted-foreground">{transcript.slice(-200)}</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-center gap-2 p-4 bg-muted border-t border-border flex-wrap">
        <Button 
          onClick={toggleMute} 
          variant={isMuted ? "destructive" : "secondary"}
          size="icon"
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        <Button 
          onClick={toggleCamera} 
          variant={isCameraOff ? "destructive" : "secondary"}
          size="icon"
        >
          {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </Button>

        <Button 
          onClick={toggleScreenShare} 
          variant={isScreenSharing ? "default" : "secondary"}
          size="icon"
        >
          {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
        </Button>

        <Button 
          onClick={toggleAITranscription} 
          variant={isRecording ? "default" : "secondary"}
          size="icon"
          title="AI Transcription"
        >
          <Sparkles className={cn("h-5 w-5", isRecording && "text-yellow-400")} />
        </Button>

        {isRecording && (
          <Button 
            onClick={handleSummarize} 
            variant="outline"
            size="sm"
            disabled={isSummarizing}
            className="gap-2"
          >
            {isSummarizing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Summarize"
            )}
          </Button>
        )}

        {isHost ? (
          <Button onClick={handleEndCallForAll} variant="destructive" size="icon" title="End call for all">
            <PhoneOff className="h-5 w-5" />
          </Button>
        ) : (
          <Button onClick={handleDisconnect} variant="destructive" size="icon">
            <PhoneOff className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Kick confirmation dialog */}
      <AlertDialog open={kickDialogOpen} onOpenChange={setKickDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Participant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this participant from the call? They will not be able to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => participantToKick && handleKickParticipant(participantToKick)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}