// SHDWXBT - User Trades Edge Function
// Gerencia as operações do usuário (CRUD)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const method = req.method;
    
    let body: any = {};
    if (method !== "GET") {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const { wallet_address, action } = body;

    if (!wallet_address) {
      return new Response(
        JSON.stringify({ error: "wallet_address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📊 User Trades: ${action || method} for wallet ${wallet_address.substring(0, 10)}...`);

    // GET - List user's trades
    if (method === "GET" || action === "list") {
      const status = body.status || url.searchParams.get("status") || "active";
      
      let query = supabase
        .from("user_trades")
        .select("*")
        .eq("wallet_address", wallet_address)
        .order("entered_at", { ascending: false });
      
      if (status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching trades:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, trades: data || [], count: data?.length || 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST - Enter a new trade
    if (action === "enter") {
      const {
        symbol,
        name,
        direction,
        entry_price,
        current_price,
        stop_loss,
        target_1,
        target_2,
        target_3,
        trading_profile,
        timeframe,
        confluence_score
      } = body;

      if (!symbol || !entry_price) {
        return new Response(
          JSON.stringify({ error: "symbol and entry_price are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if already in trade for this symbol
      const { data: existing } = await supabase
        .from("user_trades")
        .select("id")
        .eq("wallet_address", wallet_address)
        .eq("symbol", symbol)
        .eq("status", "active")
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({ error: "Already in active trade for this symbol", trade_id: existing.id }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("user_trades")
        .insert({
          wallet_address,
          symbol,
          name: name || symbol.replace("USDT", ""),
          direction: direction || "bullish",
          entry_price,
          current_price: current_price || entry_price,
          stop_loss,
          target_1,
          target_2,
          target_3,
          trading_profile: trading_profile || "Day Trading",
          timeframe: timeframe || "15m",
          confluence_score: confluence_score || 0,
          status: "active"
        })
        .select()
        .single();

      if (error) {
        console.error("Error entering trade:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`✅ Trade entered: ${symbol} at ${entry_price}`);

      return new Response(
        JSON.stringify({ success: true, trade: data }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT - Update trade (price, targets hit, etc.)
    if (action === "update") {
      const { trade_id, symbol, updates } = body;

      if (!trade_id && !symbol) {
        return new Response(
          JSON.stringify({ error: "trade_id or symbol is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let query = supabase
        .from("user_trades")
        .update(updates)
        .eq("wallet_address", wallet_address);

      if (trade_id) {
        query = query.eq("id", trade_id);
      } else {
        query = query.eq("symbol", symbol).eq("status", "active");
      }

      const { data, error } = await query.select().single();

      if (error) {
        console.error("Error updating trade:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, trade: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT - Exit trade
    if (action === "exit") {
      const { trade_id, symbol, exit_price, close_reason } = body;

      if (!trade_id && !symbol) {
        return new Response(
          JSON.stringify({ error: "trade_id or symbol is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // First get the trade to calculate P&L
      let fetchQuery = supabase
        .from("user_trades")
        .select("*")
        .eq("wallet_address", wallet_address)
        .eq("status", "active");

      if (trade_id) {
        fetchQuery = fetchQuery.eq("id", trade_id);
      } else {
        fetchQuery = fetchQuery.eq("symbol", symbol);
      }

      const { data: trade, error: fetchError } = await fetchQuery.single();

      if (fetchError || !trade) {
        return new Response(
          JSON.stringify({ error: "Trade not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate realized P&L
      const finalPrice = exit_price || trade.current_price;
      let pnlRealized = 0;
      if (trade.direction === "bullish") {
        pnlRealized = ((finalPrice - trade.entry_price) / trade.entry_price) * 100;
      } else {
        pnlRealized = ((trade.entry_price - finalPrice) / trade.entry_price) * 100;
      }

      // Update trade as closed
      const { data, error } = await supabase
        .from("user_trades")
        .update({
          status: close_reason === "stop_loss" ? "stopped" : "closed",
          exit_price: finalPrice,
          pnl_realized: pnlRealized,
          close_reason: close_reason || "manual",
          closed_at: new Date().toISOString()
        })
        .eq("id", trade.id)
        .select()
        .single();

      if (error) {
        console.error("Error closing trade:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`❌ Trade closed: ${trade.symbol} with P&L ${pnlRealized.toFixed(2)}%`);

      return new Response(
        JSON.stringify({ success: true, trade: data, pnl_realized: pnlRealized }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET - User stats
    if (action === "stats") {
      const { data, error } = await supabase
        .from("user_trade_stats")
        .select("*")
        .eq("wallet_address", wallet_address)
        .single();

      if (error && error.code !== "PGRST116") { // PGRST116 = no rows
        console.error("Error fetching stats:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const stats = data || {
        active_trades: 0,
        closed_trades: 0,
        stopped_trades: 0,
        tp1_hits: 0,
        tp2_hits: 0,
        tp3_hits: 0,
        avg_pnl: 0,
        total_pnl: 0,
        winning_trades: 0,
        losing_trades: 0
      };

      return new Response(
        JSON.stringify({ success: true, stats }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Batch update prices (for real-time updates)
    if (action === "batch_update_prices") {
      const { prices } = body; // { "BTCUSDT": 45000, "ETHUSDT": 3000 }

      if (!prices || Object.keys(prices).length === 0) {
        return new Response(
          JSON.stringify({ error: "prices object is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get all active trades for this wallet
      const { data: trades, error: fetchError } = await supabase
        .from("user_trades")
        .select("*")
        .eq("wallet_address", wallet_address)
        .eq("status", "active");

      if (fetchError) {
        return new Response(
          JSON.stringify({ error: fetchError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updates: any[] = [];

      for (const trade of trades || []) {
        const newPrice = prices[trade.symbol];
        if (!newPrice) continue;

        // Calculate P&L
        let pnl = 0;
        if (trade.direction === "bullish") {
          pnl = ((newPrice - trade.entry_price) / trade.entry_price) * 100;
        } else {
          pnl = ((trade.entry_price - newPrice) / trade.entry_price) * 100;
        }

        // Check targets
        const updateData: any = {
          current_price: newPrice,
          pnl_percent: pnl
        };

        // Check TP1
        if (trade.target_1 && !trade.tp1_hit) {
          const hitTp1 = trade.direction === "bullish" 
            ? newPrice >= trade.target_1 
            : newPrice <= trade.target_1;
          if (hitTp1) {
            updateData.tp1_hit = true;
            updateData.tp1_hit_at = new Date().toISOString();
          }
        }

        // Check TP2
        if (trade.target_2 && !trade.tp2_hit) {
          const hitTp2 = trade.direction === "bullish" 
            ? newPrice >= trade.target_2 
            : newPrice <= trade.target_2;
          if (hitTp2) {
            updateData.tp2_hit = true;
            updateData.tp2_hit_at = new Date().toISOString();
          }
        }

        // Check TP3
        if (trade.target_3 && !trade.tp3_hit) {
          const hitTp3 = trade.direction === "bullish" 
            ? newPrice >= trade.target_3 
            : newPrice <= trade.target_3;
          if (hitTp3) {
            updateData.tp3_hit = true;
            updateData.tp3_hit_at = new Date().toISOString();
          }
        }

        updates.push({ id: trade.id, ...updateData });
      }

      // Batch update
      for (const update of updates) {
        const { id, ...data } = update;
        await supabase.from("user_trades").update(data).eq("id", id);
      }

      return new Response(
        JSON.stringify({ success: true, updated: updates.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unknown action
    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("User Trades error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
