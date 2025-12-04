import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { planType, promoCodeId } = await req.json();
    if (!planType || !['advanced', 'professional'].includes(planType)) {
      throw new Error("Invalid plan type");
    }
    if (!promoCodeId) throw new Error("Promo code ID is required");

    // Verify promo code is 100% off
    const { data: promoCode, error: promoError } = await supabaseClient
      .from('promo_codes')
      .select('*')
      .eq('id', promoCodeId)
      .eq('active', true)
      .single();

    if (promoError || !promoCode) {
      throw new Error("Invalid promo code");
    }

    if (promoCode.discount_percent !== 100) {
      throw new Error("This endpoint only handles 100% off promo codes");
    }

    // Check if already used
    const { data: existingUsage } = await supabaseClient
      .from('promo_code_usage')
      .select('*')
      .eq('promo_code_id', promoCodeId)
      .eq('user_id', user.id)
      .single();

    if (existingUsage) {
      throw new Error("You have already used this promo code");
    }

    // Record promo code usage
    const { error: usageError } = await supabaseClient
      .from('promo_code_usage')
      .insert({
        promo_code_id: promoCodeId,
        user_id: user.id,
        stripe_coupon_id: null
      });

    if (usageError) {
      console.error('Error recording promo usage:', usageError);
      throw new Error("Failed to record promo code usage");
    }

    // Update user subscription to the selected plan (lifetime/forever)
    const { error: subError } = await supabaseClient
      .from('user_subscriptions')
      .update({
        plan: planType,
        subscription_end: null, // null = forever/lifetime
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (subError) {
      console.error('Error updating subscription:', subError);
      throw new Error("Failed to activate subscription");
    }

    console.log(`[ACTIVATE-FREE] User ${user.id} activated ${planType} plan with 100% off promo ${promoCode.code}`);

    return new Response(JSON.stringify({ 
      success: true, 
      plan: planType,
      message: `${planType.charAt(0).toUpperCase() + planType.slice(1)} plan activated successfully!`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('[ACTIVATE-FREE] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
