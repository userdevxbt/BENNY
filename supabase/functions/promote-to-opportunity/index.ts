// =====================================================
// EDGE FUNCTION: promote-to-opportunity
// Promove item da watchlist para oportunidade com análise de confluência
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuração do Thermometer
const CONFLUENCE_THRESHOLDS = {
  minimum: 50,    // Mínimo para promover
  good: 60,       // Boa oportunidade
  excellent: 75,  // Excelente oportunidade
  perfect: 90     // Setup perfeito
};

const LEVEL_CONFIG = {
  freezing: { min: 0, max: 20, canPromote: false },
  cold: { min: 20, max: 40, canPromote: false },
  neutral: { min: 40, max: 60, canPromote: true, tier: 'C' },
  warm: { min: 60, max: 80, canPromote: true, tier: 'B' },
  hot: { min: 80, max: 100, canPromote: true, tier: 'A' }
};

function getOpportunityTier(score: number): string {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { symbol, force = false } = await req.json();

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: "Missing required field: symbol" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar item da watchlist
    const { data: watchlistItem, error: fetchError } = await supabase
      .from("watchlist")
      .select("*")
      .eq("symbol", symbol.toUpperCase())
      .eq("is_active", true)
      .single();

    if (fetchError || !watchlistItem) {
      return new Response(
        JSON.stringify({ error: "Item not found in watchlist" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar confluência
    const confluenceScore = watchlistItem.confluence_score || 0;
    const confluenceLevel = watchlistItem.confluence_level || 'unknown';
    
    // Verificar se pode promover
    if (!force && confluenceScore < CONFLUENCE_THRESHOLDS.minimum) {
      return new Response(
        JSON.stringify({ 
          error: "Insufficient confluence score",
          current_score: confluenceScore,
          minimum_required: CONFLUENCE_THRESHOLDS.minimum,
          suggestion: "Use force=true to override or improve the analysis"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determinar tier e prioridade
    const tier = getOpportunityTier(confluenceScore);
    const priority = tier === 'S' ? 'critical' : 
                     tier === 'A' ? 'high' : 
                     tier === 'B' ? 'medium' : 'low';

    // Criar nova oportunidade
    const { data: opportunity, error: insertError } = await supabase
      .from("opportunities")
      .insert({
        symbol: watchlistItem.symbol,
        trend: watchlistItem.trend,
        confluence_score: Math.max(confluenceScore, CONFLUENCE_THRESHOLDS.minimum),
        confluence_level: confluenceLevel,
        confluence_breakdown: watchlistItem.confluence_breakdown,
        current_price: watchlistItem.current_price,
        entry_price: watchlistItem.entry_price,
        target_price: watchlistItem.target_price,
        stop_loss: watchlistItem.stop_loss,
        tier: tier,
        priority: priority,
        is_active: true,
        watchlist_promoted: true,
        force_promoted: force && confluenceScore < CONFLUENCE_THRESHOLDS.minimum,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Desativar da watchlist
    await supabase
      .from("watchlist")
      .update({ 
        is_active: false, 
        promoted_at: new Date().toISOString(),
        opportunity_id: opportunity.id 
      })
      .eq("symbol", symbol.toUpperCase());

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: opportunity,
        tier: tier,
        priority: priority,
        message: `${symbol} promoted to ${tier}-tier opportunity`,
        thermometer: {
          score: confluenceScore,
          level: confluenceLevel,
          action: confluenceScore >= 80 ? 'ENTRADA FORTE' : 
                  confluenceScore >= 60 ? 'ENTRADA VÁLIDA' : 'AGUARDAR'
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
