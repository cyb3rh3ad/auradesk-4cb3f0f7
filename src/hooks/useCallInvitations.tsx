import { useState, useEffect, useCallback, useRef } from 'react';
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
  const channelsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());
  const inviteIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

      for (const membership of memberships) {
        const channelName = `call-invite:${membership.conversation_id}`;
        
        // Skip if already listening
        if (channelsRef.current.has(channelName)) continue;

        console.log('Setting up call listener for:', channelName);

        const channel = supabase
          .channel(channelName)
          .on('broadcast', { event: 'call-invitation' }, async ({ payload }) => {
            console.log('Received call invitation:', payload);
            
            // Don't show invitation if it's from yourself
            if (payload.callerId === user.id) return;
            
            // Don't show if call is older than 35 seconds
            if (Date.now() - payload.timestamp > 35000) return;

            // Don't override existing incoming call
            if (incomingCall && incomingCall.callerId !== payload.callerId) return;

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
          .on('broadcast', { event: 'call-accepted' }, ({ payload }) => {
            console.log('Call accepted by receiver:', payload);
            // Stop sending invitations when call is accepted
            if (inviteIntervalRef.current) {
              clearInterval(inviteIntervalRef.current);
              inviteIntervalRef.current = null;
            }
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
          .subscribe((status) => {
            console.log(`Channel ${channelName} status:`, status);
          });

        channelsRef.current.set(channelName, channel);
      }
    };

    setupCallListeners();

    return () => {
      console.log('Cleaning up call invitation channels');
      channelsRef.current.forEach((channel, name) => {
        console.log('Removing channel:', name);
        supabase.removeChannel(channel);
      });
      channelsRef.current.clear();
      
      if (inviteIntervalRef.current) {
        clearInterval(inviteIntervalRef.current);
        inviteIntervalRef.current = null;
      }
    };
  }, [user]);

  // Send call invitation with persistent re-sending
  const sendCallInvitation = useCallback(async (
    conversationId: string, 
    conversationName: string, 
    isVideo: boolean
  ) => {
    if (!user) return;

    const profile = await getUserProfile(user.id);
    const callerName = profile?.full_name || profile?.email || 'Unknown';
    const timestamp = Date.now();

    const channelName = `call-invite:${conversationId}`;
    let channel = channelsRef.current.get(channelName);
    
    if (!channel) {
      channel = supabase.channel(channelName);
      await new Promise<void>((resolve) => {
        channel!.subscribe((status) => {
          if (status === 'SUBSCRIBED') resolve();
        });
      });
      channelsRef.current.set(channelName, channel);
    }

    const sendInvite = () => {
      console.log('Sending call invitation to:', conversationId);
      channel!.send({
        type: 'broadcast',
        event: 'call-invitation',
        payload: {
          callerId: user.id,
          callerName,
          callerAvatar: profile?.avatar_url,
          conversationId,
          conversationName,
          isVideo,
          timestamp,
        },
      });
    };

    // Send immediately
    sendInvite();

    // Clear any existing interval
    if (inviteIntervalRef.current) {
      clearInterval(inviteIntervalRef.current);
    }

    // Re-send every 3 seconds for 30 seconds
    let count = 0;
    inviteIntervalRef.current = setInterval(() => {
      count++;
      if (count >= 10) {
        if (inviteIntervalRef.current) {
          clearInterval(inviteIntervalRef.current);
          inviteIntervalRef.current = null;
        }
        return;
      }
      sendInvite();
    }, 3000);

    console.log('Started call invitation broadcasting');
  }, [user]);

  // Accept call
  const acceptCall = useCallback(() => {
    if (incomingCall) {
      // Notify caller that we accepted
      const channelName = `call-invite:${incomingCall.conversationId}`;
      const channel = channelsRef.current.get(channelName);
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'call-accepted',
          payload: { acceptedBy: user?.id },
        });
      }
    }
    setCallAccepted(true);
  }, [incomingCall, user]);

  // Decline call
  const declineCall = useCallback(() => {
    setIncomingCall(null);
    setCallAccepted(false);
  }, []);

  // End call (notify others)
  const endCall = useCallback((conversationId: string) => {
    // Stop invitation interval
    if (inviteIntervalRef.current) {
      clearInterval(inviteIntervalRef.current);
      inviteIntervalRef.current = null;
    }

    const channelName = `call-invite:${conversationId}`;
    const channel = channelsRef.current.get(channelName);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'call-ended',
        payload: {},
      });
    }
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
