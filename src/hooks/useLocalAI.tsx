import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { isElectron } from '@/lib/supabase-config';

interface LocalAIState {
  isLoading: boolean;
  isModelLoading: boolean;
  loadingProgress: number;
  currentModel: string | null;
  error: string | null;
  executionDevice: 'webgpu' | 'wasm' | null;
}

export const useLocalAI = () => {
  const [state, setState] = useState<LocalAIState>({
    isLoading: false,
    isModelLoading: false,
    loadingProgress: 0,
    currentModel: null,
    error: null,
    executionDevice: null,
  });
  
  // Use any type to avoid complex union type issues with HuggingFace transformers
  const generatorRef = useRef<any>(null);
  const { toast } = useToast();

  const loadModel = useCallback(async (modelId: string) => {
    if (state.currentModel === modelId && generatorRef.current) {
      return true;
    }

    setState(prev => ({ 
      ...prev, 
      isModelLoading: true, 
      loadingProgress: 0,
      error: null 
    }));

    try {
      // Check if WebGPU is available
      const hasWebGPU = 'gpu' in navigator;
      const inElectron = isElectron();
      
      // Determine the best device to use
      // In Electron or when WebGPU isn't available, use WASM (CPU)
      const device = hasWebGPU && !inElectron ? 'webgpu' : 'wasm';
      
      toast({
        title: 'Loading Local AI Model',
        description: device === 'wasm' 
          ? 'Using CPU mode (slower but works offline)...' 
          : 'This may take a moment on first use...',
      });

      // Dynamically import to avoid SSR issues
      const { pipeline } = await import('@huggingface/transformers');

      // Create the pipeline with appropriate device
      // For WASM/CPU mode, we don't specify device (defaults to CPU)
      const pipelineOptions: any = {
        progress_callback: (progress: any) => {
          if (progress.status === 'downloading' || progress.status === 'progress') {
            const percent = progress.total 
              ? Math.round((progress.loaded / progress.total) * 100)
              : progress.progress 
                ? Math.round(progress.progress * 100)
                : 0;
            setState(prev => ({ ...prev, loadingProgress: Math.min(percent, 99) }));
          }
        },
      };

      // Only use WebGPU if available and not in Electron
      if (device === 'webgpu') {
        pipelineOptions.device = 'webgpu';
      }

      generatorRef.current = await pipeline('text-generation', modelId, pipelineOptions);

      setState(prev => ({ 
        ...prev, 
        isModelLoading: false, 
        loadingProgress: 100,
        currentModel: modelId,
        executionDevice: device,
      }));

      toast({
        title: 'Model Loaded',
        description: `Local AI ready (${device === 'webgpu' ? 'GPU accelerated' : 'CPU mode'})`,
      });

      return true;
    } catch (error) {
      console.error('Failed to load local model:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to load model';
      
      setState(prev => ({ 
        ...prev, 
        isModelLoading: false, 
        error: errorMessage 
      }));

      toast({
        title: 'Model Load Failed',
        description: 'Could not load the local AI model. Try using cloud mode instead.',
        variant: 'destructive',
      });

      return false;
    }
  }, [state.currentModel, toast]);

  const generateText = useCallback(async (
    prompt: string,
    systemPrompt?: string
  ): Promise<string> => {
    if (!generatorRef.current) {
      throw new Error('Model not loaded');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const fullPrompt = systemPrompt 
        ? `System: ${systemPrompt}\n\nUser: ${prompt}\n\nAssistant:`
        : `User: ${prompt}\n\nAssistant:`;

      const result = await generatorRef.current(fullPrompt, {
        max_new_tokens: 512,
        temperature: 0.7,
        do_sample: true,
        top_p: 0.9,
      });

      const generatedText = Array.isArray(result) 
        ? result[0]?.generated_text || ''
        : '';

      // Extract just the assistant's response
      const assistantResponse = generatedText.split('Assistant:').pop()?.trim() || generatedText;

      setState(prev => ({ ...prev, isLoading: false }));
      return assistantResponse;
    } catch (error) {
      console.error('Local generation error:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : 'Generation failed'
      }));
      throw error;
    }
  }, []);

  const isWebGPUSupported = useCallback((): boolean => {
    return 'gpu' in navigator;
  }, []);

  // Check if local AI can work (either via WebGPU or WASM fallback)
  const isLocalAISupported = useCallback((): boolean => {
    // WASM is always available, so local AI should always work
    return true;
  }, []);

  const unloadModel = useCallback(() => {
    generatorRef.current = null;
    setState({
      isLoading: false,
      isModelLoading: false,
      loadingProgress: 0,
      currentModel: null,
      error: null,
      executionDevice: null,
    });
  }, []);

  return {
    ...state,
    loadModel,
    generateText,
    unloadModel,
    isWebGPUSupported,
    isLocalAISupported,
  };
};
