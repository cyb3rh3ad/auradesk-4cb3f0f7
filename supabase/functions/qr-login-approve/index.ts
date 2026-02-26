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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the user via getClaims
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const jwt = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(jwt);
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

    // Instead of getSession() (which doesn't work server-side),
    // pass the caller's JWT directly as the access_token.
    // The desktop will use this to establish a session.
    // We also use the admin API to get user data and generate a fresh token pair.
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);
    if (userError || !userData?.user) {
      console.error('User lookup error:', userError);
      return new Response(JSON.stringify({ error: 'Failed to verify user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate a fresh link/session for the desktop using admin.generateLink
    // Since generateLink doesn't give us tokens directly, we'll use a different approach:
    // Create a magic link token via admin, or simply pass the current JWT + let desktop refresh it.
    
    // The simplest reliable approach: store the caller's JWT and let the desktop 
    // call setSession with it. The JWT IS valid (we just verified it).
    // For refresh_token, we need the admin to generate one.
    
    // Actually, let's use admin.generateLink to create a magic link for the user
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email!,
    });

    if (linkError || !linkData) {
      console.error('Generate link error:', linkError);
      return new Response(JSON.stringify({ error: 'Failed to generate session transfer' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the token hash from the generated link
    const actionLink = linkData.properties?.action_link || '';
    console.log('Generated action link for desktop login');

    // Update QR session with approval - store the magic link token for desktop
    const { error: updateError } = await adminClient
      .from('qr_login_sessions')
      .update({
        status: 'approved',
        approved_by: userId,
        // Store the full action link - desktop will use it to verify OTP
        access_token: actionLink,
        refresh_token: linkData.properties?.hashed_token || '',
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
