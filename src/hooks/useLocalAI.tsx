import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface LocalAIState {
  isLoading: boolean;
  isModelLoading: boolean;
  loadingProgress: number;
  currentModel: string | null;
  error: string | null;
}

export const useLocalAI = () => {
  const [state, setState] = useState<LocalAIState>({
    isLoading: false,
    isModelLoading: false,
    loadingProgress: 0,
    currentModel: null,
    error: null,
  });
  
  // Use any type to avoid complex union type issues with HuggingFace transformers
  const generatorRef = useRef<any>(null);
  const { toast } = useToast();

  const loadModel = useCallback(async (modelId: string) => {
    // Check for Electron environment first
    const isElectron = typeof window !== 'undefined' && 
      ((window as any).electronAPI?.isElectron || window.location.protocol === 'file:');
    
    // Check for Capacitor/mobile environment
    const isCapacitor = typeof window !== 'undefined' && 
      !!(window as any).Capacitor?.isNativePlatform?.();
    
    if (isElectron) {
      setState(prev => ({ 
        ...prev, 
        error: 'Local AI is not available in the desktop app. Please use cloud mode.' 
      }));
      toast({
        title: 'Local AI Unavailable',
        description: 'Local AI requires WebGPU which is not available in the desktop app. Using cloud mode instead.',
        variant: 'destructive',
      });
      return false;
    }
    
    if (isCapacitor) {
      setState(prev => ({ 
        ...prev, 
        error: 'Local AI is not available on mobile devices. Please use cloud mode.' 
      }));
      toast({
        title: 'Local AI Unavailable',
        description: 'Mobile devices do not support local AI processing. Using cloud mode instead.',
        variant: 'destructive',
      });
      return false;
    }

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
      // Check WebGPU support
      if (!('gpu' in navigator)) {
        throw new Error('WebGPU is not supported in this browser');
      }

      toast({
        title: 'Loading Local AI Model',
        description: 'This may take a moment on first use...',
      });

      // Dynamically import to avoid SSR issues
      const { pipeline } = await import('@huggingface/transformers');

      // Create the pipeline with progress callback
      generatorRef.current = await pipeline('text-generation', modelId, {
        device: 'webgpu',
        progress_callback: (progress: any) => {
          if (progress.status === 'downloading') {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setState(prev => ({ ...prev, loadingProgress: percent }));
          }
        },
      });

      setState(prev => ({ 
        ...prev, 
        isModelLoading: false, 
        loadingProgress: 100,
        currentModel: modelId 
      }));

      toast({
        title: 'Model Loaded',
        description: 'Local AI is ready to use',
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
        description: 'Your browser may not support WebGPU. Try using cloud mode instead.',
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
    // Check if we're in Electron or if WebGPU is not available
    const isElectron = typeof window !== 'undefined' && 
      ((window as any).electronAPI?.isElectron || window.location.protocol === 'file:');
    
    // Check for Capacitor/mobile environment
    const isCapacitor = typeof window !== 'undefined' && 
      !!(window as any).Capacitor?.isNativePlatform?.();
    
    // WebGPU is not available in Electron or mobile apps
    if (isElectron || isCapacitor) {
      return false;
    }
    
    return 'gpu' in navigator;
  }, []);

  const unloadModel = useCallback(() => {
    generatorRef.current = null;
    setState({
      isLoading: false,
      isModelLoading: false,
      loadingProgress: 0,
      currentModel: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    loadModel,
    generateText,
    unloadModel,
    isWebGPUSupported,
  };
};
