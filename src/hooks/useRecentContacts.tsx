import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface RecentContact {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  last_message_at: string;
  conversation_id: string | null;
}

export const useRecentContacts = (limit: number = 5) => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<RecentContact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentContacts = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get private conversations where user is a member
      const { data: userConversations, error: convError } = await supabase
        .from('conversation_members')
        .select(`
          conversation_id,
          conversations!inner(id, is_group, updated_at)
        `)
        .eq('user_id', user.id)
        .eq('conversations.is_group', false);

      if (convError) throw convError;

      if (!userConversations || userConversations.length === 0) {
        setContacts([]);
        setLoading(false);
        return;
      }

      const convoIds = userConversations.map(c => c.conversation_id);

      // Get all other members in these conversations
      const { data: otherMembers, error: membersError } = await supabase
        .from('conversation_members')
        .select('user_id, conversation_id')
        .in('conversation_id', convoIds)
        .neq('user_id', user.id);

      if (membersError) throw membersError;

      if (!otherMembers || otherMembers.length === 0) {
        setContacts([]);
        setLoading(false);
        return;
      }

      // Get latest message time for each conversation
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('conversation_id, created_at')
        .in('conversation_id', convoIds)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Map conversation to latest message time
      const convoLatestMessage = new Map<string, string>();
      for (const msg of messages || []) {
        if (!convoLatestMessage.has(msg.conversation_id)) {
          convoLatestMessage.set(msg.conversation_id, msg.created_at);
        }
      }

      // Build contact data with conversation ID
      const contactMap = new Map<string, { conversationId: string; time: string }>();
      for (const member of otherMembers) {
        const existingData = contactMap.get(member.user_id);
        const msgTime = convoLatestMessage.get(member.conversation_id) || '';
        
        // Keep the most recent conversation for each contact
        if (!existingData || (msgTime && new Date(msgTime) > new Date(existingData.time))) {
          contactMap.set(member.user_id, {
            conversationId: member.conversation_id,
            time: msgTime
          });
        }
      }

      // Sort by most recent and limit
      const sortedContacts = [...contactMap.entries()]
        .filter(([_, data]) => data.time) // Only include contacts with messages
        .sort((a, b) => new Date(b[1].time).getTime() - new Date(a[1].time).getTime())
        .slice(0, limit);

      if (sortedContacts.length === 0) {
        setContacts([]);
        setLoading(false);
        return;
      }

      // Fetch profiles
      const userIds = sortedContacts.map(([id]) => id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, username')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Build final contacts array
      const finalContacts: RecentContact[] = sortedContacts.map(([userId, data]) => {
        const profile = profiles?.find(p => p.id === userId);
        return {
          id: userId,
          email: profile?.email || '',
          full_name: profile?.full_name || null,
          avatar_url: profile?.avatar_url || null,
          username: profile?.username || null,
          last_message_at: data.time,
          conversation_id: data.conversationId
        };
      });

      setContacts(finalContacts);
    } catch (error) {
      console.error('Error fetching recent contacts:', error);
    } finally {
      setLoading(false);
    }
  }, [user, limit]);

  useEffect(() => {
    fetchRecentContacts();
  }, [fetchRecentContacts]);

  return { contacts, loading, refetch: fetchRecentContacts };
};
