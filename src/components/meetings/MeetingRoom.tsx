import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useTranscription } from '@/hooks/useTranscription';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mic, MicOff, Video, VideoOff, Phone, Settings, 
  MessageSquare, Users, Monitor, Hand, MoreVertical,
  Sparkles, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface MeetingRoomProps {
  meetingId: string;
  meetingTitle: string;
  onClose: () => void;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export const MeetingRoom = ({ meetingId, meetingTitle, onClose }: MeetingRoomProps) => {
  const { user } = useAuth();
  const { isRecording, transcript, startRecording, stopRecording } = useTranscription();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [meetingTime, setMeetingTime] = useState(0);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [user]);

  // Timer for meeting duration
  useEffect(() => {
    const interval = setInterval(() => {
      setMeetingTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Start video stream
  useEffect(() => {
    const startVideo = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (error) {
        console.error('Error accessing media devices:', error);
        toast({
          title: 'Camera access denied',
          description: 'Please allow camera and microphone access to join the meeting',
          variant: 'destructive'
        });
      }
    };
    startVideo();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleTranscription = async () => {
    if (isTranscribing) {
      await stopRecording(meetingId);
      setIsTranscribing(false);
      toast({
        title: 'Transcription stopped',
        description: 'AI transcription has been saved'
      });
    } else {
      await startRecording(meetingId);
      setIsTranscribing(true);
      toast({
        title: 'Transcription started',
        description: 'AI is now transcribing your meeting'
      });
    }
  };

  const handleEndCall = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    if (isTranscribing) {
      stopRecording(meetingId);
    }
    onClose();
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get the latest transcript text
  const latestTranscript = transcript.length > 0 ? transcript[transcript.length - 1].text : '';

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border/40 bg-card/50 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold truncate">{meetingTitle}</h2>
          <Badge variant="outline" className="text-xs gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {formatTime(meetingTime)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={isTranscribing ? "default" : "outline"} 
            size="sm" 
            onClick={toggleTranscription}
            className={cn(
              "gap-2",
              isTranscribing && "bg-gradient-to-r from-primary to-accent"
            )}
          >
            <Sparkles className="w-4 h-4" />
            {isTranscribing ? 'Transcribing...' : 'AI Transcribe'}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 p-4 md:p-6 flex items-center justify-center bg-gradient-to-br from-background to-card/50 relative overflow-hidden">
        {/* Main Video */}
        <div className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden bg-card shadow-2xl">
          {isVideoOff ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-card to-muted">
              <div className="text-center space-y-4">
                <Avatar className="w-24 h-24 mx-auto ring-4 ring-border/50">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-2xl font-semibold">
                    {getInitials(profile?.full_name || profile?.email || 'U')}
                  </AvatarFallback>
                </Avatar>
                <p className="text-lg font-medium">{profile?.full_name || 'You'}</p>
                <p className="text-sm text-muted-foreground">Camera is off</p>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          )}
          
          {/* Self view label */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <Badge className="bg-background/80 backdrop-blur-sm text-foreground">
              {profile?.full_name || 'You'}
              {isMuted && <MicOff className="w-3 h-3 ml-1 text-destructive" />}
            </Badge>
          </div>

          {/* Transcription indicator */}
          {isTranscribing && (
            <div className="absolute top-4 right-4">
              <Badge className="bg-primary/90 backdrop-blur-sm gap-1.5 animate-pulse">
                <Sparkles className="w-3 h-3" />
                AI Transcribing
              </Badge>
            </div>
          )}
        </div>

        {/* Live Transcript Panel */}
        {isTranscribing && latestTranscript && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 max-w-2xl w-full px-4">
            <div className="bg-background/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-border/50">
              <p className="text-sm text-center leading-relaxed">{latestTranscript}</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="h-20 px-4 flex items-center justify-center gap-3 bg-card/50 border-t border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="lg"
            className="w-14 h-14 rounded-full"
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Button
            variant={isVideoOff ? "destructive" : "secondary"}
            size="lg"
            className="w-14 h-14 rounded-full"
            onClick={toggleVideo}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-14 h-14 rounded-full"
          >
            <Monitor className="w-5 h-5" />
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-14 h-14 rounded-full"
          >
            <Hand className="w-5 h-5" />
          </Button>
        </div>

        <div className="w-px h-10 bg-border mx-2" />

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="lg"
            className="w-14 h-14 rounded-full"
          >
            <MessageSquare className="w-5 h-5" />
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-14 h-14 rounded-full"
          >
            <Users className="w-5 h-5" />
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-14 h-14 rounded-full"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>

        <div className="w-px h-10 bg-border mx-2" />

        <Button
          variant="destructive"
          size="lg"
          className="px-8 h-14 rounded-full gap-2"
          onClick={handleEndCall}
        >
          <Phone className="w-5 h-5 rotate-[135deg]" />
          End
        </Button>
      </div>
    </div>
  );
};
