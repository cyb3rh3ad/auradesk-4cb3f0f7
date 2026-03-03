import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// LiveKit JWT token generation (HMAC-SHA256)
async function createToken(
  apiKey: string,
  apiSecret: string,
  roomName: string,
  participantIdentity: string,
  participantName: string
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const payload = {
    iss: apiKey,
    sub: participantIdentity,
    name: participantName,
    exp,
    nbf: now,
    iat: now,
    video: {
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
    jti: crypto.randomUUID(),
  };

  const base64UrlEncode = (obj: object) => {
    const json = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(json);
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${signingInput}.${encodedSignature}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth: validate user with fallback chain ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Try getUser first (most reliable across versions), fall back to getClaims
    let userId: string;
    let userEmail = '';

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (!userError && userData?.user) {
      userId = userData.user.id;
      userEmail = userData.user.email || '';
    } else {
      // Fallback: try getClaims if available
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: claimsData, error: claimsError } = await (supabase.auth as any).getClaims(token);
        if (claimsError || !claimsData?.claims?.sub) {
          console.error('Auth error (both getUser and getClaims failed):', userError, claimsError);
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        userId = claimsData.claims.sub as string;
        userEmail = (claimsData.claims.email as string) || '';
      } catch {
        console.error('Auth error (getUser failed, getClaims unavailable):', userError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { roomName, participantName } = await req.json();

    if (!roomName) {
      return new Response(
        JSON.stringify({ error: 'roomName is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const livekitUrl = Deno.env.get('LIVEKIT_URL');
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');

    if (!livekitUrl || !apiKey || !apiSecret) {
      console.error('Missing LiveKit configuration. Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET secrets.');
      return new Response(
        JSON.stringify({ error: 'LiveKit not configured. Contact the app administrator.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[LiveKit] Generating token for room: ${roomName}, user: ${userId}`);

    const livekitToken = await createToken(
      apiKey,
      apiSecret,
      roomName,
      userId,
      participantName || userEmail || 'Anonymous'
    );

    console.log('[LiveKit] Token generated successfully');

    return new Response(
      JSON.stringify({ 
        token: livekitToken, 
        url: livekitUrl,
        roomName,
        participantIdentity: userId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});