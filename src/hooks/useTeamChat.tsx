import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TeamMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

export const useTeamChat = (teamId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get or create team conversation
  const getOrCreateConversation = async () => {
    if (!teamId || !user) return null;

    // First, try to find existing team conversation
    const { data: existing, error: findError } = await supabase
      .from('conversations')
      .select('id')
      .eq('team_id', teamId)
      .maybeSingle();

    if (findError) {
      console.error('Error finding team conversation:', findError);
      return null;
    }

    if (existing) {
      return existing.id;
    }

    // Create new conversation for the team
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        team_id: teamId,
        is_group: true,
        name: 'Team Chat',
        created_by: user.id,
      })
      .select('id')
      .single();

    if (createError) {
      console.error('Error creating team conversation:', createError);
      return null;
    }

    return newConv.id;
  };

  const fetchMessages = async (convId: string) => {
    const { data: messagesData, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    if (messagesData && messagesData.length > 0) {
      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, username')
        .in('id', senderIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const messagesWithSenders = messagesData.map(m => ({
        ...m,
        sender: profilesMap.get(m.sender_id) || null
      }));

      setMessages(messagesWithSenders);
    } else {
      setMessages([]);
    }
  };

  const sendMessage = async (content: string) => {
    if (!conversationId || !user) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
      });

    if (error) {
      console.error('Error sending message:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const convId = await getOrCreateConversation();
      if (convId) {
        setConversationId(convId);
        await fetchMessages(convId);
      }
      setLoading(false);
    };

    if (teamId) {
      init();
    } else {
      setMessages([]);
      setConversationId(null);
      setLoading(false);
    }
  }, [teamId, user]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`team-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as TeamMessage;
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url, username')
            .eq('id', newMessage.sender_id)
            .maybeSingle();
          
          const messageWithSender = {
            ...newMessage,
            sender: profile
          };
          
          setMessages((prev) => {
            if (prev.some(m => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, messageWithSender];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, loading, sendMessage, conversationId };
};
