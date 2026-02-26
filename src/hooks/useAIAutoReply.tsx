import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseAIAutoReplyReturn {
  generateReply: (conversationId: string) => Promise<string | null>;
  isGenerating: boolean;
  lastReply: string | null;
}

export const useAIAutoReply = (): UseAIAutoReplyReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastReply, setLastReply] = useState<string | null>(null);

  const generateReply = useCallback(async (conversationId: string): Promise<string | null> => {
    if (!conversationId) return null;

    setIsGenerating(true);
    setLastReply(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-auto-reply', {
        body: { conversationId, messageCount: 30 },
      });

      if (error) {
        console.error('AI auto-reply error:', error);
        toast.error('Failed to generate reply', {
          description: error.message || 'Please try again',
        });
        return null;
      }

      if (data?.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('Too many requests', { description: 'Please wait a moment and try again.' });
        } else if (data.error.includes('usage limit') || data.error.includes('credits')) {
          toast.error('AI credits exhausted', { description: 'Add credits to continue using AI features.' });
        } else {
          toast.error('AI Error', { description: data.error });
        }
        return null;
      }

      const reply = data?.reply;
      if (reply) {
        setLastReply(reply);
        return reply;
      }

      toast.error('Could not generate a reply');
      return null;
    } catch (err) {
      console.error('AI auto-reply failed:', err);
      toast.error('Failed to generate reply');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generateReply, isGenerating, lastReply };
};
