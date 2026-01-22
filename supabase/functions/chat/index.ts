import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Model mapping for Lovable AI gateway
const MODEL_MAP: Record<string, string> = {
  'gemini-flash-lite': 'google/gemini-2.5-flash-lite',
  'gemini-flash': 'google/gemini-2.5-flash',
  'gemini-pro': 'google/gemini-2.5-pro',
  'gemini-3-pro': 'google/gemini-3-pro-preview',
  'gemini-image': 'google/gemini-2.5-flash-image-preview',
  'gpt-5-nano': 'openai/gpt-5-nano',
  'gpt-5-mini': 'openai/gpt-5-mini',
  'gpt-5': 'openai/gpt-5',
};

// Tier access control
const MODEL_TIERS: Record<string, string> = {
  'gemini-flash-lite': 'free',
  'gemini-flash': 'advanced',
  'gemini-pro': 'professional',
  'gemini-3-pro': 'professional',
  'gemini-image': 'professional',
  'gpt-5-nano': 'advanced',
  'gpt-5-mini': 'advanced',
  'gpt-5': 'professional',
};

const TIER_PRIORITY: Record<string, number> = {
  'free': 1,
  'advanced': 2,
  'professional': 3,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, model: requestedModel } = await req.json();
    
    // Input validation
    const MAX_MESSAGES = 50;
    const MAX_MESSAGE_LENGTH = 50000;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid input: messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (messages.length > MAX_MESSAGES) {
      return new Response(JSON.stringify({ error: `Too many messages: maximum ${MAX_MESSAGES} allowed` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const msg of messages) {
      if (!msg || typeof msg.role !== "string" || typeof msg.content !== "string") {
        return new Response(JSON.stringify({ error: "Invalid message format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (msg.content.length > MAX_MESSAGE_LENGTH) {
        return new Response(JSON.stringify({ error: `Message too long: maximum ${MAX_MESSAGE_LENGTH} characters` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get user's subscription plan
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: subscription } = await supabaseAdmin
      .from('user_subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    const userPlan = subscription?.plan || 'free';
    const userTierLevel = TIER_PRIORITY[userPlan] || 1;

    // Determine which model to use
    let modelId = requestedModel || 'gemini-flash-lite';
    
    // Check if user has access to the requested model
    const modelTier = MODEL_TIERS[modelId] || 'free';
    const modelTierLevel = TIER_PRIORITY[modelTier] || 1;
    
    if (modelTierLevel > userTierLevel) {
      // User doesn't have access, fallback to their tier's best model
      if (userPlan === 'advanced') {
        modelId = 'gemini-flash';
      } else {
        modelId = 'gemini-flash-lite';
      }
      console.log(`User tier ${userPlan} doesn't have access to ${requestedModel}, using ${modelId}`);
    }

    const cloudModelId = MODEL_MAP[modelId] || 'google/gemini-2.5-flash-lite';
    const isImageGeneration = modelId === 'gemini-image';
    console.log(`Using model: ${cloudModelId} for user plan: ${userPlan}, isImageGen: ${isImageGeneration}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the request body based on whether it's image generation or text
    const requestBody: any = {
      model: cloudModelId,
      messages: [
        { 
          role: "system", 
          content: isImageGeneration 
            ? "You are an AI image generator. When asked to generate an image, create the image as requested. Do not describe the image - generate it."
            : "You are a helpful AI assistant integrated into a team collaboration platform called AuraDesk. You can help with tasks, answer questions, provide suggestions, and assist with problem-solving. Be concise but thorough." 
        },
        ...messages,
      ],
    };

    // Add modalities for image generation - this is critical for the model to generate images
    if (isImageGeneration) {
      requestBody.modalities = ["image", "text"];
      // Don't stream for image generation
    } else {
      requestBody.stream = true;
    }

    console.log("Sending request to Lovable AI:", JSON.stringify({ model: cloudModelId, isImageGeneration, modalities: requestBody.modalities }));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For image generation, return JSON response
    if (isImageGeneration) {
      const data = await response.json();
      console.log("Image generation response:", JSON.stringify(data));
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For text, return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
