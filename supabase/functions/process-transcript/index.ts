import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
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

    const { text, processingType, customInstructions } = await req.json();
    
    // Input validation
    const MAX_TEXT_LENGTH = 100000;
    const MAX_INSTRUCTIONS_LENGTH = 2000;
    const VALID_PROCESSING_TYPES = ['summary', 'bullet_points', 'custom'];
    
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: 'Invalid input: text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (text.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid input: text cannot be empty' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return new Response(JSON.stringify({ error: `Text too long: maximum ${MAX_TEXT_LENGTH} characters allowed` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (processingType && !VALID_PROCESSING_TYPES.includes(processingType)) {
      return new Response(JSON.stringify({ error: 'Invalid processingType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (customInstructions && (typeof customInstructions !== 'string' || customInstructions.length > MAX_INSTRUCTIONS_LENGTH)) {
      return new Response(JSON.stringify({ error: `Custom instructions too long: maximum ${MAX_INSTRUCTIONS_LENGTH} characters` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt = '';
    switch (processingType) {
      case 'summary':
        systemPrompt = 'You are a meeting transcript analyzer. Create a concise, professional summary of the following meeting transcript. Focus on key decisions, action items, and important discussions.';
        break;
      case 'bullet_points':
        systemPrompt = 'You are a meeting transcript analyzer. Convert the following meeting transcript into clear, organized bullet points. Group related topics together and highlight action items, decisions, and key discussion points.';
        break;
      case 'custom':
        systemPrompt = customInstructions || 'Process the following meeting transcript according to the user\'s needs.';
        break;
      default:
        systemPrompt = 'You are a helpful meeting transcript processor. Process the following transcript in a clear and useful format.';
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (response.status === 402) {
      return new Response(JSON.stringify({ error: 'Usage limit reached' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const processedContent = data.choices[0].message.content;

    return new Response(JSON.stringify({ content: processedContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Processing error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
