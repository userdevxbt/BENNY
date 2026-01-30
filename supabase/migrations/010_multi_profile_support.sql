-- SHDWXBT - Migration 010: Multi Profile Support
-- Permite múltiplas oportunidades por símbolo (uma por trading_profile)

-- =====================================================
-- STEP 1: Remove old unique constraint on symbol only
-- =====================================================
ALTER TABLE public.opportunities 
DROP CONSTRAINT IF EXISTS opportunities_symbol_unique;

-- =====================================================
-- STEP 2: Add new unique constraint on symbol + trading_profile
-- =====================================================
ALTER TABLE public.opportunities 
ADD CONSTRAINT opportunities_symbol_profile_unique UNIQUE (symbol, trading_profile);

-- =====================================================
-- STEP 3: Same for watchlist table
-- =====================================================
ALTER TABLE public.watchlist 
DROP CONSTRAINT IF EXISTS watchlist_symbol_key;

ALTER TABLE public.watchlist 
DROP CONSTRAINT IF EXISTS watchlist_symbol_unique;

-- Add trading_profile column if not exists
ALTER TABLE public.watchlist 
ADD COLUMN IF NOT EXISTS trading_profile TEXT DEFAULT 'Day Trading';

-- Add new constraint
ALTER TABLE public.watchlist 
ADD CONSTRAINT watchlist_symbol_profile_unique UNIQUE (symbol, trading_profile);

-- =====================================================
-- STEP 4: Create index for faster lookups
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_opportunities_symbol_profile 
ON public.opportunities (symbol, trading_profile);

CREATE INDEX IF NOT EXISTS idx_watchlist_symbol_profile 
ON public.watchlist (symbol, trading_profile);

-- =====================================================
-- Done! Now each symbol can have:
-- - 1 Scalping opportunity
-- - 1 Day Trading opportunity  
-- - 1 Swing Trade opportunity
-- =====================================================
