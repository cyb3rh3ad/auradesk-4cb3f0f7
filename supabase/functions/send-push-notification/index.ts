import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  userId?: string;
  userIds?: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PushPayload = await req.json();
    const { userId, userIds, title, body, data } = payload;

    // Get target user IDs
    const targetUserIds = userIds || (userId ? [userId] : []);
    
    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No target users specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch push tokens for target users
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token, platform")
      .in("user_id", targetUserIds);

    if (tokensError) {
      console.error("Error fetching tokens:", tokensError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tokens" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push tokens found for users", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For now, we'll log the notifications that would be sent
    // In production, you'd integrate with FCM (Firebase Cloud Messaging) or APNs
    console.log(`Would send push notification to ${tokens.length} devices:`, {
      title,
      body,
      data,
      tokens: tokens.map(t => ({ platform: t.platform, token: t.token.substring(0, 20) + '...' }))
    });

    // TODO: Integrate with FCM/APNs
    // For FCM, you'd make a POST request to https://fcm.googleapis.com/fcm/send
    // For APNs, you'd use the Apple Push Notification service

    // Example FCM integration (requires FCM_SERVER_KEY secret):
    /*
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");
    if (fcmServerKey) {
      for (const { token, platform } of tokens) {
        if (platform === 'android' || platform === 'ios') {
          await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              'Authorization': `key=${fcmServerKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: token,
              notification: { title, body },
              data: data || {},
            }),
          });
        }
      }
    }
    */

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Push notification queued for ${tokens.length} devices`,
        sent: tokens.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
