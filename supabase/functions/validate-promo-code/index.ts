import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const { code } = await req.json();
    if (!code) throw new Error("Promo code is required");

    // Check if promo code exists and is valid
    const { data: promoCode, error: promoError } = await supabaseClient
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('active', true)
      .single();

    if (promoError || !promoCode) {
      return new Response(JSON.stringify({ valid: false, message: "Invalid promo code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if expired
    if (promoCode.expires_at && new Date(promoCode.expires_at) < new Date()) {
      return new Response(JSON.stringify({ valid: false, message: "Promo code has expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if max uses reached
    if (promoCode.max_uses && promoCode.current_uses >= promoCode.max_uses) {
      return new Response(JSON.stringify({ valid: false, message: "Promo code has reached maximum uses" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if user already used this code
    const { data: usage } = await supabaseClient
      .from('promo_code_usage')
      .select('*')
      .eq('promo_code_id', promoCode.id)
      .eq('user_id', user.id)
      .single();

    if (usage) {
      return new Response(JSON.stringify({ valid: false, message: "You have already used this promo code" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create or get Stripe coupon for this promo code
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const couponId = `PROMO_${promoCode.code}`;
    let stripeCoupon;

    try {
      stripeCoupon = await stripe.coupons.retrieve(couponId);
    } catch {
      // Create coupon if it doesn't exist
      // For 100% off, use 'forever' duration as it's essentially free
      const isFullDiscount = promoCode.discount_percent === 100;
      
      stripeCoupon = await stripe.coupons.create({
        id: couponId,
        percent_off: promoCode.discount_percent,
        duration: isFullDiscount ? 'forever' : 'repeating',
        ...(isFullDiscount ? {} : { duration_in_months: promoCode.duration_months }),
        name: isFullDiscount 
          ? '100% off - Free subscription' 
          : `${promoCode.discount_percent}% off for ${promoCode.duration_months} months`,
      });
    }

    return new Response(JSON.stringify({
      valid: true,
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        discount_percent: promoCode.discount_percent,
        duration_months: promoCode.duration_months,
        stripeCouponId: stripeCoupon.id
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
