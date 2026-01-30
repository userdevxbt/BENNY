-- =====================================================
-- EXECUTE THIS IN SUPABASE SQL EDITOR
-- Fix Mobile Access Issues
-- =====================================================

-- STEP 1: Disable RLS on all tables
ALTER TABLE IF EXISTS public.opportunities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.watchlist DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hot_signals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.performance_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.market_cache DISABLE ROW LEVEL SECURITY;

-- STEP 2: Grant permissions to anon (browser users)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.opportunities TO anon;
GRANT SELECT ON public.watchlist TO anon;
GRANT SELECT ON public.hot_signals TO anon;

-- STEP 3: Grant permissions to service_role (Edge Functions)
GRANT ALL ON public.opportunities TO service_role;
GRANT ALL ON public.watchlist TO service_role;
GRANT ALL ON public.hot_signals TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- STEP 4: Create optimized indexes
CREATE INDEX IF NOT EXISTS idx_opp_active_created 
ON public.opportunities (is_active, created_at DESC) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_watch_active_created 
ON public.watchlist (is_active, created_at DESC) 
WHERE is_active = TRUE;

-- STEP 5: Create fallback functions
CREATE OR REPLACE FUNCTION public.get_active_opportunities(p_limit INTEGER DEFAULT 500)
RETURNS SETOF public.opportunities
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT * FROM public.opportunities 
    WHERE is_active = TRUE 
    ORDER BY created_at DESC 
    LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.get_active_watchlist(p_limit INTEGER DEFAULT 500)
RETURNS SETOF public.watchlist
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT * FROM public.watchlist 
    WHERE is_active = TRUE 
    ORDER BY created_at DESC 
    LIMIT p_limit;
$$;

-- Grant execute to all
GRANT EXECUTE ON FUNCTION public.get_active_opportunities(INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_active_watchlist(INTEGER) TO anon, authenticated, service_role;

-- STEP 6: Verify counts
SELECT 
    'opportunities' as table_name, 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = TRUE) as active
FROM public.opportunities
UNION ALL
SELECT 
    'watchlist' as table_name, 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = TRUE) as active
FROM public.watchlist;

-- Done! Now redeploy Edge Functions
