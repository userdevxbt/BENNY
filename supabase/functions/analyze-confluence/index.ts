// =====================================================
// EDGE FUNCTION: analyze-confluence
// Analisa confluências usando o sistema Master Precision
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuração do Thermometer
const THERMOMETER_CONFIG = {
  levels: {
    freezing: { min: 0, max: 20, label: 'CONGELADO', action: 'NÃO OPERAR' },
    cold: { min: 20, max: 40, label: 'FRIO', action: 'NÃO OPERAR' },
    neutral: { min: 40, max: 60, label: 'MORNO', action: 'AGUARDAR' },
    warm: { min: 60, max: 80, label: 'QUENTE', action: 'ENTRADA VÁLIDA' },
    hot: { min: 80, max: 100, label: 'MUITO QUENTE', action: 'ENTRADA FORTE' }
  },
  weights: {
    structure: { maxPoints: 20, items: {
      trend_aligned: 5, bos_confirmed: 8, choch_detected: 10,
      hh_hl_pattern: 5, ll_lh_pattern: 5
    }},
    fibonacci: { maxPoints: 20, items: {
      in_ote: 10, in_golden_pocket: 8, in_discount: 6,
      in_premium: 6, near_key_level: 4
    }},
    smc: { maxPoints: 20, items: {
      strong_order_block: 10, high_order_block: 7, fvg_present: 5,
      liquidity_sweep: 8, mitigation_block: 5
    }},
    momentum: { maxPoints: 15, items: {
      displacement: 8, strong_body: 5, volume_spike: 5, rsi_confirmation: 4
    }},
    mtf: { maxPoints: 15, items: {
      anchor_aligned: 5, signal_aligned: 5, trigger_aligned: 5, all_aligned: 8
    }},
    risk: { maxPoints: 10, items: {
      rr_above_3: 5, rr_above_2: 3, clear_invalidation: 3, tight_stop: 2
    }}
  }
};

