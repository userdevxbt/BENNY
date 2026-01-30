-- =====================================================
-- Remove problematic triggers and fix tables
-- Migration 006
-- PostgreSQL / Supabase Migration (NOT MSSQL)
-- =====================================================

-- Drop any triggers that may be causing issues
DROP TRIGGER IF EXISTS calculate_targets_before_insert ON public.opportunities;
DROP TRIGGER IF EXISTS calculate_targets_before_update ON public.opportunities;
DROP TRIGGER IF EXISTS set_targets_trigger ON public.opportunities;

-- Drop the problematic function if it exists (with all possible signatures)
DROP FUNCTION IF EXISTS calculate_long_targets(numeric, numeric, text);
DROP FUNCTION IF EXISTS calculate_long_targets();
DROP FUNCTION IF EXISTS calculate_targets_trigger();
DROP FUNCTION IF EXISTS set_targets();

-- Drop all triggers on opportunities table to start fresh
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN 
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE event_object_table = 'opportunities' 
    AND event_object_schema = 'public'
    AND trigger_name != 'update_opportunities_updated_at'
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || t.trigger_name || ' ON public.opportunities';
  END LOOP;
END $$;

-- Recreate only the updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_opportunities_updated_at ON public.opportunities;
CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Make sure RLS is disabled
ALTER TABLE public.opportunities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist DISABLE ROW LEVEL SECURITY;
