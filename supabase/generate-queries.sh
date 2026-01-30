#!/bin/bash
# ============================================================================
# SHDWXBT - SQL Queries Generator
# Gera queries organizadas para copiar no Supabase SQL Editor
# ============================================================================

OUTPUT_DIR="/Users/otaviocurrency/Downloads/XBT-SITE-main/supabase/queries"
mkdir -p "$OUTPUT_DIR"

echo "🚀 Gerando queries organizadas..."
echo ""

# 1. Hot Signals - Get Active
cat > "$OUTPUT_DIR/01-hot-signals-get-active.sql" << 'SQL'
-- ============================================
-- HOT SIGNALS - Get Active
-- Busca todos os sinais não expirados
-- ============================================
SELECT 
    symbol,
    type,
    price,
    change_percent,
    message,
    created_at
FROM hot_signals 
WHERE expires_at > NOW() 
ORDER BY created_at DESC
LIMIT 100;
SQL
echo "✅ 01-hot-signals-get-active.sql"

# 2. Hot Signals - Stats
cat > "$OUTPUT_DIR/02-hot-signals-stats.sql" << 'SQL'
-- ============================================
-- HOT SIGNALS - Statistics (24h)
-- Estatísticas dos últimos sinais
-- ============================================
SELECT 
    type,
    COUNT(*) as total,
    ROUND(AVG(change_percent)::numeric, 2) as avg_change,
    MAX(change_percent) as max_change
FROM hot_signals 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY type
ORDER BY total DESC;
SQL
echo "✅ 02-hot-signals-stats.sql"

# 3. Watchlist - Get Active
cat > "$OUTPUT_DIR/03-watchlist-get-active.sql" << 'SQL'
-- ============================================
-- WATCHLIST - Get Active Items
-- Lista todos os ativos em observação
-- ============================================
SELECT 
    symbol,
    confluence_score,
    trend,
    reason,
    current_price,
    added_at
FROM watchlist 
WHERE is_active = TRUE 
ORDER BY confluence_score DESC;
SQL
echo "✅ 03-watchlist-get-active.sql"

# 4. Opportunities - Get Active
cat > "$OUTPUT_DIR/04-opportunities-get-active.sql" << 'SQL'
-- ============================================
-- OPPORTUNITIES - Get Active
-- Lista oportunidades ativas
-- ============================================
SELECT 
    id,
    symbol,
    trend,
    confluence_score,
    entry_min,
    entry_max,
    tp1, tp2, tp3,
    stop_loss,
    tp1_hit, tp2_hit, tp3_hit, sl_hit,
    created_at
FROM opportunities 
WHERE is_active = TRUE 
ORDER BY confluence_score DESC, created_at DESC;
SQL
echo "✅ 04-opportunities-get-active.sql"

# 5. Opportunities - High Score
cat > "$OUTPUT_DIR/05-opportunities-high-score.sql" << 'SQL'
-- ============================================
-- OPPORTUNITIES - High Score (70+)
-- Apenas oportunidades de alta confiança
-- ============================================
SELECT 
    symbol,
    trend,
    confluence_score,
    entry_min,
    entry_max,
    tp1, tp2, tp3,
    stop_loss
FROM opportunities 
WHERE is_active = TRUE 
  AND confluence_score >= 70
ORDER BY confluence_score DESC;
SQL
echo "✅ 05-opportunities-high-score.sql"

# 6. Performance - Stats 30 Days
cat > "$OUTPUT_DIR/06-performance-stats-30d.sql" << 'SQL'
-- ============================================
-- PERFORMANCE - Statistics (30 days)
-- Win rate e métricas gerais
-- ============================================
SELECT 
    COUNT(*) as total_signals,
    ROUND(
        (COUNT(*) FILTER (WHERE outcome IN ('tp1_hit', 'tp2_hit', 'tp3_hit'))::DECIMAL / 
         NULLIF(COUNT(*), 0)) * 100, 2
    ) as win_rate_percent,
    COUNT(*) FILTER (WHERE outcome = 'tp1_hit') as tp1_hits,
    COUNT(*) FILTER (WHERE outcome = 'tp2_hit') as tp2_hits,
    COUNT(*) FILTER (WHERE outcome = 'tp3_hit') as tp3_hits,
    COUNT(*) FILTER (WHERE outcome = 'sl_hit') as sl_hits,
    ROUND(AVG(profit_percent)::numeric, 2) as avg_profit,
    MAX(profit_percent) as best_trade,
    MIN(profit_percent) as worst_trade
FROM performance_history
WHERE closed_at > NOW() - INTERVAL '30 days';
SQL
echo "✅ 06-performance-stats-30d.sql"

