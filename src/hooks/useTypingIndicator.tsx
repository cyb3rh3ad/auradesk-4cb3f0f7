import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TypingUser {
  userId: string;
  username: string;
}

export const useTypingIndicator = (conversationId: string | null) => {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!conversationId || !user) return;

    // Create broadcast channel for typing indicators
    const channel = supabase.channel(`typing-${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, username, isTyping } = payload.payload;
        
        // Ignore own typing events
        if (userId === user.id) return;

        setTypingUsers(prev => {
          if (isTyping) {
            // Add user if not already typing
            if (!prev.some(u => u.userId === userId)) {
              return [...prev, { userId, username }];
            }
            return prev;
          } else {
            // Remove user from typing list
            return prev.filter(u => u.userId !== userId);
          }
        });

        // Auto-remove after 10 seconds if no stop event received
        if (isTyping) {
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u.userId !== userId));
          }, 10000);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  const sendTypingEvent = useCallback(async (username: string) => {
    if (!channelRef.current || !user || !conversationId) return;

    // Only send if not already marked as typing
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      await channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user.id, username, isTyping: true }
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after 7 seconds of inactivity
    typingTimeoutRef.current = setTimeout(async () => {
      isTypingRef.current = false;
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId: user.id, username, isTyping: false }
        });
      }
    }, 7000);
  }, [user, conversationId]);

  const stopTyping = useCallback(async (username: string) => {
    if (!channelRef.current || !user) return;
    
    isTypingRef.current = false;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    await channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, username, isTyping: false }
    });
  }, [user]);

  return { typingUsers, sendTypingEvent, stopTyping };
};
