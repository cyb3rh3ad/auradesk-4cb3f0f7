import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    // Use the token directly to get user info
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      logStep("Auth error details", { message: userError.message, status: userError.status });
      throw new Error(`Authentication error: ${userError.message}`);
    }
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user is owner
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .single();
    
    const isOwner = !!roleData;
    logStep("Owner check", { isOwner });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, checking database for existing subscription");
      
      // Owners always get professional plan
      if (isOwner) {
        await supabaseClient
          .from('user_subscriptions')
          .upsert({
            user_id: user.id,
            plan: 'professional',
            stripe_customer_id: null,
            stripe_subscription_id: null,
            stripe_product_id: null,
            subscription_end: null
          });
        
        return new Response(JSON.stringify({ 
          subscribed: true, 
          plan: 'professional',
          product_id: null,
          subscription_end: null
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      // Check if user has a subscription record in our database
      const { data: dbSub } = await supabaseClient
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      return new Response(JSON.stringify({ 
        subscribed: false, 
        plan: dbSub?.plan || 'free',
        product_id: null,
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;
    let plan = 'free';

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      productId = subscription.items.data[0].price.product as string;
      
      // Map product ID to plan
      if (productId === 'prod_TPU66nz20lMppo') {
        plan = 'advanced';
      } else if (productId === 'prod_TPU6bQ0eUriSFl') {
        plan = 'professional';
      }
      
      logStep("Determined subscription plan", { productId, plan });
      
      // Update database with subscription info
      await supabaseClient
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          plan: plan,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          stripe_product_id: productId,
          subscription_end: subscriptionEnd
        });
    } else {
      logStep("No active subscription found");
      
      // Owners always get professional plan
      if (isOwner) {
        await supabaseClient
          .from('user_subscriptions')
          .upsert({
            user_id: user.id,
            plan: 'professional',
            stripe_customer_id: customerId,
            stripe_subscription_id: null,
            stripe_product_id: null,
            subscription_end: null
          });
        
        return new Response(JSON.stringify({
          subscribed: true,
          plan: 'professional',
          product_id: null,
          subscription_end: null
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      // Update database to free plan
      await supabaseClient
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          plan: 'free',
          stripe_customer_id: customerId,
          stripe_subscription_id: null,
          stripe_product_id: null,
          subscription_end: null
        });
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan: plan,
      product_id: productId,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});