// mark-target Edge Function
// Marks target hits (Zone, TP1-3, Stop Loss) for opportunities
// Supabase Edge Function

// @ts-ignore - Deno imports
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore - Deno imports
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // @ts-ignore - Deno runtime
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    // @ts-ignore - Deno runtime
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const body = await req.json()
    const { symbol, tp_index, hit_price, direction, hit_type } = body
    
    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`📍 mark-target: ${symbol} tp_index=${tp_index} hit_price=${hit_price} hit_type=${hit_type}`)
    
    // Find the opportunity
    const { data: opportunity, error: fetchError } = await supabase
      .from('opportunities')
      .select('*')
      .eq('symbol', symbol)
      .eq('is_active', true)
      .single()
    
    if (fetchError || !opportunity) {
      console.log(`❌ Opportunity not found for ${symbol}`)
      return new Response(
        JSON.stringify({ error: 'Opportunity not found', symbol }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const now = new Date().toISOString()
    let updateData: Record<string, any> = { updated_at: now }
    let eventType = ''
    
    // Determine what to update based on tp_index
    // tp_index: -1 = zone hit, 0 = stop loss, 1/2/3 = TP levels
    switch (Number(tp_index)) {
      case -1:
        // Entry Zone Hit
        updateData.zone_hit = true
        updateData.zone_hit_at = now
        updateData.zone_hit_price = hit_price
        eventType = 'ZONE_HIT'
        break
        
      case 0:
        // Stop Loss Hit
        updateData.sl_hit = true
        updateData.sl_hit_at = now
        updateData.sl_hit_price = hit_price
        updateData.is_stopped = true
        updateData.is_active = false // Deactivate on stop loss
        updateData.closed_at = now
        updateData.close_reason = 'stop_loss'
        eventType = 'STOP_LOSS_HIT'
        break
        
      case 1:
        // TP1 Hit
        if (opportunity.tp_hit_1 === true) {
          return new Response(
            JSON.stringify({ updated: false, message: 'TP1 already hit', row: opportunity }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        updateData.tp_hit_1 = true
        updateData.tp_hit_1_at = now
        updateData.tp_hit_1_price = hit_price
        eventType = 'TP1_HIT'
        break
        
      case 2:
        // TP2 Hit
        if (opportunity.tp_hit_2 === true) {
          return new Response(
            JSON.stringify({ updated: false, message: 'TP2 already hit', row: opportunity }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        updateData.tp_hit_2 = true
        updateData.tp_hit_2_at = now
        updateData.tp_hit_2_price = hit_price
        eventType = 'TP2_HIT'
        break
        
      case 3:
        // TP3 Hit - All targets complete
        if (opportunity.tp_hit_3 === true) {
          return new Response(
            JSON.stringify({ updated: false, message: 'TP3 already hit', row: opportunity }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        updateData.tp_hit_3 = true
        updateData.tp_hit_3_at = now
        updateData.tp_hit_3_price = hit_price
        updateData.is_completed = true
        updateData.is_active = false // Deactivate when all targets hit
        updateData.closed_at = now
        updateData.close_reason = 'all_targets'
        eventType = 'TP3_HIT'
        break
        
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid tp_index. Use -1 (zone), 0 (stop), 1-3 (TP levels)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
    
    // Update the opportunity
    const { data: updated, error: updateError } = await supabase
      .from('opportunities')
      .update(updateData)
      .eq('id', opportunity.id)
      .select()
      .single()
    
    if (updateError) {
      console.error(`❌ Update error for ${symbol}:`, updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update opportunity', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`✅ ${eventType} recorded for ${symbol} at price ${hit_price}`)
    
    // Optionally log to events table for history
    try {
      await supabase.from('opportunity_events').insert({
        opportunity_id: opportunity.id,
        symbol: symbol,
        event_type: eventType,
        hit_price: hit_price,
        direction: direction,
        created_at: now
      })
    } catch (e) {
      // Events table might not exist, that's OK
      console.log('Note: Could not log to opportunity_events table')
    }
    
    return new Response(
      JSON.stringify({ 
        updated: true, 
        event: eventType,
        symbol: symbol,
        hit_price: hit_price,
        row: updated 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('mark-target error:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
