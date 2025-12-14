import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { roomName, userName } = await req.json();

    if (!roomName) {
      return new Response(JSON.stringify({ error: "roomName is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const DAILY_API_KEY = Deno.env.get("DAILY_API_KEY");
    if (!DAILY_API_KEY) {
      console.error("Missing DAILY_API_KEY");
      return new Response(
        JSON.stringify({ error: "Daily.co not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Sanitize room name for Daily (alphanumeric + hyphens only, max 64 chars)
    const sanitizedRoomName = roomName
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .substring(0, 64);

    console.log(`Creating/getting Daily room: ${sanitizedRoomName}`);

    // First, try to get existing room
    const getRoomRes = await fetch(
      `https://api.daily.co/v1/rooms/${sanitizedRoomName}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    let roomUrl: string;

    if (getRoomRes.ok) {
      // Room exists
      const existingRoom = await getRoomRes.json();
      roomUrl = existingRoom.url;
      console.log(`Room exists: ${roomUrl}`);
    } else {
      // Create new room
      console.log("Creating new Daily room...");
      const createRoomRes = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: sanitizedRoomName,
          properties: {
            // Room expires in 1 hour of inactivity
            exp: Math.floor(Date.now() / 1000) + 3600,
            // Enable prejoin UI
            enable_prejoin_ui: false,
            // Enable chat
            enable_chat: true,
            // Enable screen sharing
            enable_screenshare: true,
            // Enable recording (optional)
            enable_recording: "cloud",
            // Max participants (free tier limit)
            max_participants: 4,
            // Auto-join with audio/video
            start_audio_off: false,
            start_video_off: false,
          },
        }),
      });

      if (!createRoomRes.ok) {
        const errorText = await createRoomRes.text();
        console.error("Failed to create room:", errorText);
        return new Response(
          JSON.stringify({ error: "Failed to create Daily room" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const newRoom = await createRoomRes.json();
      roomUrl = newRoom.url;
      console.log(`Room created: ${roomUrl}`);
    }

    // Create a meeting token for this user
    console.log(`Creating meeting token for user: ${user.id}`);
    const tokenRes = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          room_name: sanitizedRoomName,
          user_id: user.id,
          user_name: userName || user.email || "Guest",
          // Token expires in 1 hour
          exp: Math.floor(Date.now() / 1000) + 3600,
          // Enable all features
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
        },
      }),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("Failed to create meeting token:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create meeting token" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tokenData = await tokenRes.json();
    console.log("Meeting token created successfully");

    return new Response(
      JSON.stringify({
        roomUrl,
        token: tokenData.token,
        roomName: sanitizedRoomName,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in daily-room function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
