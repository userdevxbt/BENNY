-- =====================================================
-- AGGRESSIVE CLEANUP: Remove ALL policies and recreate
-- This script removes every single policy from tables
-- =====================================================

-- =====================================================
-- 1. DROP ALL POLICIES FROM market_cache
-- =====================================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'market_cache' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON market_cache', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- =====================================================
-- 2. DROP ALL POLICIES FROM opportunities  
-- =====================================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'opportunities' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON opportunities', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- =====================================================
-- 3. DROP ALL POLICIES FROM watchlist
-- =====================================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'watchlist' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON watchlist', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- =====================================================
-- 4. DROP ALL POLICIES FROM opportunity_events
-- =====================================================
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'opportunity_events' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON opportunity_events', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- =====================================================
-- 5. DROP ALL DUPLICATE INDEXES FROM opportunities
-- =====================================================
DO $$
DECLARE
    idx RECORD;
BEGIN
    FOR idx IN 
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'opportunities' 
        AND schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'    -- Keep primary key
        AND indexname NOT LIKE '%_key'     -- Keep unique constraints
        AND indexname NOT LIKE '%_unique'  -- Keep unique indexes
        AND indexname NOT IN (             -- Exclude constraint-backed indexes
            SELECT conname FROM pg_constraint WHERE conrelid = 'opportunities'::regclass
        )
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I', idx.indexname);
        RAISE NOTICE 'Dropped index: %', idx.indexname;
    END LOOP;
END $$;

-- =====================================================
-- 6. CREATE SINGLE POLICIES FOR EACH TABLE
-- =====================================================

-- Enable RLS
ALTER TABLE market_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_events ENABLE ROW LEVEL SECURITY;

-- market_cache: Single policy per action
CREATE POLICY "mc_select" ON market_cache FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "mc_insert" ON market_cache FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "mc_update" ON market_cache FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "mc_delete" ON market_cache FOR DELETE TO authenticated, anon USING (true);

-- opportunities: Single policy per action
CREATE POLICY "opp_select" ON opportunities FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "opp_insert" ON opportunities FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "opp_update" ON opportunities FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "opp_delete" ON opportunities FOR DELETE TO authenticated, anon USING (true);

-- watchlist: Single policy per action
CREATE POLICY "wl_select" ON watchlist FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "wl_insert" ON watchlist FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "wl_update" ON watchlist FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "wl_delete" ON watchlist FOR DELETE TO authenticated, anon USING (true);

-- opportunity_events: Single policy per action
CREATE POLICY "oe_select" ON opportunity_events FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "oe_insert" ON opportunity_events FOR INSERT TO authenticated, anon WITH CHECK (true);

-- =====================================================
-- 7. CREATE CLEAN INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_opp_symbol ON opportunities(symbol);
CREATE INDEX IF NOT EXISTS idx_opp_active ON opportunities(is_active);
CREATE INDEX IF NOT EXISTS idx_opp_created ON opportunities(created_at DESC);

-- =====================================================
-- 8. VERIFY - Show remaining policies
-- =====================================================
DO $$
DECLARE
    cnt INTEGER;
BEGIN
    SELECT COUNT(*) INTO cnt FROM pg_policies WHERE tablename IN ('market_cache', 'opportunities', 'watchlist', 'opportunity_events') AND schemaname = 'public';
    RAISE NOTICE '✅ Total policies after cleanup: %', cnt;
END $$;
