import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function base64urlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check if VAPID keys already exist
    const { data: existing } = await supabase
      .from("app_config")
      .select("key, value")
      .in("key", ["vapid_public_key", "vapid_private_key"]);

    if (existing && existing.length === 2) {
      const publicKey = existing.find((r: any) => r.key === "vapid_public_key")?.value;
      return new Response(
        JSON.stringify({ publicKey }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate new VAPID key pair (ECDSA P-256)
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );

    // Export public key as raw (uncompressed point, 65 bytes)
    const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
    const publicKeyB64 = base64urlEncode(publicKeyRaw);

    // Export private key as JWK for storage
    const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

    // Store both in app_config (using service role bypasses RLS)
    await supabase.from("app_config").upsert([
      { key: "vapid_public_key", value: publicKeyB64 },
      { key: "vapid_private_key", value: JSON.stringify(privateKeyJwk) },
    ]);

    console.log("VAPID keys generated and stored");

    return new Response(
      JSON.stringify({ publicKey: publicKeyB64 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in web-push-vapid:", error);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
