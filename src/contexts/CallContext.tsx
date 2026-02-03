import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { IncomingCallDialog } from '@/components/chat/IncomingCallDialog';
import { CallDialog } from '@/components/chat/CallDialog';
import { getSupabaseFunctionsUrl } from '@/lib/supabase-config';

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

  // Keep ref in sync so handlers inside channel callbacks can access latest value
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // Helper: get user profile for display name/avatar
  const getUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, email')
      .eq('id', userId)
      .single();
    return data;
  };

  // Listen for incoming calls on all conversations this user is part of
  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const setupCallListeners = async () => {
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

            // Ignore own invitations
            if (payload.callerId === user.id) {
              console.log('Ignoring own call invitation');
              return;
            }

            // If already in an active call, ignore new invitations
            if (activeCallRef.current) {
              console.log('Ignoring call invitation - already in active call');
              return;
            }

            // Ignore stale invitations (> 30s old)
            if (Date.now() - payload.timestamp > 30000) {
              console.log('Ignoring old call invitation');
              return;
            }

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
            if (!mounted) return;

            if (payload.callerId !== user.id) {
              setIncomingCall(current =>
                current && current.conversationId === payload.conversationId ? null : current,
              );
            }
          })
          .on('broadcast', { event: 'call-ended' }, ({ payload }) => {
            console.log('Call ended signal received:', payload);
            if (!mounted) return;

            // Close incoming dialog if it was for this conversation
            setIncomingCall(current =>
              current && current.conversationId === payload?.conversationId ? null : current,
            );

            // If we are in an active call for this conversation, end it
            setActiveCall(current =>
              current && current.conversationId === payload?.conversationId ? null : current,
            );
          })
          .on('broadcast', { event: 'call-accepted' }, () => {
            console.log('Call accepted - stopping ring');
            if (ringIntervalRef.current) {
              clearInterval(ringIntervalRef.current);
              ringIntervalRef.current = null;
            }
          })
          .subscribe(status => {
            console.log(`Channel ${channelName} subscription status:`, status);
          });

        channelsRef.current.set(channelName, channel);
      }

      setupCompleteRef.current = true;
      console.log('Call listener setup complete');
    };

    setupCallListeners();

    return () => {
      mounted = false;
      console.log('Cleaning up call channels');

      channelsRef.current.forEach((channel, name) => {
        console.log('Removing channel:', name);
        supabase.removeChannel(channel);
      });
      channelsRef.current.clear();
      setupCompleteRef.current = false;

      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    };
  }, [user?.id]); // Only depend on user.id - NOT activeCall

  // Send push notification to conversation members
  const sendCallPushNotification = useCallback(async (
    conversationId: string,
    callerId: string,
    callerName: string,
    conversationName: string,
    isVideo: boolean
  ) => {
    try {
      // Get other members of the conversation
      const { data: members } = await supabase
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', callerId);

      if (!members || members.length === 0) return;

      const userIds = members.map(m => m.user_id);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch(`${getSupabaseFunctionsUrl()}/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userIds,
          title: `Incoming ${isVideo ? 'Video' : 'Voice'} Call`,
          body: `${callerName} is calling you`,
          type: 'call',
          data: {
            type: 'call',
            conversationId,
            conversationName,
            callerId,
            callerName,
            isVideo: String(isVideo),
          },
        }),
      });

      console.log('Sent call push notification to', userIds.length, 'users');
    } catch (error) {
      console.error('Error sending call push notification:', error);
    }
  }, []);

  // Start a call (we immediately join the room as caller)
  const startCall = useCallback(
    async (conversationId: string, conversationName: string, isVideo: boolean) => {
      if (!user) return;

      console.log('Starting call for conversation:', conversationId);

      // Join call immediately as caller
      setActiveCall({ conversationId, conversationName, isVideo, isCaller: true });

      const profile = await getUserProfile(user.id);
      const callerName = profile?.full_name || profile?.email || 'Unknown';

      // Send push notification to other members (for background/killed app)
      sendCallPushNotification(conversationId, user.id, callerName, conversationName, isVideo);

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

      // Wait for subscription
      await new Promise<void>(resolve => {
        const status = (channel as any).state;
        if (status === 'joined') {
          resolve();
        } else {
          channel!.subscribe(status => {
            console.log('Sender channel status:', status);
            if (status === 'SUBSCRIBED') {
              resolve();
            }
          });
        }
      });

      // Small delay so receivers are ready
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

      // Initial invitation
      const result = await channel.send({
        type: 'broadcast',
        event: 'call-invitation',
        payload: invitation,
      });
      console.log('Sent call invitation, result:', result);

      // Re-send invitation every 3s for up to 30s
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
    },
    [user, sendCallPushNotification],
  );

  // End current call (for everyone in this conversation)
  const endCurrentCall = useCallback(() => {
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
          payload: { conversationId: activeCall.conversationId },
        });
      }
    }

    setActiveCall(null);
    setIncomingCall(null);
  }, [activeCall]);

  // Accept incoming call (we only join when user clicks Accept)
  const handleAcceptCall = useCallback(() => {
    if (!incomingCall) return;

    const channelName = `call-invite:${incomingCall.conversationId}`;
    const channel = channelsRef.current.get(channelName);

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'call-accepted',
        payload: { conversationId: incomingCall.conversationId },
      });
    }

    setActiveCall({
      conversationId: incomingCall.conversationId,
      conversationName: incomingCall.conversationName,
      isVideo: incomingCall.isVideo,
      isCaller: false,
    });
    setIncomingCall(null);
  }, [incomingCall]);

  const handleDeclineCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  return (
    <CallContext.Provider value={{ startCall, endCurrentCall, activeCall }}>
      {children}

      {/* Incoming Call Dialog - only visible when we have an invite and are not already in a call */}
      <IncomingCallDialog
        open={!!incomingCall && !activeCall}
        callerName={incomingCall?.callerName || ''}
        callerAvatar={incomingCall?.callerAvatar}
        isVideo={incomingCall?.isVideo || false}
        onAccept={handleAcceptCall}
        onDecline={handleDeclineCall}
      />

      {/* Active Call Dialog - joins LiveKit room */}
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
