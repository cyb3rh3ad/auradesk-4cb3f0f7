import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useTranscription } from "@/hooks/useTranscription";
import { useWebRTC } from "@/hooks/useWebRTC";
import { supabase } from "@/integrations/supabase/client";
import { Mic, MicOff, Video, VideoOff, Phone, Monitor, Hand, MoreVertical, Sparkles, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface MeetingRoomProps {
  meetingId: string;
  meetingTitle: string;
  onClose: () => void;
  initialVideo?: boolean;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export const MeetingRoom = ({ meetingId, meetingTitle, onClose, initialVideo = true }: MeetingRoomProps) => {
  const { user } = useAuth();
  const { isRecording, transcript, startRecording, stopRecording } = useTranscription();
  const { toast } = useToast();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!initialVideo);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [meetingTime, setMeetingTime] = useState(0);
  const [hasJoined, setHasJoined] = useState(false);

  const userName = profile?.full_name || profile?.email || "Anonymous";

  const { localStream, participants, isConnecting, error, joinRoom, leaveRoom, toggleAudio, toggleVideo } = useWebRTC(
    meetingId,
    userName,
  );

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [user]);

  // Join room once profile is loaded
  useEffect(() => {
    if (profile && !hasJoined) {
      joinRoom(initialVideo, true);
      setHasJoined(true);
    }
  }, [profile, hasJoined, joinRoom, initialVideo]);

  // FIX: Attach local stream and explicitly play to prevent "frozen/brown" frames
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;

      // Ensure the video starts rendering as soon as the stream is bound
      localVideoRef.current.play().catch((err) => {
        console.warn("Local video play was interrupted/blocked by browser:", err);
      });
    }
  }, [localStream]);

  // Timer for meeting duration
  useEffect(() => {
    const interval = setInterval(() => {
      setMeetingTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    toggleAudio(!newMuted);
  };

  const handleToggleVideo = () => {
    const newVideoOff = !isVideoOff;
    setIsVideoOff(newVideoOff);
    toggleVideo(!newVideoOff);
  };

  const toggleTranscription = async () => {
    if (isTranscribing) {
      await stopRecording(meetingId);
      setIsTranscribing(false);
      toast({
        title: "Transcription stopped",
        description: "AI transcription has been saved",
      });
    } else {
      await startRecording(meetingId);
      setIsTranscribing(true);
      toast({
        title: "Transcription started",
        description: "AI is now transcribing your meeting",
      });
    }
  };

  const handleEndCall = () => {
    leaveRoom();
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
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const latestTranscript = transcript.length > 0 ? transcript[transcript.length - 1].text : "";
  const participantCount = participants.size + 1; // +1 for self
  const participantArray = Array.from(participants.values());

  const getGridClass = () => {
    if (participantCount === 1) return "grid-cols-1";
    if (participantCount === 2) return "grid-cols-1 md:grid-cols-2";
    if (participantCount <= 4) return "grid-cols-2";
    return "grid-cols-2 md:grid-cols-3";
  };

  if (isConnecting) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Connecting to meeting...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={onClose}>Go Back</Button>
      </div>
    );
  }

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
          <Badge variant="secondary" className="text-xs">
            {participantCount} participant{participantCount !== 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isTranscribing ? "default" : "outline"}
            size="sm"
            onClick={toggleTranscription}
            className={cn("gap-2", isTranscribing && "bg-gradient-to-r from-primary to-accent")}
          >
            <Sparkles className="w-4 h-4" />
            {isTranscribing ? "Transcribing..." : "AI Transcribe"}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Video Area */}
      <div className="flex-1 p-4 bg-gradient-to-br from-background to-card/50 relative overflow-hidden">
        <div className={cn("grid gap-4 h-full", getGridClass())}>
          {/* Local Video */}
          <div className="relative rounded-2xl overflow-hidden bg-card shadow-xl min-h-[200px]">
            {isVideoOff ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-card to-muted">
                <div className="text-center space-y-3">
                  <Avatar className="w-20 h-20 mx-auto ring-4 ring-border/50">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xl font-semibold">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium">{profile?.full_name || "You"}</p>
                </div>
              </div>
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                muted // Mandatary for browsers to allow playback
                playsInline // Mandatary for iOS
                className="w-full h-full object-cover mirror" // mirror added for standard self-view feel
                style={{ transform: "scaleX(-1)" }} // Manually mirror local video
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
            <RemoteVideo key={participant.odakle} stream={participant.stream} name={participant.name} />
          ))}
        </div>

        {isTranscribing && latestTranscript && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-2xl w-full px-4">
            <div className="bg-background/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-border/50">
              <p className="text-sm text-center leading-relaxed">{latestTranscript}</p>
            </div>
          </div>
        )}

        {participantCount === 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <Badge variant="secondary" className="gap-2 py-2 px-4">
              <Loader2 className="w-3 h-3 animate-spin" />
              Waiting for others to join...
            </Badge>
          </div>
        )}
      </div>

      {/* Controls Area */}
      <div className="h-20 px-4 flex items-center justify-center gap-3 bg-card/50 border-t border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant={isMuted ? "destructive" : "secondary"}
            size="lg"
            className="w-14 h-14 rounded-full"
            onClick={handleToggleMute}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>
          <Button
            variant={isVideoOff ? "destructive" : "secondary"}
            size="lg"
            className="w-14 h-14 rounded-full"
            onClick={handleToggleVideo}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>
          <Button variant="secondary" size="lg" className="w-14 h-14 rounded-full">
            <Monitor className="w-5 h-5" />
          </Button>
          <Button variant="secondary" size="lg" className="w-14 h-14 rounded-full">
            <Hand className="w-5 h-5" />
          </Button>
        </div>

        <div className="w-px h-10 bg-border mx-2" />

        <Button variant="destructive" size="lg" className="px-8 h-14 rounded-full gap-2" onClick={handleEndCall}>
          <Phone className="w-5 h-5 rotate-[135deg]" />
          End
        </Button>
      </div>
    </div>
  );
};

// Remote Video sub-component
const RemoteVideo = ({ stream, name }: { stream: MediaStream | null; name: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden bg-card shadow-xl min-h-[200px]">
      {stream ? (
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
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
      <div className="absolute bottom-3 left-3">
        <Badge className="bg-background/80 backdrop-blur-sm text-foreground text-xs">{name}</Badge>
      </div>
    </div>
  );
};
