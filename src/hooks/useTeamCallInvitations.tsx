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
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  // Get user profile
  const getUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, email')
      .eq('id', userId)
      .single();
    return data;
  };

  // Listen for incoming team calls
  useEffect(() => {
    if (!user) return;

    const setupTeamCallListeners = async () => {
      // Get all teams the user is part of
      const { data: memberships } = await supabase
        .from('team_members')
        .select('team_id, teams(name)')
        .eq('user_id', user.id);

      if (!memberships) return;

      for (const membership of memberships) {
        const channelName = `team-call-invite:${membership.team_id}`;
        
        // Skip if already listening
        if (activeChannelsRef.current.has(channelName)) continue;

        const channel = supabase
          .channel(channelName)
          .on('broadcast', { event: 'team-call-invitation' }, async ({ payload }) => {
            console.log('Received team call invitation:', payload);
            
            // Don't show invitation if it's from yourself
            if (payload.callerId === user.id) return;
            
            // Don't show if call is older than 60 seconds
            if (Date.now() - payload.timestamp > 60000) return;

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
            setIncomingTeamCall(null);
            setTeamCallAccepted(false);
          })
          .subscribe();

        channelsRef.current.push(channel);
        activeChannelsRef.current.add(channelName);
      }
    };

    setupTeamCallListeners();

    return () => {
      channelsRef.current.forEach(channel => supabase.removeChannel(channel));
      channelsRef.current = [];
      activeChannelsRef.current.clear();
    };
  }, [user]);

  // Send team call invitation to all team members
  const sendTeamCallInvitation = useCallback(async (
    teamId: string, 
    teamName: string, 
    isVideo: boolean
  ) => {
    if (!user) return;

    const profile = await getUserProfile(user.id);
    const callerName = profile?.full_name || profile?.email || 'Unknown';

    const channel = supabase.channel(`team-call-invite:${teamId}`);
    
    await channel.subscribe();
    
    // Send invitation
    await channel.send({
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

    console.log('Sent team call invitation');
    
    // Resend every 5 seconds for 30 seconds to ensure delivery
    let resendCount = 0;
    const resendInterval = setInterval(async () => {
      resendCount++;
      if (resendCount >= 6) {
        clearInterval(resendInterval);
        return;
      }
      
      await channel.send({
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
      console.log('Resent team call invitation');
    }, 5000);
    
    // Clean up interval after 30 seconds
    setTimeout(() => clearInterval(resendInterval), 30000);
  }, [user]);

  // Accept call
  const acceptTeamCall = useCallback(() => {
    setTeamCallAccepted(true);
    setIncomingTeamCall(null);
  }, []);

  // Decline call
  const declineTeamCall = useCallback(() => {
    setIncomingTeamCall(null);
    setTeamCallAccepted(false);
  }, []);

  // End call (notify others)
  const endTeamCall = useCallback((teamId: string) => {
    const channel = supabase.channel(`team-call-invite:${teamId}`);
    channel.send({
      type: 'broadcast',
      event: 'team-call-ended',
      payload: { teamId },
    });
    setIncomingTeamCall(null);
    setTeamCallAccepted(false);
  }, []);

  return {
    incomingTeamCall,
    sendTeamCallInvitation,
    acceptTeamCall,
    declineTeamCall,
    endTeamCall,
    teamCallAccepted,
  };
};
