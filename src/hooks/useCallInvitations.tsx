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
  const acceptedCallsRef = useRef<Set<string>>(new Set());

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

    let mounted = true;

    const setupCallListeners = async () => {
      // Get all conversations the user is part of
      const { data: memberships } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!memberships || !mounted) return;

      console.log('Setting up call listeners for', memberships.length, 'conversations');

      for (const membership of memberships) {
        const channelName = `call-invite:${membership.conversation_id}`;
        
        // Skip if already listening
        if (channelsRef.current.has(channelName)) continue;

        console.log('Creating channel:', channelName);

        const channel = supabase
          .channel(channelName)
          .on('broadcast', { event: 'call-invitation' }, async ({ payload }) => {
            console.log('Received call invitation:', payload);
            
            // Don't show invitation if it's from yourself
            if (payload.callerId === user.id) return;
            
            // Don't show if call is older than 35 seconds
            if (Date.now() - payload.timestamp > 35000) return;

            // Don't show if already accepted this call
            if (acceptedCallsRef.current.has(payload.conversationId)) {
              console.log('Ignoring invitation - already accepted this call');
              return;
            }

            // Don't override existing incoming call from different caller
            setIncomingCall(prev => {
              if (prev && prev.callerId !== payload.callerId) return prev;
              return {
                callerId: payload.callerId,
                callerName: payload.callerName,
                callerAvatar: payload.callerAvatar,
                conversationId: payload.conversationId,
                conversationName: payload.conversationName,
                isVideo: payload.isVideo,
                timestamp: payload.timestamp,
              };
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
              setIncomingCall(prev => 
                prev?.conversationId === payload.conversationId ? null : prev
              );
            }
          })
          .on('broadcast', { event: 'call-ended' }, ({ payload }) => {
            console.log('Call ended:', payload);
            setIncomingCall(prev => 
              prev?.conversationId === payload.conversationId ? null : prev
            );
            // Clear accepted tracking for this call
            if (payload.conversationId) {
              acceptedCallsRef.current.delete(payload.conversationId);
            }
            setCallAccepted(false);
          });

        channel.subscribe((status) => {
          console.log(`Channel ${channelName} subscription status:`, status);
          if (status === 'SUBSCRIBED' && mounted) {
            console.log('Successfully subscribed to', channelName);
          }
        });

        channelsRef.current.set(channelName, channel);
      }
      
      console.log('Call listener setup complete');
    };

    setupCallListeners();

    return () => {
      mounted = false;
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

    console.log('Preparing to send call invitation for conversation:', conversationId);

    const profile = await getUserProfile(user.id);
    const callerName = profile?.full_name || profile?.email || 'Unknown';
    const timestamp = Date.now();

    const channelName = `call-invite:${conversationId}`;
    let channel = channelsRef.current.get(channelName);
    
    if (!channel) {
      console.log('Creating new channel for sending:', channelName);
      channel = supabase.channel(channelName);
      await new Promise<void>((resolve) => {
        channel!.subscribe((status) => {
          console.log('Sender channel status:', status);
          if (status === 'SUBSCRIBED') resolve();
        });
      });
      channelsRef.current.set(channelName, channel);
      
      // Wait a bit for receiver to be subscribed
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    const sendInvite = async () => {
      const result = await channel!.send({
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
      console.log('Sent call invitation, result:', result);
    };

    // Send immediately
    await sendInvite();

    // Also send a push notification for background delivery
    try {
      const { data: members } = await supabase
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id);

      if (members && members.length > 0) {
        const recipientIds = members.map(m => m.user_id);
        supabase.functions.invoke('send-push-notification', {
          body: {
            userIds: recipientIds,
            title: `${callerName} is calling`,
            body: isVideo ? 'Incoming video call' : 'Incoming voice call',
            type: 'call',
            data: { type: 'call', conversationId, callerName, isVideo: String(isVideo) },
          },
        }).catch(err => console.log('Push call notification skipped:', err));
      }
    } catch (e) {
      // Non-critical
    }

    // Clear any existing interval
    if (inviteIntervalRef.current) {
      clearInterval(inviteIntervalRef.current);
    }

    // Re-send every 3 seconds for 30 seconds
    let count = 0;
    inviteIntervalRef.current = setInterval(async () => {
      count++;
      if (count >= 10) {
        if (inviteIntervalRef.current) {
          clearInterval(inviteIntervalRef.current);
          inviteIntervalRef.current = null;
        }
        return;
      }
      await sendInvite();
    }, 3000);

    console.log('Started call invitation broadcasting');
  }, [user]);

  // Accept call
  const acceptCall = useCallback(() => {
    console.log('Accepting call:', incomingCall?.conversationId);
    if (incomingCall) {
      // Track that we accepted this call
      acceptedCallsRef.current.add(incomingCall.conversationId);
      
      // Clear after 2 minutes
      setTimeout(() => {
        acceptedCallsRef.current.delete(incomingCall.conversationId);
      }, 120000);
      
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
    setIncomingCall(null);
  }, [incomingCall, user]);

  // Decline call
  const declineCall = useCallback(() => {
    console.log('Declining call');
    setIncomingCall(null);
    setCallAccepted(false);
  }, []);

  // End call (notify others)
  const endCall = useCallback((conversationId: string) => {
    console.log('Ending call:', conversationId);
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
        payload: { conversationId },
      });
    }
    
    // Clear accepted tracking
    acceptedCallsRef.current.delete(conversationId);
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
