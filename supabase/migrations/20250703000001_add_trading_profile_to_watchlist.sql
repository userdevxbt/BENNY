-- Add trading_profile column to watchlist table
-- This enables multi-profile support for the watchlist scanner

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'watchlist' 
        AND column_name = 'trading_profile'
    ) THEN
        ALTER TABLE public.watchlist ADD COLUMN trading_profile TEXT DEFAULT 'Day Trading';
    END IF;
END $$;

-- Drop the old unique constraint if it exists (symbol only)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'watchlist_symbol_key' 
        AND conrelid = 'public.watchlist'::regclass
    ) THEN
        ALTER TABLE public.watchlist DROP CONSTRAINT watchlist_symbol_key;
    END IF;
END $$;

-- Create new unique constraint on (symbol, trading_profile) if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'watchlist_symbol_profile_unique' 
        AND conrelid = 'public.watchlist'::regclass
    ) THEN
        ALTER TABLE public.watchlist 
        ADD CONSTRAINT watchlist_symbol_profile_unique UNIQUE (symbol, trading_profile);
    END IF;
END $$;

-- Create index for faster lookups by trading_profile
CREATE INDEX IF NOT EXISTS idx_watchlist_trading_profile 
ON public.watchlist(trading_profile);
