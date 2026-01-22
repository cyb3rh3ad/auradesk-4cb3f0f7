import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Conversation {
  id: string;
  name: string | null;
  is_group: boolean;
  created_at: string;
  updated_at: string;
  members?: any[];
  last_message?: any;
}

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const { data: conversationMembers } = await supabase
      .from('conversation_members')
      .select(`
        conversation_id,
        conversations (
          id,
          name,
          is_group,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id);

    if (conversationMembers) {
      const convos = conversationMembers
        .map((cm: any) => cm.conversations)
        .filter(Boolean);
      
      // Get all conversation IDs in one batch
      const convoIds = convos.map((c: any) => c.id);
      
      if (convoIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Batch fetch all members for all conversations
      const { data: allMembers } = await supabase
        .from('conversation_members')
        .select('conversation_id, user_id')
        .in('conversation_id', convoIds);

      // Batch fetch all relevant profiles
      const userIds = [...new Set((allMembers || []).map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Map members to conversations
      const convosWithMembers = convos.map((convo: any) => {
        const members = (allMembers || [])
          .filter(m => m.conversation_id === convo.id)
          .map(m => ({
            user_id: m.user_id,
            profiles: profileMap.get(m.user_id) || null
          }));
        return { ...convo, members };
      });

      setConversations(convosWithMembers);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();

    // Subscribe to new conversation members
    const channel = supabase
      .channel('conversation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_members',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
};
