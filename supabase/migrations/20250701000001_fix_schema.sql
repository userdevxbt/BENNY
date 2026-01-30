-- Fix migration - create only missing objects

-- Create hot_signals table if not exists
CREATE TABLE IF NOT EXISTS hot_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL,
    price DECIMAL(20, 8) NOT NULL,
    change_percent DECIMAL(10, 4),
    message TEXT,
    volume_spike DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Create performance_history table if not exists
CREATE TABLE IF NOT EXISTS performance_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    signal_type VARCHAR(20) NOT NULL,
    entry_price DECIMAL(20, 8),
    exit_price DECIMAL(20, 8),
    profit_percent DECIMAL(10, 4),
    outcome VARCHAR(20),
    direction VARCHAR(10),
    opened_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_hours INTEGER
);

-- Create indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_hot_signals_symbol ON hot_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_hot_signals_type ON hot_signals(type);
CREATE INDEX IF NOT EXISTS idx_hot_signals_created_at ON hot_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hot_signals_expires_at ON hot_signals(expires_at);
CREATE INDEX IF NOT EXISTS idx_perf_symbol ON performance_history(symbol);
CREATE INDEX IF NOT EXISTS idx_perf_outcome ON performance_history(outcome);
CREATE INDEX IF NOT EXISTS idx_perf_closed_at ON performance_history(closed_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_score ON watchlist(confluence_score DESC);

-- Add columns to opportunities (if not exist)
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS precision_score INTEGER DEFAULT 0;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS signals_confirmed INTEGER DEFAULT 0;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS last_signal_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS watchlist_promoted BOOLEAN DEFAULT FALSE;

-- Create functions
CREATE OR REPLACE FUNCTION cleanup_expired_signals()
RETURNS void AS $$
BEGIN
    DELETE FROM hot_signals WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_performance_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_signals', COUNT(*),
        'win_rate', ROUND(
            (COUNT(*) FILTER (WHERE outcome IN ('tp1_hit', 'tp2_hit', 'tp3_hit'))::DECIMAL / 
             NULLIF(COUNT(*), 0)) * 100, 2
        ),
        'tp1_hits', COUNT(*) FILTER (WHERE outcome = 'tp1_hit'),
        'tp2_hits', COUNT(*) FILTER (WHERE outcome = 'tp2_hit'),
        'tp3_hits', COUNT(*) FILTER (WHERE outcome = 'tp3_hit'),
        'sl_hits', COUNT(*) FILTER (WHERE outcome = 'sl_hit'),
        'avg_profit', ROUND(AVG(profit_percent), 2),
        'best_trade', MAX(profit_percent),
        'worst_trade', MIN(profit_percent)
    ) INTO result
    FROM performance_history
    WHERE closed_at > NOW() - INTERVAL '30 days';
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE hot_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflict
DROP POLICY IF EXISTS "Enable read access for all users" ON hot_signals;
DROP POLICY IF EXISTS "Enable read access for all users" ON performance_history;
DROP POLICY IF EXISTS "Enable insert for service role" ON hot_signals;
DROP POLICY IF EXISTS "Enable insert for service role" ON performance_history;

-- Create policies
CREATE POLICY "Enable read access for all users" ON hot_signals FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON performance_history FOR SELECT USING (true);
CREATE POLICY "Enable insert for service role" ON hot_signals FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for service role" ON performance_history FOR INSERT WITH CHECK (true);
