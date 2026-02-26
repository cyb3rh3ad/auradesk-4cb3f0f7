import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PushPayload {
  userId?: string;
  userIds?: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  type?: "notification" | "call";
}

// ═══════════════════════════════════════════════
// FCM (Native) Push Notification Helpers
// ═══════════════════════════════════════════════

async function importRsaPrivateKey(pemKey: string): Promise<CryptoKey> {
  const pemContents = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\n/g, "")
    .trim();
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function createFcmJwt(clientEmail: string, privateKey: CryptoKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };
  const enc = new TextEncoder();
  const b64 = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const hdr = b64(header);
  const pld = b64(payload);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, enc.encode(`${hdr}.${pld}`));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  return `${hdr}.${pld}.${sigB64}`;
}

async function getFcmAccessToken(jwt: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`FCM token error: ${await res.text()}`);
  return (await res.json()).access_token;
}

async function sendFcmNotification(
  accessToken: string,
  projectId: string,
  deviceToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  isCall = false
): Promise<{ success: boolean; error?: string }> {
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const message: Record<string, unknown> = isCall
    ? {
        message: {
          token: deviceToken,
          data: { ...data, title, body, type: "call", channelId: "calls", sound: "ringtone", vibrate: "true", priority: "max" },
          android: { priority: "high", ttl: "30s", direct_boot_ok: true },
          apns: { headers: { "apns-priority": "10", "apns-push-type": "voip" }, payload: { aps: { sound: "ringtone.wav", badge: 1, "content-available": 1, "mutable-content": 1, category: "CALL_INVITATION" } } },
        },
      }
    : {
        message: {
          token: deviceToken,
          notification: { title, body },
          data: data || {},
          android: { priority: "high", notification: { sound: "default", channelId: "default" } },
          apns: { payload: { aps: { sound: "default", badge: 1 } } },
        },
      };

  const res = await fetch(fcmUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`FCM error:`, err);
    return { success: false, error: err };
  }
  await res.text();
  return { success: true };
}

// ═══════════════════════════════════════════════
// Web Push (Browser/PWA) Helpers - RFC 8291
// ═══════════════════════════════════════════════

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

async function hkdf(
  ikm: ArrayBuffer,
  salt: ArrayBuffer,
  info: Uint8Array,
  length: number
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey("raw", ikm, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const saltKey = salt.byteLength > 0
    ? await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    : await crypto.subtle.importKey("raw", new Uint8Array(32), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  
  // Extract
  const prk = await crypto.subtle.sign("HMAC", saltKey, new Uint8Array(ikm));
  
  // Expand
  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info);
  infoWithCounter[info.length] = 1;
  const okm = await crypto.subtle.sign("HMAC", prkKey, infoWithCounter);
  
  return okm.slice(0, length);
}

function createInfo(type: string, clientPublicKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);
  
  // "Content-Encoding: <type>\0" + "P-256\0" + len(client) + client + len(server) + server
  const info = new Uint8Array(
    18 + typeBytes.length + 1 + 5 + 1 + 2 + clientPublicKey.length + 2 + serverPublicKey.length
  );
  
  let offset = 0;
  const header = encoder.encode("Content-Encoding: ");
  info.set(header, offset); offset += header.length;
  info.set(typeBytes, offset); offset += typeBytes.length;
  info[offset++] = 0; // null
  
  const p256 = encoder.encode("P-256");
  info.set(p256, offset); offset += p256.length;
  info[offset++] = 0;
  
  // Client public key length (2 bytes big-endian) + key
  info[offset++] = 0;
  info[offset++] = clientPublicKey.length;
  info.set(clientPublicKey, offset); offset += clientPublicKey.length;
  
  // Server public key length (2 bytes big-endian) + key  
  info[offset++] = 0;
  info[offset++] = serverPublicKey.length;
  info.set(serverPublicKey, offset);
  
  return info;
}

async function encryptPayload(
  payload: string,
  subscriptionKeys: { p256dh: string; auth: string }
): Promise<{ ciphertext: ArrayBuffer; salt: Uint8Array; serverPublicKey: ArrayBuffer }> {
  const clientPublicKey = b64urlDecode(subscriptionKeys.p256dh);
  const clientAuth = b64urlDecode(subscriptionKeys.auth);
  
  // Generate server ECDH keys
  const serverKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  
  const serverPublicKey = await crypto.subtle.exportKey("raw", serverKeys.publicKey);
  
  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  
  // Compute shared secret via ECDH
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientKey },
    serverKeys.privateKey,
    256
  );
  
  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const serverPubKeyArray = new Uint8Array(serverPublicKey);
  
  // Derive PRK using auth as IKM context
  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const prk = await hkdf(sharedSecret, clientAuth.buffer, authInfo, 32);
  
  // Derive content encryption key
  const cekInfo = createInfo("aesgcm", clientPublicKey, serverPubKeyArray);
  const cek = await hkdf(prk, salt.buffer, cekInfo, 16);
  
  // Derive nonce
  const nonceInfo = createInfo("nonce", clientPublicKey, serverPubKeyArray);
  const nonce = await hkdf(prk, salt.buffer, nonceInfo, 12);
  
  // Add padding (2 bytes of padding length + padding)
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);
  const paddedPayload = new Uint8Array(2 + payloadBytes.length);
  paddedPayload[0] = 0;
  paddedPayload[1] = 0;
  paddedPayload.set(payloadBytes, 2);
  
  // Encrypt with AES-128-GCM
  const cryptoKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(nonce), tagLength: 128 },
    cryptoKey,
    paddedPayload
  );
  
  return { ciphertext, salt, serverPublicKey };
}

