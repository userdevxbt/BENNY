// =====================================================
// EDGE FUNCTION: save-hot-signal
// Salva sinais de movimentos em tempo real
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { symbol, type, price, change, message, volume_spike, timestamp } = await req.json();

    if (!symbol || !type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: symbol, type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se já existe sinal similar recente (dedup)
    const { data: existing } = await supabase
      .from("hot_signals")
      .select("id")
      .eq("symbol", symbol)
      .eq("type", type)
      .gte("created_at", new Date(Date.now() - 60000).toISOString()) // últimos 60s
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ success: true, deduplicated: true, message: "Signal already exists" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Inserir novo sinal
    const { data, error } = await supabase
      .from("hot_signals")
      .insert({
        symbol: symbol.toUpperCase(),
        type: type,
        price: price,
        change_percent: change,
        message: message,
        volume_spike: volume_spike,
        created_at: timestamp || new Date().toISOString(),
        expires_at: new Date(Date.now() + 600000).toISOString() // 10 minutos
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
