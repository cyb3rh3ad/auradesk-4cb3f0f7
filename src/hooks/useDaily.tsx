import { useState, useCallback, useRef, useEffect } from "react";
import DailyIframe, {
  DailyCall,
  DailyParticipant,
  DailyEventObjectParticipant,
  DailyEventObjectParticipantLeft,
  DailyEventObjectActiveSpeakerChange,
  DailyEventObjectTrack,
} from "@daily-co/daily-js";
import { supabase } from "@/integrations/supabase/client";

interface ParticipantState {
  odakle: string;
  odakle_session_id: string;
  name: string;
  isLocal: boolean;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
}

interface UseDailyReturn {
  callObject: DailyCall | null;
  participants: Map<string, ParticipantState>;
  localParticipant: ParticipantState | null;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  join: (roomName: string, userName: string, initialVideo: boolean, initialAudio: boolean) => Promise<void>;
  leave: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
}

export function useDaily(): UseDailyReturn {
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [participants, setParticipants] = useState<Map<string, ParticipantState>>(new Map());
  const [localParticipant, setLocalParticipant] = useState<ParticipantState | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const callObjectRef = useRef<DailyCall | null>(null);

  const updateParticipantFromDaily = useCallback((p: DailyParticipant): ParticipantState => {
    return {
      odakle: p.user_id || p.session_id,
      odakle_session_id: p.session_id,
      name: p.user_name || "Guest",
      isLocal: p.local,
      videoTrack: p.tracks?.video?.persistentTrack || null,
      audioTrack: p.tracks?.audio?.persistentTrack || null,
      isMuted: p.tracks?.audio?.state !== "playable",
      isCameraOff: p.tracks?.video?.state !== "playable",
      isSpeaking: false,
      isScreenSharing: p.tracks?.screenVideo?.state === "playable",
    };
  }, []);

  const updateAllParticipants = useCallback(() => {
    if (!callObjectRef.current) return;

    const dailyParticipants = callObjectRef.current.participants();
    const newParticipants = new Map<string, ParticipantState>();

    Object.values(dailyParticipants).forEach((p) => {
      const state = updateParticipantFromDaily(p);
      if (p.local) {
        setLocalParticipant(state);
        setIsMuted(state.isMuted);
        setIsCameraOff(state.isCameraOff);
        setIsScreenSharing(state.isScreenSharing);
      } else {
        newParticipants.set(p.session_id, state);
      }
    });

    setParticipants(newParticipants);
  }, [updateParticipantFromDaily]);

  const join = useCallback(
    async (roomName: string, userName: string, initialVideo: boolean, initialAudio: boolean) => {
      setIsConnecting(true);
      setError(null);

      try {
        console.log("[Daily] Requesting room token for:", roomName);

        // Get room URL and token from our edge function
        const { data, error: fnError } = await supabase.functions.invoke("daily-room", {
          body: { roomName, userName },
        });

        if (fnError || !data?.roomUrl || !data?.token) {
          console.error("[Daily] Failed to get room:", fnError);
          throw new Error(fnError?.message || "Failed to create Daily room");
        }

        console.log("[Daily] Got room URL:", data.roomUrl);

        // Create Daily call object
        const call = DailyIframe.createCallObject({
          audioSource: initialAudio,
          videoSource: initialVideo,
        });

        callObjectRef.current = call;
        setCallObject(call);

        // Set up event handlers
        call.on("joined-meeting", () => {
          console.log("[Daily] Joined meeting");
          setIsConnected(true);
          setIsConnecting(false);
          updateAllParticipants();
        });

        call.on("left-meeting", () => {
          console.log("[Daily] Left meeting");
          setIsConnected(false);
          setParticipants(new Map());
          setLocalParticipant(null);
        });

        call.on("participant-joined", (event: DailyEventObjectParticipant | undefined) => {
          console.log("[Daily] Participant joined:", event?.participant?.user_name);
          updateAllParticipants();
        });

        call.on("participant-left", (event: DailyEventObjectParticipantLeft | undefined) => {
          console.log("[Daily] Participant left:", event?.participant?.user_name);
          updateAllParticipants();
        });

        call.on("participant-updated", () => {
          updateAllParticipants();
        });

        call.on("track-started", (event: DailyEventObjectTrack | undefined) => {
          console.log("[Daily] Track started:", event?.track?.kind);
          updateAllParticipants();
        });

        call.on("track-stopped", (event: DailyEventObjectTrack | undefined) => {
          console.log("[Daily] Track stopped:", event?.track?.kind);
          updateAllParticipants();
        });

        call.on("active-speaker-change", (event: DailyEventObjectActiveSpeakerChange | undefined) => {
          if (event?.activeSpeaker?.peerId) {
            setParticipants((prev) => {
              const newMap = new Map(prev);
              newMap.forEach((p, key) => {
                newMap.set(key, { ...p, isSpeaking: key === event.activeSpeaker?.peerId });
              });
              return newMap;
            });
          }
        });

        call.on("error", (event) => {
          console.error("[Daily] Error:", event);
          setError(event?.errorMsg || "An error occurred");
        });

        call.on("camera-error", (event) => {
          console.error("[Daily] Camera error:", event);
          setError("Camera access error: " + (event?.errorMsg?.errorMsg || "Unknown error"));
        });

        // Join the room
        console.log("[Daily] Joining room...");
        await call.join({
          url: data.roomUrl,
          token: data.token,
          userName: userName,
          startVideoOff: !initialVideo,
          startAudioOff: !initialAudio,
        });

        setIsMuted(!initialAudio);
        setIsCameraOff(!initialVideo);
      } catch (err) {
        console.error("[Daily] Join error:", err);
        setError(err instanceof Error ? err.message : "Failed to join call");
        setIsConnecting(false);
      }
    },
    [updateAllParticipants]
  );

  const leave = useCallback(() => {
    console.log("[Daily] Leaving call...");
    if (callObjectRef.current) {
      callObjectRef.current.leave();
      callObjectRef.current.destroy();
      callObjectRef.current = null;
      setCallObject(null);
    }
    setIsConnected(false);
    setParticipants(new Map());
    setLocalParticipant(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
  }, []);

  const toggleAudio = useCallback(() => {
    if (!callObjectRef.current) return;
    const newMuted = !isMuted;
    callObjectRef.current.setLocalAudio(!newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    if (!callObjectRef.current) return;
    const newCameraOff = !isCameraOff;
    callObjectRef.current.setLocalVideo(!newCameraOff);
    setIsCameraOff(newCameraOff);
  }, [isCameraOff]);

  const toggleScreenShare = useCallback(async () => {
    if (!callObjectRef.current) return;
    try {
      if (isScreenSharing) {
        await callObjectRef.current.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await callObjectRef.current.startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error("[Daily] Screen share error:", err);
    }
  }, [isScreenSharing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callObjectRef.current) {
        callObjectRef.current.leave();
        callObjectRef.current.destroy();
      }
    };
  }, []);

  return {
    callObject,
    participants,
    localParticipant,
    isConnecting,
    isConnected,
    error,
    join,
    leave,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    isMuted,
    isCameraOff,
    isScreenSharing,
  };
}
