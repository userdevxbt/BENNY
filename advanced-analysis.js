/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                  SHDWXBT — Advanced Analysis Module                            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Copyright (c) 2024-2026 SHDWXBT. All rights reserved.                        ║
 * ║                                                                               ║
 * ║  PROPRIETARY AND CONFIDENTIAL                                                 ║
 * ║  This file contains trade secrets and proprietary information.                ║
 * ║  Unauthorized copying, modification, distribution, or use is prohibited.      ║
 * ║  Protected by intellectual property laws and international treaties.          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * Sistema avançado de análise para MÁXIMA PRECISÃO
 * 
 * Features:
 * - Multi-Timeframe Analysis (MTF)
 * - Volume Profile Analysis
 * - Market Structure Detection
 * - Smart Money Concepts (SMC)
 * - Confluence Scoring System v2
 */

const AdvancedAnalysis = {
    // ========================================
    // CONFIGURAÇÃO
    // ========================================
    config: {
        timeframes: ['5m', '15m', '1h', '4h', '1d'],
        minMTFConfirmation: 3, // Mínimo de timeframes confirmando
        volumeThreshold: 1.5,  // 150% do volume médio
        rsiOverbought: 70,
        rsiOversold: 30,
        atrMultiplier: 1.5
    },

    // ========================================
    // MULTI-TIMEFRAME ANALYSIS (MTF)
    // ========================================
    async analyzeMultiTimeframe(symbol) {
        const results = {
            symbol,
            timeframes: {},
            overallTrend: 'neutral',
            strength: 0,
            alignment: 0,
            recommendation: null
        };

        let bullishCount = 0;
        let bearishCount = 0;

        for (const tf of this.config.timeframes) {
            try {
                const analysis = await this.analyzeSingleTimeframe(symbol, tf);
                results.timeframes[tf] = analysis;

                if (analysis.trend === 'bullish') bullishCount++;
                else if (analysis.trend === 'bearish') bearishCount++;
            } catch (error) {
                console.warn(`MTF Error ${symbol} ${tf}:`, error.message);
                results.timeframes[tf] = { trend: 'neutral', error: true };
            }
        }

        // Calcular alinhamento
        const total = this.config.timeframes.length;
        results.alignment = Math.max(bullishCount, bearishCount) / total * 100;

        // Determinar tendência geral
        if (bullishCount >= this.config.minMTFConfirmation) {
            results.overallTrend = 'bullish';
            results.strength = bullishCount / total * 100;
        } else if (bearishCount >= this.config.minMTFConfirmation) {
            results.overallTrend = 'bearish';
            results.strength = bearishCount / total * 100;
        }

        // Recomendação
        if (results.alignment >= 80) {
            results.recommendation = results.overallTrend === 'bullish' ? 'STRONG_BUY' : 'STRONG_SELL';
        } else if (results.alignment >= 60) {
            results.recommendation = results.overallTrend === 'bullish' ? 'BUY' : 'SELL';
        } else {
            results.recommendation = 'WAIT';
        }

        return results;
    },

    async analyzeSingleTimeframe(symbol, timeframe) {
        // Buscar dados da Binance
        const klines = await this.getKlines(symbol, timeframe, 100);
        if (!klines || klines.length < 50) {
            return { trend: 'neutral', error: 'insufficient_data' };
        }

        const closes = klines.map(k => parseFloat(k[4]));
        const highs = klines.map(k => parseFloat(k[2]));
        const lows = klines.map(k => parseFloat(k[3]));
        const volumes = klines.map(k => parseFloat(k[5]));

        // Calcular indicadores
        const ema20 = this.calculateEMA(closes, 20);
        const ema50 = this.calculateEMA(closes, 50);
        const rsi = this.calculateRSI(closes, 14);
        const atr = this.calculateATR(highs, lows, closes, 14);

        const currentPrice = closes[closes.length - 1];
        const currentEma20 = ema20[ema20.length - 1];
        const currentEma50 = ema50[ema50.length - 1];
        const currentRsi = rsi[rsi.length - 1];

        // Determinar tendência
        let trend = 'neutral';
        let signals = [];

        // EMA Cross
        if (currentEma20 > currentEma50) {
            signals.push('ema_bullish');
        } else if (currentEma20 < currentEma50) {
            signals.push('ema_bearish');
        }

        // Preço vs EMAs
        if (currentPrice > currentEma20 && currentPrice > currentEma50) {
            signals.push('price_above_emas');
        } else if (currentPrice < currentEma20 && currentPrice < currentEma50) {
            signals.push('price_below_emas');
        }

        // RSI
        if (currentRsi > 50) {
            signals.push('rsi_bullish');
        } else if (currentRsi < 50) {
            signals.push('rsi_bearish');
        }

        // Contar sinais
        const bullishSignals = signals.filter(s => s.includes('bullish') || s.includes('above')).length;
        const bearishSignals = signals.filter(s => s.includes('bearish') || s.includes('below')).length;

        if (bullishSignals > bearishSignals) trend = 'bullish';
        else if (bearishSignals > bullishSignals) trend = 'bearish';

        return {
            trend,
            ema20: currentEma20,
            ema50: currentEma50,
            rsi: currentRsi,
            atr: atr[atr.length - 1],
            price: currentPrice,
            signals,
            bullishSignals,
            bearishSignals
        };
    },

    // ========================================
    // MARKET STRUCTURE DETECTION
    // ========================================
    detectMarketStructure(highs, lows) {
        const structure = {
            trend: 'ranging',
            higherHighs: 0,
            higherLows: 0,
            lowerHighs: 0,
            lowerLows: 0,
            swingPoints: []
        };

        // Encontrar swing points (simplificado)
        for (let i = 2; i < highs.length - 2; i++) {
            // Swing High
            if (highs[i] > highs[i-1] && highs[i] > highs[i-2] &&
                highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
                structure.swingPoints.push({ type: 'high', index: i, price: highs[i] });
            }
            // Swing Low
            if (lows[i] < lows[i-1] && lows[i] < lows[i-2] &&
                lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
                structure.swingPoints.push({ type: 'low', index: i, price: lows[i] });
            }
        }

        // Analisar estrutura
        const swingHighs = structure.swingPoints.filter(p => p.type === 'high');
        const swingLows = structure.swingPoints.filter(p => p.type === 'low');

        for (let i = 1; i < swingHighs.length; i++) {
            if (swingHighs[i].price > swingHighs[i-1].price) structure.higherHighs++;
            else structure.lowerHighs++;
        }

        for (let i = 1; i < swingLows.length; i++) {
            if (swingLows[i].price > swingLows[i-1].price) structure.higherLows++;
            else structure.lowerLows++;
        }

        // Determinar tendência
        if (structure.higherHighs >= 2 && structure.higherLows >= 2) {
            structure.trend = 'uptrend';
        } else if (structure.lowerHighs >= 2 && structure.lowerLows >= 2) {
            structure.trend = 'downtrend';
        }

        return structure;
    },

    // ========================================
    // VOLUME ANALYSIS
    // ========================================
    analyzeVolume(volumes, prices) {
        const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
        const currentVolume = volumes[volumes.length - 1];
        const previousVolume = volumes[volumes.length - 2];

        const currentPrice = prices[prices.length - 1];
        const previousPrice = prices[prices.length - 2];

        const volumeRatio = currentVolume / avgVolume;
        const priceChange = (currentPrice - previousPrice) / previousPrice * 100;

        let signal = 'neutral';
        let strength = 0;

        // Volume spike com preço subindo = bullish
        if (volumeRatio > this.config.volumeThreshold && priceChange > 0) {
            signal = 'bullish_volume';
            strength = Math.min(volumeRatio * 20, 100);
        }
        // Volume spike com preço caindo = bearish
        else if (volumeRatio > this.config.volumeThreshold && priceChange < 0) {
            signal = 'bearish_volume';
            strength = Math.min(volumeRatio * 20, 100);
        }
        // Volume baixo = sem interesse
        else if (volumeRatio < 0.5) {
            signal = 'low_volume';
            strength = 20;
        }

        return {
            currentVolume,
            avgVolume,
            volumeRatio,
            priceChange,
            signal,
            strength,
            isSpike: volumeRatio > this.config.volumeThreshold
        };
    },

    // ========================================
    // SMART MONEY CONCEPTS (SMC)
    // ========================================
    detectSMCPatterns(highs, lows, closes) {
        const patterns = {
            orderBlocks: [],
            fairValueGaps: [],
            liquidityZones: [],
            breakOfStructure: []
        };

        // Detectar Order Blocks (última vela antes de movimento forte)
        for (let i = 3; i < closes.length - 1; i++) {
            const move = Math.abs(closes[i] - closes[i-1]) / closes[i-1] * 100;
            
            // Movimento forte (> 1%)
            if (move > 1) {
                const isBullish = closes[i] > closes[i-1];
                patterns.orderBlocks.push({
                    index: i - 1,
                    type: isBullish ? 'bullish_ob' : 'bearish_ob',
                    high: highs[i-1],
                    low: lows[i-1],
                    strength: move
                });
            }
        }

        // Detectar Fair Value Gaps (FVG)
        for (let i = 2; i < highs.length; i++) {
            // Bullish FVG: low[i] > high[i-2]
            if (lows[i] > highs[i-2]) {
                patterns.fairValueGaps.push({
                    index: i,
                    type: 'bullish_fvg',
                    top: lows[i],
                    bottom: highs[i-2],
                    size: lows[i] - highs[i-2]
                });
            }
            // Bearish FVG: high[i] < low[i-2]
            if (highs[i] < lows[i-2]) {
                patterns.fairValueGaps.push({
                    index: i,
                    type: 'bearish_fvg',
                    top: lows[i-2],
                    bottom: highs[i],
                    size: lows[i-2] - highs[i]
                });
            }
        }

        // Detectar zonas de liquidez (clusters de highs/lows)
        const highClusters = this.findClusters(highs, 0.5);
        const lowClusters = this.findClusters(lows, 0.5);

        patterns.liquidityZones = [
            ...highClusters.map(c => ({ type: 'sell_side', price: c.price, count: c.count })),
            ...lowClusters.map(c => ({ type: 'buy_side', price: c.price, count: c.count }))
        ];

        return patterns;
    },

    findClusters(prices, tolerance) {
        const clusters = [];
        const sorted = [...prices].sort((a, b) => a - b);

        let currentCluster = { price: sorted[0], count: 1 };

        for (let i = 1; i < sorted.length; i++) {
            const diff = Math.abs(sorted[i] - currentCluster.price) / currentCluster.price * 100;
            
            if (diff <= tolerance) {
                currentCluster.count++;
                currentCluster.price = (currentCluster.price + sorted[i]) / 2;
            } else {
                if (currentCluster.count >= 3) {
                    clusters.push({ ...currentCluster });
                }
                currentCluster = { price: sorted[i], count: 1 };
            }
        }

        return clusters.sort((a, b) => b.count - a.count).slice(0, 5);
    },

    // ========================================
    // CONFLUENCE SCORING v2
    // ========================================
    calculateAdvancedScore(analysis) {
        let score = 0;
        const breakdown = {};

        // 1. MTF Alignment (0-30 pontos)
        if (analysis.mtf) {
            const mtfScore = analysis.mtf.alignment * 0.3;
            score += mtfScore;
            breakdown.mtf = mtfScore;
        }

        // 2. Market Structure (0-20 pontos)
        if (analysis.structure) {
            let structureScore = 0;
            if (analysis.structure.trend === 'uptrend' || analysis.structure.trend === 'downtrend') {
                structureScore = 20;
            } else {
                structureScore = 5;
            }
            score += structureScore;
            breakdown.structure = structureScore;
        }

        // 3. Volume (0-15 pontos)
        if (analysis.volume) {
            let volumeScore = 0;
            if (analysis.volume.isSpike) {
                volumeScore = 15;
            } else if (analysis.volume.volumeRatio > 1) {
                volumeScore = 10;
            } else {
                volumeScore = 5;
            }
            score += volumeScore;
            breakdown.volume = volumeScore;
        }

        // 4. SMC Patterns (0-20 pontos)
        if (analysis.smc) {
            let smcScore = 0;
            smcScore += Math.min(analysis.smc.orderBlocks.length * 3, 10);
            smcScore += Math.min(analysis.smc.fairValueGaps.length * 2, 6);
            smcScore += Math.min(analysis.smc.liquidityZones.length, 4);
            score += smcScore;
            breakdown.smc = smcScore;
        }

        // 5. RSI Position (0-15 pontos)
        if (analysis.rsi) {
            let rsiScore = 0;
            if (analysis.rsi < 30 && analysis.trend === 'bullish') {
                rsiScore = 15; // Oversold + bullish = great entry
            } else if (analysis.rsi > 70 && analysis.trend === 'bearish') {
                rsiScore = 15; // Overbought + bearish = great entry
            } else if (analysis.rsi >= 40 && analysis.rsi <= 60) {
                rsiScore = 10; // Neutral zone
            } else {
                rsiScore = 5;
            }
            score += rsiScore;
            breakdown.rsi = rsiScore;
        }

        return {
            total: Math.round(score),
            breakdown,
            grade: this.getGrade(score),
            confidence: this.getConfidenceLevel(score)
        };
    },

    getGrade(score) {
        if (score >= 90) return 'A+';
        if (score >= 80) return 'A';
        if (score >= 70) return 'B+';
        if (score >= 60) return 'B';
        if (score >= 50) return 'C';
        return 'D';
    },

    getConfidenceLevel(score) {
        if (score >= 80) return 'VERY_HIGH';
        if (score >= 65) return 'HIGH';
        if (score >= 50) return 'MEDIUM';
        if (score >= 35) return 'LOW';
        return 'VERY_LOW';
    },

    // ========================================
    // ANÁLISE COMPLETA
    // ========================================
    async runFullAnalysis(symbol) {
        console.log(`🔬 Running advanced analysis for ${symbol}...`);

        try {
            // 1. MTF Analysis
            const mtf = await this.analyzeMultiTimeframe(symbol);

            // 2. Get detailed data for 1h timeframe
            const klines = await this.getKlines(symbol, '1h', 200);
            if (!klines || klines.length < 100) {
                throw new Error('Insufficient data');
            }

            const closes = klines.map(k => parseFloat(k[4]));
            const highs = klines.map(k => parseFloat(k[2]));
            const lows = klines.map(k => parseFloat(k[3]));
            const volumes = klines.map(k => parseFloat(k[5]));

            // 3. Market Structure
            const structure = this.detectMarketStructure(highs, lows);

            // 4. Volume Analysis
            const volume = this.analyzeVolume(volumes, closes);

            // 5. SMC Patterns
            const smc = this.detectSMCPatterns(highs, lows, closes);

            // 6. Current indicators
            const rsi = this.calculateRSI(closes, 14);
            const currentRsi = rsi[rsi.length - 1];

            // 7. Calculate advanced score
            const analysis = {
                mtf,
                structure,
                volume,
                smc,
                rsi: currentRsi,
                trend: mtf.overallTrend
            };

            const score = this.calculateAdvancedScore(analysis);

            return {
                symbol,
                timestamp: new Date().toISOString(),
                price: closes[closes.length - 1],
                trend: mtf.overallTrend,
                mtf,
                structure,
                volume,
                smc,
                rsi: currentRsi,
                score,
                recommendation: mtf.recommendation,
                summary: this.generateSummary(analysis, score)
            };

        } catch (error) {
            console.error(`Analysis error for ${symbol}:`, error);
            return {
                symbol,
                error: error.message,
                score: { total: 0, grade: 'F', confidence: 'ERROR' }
            };
        }
    },

    generateSummary(analysis, score) {
        const parts = [];

        // Tendência
        parts.push(`📊 Tendência: ${analysis.mtf.overallTrend.toUpperCase()}`);
        parts.push(`💪 Força: ${analysis.mtf.strength.toFixed(0)}%`);
        parts.push(`🎯 Score: ${score.total}/100 (${score.grade})`);
        parts.push(`📈 RSI: ${analysis.rsi.toFixed(1)}`);

        // Volume
        if (analysis.volume.isSpike) {
            parts.push(`🔥 Volume Spike: ${analysis.volume.volumeRatio.toFixed(1)}x`);
        }

        // SMC
        if (analysis.smc.orderBlocks.length > 0) {
            parts.push(`📦 Order Blocks: ${analysis.smc.orderBlocks.length}`);
        }
        if (analysis.smc.fairValueGaps.length > 0) {
            parts.push(`📐 FVGs: ${analysis.smc.fairValueGaps.length}`);
        }

        return parts.join(' | ');
    },

    // ========================================
    // HELPER FUNCTIONS
    // ========================================
    async getKlines(symbol, interval, limit = 100) {
        try {
            const response = await fetch(
                `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
            );
            return await response.json();
        } catch (error) {
            console.error('Klines error:', error);
            return null;
        }
    },

    calculateEMA(prices, period) {
        const multiplier = 2 / (period + 1);
        const ema = [prices[0]];

        for (let i = 1; i < prices.length; i++) {
            ema.push((prices[i] - ema[i - 1]) * multiplier + ema[i - 1]);
        }

        return ema;
    },

    calculateRSI(prices, period = 14) {
        const changes = [];
        for (let i = 1; i < prices.length; i++) {
            changes.push(prices[i] - prices[i - 1]);
        }

        const gains = changes.map(c => c > 0 ? c : 0);
        const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);

        let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

        const rsi = [];

        for (let i = period; i < changes.length; i++) {
            avgGain = (avgGain * (period - 1) + gains[i]) / period;
            avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));
        }

        return rsi;
    },

    calculateATR(highs, lows, closes, period = 14) {
        const tr = [];
        for (let i = 1; i < highs.length; i++) {
            const hl = highs[i] - lows[i];
            const hc = Math.abs(highs[i] - closes[i - 1]);
            const lc = Math.abs(lows[i] - closes[i - 1]);
            tr.push(Math.max(hl, hc, lc));
        }

        const atr = [tr.slice(0, period).reduce((a, b) => a + b, 0) / period];
        
        for (let i = period; i < tr.length; i++) {
            atr.push((atr[atr.length - 1] * (period - 1) + tr[i]) / period);
        }

        return atr;
    }
};

// Export
window.AdvancedAnalysis = AdvancedAnalysis;

// Auto-initialize
console.log('🔬 Advanced Analysis Module loaded');
