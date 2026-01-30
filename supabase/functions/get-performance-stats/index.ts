// =====================================================
// EDGE FUNCTION: get-performance-stats
// Retorna estatísticas de performance do sistema
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

    // Buscar oportunidades dos últimos 30 dias
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: opportunities, error: oppError } = await supabase
      .from("opportunities")
      .select("*")
      .gte("created_at", thirtyDaysAgo);

    if (oppError) throw oppError;

    // Calcular estatísticas
    const total = opportunities?.length || 0;
    const tp1Hits = opportunities?.filter(o => o.tp_hit_1 === true).length || 0;
    const tp2Hits = opportunities?.filter(o => o.tp_hit_2 === true).length || 0;
    const tp3Hits = opportunities?.filter(o => o.tp_hit_3 === true).length || 0;
    const slHits = opportunities?.filter(o => o.sl_hit === true).length || 0;
    
    const totalTpHits = tp1Hits + tp2Hits + tp3Hits;
    const completedTrades = totalTpHits + slHits;
    const winRate = completedTrades > 0 ? ((totalTpHits / completedTrades) * 100).toFixed(1) : 0;

    // Buscar hot signals recentes
    const { data: hotSignals, error: hsError } = await supabase
      .from("hot_signals")
      .select("id")
      .gt("expires_at", new Date().toISOString());

    // Buscar watchlist ativos
    const { data: watchlist, error: wlError } = await supabase
      .from("watchlist")
      .select("id")
      .eq("is_active", true);

    // Calcular precisão por tipo de sinal
    const bullishOpps = opportunities?.filter(o => o.trend === "bullish") || [];
    const bearishOpps = opportunities?.filter(o => o.trend === "bearish") || [];
    
    const bullishWins = bullishOpps.filter(o => o.tp_hit_1 || o.tp_hit_2 || o.tp_hit_3).length;
    const bearishWins = bearishOpps.filter(o => o.tp_hit_1 || o.tp_hit_2 || o.tp_hit_3).length;

    const stats = {
      // Totais
      totalSignals: total,
      activeSignals: opportunities?.filter(o => o.is_active).length || 0,
      
      // Win Rate
      winRate: parseFloat(winRate),
      
      // TP Hits
      tp1Hits,
      tp2Hits,
      tp3Hits,
      totalTpHits,
      
      // Stop Loss
      slHits,
      
      // Por direção
      bullish: {
        total: bullishOpps.length,
        wins: bullishWins,
        winRate: bullishOpps.length > 0 ? ((bullishWins / bullishOpps.length) * 100).toFixed(1) : 0
      },
      bearish: {
        total: bearishOpps.length,
        wins: bearishWins,
        winRate: bearishOpps.length > 0 ? ((bearishWins / bearishOpps.length) * 100).toFixed(1) : 0
      },
      
      // Outros
      hotSignalsActive: hotSignals?.length || 0,
      watchlistCount: watchlist?.length || 0,
      
      // Período
      period: "30 days",
      generatedAt: new Date().toISOString()
    };

    return new Response(
      JSON.stringify({ success: true, ...stats }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        winRate: 0,
        totalSignals: 0,
        tpHits: 0,
        slHits: 0
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
