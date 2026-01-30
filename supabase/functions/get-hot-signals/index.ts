// =====================================================
// EDGE FUNCTION: get-hot-signals
// Retorna sinais de movimentos recentes
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { limit = 50, since, type } = await req.json();

    let query = supabase
      .from("hot_signals")
      .select("*")
      .gt("expires_at", new Date().toISOString()) // Apenas não expirados
      .order("created_at", { ascending: false })
      .limit(limit);

    if (since) {
      query = query.gte("created_at", since);
    }

    if (type) {
      query = query.eq("type", type);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Formatar dados para o frontend
    const formattedData = data.map(signal => ({
      id: signal.id,
      symbol: signal.symbol,
      type: signal.type,
      price: parseFloat(signal.price),
      change: parseFloat(signal.change_percent || 0),
      message: signal.message,
      volumeSpike: signal.volume_spike ? parseFloat(signal.volume_spike) : null,
      timestamp: signal.created_at,
      expiresAt: signal.expires_at
    }));

    return new Response(
      JSON.stringify({ success: true, data: formattedData, count: formattedData.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
