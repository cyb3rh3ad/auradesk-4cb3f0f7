import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PhoneOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface JitsiRoomProps {
  roomId: string;
  userName: string;
  isVideoCall: boolean;
  onLeave: () => void;
  isInitiator?: boolean;
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      document.body.removeChild(script);
    };
  }, []);

  const initializeJitsi = () => {
    if (!jitsiContainerRef.current || !window.JitsiMeetExternalAPI) {
      setError("Jitsi initialization failed");
      return;
    }

    try {
      // Sanitize room name for Jitsi (alphanumeric only)
      const sanitizedRoom = `auradesk-${roomId.replace(/[^a-zA-Z0-9]/g, "")}`;

      apiRef.current = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName: sanitizedRoom,
        parentNode: jitsiContainerRef.current,
        userInfo: {
          displayName: userName,
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: !isVideoCall,
          prejoinConfig: {
            enabled: false,
          },
          prejoinPageEnabled: false,
          requireDisplayName: false,
          disableDeepLinking: true,
          enableClosePage: false,
          enableWelcomePage: false,
          disableThirdPartyRequests: true,
          hideConferenceSubject: true,
          hideConferenceTimer: false,
          subject: " ",
          toolbarButtons: [
            "microphone",
            "camera",
            "desktop",
            "fullscreen",
            "hangup",
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
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          DISABLE_PRESENCE_STATUS: true,
          FILM_STRIP_MAX_HEIGHT: 120,
        },
      });

      apiRef.current.addListener("videoConferenceJoined", () => {
        setIsLoading(false);
        console.log("Joined Jitsi conference");
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

    // Notify others if initiator
    if (isInitiator) {
      const channel = supabase.channel(`call-${roomId}`);
      await channel.send({
        type: "broadcast",
        event: "call-ended",
        payload: { endedBy: userName },
      });
      supabase.removeChannel(channel);
    }

    onLeave();
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
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
        <Button
          variant="destructive"
          size="lg"
          onClick={handleLeave}
          className="rounded-full px-6"
        >
          <PhoneOff className="h-5 w-5 mr-2" />
          Leave Call
        </Button>
      </div>
    </div>
  );
};
