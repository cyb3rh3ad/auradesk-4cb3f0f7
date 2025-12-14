import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export const useAIChatSessions = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      return;
    }

    setSessions(data || []);
    setLoading(false);
  }, [user]);

  const fetchMessages = useCallback(async (sessionId: string) => {
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    const typedMessages: ChatMessage[] = (data || []).map(m => ({
      ...m,
      role: m.role as 'user' | 'assistant'
    }));
    setMessages(typedMessages);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (currentSessionId) {
      fetchMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId, fetchMessages]);

  const createSession = async (initialTitle?: string): Promise<string | null> => {
    if (!user) return null;

    // Immediately clear messages and set a temp session for instant feedback
    setMessages([]);
    
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .insert({ user_id: user.id, title: initialTitle || 'New Chat' })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create chat', variant: 'destructive' });
      return null;
    }

    setSessions(prev => [data, ...prev]);
    setCurrentSessionId(data.id);
    return data.id;
  };

  const renameSession = async (sessionId: string, newTitle: string) => {
    const { error } = await supabase
      .from('ai_chat_sessions')
      .update({ title: newTitle })
      .eq('id', sessionId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to rename chat', variant: 'destructive' });
      return;
    }

    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: newTitle } : s));
  };

  const deleteSession = async (sessionId: string) => {
    const { error } = await supabase
      .from('ai_chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete chat', variant: 'destructive' });
      return;
    }

    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
  };

  const addMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!currentSessionId) return;

    const { data, error } = await supabase
      .from('ai_chat_messages')
      .insert({ session_id: currentSessionId, role, content })
      .select()
      .single();

    if (error) {
      console.error('Error adding message:', error);
      return;
    }

    const typedMessage: ChatMessage = {
      ...data,
      role: data.role as 'user' | 'assistant'
    };
    setMessages(prev => [...prev, typedMessage]);

    // Update session title if it's the first user message
    if (role === 'user' && messages.length === 0) {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      await renameSession(currentSessionId, title);
    }

    // Update session's updated_at
    await supabase
      .from('ai_chat_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentSessionId);
  };

  const updateLastAssistantMessage = (content: string) => {
    setMessages(prev => {
      const lastIndex = prev.length - 1;
      if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
        return prev.map((m, i) => i === lastIndex ? { ...m, content } : m);
      }
      return [...prev, { id: 'temp', session_id: currentSessionId!, role: 'assistant' as const, content, created_at: new Date().toISOString() }];
    });
  };

  const saveAssistantMessage = async (content: string) => {
    if (!currentSessionId) return;

    // Remove temp message and add real one
    setMessages(prev => prev.filter(m => m.id !== 'temp'));
    await addMessage('assistant', content);
  };

  return {
    sessions,
    currentSessionId,
    messages,
    loading,
    setCurrentSessionId,
    createSession,
    renameSession,
    deleteSession,
    addMessage,
    updateLastAssistantMessage,
    saveAssistantMessage,
  };
};
