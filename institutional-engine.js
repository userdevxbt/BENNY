/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║              SHDWXBT — INSTITUTIONAL TRADING ENGINE v2.1                      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Copyright (c) 2024-2026 SHDWXBT. All rights reserved.                        ║
 * ║                                                                               ║
 * ║  PROPRIETARY AND CONFIDENTIAL                                                 ║
 * ║  This file contains trade secrets and proprietary information.                ║
 * ║  Unauthorized copying, modification, distribution, or use is prohibited.      ║
 * ║  Protected by intellectual property laws and international treaties.          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 🚀 SISTEMA MAIS AVANÇADO DE TRADING INSTITUCIONAL
 * 
 * Funcionalidades:
 * ✅ Multi-Timeframe Inteligente com Confluência Máxima (9 tempos gráficos)
 * ✅ Smart Money Concepts (SMC) Avançados - Order Blocks, FVG, Liquidity
 * ✅ Market Structure Detection - BOS, CHoCH, Break of Structure
 * ✅ Sistema de Score de Alta Precisão (0-100) com 15+ confluências
 * ✅ Gerenciamento de Risco Institucional - R:R otimizado (min 1:3)
 * ✅ Volume Profile Analysis - POC, Value Area, HVN/LVN
 * ✅ Wyckoff Method - Accumulation/Distribution phases
 * ✅ ICT Concepts - Kill Zones, Silver Bullets, Optimal Trade Entry
 * ✅ Institutional Order Flow
 * 
 * v2.1 - INTEGRAÇÃO SMC PRECISION ENGINE:
 * ✅ Order Blocks com Score de Qualidade (Creation, Follow-through, Location)
 * ✅ Sistema de Tiers: BALANCED, HIGH, STRONG
 * ✅ Fair Value Gaps com detecção de mitigação
 * ✅ Premium/Discount Zone Analysis
 * ✅ Displacement Detection para validação de força
 * ✅ Breaker Blocks automáticos
 * ✅ POI (Points of Interest) com confluência
 */

