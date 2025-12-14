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

  try {
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      console.log("No authorization header provided");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "No authorization header" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.log("Auth error:", userError?.message || "No user found");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Invalid token" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const user = userData.user;
    console.log("Authenticated user:", user.id);

    // Check if there are any owners
    const { data: existingOwners, error: ownersError } = await supabaseClient
      .from('user_roles')
      .select('id')
      .eq('role', 'owner')
      .limit(1);

    if (ownersError) {
      console.log("Error checking owners:", ownersError.message);
    }

    // If no owners exist, make this user the owner
    if (!existingOwners || existingOwners.length === 0) {
      console.log("No owners exist, making user owner");
      const { error } = await supabaseClient
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'owner'
        });

      if (error && error.code !== '23505') { // Ignore duplicate key error
        console.log("Error inserting owner:", error.message);
        throw error;
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: "You are now the owner!",
        isOwner: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if this user is already an owner
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .maybeSingle();

    console.log("User role check:", userRole);

    return new Response(JSON.stringify({ 
      success: true, 
      isOwner: !!userRole,
      message: userRole ? "You are already the owner" : "An owner already exists"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Initialize owner error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
