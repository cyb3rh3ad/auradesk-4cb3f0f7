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
  type?: 'notification' | 'call';
}

// Convert PEM private key to CryptoKey for signing
async function importPrivateKey(pemKey: string): Promise<CryptoKey> {
  const pemContents = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\n/g, "")
    .trim();

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
}

// Create a signed JWT for Google OAuth2
async function createSignedJwt(
  clientEmail: string,
  privateKey: CryptoKey
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const header = { alg: "RS256", typ: "JWT" };

  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: exp,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const signatureInput = `${headerB64}.${payloadB64}`;
  const signatureBytes = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    encoder.encode(signatureInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

// Exchange JWT for OAuth2 access token
async function getAccessToken(signedJwt: string): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedJwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get access token: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Send push notification via FCM v1 API
async function sendFcmNotification(
  accessToken: string,
  projectId: string,
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  isCall: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  // For call notifications, use data-only message for background handling
  // The app will show a custom notification with action buttons
  const message: Record<string, unknown> = isCall
    ? {
        message: {
          token: deviceToken,
          data: {
            ...data,
            title,
            body,
            type: "call",
            channelId: "calls",
            sound: "ringtone",
            vibrate: "true",
            priority: "max",
          },
          android: {
            priority: "high",
            ttl: "30s",
            direct_boot_ok: true,
          },
          apns: {
            headers: {
              "apns-priority": "10",
              "apns-push-type": "voip",
            },
            payload: {
              aps: {
                sound: "ringtone.wav",
                badge: 1,
                "content-available": 1,
                "mutable-content": 1,
                category: "CALL_INVITATION",
              },
            },
          },
        },
      }
    : {
        message: {
          token: deviceToken,
          notification: {
            title,
            body,
          },
          data: data || {},
          android: {
            priority: "high",
            notification: {
              sound: "default",
              channelId: "default",
            },
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1,
              },
            },
          },
        },
      };

  const response = await fetch(fcmUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`FCM error for token ${deviceToken.substring(0, 20)}...:`, errorText);
    return { success: false, error: errorText };
  }

  await response.text();
  return { success: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fcmProjectId = Deno.env.get("FCM_PROJECT_ID");
    const fcmClientEmail = Deno.env.get("FCM_CLIENT_EMAIL");
    const fcmPrivateKey = Deno.env.get("FCM_PRIVATE_KEY");

    if (!fcmProjectId || !fcmClientEmail || !fcmPrivateKey) {
      console.error("FCM not configured - missing secrets");
      return new Response(
        JSON.stringify({ error: "FCM not configured", sent: 0 }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: PushPayload = await req.json();
    const { userId, userIds, title, body, data, type } = payload;

    const targetUserIds = userIds || (userId ? [userId] : []);

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No target users specified" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    console.log(`Sending ${type || 'notification'} to ${tokens.length} devices`);

    const privateKey = await importPrivateKey(fcmPrivateKey);
    const signedJwt = await createSignedJwt(fcmClientEmail, privateKey);
    const accessToken = await getAccessToken(signedJwt);

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    const isCall = type === 'call';

    for (const { token } of tokens) {
      const result = await sendFcmNotification(
        accessToken,
        fcmProjectId,
        token,
        title,
        body,
        data,
        isCall
      );

      if (result.success) {
        successCount++;
      } else {
        failureCount++;
        if (result.error) {
          errors.push(result.error);
        }
      }
    }

    console.log(`Push notification results: ${successCount} sent, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Push notifications sent: ${successCount} succeeded, ${failureCount} failed`,
        sent: successCount,
        failed: failureCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