# 7. Performance - By Symbol
cat > "$OUTPUT_DIR/07-performance-by-symbol.sql" << 'SQL'
-- ============================================
-- PERFORMANCE - By Symbol
-- Performance individual por ativo
-- ============================================
SELECT 
    symbol,
    COUNT(*) as total_trades,
    ROUND(AVG(profit_percent)::numeric, 2) as avg_profit,
    COUNT(*) FILTER (WHERE outcome IN ('tp1_hit', 'tp2_hit', 'tp3_hit')) as wins,
    COUNT(*) FILTER (WHERE outcome = 'sl_hit') as losses,
    ROUND(
        (COUNT(*) FILTER (WHERE outcome IN ('tp1_hit', 'tp2_hit', 'tp3_hit'))::DECIMAL / 
         NULLIF(COUNT(*), 0)) * 100, 2
    ) as win_rate
FROM performance_history
GROUP BY symbol
HAVING COUNT(*) >= 2
ORDER BY win_rate DESC, total_trades DESC;
SQL
echo "✅ 07-performance-by-symbol.sql"

# 8. Dashboard Overview
cat > "$OUTPUT_DIR/08-dashboard-overview.sql" << 'SQL'
-- ============================================
-- DASHBOARD - Overview
-- Visão geral para o dashboard
-- ============================================
SELECT 
    (SELECT COUNT(*) FROM opportunities WHERE is_active = TRUE) as active_opportunities,
    (SELECT COUNT(*) FROM opportunities WHERE is_active = TRUE AND trend = 'bullish') as bullish_count,
    (SELECT COUNT(*) FROM opportunities WHERE is_active = TRUE AND trend = 'bearish') as bearish_count,
    (SELECT COUNT(*) FROM watchlist WHERE is_active = TRUE) as watchlist_count,
    (SELECT COUNT(*) FROM hot_signals WHERE expires_at > NOW()) as active_hot_signals;
SQL
echo "✅ 08-dashboard-overview.sql"

# 9. Whitelist - List All
cat > "$OUTPUT_DIR/09-whitelist-list-all.sql" << 'SQL'
-- ============================================
-- WHITELIST - List All
-- Lista todas as wallets autorizadas
-- ============================================
SELECT 
    wallet_address,
    notes,
    created_at
FROM whitelist 
ORDER BY created_at DESC;
SQL
echo "✅ 09-whitelist-list-all.sql"

# 10. Maintenance - Cleanup
cat > "$OUTPUT_DIR/10-maintenance-cleanup.sql" << 'SQL'
-- ============================================
-- MAINTENANCE - Cleanup Expired
-- Limpa dados expirados e antigos
-- ============================================

-- Limpar hot signals expirados
DELETE FROM hot_signals WHERE expires_at < NOW();

-- Limpar nonces expirados
DELETE FROM siwe_nonces WHERE expires_at < NOW();

-- Contar registros removidos
SELECT 
    'hot_signals' as table_name, 
    (SELECT COUNT(*) FROM hot_signals) as remaining
UNION ALL
SELECT 
    'siwe_nonces', 
    (SELECT COUNT(*) FROM siwe_nonces);
SQL
echo "✅ 10-maintenance-cleanup.sql"

# 11. Analytics - Top Performers
cat > "$OUTPUT_DIR/11-analytics-top-performers.sql" << 'SQL'
-- ============================================
-- ANALYTICS - Top Performers
-- Melhores ativos por performance
-- ============================================
SELECT 
    symbol,
    COUNT(*) as total_signals,
    ROUND(
        (COUNT(*) FILTER (WHERE outcome IN ('tp1_hit', 'tp2_hit', 'tp3_hit'))::DECIMAL / 
         NULLIF(COUNT(*), 0)) * 100, 2
    ) as win_rate,
    ROUND(SUM(profit_percent)::numeric, 2) as total_profit
FROM performance_history
WHERE closed_at > NOW() - INTERVAL '30 days'
GROUP BY symbol
HAVING COUNT(*) >= 3
ORDER BY win_rate DESC, total_profit DESC
LIMIT 10;
SQL
echo "✅ 11-analytics-top-performers.sql"

# 12. Analytics - Signal Distribution
cat > "$OUTPUT_DIR/12-analytics-signal-distribution.sql" << 'SQL'
-- ============================================
-- ANALYTICS - Signal Distribution by Hour
-- Distribuição de sinais por hora do dia
-- ============================================
SELECT 
    EXTRACT(HOUR FROM created_at) as hour,
    COUNT(*) as signal_count,
    COUNT(*) FILTER (WHERE type = 'PUMP') as pumps,
    COUNT(*) FILTER (WHERE type = 'DUMP') as dumps,
    COUNT(*) FILTER (WHERE type = 'VOLUME_SPIKE') as volume_spikes,
    COUNT(*) FILTER (WHERE type = 'ENTRY_ZONE') as entry_zones
FROM hot_signals
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;
SQL
echo "✅ 12-analytics-signal-distribution.sql"

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ Todas as queries foram geradas em:"
echo "   $OUTPUT_DIR"
echo ""
echo "📋 Para usar no Supabase:"
echo "   1. Abra cada arquivo .sql"
echo "   2. Copie o conteúdo"
echo "   3. Cole no SQL Editor do Supabase"
echo "   4. Salve com o nome do arquivo (sem extensão)"
echo "════════════════════════════════════════════════════════"
