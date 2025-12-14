import { useState, useEffect } from "react";
import { WebRTCRoom } from "@/components/webrtc/WebRTCRoom";
import { LiveKitRoom } from "@/components/livekit/LiveKitRoom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const MAX_WEBRTC_PARTICIPANTS = 5;

export interface HybridCallRoomProps {
  roomName: string;
  participantName: string;
  onDisconnect: () => void;
  className?: string;
  initialVideo?: boolean;
  initialAudio?: boolean;
  isHost?: boolean;
  /**
   * Force a specific mode. If not set, automatically chooses based on participant count.
   * 'webrtc' = peer-to-peer for small groups
   * 'livekit' = SFU for larger groups
   */
  forceMode?: 'webrtc' | 'livekit';
}

export function HybridCallRoom({
  roomName,
  participantName,
  onDisconnect,
  className,
  initialVideo = true,
  initialAudio = true,
  isHost = false,
  forceMode,
}: HybridCallRoomProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<'webrtc' | 'livekit' | 'checking'>(forceMode || 'checking');
  const [participantCount, setParticipantCount] = useState<number>(1);

  // Check current participant count in the room via presence
  useEffect(() => {
    if (forceMode) {
      setMode(forceMode);
      return;
    }

    // Use WebRTC by default for new calls, switch to LiveKit if too many join
    const channel = supabase.channel(`room-presence-${roomName}`, {
      config: {
        presence: { key: participantName },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        console.log(`HybridCallRoom: ${count} participants in room`);
        setParticipantCount(count);

        // If we're in WebRTC mode and too many people join, we can't switch mid-call
        // But we'll prevent new WebRTC rooms from starting if already too many
        if (mode === 'checking') {
          if (count > MAX_WEBRTC_PARTICIPANTS) {
            console.log("HybridCallRoom: Too many participants, using LiveKit");
            setMode('livekit');
          } else {
            console.log("HybridCallRoom: Small group, using WebRTC");
            setMode('webrtc');
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ name: participantName, joined_at: Date.now() });
        }
      });

    // Give it a moment to sync, then default to webrtc if no response
    const timeout = setTimeout(() => {
      if (mode === 'checking') {
        console.log("HybridCallRoom: No presence data, defaulting to WebRTC");
        setMode('webrtc');
      }
    }, 2000);

    return () => {
      clearTimeout(timeout);
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [roomName, participantName, forceMode, mode]);

  // Warn if participant count exceeds limit while in WebRTC mode
  useEffect(() => {
    if (mode === 'webrtc' && participantCount > MAX_WEBRTC_PARTICIPANTS) {
      toast({
        title: "Large Group Detected",
        description: `WebRTC works best with up to ${MAX_WEBRTC_PARTICIPANTS} participants. For larger groups, consider using video meetings.`,
        variant: "default",
      });
    }
  }, [mode, participantCount, toast]);

  if (mode === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background text-foreground p-4 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Setting up call...</p>
      </div>
    );
  }

  if (mode === 'webrtc') {
    return (
      <WebRTCRoom
        roomName={roomName}
        participantName={participantName}
        onDisconnect={onDisconnect}
        className={className}
        initialVideo={initialVideo}
        initialAudio={initialAudio}
        isHost={isHost}
      />
    );
  }

  return (
    <LiveKitRoom
      roomName={roomName}
      participantName={participantName}
      onDisconnect={onDisconnect}
      className={className}
      initialVideo={initialVideo}
      initialAudio={initialAudio}
      isHost={isHost}
    />
  );
}
