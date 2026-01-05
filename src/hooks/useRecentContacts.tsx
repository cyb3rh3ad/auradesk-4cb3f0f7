import { useEffect, useState } from 'react';
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

  useEffect(() => {
    const fetchRecentContacts = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get recent messages sent by or to the user
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select(`
            sender_id,
            created_at,
            conversation_id
          `)
          .order('created_at', { ascending: false })
          .limit(100);

        if (messagesError) throw messagesError;

        // Get conversations where user is a member
        const { data: userConversations, error: convError } = await supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', user.id);

        if (convError) throw convError;

        const userConvoIds = new Set(userConversations?.map(c => c.conversation_id) || []);

        // Filter messages to only those in user's conversations
        const relevantMessages = messages?.filter(m => userConvoIds.has(m.conversation_id)) || [];

        // Get unique user IDs from messages (excluding current user) with their conversation
        const userIdsWithData = new Map<string, { time: string; conversationId: string }>();
        
        for (const msg of relevantMessages) {
          if (msg.sender_id !== user.id && !userIdsWithData.has(msg.sender_id)) {
            userIdsWithData.set(msg.sender_id, { 
              time: msg.created_at, 
              conversationId: msg.conversation_id 
            });
          }
        }

        // Also check for other members in the conversations where current user sent messages
        const convoIdsFromMessages = [...new Set(relevantMessages.map(m => m.conversation_id))];
        
        if (convoIdsFromMessages.length > 0) {
          const { data: otherMembers } = await supabase
            .from('conversation_members')
            .select('user_id, conversation_id')
            .in('conversation_id', convoIdsFromMessages)
            .neq('user_id', user.id);

          // Add other conversation members with their latest message time
          for (const member of otherMembers || []) {
            if (!userIdsWithData.has(member.user_id)) {
              const convoMessages = relevantMessages.filter(m => m.conversation_id === member.conversation_id);
              if (convoMessages.length > 0) {
                userIdsWithData.set(member.user_id, { 
                  time: convoMessages[0].created_at,
                  conversationId: member.conversation_id
                });
              }
            }
          }
        }

        // Get top contacts by most recent interaction
        const sortedUserIds = [...userIdsWithData.entries()]
          .sort((a, b) => new Date(b[1].time).getTime() - new Date(a[1].time).getTime())
          .slice(0, limit)
          .map(([id]) => id);

        if (sortedUserIds.length === 0) {
          setContacts([]);
          setLoading(false);
          return;
        }

        // Fetch profiles for these users
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url, username')
          .in('id', sortedUserIds);

        if (profilesError) throw profilesError;

        // Map profiles with their last message time and conversation ID, then sort
        const contactsWithTime: RecentContact[] = (profiles || [])
          .map(profile => {
            const data = userIdsWithData.get(profile.id);
            return {
              ...profile,
              last_message_at: data?.time || '',
              conversation_id: data?.conversationId || null
            };
          })
          .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

        setContacts(contactsWithTime);
      } catch (error) {
        console.error('Error fetching recent contacts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentContacts();
  }, [user, limit]);

  return { contacts, loading };
};
