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
  last_message?: any;
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
      
      // Fetch members for each conversation
      const convosWithMembers = await Promise.all(
        convos.map(async (convo: any) => {
          const { data: members } = await supabase
            .from('conversation_members')
            .select(`
              user_id,
              profiles (
                id,
                email,
                full_name,
                avatar_url
              )
            `)
            .eq('conversation_id', convo.id);

          return { ...convo, members };
        })
      );

      setConversations(convosWithMembers);
    }
    setLoading(false);
  };

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
  }, [user]);

  return { conversations, loading, refetch: fetchConversations };
};
