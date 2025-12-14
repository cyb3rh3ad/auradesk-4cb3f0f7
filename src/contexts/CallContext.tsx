import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  isCaller: boolean;
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
  const channelsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());
  const setupCompleteRef = useRef(false);
  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeCallRef = useRef<ActiveCall | null>(null);

  // Keep a ref in sync with activeCall so realtime handlers can see latest value
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

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

    const setupCallListeners = async () => {
      // Get all conversations the user is part of
      const { data: memberships, error } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching conversation memberships:', error);
        return;
      }

      if (!memberships || !mounted) return;

      console.log('Setting up call listeners for', memberships.length, 'conversations');

      for (const membership of memberships) {
        const channelName = `call-invite:${membership.conversation_id}`;
        
        // Skip if already listening
        if (channelsRef.current.has(channelName)) {
          console.log('Already listening to channel:', channelName);
          continue;
        }

        console.log('Creating channel:', channelName);

        const channel = supabase.channel(channelName, {
          config: {
            broadcast: { self: false }, // Don't receive own broadcasts
          },
        });

        channel
          .on('broadcast', { event: 'call-invitation' }, ({ payload }) => {
            console.log('Received call invitation:', payload);
            
            // Don't show invitation if it's from yourself
            if (payload.callerId === user.id) {
              console.log('Ignoring own call invitation');
              return;
            }
            
            // If we're already in an active call, ignore new invitations
            if (activeCallRef.current) {
              console.log('Ignoring call invitation - already in active call');
              return;
            }
            
            // Don't show if call is older than 30 seconds
            if (Date.now() - payload.timestamp > 30000) {
              console.log('Ignoring old call invitation');
              return;
            }

            if (mounted) {
              console.log('Setting incoming call state');
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
          .on('broadcast', { event: 'call-accepted' }, () => {
            console.log('Call accepted - stopping ring');
            // Stop ringing when call is accepted
            if (ringIntervalRef.current) {
              clearInterval(ringIntervalRef.current);
              ringIntervalRef.current = null;
            }
          })
          .subscribe((status) => {
            console.log(`Channel ${channelName} subscription status:`, status);
            if (status === 'SUBSCRIBED') {
              console.log(`Successfully subscribed to ${channelName}`);
            }
          });

        channelsRef.current.set(channelName, channel);
      }

      setupCompleteRef.current = true;
      console.log('Call listener setup complete');
    };

    setupCallListeners();

    // Cleanup on unmount
    return () => {
      mounted = false;
      console.log('Cleaning up call channels');
      channelsRef.current.forEach((channel, name) => {
        console.log('Removing channel:', name);
        supabase.removeChannel(channel);
      });
      channelsRef.current.clear();
      setupCompleteRef.current = false;

      // Ensure any pending ring interval is cleared
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    };
  }, [user?.id]); // Only re-run when user changes

  // Start a call
  const startCall = useCallback(async (
    conversationId: string, 
    conversationName: string, 
    isVideo: boolean
  ) => {
    if (!user) return;

    console.log('Starting call for conversation:', conversationId);

    // Get caller profile
    const profile = await getUserProfile(user.id);
    const callerName = profile?.full_name || profile?.email || 'Unknown';

    // Set active call first (as caller)
    setActiveCall({ conversationId, conversationName, isVideo, isCaller: true });

    // Get or create channel for this conversation
    const channelName = `call-invite:${conversationId}`;
    let channel = channelsRef.current.get(channelName);
    
    if (!channel) {
      console.log('Creating new channel for sending:', channelName);
      channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
        },
      });
      channelsRef.current.set(channelName, channel);
    }

    // Wait for subscription to be ready
    await new Promise<void>((resolve) => {
      const status = (channel as any).state;
      if (status === 'joined') {
        resolve();
      } else {
        channel!.subscribe((status) => {
          console.log('Sender channel status:', status);
          if (status === 'SUBSCRIBED') {
            resolve();
          }
        });
      }
    });

    // Small delay to ensure receivers are ready
    await new Promise(resolve => setTimeout(resolve, 100));

    const invitation = {
      callerId: user.id,
      callerName,
      callerAvatar: profile?.avatar_url,
      conversationId,
      conversationName,
      isVideo,
      timestamp: Date.now(),
    };

    // Send initial invitation
    const result = await channel.send({
      type: 'broadcast',
      event: 'call-invitation',
      payload: invitation,
    });
    console.log('Sent call invitation, result:', result);

    // Keep ringing - send invitation every 3 seconds for 30 seconds
    let ringCount = 0;
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
    }
    ringIntervalRef.current = setInterval(async () => {
      ringCount++;
      if (ringCount >= 10) {
        if (ringIntervalRef.current) {
          clearInterval(ringIntervalRef.current);
          ringIntervalRef.current = null;
        }
        return;
      }
      
      const ch = channelsRef.current.get(channelName);
      if (ch) {
        await ch.send({
          type: 'broadcast',
          event: 'call-invitation',
          payload: { ...invitation, timestamp: Date.now() },
        });
        console.log('Ring', ringCount);
      }
    }, 3000);
  }, [user]);

  // End current call
  const endCurrentCall = useCallback(() => {
    // Clear the ringing interval if it exists
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }

    if (activeCall) {
      const channelName = `call-invite:${activeCall.conversationId}`;
      const channel = channelsRef.current.get(channelName);
      
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'call-ended',
          payload: {},
        });
      }
    }
    setActiveCall(null);
    setIncomingCall(null);
  }, [activeCall]);

  // Accept incoming call
  const handleAcceptCall = useCallback(() => {
    if (incomingCall) {
      // Notify caller that call was accepted
      const channelName = `call-invite:${incomingCall.conversationId}`;
      const channel = channelsRef.current.get(channelName);
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'call-accepted',
          payload: {},
        });
      }

      setActiveCall({
        conversationId: incomingCall.conversationId,
        conversationName: incomingCall.conversationName,
        isVideo: incomingCall.isVideo,
        isCaller: false, // This user is receiving the call, not initiating
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
          isCaller={activeCall.isCaller}
        />
      )}
    </CallContext.Provider>
  );
};
