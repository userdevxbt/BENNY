-- =====================================================
-- FIX MOBILE ACCESS - Migration 014
-- Corrige problemas de acesso mobile
-- =====================================================

-- =====================================================
-- 1. DISABLE RLS ON ALL TABLES (permitir acesso anon)
-- =====================================================
ALTER TABLE IF EXISTS public.opportunities DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.watchlist DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hot_signals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.performance_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.market_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_trades DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. DROP ALL EXISTING POLICIES (limpar conflitos)
-- =====================================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- =====================================================
-- 3. GRANT FULL PERMISSIONS TO ALL ROLES
-- =====================================================

-- Permissões para anon (usado pelo browser)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Permissões para authenticated
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Permissões para service_role (usado pelas Edge Functions)
GRANT ALL ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =====================================================
-- 4. ENSURE TABLES EXIST WITH CORRECT STRUCTURE
-- =====================================================

-- Opportunities - garantir que existe
CREATE TABLE IF NOT EXISTS public.opportunities (
    id SERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    name TEXT,
    direction TEXT DEFAULT 'bullish',
    trend TEXT DEFAULT 'bullish',
    entry_price DECIMAL(20, 8),
    current_price DECIMAL(20, 8),
    stop_loss DECIMAL(20, 8),
    invalidation DECIMAL(20, 8),
    target_1 DECIMAL(20, 8),
    target_2 DECIMAL(20, 8),
    target_3 DECIMAL(20, 8),
    tp_hit_1 BOOLEAN DEFAULT FALSE,
    tp_hit_2 BOOLEAN DEFAULT FALSE,
    tp_hit_3 BOOLEAN DEFAULT FALSE,
    rsi_value DECIMAL(10, 4),
    confluence_score INTEGER DEFAULT 50,
    trading_profile TEXT DEFAULT 'Day Trading',
    signal_timeframe TEXT DEFAULT '15m',
    target_timeframe TEXT DEFAULT '4h',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watchlist - garantir que existe
CREATE TABLE IF NOT EXISTS public.watchlist (
    id SERIAL PRIMARY KEY,
    symbol TEXT NOT NULL,
    name TEXT,
    direction TEXT DEFAULT 'bullish',
    trend TEXT DEFAULT 'bullish',
    entry_price DECIMAL(20, 8),
    current_price DECIMAL(20, 8),
    stop_loss DECIMAL(20, 8),
    rsi_value DECIMAL(10, 4),
    confluence_score INTEGER DEFAULT 30,
    reason TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. CREATE OPTIMIZED INDEXES FOR MOBILE
-- =====================================================

-- Drop and recreate indexes for better performance
DROP INDEX IF EXISTS idx_opportunities_mobile_optimized;
DROP INDEX IF EXISTS idx_watchlist_mobile_optimized;

-- Index composto para queries mobile (is_active + created_at)
CREATE INDEX IF NOT EXISTS idx_opportunities_mobile_optimized 
ON public.opportunities (is_active, created_at DESC) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_watchlist_mobile_optimized 
ON public.watchlist (is_active, created_at DESC) 
WHERE is_active = TRUE;

-- Index para score ordering
CREATE INDEX IF NOT EXISTS idx_opportunities_score 
ON public.opportunities (confluence_score DESC) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_watchlist_score 
ON public.watchlist (confluence_score DESC) 
WHERE is_active = TRUE;

-- =====================================================
-- 6. CREATE SIMPLE READ FUNCTION (bypass RLS)
-- =====================================================

-- Função simples para ler opportunities sem RLS
CREATE OR REPLACE FUNCTION public.get_active_opportunities(p_limit INTEGER DEFAULT 500)
RETURNS SETOF public.opportunities
LANGUAGE sql
SECURITY DEFINER  -- Executa com permissões do owner
STABLE
AS $$
    SELECT * FROM public.opportunities 
    WHERE is_active = TRUE 
    ORDER BY created_at DESC 
    LIMIT p_limit;
$$;

-- Função simples para ler watchlist sem RLS  
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

-- =====================================================
-- 7. VERIFY SETUP
-- =====================================================

-- Output test
DO $$
DECLARE
    opp_count INTEGER;
    watch_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO opp_count FROM public.opportunities WHERE is_active = TRUE;
    SELECT COUNT(*) INTO watch_count FROM public.watchlist WHERE is_active = TRUE;
    
    RAISE NOTICE 'Migration 014 complete:';
    RAISE NOTICE '  - Active opportunities: %', opp_count;
    RAISE NOTICE '  - Active watchlist: %', watch_count;
    RAISE NOTICE '  - RLS disabled on all tables';
    RAISE NOTICE '  - Permissions granted to anon, authenticated, service_role';
END $$;
