import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TeamChannel {
  id: string;
  team_id: string;
  name: string;
  type: 'text' | 'voice';
  category: string | null;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChannelMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    full_name: string | null;
    username: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export interface VoiceParticipant {
  id: string;
  channel_id: string;
  user_id: string;
  joined_at: string;
  is_muted: boolean;
  is_camera_off: boolean;
  profile?: {
    full_name: string | null;
    username: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export function useTeamChannels(teamId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [channels, setChannels] = useState<TeamChannel[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch channels for the team
  const fetchChannels = useCallback(async () => {
    if (!teamId) return;
    
    const { data, error } = await supabase
      .from('team_channels')
      .select('*')
      .eq('team_id', teamId)
      .order('category', { nullsFirst: true })
      .order('position');

    if (error) {
      console.error('Error fetching channels:', error);
      return;
    }

    // Cast the type field properly
    const typedData = (data || []).map(ch => ({
      ...ch,
      type: ch.type as 'text' | 'voice',
    }));

    setChannels(typedData);
    setLoading(false);
  }, [teamId]);

  useEffect(() => {
    fetchChannels();

    // Subscribe to channel changes
    const channel = supabase
      .channel(`team-channels-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_channels',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          fetchChannels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, fetchChannels]);

  const createChannel = async (
    name: string,
    type: 'text' | 'voice',
    category?: string
  ) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('team_channels')
      .insert({
        team_id: teamId,
        name,
        type,
        category: category || null,
        created_by: user.id,
        position: channels.length,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create channel',
        variant: 'destructive',
      });
      return null;
    }

    toast({
      title: 'Channel created',
      description: `#${name} has been created`,
    });

    return data;
  };

  const deleteChannel = async (channelId: string) => {
    const { error } = await supabase
      .from('team_channels')
      .delete()
      .eq('id', channelId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete channel',
        variant: 'destructive',
      });
      return false;
    }

    toast({
      title: 'Channel deleted',
    });

    return true;
  };

  const updateChannel = async (
    channelId: string,
    updates: Partial<Pick<TeamChannel, 'name' | 'category' | 'position'>>
  ) => {
    const { error } = await supabase
      .from('team_channels')
      .update(updates)
      .eq('id', channelId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update channel',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  // Group channels by category
  const groupedChannels = channels.reduce((acc, channel) => {
    const category = channel.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(channel);
    return acc;
  }, {} as Record<string, TeamChannel[]>);

  return {
    channels,
    groupedChannels,
    loading,
    createChannel,
    deleteChannel,
    updateChannel,
    refetch: fetchChannels,
  };
}

export function useChannelMessages(channelId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!channelId) return;

    // Fetch messages without join (since FK doesn't exist in types yet)
    const { data, error } = await supabase
      .from('channel_messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
      setLoading(false);
      return;
    }

    // Fetch sender profiles separately
    const senderIds = [...new Set((data || []).map(m => m.sender_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, email, avatar_url')
      .in('id', senderIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const messagesWithSenders = (data || []).map(msg => ({
      ...msg,
      sender: profileMap.get(msg.sender_id) || undefined,
    }));

    setMessages(messagesWithSenders);
    setLoading(false);
  }, [channelId]);

  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`channel-messages-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'channel_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Fetch the sender profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username, email, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          setMessages((prev) => [
            ...prev,
            { ...payload.new, sender: profile } as ChannelMessage,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, fetchMessages]);

  const sendMessage = async (content: string) => {
    if (!user || !channelId || !content.trim()) return false;

    const { error } = await supabase.from('channel_messages').insert({
      channel_id: channelId,
      sender_id: user.id,
      content: content.trim(),
    });

    if (error) {
      console.error('Error sending message:', error);
      return false;
    }

    return true;
  };

  return {
    messages,
    loading,
    sendMessage,
    refetch: fetchMessages,
  };
}

export function useVoiceChannel(channelId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchParticipants = useCallback(async () => {
    if (!channelId) return;

    // Fetch participants without join
    const { data, error } = await supabase
      .from('voice_channel_participants')
      .select('*')
      .eq('channel_id', channelId);

    if (error) {
      console.error('Error fetching voice participants:', error);
      setParticipants([]);
      setLoading(false);
      return;
    }

    // Fetch profiles separately
    const userIds = [...new Set((data || []).map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, email, avatar_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const participantsWithProfiles = (data || []).map(p => ({
      ...p,
      profile: profileMap.get(p.user_id) || undefined,
    }));

    setParticipants(participantsWithProfiles);

    // Check if current user is in the channel
    if (user) {
      const inChannel = (data || []).some((p) => p.user_id === user.id);
      setIsJoined(inChannel);
    }

    setLoading(false);
  }, [channelId, user]);

  useEffect(() => {
    if (!channelId) {
      setParticipants([]);
      setIsJoined(false);
      setLoading(false);
      return;
    }

    fetchParticipants();

    // Subscribe to participant changes
    const channel = supabase
      .channel(`voice-participants-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voice_channel_participants',
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, fetchParticipants]);

  const joinChannel = async () => {
    if (!user || !channelId) return false;

    const { error } = await supabase.from('voice_channel_participants').insert({
      channel_id: channelId,
      user_id: user.id,
    });

    if (error) {
      if (error.code === '23505') {
        // Already joined
        return true;
      }
      toast({
        title: 'Error',
        description: 'Failed to join voice channel',
        variant: 'destructive',
      });
      return false;
    }

    setIsJoined(true);
    return true;
  };

  const leaveChannel = async () => {
    if (!user || !channelId) return false;

    const { error } = await supabase
      .from('voice_channel_participants')
      .delete()
      .eq('channel_id', channelId)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to leave voice channel',
        variant: 'destructive',
      });
      return false;
    }

    setIsJoined(false);
    return true;
  };

  const updateStatus = async (isMuted: boolean, isCameraOff: boolean) => {
    if (!user || !channelId) return false;

    const { error } = await supabase
      .from('voice_channel_participants')
      .update({ is_muted: isMuted, is_camera_off: isCameraOff })
      .eq('channel_id', channelId)
      .eq('user_id', user.id);

    return !error;
  };

  return {
    participants,
    isJoined,
    loading,
    joinChannel,
    leaveChannel,
    updateStatus,
    refetch: fetchParticipants,
  };
}
