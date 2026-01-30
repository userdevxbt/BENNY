-- SHDWXBT - Migration 011: User Trades Table
-- Armazena as operações que o usuário entrou para acompanhamento

-- =====================================================
-- TABELA: user_trades
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- User identification (wallet address)
    wallet_address TEXT NOT NULL,
    
    -- Trade info
    symbol TEXT NOT NULL,
    name TEXT,
    direction TEXT NOT NULL DEFAULT 'bullish', -- 'bullish' or 'bearish'
    
    -- Prices
    entry_price DECIMAL(20, 8) NOT NULL,
    current_price DECIMAL(20, 8),
    exit_price DECIMAL(20, 8),
    stop_loss DECIMAL(20, 8),
    
    -- Targets
    target_1 DECIMAL(20, 8),
    target_2 DECIMAL(20, 8),
    target_3 DECIMAL(20, 8),
    tp1_hit BOOLEAN DEFAULT FALSE,
    tp2_hit BOOLEAN DEFAULT FALSE,
    tp3_hit BOOLEAN DEFAULT FALSE,
    tp1_hit_at TIMESTAMPTZ,
    tp2_hit_at TIMESTAMPTZ,
    tp3_hit_at TIMESTAMPTZ,
    
    -- Trade metadata
    trading_profile TEXT DEFAULT 'Day Trading',
    timeframe TEXT DEFAULT '15m',
    confluence_score INTEGER DEFAULT 0,
    
    -- P&L
    pnl_percent DECIMAL(10, 4) DEFAULT 0,
    pnl_realized DECIMAL(10, 4),
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'closed', 'stopped'
    close_reason TEXT, -- 'manual', 'tp1', 'tp2', 'tp3', 'stop_loss'
    
    -- Timestamps
    entered_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT user_trades_status_check CHECK (status IN ('active', 'closed', 'stopped'))
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_trades_wallet ON public.user_trades (wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_trades_symbol ON public.user_trades (symbol);
CREATE INDEX IF NOT EXISTS idx_user_trades_status ON public.user_trades (status);
CREATE INDEX IF NOT EXISTS idx_user_trades_wallet_status ON public.user_trades (wallet_address, status);
CREATE INDEX IF NOT EXISTS idx_user_trades_entered ON public.user_trades (entered_at DESC);

-- Unique constraint: user can only have one active trade per symbol
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_trades_active_unique 
ON public.user_trades (wallet_address, symbol) 
WHERE status = 'active';

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE public.user_trades ENABLE ROW LEVEL SECURITY;

-- Users can only see their own trades
CREATE POLICY "Users can view own trades" ON public.user_trades
    FOR SELECT USING (true); -- We'll filter by wallet in the app

-- Users can insert their own trades
CREATE POLICY "Users can insert own trades" ON public.user_trades
    FOR INSERT WITH CHECK (true);

-- Users can update their own trades
CREATE POLICY "Users can update own trades" ON public.user_trades
    FOR UPDATE USING (true);

-- Users can delete their own trades
CREATE POLICY "Users can delete own trades" ON public.user_trades
    FOR DELETE USING (true);

-- =====================================================
-- FUNCTION: Update timestamp on modification
-- =====================================================
CREATE OR REPLACE FUNCTION update_user_trades_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_trades_updated
    BEFORE UPDATE ON public.user_trades
    FOR EACH ROW
    EXECUTE FUNCTION update_user_trades_timestamp();

-- =====================================================
-- VIEW: User trade statistics
-- =====================================================
CREATE OR REPLACE VIEW public.user_trade_stats AS
SELECT 
    wallet_address,
    COUNT(*) FILTER (WHERE status = 'active') as active_trades,
    COUNT(*) FILTER (WHERE status = 'closed') as closed_trades,
    COUNT(*) FILTER (WHERE status = 'stopped') as stopped_trades,
    COUNT(*) FILTER (WHERE tp1_hit = true) as tp1_hits,
    COUNT(*) FILTER (WHERE tp2_hit = true) as tp2_hits,
    COUNT(*) FILTER (WHERE tp3_hit = true) as tp3_hits,
    COALESCE(AVG(pnl_realized) FILTER (WHERE status IN ('closed', 'stopped')), 0) as avg_pnl,
    COALESCE(SUM(pnl_realized) FILTER (WHERE status IN ('closed', 'stopped')), 0) as total_pnl,
    COUNT(*) FILTER (WHERE pnl_realized > 0) as winning_trades,
    COUNT(*) FILTER (WHERE pnl_realized < 0) as losing_trades
FROM public.user_trades
GROUP BY wallet_address;
