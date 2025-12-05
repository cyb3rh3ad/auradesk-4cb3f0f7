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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const resendIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const acceptedCallsRef = useRef<Set<string>>(new Set());
  const isSubscribedRef = useRef(false);

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

  // Single global channel for all team call invitations
  useEffect(() => {
    if (!user) return;

    let mounted = true;
    
    // Use a single channel for the user to receive all team call invitations
    const channelName = `team-calls-user:${user.id}`;
    console.log('[TeamCall] Setting up channel:', channelName);

    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'team-call-invitation' }, async ({ payload }) => {
        if (!mounted) return;
        console.log('[TeamCall] Received invitation:', payload);
        
        // Don't show if call is older than 60 seconds
        if (Date.now() - payload.timestamp > 60000) {
          console.log('[TeamCall] Ignoring old invitation');
          return;
        }

        // Don't show if already accepted this call
        if (acceptedCallsRef.current.has(payload.teamId)) {
          console.log('[TeamCall] Ignoring - already accepted this call');
          return;
        }

        console.log('[TeamCall] Setting incoming call from:', payload.callerName);
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
        if (!mounted) return;
        console.log('[TeamCall] Call ended:', payload);
        stopResending();
        setIncomingTeamCall(prev => 
          prev?.teamId === payload.teamId ? null : prev
        );
        setTeamCallAccepted(false);
      })
      .subscribe((status) => {
        console.log('[TeamCall] Channel status:', status);
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
          console.log('[TeamCall] Successfully subscribed');
        }
      });

    channelRef.current = channel;

    return () => {
      mounted = false;
      console.log('[TeamCall] Cleaning up channel');
      stopResending();
      isSubscribedRef.current = false;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, stopResending]);

  // Send team call invitation to all team members
  const sendTeamCallInvitation = useCallback(async (
    teamId: string, 
    teamName: string, 
    isVideo: boolean
  ) => {
    if (!user) return;

    console.log('[TeamCall] Preparing to send invitation for team:', teamId);

    // Get team members
    const { data: members, error } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .neq('user_id', user.id);

    if (error || !members || members.length === 0) {
      console.log('[TeamCall] No team members to notify or error:', error);
      return;
    }

    console.log('[TeamCall] Found', members.length, 'team members to notify');

    const profile = await getUserProfile(user.id);
    const callerName = profile?.full_name || profile?.email || 'Unknown';

    const payload = {
      callerId: user.id,
      callerName,
      callerAvatar: profile?.avatar_url,
      teamId,
      teamName,
      isVideo,
      timestamp: Date.now(),
    };

    // Send to each team member's personal channel
    const sendToAllMembers = async () => {
      const results = await Promise.all(
        members.map(async (member) => {
          const memberChannel = supabase.channel(`team-calls-user:${member.user_id}`);
          
          // Subscribe and wait
          await new Promise<void>((resolve) => {
            memberChannel.subscribe((status) => {
              if (status === 'SUBSCRIBED') resolve();
            });
          });
          
          // Small delay to ensure subscription is ready
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const result = await memberChannel.send({
            type: 'broadcast',
            event: 'team-call-invitation',
            payload: { ...payload, timestamp: Date.now() },
          });
          
          console.log('[TeamCall] Sent to', member.user_id, ':', result);
          
          // Don't remove channel immediately - keep it for subsequent sends
          return { memberId: member.user_id, result };
        })
      );
      
      console.log('[TeamCall] Sent invitations to all members:', results);
    };

    // Send immediately
    await sendToAllMembers();

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
      console.log('[TeamCall] Resending invitation, attempt:', resendCount);
      await sendToAllMembers();
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

  // End call (notify others)
  const endTeamCall = useCallback(async (teamId: string) => {
    console.log('[TeamCall] Ending call:', teamId);
    stopResending();
    
    if (!user) return;
    
    // Get team members and notify them
    const { data: members } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .neq('user_id', user.id);
      
    if (members) {
      await Promise.all(
        members.map(async (member) => {
          const memberChannel = supabase.channel(`team-calls-user:${member.user_id}`);
          await new Promise<void>((resolve) => {
            memberChannel.subscribe((status) => {
              if (status === 'SUBSCRIBED') resolve();
            });
          });
          await memberChannel.send({
            type: 'broadcast',
            event: 'team-call-ended',
            payload: { teamId },
          });
        })
      );
    }
    
    acceptedCallsRef.current.delete(teamId);
    setIncomingTeamCall(null);
    setTeamCallAccepted(false);
  }, [stopResending, user]);

  return {
    incomingTeamCall,
    sendTeamCallInvitation,
    acceptTeamCall,
    declineTeamCall,
    endTeamCall,
    teamCallAccepted,
  };
};
