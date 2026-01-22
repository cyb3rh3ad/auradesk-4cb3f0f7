// AI Model definitions and tier restrictions

export type ExecutionMode = 'cloud' | 'local' | 'ollama';

export interface AIModel {
  id: string;
  name: string;
  description: string;
  provider: 'google' | 'openai' | 'local' | 'ollama';
  capabilities: ('text' | 'image' | 'reasoning')[];
  tier: 'free' | 'advanced' | 'professional';
  supportsLocal: boolean;
  supportsOllama?: boolean; // For Ollama desktop integration
  cloudModelId?: string; // For Lovable AI gateway
  localModelId?: string; // For HuggingFace transformers
  ollamaModelId?: string; // For Ollama local server
}

export const AI_MODELS: AIModel[] = [
  // Free tier models
  {
    id: 'gemini-flash-lite',
    name: 'Gemini Flash Lite',
    description: 'Fast and efficient for basic tasks',
    provider: 'google',
    capabilities: ['text'],
    tier: 'free',
    supportsLocal: false,
    cloudModelId: 'google/gemini-2.5-flash-lite',
  },
  {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    description: 'Fastest and most efficient for simple tasks',
    provider: 'openai',
    capabilities: ['text'],
    tier: 'free',
    supportsLocal: false,
    cloudModelId: 'openai/gpt-5-nano',
  },
  
  // Advanced tier models
  {
    id: 'gemini-flash',
    name: 'Gemini Flash',
    description: 'Balanced performance for most tasks',
    provider: 'google',
    capabilities: ['text'],
    tier: 'advanced',
    supportsLocal: false,
    cloudModelId: 'google/gemini-2.5-flash',
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    description: 'Fast and capable for general tasks',
    provider: 'openai',
    capabilities: ['text'],
    tier: 'advanced',
    supportsLocal: false,
    cloudModelId: 'openai/gpt-5-mini',
  },
  {
    id: 'local-small',
    name: 'Local: Qwen 1.5B',
    description: 'Offline AI - fast, 1.5B params',
    provider: 'local',
    capabilities: ['text'],
    tier: 'advanced',
    supportsLocal: true,
    localModelId: 'onnx-community/Qwen2.5-1.5B-Instruct',
  },
  
  // Professional tier models
  {
    id: 'gemini-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Top-tier reasoning and complex tasks',
    provider: 'google',
    capabilities: ['text', 'reasoning'],
    tier: 'professional',
    supportsLocal: false,
    cloudModelId: 'google/gemini-2.5-pro',
  },
  {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro (Preview)',
    description: 'Next-generation AI model',
    provider: 'google',
    capabilities: ['text', 'reasoning'],
    tier: 'professional',
    supportsLocal: false,
    cloudModelId: 'google/gemini-3-pro-preview',
  },
  {
    id: 'gemini-image',
    name: 'Gemini Image Generator',
    description: 'Generate images from text prompts',
    provider: 'google',
    capabilities: ['image'],
    tier: 'professional',
    supportsLocal: false,
    cloudModelId: 'google/gemini-2.5-flash-image-preview',
  },
  {
    id: 'gpt-5',
    name: 'GPT-5',
    description: 'Most powerful reasoning and analysis',
    provider: 'openai',
    capabilities: ['text', 'reasoning'],
    tier: 'professional',
    supportsLocal: false,
    cloudModelId: 'openai/gpt-5',
  },
  {
    id: 'local-large',
    name: 'Local: Llama 8B',
    description: 'Offline AI - powerful, 8B params',
    provider: 'local',
    capabilities: ['text', 'reasoning'],
    tier: 'professional',
    supportsLocal: true,
    localModelId: 'onnx-community/Llama-3.1-8B-Instruct',
  },
  
  // Ollama models (desktop offline)
  {
    id: 'ollama-llama3',
    name: 'Ollama: Llama 3.2',
    description: 'Offline AI - fast and capable',
    provider: 'ollama',
    capabilities: ['text'],
    tier: 'free',
    supportsLocal: false,
    supportsOllama: true,
    ollamaModelId: 'llama3.2:3b',
  },
  {
    id: 'ollama-mistral',
    name: 'Ollama: Mistral',
    description: 'Offline AI - powerful reasoning',
    provider: 'ollama',
    capabilities: ['text', 'reasoning'],
    tier: 'free',
    supportsLocal: false,
    supportsOllama: true,
    ollamaModelId: 'mistral:7b',
  },
  {
    id: 'ollama-phi3',
    name: 'Ollama: Phi-3',
    description: 'Offline AI - compact and efficient',
    provider: 'ollama',
    capabilities: ['text'],
    tier: 'free',
    supportsLocal: false,
    supportsOllama: true,
    ollamaModelId: 'phi3:mini',
  },
  {
    id: 'ollama-custom',
    name: 'Ollama: Custom Model',
    description: 'Use any Ollama model you have installed',
    provider: 'ollama',
    capabilities: ['text'],
    tier: 'free',
    supportsLocal: false,
    supportsOllama: true,
    ollamaModelId: '', // Will be set dynamically
  },
];

export type SubscriptionPlan = 'free' | 'advanced' | 'professional';

export const getAvailableModels = (plan: SubscriptionPlan): AIModel[] => {
  const tierPriority: Record<string, number> = {
    free: 1,
    advanced: 2,
    professional: 3,
  };
  
  const userTierLevel = tierPriority[plan];
  
  return AI_MODELS.filter(model => {
    const modelTierLevel = tierPriority[model.tier];
    return modelTierLevel <= userTierLevel;
  });
};

export const canUseLocalExecution = (plan: SubscriptionPlan): boolean => {
  return plan === 'advanced' || plan === 'professional';
};

export const getModelById = (id: string): AIModel | undefined => {
  return AI_MODELS.find(model => model.id === id);
};

export const getOllamaModels = (): AIModel[] => {
  return AI_MODELS.filter(model => model.provider === 'ollama');
};

export const getDefaultModelForPlan = (plan: SubscriptionPlan): string => {
  switch (plan) {
    case 'professional':
      return 'gemini-pro';
    case 'advanced':
      return 'gemini-flash';
    default:
      return 'gemini-flash-lite';
  }
};
