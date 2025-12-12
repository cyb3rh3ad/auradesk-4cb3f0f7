import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAIPreferences } from '@/hooks/useAIPreferences';
import { useLocalAI } from '@/hooks/useLocalAI';
import { getModelById } from '@/lib/ai-models';

type Message = { role: 'user' | 'assistant'; content: string };

export const useAIChat = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { preferences } = useAIPreferences();
  const localAI = useLocalAI();

  const sendMessage = useCallback(async (
    messages: Message[],
    onDelta: (chunk: string) => void,
    onDone: () => void,
    modelOverride?: string
  ) => {
    const modelId = modelOverride || preferences?.selected_model || 'gemini-flash-lite';
    const model = getModelById(modelId);
    const executionMode = preferences?.execution_mode || 'cloud';
    
    // Check if we should use local execution
    if (executionMode === 'local' && model?.supportsLocal && model?.localModelId) {
      return sendLocalMessage(messages, onDelta, onDone, model.localModelId);
    }
    
    // Use cloud execution
    return sendCloudMessage(messages, onDelta, onDone, modelId);
  }, [preferences, localAI]);

  const sendLocalMessage = useCallback(async (
    messages: Message[],
    onDelta: (chunk: string) => void,
    onDone: () => void,
    localModelId: string
  ) => {
    try {
      setIsLoading(true);
      
      // Load model if not already loaded
      if (localAI.currentModel !== localModelId) {
        const loaded = await localAI.loadModel(localModelId);
        if (!loaded) {
          toast({
            title: 'Local AI Unavailable',
            description: 'Falling back to cloud mode',
            variant: 'destructive',
          });
          // Fallback to cloud
          return sendCloudMessage(messages, onDelta, onDone, 'gemini-flash-lite');
        }
      }
      
      // Get the last user message
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      if (!lastUserMessage) {
        throw new Error('No user message found');
      }
      
      // Build context from previous messages
      const context = messages.slice(0, -1).map(m => 
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n');
      
      const prompt = context 
        ? `${context}\n\nUser: ${lastUserMessage.content}`
        : lastUserMessage.content;
      
      const response = await localAI.generateText(prompt);
      
      // Simulate streaming for consistency
      const words = response.split(' ');
      for (const word of words) {
        onDelta(word + ' ');
        await new Promise(r => setTimeout(r, 20));
      }
      
      onDone();
    } catch (error) {
      console.error('Local AI error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate response locally',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [localAI, toast]);

  const sendCloudMessage = useCallback(async (
    messages: Message[],
    onDelta: (chunk: string) => void,
    onDone: () => void,
    modelId: string
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
        body: JSON.stringify({ messages, model: modelId }),
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
    isLocalLoading: localAI.isModelLoading,
    localLoadingProgress: localAI.loadingProgress,
    sendMessage,
    summarize,
  };
};
