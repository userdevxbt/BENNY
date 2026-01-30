/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    SHDW Master Precision System v1.0                         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Copyright (c) 2024-2026 SHDWXBT. All rights reserved.                        ║
 * ║                                                                               ║
 * ║  PROPRIETARY AND CONFIDENTIAL                                                 ║
 * ║  This file contains trade secrets and proprietary information.                ║
 * ║  Unauthorized copying, modification, distribution, or use is prohibited.      ║
 * ║  Protected by intellectual property laws and international treaties.          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 🎯 SISTEMA MESTRE DE PRECISÃO PARA ENTRADAS CIRÚRGICAS
 * 
 * Integra todos os motores de análise para máxima confluência:
 * - SMC Precision Engine (Order Blocks, FVG, Displacement)
 * - Fibonacci Precision Engine (OTE, Golden Pocket, Premium/Discount)
 * - Institutional Engine (Multi-Timeframe, Smart Money)
 * - Smart Risk Manager (Kelly, Position Sizing, Drawdown)
 * - ML Adaptive Engine (Patterns, Wyckoff, Elliott)
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    const CONFIG = {
        // Confluence Thresholds
        confluence: {
            minimum: 60,        // Min score to consider entry
            good: 70,           // Good entry
            excellent: 80,      // Excellent entry
            perfect: 90         // Perfect setup
        },

        // Weight Distribution (must sum to 100)
        weights: {
            smc: 25,            // SMC Precision Engine
            fibonacci: 25,      // Fibonacci Precision Engine
            structure: 20,      // Market Structure
            momentum: 15,       // Momentum/Displacement
            risk: 15            // Risk/Reward Quality
        },

        // Entry Quality Tiers
        tiers: {
            'S': { min: 90, label: 'PERFECT SETUP', emoji: '🏆', color: '#FFD700' },
            'A': { min: 80, label: 'EXCELLENT', emoji: '⭐', color: '#00FF00' },
            'B': { min: 70, label: 'GOOD', emoji: '✅', color: '#00BFFF' },
            'C': { min: 60, label: 'ACCEPTABLE', emoji: '⚡', color: '#FFA500' },
            'D': { min: 0, label: 'WEAK', emoji: '⚠️', color: '#FF4444' }
        },

        // Multi-Timeframe Analysis
        timeframes: {
            scalping: ['1m', '5m', '15m'],
            dayTrading: ['15m', '1h', '4h'],
            swing: ['4h', '1d', '1w'],
            position: ['1d', '1w', '1M']
        },

        // Risk/Reward Requirements
        riskReward: {
            minimum: 1.5,
            target: 2.5,
            optimal: 3.0
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // MASTER PRECISION CLASS
    // ═══════════════════════════════════════════════════════════════════════════

    class MasterPrecisionSystem {
        constructor() {
            this.engines = {};
            this.lastAnalysis = null;
            this.signalHistory = [];
        }

        /**
         * Initialize and connect all engines
         */
        async initialize() {
            console.log('🎯 Initializing Master Precision System...');

            // Connect to available engines
            if (typeof window !== 'undefined') {
                if (window.SMCPrecisionEngine) {
                    this.engines.smc = window.SMCPrecisionEngine;
                    console.log('  ✅ SMC Precision Engine connected');
                }

                if (window.FibonacciPrecisionEngine) {
                    this.engines.fibonacci = window.FibonacciPrecisionEngine;
                    console.log('  ✅ Fibonacci Precision Engine connected');
                }

                if (window.InstitutionalEngine) {
                    this.engines.institutional = window.InstitutionalEngine;
                    console.log('  ✅ Institutional Engine connected');
                }

                if (window.SmartRiskManager) {
                    this.engines.risk = window.SmartRiskManager;
                    console.log('  ✅ Smart Risk Manager connected');
                }

                if (window.MLAdaptiveEngine) {
                    this.engines.ml = window.MLAdaptiveEngine;
                    console.log('  ✅ ML Adaptive Engine connected');
                }
            }

            console.log(`🎯 Master Precision System ready (${Object.keys(this.engines).length} engines)`);
            return this;
        }

        /**
         * Complete precision analysis for an asset
         */
        async analyzeAsset(symbol, candles, timeframe = '1h', options = {}) {
            const startTime = Date.now();
            
            const analysis = {
                symbol,
                timeframe,
                timestamp: Date.now(),
                components: {},
                scores: {},
                confluence: 0,
                tier: 'D',
                signal: null,
                entry: null,
                recommendations: []
            };

            try {
                // 1. SMC Analysis
                if (this.engines.smc) {
                    analysis.components.smc = this.engines.smc.analyzeComplete(candles, symbol);
                    analysis.scores.smc = analysis.components.smc.confluenceScore || 0;
                }

                // 2. Fibonacci Analysis
                if (this.engines.fibonacci) {
                    const fibEngine = new this.engines.fibonacci.Engine({
                        profile: options.profile || 'balanced',
                        oteMode: options.oteMode || 'standard'
                    });
                    analysis.components.fibonacci = fibEngine.analyzeComplete(candles, timeframe);
                    analysis.scores.fibonacci = analysis.components.fibonacci.scores?.overall || 0;
                }

                // 3. Market Structure Analysis
                analysis.components.structure = this.analyzeStructure(candles, analysis.components);
                analysis.scores.structure = analysis.components.structure.score;

                // 4. Momentum Analysis
                analysis.components.momentum = this.analyzeMomentum(candles, analysis.components);
                analysis.scores.momentum = analysis.components.momentum.score;

                // 5. Risk/Reward Analysis
                analysis.components.risk = this.analyzeRiskReward(analysis.components, candles);
                analysis.scores.risk = analysis.components.risk.score;

                // Calculate weighted confluence
                analysis.confluence = this.calculateConfluence(analysis.scores);
                analysis.tier = this.determineTier(analysis.confluence);

                // Generate signal if confluence is sufficient
                if (analysis.confluence >= CONFIG.confluence.minimum) {
                    analysis.signal = this.generateSignal(analysis);
                    analysis.entry = this.generateEntryPlan(analysis, candles);
                }

                // Generate recommendations
                analysis.recommendations = this.generateRecommendations(analysis);

                // Performance metrics
                analysis.processingTime = Date.now() - startTime;
                
                // Store for history
                this.lastAnalysis = analysis;
                this.signalHistory.push({
                    symbol,
                    timeframe,
                    confluence: analysis.confluence,
                    tier: analysis.tier,
                    timestamp: analysis.timestamp
                });

            } catch (error) {
                console.error('Master Precision Analysis Error:', error);
                analysis.error = error.message;
            }

            return analysis;
        }

        /**
         * Analyze market structure from components
         */
        analyzeStructure(candles, components) {
            const result = {
                score: 0,
                trend: 'neutral',
                structure: [],
                bos: [],
                choch: []
            };

            // From SMC
            if (components.smc?.marketStructure) {
                const ms = components.smc.marketStructure;
                if (ms.trend) {
                    result.trend = ms.trend;
                    result.score += 30;
                }
                if (ms.bos) {
                    result.bos.push(ms.bos);
                    result.score += 20;
                }
                if (ms.choch) {
                    result.choch.push(ms.choch);
                    result.score += 25;
                }
            }

            // From Fibonacci
            if (components.fibonacci?.structure) {
                const fs = components.fibonacci.structure;
                if (fs.trend !== 0) {
                    result.score += 15;
                }
                if (fs.highType) result.structure.push(fs.highType);
                if (fs.lowType) result.structure.push(fs.lowType);
            }

            // Alignment bonus
            if (components.smc?.marketStructure?.trend === (components.fibonacci?.bias > 0 ? 'bullish' : 'bearish')) {
                result.score += 10; // Alignment bonus
            }

            result.score = Math.min(100, result.score);
            return result;
        }

        /**
         * Analyze momentum and displacement
         */
        analyzeMomentum(candles, components) {
            const result = {
                score: 0,
                displacement: null,
                strength: 'weak'
            };

            const current = candles[candles.length - 1];
            const prev = candles[candles.length - 2];

            // Body vs Range ratio
            const body = Math.abs(current.close - current.open);
            const range = current.high - current.low;
            const bodyRatio = range > 0 ? body / range : 0;

            if (bodyRatio >= 0.8) {
                result.strength = 'very_strong';
                result.score += 40;
            } else if (bodyRatio >= 0.65) {
                result.strength = 'strong';
                result.score += 30;
            } else if (bodyRatio >= 0.5) {
                result.strength = 'moderate';
                result.score += 20;
            } else {
                result.strength = 'weak';
                result.score += 10;
            }

            // Displacement from components
            if (components.smc?.displacement?.detected) {
                result.displacement = components.smc.displacement;
                result.score += 25;
            }

            if (components.fibonacci?.breaks?.displacement?.isDisplacement) {
                result.score += 20;
            }

            // Volume analysis (if available)
            if (current.volume && prev.volume) {
                const volumeRatio = current.volume / prev.volume;
                if (volumeRatio > 2) result.score += 15;
                else if (volumeRatio > 1.5) result.score += 10;
            }

            result.score = Math.min(100, result.score);
            return result;
        }

        /**
         * Analyze risk/reward potential
         */
        analyzeRiskReward(components, candles) {
            const result = {
                score: 0,
                ratio: 0,
                entryZone: null,
                stopZone: null,
                targetZones: []
            };

            const currentPrice = candles[candles.length - 1].close;

            // Get entry zone from SMC/Fibonacci
            if (components.fibonacci?.position?.inOTE) {
                result.entryZone = components.fibonacci.ote;
                result.score += 25;
            } else if (components.smc?.orderBlocks?.length > 0) {
                const strongOB = components.smc.orderBlocks.find(ob => ob.tier === 'STRONG');
                if (strongOB) {
                    result.entryZone = strongOB;
                    result.score += 20;
                }
            }

            // Get stop zone
            if (components.fibonacci?.leg) {
                result.stopZone = {
                    price: components.fibonacci.leg.A,
                    type: 'swing'
                };
            }

            // Calculate R:R if we have entry and stop
            if (result.entryZone && result.stopZone) {
                const entryPrice = result.entryZone.midpoint || currentPrice;
                const stopPrice = result.stopZone.price;
                const risk = Math.abs(entryPrice - stopPrice);

                // Get targets from Fibonacci
                if (components.fibonacci?.zones?.fibLevels) {
                    const levels = components.fibonacci.zones.fibLevels;
                    const direction = entryPrice > stopPrice ? 1 : -1;

                    // Potential targets
                    const targetLevels = direction === 1 
                        ? ['0.382', '0.236', '0']
                        : ['0.618', '0.786', '1.0'];

                    targetLevels.forEach((level, i) => {
                        if (levels[level]) {
                            const reward = Math.abs(levels[level].price - entryPrice);
                            const rr = reward / risk;
                            result.targetZones.push({
                                level,
                                price: levels[level].price,
                                riskReward: rr.toFixed(2),
                                tpNumber: i + 1
                            });
                        }
                    });

                    // Best R:R
                    if (result.targetZones.length > 0) {
                        result.ratio = parseFloat(result.targetZones[1]?.riskReward || result.targetZones[0]?.riskReward);
                    }
                }
            }

            // Score based on R:R
            if (result.ratio >= CONFIG.riskReward.optimal) {
                result.score += 40;
            } else if (result.ratio >= CONFIG.riskReward.target) {
                result.score += 30;
            } else if (result.ratio >= CONFIG.riskReward.minimum) {
                result.score += 20;
            }

            // Zone quality bonus
            if (components.fibonacci?.position?.nearGolden) {
                result.score += 15;
            }
            if (components.smc?.premiumDiscount) {
                const pd = components.smc.premiumDiscount;
                if (pd.position === 'discount' || pd.position === 'premium') {
                    result.score += 10;
                }
            }

            result.score = Math.min(100, result.score);
            return result;
        }

        /**
         * Calculate weighted confluence score
         */
        calculateConfluence(scores) {
            const w = CONFIG.weights;
            
            let total = 0;
            let weightSum = 0;

            if (scores.smc !== undefined) {
                total += scores.smc * w.smc;
                weightSum += w.smc;
            }
            if (scores.fibonacci !== undefined) {
                total += scores.fibonacci * w.fibonacci;
                weightSum += w.fibonacci;
            }
            if (scores.structure !== undefined) {
                total += scores.structure * w.structure;
                weightSum += w.structure;
            }
            if (scores.momentum !== undefined) {
                total += scores.momentum * w.momentum;
                weightSum += w.momentum;
            }
            if (scores.risk !== undefined) {
                total += scores.risk * w.risk;
                weightSum += w.risk;
            }

            return weightSum > 0 ? Math.round(total / weightSum) : 0;
        }

        /**
         * Determine tier from confluence score
         */
        determineTier(confluence) {
            for (const [tier, config] of Object.entries(CONFIG.tiers)) {
                if (confluence >= config.min) {
                    return tier;
                }
            }
            return 'D';
        }

        /**
         * Generate trading signal
         */
        generateSignal(analysis) {
            const { components } = analysis;
            
            // Determine direction
            let direction = 'NEUTRAL';
            let confidence = 0;

            // Check SMC bias
            if (components.smc?.marketStructure?.trend === 'bullish') {
                direction = 'LONG';
                confidence += 25;
            } else if (components.smc?.marketStructure?.trend === 'bearish') {
                direction = 'SHORT';
                confidence += 25;
            }

            // Check Fibonacci bias
            if (components.fibonacci?.bias === 1) {
                if (direction === 'LONG') confidence += 20;
                else if (direction === 'NEUTRAL') direction = 'LONG';
            } else if (components.fibonacci?.bias === -1) {
                if (direction === 'SHORT') confidence += 20;
                else if (direction === 'NEUTRAL') direction = 'SHORT';
            }

            // Check position for confirmation
            if (components.fibonacci?.position) {
                const pos = components.fibonacci.position;
                if (pos.position === 'discount' && direction === 'LONG') {
                    confidence += 20;
                } else if (pos.position === 'premium' && direction === 'SHORT') {
                    confidence += 20;
                }
            }

            // Add structure confirmation
            if (components.structure?.bos?.length > 0) confidence += 15;
            if (components.structure?.choch?.length > 0) confidence += 20;

            return {
                direction,
                confidence: Math.min(100, confidence),
                type: this.getSignalType(direction, analysis.confluence)
            };
        }

        /**
         * Get signal type based on direction and confluence
         */
        getSignalType(direction, confluence) {
            if (confluence >= 90) return `STRONG_${direction}`;
            if (confluence >= 80) return `CONFIRMED_${direction}`;
            if (confluence >= 70) return `VALID_${direction}`;
            return `POTENTIAL_${direction}`;
        }

        /**
         * Generate complete entry plan
         */
        generateEntryPlan(analysis, candles) {
            const { components, signal } = analysis;
            const currentPrice = candles[candles.length - 1].close;

            const plan = {
                type: signal.direction,
                entryType: 'limit', // or 'market'
                entries: [],
                stopLoss: null,
                takeProfit: [],
                riskReward: 0,
                positionSize: null
            };

            // Entry zones
            if (components.fibonacci?.ote) {
                plan.entries.push({
                    price: components.fibonacci.ote.midpoint,
                    type: 'OTE',
                    allocation: 50
                });
            }

            if (components.fibonacci?.goldenPocket) {
                plan.entries.push({
                    price: (components.fibonacci.goldenPocket.top + components.fibonacci.goldenPocket.bottom) / 2,
                    type: 'Golden Pocket',
                    allocation: 30
                });
            }

            if (components.smc?.orderBlocks?.length > 0) {
                const strongOB = components.smc.orderBlocks[0];
                if (strongOB) {
                    plan.entries.push({
                        price: (strongOB.top + strongOB.bottom) / 2,
                        type: 'Order Block',
                        allocation: 20
                    });
                }
            }

            // Stop Loss
            if (components.fibonacci?.leg) {
                const leg = components.fibonacci.leg;
                const buffer = Math.abs(leg.A - leg.B) * 0.02; // 2% buffer
                plan.stopLoss = {
                    price: signal.direction === 'LONG' ? leg.A - buffer : leg.A + buffer,
                    type: 'Below/Above Swing'
                };
            }

            // Take Profit levels
            if (components.risk?.targetZones) {
                plan.takeProfit = components.risk.targetZones.map((tz, i) => ({
                    ...tz,
                    closePercent: i === 0 ? 30 : i === 1 ? 40 : 30
                }));
            }

            // Calculate average entry and R:R
            if (plan.entries.length > 0 && plan.stopLoss) {
                const avgEntry = plan.entries.reduce((sum, e) => sum + e.price * (e.allocation / 100), 0);
                const risk = Math.abs(avgEntry - plan.stopLoss.price);
                
                if (plan.takeProfit.length > 0) {
                    const avgTarget = plan.takeProfit[1]?.price || plan.takeProfit[0]?.price;
                    const reward = Math.abs(avgTarget - avgEntry);
                    plan.riskReward = (reward / risk).toFixed(2);
                }
            }

            // Position size (if risk manager available)
            if (this.engines.risk && plan.entries.length > 0 && plan.stopLoss) {
                try {
                    plan.positionSize = this.engines.risk.calculatePositionSize({
                        symbol: analysis.symbol,
                        entryPrice: plan.entries[0].price,
                        stopLoss: plan.stopLoss.price,
                        confidence: analysis.confluence
                    });
                } catch (e) {
                    console.warn('Position size calculation failed:', e);
                }
            }

            return plan;
        }

        /**
         * Generate actionable recommendations
         */
        generateRecommendations(analysis) {
            const recs = [];
            const { components, confluence, tier, signal } = analysis;

            // Tier-based recommendation
            const tierConfig = CONFIG.tiers[tier];
            recs.push({
                type: 'tier',
                emoji: tierConfig.emoji,
                message: `${tierConfig.label} - Confluence: ${confluence}%`,
                priority: tier === 'S' ? 'high' : tier === 'A' ? 'high' : 'medium'
            });

            // Position recommendation
            if (signal && signal.direction !== 'NEUTRAL') {
                const action = signal.direction === 'LONG' ? 'Comprar' : 'Vender';
                recs.push({
                    type: 'action',
                    emoji: signal.direction === 'LONG' ? '🟢' : '🔴',
                    message: `${action} com ${signal.confidence}% de confiança`,
                    priority: signal.confidence >= 70 ? 'high' : 'medium'
                });
            }

            // Zone recommendations
            if (components.fibonacci?.position) {
                const pos = components.fibonacci.position;
                if (pos.inOTE) {
                    recs.push({
                        type: 'zone',
                        emoji: '🎯',
                        message: 'Preço na zona OTE - Região de entrada ideal',
                        priority: 'high'
                    });
                }
                if (pos.nearGolden) {
                    recs.push({
                        type: 'zone',
                        emoji: '🌟',
                        message: 'Próximo ao Golden Pocket - Alta probabilidade',
                        priority: 'high'
                    });
                }
            }

            // Structure recommendations
            if (components.structure?.choch?.length > 0) {
                recs.push({
                    type: 'structure',
                    emoji: '🔄',
                    message: 'CHoCH detectado - Possível reversão de tendência',
                    priority: 'high'
                });
            }
            if (components.structure?.bos?.length > 0) {
                recs.push({
                    type: 'structure',
                    emoji: '💥',
                    message: 'BOS confirmado - Continuação da tendência',
                    priority: 'medium'
                });
            }

            // Risk recommendations
            if (components.risk?.ratio >= CONFIG.riskReward.optimal) {
                recs.push({
                    type: 'risk',
                    emoji: '💎',
                    message: `R:R Excelente: ${components.risk.ratio}:1`,
                    priority: 'high'
                });
            } else if (components.risk?.ratio >= CONFIG.riskReward.minimum) {
                recs.push({
                    type: 'risk',
                    emoji: '✅',
                    message: `R:R Aceitável: ${components.risk.ratio}:1`,
                    priority: 'medium'
                });
            }

            // Warnings
            if (confluence < CONFIG.confluence.minimum) {
                recs.push({
                    type: 'warning',
                    emoji: '⚠️',
                    message: 'Confluência insuficiente - Aguardar melhor setup',
                    priority: 'high'
                });
            }

            if (components.momentum?.strength === 'weak') {
                recs.push({
                    type: 'warning',
                    emoji: '⚡',
                    message: 'Momentum fraco - Confirmar com volume',
                    priority: 'medium'
                });
            }

            return recs;
        }

        /**
         * Quick scan for best setups across multiple symbols
         */
        async scanForSetups(symbols, candlesMap, timeframe = '1h') {
            const results = [];

            for (const symbol of symbols) {
                const candles = candlesMap[symbol];
                if (!candles || candles.length < 50) continue;

                try {
                    const analysis = await this.analyzeAsset(symbol, candles, timeframe);
                    
                    if (analysis.confluence >= CONFIG.confluence.minimum) {
                        results.push({
                            symbol,
                            confluence: analysis.confluence,
                            tier: analysis.tier,
                            signal: analysis.signal,
                            entry: analysis.entry,
                            recommendations: analysis.recommendations.slice(0, 3)
                        });
                    }
                } catch (error) {
                    console.warn(`Scan error for ${symbol}:`, error);
                }
            }

            // Sort by confluence
            results.sort((a, b) => b.confluence - a.confluence);

            return {
                timestamp: Date.now(),
                timeframe,
                totalScanned: symbols.length,
                setupsFound: results.length,
                setups: results
            };
        }

        /**
         * Generate summary report
         */
        generateReport(analysis) {
            const lines = [];
            const tierConfig = CONFIG.tiers[analysis.tier];
            
            lines.push('═══════════════════════════════════════');
            lines.push(`${tierConfig.emoji} MASTER PRECISION ANALYSIS ${tierConfig.emoji}`);
            lines.push('═══════════════════════════════════════');
            lines.push('');
            lines.push(`📊 Symbol: ${analysis.symbol}`);
            lines.push(`⏱️ Timeframe: ${analysis.timeframe}`);
            lines.push(`🎯 Confluence: ${analysis.confluence}% (${tierConfig.label})`);
            lines.push('');
            
            lines.push('📈 COMPONENT SCORES:');
            lines.push(`   SMC: ${analysis.scores.smc || 'N/A'}/100`);
            lines.push(`   Fibonacci: ${analysis.scores.fibonacci || 'N/A'}/100`);
            lines.push(`   Structure: ${analysis.scores.structure}/100`);
            lines.push(`   Momentum: ${analysis.scores.momentum}/100`);
            lines.push(`   Risk/Reward: ${analysis.scores.risk}/100`);
            lines.push('');

            if (analysis.signal && analysis.signal.direction !== 'NEUTRAL') {
                lines.push('🎯 SIGNAL:');
                const dirEmoji = analysis.signal.direction === 'LONG' ? '🟢' : '🔴';
                lines.push(`   ${dirEmoji} ${analysis.signal.type}`);
                lines.push(`   Confidence: ${analysis.signal.confidence}%`);
                lines.push('');
            }

            if (analysis.entry) {
                lines.push('📍 ENTRY PLAN:');
                analysis.entry.entries.forEach(e => {
                    lines.push(`   ${e.type}: $${e.price?.toFixed(2)} (${e.allocation}%)`);
                });
                if (analysis.entry.stopLoss) {
                    lines.push(`   🛑 Stop: $${analysis.entry.stopLoss.price?.toFixed(2)}`);
                }
                if (analysis.entry.takeProfit?.length > 0) {
                    lines.push('   🎯 Targets:');
                    analysis.entry.takeProfit.forEach(tp => {
                        lines.push(`      TP${tp.tpNumber}: $${tp.price?.toFixed(2)} (R:R ${tp.riskReward})`);
                    });
                }
                lines.push(`   📊 Overall R:R: ${analysis.entry.riskReward}:1`);
                lines.push('');
            }

            if (analysis.recommendations?.length > 0) {
                lines.push('💡 RECOMMENDATIONS:');
                analysis.recommendations.forEach(rec => {
                    lines.push(`   ${rec.emoji} ${rec.message}`);
                });
            }

            lines.push('');
            lines.push(`⏱️ Analysis Time: ${analysis.processingTime}ms`);
            lines.push('═══════════════════════════════════════');

            return lines.join('\n');
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Quick analysis helper
     */
    async function quickMasterAnalysis(symbol, candles, timeframe = '1h') {
        const system = new MasterPrecisionSystem();
        await system.initialize();
        return system.analyzeAsset(symbol, candles, timeframe);
    }

    /**
     * Quick scan helper
     */
    async function quickScan(symbols, candlesMap, timeframe = '1h') {
        const system = new MasterPrecisionSystem();
        await system.initialize();
        return system.scanForSetups(symbols, candlesMap, timeframe);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EXPORT
    // ═══════════════════════════════════════════════════════════════════════════

    const MasterPrecision = {
        System: MasterPrecisionSystem,
        quickAnalysis: quickMasterAnalysis,
        quickScan: quickScan,
        CONFIG,
        version: '1.0.0'
    };

    // Global export
    if (typeof window !== 'undefined') {
        window.MasterPrecisionSystem = MasterPrecision;
        window.MasterPrecision = MasterPrecision;
    }

    // Module export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = MasterPrecision;
    }

    console.log('✅ SHDW Master Precision System v1.0 loaded');

})();