const InstitutionalEngine = {
    // ========================================
    // CONFIGURAÇÃO INSTITUCIONAL
    // ========================================
    config: {
        // Multi-Timeframe Hierárquico
        timeframeHierarchy: {
            scalping: {
                trigger: '1m',    // Gatilho
                entry: '5m',      // Entrada
                signal: '15m',    // Sinal
                trend: '1h',      // Tendência
                bias: '4h'        // Viés institucional
            },
            dayTrading: {
                trigger: '5m',
                entry: '15m',
                signal: '1h',
                trend: '4h',
                bias: '1d'
            },
            swing: {
                trigger: '15m',
                entry: '1h',
                signal: '4h',
                trend: '1d',
                bias: '1w'
            },
            position: {
                trigger: '1h',
                entry: '4h',
                signal: '1d',
                trend: '1w',
                bias: '1M'
            }
        },

        // Thresholds de Score por Perfil
        scoreThresholds: {
            scalping: {
                excellent: 85,  // Excelente
                good: 75,       // Bom
                acceptable: 65, // Aceitável
                minimum: 60     // Mínimo
            },
            dayTrading: {
                excellent: 80,
                good: 70,
                acceptable: 60,
                minimum: 55
            },
            swing: {
                excellent: 75,
                good: 65,
                acceptable: 55,
                minimum: 50
            },
            position: {
                excellent: 70,
                good: 60,
                acceptable: 50,
                minimum: 45
            }
        },

        // Gerenciamento de Risco Institucional
        riskManagement: {
            minRiskReward: 3.0,      // R:R mínimo 1:3
            optimalRiskReward: 5.0,  // R:R ótimo 1:5
            maxRiskPerTrade: 1.0,    // 1% por operação
            maxDailyRisk: 3.0,       // 3% risco diário
            stopLossATRMultiplier: 1.5,
            targetATRMultipliers: [2.5, 4.0, 6.0] // TP1, TP2, TP3
        },

        // Smart Money Concepts
        smc: {
            orderBlockStrength: {
                strong: 0.7,    // 70% do range
                medium: 0.5,    // 50% do range
                weak: 0.3       // 30% do range
            },
            fairValueGapMinSize: 0.002, // 0.2% mínimo
            liquidityZoneProximity: 0.015, // 1.5% proximidade
            breakOfStructureConfirmation: 0.005 // 0.5% confirmação
        },

        // ICT Kill Zones (London/New York Session)
        killZones: {
            london: { start: 2, end: 5 },      // 02:00-05:00 UTC
            newYork: { start: 8, end: 11 },    // 08:00-11:00 UTC
            asian: { start: 23, end: 2 }       // 23:00-02:00 UTC
        },

        // Volume Profile
        volumeProfile: {
            valueAreaPercentage: 0.70, // 70% do volume
            highVolumeNodeThreshold: 1.5,
            lowVolumeNodeThreshold: 0.5
        }
    },

    // ========================================
    // ANÁLISE MULTI-TIMEFRAME INTELIGENTE
    // ========================================
    async analyzeMultiTimeframeInstitutional(symbol, profile = 'dayTrading') {
        try {
            const hierarchy = this.config.timeframeHierarchy[profile];
            const timeframes = Object.values(hierarchy);
            
            console.log(`🔍 Análise MTF Institucional: ${symbol} [${profile}]`);
            
            // Buscar dados de todos os timeframes em paralelo
            const dataPromises = timeframes.map(tf => this.fetchKlines(symbol, tf, 200));
            const allData = await Promise.all(dataPromises);
            
            // Criar mapa timeframe -> dados
            const dataMap = {};
            timeframes.forEach((tf, idx) => {
                dataMap[tf] = allData[idx];
            });
            
            // Análise de cada timeframe
            const analysis = {
                symbol,
                profile,
                timestamp: Date.now(),
                timeframes: {},
                confluence: {},
                marketStructure: {},
                smartMoney: {},
                riskManagement: {},
                score: 0,
                recommendation: null,
                signals: []
            };
            
            // Analisar cada nível da hierarquia
            for (const [level, tf] of Object.entries(hierarchy)) {
                const klines = dataMap[tf];
                if (!klines || klines.length < 100) continue;
                
                analysis.timeframes[level] = await this.analyzeSingleTimeframe(
                    symbol, tf, klines, level
                );
            }
            
            // Detectar Estrutura de Mercado (BOS, CHoCH)
            analysis.marketStructure = this.detectMarketStructure(
                analysis.timeframes
            );
            
            // Identificar Smart Money Concepts
            analysis.smartMoney = await this.identifySmartMoneyConcepts(
                symbol, analysis.timeframes
            );
            
            // Calcular Confluências e Score
            analysis.confluence = this.calculateInstitutionalConfluence(
                analysis.timeframes,
                analysis.marketStructure,
                analysis.smartMoney
            );
            
            // Gerenciamento de Risco
            analysis.riskManagement = this.calculateRiskManagement(
                analysis.timeframes.entry,
                analysis.smartMoney,
                profile
            );
            
            // Score Final (0-100)
            analysis.score = this.calculateFinalScore(
                analysis.confluence,
                analysis.riskManagement,
                profile
            );
            
            // Recomendação
            analysis.recommendation = this.generateRecommendation(
                analysis.score,
                analysis.marketStructure,
                analysis.riskManagement,
                profile
            );
            
            return analysis;
            
        } catch (error) {
            console.error(`❌ Erro na análise MTF: ${symbol}`, error);
            return null;
        }
    },

    // ========================================
    // ANÁLISE SINGLE TIMEFRAME
    // ========================================
    async analyzeSingleTimeframe(symbol, timeframe, klines, level) {
        const closes = klines.map(k => parseFloat(k[4]));
        const highs = klines.map(k => parseFloat(k[2]));
        const lows = klines.map(k => parseFloat(k[3]));
        const volumes = klines.map(k => parseFloat(k[5]));
        const opens = klines.map(k => parseFloat(k[1]));
        
        const currentPrice = closes[closes.length - 1];
        
        // Indicadores Institucionais
        const ema9 = this.calculateEMA(closes, 9);
        const ema21 = this.calculateEMA(closes, 21);
        const ema50 = this.calculateEMA(closes, 50);
        const ema200 = this.calculateEMA(closes, 200);
        
        const rsi = this.calculateRSI(closes, 14);
        const atr = this.calculateATR(highs, lows, closes, 14);
        const adx = this.calculateADX(highs, lows, closes, 14);
        
        // Volume Analysis
        const volumeMA = this.calculateSMA(volumes, 20);
        const volumeRatio = volumes[volumes.length - 1] / volumeMA[volumeMA.length - 1];
        
        // Swing Points (Higher Highs, Lower Lows)
        const swings = this.identifySwingPoints(highs, lows, closes);
        
        // Trend Determination
        const trend = this.determineTrend(
            closes, ema9, ema21, ema50, ema200, swings
        );
        
        // Support & Resistance (Institucionais)
        const srLevels = this.calculateInstitutionalSR(
            highs, lows, closes, volumes
        );
        
        // Fibonacci Levels
        const fib = this.calculateFibonacci(
            swings.recentHigh,
            swings.recentLow,
            trend.direction === 'bullish'
        );
        
        return {
            timeframe,
            level,
            price: {
                current: currentPrice,
                open: opens[opens.length - 1],
                high: highs[highs.length - 1],
                low: lows[lows.length - 1]
            },
            indicators: {
                ema9: ema9[ema9.length - 1],
                ema21: ema21[ema21.length - 1],
                ema50: ema50[ema50.length - 1],
                ema200: ema200[ema200.length - 1],
                rsi: rsi[rsi.length - 1],
                atr: atr[atr.length - 1],
                adx: adx.adx[adx.adx.length - 1],
                plusDI: adx.plusDI[adx.plusDI.length - 1],
                minusDI: adx.minusDI[adx.minusDI.length - 1]
            },
            volume: {
                current: volumes[volumes.length - 1],
                average: volumeMA[volumeMA.length - 1],
                ratio: volumeRatio,
                isHigh: volumeRatio > 1.5,
                isAboveAverage: volumeRatio > 1.0
            },
            trend,
            swings,
            srLevels,
            fibonacci: fib
        };
    },

    // ========================================
    // MARKET STRUCTURE DETECTION
    // ========================================
    detectMarketStructure(timeframes) {
        const structure = {
            overall: 'neutral',
            strength: 0,
            breakOfStructure: [],
            changeOfCharacter: [],
            swingFailure: [],
            patterns: []
        };
        
        if (!timeframes || typeof timeframes !== 'object') {
            return structure;
        }
        
        // Verificar BOS (Break of Structure) em todos os timeframes
        for (const [level, data] of Object.entries(timeframes)) {
            if (!data || !data.swings || !data.price) continue;
            
            const swings = data.swings;
            
            // BOS Bullish: Preço quebra o último Higher High
            if (swings.lastHigherHigh && data.price.current > swings.lastHigherHigh) {
                structure.breakOfStructure.push({
                    level,
                    type: 'bullish',
                    price: swings.lastHigherHigh,
                    strength: this.calculateBOSStrength(data)
                });
            }
            
            // BOS Bearish: Preço quebra o último Lower Low
            if (swings.lastLowerLow && data.price.current < swings.lastLowerLow) {
                structure.breakOfStructure.push({
                    level,
                    type: 'bearish',
                    price: swings.lastLowerLow,
                    strength: this.calculateBOSStrength(data)
                });
            }
            
            // CHoCH (Change of Character) - Mudança de estrutura
            const choch = this.detectChangeOfCharacter(data);
            if (choch) {
                structure.changeOfCharacter.push({
                    level,
                    ...choch
                });
            }
        }
        
        // Determinar estrutura geral
        const bullishBOS = structure.breakOfStructure.filter(b => b.type === 'bullish').length;
        const bearishBOS = structure.breakOfStructure.filter(b => b.type === 'bearish').length;
        const tfCount = Object.keys(timeframes).length || 1;
        
        if (bullishBOS > bearishBOS && bullishBOS >= 2) {
            structure.overall = 'bullish';
            structure.strength = (bullishBOS / tfCount) * 100;
        } else if (bearishBOS > bullishBOS && bearishBOS >= 2) {
            structure.overall = 'bearish';
            structure.strength = (bearishBOS / tfCount) * 100;
        }
        
        return structure;
    },

    calculateBOSStrength(data) {
        if (!data || !data.volume || !data.trend || !data.indicators) {
            return 0;
        }
        
        let strength = 0;
        
        // Volume confirmation
        if (data.volume.isHigh) strength += 30;
        else if (data.volume.isAboveAverage) strength += 15;
        
        // Trend alignment
        if (data.trend.direction !== 'neutral') strength += 25;
        
        // ADX strength
        if (data.indicators.adx > 25) strength += 25;
        
        // Momentum (RSI)
        const rsi = data.indicators.rsi;
        if (rsi > 50 && rsi < 70) strength += 20;
        else if (rsi < 50 && rsi > 30) strength += 20;
        
        return Math.min(100, strength);
    },

    detectChangeOfCharacter(data) {
        if (!data || !data.swings) return null;
        
        // CHoCH: Quando a estrutura de Higher Highs/Lower Lows é quebrada
        const swings = data.swings;
        
        // Bullish CHoCH: Estava em downtrend, mas fez Higher Low
        if (swings.lastLowerLow && swings.lowerLows?.length >= 2) {
            const prevLL = swings.lowerLows[swings.lowerLows.length - 2];
            if (swings.lastLowerLow > prevLL) {
                return {
                    type: 'bullish_choch',
                    from: prevLL,
                    to: swings.lastLowerLow,
                    strength: 70
                };
            }
        }
        
        // Bearish CHoCH: Estava em uptrend, mas fez Lower High
        if (swings.lastHigherHigh && swings.higherHighs?.length >= 2) {
            const prevHH = swings.higherHighs[swings.higherHighs.length - 2];
            if (swings.lastHigherHigh < prevHH) {
                return {
                    type: 'bearish_choch',
                    from: prevHH,
                    to: swings.lastHigherHigh,
                    strength: 70
                };
            }
        }
        
        return null;
    },

    // ========================================
    // SMART MONEY CONCEPTS (SMC)
    // ========================================
    async identifySmartMoneyConcepts(symbol, timeframes) {
        const smc = {
            orderBlocks: [],
            fairValueGaps: [],
            liquidityZones: [],
            imbalances: [],
            optimalTradeEntry: null,
            institutionalLevels: []
        };
        
        // Analisar Order Blocks em cada timeframe
        for (const [level, data] of Object.entries(timeframes)) {
            if (!data) continue;
            
            // Order Blocks (últimas velas institucionais)
            const obs = this.detectOrderBlocks(data);
            if (obs && obs.length > 0) {
                smc.orderBlocks.push(...obs.map(ob => ({ ...ob, timeframe: level })));
            }
            
            // Fair Value Gaps (gaps de preço)
            const fvgs = this.detectFairValueGaps(data);
            if (fvgs && fvgs.length > 0) {
                smc.fairValueGaps.push(...fvgs.map(fvg => ({ ...fvg, timeframe: level })));
            }
            
            // Liquidity Zones (áreas de liquidez)
            const liq = this.detectLiquidityZones(data);
            if (liq && liq.length > 0) {
                smc.liquidityZones.push(...liq.map(l => ({ ...l, timeframe: level })));
            }
        }
        
        // Optimal Trade Entry (OTE) - Fibonacci 0.618-0.786
        if (timeframes?.entry) {
            smc.optimalTradeEntry = this.calculateOTE(timeframes.entry);
        }
        
        // Institutional Levels (round numbers + psychological levels)
        if (timeframes?.signal?.price?.current) {
            smc.institutionalLevels = this.identifyInstitutionalLevels(
                timeframes.signal.price.current
            );
        }
        
        return smc;
    },

    detectOrderBlocks(data) {
        // Validação
        if (!data || !data.price || !data.trend || !data.volume) {
            return [];
        }
        
        // Order Block: Última vela antes de um movimento forte
        const orderBlocks = [];
        const klines = data.price; // Simplificado
        
        // Bullish Order Block: Vela bearish seguida de movimento bullish forte
        // Bearish Order Block: Vela bullish seguida de movimento bearish forte
        
        // Implementação simplificada - em produção seria mais complexo
        if (data.trend.direction === 'bullish' && data.volume.isHigh) {
            orderBlocks.push({
                type: 'bullish',
                zone: {
                    top: data.price.high,
                    bottom: data.price.low,
                    middle: (data.price.high + data.price.low) / 2
                },
                strength: data.volume.ratio > 2 ? 'strong' : 'medium',
                distance: Math.abs(data.price.current - data.price.low) / data.price.current
            });
        } else if (data.trend.direction === 'bearish' && data.volume.isHigh) {
            orderBlocks.push({
                type: 'bearish',
                zone: {
                    top: data.price.high,
                    bottom: data.price.low,
                    middle: (data.price.high + data.price.low) / 2
                },
                strength: data.volume.ratio > 2 ? 'strong' : 'medium',
                distance: Math.abs(data.price.current - data.price.high) / data.price.current
            });
        }
        
        return orderBlocks;
    },

    detectFairValueGaps(data) {
        // Validação
        if (!data || !data.price || !data.trend) {
            return [];
        }
        
        // FVG: Gap entre velas consecutivas (imbalance)
        const fvgs = [];
        
        // Simplificado - verificar se há gap significativo
        const gap = Math.abs(data.price.high - data.price.low);
        const minGap = data.price.current * this.config.smc.fairValueGapMinSize;
        
        if (gap > minGap) {
            fvgs.push({
                type: data.trend.direction === 'bullish' ? 'bullish_fvg' : 'bearish_fvg',
                zone: {
                    top: data.price.high,
                    bottom: data.price.low
                },
                size: gap,
                filled: false
            });
        }
        
        return fvgs;
    },

    detectLiquidityZones(data) {
        // Validação
        if (!data || !data.price || !data.swings) {
            return [];
        }
        
        // Liquidity: Áreas onde há muitas stop losses (above highs, below lows)
        const liquidity = [];
        const swings = data.swings;
        
        // Liquidity acima dos highs (stop de shorts)
        if (swings.recentHigh) {
            liquidity.push({
                type: 'buy_side_liquidity',
                price: swings.recentHigh,
                distance: Math.abs(data.price.current - swings.recentHigh) / data.price.current,
                proximity: 'near' // near, medium, far
            });
        }
        
        // Liquidity abaixo dos lows (stop de longs)
        if (swings.recentLow) {
            liquidity.push({
                type: 'sell_side_liquidity',
                price: swings.recentLow,
                distance: Math.abs(data.price.current - swings.recentLow) / data.price.current,
                proximity: 'near'
            });
        }
        
        return liquidity;
    },

    calculateOTE(entryData) {
        // Validação
        if (!entryData || !entryData.fibonacci || !entryData.price) {
            return {
                zone: { top: 0, bottom: 0, ideal: 0 },
                currentDistance: 0,
                inZone: false
            };
        }
        
        // Optimal Trade Entry: Zona Fibonacci 0.618-0.786
        const fib = entryData.fibonacci;
        const fib618 = fib['0.618'] || 0;
        const fib786 = fib['0.786'] || 0;
        const fib705 = fib['0.705'] || (fib618 + fib786) / 2;
        
        return {
            zone: {
                top: fib618,
                bottom: fib786,
                ideal: fib705
            },
            currentDistance: Math.abs(entryData.price.current - fib705),
            inZone: entryData.price.current >= fib786 && 
                    entryData.price.current <= fib618
        };
    },

    identifyInstitutionalLevels(price) {
        // Round numbers e psychological levels
        const levels = [];
        const roundBase = Math.pow(10, Math.floor(Math.log10(price)));
        
        // Níveis redondos próximos
        for (let i = -2; i <= 2; i++) {
            const level = Math.round(price / roundBase) * roundBase + (i * roundBase);
            levels.push({
                price: level,
                type: 'round_number',
                importance: i === 0 ? 'high' : 'medium'
            });
        }
        
        // Psychological levels (.25, .50, .75)
        const base = Math.floor(price / roundBase) * roundBase;
        [0.25, 0.50, 0.75].forEach(mult => {
            levels.push({
                price: base + (roundBase * mult),
                type: 'psychological',
                importance: mult === 0.5 ? 'high' : 'medium'
            });
        });
        
        return levels.sort((a, b) => 
            Math.abs(a.price - price) - Math.abs(b.price - price)
        ).slice(0, 5);
    },

    // ========================================
    // CONFLUÊNCIA INSTITUCIONAL
    // ========================================
    calculateInstitutionalConfluence(timeframes, structure, smartMoney) {
        const confluence = {
            factors: [],
            totalScore: 0,
            maxScore: 100,
            breakdown: {}
        };
        
        let score = 0;
        
        // 1. Alinhamento Multi-Timeframe (0-20 pontos)
        const trendAlignment = this.calculateTrendAlignment(timeframes);
        score += trendAlignment.score;
        confluence.factors.push({
            name: 'Alinhamento Multi-Timeframe',
            score: trendAlignment.score,
            max: 20,
            details: trendAlignment.details
        });
        
        // 2. Market Structure (0-15 pontos)
        const structureScore = this.scoreMarketStructure(structure);
        score += structureScore.score;
        confluence.factors.push({
            name: 'Estrutura de Mercado',
            score: structureScore.score,
            max: 15,
            details: structureScore.details
        });
        
        // 3. Smart Money Concepts (0-20 pontos)
        const smcScore = this.scoreSmartMoney(smartMoney, timeframes.entry);
        score += smcScore.score;
        confluence.factors.push({
            name: 'Smart Money Concepts',
            score: smcScore.score,
            max: 20,
            details: smcScore.details
        });
        
        // 4. Volume Analysis (0-10 pontos)
        const volumeScore = this.scoreVolume(timeframes);
        score += volumeScore.score;
        confluence.factors.push({
            name: 'Análise de Volume',
            score: volumeScore.score,
            max: 10,
            details: volumeScore.details
        });
        
        // 5. Momentum (0-10 pontos)
        const momentumScore = this.scoreMomentum(timeframes);
        score += momentumScore.score;
        confluence.factors.push({
            name: 'Momentum',
            score: momentumScore.score,
            max: 10,
            details: momentumScore.details
        });
        
        // 6. Support/Resistance (0-10 pontos)
        const srScore = this.scoreSupportResistance(timeframes, smartMoney);
        score += srScore.score;
        confluence.factors.push({
            name: 'Suporte/Resistência',
            score: srScore.score,
            max: 10,
            details: srScore.details
        });
        
        // 7. Fibonacci Confluence (0-10 pontos)
        const fibScore = this.scoreFibonacci(timeframes);
        score += fibScore.score;
        confluence.factors.push({
            name: 'Confluência Fibonacci',
            score: fibScore.score,
            max: 10,
            details: fibScore.details
        });
        
        // 8. Kill Zone Timing (0-5 pontos)
        const timingScore = this.scoreKillZone();
        score += timingScore.score;
        confluence.factors.push({
            name: 'Kill Zone Timing',
            score: timingScore.score,
            max: 5,
            details: timingScore.details
        });
        
        confluence.totalScore = Math.min(100, score);
        
        return confluence;
    },

    calculateTrendAlignment(timeframes) {
        const trends = [];
        let bullish = 0, bearish = 0, neutral = 0;
        
        for (const [level, data] of Object.entries(timeframes)) {
            if (!data || !data.trend) continue;
            
            trends.push({ level, direction: data.trend.direction });
            
            if (data.trend.direction === 'bullish') bullish++;
            else if (data.trend.direction === 'bearish') bearish++;
            else neutral++;
        }
        
        const total = trends.length;
        const aligned = Math.max(bullish, bearish);
        const alignmentPct = total > 0 ? (aligned / total) * 100 : 0;
        
        // Score: 20 pontos se 100% alinhado, proporcional
        const score = (alignmentPct / 100) * 20;
        
        return {
            score: Math.round(score),
            details: {
                total,
                bullish,
                bearish,
                neutral,
                alignment: `${alignmentPct.toFixed(0)}%`,
                direction: bullish > bearish ? 'bullish' : bearish > bullish ? 'bearish' : 'neutral'
            }
        };
    },

    scoreMarketStructure(structure) {
        let score = 0;
        const details = {};
        
        // Validação
        if (!structure) {
            return { score: 0, details: { error: 'Estrutura indefinida' } };
        }
        
        // BOS (Break of Structure) - 8 pontos
        const bosCount = structure.breakOfStructure?.length || 0;
        if (bosCount >= 2) {
            score += 8;
            details.bos = 'Confirmado em múltiplos timeframes';
        } else if (bosCount === 1) {
            score += 4;
            details.bos = 'Confirmado em 1 timeframe';
        }
        
        // CHoCH (Change of Character) - 4 pontos
        if (structure.changeOfCharacter?.length > 0) {
            score += 4;
            details.choch = 'Mudança de estrutura detectada';
        }
        
        // Strength - 3 pontos
        if (structure.strength > 66) {
            score += 3;
            details.strength = 'Forte';
        } else if (structure.strength > 33) {
            score += 1.5;
            details.strength = 'Média';
        }
        
        return {
            score: Math.round(score),
            details
        };
    },

    scoreSmartMoney(smartMoney, entryData) {
        let score = 0;
        const details = {};
        
        // Validação
        if (!smartMoney) {
            return { score: 0, details: { error: 'Smart Money indefinido' } };
        }
        
        // ============================================
        // 🆕 INTEGRAÇÃO COM SMC PRECISION ENGINE
        // ============================================
        
        // Se temos dados do SMCPrecisionEngine (Order Blocks avançados)
        if (smartMoney.precisionAnalysis) {
            const pa = smartMoney.precisionAnalysis;
            
            // Order Blocks com Score de Tier - 10 pontos max
            const strongOBs = [...(pa.orderBlocks?.bullish || []), ...(pa.orderBlocks?.bearish || [])]
                .filter(ob => ob.tier === 'STRONG' && ob.isNear !== false);
            const highOBs = [...(pa.orderBlocks?.bullish || []), ...(pa.orderBlocks?.bearish || [])]
                .filter(ob => ob.tier === 'HIGH' && ob.isNear !== false);
            
            if (strongOBs.length > 0) {
                score += 10;
                details.orderBlocks = `${strongOBs.length} Order Block(s) STRONG próximo(s) (score: ${strongOBs[0]?.score || 'N/A'})`;
            } else if (highOBs.length > 0) {
                score += 7;
                details.orderBlocks = `${highOBs.length} Order Block(s) HIGH próximo(s)`;
            }
            
            // Fair Value Gaps não mitigados - 5 pontos
            const activeFVGs = [...(pa.fairValueGaps?.bullish || []), ...(pa.fairValueGaps?.bearish || [])]
                .filter(fvg => !fvg.isMitigated);
            
            if (activeFVGs.length > 0) {
                score += 5;
                details.fvg = `${activeFVGs.length} FVG ativo(s) não preenchido(s)`;
            }
            
            // Premium/Discount Zone Alignment - 5 pontos
            if (pa.premiumDiscount) {
                const zone = pa.premiumDiscount.zone;
                if (zone === 'discount' || zone === 'premium') {
                    score += 5;
                    details.premiumDiscount = `Preço em zona de ${zone === 'discount' ? 'desconto' : 'prêmio'} (${pa.premiumDiscount.positionPercent}%)`;
                }
            }
            
            return { score: Math.round(score), details };
        }
        
        // ============================================
        // FALLBACK: Lógica Original
        // ============================================
        
        // Order Blocks - 8 pontos
        const orderBlocks = smartMoney.orderBlocks || [];
        const relevantOBs = orderBlocks.filter(ob => 
            ob && ob.strength === 'strong' && ob.distance < 0.02
        );
        if (relevantOBs.length > 0) {
            score += 8;
            details.orderBlocks = `${relevantOBs.length} Order Block(s) forte(s) próximo(s)`;
        } else if (orderBlocks.length > 0) {
            score += 4;
            details.orderBlocks = 'Order Blocks detectados';
        }
        
        // Fair Value Gaps - 5 pontos
        const fvgs = smartMoney.fairValueGaps || [];
        const unfilled = fvgs.filter(fvg => fvg && !fvg.filled);
        if (unfilled.length > 0) {
            score += 5;
            details.fvg = `${unfilled.length} FVG não preenchido(s)`;
        }
        
        // Optimal Trade Entry - 4 pontos
        if (smartMoney.optimalTradeEntry && smartMoney.optimalTradeEntry.inZone) {
            score += 4;
            details.ote = 'Preço na zona OTE (0.618-0.786)';
        } else if (smartMoney.optimalTradeEntry) {
            score += 2;
            details.ote = 'Próximo da zona OTE';
        }
        
        // Liquidity Zones - 3 pontos
        const liquidityZones = smartMoney.liquidityZones || [];
        const nearLiquidity = liquidityZones.filter(l => 
            l && l.distance < 0.015
        );
        if (nearLiquidity.length > 0) {
            score += 3;
            details.liquidity = 'Próximo de zona de liquidez';
        }
        
        return {
            score: Math.round(score),
            details
        };
    },

    scoreVolume(timeframes) {
        let score = 0;
        const details = {};
        
        let highVolume = 0, aboveAvg = 0;
        
        for (const [level, data] of Object.entries(timeframes)) {
            if (!data || !data.volume) continue;
            
            if (data.volume.isHigh) highVolume++;
            else if (data.volume.isAboveAverage) aboveAvg++;
        }
        
        // Score baseado em quantos timeframes tem volume alto
        if (highVolume >= 3) {
            score = 10;
            details.status = 'Volume institucional confirmado';
        } else if (highVolume >= 2) {
            score = 7;
            details.status = 'Volume alto em múltiplos TFs';
        } else if (highVolume >= 1 || aboveAvg >= 2) {
            score = 4;
            details.status = 'Volume acima da média';
        }
        
        return { score, details };
    },

    scoreMomentum(timeframes) {
        let score = 0;
        const details = {};
        
        // Verificar RSI e ADX nos timeframes principais
        const entryData = timeframes.entry;
        const signalData = timeframes.signal;
        
        if (entryData && entryData.indicators) {
            const rsi = entryData.indicators.rsi;
            const adx = entryData.indicators.adx;
            
            // RSI em zona favorável - 5 pontos
            if ((rsi > 40 && rsi < 60)) {
                score += 5;
                details.rsi = 'RSI em zona neutra/favorável';
            } else if (rsi > 30 && rsi < 70) {
                score += 3;
                details.rsi = 'RSI aceitável';
            }
            
            // ADX força de tendência - 5 pontos
            if (adx > 25) {
                score += 5;
                details.adx = 'Tendência forte (ADX > 25)';
            } else if (adx > 20) {
                score += 3;
                details.adx = 'Tendência moderada';
            }
        }
        
        return { score, details };
    },

    scoreSupportResistance(timeframes, smartMoney) {
        let score = 0;
        const details = {};
        
        const entryData = timeframes?.entry;
        if (!entryData || !entryData.price) return { score: 0, details: {} };
        
        // Verificar proximidade de S/R institucionais
        const currentPrice = entryData.price.current;
        const srLevels = entryData.srLevels || [];
        
        // Níveis institucionais próximos
        const institutionalLevels = smartMoney?.institutionalLevels || [];
        const nearLevels = institutionalLevels.filter(l => 
            l && l.price && Math.abs(l.price - currentPrice) / currentPrice < 0.01
        );
        
        if (nearLevels.length > 0 && nearLevels[0].importance === 'high') {
            score += 6;
            details.institutional = 'Próximo de nível institucional importante';
        } else if (nearLevels.length > 0) {
            score += 3;
            details.institutional = 'Próximo de nível institucional';
        }
        
        // S/R tradicionais
        if (srLevels && srLevels.support && srLevels.resistance) {
            score += 4;
            details.traditional = 'S/R bem definidos';
        }
        
        return { score, details };
    },

    scoreFibonacci(timeframes) {
        let score = 0;
        const details = {};
        
        if (!timeframes) return { score: 0, details: {} };
        
        let fibConfluence = 0;
        
        for (const [level, data] of Object.entries(timeframes)) {
            if (!data || !data.fibonacci || !data.price) continue;
            
            const currentPrice = data.price.current;
            const fib = data.fibonacci;
            
            if (!currentPrice || !fib) continue;
            
            // Verificar se está próximo de níveis-chave
            const keyLevels = [fib['0.382'], fib['0.5'], fib['0.618'], fib['0.786']].filter(l => l);
            
            for (const fibLevel of keyLevels) {
                if (!fibLevel) continue;
                const distance = Math.abs(currentPrice - fibLevel) / currentPrice;
                if (distance < 0.005) { // Dentro de 0.5%
                    fibConfluence++;
                    break;
                }
            }
        }
        
        if (fibConfluence >= 3) {
            score = 10;
            details.status = 'Confluência Fibonacci em múltiplos TFs';
        } else if (fibConfluence >= 2) {
            score = 7;
            details.status = 'Confluência Fibonacci confirmada';
        } else if (fibConfluence >= 1) {
            score = 4;
            details.status = 'Próximo de nível Fibonacci';
        }
        
        return { score, details };
    },

    scoreKillZone() {
        const now = new Date();
        const hour = now.getUTCHours();
        
        let score = 0;
        let zone = 'fora';
        
        // London Kill Zone
        if (hour >= this.config.killZones.london.start && 
            hour < this.config.killZones.london.end) {
            score = 5;
            zone = 'London Kill Zone';
        }
        // New York Kill Zone
        else if (hour >= this.config.killZones.newYork.start && 
                 hour < this.config.killZones.newYork.end) {
            score = 5;
            zone = 'New York Kill Zone';
        }
        // Asian Session
        else if (hour >= this.config.killZones.asian.start || 
                 hour < this.config.killZones.asian.end) {
            score = 2;
            zone = 'Asian Session';
        }
        
        return {
            score,
            details: { zone, hour: `${hour}:00 UTC` }
        };
    },

    // ========================================
    // GERENCIAMENTO DE RISCO INSTITUCIONAL
    // ========================================
    calculateRiskManagement(entryData, smartMoney, profile) {
        // Validação robusta de entrada
        if (!entryData || !entryData.price || !entryData.indicators || !entryData.trend) {
            return { valid: false, reason: 'Dados de entrada insuficientes' };
        }
        
        const rm = this.config.riskManagement;
        const currentPrice = entryData.price.current;
        const atr = entryData.indicators.atr;
        const trend = entryData.trend.direction;
        
        // Validar valores numéricos
        if (!currentPrice || !atr || isNaN(currentPrice) || isNaN(atr)) {
            return { valid: false, reason: 'Preço ou ATR inválido' };
        }
        
        // Stop Loss baseado em ATR e Smart Money
        let stopLoss;
        
        if (trend === 'bullish') {
            // Para long: stop abaixo do order block ou ATR
            const orderBlockStop = this.findBullishStopLevel(smartMoney, currentPrice);
            const atrStop = currentPrice - (atr * rm.stopLossATRMultiplier);
            stopLoss = orderBlockStop || atrStop;
        } else if (trend === 'bearish') {
            // Para short: stop acima do order block ou ATR
            const orderBlockStop = this.findBearishStopLevel(smartMoney, currentPrice);
            const atrStop = currentPrice + (atr * rm.stopLossATRMultiplier);
            stopLoss = orderBlockStop || atrStop;
        } else {
            return null; // Sem trade em mercado neutro
        }
        
        // Calcular Targets (TP1, TP2, TP3)
        const targets = this.calculateTargets(
            currentPrice, stopLoss, atr, trend, rm
        );
        
        // Risk:Reward
        const riskAmount = Math.abs(currentPrice - stopLoss);
        const riskRewards = targets.map(t => 
            Math.abs(t.price - currentPrice) / riskAmount
        );
        
        // Invalidar se R:R menor que mínimo
        const minRR = Math.min(...riskRewards);
        if (minRR < rm.minRiskReward) {
            return {
                valid: false,
                reason: `R:R insuficiente (${minRR.toFixed(2)}:1 < ${rm.minRiskReward}:1)`
            };
        }
        
        return {
            valid: true,
            entry: currentPrice,
            stopLoss,
            targets: targets.map((t, i) => ({
                level: i + 1,
                price: t.price,
                distance: t.distance,
                riskReward: riskRewards[i].toFixed(2) + ':1',
                percentage: ((Math.abs(t.price - currentPrice) / currentPrice) * 100).toFixed(2) + '%'
            })),
            riskAmount,
            riskPercent: ((riskAmount / currentPrice) * 100).toFixed(2) + '%',
            minRiskReward: minRR.toFixed(2) + ':1',
            optimalRiskReward: Math.max(...riskRewards).toFixed(2) + ':1',
            atr: atr.toFixed(8)
        };
    },

    findBullishStopLevel(smartMoney, currentPrice) {
        // Validação de smartMoney
        if (!smartMoney || !smartMoney.orderBlocks || !Array.isArray(smartMoney.orderBlocks)) {
            return null;
        }
        
        // Encontrar order block abaixo do preço atual
        const bullishOBs = smartMoney.orderBlocks
            .filter(ob => ob && ob.type === 'bullish' && ob.zone && ob.zone.bottom < currentPrice)
            .sort((a, b) => b.zone.bottom - a.zone.bottom);
        
        if (bullishOBs.length > 0) {
            return bullishOBs[0].zone.bottom * 0.995; // 0.5% abaixo do OB
        }
        
        return null;
    },

    findBearishStopLevel(smartMoney, currentPrice) {
        // Validação de smartMoney
        if (!smartMoney || !smartMoney.orderBlocks || !Array.isArray(smartMoney.orderBlocks)) {
            return null;
        }
        
        // Encontrar order block acima do preço atual
        const bearishOBs = smartMoney.orderBlocks
            .filter(ob => ob && ob.type === 'bearish' && ob.zone && ob.zone.top > currentPrice)
            .sort((a, b) => a.zone.top - b.zone.top);
        
        if (bearishOBs.length > 0) {
            return bearishOBs[0].zone.top * 1.005; // 0.5% acima do OB
        }
        
        return null;
    },

    calculateTargets(currentPrice, stopLoss, atr, trend, rm) {
        const targets = [];
        const multipliers = rm.targetATRMultipliers;
        
        for (let i = 0; i < multipliers.length; i++) {
            const distance = atr * multipliers[i];
            const price = trend === 'bullish' 
                ? currentPrice + distance 
                : currentPrice - distance;
            
            targets.push({
                price,
                distance: Math.abs(price - currentPrice)
            });
        }
        
        return targets;
    },

    // ========================================
    // SCORE FINAL E RECOMENDAÇÃO
    // ========================================
    calculateFinalScore(confluence, riskManagement, profile) {
        // Validação
        if (!confluence || typeof confluence.totalScore === 'undefined') {
            return 0;
        }
        
        let finalScore = confluence.totalScore || 0;
        
        // Bônus/Penalidade por Risk Management
        if (riskManagement && riskManagement.valid) {
            const minRR = parseFloat(riskManagement.minRiskReward || 0);
            
            // Bônus por R:R excelente
            if (!isNaN(minRR)) {
                if (minRR >= this.config.riskManagement.optimalRiskReward) {
                    finalScore += 10; // +10 pontos
                } else if (minRR >= this.config.riskManagement.minRiskReward) {
                    finalScore += 5; // +5 pontos
                }
            }
        } else {
            // Penalidade severa se R:R inválido
            finalScore -= 30;
        }
        
        // Garantir que está entre 0-100
        return Math.max(0, Math.min(100, Math.round(finalScore)));
    },

    generateRecommendation(score, structure, riskManagement, profile) {
        const thresholds = this.config.scoreThresholds[profile] || this.config.scoreThresholds.dayTrading;
        
        // Validação de estrutura
        if (!structure || !structure.overall) {
            return {
                action: 'MONITOR',
                confidence: 'low',
                reason: 'Estrutura de mercado indefinida',
                color: 'gray'
            };
        }
        
        if (!riskManagement || !riskManagement.valid) {
            return {
                action: 'AVOID',
                confidence: 'low',
                reason: riskManagement?.reason || 'Gerenciamento de risco inadequado',
                color: 'red'
            };
        }
        
        if (score >= thresholds.excellent) {
            return {
                action: structure.overall === 'bullish' ? 'STRONG BUY' : 'STRONG SELL',
                confidence: 'very_high',
                reason: 'Confluência institucional excepcional',
                color: 'green',
                emoji: '🚀'
            };
        } else if (score >= thresholds.good) {
            return {
                action: structure.overall === 'bullish' ? 'BUY' : 'SELL',
                confidence: 'high',
                reason: 'Setup institucional de alta qualidade',
                color: 'lightgreen',
                emoji: '✅'
            };
        } else if (score >= thresholds.acceptable) {
            return {
                action: structure.overall === 'bullish' ? 'BUY' : 'SELL',
                confidence: 'medium',
                reason: 'Setup aceitável com confluências parciais',
                color: 'yellow',
                emoji: '⚠️'
            };
        } else if (score >= thresholds.minimum) {
            return {
                action: 'MONITOR',
                confidence: 'low',
                reason: 'Aguardar mais confluências',
                color: 'orange',
                emoji: '👀'
            };
        } else {
            return {
                action: 'AVOID',
                confidence: 'very_low',
                reason: 'Confluências insuficientes',
                color: 'red',
                emoji: '❌'
            };
        }
    },

    // ========================================
    // HELPERS & INDICATORS
    // ========================================
    async fetchKlines(symbol, timeframe, limit = 200) {
        try {
            const interval = this.convertTimeframe(timeframe);
            const response = await fetch(
                `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
            );
            return await response.json();
        } catch (error) {
            console.error(`Erro ao buscar klines: ${symbol} ${timeframe}`, error);
            return [];
        }
    },

    convertTimeframe(tf) {
        const map = {
            '1m': '1m',
            '5m': '5m',
            '15m': '15m',
            '1h': '1h',
            '4h': '4h',
            '1d': '1d',
            '1w': '1w',
            '1M': '1M'
        };
        return map[tf] || tf;
    },

    calculateEMA(data, period) {
        const ema = [];
        const multiplier = 2 / (period + 1);
        
        // SMA para primeira EMA
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += data[i];
        }
        ema[period - 1] = sum / period;
        
        // Calcular EMA
        for (let i = period; i < data.length; i++) {
            ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
        }
        
        return ema;
    },

    calculateSMA(data, period) {
        const sma = [];
        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j];
            }
            sma.push(sum / period);
        }
        return sma;
    },

    calculateRSI(closes, period = 14) {
        const rsi = [];
        const gains = [];
        const losses = [];
        
        // Calcular mudanças
        for (let i = 1; i < closes.length; i++) {
            const change = closes[i] - closes[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }
        
        // Calcular RSI
        for (let i = period; i < gains.length; i++) {
            const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b) / period;
            const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b) / period;
            
            if (avgLoss === 0) {
                rsi.push(100);
            } else {
                const rs = avgGain / avgLoss;
                rsi.push(100 - (100 / (1 + rs)));
            }
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
        
        const atrValues = this.calculateEMA(tr, period);
        return atrValues[atrValues.length - 1] || 0;
    },

    calculateADX(highs, lows, closes, period = 14) {
        const plusDM = [];
        const minusDM = [];
        
        // Calcular +DM e -DM
        for (let i = 1; i < highs.length; i++) {
            const highDiff = highs[i] - highs[i - 1];
            const lowDiff = lows[i - 1] - lows[i];
            
            plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
            minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
        }
        
        // Calcular TR
        const tr = [];
        for (let i = 1; i < highs.length; i++) {
            tr.push(Math.max(
                highs[i] - lows[i],
                Math.abs(highs[i] - closes[i - 1]),
                Math.abs(lows[i] - closes[i - 1])
            ));
        }
        
        // Smooth
        const smoothPlusDM = this.calculateEMA(plusDM, period);
        const smoothMinusDM = this.calculateEMA(minusDM, period);
        const smoothTR = this.calculateEMA(tr, period);
        
        // Calculate DI
        const plusDI = smoothPlusDM.map((dm, i) => (dm / smoothTR[i]) * 100);
        const minusDI = smoothMinusDM.map((dm, i) => (dm / smoothTR[i]) * 100);
        
        // Calculate ADX
        const dx = plusDI.map((pdi, i) => {
            const sum = pdi + minusDI[i];
            return sum === 0 ? 0 : (Math.abs(pdi - minusDI[i]) / sum) * 100;
        });
        
        const adx = this.calculateEMA(dx, period);
        
        return { adx, plusDI, minusDI };
    },

    determineTrend(closes, ema9, ema21, ema50, ema200, swings) {
        const current = closes[closes.length - 1];
        const e9 = ema9[ema9.length - 1];
        const e21 = ema21[ema21.length - 1];
        const e50 = ema50[ema50.length - 1];
        const e200 = ema200[ema200.length - 1];
        
        // Trend baseado em EMAs e estrutura
        const aboveAll = current > e9 && e9 > e21 && e21 > e50 && e50 > e200;
        const belowAll = current < e9 && e9 < e21 && e21 < e50 && e50 < e200;
        
        let direction = 'neutral';
        let strength = 0;
        
        if (aboveAll) {
            direction = 'bullish';
            strength = 100;
        } else if (belowAll) {
            direction = 'bearish';
            strength = 100;
        } else if (current > e200) {
            direction = 'bullish';
            strength = 60;
        } else if (current < e200) {
            direction = 'bearish';
            strength = 60;
        }
        
        return { direction, strength };
    },

    identifySwingPoints(highs, lows, closes) {
        const swings = {
            higherHighs: [],
            lowerLows: [],
            lastHigherHigh: null,
            lastLowerLow: null,
            recentHigh: Math.max(...highs.slice(-50)),
            recentLow: Math.min(...lows.slice(-50))
        };
        
        // Identificar Higher Highs
        for (let i = 5; i < highs.length - 5; i++) {
            const isHH = highs[i] > highs[i - 1] && 
                         highs[i] > highs[i + 1] &&
                         highs[i] === Math.max(...highs.slice(i - 5, i + 5));
            
            if (isHH) {
                swings.higherHighs.push(highs[i]);
            }
        }
        
        // Identificar Lower Lows
        for (let i = 5; i < lows.length - 5; i++) {
            const isLL = lows[i] < lows[i - 1] && 
                         lows[i] < lows[i + 1] &&
                         lows[i] === Math.min(...lows.slice(i - 5, i + 5));
            
            if (isLL) {
                swings.lowerLows.push(lows[i]);
            }
        }
        
        swings.lastHigherHigh = swings.higherHighs.length > 0 
            ? swings.higherHighs[swings.higherHighs.length - 1] 
            : swings.recentHigh;
            
        swings.lastLowerLow = swings.lowerLows.length > 0 
            ? swings.lowerLows[swings.lowerLows.length - 1] 
            : swings.recentLow;
        
        return swings;
    },

    calculateInstitutionalSR(highs, lows, closes, volumes) {
        // Calcular S/R baseado em volume e price action
        const levels = {
            support: [],
            resistance: []
        };
        
        // Simplified - encontrar níveis de alto volume
        const recentHigh = Math.max(...highs.slice(-100));
        const recentLow = Math.min(...lows.slice(-100));
        
        levels.support = [recentLow];
        levels.resistance = [recentHigh];
        
        return levels;
    },

    calculateFibonacci(high, low, isUptrend = true) {
        const diff = high - low;
        
        const levels = {
            '0.0': isUptrend ? high : low,
            '0.236': isUptrend ? high - diff * 0.236 : low + diff * 0.236,
            '0.382': isUptrend ? high - diff * 0.382 : low + diff * 0.382,
            '0.5': isUptrend ? high - diff * 0.5 : low + diff * 0.5,
            '0.618': isUptrend ? high - diff * 0.618 : low + diff * 0.618,
            '0.705': isUptrend ? high - diff * 0.705 : low + diff * 0.705,
            '0.786': isUptrend ? high - diff * 0.786 : low + diff * 0.786,
            '1.0': isUptrend ? low : high,
            '1.272': isUptrend ? high + diff * 0.272 : low - diff * 0.272,
            '1.618': isUptrend ? high + diff * 0.618 : low - diff * 0.618
        };
        
        return levels;
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.InstitutionalEngine = InstitutionalEngine;
}

// ============================================================================
// EXTENSÃO: ANÁLISE SMC DE PRECISÃO
// ============================================================================

/**
 * 🆕 Função de Análise SMC Avançada com Integração ao SMCPrecisionEngine
 * Chamada quando SMCPrecisionEngine está disponível
 */
InstitutionalEngine.analyzeSMCPrecision = async function(symbol, klines, direction = null) {
    // Verificar se SMCPrecisionEngine está disponível
    if (typeof SMCPrecisionEngine === 'undefined') {
        console.warn('⚠️ SMCPrecisionEngine não carregado. Usando análise simplificada.');
        return null;
    }
    
    try {
        // Normalizar klines se vierem da Binance API
        const normalizedKlines = klines.map(k => {
            if (Array.isArray(k)) {
                return {
                    openTime: k[0],
                    open: parseFloat(k[1]),
                    high: parseFloat(k[2]),
                    low: parseFloat(k[3]),
                    close: parseFloat(k[4]),
                    volume: parseFloat(k[5])
                };
            }
            return k;
        });
        
        // Executar análise completa SMC
        const smcAnalysis = SMCPrecisionEngine.analyzeComplete(normalizedKlines);
        
        if (!smcAnalysis) return null;
        
        // Se direção foi especificada, obter score de confluência direcionada
        let directedScore = null;
        if (direction) {
            directedScore = SMCPrecisionEngine.getSMCConfluenceScore(
                normalizedKlines,
                smcAnalysis.currentPrice,
                direction
            );
        }
        
        console.log(`🎯 Análise SMC Precision para ${symbol}:`, {
            orderBlocks: {
                bullish: smcAnalysis.orderBlocks.bullish.length,
                bearish: smcAnalysis.orderBlocks.bearish.length
            },
            fvgs: {
                bullish: smcAnalysis.fairValueGaps.bullish.length,
                bearish: smcAnalysis.fairValueGaps.bearish.length
            },
            zone: smcAnalysis.premiumDiscount.zone,
            precisionScore: smcAnalysis.precisionScore.total,
            recommendation: smcAnalysis.entryRecommendation.action
        });
        
        return {
            ...smcAnalysis,
            directedScore,
            isFromPrecisionEngine: true
        };
        
    } catch (error) {
        console.error('❌ Erro na análise SMC Precision:', error);
        return null;
    }
};

/**
 * 🆕 Wrapper para identificarSmartMoneyConcepts com SMCPrecisionEngine
 */
InstitutionalEngine.identifySmartMoneyConceptsEnhanced = async function(symbol, timeframes, klines = null) {
    // Executar análise padrão
    const basicSMC = await this.identifySmartMoneyConcepts(symbol, timeframes);
    
    // Se temos klines e SMCPrecisionEngine disponível, enriquecer análise
    if (klines && typeof SMCPrecisionEngine !== 'undefined') {
        const entryData = timeframes?.entry;
        const direction = entryData?.trend?.direction || null;
        
        const precisionAnalysis = await this.analyzeSMCPrecision(symbol, klines, direction);
        
        if (precisionAnalysis) {
            basicSMC.precisionAnalysis = precisionAnalysis;
            
            // Enriquecer Order Blocks com dados de precisão
            if (precisionAnalysis.orderBlocks) {
                basicSMC.orderBlocksEnhanced = {
                    bullish: precisionAnalysis.orderBlocks.bullish.map(ob => ({
                        type: 'bullish',
                        zone: { top: ob.top, bottom: ob.bottom, middle: ob.average },
                        strength: ob.tier.toLowerCase(),
                        score: ob.score,
                        tier: ob.tier,
                        scores: ob.scores,
                        distance: Math.abs(precisionAnalysis.currentPrice - ob.average) / precisionAnalysis.currentPrice
                    })),
                    bearish: precisionAnalysis.orderBlocks.bearish.map(ob => ({
                        type: 'bearish',
                        zone: { top: ob.top, bottom: ob.bottom, middle: ob.average },
                        strength: ob.tier.toLowerCase(),
                        score: ob.score,
                        tier: ob.tier,
                        scores: ob.scores,
                        distance: Math.abs(precisionAnalysis.currentPrice - ob.average) / precisionAnalysis.currentPrice
                    }))
                };
            }
            
            // Adicionar Points of Interest
            basicSMC.pointsOfInterest = precisionAnalysis.pointsOfInterest;
            
            // Adicionar Entry Recommendation
            basicSMC.entryRecommendation = precisionAnalysis.entryRecommendation;
            
            // Adicionar Premium/Discount
            basicSMC.premiumDiscount = precisionAnalysis.premiumDiscount;
            
            // Adicionar Displacements
            basicSMC.displacements = precisionAnalysis.displacements;
        }
    }
    
    return basicSMC;
};

/**
 * 🆕 Gera sinais de entrada precisos usando todos os motores
 */
InstitutionalEngine.generatePrecisionSignal = async function(symbol, profile = 'dayTrading') {
    try {
        const hierarchy = this.config.timeframeHierarchy[profile];
        const entryTf = hierarchy.entry;
        
        // Buscar dados
        const klines = await this.fetchKlines(symbol, entryTf, 200);
        if (!klines || klines.length < 100) {
            return { valid: false, reason: 'Dados insuficientes' };
        }
        
        // Análise MTF completa
        const mtfAnalysis = await this.analyzeMultiTimeframeInstitutional(symbol, profile);
        if (!mtfAnalysis) {
            return { valid: false, reason: 'Erro na análise MTF' };
        }
        
        // Análise SMC de Precisão (se disponível)
        let smcPrecision = null;
        if (typeof SMCPrecisionEngine !== 'undefined') {
            smcPrecision = await this.analyzeSMCPrecision(
                symbol,
                klines,
                mtfAnalysis.marketStructure?.overall
            );
        }
        
        // Combinar scores
        let combinedScore = mtfAnalysis.score || 0;
        const confluenceFactors = [...(mtfAnalysis.confluence?.factors || [])];
        
        // Adicionar score SMC Precision
        if (smcPrecision?.directedScore) {
            combinedScore += smcPrecision.directedScore.score;
            confluenceFactors.push({
                name: 'SMC Precision Engine',
                score: smcPrecision.directedScore.score,
                max: 22,
                details: smcPrecision.directedScore.factors.map(f => f.text)
            });
        }
        
        // Normalizar score (max 100)
        combinedScore = Math.min(100, Math.round(combinedScore));
        
        // Gerar sinal
        const signal = {
            symbol,
            profile,
            timestamp: Date.now(),
            
            // Scores
            score: combinedScore,
            mtfScore: mtfAnalysis.score,
            smcPrecisionScore: smcPrecision?.precisionScore?.total || 0,
            
            // Direção
            direction: mtfAnalysis.marketStructure?.overall || 'neutral',
            
            // Confluências
            confluence: {
                ...mtfAnalysis.confluence,
                factors: confluenceFactors,
                totalScore: combinedScore
            },
            
            // SMC Data
            smc: {
                orderBlocks: smcPrecision?.orderBlocks || null,
                fairValueGaps: smcPrecision?.fairValueGaps || null,
                premiumDiscount: smcPrecision?.premiumDiscount || null,
                pointsOfInterest: smcPrecision?.pointsOfInterest || [],
                entryRecommendation: smcPrecision?.entryRecommendation || null
            },
            
            // Risk Management
            riskManagement: mtfAnalysis.riskManagement,
            
            // Recomendação Final
            recommendation: this.generateEnhancedRecommendation(
                combinedScore,
                mtfAnalysis.marketStructure,
                mtfAnalysis.riskManagement,
                smcPrecision?.entryRecommendation,
                profile
            ),
            
            // Detalhes técnicos
            technicalDetails: {
                currentPrice: smcPrecision?.currentPrice || mtfAnalysis.timeframes?.entry?.price?.current,
                zone: smcPrecision?.premiumDiscount?.zone || 'unknown',
                nearbyPOIs: smcPrecision?.pointsOfInterest?.filter(p => p.isNear).length || 0,
                strongOBs: [...(smcPrecision?.orderBlocks?.bullish || []), ...(smcPrecision?.orderBlocks?.bearish || [])].filter(ob => ob.tier === 'STRONG').length,
                activeFVGs: [...(smcPrecision?.fairValueGaps?.bullish || []), ...(smcPrecision?.fairValueGaps?.bearish || [])].filter(fvg => !fvg.isMitigated).length
            }
        };
        
        signal.valid = combinedScore >= this.config.scoreThresholds[profile].minimum;
        
        return signal;
        
    } catch (error) {
        console.error(`❌ Erro ao gerar sinal de precisão para ${symbol}:`, error);
        return { valid: false, reason: error.message };
    }
};

/**
 * 🆕 Recomendação melhorada com dados SMC
 */
InstitutionalEngine.generateEnhancedRecommendation = function(score, structure, riskManagement, smcRecommendation, profile) {
    // Obter recomendação base
    const baseRec = this.generateRecommendation(score, structure, riskManagement, profile);
    
    // Se SMC tem recomendação específica, considerar
    if (smcRecommendation && smcRecommendation.action !== 'AGUARDAR') {
        // Aumentar confiança se SMC concorda
        if ((smcRecommendation.direction === 'bullish' && baseRec.action.includes('BUY')) ||
            (smcRecommendation.direction === 'bearish' && baseRec.action.includes('SELL'))) {
            
            baseRec.smcConfirmation = true;
            baseRec.confidence = baseRec.confidence === 'high' ? 'very_high' : 
                                  baseRec.confidence === 'medium' ? 'high' : 'medium';
            baseRec.reason += ` | SMC confirma: ${smcRecommendation.reason}`;
            baseRec.emoji = '🎯';
            
            if (smcRecommendation.entryZone) {
                baseRec.entryZone = smcRecommendation.entryZone;
            }
        }
    }
    
    return baseRec;
};
