import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Tracks unread message counts per conversation
export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [totalUnread, setTotalUnread] = useState(0);
  const [readTimestamps, setReadTimestamps] = useState<Map<string, string>>(new Map());

  // Mark a conversation as read (stores timestamp)
  const markAsRead = useCallback((conversationId: string) => {
    const now = new Date().toISOString();
    setReadTimestamps(prev => {
      const next = new Map(prev);
      next.set(conversationId, now);
      // Persist to localStorage
      try {
        const stored = JSON.parse(localStorage.getItem(`unread_ts_${user?.id}`) || '{}');
        stored[conversationId] = now;
        localStorage.setItem(`unread_ts_${user?.id}`, JSON.stringify(stored));
      } catch {}
      return next;
    });
    setUnreadCounts(prev => {
      const next = new Map(prev);
      next.delete(conversationId);
      const total = Array.from(next.values()).reduce((sum, v) => sum + v, 0);
      setTotalUnread(total);
      return next;
    });
  }, [user?.id]);

  // Load saved read timestamps from localStorage
  useEffect(() => {
    if (!user) return;
    try {
      const stored = JSON.parse(localStorage.getItem(`unread_ts_${user.id}`) || '{}');
      setReadTimestamps(new Map(Object.entries(stored)));
    } catch {}
  }, [user?.id]);

  // Fetch unread counts for all conversations
  const fetchUnread = useCallback(async () => {
    if (!user) return;

    // Get all conversation IDs the user is part of
    const { data: memberships } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (!memberships || memberships.length === 0) {
      setUnreadCounts(new Map());
      setTotalUnread(0);
      return;
    }

    const convoIds = memberships.map(m => m.conversation_id);
    const storedTimestamps = new Map(readTimestamps);

    // For each conversation, count messages after the read timestamp
    const counts = new Map<string, number>();
    
    // Batch query: get all messages not sent by user, grouped by conversation
    const { data: messages } = await supabase
      .from('messages')
      .select('conversation_id, created_at, sender_id')
      .in('conversation_id', convoIds)
      .neq('sender_id', user.id)
      .order('created_at', { ascending: false });

    if (messages) {
      for (const msg of messages) {
        const readTs = storedTimestamps.get(msg.conversation_id);
        if (!readTs || new Date(msg.created_at) > new Date(readTs)) {
          counts.set(msg.conversation_id, (counts.get(msg.conversation_id) || 0) + 1);
        }
      }
    }

    setUnreadCounts(counts);
    setTotalUnread(Array.from(counts.values()).reduce((sum, v) => sum + v, 0));
  }, [user, readTimestamps]);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  // Subscribe to new messages to update counts in real-time
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unread-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id === user.id) return; // Don't count own messages
        
        setUnreadCounts(prev => {
          const next = new Map(prev);
          next.set(msg.conversation_id, (next.get(msg.conversation_id) || 0) + 1);
          const total = Array.from(next.values()).reduce((sum, v) => sum + v, 0);
          setTotalUnread(total);
          return next;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const getUnreadCount = useCallback((conversationId: string): number => {
    return unreadCounts.get(conversationId) || 0;
  }, [unreadCounts]);

  return { unreadCounts, totalUnread, getUnreadCount, markAsRead, refetch: fetchUnread };
};
