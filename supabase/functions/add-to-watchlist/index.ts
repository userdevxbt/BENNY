// =====================================================
// EDGE FUNCTION: add-to-watchlist
// Adiciona item à watchlist
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

    const { symbol, reason, confluence_score, trend, current_price, notes } = await req.json();

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: "Missing required field: symbol" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert - atualiza se existir, insere se não
    const { data, error } = await supabase
      .from("watchlist")
      .upsert({
        symbol: symbol.toUpperCase(),
        reason: reason || "Manual add",
        confluence_score: confluence_score || 0,
        trend: trend || "neutral",
        current_price: current_price || 0,
        notes: notes || "",
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "symbol"
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
