import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TeamCallInvitation {
  callerId: string;
  callerName: string;
  callerAvatar: string | null;
  teamId: string;
  teamName: string;
  isVideo: boolean;
  timestamp: number;
}

interface UseTeamCallInvitationsReturn {
  incomingTeamCall: TeamCallInvitation | null;
  sendTeamCallInvitation: (teamId: string, teamName: string, isVideo: boolean) => Promise<void>;
  acceptTeamCall: () => void;
  declineTeamCall: () => void;
  endTeamCall: (teamId: string) => void;
  teamCallAccepted: boolean;
}

export const useTeamCallInvitations = (): UseTeamCallInvitationsReturn => {
  const { user } = useAuth();
  const [incomingTeamCall, setIncomingTeamCall] = useState<TeamCallInvitation | null>(null);
  const [teamCallAccepted, setTeamCallAccepted] = useState(false);
  const channelsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());
  const resendIntervalRef = useRef<NodeJS.Timeout | null>(null);
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

  // Stop resending invitations
  const stopResending = useCallback(() => {
    if (resendIntervalRef.current) {
      clearInterval(resendIntervalRef.current);
      resendIntervalRef.current = null;
      console.log('[TeamCall] Stopped resending invitations');
    }
  }, []);

  // Subscribe to all team channels for receiving calls
  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const setupTeamChannels = async () => {
      // Get all teams the user is part of
      const { data: memberships, error } = await supabase
        .from('team_members')
        .select('team_id, teams(name)')
        .eq('user_id', user.id);

      if (error || !memberships) {
        console.log('[TeamCall] Error fetching teams:', error);
        return;
      }

      console.log('[TeamCall] Setting up channels for', memberships.length, 'teams');

      for (const membership of memberships) {
        const teamId = membership.team_id;
        const channelName = `team-call:${teamId}`;

        // Skip if already subscribed
        if (channelsRef.current.has(channelName)) {
          continue;
        }

        console.log('[TeamCall] Subscribing to channel:', channelName);

        const channel = supabase.channel(channelName);

        channel
          .on('broadcast', { event: 'call-invite' }, ({ payload }) => {
            if (!mounted) return;
            
            console.log('[TeamCall] Received broadcast:', payload);

            // Ignore own invitations
            if (payload.callerId === user.id) {
              console.log('[TeamCall] Ignoring own invitation');
              return;
            }

            // Ignore old invitations (more than 60 seconds)
            if (Date.now() - payload.timestamp > 60000) {
              console.log('[TeamCall] Ignoring old invitation');
              return;
            }

            // Ignore if already accepted this call
            if (acceptedCallsRef.current.has(payload.teamId)) {
              console.log('[TeamCall] Ignoring - already accepted');
              return;
            }

            console.log('[TeamCall] Showing incoming call from:', payload.callerName);
            setIncomingTeamCall({
              callerId: payload.callerId,
              callerName: payload.callerName,
              callerAvatar: payload.callerAvatar,
              teamId: payload.teamId,
              teamName: payload.teamName,
              isVideo: payload.isVideo,
              timestamp: payload.timestamp,
            });
          })
          .on('broadcast', { event: 'call-ended' }, ({ payload }) => {
            if (!mounted) return;
            console.log('[TeamCall] Call ended broadcast:', payload);
            
            if (payload.teamId) {
              setIncomingTeamCall(prev => 
                prev?.teamId === payload.teamId ? null : prev
              );
            }
          })
          .subscribe((status) => {
            console.log(`[TeamCall] Channel ${channelName} status:`, status);
          });

        channelsRef.current.set(channelName, channel);
      }
    };

    setupTeamChannels();

    return () => {
      mounted = false;
      console.log('[TeamCall] Cleaning up all channels');
      stopResending();
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current.clear();
    };
  }, [user, stopResending]);

  // Send team call invitation
  const sendTeamCallInvitation = useCallback(async (
    teamId: string,
    teamName: string,
    isVideo: boolean
  ) => {
    if (!user) return;

    console.log('[TeamCall] Sending invitation for team:', teamId);

    const profile = await getUserProfile(user.id);
    const callerName = profile?.full_name || profile?.email || 'Unknown';

    const channelName = `team-call:${teamId}`;
    let channel = channelsRef.current.get(channelName);

    // If we don't have this channel yet, create and subscribe
    if (!channel) {
      console.log('[TeamCall] Creating channel:', channelName);
      channel = supabase.channel(channelName);
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Subscription timeout')), 5000);
        channel!.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            resolve();
          }
        });
      });
      
      channelsRef.current.set(channelName, channel);
    }

    // Wait a moment for channel to stabilize
    await new Promise(resolve => setTimeout(resolve, 300));

    const sendInvite = async () => {
      const payload = {
        callerId: user.id,
        callerName,
        callerAvatar: profile?.avatar_url,
        teamId,
        teamName,
        isVideo,
        timestamp: Date.now(),
      };

      const result = await channel!.send({
        type: 'broadcast',
        event: 'call-invite',
        payload,
      });

      console.log('[TeamCall] Broadcast result:', result);
      return result;
    };

    // Send immediately
    await sendInvite();

    // Stop any existing resend interval
    stopResending();

    // Resend every 3 seconds for 30 seconds
    let count = 0;
    resendIntervalRef.current = setInterval(async () => {
      count++;
      if (count >= 10) {
        stopResending();
        return;
      }
      console.log('[TeamCall] Resending, attempt:', count);
      await sendInvite();
    }, 3000);
  }, [user, stopResending]);

  // Accept call
  const acceptTeamCall = useCallback(() => {
    console.log('[TeamCall] Accepting call:', incomingTeamCall?.teamId);
    if (incomingTeamCall) {
      acceptedCallsRef.current.add(incomingTeamCall.teamId);
      
      // Clear after 2 minutes
      setTimeout(() => {
        acceptedCallsRef.current.delete(incomingTeamCall.teamId);
      }, 120000);
    }
    setTeamCallAccepted(true);
    setIncomingTeamCall(null);
  }, [incomingTeamCall]);

  // Decline call
  const declineTeamCall = useCallback(() => {
    console.log('[TeamCall] Declining call');
    setIncomingTeamCall(null);
    setTeamCallAccepted(false);
  }, []);

  // End call
  const endTeamCall = useCallback(async (teamId: string) => {
    console.log('[TeamCall] Ending call:', teamId);
    stopResending();

    const channelName = `team-call:${teamId}`;
    const channel = channelsRef.current.get(channelName);

    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'call-ended',
        payload: { teamId },
      });
    }

    acceptedCallsRef.current.delete(teamId);
    setIncomingTeamCall(null);
    setTeamCallAccepted(false);
  }, [stopResending]);

  return {
    incomingTeamCall,
    sendTeamCallInvitation,
    acceptTeamCall,
    declineTeamCall,
    endTeamCall,
    teamCallAccepted,
  };
};
