-- =====================================================
-- RPC Function for bulk upsert opportunities
-- Migration 005
-- =====================================================

CREATE OR REPLACE FUNCTION upsert_opportunities(
  p_opportunities JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_symbols TEXT[];
  v_count INTEGER;
BEGIN
  -- Extract symbols from incoming data
  SELECT array_agg(opp->>'symbol')
  INTO v_symbols
  FROM jsonb_array_elements(p_opportunities) AS opp;
  
  -- Delete existing records for these symbols
  DELETE FROM public.opportunities
  WHERE symbol = ANY(v_symbols);
  
  -- Insert new records
  INSERT INTO public.opportunities (
    symbol, name, direction, trend,
    entry_zone_start, entry_zone_end, entry_price, current_price,
    stop_loss, invalidation, target_1, target_2, target_3,
    rsi_value, rsi_status, confluence_score,
    fib_382, fib_500, fib_618, fib_zone, fibonacci_extensions,
    trading_profile, trigger_timeframe, signal_timeframe, target_timeframe, anchor_timeframe,
    setup_type, pivot_type, market_structure, metodologia_acao,
    analysis_title, methodology_summary, context_line_1, context_line_2, context_line_3, context_line_4,
    invalidation_text, positive_confluences, negative_confluences,
    is_active
  )
  SELECT
    opp->>'symbol',
    opp->>'name',
    opp->>'direction',
    opp->>'trend',
    (opp->>'entry_zone_start')::DECIMAL,
    (opp->>'entry_zone_end')::DECIMAL,
    (opp->>'entry_price')::DECIMAL,
    (opp->>'current_price')::DECIMAL,
    (opp->>'stop_loss')::DECIMAL,
    (opp->>'invalidation')::DECIMAL,
    (opp->>'target_1')::DECIMAL,
    (opp->>'target_2')::DECIMAL,
    (opp->>'target_3')::DECIMAL,
    (opp->>'rsi_value')::DECIMAL,
    opp->>'rsi_status',
    (opp->>'confluence_score')::INTEGER,
    (opp->>'fib_382')::DECIMAL,
    (opp->>'fib_500')::DECIMAL,
    (opp->>'fib_618')::DECIMAL,
    opp->>'fib_zone',
    (opp->>'fibonacci_extensions')::JSONB,
    opp->>'trading_profile',
    opp->>'trigger_timeframe',
    opp->>'signal_timeframe',
    opp->>'target_timeframe',
    opp->>'anchor_timeframe',
    opp->>'setup_type',
    opp->>'pivot_type',
    opp->>'market_structure',
    opp->>'metodologia_acao',
    opp->>'analysis_title',
    opp->>'methodology_summary',
    opp->>'context_line_1',
    opp->>'context_line_2',
    opp->>'context_line_3',
    opp->>'context_line_4',
    opp->>'invalidation_text',
    (opp->>'positive_confluences')::JSONB,
    (opp->>'negative_confluences')::JSONB,
    COALESCE((opp->>'is_active')::BOOLEAN, TRUE)
  FROM jsonb_array_elements(p_opportunities) AS opp;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'inserted', v_count,
    'symbols', v_symbols
  );
END;
$$;

-- Grant execute to service_role
GRANT EXECUTE ON FUNCTION upsert_opportunities TO service_role;
GRANT EXECUTE ON FUNCTION upsert_opportunities TO anon;
