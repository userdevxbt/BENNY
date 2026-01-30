// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-requested-with",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  // Handle CORS preflight - MUST respond quickly
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body safely
    let body: Record<string, unknown> = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch {
      body = {};
    }

    const { limit = 500, isActive = true } = body as { 
      limit?: number;
      isActive?: boolean;
    };

    console.log(`📡 get-watchlist called: limit=${limit}`);

    // Simple single query - optimized for mobile
    const query = supabase
      .from("watchlist")
      .select("*")
      .eq("is_active", isActive)
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 1000));

    const { data, error } = await query;

    if (error) {
      console.error("❌ Database error:", error);
      
      // Try fallback with RPC function
      console.log("🔄 Trying fallback RPC...");
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_active_watchlist', { p_limit: limit });
      
      if (rpcError) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ RPC fallback success: ${rpcData?.length || 0} items in ${elapsed}ms`);
      
      return new Response(
        JSON.stringify({ 
          data: rpcData || [], 
          count: rpcData?.length || 0,
          source: 'rpc_fallback',
          elapsed_ms: elapsed
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const elapsed = Date.now() - startTime;
    console.log(`✅ Success: ${data?.length || 0} watchlist items in ${elapsed}ms`);

    return new Response(
      JSON.stringify({ 
        data: data || [], 
        count: data?.length || 0,
        total: data?.length || 0,
        elapsed_ms: elapsed
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Server error after ${elapsed}ms:`, err);
    
    return new Response(
      JSON.stringify({ 
        error: "server_error", 
        message: (err as Error).message,
        elapsed_ms: elapsed
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
