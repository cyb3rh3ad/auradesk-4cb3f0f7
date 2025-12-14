import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PhoneOff, UserX, MicOff, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface JitsiRoomProps {
  roomId: string;
  userName: string;
  isVideoCall: boolean;
  onLeave: () => void;
  isInitiator?: boolean;
}

interface Participant {
  id: string;
  displayName: string;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export const JitsiRoom = ({
  roomId,
  userName,
  isVideoCall,
  onLeave,
  isInitiator = false,
}: JitsiRoomProps) => {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showModeratorPanel, setShowModeratorPanel] = useState(false);
  const { user } = useAuth();

  // Handle moderator commands from host
  const handleModeratorCommand = useCallback((payload: any) => {
    if (!apiRef.current) return;

    const { command, targetUserId, issuedBy } = payload;

    // Don't process our own commands
    if (issuedBy === user?.id) return;

    // Check if command targets us
    if (targetUserId === user?.id) {
      if (command === "kick") {
        toast.error("You have been removed from the call by the host");
        handleLeave();
      } else if (command === "mute") {
        apiRef.current.executeCommand("toggleAudio");
        toast.info("You have been muted by the host");
      }
    }

    // Handle call end for everyone
    if (command === "end-call") {
      toast.info("The host has ended the call");
      handleLeave();
    }
  }, [user?.id]);

  // Set up moderator channel
  useEffect(() => {
    const channel = supabase.channel(`call-moderator-${roomId}`);
    
    channel
      .on("broadcast", { event: "moderator-command" }, ({ payload }) => {
        handleModeratorCommand(payload);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, handleModeratorCommand]);

  useEffect(() => {
    // Load Jitsi external API script
    const script = document.createElement("script");
    script.src = "https://meet.jit.si/external_api.js";
    script.async = true;
    script.onload = initializeJitsi;
    script.onerror = () => setError("Failed to load Jitsi");
    document.body.appendChild(script);

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
      }
      if (script.parentNode) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const initializeJitsi = () => {
    if (!jitsiContainerRef.current || !window.JitsiMeetExternalAPI) {
      setError("Jitsi initialization failed");
      return;
    }

    try {
      const sanitizedRoom = `auradesk-${roomId.replace(/[^a-zA-Z0-9]/g, "")}`;

      apiRef.current = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName: sanitizedRoom,
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName: userName,
          moderator: isInitiator, // Request moderator status
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: !isVideoCall,
          prejoinConfig: { enabled: false },
          prejoinPageEnabled: false,
          requireDisplayName: false,
          disableDeepLinking: true,
          enableClosePage: false,
          enableWelcomePage: false,
          disableThirdPartyRequests: true,
          hideConferenceSubject: true,
          subject: " ",
          toolbarButtons: [
            "microphone",
            "camera",
            "desktop",
            "fullscreen",
            "chat",
            "raisehand",
            "tileview",
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          MOBILE_APP_PROMO: false,
          HIDE_INVITE_MORE_HEADER: true,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          FILM_STRIP_MAX_HEIGHT: 120,
        },
      });

      // Track participants
      apiRef.current.addListener("participantJoined", (participant: any) => {
        console.log("Participant joined:", participant);
        setParticipants(prev => [...prev, { 
          id: participant.id, 
          displayName: participant.displayName || "Guest" 
        }]);
      });

      apiRef.current.addListener("participantLeft", (participant: any) => {
        console.log("Participant left:", participant);
        setParticipants(prev => prev.filter(p => p.id !== participant.id));
      });

      apiRef.current.addListener("videoConferenceJoined", () => {
        console.log("Joined Jitsi conference as", isInitiator ? "host" : "participant");
        if (isInitiator) {
          toast.success("You are the host of this call");
        }
      });

      apiRef.current.addListener("videoConferenceLeft", () => {
        handleLeave();
      });

      apiRef.current.addListener("readyToClose", () => {
        handleLeave();
      });

    } catch (err) {
      console.error("Jitsi error:", err);
      setError("Failed to start call");
    }
  };

  const handleLeave = async () => {
    if (apiRef.current) {
      apiRef.current.dispose();
      apiRef.current = null;
    }
    onLeave();
  };

  const sendModeratorCommand = async (command: string, targetUserId?: string) => {
    if (!channelRef.current || !isInitiator) return;

    await channelRef.current.send({
      type: "broadcast",
      event: "moderator-command",
      payload: {
        command,
        targetUserId,
        issuedBy: user?.id,
      },
    });
  };

  const kickParticipant = async (participantId: string, participantName: string) => {
    // First try Jitsi's native kick
    if (apiRef.current) {
      try {
        apiRef.current.executeCommand("kickParticipant", participantId);
      } catch (e) {
        console.log("Jitsi kick failed, using broadcast");
      }
    }
    
    // Also send via our channel as backup
    await sendModeratorCommand("kick", participantId);
    toast.success(`Removed ${participantName} from the call`);
  };

  const muteParticipant = async (participantId: string, participantName: string) => {
    if (apiRef.current) {
      try {
        apiRef.current.executeCommand("muteEveryone");
      } catch (e) {
        console.log("Jitsi mute failed, using broadcast");
      }
    }
    
    await sendModeratorCommand("mute", participantId);
    toast.success(`Muted ${participantName}`);
  };

  const endCallForAll = async () => {
    await sendModeratorCommand("end-call");
    toast.info("Ending call for everyone...");
    setTimeout(handleLeave, 500);
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={onLeave}>Close</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div ref={jitsiContainerRef} className="flex-1 w-full" />
      
      {/* Control bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        {isInitiator && (
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setShowModeratorPanel(!showModeratorPanel)}
            className="rounded-full"
          >
            <Shield className="h-5 w-5 mr-2" />
            Host Controls
          </Button>
        )}
        
        <Button
          variant="destructive"
          size="lg"
          onClick={isInitiator ? endCallForAll : handleLeave}
          className="rounded-full px-6"
        >
          <PhoneOff className="h-5 w-5 mr-2" />
          {isInitiator ? "End Call" : "Leave Call"}
        </Button>
      </div>

      {/* Moderator panel */}
      {isInitiator && showModeratorPanel && (
        <div className="absolute top-4 right-4 z-30 bg-card border border-border rounded-lg p-4 shadow-lg min-w-[250px]">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Host Controls
          </h3>
          
          {participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No other participants</p>
          ) : (
            <div className="space-y-2">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 p-2 bg-muted rounded">
                  <span className="text-sm truncate">{p.displayName}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => muteParticipant(p.id, p.displayName)}
                      title="Mute"
                    >
                      <MicOff className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => kickParticipant(p.id, p.displayName)}
                      title="Remove"
                    >
                      <UserX className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
