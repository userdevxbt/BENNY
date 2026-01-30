-- =====================================================================
-- SHDWXBT Metodologia - Extended Trading Tables
-- Adiciona colunas para suportar a metodologia completa de pivôs
-- =====================================================================

-- Adicionar colunas às oportunidades
ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS entry_zone_start DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS entry_zone_end DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS rsi_status TEXT,
ADD COLUMN IF NOT EXISTS fib_382 DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS fib_500 DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS fib_618 DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS trigger_timeframe TEXT,
ADD COLUMN IF NOT EXISTS anchor_timeframe TEXT,
ADD COLUMN IF NOT EXISTS pivot_type TEXT,
ADD COLUMN IF NOT EXISTS market_structure TEXT,
ADD COLUMN IF NOT EXISTS metodologia_acao TEXT,
ADD COLUMN IF NOT EXISTS context_line_1 TEXT,
ADD COLUMN IF NOT EXISTS context_line_2 TEXT,
ADD COLUMN IF NOT EXISTS context_line_3 TEXT,
ADD COLUMN IF NOT EXISTS context_line_4 TEXT,
ADD COLUMN IF NOT EXISTS invalidation_text TEXT,
ADD COLUMN IF NOT EXISTS positive_confluences JSONB,
ADD COLUMN IF NOT EXISTS negative_confluences JSONB;

-- Adicionar colunas à watchlist
ALTER TABLE watchlist 
ADD COLUMN IF NOT EXISTS entry_zone_start DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS entry_zone_end DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS rsi_status TEXT,
ADD COLUMN IF NOT EXISTS fib_382 DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS fib_500 DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS fib_618 DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS trigger_timeframe TEXT,
ADD COLUMN IF NOT EXISTS anchor_timeframe TEXT,
ADD COLUMN IF NOT EXISTS pivot_type TEXT,
ADD COLUMN IF NOT EXISTS market_structure TEXT,
ADD COLUMN IF NOT EXISTS metodologia_acao TEXT,
ADD COLUMN IF NOT EXISTS context_line_1 TEXT,
ADD COLUMN IF NOT EXISTS context_line_2 TEXT,
ADD COLUMN IF NOT EXISTS context_line_3 TEXT,
ADD COLUMN IF NOT EXISTS context_line_4 TEXT,
ADD COLUMN IF NOT EXISTS invalidation_text TEXT,
ADD COLUMN IF NOT EXISTS positive_confluences JSONB,
ADD COLUMN IF NOT EXISTS negative_confluences JSONB;

-- Criar tabela de metodologia para referência
CREATE TABLE IF NOT EXISTS metodologia_pivots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    categoria TEXT NOT NULL, -- pivo_alta_tendencia_alta, sobrevenda, etc
    timeframe TEXT NOT NULL, -- 5m, 15m, 1h, etc
    contexto TEXT NOT NULL,
    acao TEXT, -- CONFIRMA_FUNDO, BUSCA_FUNDO_ASC, etc
    alvo TEXT, -- timeframe alvo
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Popular tabela de metodologia
INSERT INTO metodologia_pivots (categoria, timeframe, contexto, acao, alvo) VALUES
-- PIVÔS DE ALTA EM TENDÊNCIA DE ALTA
('pivo_alta_tendencia_alta', '5m', 'Pivô de alta no 5 minutos confirma fundo no 15 minutos', 'CONFIRMA_FUNDO', '15m'),
('pivo_alta_tendencia_alta', '15m', 'Pivô de alta no 15 minutos confirma fundo no 1 hora', 'CONFIRMA_FUNDO', '1h'),
('pivo_alta_tendencia_alta', '1h', 'Pivô de alta no 1 hora confirma fundo no 4 horas', 'CONFIRMA_FUNDO', '4h'),
('pivo_alta_tendencia_alta', '4h', 'Pivô de alta no 4 horas confirma fundo no Diário', 'CONFIRMA_FUNDO', '1d'),
('pivo_alta_tendencia_alta', '1d', 'Pivô de alta no Diário confirma fundo no Semanal', 'CONFIRMA_FUNDO', '1w'),
('pivo_alta_tendencia_alta', '1w', 'Pivô de alta no Semanal confirma fundo no Mensal', 'CONFIRMA_FUNDO', '1M'),

-- PIVÔS DE BAIXA EM TENDÊNCIA DE ALTA
('pivo_baixa_tendencia_alta', '5m', '15 minutos em busca do fundo ascendente contra o fundo anterior', 'BUSCA_FUNDO_ASC', '15m'),
('pivo_baixa_tendencia_alta', '15m', '1 hora em busca do fundo ascendente contra o fundo anterior', 'BUSCA_FUNDO_ASC', '1h'),
('pivo_baixa_tendencia_alta', '1h', '4 horas em busca do fundo ascendente contra o fundo anterior', 'BUSCA_FUNDO_ASC', '4h'),
('pivo_baixa_tendencia_alta', '4h', 'Diário em busca do fundo ascendente contra o fundo anterior', 'BUSCA_FUNDO_ASC', '1d'),
('pivo_baixa_tendencia_alta', '1d', 'Semanal em busca do fundo ascendente contra o fundo anterior', 'BUSCA_FUNDO_ASC', '1w'),
('pivo_baixa_tendencia_alta', '1w', 'Mensal em busca do fundo ascendente contra o fundo anterior', 'BUSCA_FUNDO_ASC', '1M'),

