import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get the approving user's token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the user using getClaims
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error('Claims error:', claimsError);
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    console.log('Authenticated user:', userId);

    const body = await req.json();
    const qrToken = body.token;
    if (!qrToken) {
      return new Response(JSON.stringify({ error: 'Token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the QR session exists and is pending
    const { data: session, error: sessionError } = await adminClient
      .from('qr_login_sessions')
      .select('*')
      .eq('token', qrToken)
      .eq('status', 'pending')
      .single();

    if (sessionError || !session) {
      console.error('Session lookup error:', sessionError);
      return new Response(JSON.stringify({ error: 'Invalid or expired QR session' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiry
    if (new Date(session.expires_at) < new Date()) {
      await adminClient.from('qr_login_sessions').update({ status: 'expired' }).eq('id', session.id);
      return new Response(JSON.stringify({ error: 'QR code expired' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the current user's session tokens to pass to desktop
    const { data: { session: userSession } } = await userClient.auth.getSession();
    if (!userSession) {
      console.error('No active session for user');
      return new Response(JSON.stringify({ error: 'No active session' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update QR session with approval
    const { error: updateError } = await adminClient
      .from('qr_login_sessions')
      .update({
        status: 'approved',
        approved_by: userId,
        access_token: userSession.access_token,
        refresh_token: userSession.refresh_token,
      })
      .eq('id', session.id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    console.log('QR login approved successfully');
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('QR approve error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
