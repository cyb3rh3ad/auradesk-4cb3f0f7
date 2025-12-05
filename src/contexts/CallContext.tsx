import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { IncomingCallDialog } from '@/components/chat/IncomingCallDialog';
import { CallDialog } from '@/components/chat/CallDialog';

interface CallInvitation {
  callerId: string;
  callerName: string;
  callerAvatar: string | null;
  conversationId: string;
  conversationName: string;
  isVideo: boolean;
  timestamp: number;
}

interface ActiveCall {
  conversationId: string;
  conversationName: string;
  isVideo: boolean;
}

interface CallContextType {
  startCall: (conversationId: string, conversationName: string, isVideo: boolean) => Promise<void>;
  endCurrentCall: () => void;
  activeCall: ActiveCall | null;
}

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<CallInvitation | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [listeningChannels, setListeningChannels] = useState<Set<string>>(new Set());

  // Get user profile
  const getUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, email')
      .eq('id', userId)
      .single();
    return data;
  };

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    let mounted = true;
    const channels: ReturnType<typeof supabase.channel>[] = [];

    const setupCallListeners = async () => {
      // Get all conversations the user is part of
      const { data: memberships } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (!memberships || !mounted) return;

      for (const membership of memberships) {
        const channelName = `call-invite:${membership.conversation_id}`;
        
        // Skip if already listening
        if (listeningChannels.has(channelName)) continue;

        const channel = supabase
          .channel(channelName)
          .on('broadcast', { event: 'call-invitation' }, async ({ payload }) => {
            console.log('Received call invitation:', payload);
            
            // Don't show invitation if it's from yourself
            if (payload.callerId === user.id) return;
            
            // Don't show if we're already in a call
            if (activeCall) return;
            
            // Don't show if call is older than 30 seconds
            if (Date.now() - payload.timestamp > 30000) return;

            if (mounted) {
              setIncomingCall({
                callerId: payload.callerId,
                callerName: payload.callerName,
                callerAvatar: payload.callerAvatar,
                conversationId: payload.conversationId,
                conversationName: payload.conversationName,
                isVideo: payload.isVideo,
                timestamp: payload.timestamp,
              });
            }
          })
          .on('broadcast', { event: 'call-cancelled' }, ({ payload }) => {
            console.log('Call cancelled:', payload);
            if (mounted && payload.callerId !== user.id) {
              setIncomingCall(null);
            }
          })
          .on('broadcast', { event: 'call-ended' }, () => {
            console.log('Call ended signal received');
            if (mounted) {
              setIncomingCall(null);
            }
          })
          .subscribe();

        channels.push(channel);
        setListeningChannels(prev => new Set([...prev, channelName]));
      }
    };

    setupCallListeners();

    return () => {
      mounted = false;
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [user, activeCall]);

  // Start a call
  const startCall = useCallback(async (
    conversationId: string, 
    conversationName: string, 
    isVideo: boolean
  ) => {
    if (!user) return;

    // Get caller profile
    const profile = await getUserProfile(user.id);
    const callerName = profile?.full_name || profile?.email || 'Unknown';

    // Set active call first
    setActiveCall({ conversationId, conversationName, isVideo });

    // Send invitation to others
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

    console.log('Sent call invitation to conversation:', conversationId);
  }, [user]);

  // End current call
  const endCurrentCall = useCallback(() => {
    if (activeCall) {
      // Notify others that call ended
      const channel = supabase.channel(`call-invite:${activeCall.conversationId}`);
      channel.send({
        type: 'broadcast',
        event: 'call-ended',
        payload: {},
      });
    }
    setActiveCall(null);
    setIncomingCall(null);
  }, [activeCall]);

  // Accept incoming call
  const handleAcceptCall = useCallback(() => {
    if (incomingCall) {
      setActiveCall({
        conversationId: incomingCall.conversationId,
        conversationName: incomingCall.conversationName,
        isVideo: incomingCall.isVideo,
      });
      setIncomingCall(null);
    }
  }, [incomingCall]);

  // Decline incoming call
  const handleDeclineCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  return (
    <CallContext.Provider value={{ startCall, endCurrentCall, activeCall }}>
      {children}

      {/* Incoming Call Dialog */}
      <IncomingCallDialog
        open={!!incomingCall && !activeCall}
        callerName={incomingCall?.callerName || ''}
        callerAvatar={incomingCall?.callerAvatar}
        isVideo={incomingCall?.isVideo || false}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />

      {/* Active Call Dialog */}
      {activeCall && (
        <CallDialog
          open={!!activeCall}
          onClose={endCurrentCall}
          conversationName={activeCall.conversationName}
          conversationId={activeCall.conversationId}
          initialVideo={activeCall.isVideo}
        />
      )}
    </CallContext.Provider>
  );
};