-- =====================================================
-- CLEANUP: Remove duplicate policies and indexes
-- This fixes the "Multiple Permissive Policies" warnings
-- =====================================================

-- =====================================================
-- 1. CLEANUP market_cache POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Allow read market_cache" ON market_cache;
DROP POLICY IF EXISTS "Allow insert market_cache" ON market_cache;
DROP POLICY IF EXISTS "Allow update market_cache" ON market_cache;
DROP POLICY IF EXISTS "Allow delete market_cache" ON market_cache;
DROP POLICY IF EXISTS "Enable read access for all users" ON market_cache;
DROP POLICY IF EXISTS "Enable insert for all users" ON market_cache;
DROP POLICY IF EXISTS "Enable update for all users" ON market_cache;
DROP POLICY IF EXISTS "Enable delete for all users" ON market_cache;
DROP POLICY IF EXISTS "market_cache_select_policy" ON market_cache;
DROP POLICY IF EXISTS "market_cache_insert_policy" ON market_cache;
DROP POLICY IF EXISTS "market_cache_update_policy" ON market_cache;
DROP POLICY IF EXISTS "market_cache_delete_policy" ON market_cache;
DROP POLICY IF EXISTS "anon_select_market_cache" ON market_cache;
DROP POLICY IF EXISTS "anon_insert_market_cache" ON market_cache;
DROP POLICY IF EXISTS "authenticated_select_market_cache" ON market_cache;
DROP POLICY IF EXISTS "authenticated_insert_market_cache" ON market_cache;

-- Create single policies for market_cache
CREATE POLICY "market_cache_select" ON market_cache FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "market_cache_insert" ON market_cache FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "market_cache_update" ON market_cache FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "market_cache_delete" ON market_cache FOR DELETE TO authenticated, anon USING (true);

-- =====================================================
-- 2. CLEANUP opportunities POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Allow read opportunities" ON opportunities;
DROP POLICY IF EXISTS "Allow insert opportunities" ON opportunities;
DROP POLICY IF EXISTS "Allow update opportunities" ON opportunities;
DROP POLICY IF EXISTS "Allow delete opportunities" ON opportunities;
DROP POLICY IF EXISTS "Enable read access for all users" ON opportunities;
DROP POLICY IF EXISTS "Enable insert for all users" ON opportunities;
DROP POLICY IF EXISTS "Enable update for all users" ON opportunities;
DROP POLICY IF EXISTS "Enable delete for all users" ON opportunities;
DROP POLICY IF EXISTS "opportunities_select_policy" ON opportunities;
DROP POLICY IF EXISTS "opportunities_insert_policy" ON opportunities;
DROP POLICY IF EXISTS "opportunities_update_policy" ON opportunities;
DROP POLICY IF EXISTS "opportunities_delete_policy" ON opportunities;
DROP POLICY IF EXISTS "anon_select_opportunities" ON opportunities;
DROP POLICY IF EXISTS "anon_insert_opportunities" ON opportunities;
DROP POLICY IF EXISTS "authenticated_select_opportunities" ON opportunities;
DROP POLICY IF EXISTS "authenticated_insert_opportunities" ON opportunities;
DROP POLICY IF EXISTS "public_read_opportunities" ON opportunities;
DROP POLICY IF EXISTS "public_insert_opportunities" ON opportunities;

-- Create single policies for opportunities
CREATE POLICY "opportunities_select" ON opportunities FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "opportunities_insert" ON opportunities FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "opportunities_update" ON opportunities FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "opportunities_delete" ON opportunities FOR DELETE TO authenticated, anon USING (true);

-- =====================================================
-- 3. CLEANUP watchlist POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Allow read watchlist" ON watchlist;
DROP POLICY IF EXISTS "Allow insert watchlist" ON watchlist;
DROP POLICY IF EXISTS "Allow update watchlist" ON watchlist;
DROP POLICY IF EXISTS "Allow delete watchlist" ON watchlist;
DROP POLICY IF EXISTS "Enable read access for all users" ON watchlist;
DROP POLICY IF EXISTS "Enable insert for all users" ON watchlist;
DROP POLICY IF EXISTS "Enable update for all users" ON watchlist;
DROP POLICY IF EXISTS "Enable delete for all users" ON watchlist;
DROP POLICY IF EXISTS "watchlist_select_policy" ON watchlist;
DROP POLICY IF EXISTS "watchlist_insert_policy" ON watchlist;
DROP POLICY IF EXISTS "watchlist_update_policy" ON watchlist;
DROP POLICY IF EXISTS "watchlist_delete_policy" ON watchlist;
DROP POLICY IF EXISTS "anon_select_watchlist" ON watchlist;
DROP POLICY IF EXISTS "anon_insert_watchlist" ON watchlist;
DROP POLICY IF EXISTS "authenticated_select_watchlist" ON watchlist;
DROP POLICY IF EXISTS "authenticated_insert_watchlist" ON watchlist;
DROP POLICY IF EXISTS "public_read_watchlist" ON watchlist;
DROP POLICY IF EXISTS "public_insert_watchlist" ON watchlist;

-- Create single policies for watchlist
CREATE POLICY "watchlist_select" ON watchlist FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "watchlist_insert" ON watchlist FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "watchlist_update" ON watchlist FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "watchlist_delete" ON watchlist FOR DELETE TO authenticated, anon USING (true);

-- =====================================================
-- 4. CLEANUP opportunity_events POLICIES
-- =====================================================
DROP POLICY IF EXISTS "Allow read opportunity_events" ON opportunity_events;
DROP POLICY IF EXISTS "Allow insert opportunity_events" ON opportunity_events;

-- Create single policies for opportunity_events
CREATE POLICY "opportunity_events_select" ON opportunity_events FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "opportunity_events_insert" ON opportunity_events FOR INSERT TO authenticated, anon WITH CHECK (true);

-- =====================================================
-- 5. CLEANUP DUPLICATE INDEXES on opportunities
-- =====================================================
-- First, let's see what indexes exist and drop duplicates
-- Common duplicate index patterns:

DROP INDEX IF EXISTS idx_opportunities_symbol_duplicate;
DROP INDEX IF EXISTS idx_opportunities_symbol_2;
DROP INDEX IF EXISTS opportunities_symbol_idx_2;
DROP INDEX IF EXISTS opportunities_symbol_key;

-- Keep only essential indexes (drop and recreate to ensure uniqueness)
DROP INDEX IF EXISTS idx_opportunities_symbol;
DROP INDEX IF EXISTS idx_opportunities_is_active;
DROP INDEX IF EXISTS idx_opportunities_direction;
DROP INDEX IF EXISTS idx_opportunities_created_at;

-- Recreate clean indexes
CREATE INDEX IF NOT EXISTS idx_opp_symbol ON opportunities(symbol);
CREATE INDEX IF NOT EXISTS idx_opp_active ON opportunities(is_active);
CREATE INDEX IF NOT EXISTS idx_opp_direction ON opportunities(direction);
CREATE INDEX IF NOT EXISTS idx_opp_created ON opportunities(created_at DESC);

-- =====================================================
-- 6. Verify RLS is enabled on all tables
-- =====================================================
ALTER TABLE market_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Done! All duplicate policies and indexes removed
-- =====================================================
