import { useState, useCallback } from 'react';
import { generateChatResponse, generateSummary, initializeChatModel, initializeSummaryModel } from '@/utils/localAI';
import { useToast } from '@/hooks/use-toast';

export const useLocalAI = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const initialize = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      setIsLoading(true);
      await initializeChatModel();
      setIsInitialized(true);
      toast({
        title: 'AI Ready',
        description: 'Local AI model loaded successfully',
      });
    } catch (error) {
      console.error('Failed to initialize AI:', error);
      toast({
        title: 'AI Initialization Failed',
        description: 'Failed to load local AI model. Please check your browser compatibility.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, toast]);

  const chat = useCallback(async (
    messages: Array<{ role: string; content: string }>
  ): Promise<string> => {
    if (!isInitialized) {
      await initialize();
    }
    
    try {
      setIsLoading(true);
      const response = await generateChatResponse(messages);
      return response;
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Chat Error',
        description: 'Failed to generate response',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, initialize, toast]);

  const summarize = useCallback(async (text: string): Promise<string> => {
    try {
      setIsLoading(true);
      await initializeSummaryModel();
      const summary = await generateSummary(text);
      return summary;
    } catch (error) {
      console.error('Summarization error:', error);
      toast({
        title: 'Summarization Error',
        description: 'Failed to generate summary',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    isInitialized,
    isLoading,
    initialize,
    chat,
    summarize,
  };
};
