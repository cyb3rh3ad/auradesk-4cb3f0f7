import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { RemotePlayer, HEARING_DISTANCE, VOICE_CONNECT_DISTANCE, VOICE_DISCONNECT_DISTANCE } from '@/components/auraville/gameTypes';

interface PeerConnection {
  pc: RTCPeerConnection;
  gainNode: GainNode;
  audioCtx: AudioContext;
  userId: string;
}

export function useProximityVoice(
  channelRef: React.MutableRefObject<any>,
  myPosition: { x: number; y: number },
  remotePlayers: Map<string, RemotePlayer>,
  enabled: boolean
) {
  const { user } = useAuth();
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const [micActive, setMicActive] = useState(false);
  const [nearbyCount, setNearbyCount] = useState(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const posRef = useRef(myPosition);
  posRef.current = myPosition;

  const startMic = useCallback(async () => {
    if (localStreamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });
      localStreamRef.current = stream;
      setMicActive(true);
    } catch {
      console.warn('Microphone access denied');
    }
  }, []);

  const stopMic = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setMicActive(false);
    // Clean up all peers
    peersRef.current.forEach(peer => {
      peer.pc.close();
      peer.audioCtx.close();
    });
    peersRef.current.clear();
  }, []);

  const createPeerConnection = useCallback((remoteUserId: string): PeerConnection | null => {
    if (!user || peersRef.current.has(remoteUserId)) return peersRef.current.get(remoteUserId) || null;

    try {
      const audioCtx = new AudioContext();
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0;
      gainNode.connect(audioCtx.destination);

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
      }

      pc.ontrack = (e) => {
        try {
          if (e.streams[0]) {
            const source = audioCtx.createMediaStreamSource(e.streams[0]);
            source.connect(gainNode);
          }
        } catch (err) {
          console.warn('Failed to connect remote audio:', err);
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate && channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'voice-signal',
            payload: { type: 'webrtc-ice', senderId: user.id, targetId: remoteUserId, data: e.candidate.toJSON() },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          const peer = peersRef.current.get(remoteUserId);
          if (peer) {
            peer.pc.close();
            peer.audioCtx.close();
            peersRef.current.delete(remoteUserId);
          }
        }
      };

      const peer: PeerConnection = { pc, gainNode, audioCtx, userId: remoteUserId };
      peersRef.current.set(remoteUserId, peer);
      return peer;
    } catch (err) {
      console.warn('Failed to create peer connection:', err);
      return null;
    }
  }, [user, channelRef]);

  // Volume updates based on distance (throttled)
  useEffect(() => {
    if (!enabled) return;
    const iv = setInterval(() => {
      let nearby = 0;
      const pos = posRef.current;
      peersRef.current.forEach((peer, uid) => {
        const remote = remotePlayers.get(uid);
        if (!remote) return;
        const dist = Math.sqrt((pos.x - remote.position.x) ** 2 + (pos.y - remote.position.y) ** 2);
        if (dist < HEARING_DISTANCE) {
          const vol = Math.max(0, 1 - dist / HEARING_DISTANCE);
          peer.gainNode.gain.setTargetAtTime(vol, peer.audioCtx.currentTime, 0.1);
          nearby++;
        } else {
          peer.gainNode.gain.setTargetAtTime(0, peer.audioCtx.currentTime, 0.1);
        }
      });
      setNearbyCount(nearby);
    }, 100);
    return () => clearInterval(iv);
  }, [enabled, remotePlayers]);

  // WebRTC signaling via broadcast — use 'voice-signal' event
  useEffect(() => {
    if (!enabled || !user || !channelRef.current) return;

    const channel = channelRef.current;

    const handleSignal = (msg: any) => {
      const { type, senderId, targetId, data } = msg.payload || msg;
      if (targetId !== user.id || !senderId) return;

      (async () => {
        try {
          if (type === 'webrtc-offer') {
            const pc = createPeerConnection(senderId);
            if (!pc) return;
            await pc.pc.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await pc.pc.createAnswer();
            await pc.pc.setLocalDescription(answer);
            channel.send({
              type: 'broadcast',
              event: 'voice-signal',
              payload: { type: 'webrtc-answer', senderId: user.id, targetId: senderId, data: answer },
            });
          } else if (type === 'webrtc-answer') {
            const peer = peersRef.current.get(senderId);
            if (peer && peer.pc.signalingState === 'have-local-offer') {
              await peer.pc.setRemoteDescription(new RTCSessionDescription(data));
            }
          } else if (type === 'webrtc-ice') {
            const peer = peersRef.current.get(senderId);
            if (peer && data) {
              await peer.pc.addIceCandidate(new RTCIceCandidate(data));
            }
          }
        } catch (err) {
          console.warn('Voice signaling error:', err);
        }
      })();
    };

    channel.on('broadcast', { event: 'voice-signal' }, handleSignal);

    return () => {
      // Channel cleanup handled by parent
    };
  }, [enabled, user, channelRef.current, createPeerConnection]);

  // Connect/disconnect peers based on distance
  useEffect(() => {
    if (!enabled || !user || !channelRef.current || !localStreamRef.current) return;

    const interval = setInterval(() => {
      const pos = posRef.current;
      remotePlayers.forEach((remote, uid) => {
        const dist = Math.sqrt((pos.x - remote.position.x) ** 2 + (pos.y - remote.position.y) ** 2);
        const hasPeer = peersRef.current.has(uid);

        if (dist < VOICE_CONNECT_DISTANCE && !hasPeer) {
          if (user.id < uid) {
            const peer = createPeerConnection(uid);
            if (peer) {
              peer.pc.createOffer().then(offer => {
                peer.pc.setLocalDescription(offer);
                channelRef.current?.send({
                  type: 'broadcast',
                  event: 'voice-signal',
                  payload: { type: 'webrtc-offer', senderId: user.id, targetId: uid, data: offer },
                });
              }).catch(() => {});
            }
          }
        } else if (dist > VOICE_DISCONNECT_DISTANCE && hasPeer) {
          const peer = peersRef.current.get(uid);
          if (peer) {
            peer.pc.close();
            peer.audioCtx.close();
            peersRef.current.delete(uid);
          }
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [enabled, user, remotePlayers, createPeerConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peersRef.current.forEach(peer => {
        peer.pc.close();
        peer.audioCtx.close();
      });
      peersRef.current.clear();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    };
  }, []);

  return { micActive, nearbyCount, startMic, stopMic };
}
