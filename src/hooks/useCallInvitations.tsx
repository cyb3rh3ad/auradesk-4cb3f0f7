import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CallInvitation {
  callerId: string;
  callerName: string;
  callerAvatar: string | null;
  conversationId: string;
  conversationName: string;
  isVideo: boolean;
  timestamp: number;
}

interface UseCallInvitationsReturn {
  incomingCall: CallInvitation | null;
  sendCallInvitation: (conversationId: string, conversationName: string, isVideo: boolean) => Promise<void>;
  acceptCall: () => void;
  declineCall: () => void;
  endCall: (conversationId: string) => void;
  callAccepted: boolean;
}

export const useCallInvitations = (): UseCallInvitationsReturn => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<CallInvitation | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [activeChannels, setActiveChannels] = useState<string[]>([]);

  // Get user profile
  const getUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, email')
      .eq('id', userId)
      .single();
    return data;
  };

  // Listen for incoming calls on conversations the user is part of
  useEffect(() => {
    if (!user) return;

    const setupCallListeners = async () => {
      // Get all conversations the user is part of
      const { data: memberships } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!memberships) return;

      const channels: ReturnType<typeof supabase.channel>[] = [];

      for (const membership of memberships) {
        const channelName = `call-invite:${membership.conversation_id}`;
        
        // Skip if already listening
        if (activeChannels.includes(channelName)) continue;

        const channel = supabase
          .channel(channelName)
          .on('broadcast', { event: 'call-invitation' }, async ({ payload }) => {
            console.log('Received call invitation:', payload);
            
            // Don't show invitation if it's from yourself
            if (payload.callerId === user.id) return;
            
            // Don't show if call is older than 30 seconds
            if (Date.now() - payload.timestamp > 30000) return;

            setIncomingCall({
              callerId: payload.callerId,
              callerName: payload.callerName,
              callerAvatar: payload.callerAvatar,
              conversationId: payload.conversationId,
              conversationName: payload.conversationName,
              isVideo: payload.isVideo,
              timestamp: payload.timestamp,
            });
          })
          .on('broadcast', { event: 'call-cancelled' }, ({ payload }) => {
            console.log('Call cancelled:', payload);
            if (payload.callerId !== user.id) {
              setIncomingCall(null);
            }
          })
          .on('broadcast', { event: 'call-ended' }, () => {
            console.log('Call ended');
            setIncomingCall(null);
            setCallAccepted(false);
          })
          .subscribe();

        channels.push(channel);
        setActiveChannels(prev => [...prev, channelName]);
      }

      return () => {
        channels.forEach(channel => supabase.removeChannel(channel));
      };
    };

    setupCallListeners();
  }, [user]);

  // Send call invitation
  const sendCallInvitation = useCallback(async (
    conversationId: string, 
    conversationName: string, 
    isVideo: boolean
  ) => {
    if (!user) return;

    const profile = await getUserProfile(user.id);
    const callerName = profile?.full_name || profile?.email || 'Unknown';

    const channel = supabase.channel(`call-invite:${conversationId}`);
    
    await channel.subscribe();
    
    await channel.send({
      type: 'broadcast',
      event: 'call-invitation',
      payload: {
        callerId: user.id,
        callerName,
        callerAvatar: profile?.avatar_url,
        conversationId,
        conversationName,
        isVideo,
        timestamp: Date.now(),
      },
    });

    console.log('Sent call invitation');
  }, [user]);

  // Accept call
  const acceptCall = useCallback(() => {
    setCallAccepted(true);
  }, []);

  // Decline call
  const declineCall = useCallback(() => {
    setIncomingCall(null);
    setCallAccepted(false);
  }, []);

  // End call (notify others)
  const endCall = useCallback((conversationId: string) => {
    const channel = supabase.channel(`call-invite:${conversationId}`);
    channel.send({
      type: 'broadcast',
      event: 'call-ended',
      payload: {},
    });
    setIncomingCall(null);
    setCallAccepted(false);
  }, []);

  return {
    incomingCall,
    sendCallInvitation,
    acceptCall,
    declineCall,
    endCall,
    callAccepted,
  };
};