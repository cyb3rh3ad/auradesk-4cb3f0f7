import { pipeline, env } from '@huggingface/transformers';

// Configure to use local models with WebGPU/WASM fallback
env.allowLocalModels = true;
env.allowRemoteModels = true;

let chatPipeline: any = null;
let summaryPipeline: any = null;

export const initializeChatModel = async () => {
  if (chatPipeline) return chatPipeline;
  
  try {
    console.log('Initializing local chat model...');
    // Use a small, fast conversational model that works offline
    chatPipeline = await pipeline(
      'text-generation',
      'onnx-community/Qwen2.5-0.5B-Instruct',
      { device: 'webgpu' }
    );
    console.log('Chat model initialized successfully');
    return chatPipeline;
  } catch (error) {
    console.error('Error initializing chat model:', error);
    throw error;
  }
};

export const initializeSummaryModel = async () => {
  if (summaryPipeline) return summaryPipeline;
  
  try {
    console.log('Initializing local summary model...');
    // Use a small summarization model for meeting summaries
    summaryPipeline = await pipeline(
      'summarization',
      'onnx-community/distilbart-cnn-6-6',
      { device: 'webgpu' }
    );
    console.log('Summary model initialized successfully');
    return summaryPipeline;
  } catch (error) {
    console.error('Error initializing summary model:', error);
    throw error;
  }
};

export const generateChatResponse = async (
  messages: Array<{ role: string; content: string }>,
  onToken?: (token: string) => void
): Promise<string> => {
  const model = await initializeChatModel();
  
  // Format messages for the model
  const prompt = messages
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n') + '\nAssistant:';
  
  try {
    const result = await model(prompt, {
      max_new_tokens: 256,
      temperature: 0.7,
      top_p: 0.9,
      do_sample: true,
    });
    
    const response = result[0].generated_text.split('Assistant:').pop()?.trim() || '';
    return response;
  } catch (error) {
    console.error('Error generating chat response:', error);
    throw error;
  }
};

export const generateSummary = async (text: string): Promise<string> => {
  const model = await initializeSummaryModel();
  
  try {
    const result = await model(text, {
      max_length: 150,
      min_length: 30,
    });
    
    return result[0].summary_text;
  } catch (error) {
    console.error('Error generating summary:', error);
    throw error;
  }
};

// Helper to check if models are supported in current browser
export const checkModelSupport = async (): Promise<{
  webgpu: boolean;
  wasm: boolean;
}> => {
  const webgpu = 'gpu' in navigator;
  const wasm = typeof WebAssembly !== 'undefined';
  
  return { webgpu, wasm };
};
