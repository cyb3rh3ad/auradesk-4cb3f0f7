// AI Model definitions and tier restrictions

export type ExecutionMode = 'cloud' | 'local';

export interface AIModel {
  id: string;
  name: string;
  description: string;
  provider: 'google' | 'openai' | 'local';
  capabilities: ('text' | 'image' | 'reasoning')[];
  tier: 'free' | 'advanced' | 'professional';
  supportsLocal: boolean;
  cloudModelId?: string; // For Lovable AI gateway
  localModelId?: string; // For HuggingFace transformers
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
    name: 'Local Assistant (Small)',
    description: 'Run on your device - fast, private',
    provider: 'local',
    capabilities: ['text'],
    tier: 'advanced',
    supportsLocal: true,
    localModelId: 'Xenova/Qwen1.5-0.5B-Chat',
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
    id: 'local-medium',
    name: 'Local Assistant (Medium)',
    description: 'Run on your device - balanced performance',
    provider: 'local',
    capabilities: ['text'],
    tier: 'professional',
    supportsLocal: true,
    localModelId: 'Xenova/Phi-3-mini-4k-instruct',
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
