/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    SHDWXBT — SMC PRECISION ENGINE v1.0                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Copyright (c) 2024-2026 SHDWXBT. All rights reserved.                        ║
 * ║                                                                               ║
 * ║  PROPRIETARY AND CONFIDENTIAL                                                 ║
 * ║  This file contains trade secrets and proprietary information.                ║
 * ║  Unauthorized copying, modification, distribution, or use is prohibited.      ║
 * ║  Protected by intellectual property laws and international treaties.          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 🎯 MOTOR DE PRECISÃO PARA ENTRADAS CIRÚRGICAS
 * 
 * Baseado em conceitos avançados de Smart Money:
 * ✅ Order Blocks com Score de Qualidade Institucional
 * ✅ Fair Value Gaps (FVG) com Mitigação Inteligente
 * ✅ Sistema Premium/Discount para Localização
 * ✅ Displacement Detection para Validação de Força
 * ✅ Breaker Blocks para Reversões
 * ✅ Optimal Trade Entry (OTE) Refinado
 * 
 * Integração com: TechnicalAnalysis + InstitutionalEngine
 */

const SMCPrecisionEngine = {
    // ========================================
    // CONFIGURAÇÃO SMC AVANÇADA
    // ========================================
    config: {
        // Order Block Settings
        orderBlock: {
            pivotLength: 5,           // Comprimento do pivot para detecção
            scanDepth: 30,            // Barras para buscar OB
            minATRLength: 0.3,        // Mínimo do range em ATR
            maxATRLength: 2.0,        // Máximo do range em ATR
            
            // Scoring Weights (soma = 100%)
            weights: {
                creation: 0.50,       // Peso do score de criação
                followThrough: 0.35,  // Peso do follow-through
                location: 0.15        // Peso da localização
            },
            
            // Tier Thresholds
            tiers: {
                strong: 70,           // Score >= 70 = STRONG
                high: 55,             // Score >= 55 = HIGH
                balanced: 0           // Score < 55 = BALANCED
            },
            
            // Mitigation Settings
            mitigation: {
                trigger: 'close',     // 'close', 'wick', 'avg'
                mode: 'soft'          // 'off', 'soft', 'hard'
            }
        },
        
        // Fair Value Gap Settings
        fvg: {
            minThresholdATR: 0.0,     // Mínimo do gap em ATR (0 = qualquer)
            mitigation: 'close',       // 'close', 'wick', 'avg'
            hideOverlap: true,         // Esconder FVGs sobrepostos
            showMidLine: true          // Mostrar linha do meio
        },
        
        // Premium/Discount Settings
        premiumDiscount: {
            lookback: 50,             // Barras para calcular range
            equilibrium: 0.5,         // 50% do range = equilíbrio
            premiumThreshold: 0.65,   // > 65% = premium
            discountThreshold: 0.35   // < 35% = discount
        },
        
        // Displacement Settings
        displacement: {
            minATRMultiplier: 1.5,    // Movimento mínimo em ATR
            volumeMultiplier: 1.5,    // Volume mínimo vs média
            barsForDisplacement: 3    // Barras para confirmar
        }
    },

    // ========================================
    // DETECÇÃO DE ORDER BLOCKS AVANÇADA
    // ========================================
    
    /**
     * Detecta Order Blocks com score de qualidade institucional
     * @param {Array} klines - Dados OHLCV
     * @param {Object} options - Configurações opcionais
     * @returns {Object} Bullish e Bearish Order Blocks com scores
     */
    detectOrderBlocks(klines, options = {}) {
        if (!klines || klines.length < 60) {
            return { bullish: [], bearish: [] };
        }
        
        const cfg = { ...this.config.orderBlock, ...options };
        const pivotLen = cfg.pivotLength;
        const scanDepth = cfg.scanDepth;
        
        const result = {
            bullish: [],
            bearish: []
        };
        
        // Calcular ATR para referência
        const atr = this.calculateATR(klines, 200);
        const volumeMA = this.calculateSMA(klines.map(k => k.volume || 0), 20);
        
        // Calcular contexto (high/low do lookback)
        const ctxLookback = this.config.premiumDiscount.lookback;
        const ctxHigh = Math.max(...klines.slice(-ctxLookback).map(k => k.high));
        const ctxLow = Math.min(...klines.slice(-ctxLookback).map(k => k.low));
        
        // Detectar pivots
        const pivots = this.detectPivots(klines, pivotLen);
        
        // Para cada pivot low (potencial bullish OB)
        for (const pivotLow of pivots.lows) {
            const ob = this.buildOrderBlock(klines, pivotLow.index, true, {
                atr,
                volumeMA,
                ctxHigh,
                ctxLow,
                scanDepth,
                cfg
            });
            
            if (ob && ob.score >= cfg.tiers.balanced) {
                result.bullish.push(ob);
            }
        }
        
        // Para cada pivot high (potencial bearish OB)
        for (const pivotHigh of pivots.highs) {
            const ob = this.buildOrderBlock(klines, pivotHigh.index, false, {
                atr,
                volumeMA,
                ctxHigh,
                ctxLow,
                scanDepth,
                cfg
            });
            
            if (ob && ob.score >= cfg.tiers.balanced) {
                result.bearish.push(ob);
            }
        }
        
        // Ordenar por score (maior primeiro)
        result.bullish.sort((a, b) => b.score - a.score);
        result.bearish.sort((a, b) => b.score - a.score);
        
        // Limitar quantidade
        result.bullish = result.bullish.slice(0, 5);
        result.bearish = result.bearish.slice(0, 5);
        
        return result;
    },
    
    /**
     * Constrói um Order Block com score completo
     */
    buildOrderBlock(klines, pivotIndex, isBullish, context) {
        const { atr, volumeMA, ctxHigh, ctxLow, scanDepth, cfg } = context;
        
        // Encontrar a vela oposta com maior volume (candle institucional)
        const candleIndex = this.findInstitutionalCandle(
            klines, 
            pivotIndex, 
            isBullish, 
            scanDepth
        );
        
        if (candleIndex === null) return null;
        
        const candle = klines[candleIndex];
        const currentATR = atr[candleIndex] || atr[atr.length - 1];
        const currentVolMA = volumeMA[candleIndex] || volumeMA[volumeMA.length - 1];
        
        // Calcular limites do OB
        let top, bottom;
        const high = candle.high;
        const low = candle.low;
        const range = high - low;
        
        // Verificar tamanho válido
        if (currentATR > 0 && (range < currentATR * cfg.minATRLength || range > currentATR * cfg.maxATRLength)) {
            return null;
        }
        
        // Construção: usar comprimento baseado em ATR ou full
        const span = currentATR * (cfg.minATRLength + cfg.maxATRLength) / 2;
        
        if (isBullish) {
            bottom = low;
            top = Math.min(high, low + span);
        } else {
            top = high;
            bottom = Math.max(low, high - span);
        }
        
        const avg = (top + bottom) / 2;
        
        // ========================================
        // SCORE DE CRIAÇÃO (45% - Volume, Body, Range)
        // ========================================
        const volume = candle.volume || 0;
        const volRatio = currentVolMA > 0 ? volume / currentVolMA : 1;
        const volLog = Math.log(volRatio + 1e-6) / Math.log(2);
        const volNorm = this.clamp(volLog, 0, 2) / 2;
        const volScore = volNorm * 100;
        
        const body = Math.abs(candle.close - candle.open);
        const bodyRatio = range > 0 ? body / range : 0;
        const bodyScore = this.clamp(bodyRatio, 0, 1) * 100;
        
        const rangeATR = currentATR > 0 ? range / currentATR : 1;
        const rangeScore = this.clamp(rangeATR, 0.5, 2.5) / 2.5 * 100;
        
        const creationScore = (volScore * 0.45 + bodyScore * 0.35 + rangeScore * 0.20);
        
        // ========================================
        // SCORE DE FOLLOW-THROUGH (35%)
        // ========================================
        let followScore = 50; // Default
        const followBars = Math.min(5, klines.length - candleIndex - 1);
        
        if (followBars > 0) {
            let extremePoint = isBullish ? candle.close : candle.close;
            
            for (let i = 1; i <= followBars; i++) {
                const nextCandle = klines[candleIndex + i];
                if (!nextCandle) continue;
                
                if (isBullish) {
                    extremePoint = Math.max(extremePoint, nextCandle.high);
                } else {
                    extremePoint = Math.min(extremePoint, nextCandle.low);
                }
            }
            
            // Saturação do movimento
            const movement = isBullish 
                ? extremePoint - candle.close 
                : candle.close - extremePoint;
            
            const saturation = currentATR > 0 ? movement / (currentATR * 2) : 0;
            followScore = this.clamp(saturation * 100, 0, 100);
        }
        
        // ========================================
        // SCORE DE LOCALIZAÇÃO (20%)
        // ========================================
        const ctxRange = ctxHigh - ctxLow;
        let locationScore = 50;
        
        if (ctxRange > 0) {
            const position = (avg - ctxLow) / ctxRange;
            
            if (isBullish) {
                // Bullish OB é melhor na zona de desconto (< 0.5)
                const distance = Math.max(0, 0.5 - position);
                locationScore = (1 - this.clamp(distance * 2, 0, 1)) * 100;
            } else {
                // Bearish OB é melhor na zona de premium (> 0.5)
                const distance = Math.max(0, position - 0.5);
                locationScore = (1 - this.clamp(distance * 2, 0, 1)) * 100;
            }
        }
        
        // ========================================
        // SCORE TOTAL
        // ========================================
        const wC = cfg.weights.creation;
        const wF = cfg.weights.followThrough;
        const wL = cfg.weights.location;
        
        const totalScore = Math.round(
            creationScore * wC + 
            followScore * wF + 
            locationScore * wL
        );
        
        // Determinar tier
        let tier = 'BALANCED';
        if (totalScore >= cfg.tiers.strong) tier = 'STRONG';
        else if (totalScore >= cfg.tiers.high) tier = 'HIGH';
        
        return {
            type: isBullish ? 'bullish' : 'bearish',
            top: this.round(top, 8),
            bottom: this.round(bottom, 8),
            average: this.round(avg, 8),
            index: candleIndex,
            timestamp: candle.openTime || candleIndex,
            volume: volume,
            scores: {
                creation: Math.round(creationScore),
                followThrough: Math.round(followScore),
                location: Math.round(locationScore),
                total: totalScore
            },
            score: totalScore,
            tier,
            isMitigated: false,
            isBreaker: false
        };
    },
    
    /**
     * Encontra a vela institucional (candle oposta com maior volume)
     */
    findInstitutionalCandle(klines, pivotIndex, isBullish, scanDepth) {
        const maxIndex = Math.min(pivotIndex + scanDepth, klines.length);
        let bestIndex = null;
        let bestVolume = -Infinity;
        
        for (let i = pivotIndex; i < maxIndex; i++) {
            const candle = klines[i];
            if (!candle) continue;
            
            // Bullish OB: procura vela bearish (close < open)
            // Bearish OB: procura vela bullish (close > open)
            const isBearishCandle = candle.close < candle.open;
            const isBullishCandle = candle.close > candle.open;
            
            const matchesCondition = isBullish ? isBearishCandle : isBullishCandle;
            
            if (matchesCondition && candle.volume > bestVolume) {
                bestVolume = candle.volume;
                bestIndex = i;
            }
        }
        
        return bestIndex;
    },

    // ========================================
    // DETECÇÃO DE FAIR VALUE GAPS
    // ========================================
    
    /**
     * Detecta Fair Value Gaps
     */
    detectFairValueGaps(klines, options = {}) {
        if (!klines || klines.length < 3) {
            return { bullish: [], bearish: [] };
        }
        
        const cfg = { ...this.config.fvg, ...options };
        const atr = this.calculateATR(klines, 200);
        
        const result = {
            bullish: [],
            bearish: []
        };
        
        // Percorrer klines (começando da terceira vela)
        for (let i = 2; i < klines.length; i++) {
            const candle0 = klines[i - 2];  // 2 barras atrás
            const candle1 = klines[i - 1];  // 1 barra atrás
            const candle2 = klines[i];       // atual
            
            const currentATR = atr[i] || atr[atr.length - 1];
            const minGap = currentATR * cfg.minThresholdATR;
            
            // Bullish FVG: low atual > high de 2 barras atrás
            const gapUp = candle2.low - candle0.high;
            if (gapUp > minGap) {
                result.bullish.push({
                    type: 'bullish',
                    top: candle2.low,
                    bottom: candle0.high,
                    midLine: (candle2.low + candle0.high) / 2,
                    size: gapUp,
                    sizeATR: currentATR > 0 ? gapUp / currentATR : 0,
                    index: i - 1,
                    timestamp: candle1.openTime || (i - 1),
                    isMitigated: false,
                    isBreaker: false
                });
            }
            
            // Bearish FVG: high atual < low de 2 barras atrás
            const gapDown = candle0.low - candle2.high;
            if (gapDown > minGap) {
                result.bearish.push({
                    type: 'bearish',
                    top: candle0.low,
                    bottom: candle2.high,
                    midLine: (candle0.low + candle2.high) / 2,
                    size: gapDown,
                    sizeATR: currentATR > 0 ? gapDown / currentATR : 0,
                    index: i - 1,
                    timestamp: candle1.openTime || (i - 1),
                    isMitigated: false,
                    isBreaker: false
                });
            }
        }
        
        // Limitar quantidade e ordenar por mais recente
        result.bullish = result.bullish.slice(-5).reverse();
        result.bearish = result.bearish.slice(-5).reverse();
        
        return result;
    },
    
    /**
     * Verifica se um FVG foi mitigado
     */
    checkFVGMitigation(fvg, currentCandle, mode = 'close') {
        if (!fvg || !currentCandle) return false;
        
        const isBullish = fvg.type === 'bullish';
        
        if (mode === 'close') {
            if (isBullish) {
                return Math.min(currentCandle.open, currentCandle.close) < fvg.bottom;
            } else {
                return Math.max(currentCandle.open, currentCandle.close) > fvg.top;
            }
        } else if (mode === 'wick') {
            if (isBullish) {
                return currentCandle.low < fvg.bottom;
            } else {
                return currentCandle.high > fvg.top;
            }
        } else { // avg
            if (isBullish) {
                return currentCandle.low < fvg.midLine;
            } else {
                return currentCandle.high > fvg.midLine;
            }
        }
    },

    // ========================================
    // ANÁLISE PREMIUM/DISCOUNT
    // ========================================
    
    /**
     * Calcula posição no range Premium/Discount
     */
    calculatePremiumDiscount(klines, options = {}) {
        if (!klines || klines.length < 10) {
            return {
                zone: 'neutral',
                position: 0.5,
                equilibrium: 0,
                rangeHigh: 0,
                rangeLow: 0
            };
        }
        
        const cfg = { ...this.config.premiumDiscount, ...options };
        const lookback = Math.min(cfg.lookback, klines.length);
        
        const recentKlines = klines.slice(-lookback);
        const rangeHigh = Math.max(...recentKlines.map(k => k.high));
        const rangeLow = Math.min(...recentKlines.map(k => k.low));
        const range = rangeHigh - rangeLow;
        
        const currentPrice = klines[klines.length - 1].close;
        const equilibrium = rangeLow + (range * cfg.equilibrium);
        
        const position = range > 0 ? (currentPrice - rangeLow) / range : 0.5;
        
        let zone = 'equilibrium';
        if (position >= cfg.premiumThreshold) zone = 'premium';
        else if (position <= cfg.discountThreshold) zone = 'discount';
        
        return {
            zone,
            position: this.round(position, 4),
            positionPercent: this.round(position * 100, 2),
            equilibrium: this.round(equilibrium, 8),
            rangeHigh: this.round(rangeHigh, 8),
            rangeLow: this.round(rangeLow, 8),
            currentPrice: this.round(currentPrice, 8),
            
            // Zonas específicas
            premiumZone: {
                top: rangeHigh,
                bottom: rangeLow + range * cfg.premiumThreshold
            },
            discountZone: {
                top: rangeLow + range * cfg.discountThreshold,
                bottom: rangeLow
            }
        };
    },

    // ========================================
    // DETECÇÃO DE DISPLACEMENT
    // ========================================
    
    /**
     * Detecta movimentos de displacement (força institucional)
     */
    detectDisplacement(klines, options = {}) {
        if (!klines || klines.length < 10) {
            return { bullish: [], bearish: [] };
        }
        
        const cfg = { ...this.config.displacement, ...options };
        const atr = this.calculateATR(klines, 14);
        const volumeMA = this.calculateSMA(klines.map(k => k.volume || 0), 20);
        
        const result = {
            bullish: [],
            bearish: []
        };
        
        for (let i = cfg.barsForDisplacement; i < klines.length; i++) {
            const currentATR = atr[i] || atr[atr.length - 1];
            const currentVolMA = volumeMA[i] || volumeMA[volumeMA.length - 1];
            
            // Calcular movimento nos últimos N barras
            let high = -Infinity;
            let low = Infinity;
            let totalVolume = 0;
            
            for (let j = i - cfg.barsForDisplacement; j <= i; j++) {
                const candle = klines[j];
                high = Math.max(high, candle.high);
                low = Math.min(low, candle.low);
                totalVolume += candle.volume || 0;
            }
            
            const movement = high - low;
            const avgVolume = totalVolume / (cfg.barsForDisplacement + 1);
            
            // Verificar se é um displacement válido
            const isLargeMove = movement >= currentATR * cfg.minATRMultiplier;
            const isHighVolume = currentVolMA > 0 && avgVolume >= currentVolMA * cfg.volumeMultiplier;
            
            if (isLargeMove && isHighVolume) {
                const startCandle = klines[i - cfg.barsForDisplacement];
                const endCandle = klines[i];
                
                const isBullish = endCandle.close > startCandle.open;
                
                const displacement = {
                    type: isBullish ? 'bullish' : 'bearish',
                    startIndex: i - cfg.barsForDisplacement,
                    endIndex: i,
                    movement: this.round(movement, 8),
                    movementATR: this.round(movement / currentATR, 2),
                    volumeRatio: this.round(avgVolume / currentVolMA, 2),
                    high: this.round(high, 8),
                    low: this.round(low, 8),
                    strength: this.calculateDisplacementStrength(movement, currentATR, avgVolume, currentVolMA)
                };
                
                if (isBullish) {
                    result.bullish.push(displacement);
                } else {
                    result.bearish.push(displacement);
                }
            }
        }
        
        // Manter apenas os mais recentes
        result.bullish = result.bullish.slice(-3);
        result.bearish = result.bearish.slice(-3);
        
        return result;
    },
    
    calculateDisplacementStrength(movement, atr, avgVolume, volMA) {
        let strength = 0;
        
        // Movimento em relação ao ATR (0-50)
        const atrRatio = atr > 0 ? movement / atr : 0;
        strength += Math.min(50, atrRatio * 20);
        
        // Volume em relação à média (0-50)
        const volRatio = volMA > 0 ? avgVolume / volMA : 1;
        strength += Math.min(50, volRatio * 25);
        
        return Math.round(this.clamp(strength, 0, 100));
    },

    // ========================================
    // ANÁLISE COMPLETA SMC
    // ========================================
    
    /**
     * Análise completa SMC para um ativo
     */
    analyzeComplete(klines, currentPrice = null) {
        if (!klines || klines.length < 60) {
            return null;
        }
        
        const price = currentPrice || klines[klines.length - 1].close;
        
        // 1. Detectar Order Blocks
        const orderBlocks = this.detectOrderBlocks(klines);
        
        // 2. Detectar Fair Value Gaps
        const fvgs = this.detectFairValueGaps(klines);
        
        // 3. Análise Premium/Discount
        const premiumDiscount = this.calculatePremiumDiscount(klines);
        
        // 4. Detectar Displacements
        const displacements = this.detectDisplacement(klines);
        
        // 5. Encontrar POI (Points of Interest) mais relevantes
        const pointsOfInterest = this.findPointsOfInterest(
            orderBlocks,
            fvgs,
            premiumDiscount,
            price
        );
        
        // 6. Calcular Score de Precisão
        const precisionScore = this.calculatePrecisionScore(
            orderBlocks,
            fvgs,
            premiumDiscount,
            displacements,
            price
        );
        
        // 7. Gerar recomendação de entrada
        const entryRecommendation = this.generateEntryRecommendation(
            pointsOfInterest,
            precisionScore,
            premiumDiscount
        );
        
        return {
            timestamp: Date.now(),
            currentPrice: this.round(price, 8),
            
            orderBlocks,
            fairValueGaps: fvgs,
            premiumDiscount,
            displacements,
            
            pointsOfInterest,
            precisionScore,
            entryRecommendation,
            
            // Resumo
            summary: {
                bullishOBs: orderBlocks.bullish.length,
                bearishOBs: orderBlocks.bearish.length,
                bullishFVGs: fvgs.bullish.length,
                bearishFVGs: fvgs.bearish.length,
                zone: premiumDiscount.zone,
                positionInRange: `${premiumDiscount.positionPercent}%`,
                precisionScore: precisionScore.total,
                recommendation: entryRecommendation.action
            }
        };
    },
    
    /**
     * Encontra os pontos de interesse mais relevantes
     */
    findPointsOfInterest(orderBlocks, fvgs, premiumDiscount, currentPrice) {
        const pois = [];
        
        // Adicionar Order Blocks como POI
        for (const ob of [...orderBlocks.bullish, ...orderBlocks.bearish]) {
            const distance = Math.abs(currentPrice - ob.average) / currentPrice * 100;
            
            pois.push({
                type: 'orderBlock',
                subType: ob.type,
                tier: ob.tier,
                level: ob.average,
                zone: { top: ob.top, bottom: ob.bottom },
                score: ob.score,
                distance: this.round(distance, 2),
                isNear: distance <= 2.0
            });
        }
        
        // Adicionar FVGs como POI
        for (const fvg of [...fvgs.bullish, ...fvgs.bearish]) {
            const distance = Math.abs(currentPrice - fvg.midLine) / currentPrice * 100;
            
            pois.push({
                type: 'fvg',
                subType: fvg.type,
                level: fvg.midLine,
                zone: { top: fvg.top, bottom: fvg.bottom },
                score: Math.round(fvg.sizeATR * 30 + 50), // Score baseado no tamanho
                distance: this.round(distance, 2),
                isNear: distance <= 1.5
            });
        }
        
        // Adicionar níveis de equilíbrio
        pois.push({
            type: 'equilibrium',
            level: premiumDiscount.equilibrium,
            zone: null,
            score: 40,
            distance: this.round(Math.abs(currentPrice - premiumDiscount.equilibrium) / currentPrice * 100, 2),
            isNear: Math.abs(currentPrice - premiumDiscount.equilibrium) / currentPrice < 0.015
        });
        
        // Ordenar por proximidade
        pois.sort((a, b) => a.distance - b.distance);
        
        return pois.slice(0, 10);
    },
    
    /**
     * Calcula score de precisão para entrada
     */
    calculatePrecisionScore(orderBlocks, fvgs, premiumDiscount, displacements, currentPrice) {
        let score = 50; // Base
        const factors = [];
        
        // 1. Proximidade de Order Block (+0-20)
        const nearbyOBs = [...orderBlocks.bullish, ...orderBlocks.bearish]
            .filter(ob => {
                const dist = Math.abs(currentPrice - ob.average) / currentPrice;
                return dist <= 0.02; // 2%
            });
        
        if (nearbyOBs.length > 0) {
            const bestOB = nearbyOBs.reduce((a, b) => a.score > b.score ? a : b);
            const obBonus = bestOB.tier === 'STRONG' ? 20 : bestOB.tier === 'HIGH' ? 15 : 10;
            score += obBonus;
            factors.push({
                name: 'Order Block próximo',
                value: `+${obBonus}`,
                detail: `${bestOB.type} ${bestOB.tier} (score: ${bestOB.score})`
            });
        }
        
        // 2. Proximidade de FVG (+0-15)
        const nearbyFVGs = [...fvgs.bullish, ...fvgs.bearish]
            .filter(fvg => {
                const dist = Math.abs(currentPrice - fvg.midLine) / currentPrice;
                return dist <= 0.015; // 1.5%
            });
        
        if (nearbyFVGs.length > 0) {
            score += 12;
            factors.push({
                name: 'Fair Value Gap próximo',
                value: '+12',
                detail: `${nearbyFVGs.length} FVG(s) na zona`
            });
        }
        
        // 3. Zona Premium/Discount (+0-10)
        if (premiumDiscount.zone === 'discount') {
            score += 10;
            factors.push({
                name: 'Zona de Desconto',
                value: '+10',
                detail: `Posição: ${premiumDiscount.positionPercent}%`
            });
        } else if (premiumDiscount.zone === 'premium') {
            score += 10;
            factors.push({
                name: 'Zona de Premium',
                value: '+10',
                detail: `Posição: ${premiumDiscount.positionPercent}%`
            });
        }
        
        // 4. Displacement recente (+0-15)
        const recentDisplacements = [...displacements.bullish, ...displacements.bearish]
            .filter(d => d.strength >= 60);
        
        if (recentDisplacements.length > 0) {
            const best = recentDisplacements.reduce((a, b) => a.strength > b.strength ? a : b);
            score += Math.min(15, best.strength / 6);
            factors.push({
                name: 'Displacement detectado',
                value: `+${Math.round(best.strength / 6)}`,
                detail: `${best.type} (força: ${best.strength})`
            });
        }
        
        // Limitar score
        score = this.clamp(Math.round(score), 0, 100);
        
        // Determinar tier
        let tier = 'BAIXO';
        if (score >= 80) tier = 'EXCELENTE';
        else if (score >= 70) tier = 'ALTO';
        else if (score >= 60) tier = 'MÉDIO';
        
        return {
            total: score,
            tier,
            factors
        };
    },
    
    /**
     * Gera recomendação de entrada
     */
    generateEntryRecommendation(pointsOfInterest, precisionScore, premiumDiscount) {
        const nearPOIs = pointsOfInterest.filter(poi => poi.isNear);
        
        // Determinar ação
        let action = 'AGUARDAR';
        let direction = null;
        let confidence = 'baixa';
        let reason = 'Sem confluência suficiente para entrada';
        let entryZone = null;
        
        if (precisionScore.total >= 70 && nearPOIs.length >= 2) {
            // Alta confiança
            const bullishPOIs = nearPOIs.filter(p => p.subType === 'bullish').length;
            const bearishPOIs = nearPOIs.filter(p => p.subType === 'bearish').length;
            
            if (bullishPOIs > bearishPOIs && premiumDiscount.zone !== 'premium') {
                action = 'COMPRA';
                direction = 'bullish';
                confidence = 'alta';
                reason = `${nearPOIs.length} POIs bullish confluentes em zona favorável`;
            } else if (bearishPOIs > bullishPOIs && premiumDiscount.zone !== 'discount') {
                action = 'VENDA';
                direction = 'bearish';
                confidence = 'alta';
                reason = `${nearPOIs.length} POIs bearish confluentes em zona favorável`;
            }
            
            // Definir zona de entrada
            if (action !== 'AGUARDAR') {
                const relevantPOIs = nearPOIs.filter(p => p.subType === direction);
                if (relevantPOIs.length > 0 && relevantPOIs[0].zone) {
                    entryZone = relevantPOIs[0].zone;
                }
            }
            
        } else if (precisionScore.total >= 60 && nearPOIs.length >= 1) {
            action = 'OBSERVAR';
            confidence = 'média';
            reason = 'Confluência parcial - aguardar confirmação';
        }
        
        return {
            action,
            direction,
            confidence,
            reason,
            entryZone,
            precisionScore: precisionScore.total,
            nearbyPOIs: nearPOIs.length,
            zoneContext: premiumDiscount.zone
        };
    },

    // ========================================
    // INTEGRAÇÃO COM CONFLUENCE ENGINE
    // ========================================
    
    /**
     * Retorna score SMC para integração com sistema de confluência
     */
    getSMCConfluenceScore(klines, currentPrice, direction = 'bullish') {
        const analysis = this.analyzeComplete(klines, currentPrice);
        if (!analysis) return { score: 0, factors: [] };
        
        let score = 0;
        const factors = [];
        
        // Order Blocks alinhados com direção (+0-8)
        const alignedOBs = direction === 'bullish' 
            ? analysis.orderBlocks.bullish 
            : analysis.orderBlocks.bearish;
        
        const nearAlignedOBs = alignedOBs.filter(ob => {
            const dist = Math.abs(currentPrice - ob.average) / currentPrice;
            return dist <= 0.02;
        });
        
        if (nearAlignedOBs.length > 0) {
            const bestOB = nearAlignedOBs[0];
            const obScore = bestOB.tier === 'STRONG' ? 8 : bestOB.tier === 'HIGH' ? 6 : 4;
            score += obScore;
            factors.push({
                type: 'positive',
                text: `Order Block ${bestOB.tier} próximo ao preço (score: ${bestOB.score})`
            });
        }
        
        // FVGs alinhados com direção (+0-5)
        const alignedFVGs = direction === 'bullish'
            ? analysis.fairValueGaps.bullish
            : analysis.fairValueGaps.bearish;
        
        const nearAlignedFVGs = alignedFVGs.filter(fvg => {
            const dist = Math.abs(currentPrice - fvg.midLine) / currentPrice;
            return dist <= 0.015;
        });
        
        if (nearAlignedFVGs.length > 0) {
            score += 5;
            factors.push({
                type: 'positive',
                text: `Fair Value Gap ${direction} próximo ao preço`
            });
        }
        
        // Premium/Discount alignment (+0-5)
        const inFavorableZone = (direction === 'bullish' && analysis.premiumDiscount.zone === 'discount') ||
                                (direction === 'bearish' && analysis.premiumDiscount.zone === 'premium');
        
        if (inFavorableZone) {
            score += 5;
            factors.push({
                type: 'positive',
                text: `Preço em zona favorável (${analysis.premiumDiscount.zone})`
            });
        }
        
        // Displacement confirmation (+0-4)
        const alignedDisp = direction === 'bullish'
            ? analysis.displacements.bullish
            : analysis.displacements.bearish;
        
        if (alignedDisp.length > 0 && alignedDisp[alignedDisp.length - 1].strength >= 60) {
            score += 4;
            factors.push({
                type: 'positive',
                text: `Displacement ${direction} recente detectado`
            });
        }
        
        return {
            score: Math.min(22, score), // Max 22 pontos do SMC
            factors,
            analysis: analysis.summary
        };
    },

    // ========================================
    // UTILITIES
    // ========================================
    
    detectPivots(klines, length = 5) {
        const pivots = { highs: [], lows: [] };
        
        for (let i = length; i < klines.length - length; i++) {
            // Check for pivot high
            let isPivotHigh = true;
            let isPivotLow = true;
            
            const currentHigh = klines[i].high;
            const currentLow = klines[i].low;
            
            for (let j = 1; j <= length; j++) {
                if (klines[i - j].high >= currentHigh || klines[i + j].high >= currentHigh) {
                    isPivotHigh = false;
                }
                if (klines[i - j].low <= currentLow || klines[i + j].low <= currentLow) {
                    isPivotLow = false;
                }
            }
            
            if (isPivotHigh) {
                pivots.highs.push({ index: i, price: currentHigh });
            }
            if (isPivotLow) {
                pivots.lows.push({ index: i, price: currentLow });
            }
        }
        
        // Manter apenas os mais recentes
        pivots.highs = pivots.highs.slice(-10);
        pivots.lows = pivots.lows.slice(-10);
        
        return pivots;
    },
    
    calculateATR(klines, period = 14) {
        const trs = [];
        const result = [];
        
        for (let i = 1; i < klines.length; i++) {
            const high = klines[i].high;
            const low = klines[i].low;
            const prevClose = klines[i - 1].close;
            
            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            trs.push(tr);
        }
        
        // EMA do TR
        if (trs.length < period) return trs;
        
        const k = 2 / (period + 1);
        let ema = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
        result.push(ema);
        
        for (let i = period; i < trs.length; i++) {
            ema = (trs[i] - ema) * k + ema;
            result.push(ema);
        }
        
        return result;
    },
    
    calculateSMA(data, period) {
        const result = [];
        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j];
            }
            result.push(sum / period);
        }
        return result;
    },
    
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    
    round(value, decimals = 2) {
        const p = Math.pow(10, decimals);
        return Math.round((Number(value) || 0) * p) / p;
    }
};

// Expose globally
if (typeof window !== 'undefined') {
    window.SMCPrecisionEngine = SMCPrecisionEngine;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SMCPrecisionEngine;
}
