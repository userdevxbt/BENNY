-- SHDWXBT - Tabelas para Oportunidades e Watchlist
-- Migration 002: Trading Tables

-- =====================================================
-- OPPORTUNITIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.opportunities (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  name TEXT,
  direction TEXT NOT NULL DEFAULT 'bullish', -- 'bullish' ou 'bearish'
  trend TEXT NOT NULL DEFAULT 'bullish',     -- alias for direction
  
  -- Prices
  entry_price DECIMAL(20, 8),
  current_price DECIMAL(20, 8),
  stop_loss DECIMAL(20, 8),
  invalidation DECIMAL(20, 8),
  
  -- Targets (Fibonacci extensions)
  target_1 DECIMAL(20, 8),
  target_2 DECIMAL(20, 8),
  target_3 DECIMAL(20, 8),
  fibonacci_extensions JSONB DEFAULT '[1.272, 1.618, 2.0]',
  
  -- Target hits
  tp_hit_1 BOOLEAN DEFAULT FALSE,
  tp_hit_2 BOOLEAN DEFAULT FALSE,
  tp_hit_3 BOOLEAN DEFAULT FALSE,
  
  -- Analysis
  rsi_value DECIMAL(10, 4),
  confluence_score INTEGER DEFAULT 50,
  trading_profile TEXT DEFAULT 'Day Trading', -- 'Scalping', 'Day Trading', 'Swing Trade'
  
  -- Timeframes
  signal_timeframe TEXT DEFAULT '15m',
  target_timeframe TEXT DEFAULT '4h',
  timeframes JSONB DEFAULT '["5m", "15m", "4h"]',
  
  -- Technical zones
  tech_zone_min DECIMAL(20, 8),
  tech_zone_max DECIMAL(20, 8),
  fib_zone TEXT DEFAULT 'equilibrium',
  
  -- Market structure
  market_structure TEXT DEFAULT 'neutral',
  structure_bias TEXT DEFAULT 'neutral',
  
  -- Sentiment
  long_short_ratio DECIMAL(10, 4),
  sentiment TEXT,
  
  -- Texts
  analysis_title TEXT,
  analysis_text TEXT,
  methodology_summary TEXT,
  setup_type TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  completed_at TIMESTAMPTZ,
  completed_reason TEXT, -- 'stop_loss', 'all_targets', 'manual'
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT opportunities_symbol_unique UNIQUE (symbol)
);

-- Indexes for opportunities
CREATE INDEX IF NOT EXISTS idx_opportunities_symbol ON public.opportunities (symbol);
CREATE INDEX IF NOT EXISTS idx_opportunities_active ON public.opportunities (is_active);
CREATE INDEX IF NOT EXISTS idx_opportunities_direction ON public.opportunities (direction);
CREATE INDEX IF NOT EXISTS idx_opportunities_profile ON public.opportunities (trading_profile);
CREATE INDEX IF NOT EXISTS idx_opportunities_created ON public.opportunities (created_at DESC);

-- =====================================================
-- WATCHLIST TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.watchlist (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  name TEXT,
  direction TEXT DEFAULT 'bullish',
  trend TEXT DEFAULT 'bullish',
  
  -- Prices
  entry_price DECIMAL(20, 8),
  current_price DECIMAL(20, 8),
  stop_loss DECIMAL(20, 8),
  
  -- Analysis
  rsi_value DECIMAL(10, 4),
  confluence_score INTEGER DEFAULT 30,
  reason TEXT,
  
  -- Timeframes
  signal_timeframe TEXT DEFAULT '15m',
  target_timeframe TEXT DEFAULT '4h',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT watchlist_symbol_unique UNIQUE (symbol)
);

-- Indexes for watchlist
CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON public.watchlist (symbol);
CREATE INDEX IF NOT EXISTS idx_watchlist_active ON public.watchlist (is_active);
CREATE INDEX IF NOT EXISTS idx_watchlist_created ON public.watchlist (created_at DESC);

-- =====================================================
-- MARKET CACHE TABLE (for API rate limiting)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.market_cache (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  data JSONB,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT market_cache_symbol_tf_unique UNIQUE (symbol, timeframe)
);

CREATE INDEX IF NOT EXISTS idx_market_cache_symbol ON public.market_cache (symbol);
CREATE INDEX IF NOT EXISTS idx_market_cache_cached ON public.market_cache (cached_at);

-- =====================================================
-- DISABLE RLS (Edge Functions use Service Role)
-- =====================================================
ALTER TABLE public.opportunities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_cache DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================
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

DROP TRIGGER IF EXISTS update_watchlist_updated_at ON public.watchlist;
CREATE TRIGGER update_watchlist_updated_at
  BEFORE UPDATE ON public.watchlist
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