-- PIVÔS DE BAIXA EM TENDÊNCIA DE BAIXA
('pivo_baixa_tendencia_baixa', '5m', 'Pivô de baixa no 5 minutos confirma topo descendente no 15 minutos', 'CONFIRMA_TOPO', '15m'),
('pivo_baixa_tendencia_baixa', '15m', 'Pivô de baixa no 15 minutos confirma topo descendente no 1 hora', 'CONFIRMA_TOPO', '1h'),
('pivo_baixa_tendencia_baixa', '1h', 'Pivô de baixa no 1 hora confirma topo descendente no 4 horas', 'CONFIRMA_TOPO', '4h'),
('pivo_baixa_tendencia_baixa', '4h', 'Pivô de baixa no 4 horas confirma topo descendente no Diário', 'CONFIRMA_TOPO', '1d'),
('pivo_baixa_tendencia_baixa', '1d', 'Pivô de baixa no Diário confirma topo descendente no Semanal', 'CONFIRMA_TOPO', '1w'),
('pivo_baixa_tendencia_baixa', '1w', 'Pivô de baixa no Semanal confirma topo descendente no Mensal', 'CONFIRMA_TOPO', '1M'),

-- PIVÔS DE ALTA EM TENDÊNCIA DE BAIXA
('pivo_alta_tendencia_baixa', '5m', '15 minutos em busca de um topo descendente contra o topo anterior', 'BUSCA_TOPO_DESC', '15m'),
('pivo_alta_tendencia_baixa', '15m', '1 hora em busca de um topo descendente contra o topo anterior', 'BUSCA_TOPO_DESC', '1h'),
('pivo_alta_tendencia_baixa', '1h', '4 horas em busca de um topo descendente contra o topo anterior', 'BUSCA_TOPO_DESC', '4h'),
('pivo_alta_tendencia_baixa', '4h', 'Diário em busca de um topo descendente contra o topo anterior', 'BUSCA_TOPO_DESC', '1d'),
('pivo_alta_tendencia_baixa', '1d', 'Semanal em busca do topo descendente', 'BUSCA_TOPO_DESC', '1w'),
('pivo_alta_tendencia_baixa', '1w', 'Reverte a tendência de baixa para tendência de alta', 'REVERSAO_ALTA', '1M'),

-- SOBREVENDA (RSI <= 30)
('sobrevenda', '5m', 'Possibilidade de criação de um fundo ascendente no 1 hora', 'SOBREVENDA', '1h'),
('sobrevenda', '15m', 'Possibilidade de criação de um fundo ascendente no 4 horas', 'SOBREVENDA', '4h'),
('sobrevenda', '30m', 'Possibilidade de criação de um fundo ascendente no 12 horas', 'SOBREVENDA', '12h'),
('sobrevenda', '1h', 'Possibilidade de criação de um fundo ascendente no Semanal', 'SOBREVENDA', '1w'),
('sobrevenda', '4h', 'Possibilidade de criação de um fundo ascendente no Mensal', 'SOBREVENDA', '1M'),
('sobrevenda', '1d', 'Sobrevenda no Diário - possibilidade de fundo macro significativo', 'SOBREVENDA', NULL),

-- SOBRECOMPRA (RSI >= 70)
('sobrecompra', '5m', 'Possibilidade de criação de um topo descendente no 1 hora', 'SOBRECOMPRA', '1h'),
('sobrecompra', '15m', 'Possibilidade de criação de um topo descendente no 4 horas', 'SOBRECOMPRA', '4h'),
('sobrecompra', '30m', 'Possibilidade de criação de um topo descendente no 12 horas', 'SOBRECOMPRA', '12h'),
('sobrecompra', '1h', 'Possibilidade de criação de um topo descendente no Semanal', 'SOBRECOMPRA', '1w'),
('sobrecompra', '4h', 'Sobrecompra no 4 horas - atenção para topo descendente no Mensal', 'SOBRECOMPRA', '1M'),
('sobrecompra', '1d', 'Sobrecompra no Diário - possibilidade de topo descendente significativo', 'SOBRECOMPRA', NULL),

-- PERDA DA TENDÊNCIA
('perda_tendencia', '5m', 'Atenção no sobrevenda, observar a queda contra o fundo anterior no 15 minutos', 'ZOOM_OUT', '15m'),
('perda_tendencia', '15m', 'Atenção no sobrevenda, observar a queda contra o fundo anterior no 1 hora', 'ZOOM_OUT', '1h'),
('perda_tendencia', '1h', 'Atenção no sobrevenda, observar a queda contra o fundo anterior no 4 horas', 'ZOOM_OUT', '4h'),
('perda_tendencia', '4h', 'Atenção no sobrevenda, observar a queda contra o fundo anterior no Diário', 'ZOOM_OUT', '1d'),
('perda_tendencia', '1d', 'Atenção no sobrevenda, observar a queda contra o fundo anterior no Semanal', 'ZOOM_OUT', '1w'),
('perda_tendencia', '1w', 'Atenção - possível Bear Market (6 meses de queda)', 'ZOOM_OUT', '1M')

ON CONFLICT DO NOTHING;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_opportunities_metodologia ON opportunities(metodologia_acao);
CREATE INDEX IF NOT EXISTS idx_opportunities_pivot ON opportunities(pivot_type);
CREATE INDEX IF NOT EXISTS idx_opportunities_structure ON opportunities(market_structure);
CREATE INDEX IF NOT EXISTS idx_watchlist_metodologia ON watchlist(metodologia_acao);
