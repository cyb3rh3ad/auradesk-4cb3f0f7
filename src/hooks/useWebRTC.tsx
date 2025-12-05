import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Participant {
  odakle: string;
  stream: MediaStream | null;
  name: string;
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export const useWebRTC = (meetingId: string | null, userName: string) => {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize local media stream
  const initializeMedia = useCallback(async (video: boolean = true, audio: boolean = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError('Could not access camera/microphone');
      return null;
    }
  }, []);

  // Create peer connection for a specific user
  const createPeerConnection = useCallback((remoteUserId: string, remoteName: string) => {
    if (!localStreamRef.current || !user) return null;

    console.log(`Creating peer connection for ${remoteUserId}`);
    
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    
    // Add local tracks to the connection
    localStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log(`Received track from ${remoteUserId}`);
      setParticipants(prev => {
        const newMap = new Map(prev);
        newMap.set(remoteUserId, {
          odakle: remoteUserId,
          stream: event.streams[0],
          name: remoteName
        });
        return newMap;
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate,
            from: user.id,
            to: remoteUserId
          }
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${remoteUserId}: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        // Remove participant on disconnect
        setParticipants(prev => {
          const newMap = new Map(prev);
          newMap.delete(remoteUserId);
          return newMap;
        });
        peerConnections.current.delete(remoteUserId);
      }
    };

    peerConnections.current.set(remoteUserId, pc);
    return pc;
  }, [user]);

  // Send offer to a new participant
  const sendOffer = useCallback(async (remoteUserId: string, remoteName: string) => {
    const pc = createPeerConnection(remoteUserId, remoteName);
    if (!pc || !channelRef.current || !user) return;

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      channelRef.current.send({
        type: 'broadcast',
        event: 'offer',
        payload: {
          offer: pc.localDescription,
          from: user.id,
          fromName: userName,
          to: remoteUserId
        }
      });
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  }, [createPeerConnection, user, userName]);

  // Handle incoming offer
  const handleOffer = useCallback(async (from: string, fromName: string, offer: RTCSessionDescriptionInit) => {
    if (!user) return;
    
    let pc = peerConnections.current.get(from);
    if (!pc) {
      pc = createPeerConnection(from, fromName);
    }
    if (!pc || !channelRef.current) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      channelRef.current.send({
        type: 'broadcast',
        event: 'answer',
        payload: {
          answer: pc.localDescription,
          from: user.id,
          to: from
        }
      });
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  }, [createPeerConnection, user]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (from: string, answer: RTCSessionDescriptionInit) => {
    const pc = peerConnections.current.get(from);
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (from: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnections.current.get(from);
    if (!pc) return;

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Error adding ICE candidate:', err);
    }
  }, []);

  // Join the meeting room
  const joinRoom = useCallback(async (video: boolean = true, audio: boolean = true) => {
    if (!meetingId || !user) return;
    
    setIsConnecting(true);
    setError(null);

    // Initialize local media
    const stream = await initializeMedia(video, audio);
    if (!stream) {
      setIsConnecting(false);
      return;
    }

    // Set up signaling channel
    const channel = supabase.channel(`meeting-${meetingId}`)
      .on('broadcast', { event: 'user-joined' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          console.log(`User joined: ${payload.userId}`);
          // Send offer to new user
          sendOffer(payload.userId, payload.userName);
        }
      })
      .on('broadcast', { event: 'offer' }, ({ payload }) => {
        if (payload.to === user.id) {
          handleOffer(payload.from, payload.fromName, payload.offer);
        }
      })
      .on('broadcast', { event: 'answer' }, ({ payload }) => {
        if (payload.to === user.id) {
          handleAnswer(payload.from, payload.answer);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
        if (payload.to === user.id) {
          handleIceCandidate(payload.from, payload.candidate);
        }
      })
      .on('broadcast', { event: 'user-left' }, ({ payload }) => {
        if (payload.userId !== user.id) {
          console.log(`User left: ${payload.userId}`);
          const pc = peerConnections.current.get(payload.userId);
          if (pc) {
            pc.close();
            peerConnections.current.delete(payload.userId);
          }
          setParticipants(prev => {
            const newMap = new Map(prev);
            newMap.delete(payload.userId);
            return newMap;
          });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Announce presence to others in the room
          channel.send({
            type: 'broadcast',
            event: 'user-joined',
            payload: { userId: user.id, userName }
          });
          setIsConnecting(false);
        }
      });

    channelRef.current = channel;
  }, [meetingId, user, userName, initializeMedia, sendOffer, handleOffer, handleAnswer, handleIceCandidate]);

  // Leave the room
  const leaveRoom = useCallback(() => {
    if (channelRef.current && user) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'user-left',
        payload: { userId: user.id }
      });
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    setParticipants(new Map());
  }, [user]);

  // Toggle audio
  const toggleAudio = useCallback((enabled: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback((enabled: boolean) => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, [leaveRoom]);

  return {
    localStream,
    participants,
    isConnecting,
    error,
    joinRoom,
    leaveRoom,
    toggleAudio,
    toggleVideo
  };
};
