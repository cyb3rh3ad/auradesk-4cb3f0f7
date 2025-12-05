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
  const activeChannelsRef = useRef<Set<string>>(new Set());
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
      console.log('Stopped resending team call invitations');
    }
  }, []);

  // Listen for incoming team calls
  useEffect(() => {
    if (!user) return;

    let mounted = true;

    const setupTeamCallListeners = async () => {
      // Get all teams the user is part of
      const { data: memberships } = await supabase
        .from('team_members')
        .select('team_id, teams(name)')
        .eq('user_id', user.id);

      if (!memberships || !mounted) return;

      console.log('Setting up team call listeners for', memberships.length, 'teams');

      for (const membership of memberships) {
        const channelName = `team-call-invite:${membership.team_id}`;
        
        // Skip if already listening
        if (activeChannelsRef.current.has(channelName)) {
          console.log('Already listening to:', channelName);
          continue;
        }

        console.log('Creating channel:', channelName);

        const channel = supabase
          .channel(channelName)
          .on('broadcast', { event: 'team-call-invitation' }, async ({ payload }) => {
            console.log('Received team call invitation:', payload);
            
            // Don't show invitation if it's from yourself
            if (payload.callerId === user.id) {
              console.log('Ignoring own invitation');
              return;
            }
            
            // Don't show if call is older than 60 seconds
            if (Date.now() - payload.timestamp > 60000) {
              console.log('Ignoring old invitation');
              return;
            }

            // Don't show if already accepted this call
            if (acceptedCallsRef.current.has(payload.teamId)) {
              console.log('Ignoring invitation - already accepted this call');
              return;
            }

            console.log('Setting incoming team call');
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
          .on('broadcast', { event: 'team-call-ended' }, ({ payload }) => {
            console.log('Team call ended:', payload);
            stopResending();
            // Only clear if it matches the current incoming call
            setIncomingTeamCall(prev => 
              prev?.teamId === payload.teamId ? null : prev
            );
            setTeamCallAccepted(false);
          });

        // Subscribe and wait for it to be ready
        channel.subscribe((status) => {
          console.log(`Channel ${channelName} subscription status:`, status);
          if (status === 'SUBSCRIBED' && mounted) {
            console.log('Successfully subscribed to', channelName);
          }
        });

        channelsRef.current.set(channelName, channel);
        activeChannelsRef.current.add(channelName);
      }
      
      console.log('Team call listener setup complete');
    };

    setupTeamCallListeners();

    return () => {
      mounted = false;
      console.log('Cleaning up team call invitation channels');
      stopResending();
      channelsRef.current.forEach(channel => supabase.removeChannel(channel));
      channelsRef.current.clear();
      activeChannelsRef.current.clear();
    };
  }, [user, stopResending]);

  // Send team call invitation to all team members
  const sendTeamCallInvitation = useCallback(async (
    teamId: string, 
    teamName: string, 
    isVideo: boolean
  ) => {
    if (!user) return;

    console.log('Preparing to send team call invitation for team:', teamId);

    const profile = await getUserProfile(user.id);
    const callerName = profile?.full_name || profile?.email || 'Unknown';

    const channelName = `team-call-invite:${teamId}`;
    let channel = channelsRef.current.get(channelName);
    
    // If we don't have a channel yet, create and subscribe
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
      activeChannelsRef.current.add(channelName);
      
      // Wait a bit for other subscribers to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const sendInvitation = async () => {
      const result = await channel!.send({
        type: 'broadcast',
        event: 'team-call-invitation',
        payload: {
          callerId: user.id,
          callerName,
          callerAvatar: profile?.avatar_url,
          teamId,
          teamName,
          isVideo,
          timestamp: Date.now(),
        },
      });
      console.log('Sent team call invitation, result:', result);
    };

    // Send immediately
    await sendInvitation();

    // Clear any existing interval
    stopResending();
    
    // Resend every 3 seconds for 30 seconds to ensure delivery
    let resendCount = 0;
    resendIntervalRef.current = setInterval(async () => {
      resendCount++;
      if (resendCount >= 10) {
        stopResending();
        return;
      }
      await sendInvitation();
    }, 3000);
  }, [user, stopResending]);

  // Accept call - only stops ringing locally for this user
  const acceptTeamCall = useCallback(() => {
    console.log('Accepting team call:', incomingTeamCall?.teamId);
    if (incomingTeamCall) {
      // Track that we accepted this call so we ignore future invitations
      acceptedCallsRef.current.add(incomingTeamCall.teamId);
      
      // Clear after 2 minutes (call should be over or user left)
      setTimeout(() => {
        acceptedCallsRef.current.delete(incomingTeamCall.teamId);
      }, 120000);
    }
    setTeamCallAccepted(true);
    setIncomingTeamCall(null);
  }, [incomingTeamCall]);

  // Decline call
  const declineTeamCall = useCallback(() => {
    console.log('Declining team call');
    setIncomingTeamCall(null);
    setTeamCallAccepted(false);
  }, []);

  // End call (notify others)
  const endTeamCall = useCallback((teamId: string) => {
    console.log('Ending team call:', teamId);
    stopResending();
    const channelName = `team-call-invite:${teamId}`;
    const channel = channelsRef.current.get(channelName);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'team-call-ended',
        payload: { teamId },
      });
    }
    // Clear the accepted call tracking
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