async function createVapidAuthHeader(
  endpoint: string,
  vapidPrivateKeyJwk: JsonWebKey,
  vapidPublicKeyRaw: Uint8Array
): Promise<{ authorization: string; cryptoKey: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  const now = Math.floor(Date.now() / 1000);
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: "mailto:notifications@auradesk.app",
  };
  
  const enc = new TextEncoder();
  const b64Header = b64url(enc.encode(JSON.stringify(header)));
  const b64Payload = b64url(enc.encode(JSON.stringify(payload)));
  
  // Import VAPID private key for signing
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    vapidPrivateKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  
  const signatureInput = enc.encode(`${b64Header}.${b64Payload}`);
  const signatureRaw = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    signatureInput
  );
  
  // Convert DER signature to raw r||s format (already raw from WebCrypto)
  const signatureB64 = b64url(signatureRaw);
  const jwt = `${b64Header}.${b64Payload}.${signatureB64}`;
  
  return {
    authorization: `vapid t=${jwt}, k=${b64url(vapidPublicKeyRaw)}`,
    cryptoKey: `p256ecdsa=${b64url(vapidPublicKeyRaw)}`,
  };
}

async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string,
  vapidPrivateKeyJwk: JsonWebKey,
  vapidPublicKeyRaw: Uint8Array,
  isCallNotification = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const { ciphertext, salt, serverPublicKey } = await encryptPayload(payload, { p256dh, auth });
    const vapid = await createVapidAuthHeader(endpoint, vapidPrivateKeyJwk, vapidPublicKeyRaw);
    
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": vapid.authorization,
        "Crypto-Key": `${vapid.cryptoKey};dh=${b64url(serverPublicKey)}`,
        "Content-Encoding": "aesgcm",
        "Encryption": `salt=${b64url(salt.buffer)}`,
        "Content-Type": "application/octet-stream",
        "TTL": isCallNotification ? "30" : "86400",
        "Urgency": isCallNotification ? "high" : "normal",
      },
      body: ciphertext,
    });
    
    if (!res.ok) {
      const errText = await res.text();
      console.error(`Web push error [${res.status}]:`, errText);
      return { success: false, error: `${res.status}: ${errText}` };
    }
    await res.text();
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Web push send error:", msg);
    return { success: false, error: msg };
  }
}

// ═══════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════

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

    let fcmSuccess = 0;
    let fcmFail = 0;
    let webSuccess = 0;
    let webFail = 0;
    const errors: string[] = [];
    const isCall = type === "call";

    // ── FCM (Native) Push ──
    if (fcmProjectId && fcmClientEmail && fcmPrivateKey) {
      const { data: tokens } = await supabase
        .from("push_tokens")
        .select("token, platform")
        .in("user_id", targetUserIds);

      if (tokens && tokens.length > 0) {
        const rsaKey = await importRsaPrivateKey(fcmPrivateKey);
        const jwt = await createFcmJwt(fcmClientEmail, rsaKey);
        const accessToken = await getFcmAccessToken(jwt);

        for (const { token } of tokens) {
          const result = await sendFcmNotification(accessToken, fcmProjectId, token, title, body, data, isCall);
          if (result.success) fcmSuccess++;
          else { fcmFail++; if (result.error) errors.push(result.error); }
        }
      }
    }

    // ── Web Push (Browser/PWA) ──
    const { data: vapidConfig } = await supabase
      .from("app_config")
      .select("key, value")
      .in("key", ["vapid_public_key", "vapid_private_key"]);

    if (vapidConfig && vapidConfig.length === 2) {
      const vapidPublicKeyB64 = vapidConfig.find((r: any) => r.key === "vapid_public_key")?.value;
      const vapidPrivateKeyJson = vapidConfig.find((r: any) => r.key === "vapid_private_key")?.value;

      if (vapidPublicKeyB64 && vapidPrivateKeyJson) {
        const vapidPublicKeyRaw = b64urlDecode(vapidPublicKeyB64);
        const vapidPrivateKeyJwk = JSON.parse(vapidPrivateKeyJson);

        const { data: webSubs } = await supabase
          .from("web_push_subscriptions")
          .select("endpoint, p256dh, auth, id")
          .in("user_id", targetUserIds);

        if (webSubs && webSubs.length > 0) {
          const pushPayload = JSON.stringify({ title, body, data, tag: isCall ? "auradesk-call" : undefined, isCall });

          for (const sub of webSubs) {
            const result = await sendWebPush(
              sub.endpoint,
              sub.p256dh,
              sub.auth,
              pushPayload,
              vapidPrivateKeyJwk,
              vapidPublicKeyRaw,
              isCall
            );
            if (result.success) {
              webSuccess++;
            } else {
              webFail++;
              if (result.error) errors.push(result.error);
              // Remove expired/invalid subscriptions (410 Gone)
              if (result.error?.startsWith("410") || result.error?.startsWith("404")) {
                await supabase.from("web_push_subscriptions").delete().eq("id", sub.id);
              }
            }
          }
        }
      }
    }

    const totalSent = fcmSuccess + webSuccess;
    const totalFailed = fcmFail + webFail;
    console.log(`Push results: FCM ${fcmSuccess}/${fcmSuccess + fcmFail}, Web ${webSuccess}/${webSuccess + webFail}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSent,
        failed: totalFailed,
        fcm: { sent: fcmSuccess, failed: fcmFail },
        web: { sent: webSuccess, failed: webFail },
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
