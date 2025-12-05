import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: any;
}

export const useMessages = (conversationId: string | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    // Fetch messages first
    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesData && messagesData.length > 0) {
      // Get unique sender IDs
      const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
      
      console.log('Fetching profiles for senderIds:', senderIds);
      
      // Fetch sender profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', senderIds);

      console.log('Profiles fetched:', profiles);
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Map profiles to messages
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const messagesWithSenders = messagesData.map(m => ({
        ...m,
        sender: profilesMap.get(m.sender_id) || null
      }));

      setMessages(messagesWithSenders);
    } else {
      setMessages([]);
    }
    setLoading(false);
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
    fetchMessages();

    if (!conversationId) return;

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          // Fetch sender profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url')
            .eq('id', newMessage.sender_id)
            .maybeSingle();
          
          const messageWithSender = {
            ...newMessage,
            sender: profile
          };
          
          setMessages((prev) => {
            // Avoid duplicates
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

  return { messages, loading, sendMessage, refetch: fetchMessages };
};
