/**
 * ============================================================================
 * SHDWXBT — Backtesting Engine
 * ============================================================================
 * 
 * Motor de backtesting para validar estratégias com dados históricos
 * 
 * Features:
 * - Backtest de oportunidades passadas
 * - Cálculo de win rate real
 * - Análise de drawdown
 * - Otimização de parâmetros
 * 
 * ============================================================================
 */

const Backtester = {
    // ========================================
    // CONFIGURAÇÃO
    // ========================================
    config: {
        initialCapital: 10000,
        positionSize: 0.02,    // 2% por trade
        maxDrawdown: 0.10,     // 10% max drawdown
        slippage: 0.001,       // 0.1% slippage
        commission: 0.001      // 0.1% comissão
    },

    results: {
        trades: [],
        equity: [],
        metrics: {}
    },

    // ========================================
    // BACKTEST DE OPORTUNIDADE
    // ========================================
    async backtestOpportunity(opportunity, historicalData) {
        const result = {
            symbol: opportunity.symbol,
            direction: opportunity.trend,
            entryPrice: parseFloat(opportunity.entry_min) || parseFloat(opportunity.entry_max),
            stopLoss: parseFloat(opportunity.stop_loss),
            targets: [
                parseFloat(opportunity.tp1),
                parseFloat(opportunity.tp2),
                parseFloat(opportunity.tp3)
            ].filter(t => !isNaN(t)),
            entryTime: null,
            exitTime: null,
            exitPrice: null,
            exitReason: null,
            pnl: 0,
            pnlPercent: 0,
            duration: 0
        };

        // Simular trade com dados históricos
        let inPosition = false;
        let entryIndex = -1;

        for (let i = 0; i < historicalData.length; i++) {
            const candle = historicalData[i];
            const high = parseFloat(candle[2]);
            const low = parseFloat(candle[3]);
            const close = parseFloat(candle[4]);
            const time = new Date(candle[0]);

            // Verificar entrada
            if (!inPosition) {
                const entryHit = opportunity.trend === 'bullish' 
                    ? (low <= result.entryPrice && result.entryPrice <= high)
                    : (low <= result.entryPrice && result.entryPrice <= high);

                if (entryHit) {
                    inPosition = true;
                    entryIndex = i;
                    result.entryTime = time;
                    continue;
                }
            }

            // Verificar saída
            if (inPosition) {
                const isBullish = opportunity.trend === 'bullish';

                // Stop Loss
                const slHit = isBullish 
                    ? low <= result.stopLoss
                    : high >= result.stopLoss;

                if (slHit) {
                    result.exitPrice = result.stopLoss;
                    result.exitTime = time;
                    result.exitReason = 'STOP_LOSS';
                    break;
                }

                // Targets
                for (let t = result.targets.length - 1; t >= 0; t--) {
                    const target = result.targets[t];
                    const tpHit = isBullish 
                        ? high >= target
                        : low <= target;

                    if (tpHit) {
                        result.exitPrice = target;
                        result.exitTime = time;
                        result.exitReason = `TP${t + 1}`;
                        break;
                    }
                }

                if (result.exitReason) break;
            }
        }

        // Se ainda em posição, fechar no último preço
        if (inPosition && !result.exitReason) {
            const lastCandle = historicalData[historicalData.length - 1];
            result.exitPrice = parseFloat(lastCandle[4]);
            result.exitTime = new Date(lastCandle[0]);
            result.exitReason = 'TIMEOUT';
        }

        // Calcular P&L
        if (result.entryTime && result.exitPrice) {
            const isBullish = opportunity.trend === 'bullish';
            
            if (isBullish) {
                result.pnlPercent = ((result.exitPrice - result.entryPrice) / result.entryPrice) * 100;
            } else {
                result.pnlPercent = ((result.entryPrice - result.exitPrice) / result.entryPrice) * 100;
            }

            // Aplicar slippage e comissão
            result.pnlPercent -= (this.config.slippage + this.config.commission) * 100 * 2;
            result.pnl = (this.config.initialCapital * this.config.positionSize) * (result.pnlPercent / 100);

            // Duração
            result.duration = (result.exitTime - result.entryTime) / (1000 * 60 * 60); // em horas
        }

        return result;
    },

    // ========================================
    // BACKTEST MÚLTIPLAS OPORTUNIDADES
    // ========================================
    async runBacktest(opportunities, startDate, endDate) {
        console.log(`🔄 Running backtest for ${opportunities.length} opportunities...`);

        this.results = {
            trades: [],
            equity: [this.config.initialCapital],
            metrics: {}
        };

        let currentCapital = this.config.initialCapital;
        let peakCapital = this.config.initialCapital;
        let maxDrawdown = 0;

        for (const opp of opportunities) {
            try {
                // Buscar dados históricos
                const historicalData = await this.getHistoricalData(
                    opp.symbol, 
                    '15m', 
                    startDate, 
                    endDate
                );

                if (!historicalData || historicalData.length < 50) {
                    console.warn(`Insufficient data for ${opp.symbol}`);
                    continue;
                }

                // Executar backtest
                const tradeResult = await this.backtestOpportunity(opp, historicalData);

                // Atualizar capital
                currentCapital += tradeResult.pnl;
                this.results.equity.push(currentCapital);

                // Calcular drawdown
                if (currentCapital > peakCapital) {
                    peakCapital = currentCapital;
                }
                const drawdown = (peakCapital - currentCapital) / peakCapital;
                if (drawdown > maxDrawdown) {
                    maxDrawdown = drawdown;
                }

                // Adicionar resultado
                this.results.trades.push(tradeResult);

                console.log(`✅ ${opp.symbol}: ${tradeResult.exitReason} | P&L: ${tradeResult.pnlPercent.toFixed(2)}%`);

            } catch (error) {
                console.error(`Backtest error for ${opp.symbol}:`, error);
            }
        }

        // Calcular métricas finais
        this.results.metrics = this.calculateMetrics(this.results.trades, currentCapital, maxDrawdown);

        return this.results;
    },

    // ========================================
    // MÉTRICAS DE PERFORMANCE
    // ========================================
    calculateMetrics(trades, finalCapital, maxDrawdown) {
        const wins = trades.filter(t => t.pnlPercent > 0);
        const losses = trades.filter(t => t.pnlPercent <= 0);
        const tp1Hits = trades.filter(t => t.exitReason === 'TP1');
        const tp2Hits = trades.filter(t => t.exitReason === 'TP2');
        const tp3Hits = trades.filter(t => t.exitReason === 'TP3');
        const slHits = trades.filter(t => t.exitReason === 'STOP_LOSS');

        const totalPnl = trades.reduce((sum, t) => sum + t.pnlPercent, 0);
        const avgPnl = totalPnl / trades.length || 0;
        const avgWin = wins.length > 0 
            ? wins.reduce((sum, t) => sum + t.pnlPercent, 0) / wins.length 
            : 0;
        const avgLoss = losses.length > 0 
            ? Math.abs(losses.reduce((sum, t) => sum + t.pnlPercent, 0) / losses.length)
            : 0;

        const profitFactor = avgLoss > 0 
            ? (avgWin * wins.length) / (avgLoss * losses.length) 
            : avgWin > 0 ? Infinity : 0;

        const winRate = (wins.length / trades.length) * 100 || 0;

        // Sharpe Ratio simplificado
        const returns = trades.map(t => t.pnlPercent);
        const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length || 0;
        const stdDev = Math.sqrt(
            returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length
        ) || 1;
        const sharpeRatio = (meanReturn / stdDev) * Math.sqrt(252); // Anualizado

        return {
            totalTrades: trades.length,
            wins: wins.length,
            losses: losses.length,
            winRate: winRate.toFixed(2),
            
            tp1Hits: tp1Hits.length,
            tp2Hits: tp2Hits.length,
            tp3Hits: tp3Hits.length,
            slHits: slHits.length,
            
            totalPnlPercent: totalPnl.toFixed(2),
            avgPnlPercent: avgPnl.toFixed(2),
            avgWinPercent: avgWin.toFixed(2),
            avgLossPercent: avgLoss.toFixed(2),
            
            initialCapital: this.config.initialCapital,
            finalCapital: finalCapital.toFixed(2),
            totalReturn: ((finalCapital - this.config.initialCapital) / this.config.initialCapital * 100).toFixed(2),
            
            maxDrawdown: (maxDrawdown * 100).toFixed(2),
            profitFactor: profitFactor.toFixed(2),
            sharpeRatio: sharpeRatio.toFixed(2),
            
            avgDurationHours: (trades.reduce((sum, t) => sum + t.duration, 0) / trades.length || 0).toFixed(1)
        };
    },

    // ========================================
    // RELATÓRIO DE BACKTEST
    // ========================================
    generateReport() {
        const m = this.results.metrics;
        
        return `
╔═══════════════════════════════════════════════════════════════╗
║                    BACKTEST REPORT                            ║
╚═══════════════════════════════════════════════════════════════╝

📊 RESUMO GERAL
───────────────────────────────────────────────────────────────
Total de Trades:     ${m.totalTrades}
Win Rate:            ${m.winRate}%
Profit Factor:       ${m.profitFactor}
Sharpe Ratio:        ${m.sharpeRatio}

💰 RESULTADOS
───────────────────────────────────────────────────────────────
Capital Inicial:     $${m.initialCapital.toLocaleString()}
Capital Final:       $${parseFloat(m.finalCapital).toLocaleString()}
Retorno Total:       ${m.totalReturn}%
Max Drawdown:        ${m.maxDrawdown}%

🎯 TARGETS
───────────────────────────────────────────────────────────────
TP1 Hits:            ${m.tp1Hits} (${((m.tp1Hits/m.totalTrades)*100).toFixed(1)}%)
TP2 Hits:            ${m.tp2Hits} (${((m.tp2Hits/m.totalTrades)*100).toFixed(1)}%)
TP3 Hits:            ${m.tp3Hits} (${((m.tp3Hits/m.totalTrades)*100).toFixed(1)}%)
Stop Loss:           ${m.slHits} (${((m.slHits/m.totalTrades)*100).toFixed(1)}%)

📈 MÉDIAS
───────────────────────────────────────────────────────────────
P&L Médio:           ${m.avgPnlPercent}%
Ganho Médio:         +${m.avgWinPercent}%
Perda Média:         -${m.avgLossPercent}%
Duração Média:       ${m.avgDurationHours}h

═══════════════════════════════════════════════════════════════
`;
    },

    // ========================================
    // DADOS HISTÓRICOS
    // ========================================
    async getHistoricalData(symbol, interval, startDate, endDate) {
        try {
            const startTime = new Date(startDate).getTime();
            const endTime = new Date(endDate).getTime();

            const response = await fetch(
                `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=1000`
            );

            return await response.json();
        } catch (error) {
            console.error('Historical data error:', error);
            return null;
        }
    },

    // ========================================
    // OTIMIZAÇÃO DE PARÂMETROS
    // ========================================
    async optimizeParameters(opportunities, paramRanges) {
        console.log('🔧 Running parameter optimization...');

        const results = [];

        // Grid search simples
        for (let minConf = paramRanges.minConfluence.start; 
             minConf <= paramRanges.minConfluence.end; 
             minConf += paramRanges.minConfluence.step) {
            
            for (let riskReward = paramRanges.riskReward.start;
                 riskReward <= paramRanges.riskReward.end;
                 riskReward += paramRanges.riskReward.step) {

                // Filtrar oportunidades pelo score
                const filtered = opportunities.filter(o => 
                    (o.confluence?.score || o.confluenceScore || 0) >= minConf
                );

                if (filtered.length < 10) continue;

                // Rodar backtest
                const backtest = await this.runBacktest(
                    filtered,
                    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
                    new Date()
                );

                results.push({
                    params: { minConfluence: minConf, riskReward },
                    metrics: backtest.metrics,
                    trades: filtered.length
                });
            }
        }

        // Ordenar por Sharpe Ratio
        results.sort((a, b) => parseFloat(b.metrics.sharpeRatio) - parseFloat(a.metrics.sharpeRatio));

        console.log('🏆 Best parameters:', results[0]);
        return results;
    }
};

// Export
window.Backtester = Backtester;

console.log('📊 Backtesting Engine loaded');
