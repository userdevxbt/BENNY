-- SHDWXBT - Migration 015: Fix Realtime for Views
-- Views cannot be added to realtime publications
-- This migration ensures only tables are in the publication

-- =====================================================
-- REMOVE VIEWS FROM REALTIME PUBLICATION
-- =====================================================

-- Drop the view from realtime if it was added
DO $$
BEGIN
    -- user_trade_stats is a view, not a table
    -- Views cannot be in realtime publications
    
    -- Try to remove view from publication
    BEGIN
        EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.user_trade_stats';
    EXCEPTION
        WHEN undefined_table THEN
            -- View was never in publication, ignore
            RAISE NOTICE 'user_trade_stats not in publication';
        WHEN OTHERS THEN
            -- Log but continue
            RAISE NOTICE 'Could not remove user_trade_stats: %', SQLERRM;
    END;
    
    -- v_thermometer_dashboard is also a view
    BEGIN
        EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.v_thermometer_dashboard';
    EXCEPTION
        WHEN undefined_table THEN
            RAISE NOTICE 'v_thermometer_dashboard not in publication';
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not remove v_thermometer_dashboard: %', SQLERRM;
    END;
    
END $$;

-- =====================================================
-- GRANT PERMISSIONS TO VIEWS (ONLY IF THEY EXIST)
-- =====================================================

-- Grant SELECT on user_trade_stats view
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'user_trade_stats') THEN
        EXECUTE 'GRANT SELECT ON public.user_trade_stats TO anon, authenticated, service_role';
        RAISE NOTICE 'Granted permissions on user_trade_stats';
    END IF;
END $$;

-- =====================================================
-- ENSURE TABLES ARE IN REALTIME (NOT VIEWS)
-- =====================================================

-- List of actual tables that should be in realtime:
-- - auth_nonces
-- - auth_sessions
-- - hot_signals
-- - market_cache
-- - metodologia_pivots
-- - opportunities
-- - opportunity_events
-- - performance_history
-- - user_trades (this is the actual TABLE, not the VIEW)
-- - watchlist
-- - whitelist

-- Note: user_trade_stats is a VIEW based on user_trades table
-- To get real-time updates, subscribe to user_trades table instead

-- Add comment to view
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'user_trade_stats') THEN
        EXECUTE 'COMMENT ON VIEW public.user_trade_stats IS ''Statistics view - not available for realtime. Subscribe to user_trades table instead.''';
    END IF;
END $$;
