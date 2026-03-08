import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Conversation {
  id: string;
  name: string | null;
  is_group: boolean;
  created_at: string;
  updated_at: string;
  members?: any[];
  last_message?: { content: string; created_at: string; sender_id: string } | null;
}

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
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
      
      if (convos.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convoIds = convos.map((c: any) => c.id);

      // Batch-fetch all members for all conversations in one query
      const { data: allMembers } = await supabase
        .from('conversation_members')
        .select('conversation_id, user_id')
        .in('conversation_id', convoIds);

      // Batch-fetch all unique profiles in one query
      const uniqueUserIds = [...new Set((allMembers || []).map(m => m.user_id))];
      const { data: profiles } = uniqueUserIds.length > 0
        ? await supabase.from('profiles').select('id, email, full_name, avatar_url').in('id', uniqueUserIds)
        : { data: [] };

      const profilesMap = new Map((profiles || []).map(p => [p.id, p]));

      // Fetch the latest message per conversation (one query with ordering)
      const lastMessagesMap = new Map<string, { content: string; created_at: string; sender_id: string }>();
      for (const convoId of convoIds) {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at, sender_id')
          .eq('conversation_id', convoId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastMsg) {
          lastMessagesMap.set(convoId, lastMsg);
        }
      }

      const convosWithMembers = convos.map((convo: any) => {
        const members = (allMembers || [])
          .filter(m => m.conversation_id === convo.id)
          .map(m => ({
            user_id: m.user_id,
            profiles: profilesMap.get(m.user_id) || null,
          }));
        return { ...convo, members, last_message: lastMessagesMap.get(convo.id) || null };
      });

      // Sort by last message timestamp, most recent first
      convosWithMembers.sort((a: Conversation, b: Conversation) => {
        const aTime = a.last_message?.created_at || a.updated_at;
        const bTime = b.last_message?.created_at || b.updated_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(convosWithMembers);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();

    if (!user?.id) return;

    // Subscribe to new conversation members and new messages
    const channel = supabase
      .channel('conversation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_members',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return { conversations, loading, refetch: fetchConversations };
};
