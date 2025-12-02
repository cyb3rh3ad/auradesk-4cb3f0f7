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
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    // Check if there are any owners
    const { data: existingOwners } = await supabaseClient
      .from('user_roles')
      .select('id')
      .eq('role', 'owner')
      .limit(1);

    // If no owners exist, make this user the owner
    if (!existingOwners || existingOwners.length === 0) {
      const { error } = await supabaseClient
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'owner'
        });

      if (error && error.code !== '23505') { // Ignore duplicate key error
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
      .single();

    return new Response(JSON.stringify({ 
      success: true, 
      isOwner: !!userRole,
      message: userRole ? "You are already the owner" : "An owner already exists"
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
