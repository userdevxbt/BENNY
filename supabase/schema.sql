-- =====================================================
-- SHDWXBT - Supabase Database Schema
-- Alta Precisão e Acertividade
-- =====================================================

-- =====================================================
-- TABELA: hot_signals
-- Armazena sinais de movimentos detectados em tempo real
-- =====================================================
CREATE TABLE IF NOT EXISTS hot_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'PUMP', 'DUMP', 'VOLUME_SPIKE', 'ENTRY_ZONE', 'NEAR_TP', 'NEAR_SL'
    price DECIMAL(20, 8) NOT NULL,
    change_percent DECIMAL(10, 4),
    message TEXT,
    volume_spike DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_hot_signals_symbol ON hot_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_hot_signals_type ON hot_signals(type);
CREATE INDEX IF NOT EXISTS idx_hot_signals_created_at ON hot_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hot_signals_expires_at ON hot_signals(expires_at);

-- =====================================================
-- TABELA: watchlist
-- Ativos em monitoramento (score 30-49)
-- =====================================================
CREATE TABLE IF NOT EXISTS watchlist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    reason TEXT,
    confluence_score INTEGER DEFAULT 0,
    trend VARCHAR(10) DEFAULT 'neutral', -- 'bullish', 'bearish', 'neutral'
    current_price DECIMAL(20, 8),
    notes TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON watchlist(symbol);
CREATE INDEX IF NOT EXISTS idx_watchlist_score ON watchlist(confluence_score DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_active ON watchlist(is_active);

-- =====================================================
-- TABELA: performance_history
-- Histórico de performance dos sinais
-- =====================================================
CREATE TABLE IF NOT EXISTS performance_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    signal_type VARCHAR(20) NOT NULL, -- 'opportunity', 'watchlist', 'hot_signal'
    entry_price DECIMAL(20, 8),
    exit_price DECIMAL(20, 8),
    profit_percent DECIMAL(10, 4),
    outcome VARCHAR(20), -- 'tp1_hit', 'tp2_hit', 'tp3_hit', 'sl_hit', 'expired'
    direction VARCHAR(10), -- 'bullish', 'bearish'
    opened_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_hours INTEGER
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_perf_symbol ON performance_history(symbol);
CREATE INDEX IF NOT EXISTS idx_perf_outcome ON performance_history(outcome);
CREATE INDEX IF NOT EXISTS idx_perf_closed_at ON performance_history(closed_at DESC);

-- =====================================================
-- TABELA: opportunities (atualização)
-- Adicionar campos para alta precisão
-- =====================================================
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS precision_score INTEGER DEFAULT 0;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS signals_confirmed INTEGER DEFAULT 0;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS last_signal_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS watchlist_promoted BOOLEAN DEFAULT FALSE;

-- =====================================================
-- FUNÇÃO: Limpar sinais expirados
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_expired_signals()
RETURNS void AS $$
BEGIN
    DELETE FROM hot_signals WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNÇÃO: Calcular estatísticas de performance
-- =====================================================
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

-- =====================================================
-- FUNÇÃO: Promover watchlist para oportunidade
-- =====================================================
CREATE OR REPLACE FUNCTION promote_watchlist_to_opportunity(p_symbol VARCHAR)
RETURNS JSON AS $$
DECLARE
    watchlist_item RECORD;
    new_opportunity_id UUID;
BEGIN
    -- Buscar item da watchlist
    SELECT * INTO watchlist_item FROM watchlist WHERE symbol = p_symbol AND is_active = TRUE;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Item not found in watchlist');
    END IF;
    
    -- Criar oportunidade
    INSERT INTO opportunities (
        symbol, 
        trend, 
        confluence_score, 
        is_active, 
        watchlist_promoted,
        created_at
    ) VALUES (
        watchlist_item.symbol,
        watchlist_item.trend,
        watchlist_item.confluence_score,
        TRUE,
        TRUE,
        NOW()
    ) RETURNING id INTO new_opportunity_id;
    
    -- Remover da watchlist
    UPDATE watchlist SET is_active = FALSE WHERE symbol = p_symbol;
    
    RETURN json_build_object(
        'success', true, 
        'opportunity_id', new_opportunity_id,
        'symbol', p_symbol
    );
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER update_watchlist_updated_at
    BEFORE UPDATE ON watchlist
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE hot_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_history ENABLE ROW LEVEL SECURITY;

-- Políticas para leitura pública (com anon key)
CREATE POLICY "Enable read access for all users" ON hot_signals FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON watchlist FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON performance_history FOR SELECT USING (true);

-- Políticas para escrita (apenas com service_role)
CREATE POLICY "Enable insert for service role" ON hot_signals FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for service role" ON watchlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for service role" ON performance_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for service role" ON watchlist FOR UPDATE USING (true);

-- =====================================================
-- JOB: Limpar sinais expirados (execute a cada 5 min)
-- Use pg_cron ou chame via Edge Function
-- =====================================================
-- SELECT cron.schedule('cleanup-expired-signals', '*/5 * * * *', 'SELECT cleanup_expired_signals()');
