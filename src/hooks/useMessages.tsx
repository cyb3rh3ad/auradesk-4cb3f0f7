import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { playMessageNotification } from '@/utils/notificationSound';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
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
      const { toast } = await import('@/hooks/use-toast').then(m => ({ toast: m.toast }));
      toast({
        title: 'Message failed',
        description: 'Could not send your message. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    // Send push notification to other members (fire-and-forget)
    try {
      const { data: members } = await supabase
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id);

      if (members && members.length > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .maybeSingle();

        const senderName = profile?.full_name || profile?.email || 'Someone';
        const recipientIds = members.map(m => m.user_id);

        supabase.functions.invoke('send-push-notification', {
          body: {
            userIds: recipientIds,
            title: senderName,
            body: content.length > 100 ? content.substring(0, 100) + '…' : content,
            data: { type: 'message', conversationId },
          },
        }).catch(err => console.log('Push notification skipped:', err));
      }
    } catch (e) {
      // Non-critical, don't block
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('messages')
      .update({ content: newContent, edited_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', user.id);
    if (error) {
      console.error('Error editing message:', error);
      const { toast } = await import('@/hooks/use-toast').then(m => ({ toast: m.toast }));
      toast({ title: 'Edit failed', description: 'Could not edit message.', variant: 'destructive' });
    } else {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: newContent, edited_at: new Date().toISOString() } : m));
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('sender_id', user.id);
    if (error) {
      console.error('Error deleting message:', error);
    } else {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, deleted_at: new Date().toISOString(), content: '' } : m));
    }
  };

  useEffect(() => {
    fetchMessages();

    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Message;
            setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, content: updated.content, edited_at: updated.edited_at, deleted_at: updated.deleted_at } : m));
            return;
          }
          
          const newMessage = payload.new as Message;
          
          if (newMessage.sender_id !== user?.id) {
            playMessageNotification();
          }
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, full_name, avatar_url')
            .eq('id', newMessage.sender_id)
            .maybeSingle();
          
          const messageWithSender = { ...newMessage, sender: profile };
          
          setMessages((prev) => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, messageWithSender];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return { messages, loading, sendMessage, editMessage, deleteMessage, refetch: fetchMessages };
};
