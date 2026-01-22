import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { isElectron } from '@/lib/supabase-config';

const OLLAMA_BASE_URL = 'http://localhost:11434';

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

interface OllamaState {
  isConnected: boolean;
  isLoading: boolean;
  isCheckingConnection: boolean;
  availableModels: OllamaModel[];
  currentModel: string | null;
  error: string | null;
}

export const useOllamaAI = () => {
  const [state, setState] = useState<OllamaState>({
    isConnected: false,
    isLoading: false,
    isCheckingConnection: false,
    availableModels: [],
    currentModel: null,
    error: null,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  // Check if Ollama is available
  const checkConnection = useCallback(async (): Promise<boolean> => {
    // Only works in Electron desktop app
    if (!isElectron()) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        error: 'Ollama is only available in the desktop app',
      }));
      return false;
    }

    setState(prev => ({ ...prev, isCheckingConnection: true, error: null }));

    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error('Ollama server not responding');
      }

      const data = await response.json();
      const models: OllamaModel[] = data.models || [];

      setState(prev => ({
        ...prev,
        isConnected: true,
        isCheckingConnection: false,
        availableModels: models,
        error: null,
      }));

      return true;
    } catch (error) {
      console.log('Ollama connection check failed:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
        isCheckingConnection: false,
        availableModels: [],
        error: 'Ollama is not running. Please start Ollama to use offline AI.',
      }));
      return false;
    }
  }, []);

  // Refresh available models
  const refreshModels = useCallback(async () => {
    const connected = await checkConnection();
    if (connected) {
      toast({
        title: 'Ollama Connected',
        description: `Found ${state.availableModels.length} models`,
      });
    }
    return connected;
  }, [checkConnection, toast, state.availableModels.length]);

  // Pull a model from Ollama registry
  const pullModel = useCallback(async (modelName: string, onProgress?: (status: string) => void): Promise<boolean> => {
    if (!state.isConnected) {
      toast({
        title: 'Ollama Not Connected',
        description: 'Please make sure Ollama is running',
        variant: 'destructive',
      });
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName, stream: true }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to pull model');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.status) {
              onProgress?.(data.status);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      // Refresh models list
      await checkConnection();

      toast({
        title: 'Model Downloaded',
        description: `${modelName} is ready to use`,
      });

      setState(prev => ({ ...prev, isLoading: false }));
      return true;
    } catch (error) {
      console.error('Failed to pull model:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to download model',
      }));
      toast({
        title: 'Download Failed',
        description: 'Failed to download the model',
        variant: 'destructive',
      });
      return false;
    }
  }, [state.isConnected, checkConnection, toast]);

  // Generate text with streaming
  const generateText = useCallback(async (
    prompt: string,
    modelName: string,
    systemPrompt?: string,
    onDelta?: (chunk: string) => void
  ): Promise<string> => {
    if (!state.isConnected) {
      throw new Error('Ollama is not connected');
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, isLoading: true, error: null, currentModel: modelName }));

    try {
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to generate response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              fullResponse += data.message.content;
              onDelta?.(data.message.content);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return fullResponse;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setState(prev => ({ ...prev, isLoading: false }));
        return '';
      }

      console.error('Ollama generation error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Generation failed',
      }));
      throw error;
    }
  }, [state.isConnected]);

  // Send chat messages with full context
  const sendChatMessage = useCallback(async (
    messages: { role: 'user' | 'assistant' | 'system'; content: string }[],
    modelName: string,
    onDelta?: (chunk: string) => void
  ): Promise<string> => {
    if (!state.isConnected) {
      throw new Error('Ollama is not connected');
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, isLoading: true, error: null, currentModel: modelName }));

    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to generate response: ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              fullResponse += data.message.content;
              onDelta?.(data.message.content);
            }
          } catch {
            // Ignore parse errors for incomplete JSON
          }
        }
      }

      setState(prev => ({ ...prev, isLoading: false }));
      return fullResponse;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setState(prev => ({ ...prev, isLoading: false }));
        return '';
      }

      console.error('Ollama chat error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Chat failed',
      }));
      throw error;
    }
  }, [state.isConnected]);

  // Cancel ongoing generation
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState(prev => ({ ...prev, isLoading: false }));
  }, []);

  // Check connection on mount if in Electron
  useEffect(() => {
    if (isElectron()) {
      checkConnection();
    }
  }, [checkConnection]);

  // Format model size for display
  const formatModelSize = useCallback((bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return `${gb.toFixed(1)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  }, []);

  return {
    ...state,
    checkConnection,
    refreshModels,
    pullModel,
    generateText,
    sendChatMessage,
    cancelGeneration,
    formatModelSize,
    isOllamaAvailable: isElectron(),
  };
};

// Recommended models for users
export const RECOMMENDED_OLLAMA_MODELS = [
  {
    name: 'llama3.2:3b',
    displayName: 'Llama 3.2 (3B)',
    description: 'Fast and efficient, great for most tasks',
    size: '2 GB',
  },
  {
    name: 'llama3.2:1b',
    displayName: 'Llama 3.2 (1B)',
    description: 'Lightweight, very fast responses',
    size: '1.3 GB',
  },
  {
    name: 'mistral:7b',
    displayName: 'Mistral (7B)',
    description: 'Powerful reasoning and coding',
    size: '4.1 GB',
  },
  {
    name: 'phi3:mini',
    displayName: 'Phi-3 Mini',
    description: 'Microsoft\'s compact but capable model',
    size: '2.3 GB',
  },
  {
    name: 'gemma2:2b',
    displayName: 'Gemma 2 (2B)',
    description: 'Google\'s efficient small model',
    size: '1.6 GB',
  },
  {
    name: 'qwen2.5:3b',
    displayName: 'Qwen 2.5 (3B)',
    description: 'Excellent multilingual support',
    size: '2 GB',
  },
];
