import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

type Message = { role: 'user' | 'assistant'; content: string };

export const useAIChat = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = useCallback(async (
    messages: Message[],
    onDelta: (chunk: string) => void,
    onDone: () => void
  ) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
    
    try {
      setIsLoading(true);
      
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages }),
      });

      if (resp.status === 429) {
        toast({
          title: 'Rate Limit Exceeded',
          description: 'Please try again in a moment',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (resp.status === 402) {
        toast({
          title: 'Usage Limit Reached',
          description: 'Please add credits to continue using AI features',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      if (!resp.ok || !resp.body) {
        throw new Error('Failed to start stream');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) onDelta(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) onDelta(content);
          } catch { /* ignore */ }
        }
      }

      onDone();
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Error',
        description: 'Failed to communicate with AI',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const summarize = useCallback(async (text: string): Promise<string> => {
    const SUMMARIZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/summarize`;
    
    try {
      setIsLoading(true);
      
      const resp = await fetch(SUMMARIZE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text }),
      });

      if (resp.status === 429) {
        toast({
          title: 'Rate Limit Exceeded',
          description: 'Please try again in a moment',
          variant: 'destructive',
        });
        return '';
      }

      if (resp.status === 402) {
        toast({
          title: 'Usage Limit Reached',
          description: 'Please add credits to continue using AI features',
          variant: 'destructive',
        });
        return '';
      }

      if (!resp.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await resp.json();
      return data.summary || '';
    } catch (error) {
      console.error('Summarization error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate summary',
        variant: 'destructive',
      });
      return '';
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    isLoading,
    sendMessage,
    summarize,
  };
};