// Analisar confluências
function analyzeConfluence(data: any): any {
  const direction = data.trend || data.direction;
  const isBullish = direction === 'bullish' || direction === 'alta' || direction === 'BULLISH';
  
  const components: Record<string, { score: number; items: string[] }> = {};
  let totalScore = 0;
  let maxPossible = 0;
  const activeItems: Array<{ category: string; item: string; points: number }> = [];

  // Initialize components
  for (const [category, config] of Object.entries(THERMOMETER_CONFIG.weights)) {
    components[category] = { score: 0, items: [] };
    maxPossible += config.maxPoints;
  }

  // Helper to add item
  const addItem = (category: string, item: string, condition: boolean) => {
    if (!condition) return;
    const config = THERMOMETER_CONFIG.weights[category as keyof typeof THERMOMETER_CONFIG.weights];
    if (!config || !config.items[item as keyof typeof config.items]) return;
    
    const points = config.items[item as keyof typeof config.items];
    if (components[category].items.includes(item)) return;
    
    components[category].items.push(item);
    components[category].score += points;
    activeItems.push({ category, item, points });
  };

  // STRUCTURE ANALYSIS
  const anchorTrend = data.anchor_trend;
  const setup = (data.setup || '').toLowerCase();
  
  addItem('structure', 'trend_aligned', 
    (anchorTrend === 'bullish' && isBullish) || (anchorTrend === 'bearish' && !isBullish));
  addItem('structure', 'bos_confirmed', !!data.bos_confirmed);
  addItem('structure', 'choch_detected', !!data.choch_detected);
  addItem('structure', 'hh_hl_pattern', 
    isBullish && (setup.includes('fundo ascendente') || setup.includes('higher low')));
  addItem('structure', 'll_lh_pattern', 
    !isBullish && (setup.includes('topo descendente') || setup.includes('lower high')));

  // FIBONACCI ANALYSIS
  const fibZone = data.fib_zone || data.premium_discount;
  const fibPct = data.fib_zone_pct || 50;
  
  addItem('fibonacci', 'in_ote', fibZone === 'ote' || (fibPct >= 61.8 && fibPct <= 78.6));
  addItem('fibonacci', 'in_golden_pocket', fibPct >= 61.8 && fibPct <= 65);
  addItem('fibonacci', 'in_discount', fibZone === 'discount' && isBullish);
  addItem('fibonacci', 'in_premium', fibZone === 'premium' && !isBullish);
  addItem('fibonacci', 'near_key_level', !!data.near_fib_level);

  // SMC ANALYSIS
  addItem('smc', 'strong_order_block', data.order_block_tier === 'STRONG');
  addItem('smc', 'high_order_block', data.order_block_tier === 'HIGH');
  addItem('smc', 'fvg_present', !!data.fvg_present || !!data.has_fvg);
  addItem('smc', 'liquidity_sweep', !!data.liquidity_sweep);

  // MOMENTUM ANALYSIS
  addItem('momentum', 'displacement', !!data.displacement);
  addItem('momentum', 'volume_spike', !!data.volume_spike);
  
  const rsi = data.rsi_value || data.rsi;
  if (typeof rsi === 'number') {
    addItem('momentum', 'rsi_confirmation', 
      (isBullish && rsi <= 35) || (!isBullish && rsi >= 65));
  }

  // MTF ANALYSIS
  const signalTrend = data.signal_trend;
  const bullishTrend = isBullish ? 'bullish' : 'bearish';
  
  addItem('mtf', 'anchor_aligned', anchorTrend === bullishTrend);
  addItem('mtf', 'signal_aligned', signalTrend === bullishTrend);
  addItem('mtf', 'trigger_aligned', !!data.trigger_aligned);
  addItem('mtf', 'all_aligned', 
    anchorTrend === bullishTrend && signalTrend === bullishTrend && data.trigger_aligned);

  // RISK ANALYSIS
  const riskReward = data.risk_reward || data.rr;
  if (typeof riskReward === 'number') {
    addItem('risk', 'rr_above_3', riskReward >= 3);
    addItem('risk', 'rr_above_2', riskReward >= 2 && riskReward < 3);
  }
  addItem('risk', 'clear_invalidation', !!data.invalidation || !!data.stop_loss);

  // Calculate total
  let total = 0;
  const breakdown: Record<string, any> = {};
  
  for (const [category, config] of Object.entries(THERMOMETER_CONFIG.weights)) {
    const categoryScore = Math.min(components[category].score, config.maxPoints);
    breakdown[category] = {
      score: categoryScore,
      maxPoints: config.maxPoints,
      percentage: Math.round((categoryScore / config.maxPoints) * 100),
      items: components[category].items
    };
    total += categoryScore;
  }

  const finalScore = Math.round((total / maxPossible) * 100);

  // Determine level
  let level = 'freezing';
  let action = 'NÃO OPERAR';
  
  for (const [key, config] of Object.entries(THERMOMETER_CONFIG.levels)) {
    if (finalScore >= config.min && finalScore < config.max) {
      level = key;
      action = config.action;
      break;
    }
  }
  
  if (finalScore >= 100) {
    level = 'hot';
    action = 'ENTRADA IMEDIATA';
  }

  return {
    confluence_score: finalScore,
    confluence_level: level,
    confluence_action: action,
    confluence_breakdown: breakdown,
    confluence_items: activeItems.length,
    active_items: activeItems,
    analysis_timestamp: new Date().toISOString()
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { symbol, action: requestAction } = body;

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: "Missing required field: symbol" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Analisar confluências
    const confluenceResult = analyzeConfluence(body);

    // Se for apenas análise, retornar resultado
    if (requestAction === 'analyze_only') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          symbol: symbol.toUpperCase(),
          ...confluenceResult 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Salvar/atualizar no banco
    const { data: existing } = await supabase
      .from("watchlist")
      .select("id")
      .eq("symbol", symbol.toUpperCase())
      .eq("is_active", true)
      .single();

    let result;
    
    if (existing) {
      // Atualizar existente
      const { data, error } = await supabase
        .from("watchlist")
        .update({
          confluence_score: confluenceResult.confluence_score,
          confluence_level: confluenceResult.confluence_level,
          confluence_action: confluenceResult.confluence_action,
          confluence_breakdown: confluenceResult.confluence_breakdown,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id)
        .select()
        .single();
        
      if (error) throw error;
      result = data;
    } else {
      // Inserir novo
      const { data, error } = await supabase
        .from("watchlist")
        .insert({
          symbol: symbol.toUpperCase(),
          trend: body.trend || body.direction || 'neutral',
          current_price: body.current_price || body.price,
          confluence_score: confluenceResult.confluence_score,
          confluence_level: confluenceResult.confluence_level,
          confluence_action: confluenceResult.confluence_action,
          confluence_breakdown: confluenceResult.confluence_breakdown,
          is_active: true,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) throw error;
      result = data;
    }

    // Auto-promote se score >= 80
    if (confluenceResult.confluence_score >= 80 && requestAction !== 'no_promote') {
      const { error: promoteError } = await supabase
        .from("opportunities")
        .upsert({
          symbol: symbol.toUpperCase(),
          trend: body.trend || body.direction,
          confluence_score: confluenceResult.confluence_score,
          confluence_level: confluenceResult.confluence_level,
          current_price: body.current_price || body.price,
          is_active: true,
          auto_promoted: true,
          created_at: new Date().toISOString()
        }, { onConflict: 'symbol' });

      if (promoteError) {
        console.error('Auto-promote failed:', promoteError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result,
        confluence: confluenceResult,
        auto_promoted: confluenceResult.confluence_score >= 80
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
