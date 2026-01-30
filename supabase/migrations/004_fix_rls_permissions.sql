-- =====================================================
-- FIX RLS and PERMISSIONS for Edge Functions
-- Migration 004
-- =====================================================

-- Disable RLS (force)
ALTER TABLE public.opportunities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_cache DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to service_role
GRANT ALL ON public.opportunities TO service_role;
GRANT ALL ON public.watchlist TO service_role;
GRANT ALL ON public.market_cache TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant all to anon for read operations (needed for API)
GRANT SELECT ON public.opportunities TO anon;
GRANT SELECT ON public.watchlist TO anon;
GRANT SELECT ON public.market_cache TO anon;

-- Make sure authenticated users can also access
GRANT SELECT ON public.opportunities TO authenticated;
GRANT SELECT ON public.watchlist TO authenticated;
GRANT SELECT ON public.market_cache TO authenticated;

-- Also ensure postgres user has full control
GRANT ALL ON public.opportunities TO postgres;
GRANT ALL ON public.watchlist TO postgres;
GRANT ALL ON public.market_cache TO postgres;
