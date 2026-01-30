/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                SHDW Fibonacci Precision Engine v1.0                           ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Copyright (c) 2024-2026 SHDWXBT. All rights reserved.                        ║
 * ║                                                                               ║
 * ║  PROPRIETARY AND CONFIDENTIAL                                                 ║
 * ║  This file contains trade secrets and proprietary information.                ║
 * ║  Unauthorized copying, modification, distribution, or use is prohibited.      ║
 * ║  Protected by intellectual property laws and international treaties.          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * Advanced Fibonacci analysis system with:
 * - Profile-based presets (Balanced, Execution, Macro)
 * - Protected & Cycle Swing Engines
 * - BOS/CHoCH Structure Confirmation
 * - OTE (Optimal Trade Entry) Zones with mitigation
 * - Golden Pocket Detection
 * - Premium/Discount/Equilibrium Zones
 * - Displacement Validation
 * - Auto TF Scaling
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    const CONFIG = {
        // Profile Presets
        profiles: {
            'balanced': {
                name: 'Desk — Balanced',
                description: 'Stable, robust analysis for general trading',
                atrLen: 14,
                swingRevAtr: 1.25,
                minBarsBetweenSwings: 5,
                strMinMoveAtr: 0.80,
                strEqualPct: 0.05,
                bosBufAtr: 0.15,
                dispBodyAtr: 0.80,
                dispBodyPct: 0.60,
                dispRangeAtr: 1.00,
                minImpulseAtr: 1.80,
                mitBufAtr: 0.10,
                cycleRevMult: 2.10,
                cycleBarsMult: 2,
                cycleMoveMult: 1.45
            },
            'execution': {
                name: 'Execution — Intraday',
                description: 'More responsive for intraday/scalping',
                atrLen: 14,
                swingRevAtr: 1.05,
                minBarsBetweenSwings: 3,
                strMinMoveAtr: 0.60,
                strEqualPct: 0.10,
                bosBufAtr: 0.10,
                dispBodyAtr: 0.65,
                dispBodyPct: 0.55,
                dispRangeAtr: 0.85,
                minImpulseAtr: 1.30,
                mitBufAtr: 0.08,
                cycleRevMult: 1.60,
                cycleBarsMult: 2,
                cycleMoveMult: 1.35
            },
            'macro': {
                name: 'Macro — Swing/Position',
                description: 'Stricter filters for swing/position trading',
                atrLen: 21,
                swingRevAtr: 1.55,
                minBarsBetweenSwings: 7,
                strMinMoveAtr: 1.10,
                strEqualPct: 0.04,
                bosBufAtr: 0.20,
                dispBodyAtr: 0.95,
                dispBodyPct: 0.65,
                dispRangeAtr: 1.10,
                minImpulseAtr: 2.30,
                mitBufAtr: 0.12,
                cycleRevMult: 2.60,
                cycleBarsMult: 3,
                cycleMoveMult: 1.60
            }
        },

        // Timeframe Scale Factors
        tfScales: {
            '1m': 0.75,
            '3m': 0.80,
            '5m': 0.85,
            '15m': 0.95,
            '30m': 0.98,
            '1h': 1.00,
            '2h': 1.05,
            '4h': 1.10,
            '6h': 1.15,
            '12h': 1.20,
            '1d': 1.30,
            '3d': 1.35,
            '1w': 1.40,
            '1M': 1.50
        },

        // Fibonacci Levels
        fibLevels: {
            0: { name: '0%', zone: 'premium' },
            0.236: { name: '23.6%', zone: 'premium' },
            0.382: { name: '38.2%', zone: 'premium' },
            0.5: { name: '50%', zone: 'equilibrium' },
            0.618: { name: '61.8%', zone: 'ote', golden: true },
            0.65: { name: '65%', zone: 'ote', golden: true },
            0.705: { name: '70.5%', zone: 'ote' },
            0.786: { name: '78.6%', zone: 'ote' },
            0.79: { name: '79%', zone: 'ote' },
            0.886: { name: '88.6%', zone: 'discount' },
            1.0: { name: '100%', zone: 'discount' }
        },

        // OTE Modes
        oteModes: {
            'standard': { top: 0.618, bottom: 0.786 },
            'extended': { top: 0.62, bottom: 0.79 },
            'tight': { top: 0.705, bottom: 0.79 }
        },

        // Premium/Discount Zones
        pdZones: {
            premiumPct: 0.05,  // Top 5% is premium
            discountPct: 0.05, // Bottom 5% is discount
            equilibriumPct: 0.05 // 5% around 50%
        },

        // Mitigation Modes
        mitigationModes: {
            'off': 0,
            'soft': 1, // Degrades when mitigated
            'hard': 2  // Vanishes on first touch
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN ENGINE CLASS
    // ═══════════════════════════════════════════════════════════════════════════

    class FibonacciPrecisionEngine {
        constructor(options = {}) {
            this.profile = options.profile || 'balanced';
            this.oteMode = options.oteMode || 'standard';
            this.mitigationMode = options.mitigationMode || 'soft';
            this.autoTfScale = options.autoTfScale !== false;
            this.anchorModel = options.anchorModel || 'hybrid'; // protected, cycle, hybrid

            // State
            this.protectedSwings = { highs: [], lows: [] };
            this.cycleSwings = { highs: [], lows: [] };
            this.structureState = {
                trend: 0,
                bullStage: 0,
                bearStage: 0,
                protLow: null,
                protHigh: null
            };
            this.currentLeg = null;
            this.breakHistory = [];
        }

        /**
         * Get profile configuration
         */
        getProfileConfig() {
            return CONFIG.profiles[this.profile] || CONFIG.profiles.balanced;
        }

        /**
         * Get timeframe scale factor
         */
        getTfScale(timeframe) {
            if (!this.autoTfScale) return 1.0;
            return CONFIG.tfScales[timeframe] || 1.0;
        }

        /**
         * Calculate ATR (Average True Range)
         */
        calculateATR(candles, length = 14) {
            if (candles.length < length + 1) return 0;

            let trSum = 0;
            for (let i = candles.length - length; i < candles.length; i++) {
                const current = candles[i];
                const prev = candles[i - 1];
                
                const tr = Math.max(
                    current.high - current.low,
                    Math.abs(current.high - prev.close),
                    Math.abs(current.low - prev.close)
                );
                trSum += tr;
            }
            
            return trSum / length;
        }

        /**
         * Check if candle is a displacement candle
         */
        isDisplacement(candle, atr, config, tfScale) {
            const range = candle.high - candle.low;
            const body = Math.abs(candle.close - candle.open);
            const isBullish = candle.close > candle.open;
            
            const bodyRatio = range > 0 ? body / range : 0;
            const bodyStrong = bodyRatio >= config.dispBodyPct;
            
            const bodyOk = body >= atr * config.dispBodyAtr * tfScale;
            const rangeOk = range >= atr * config.dispRangeAtr * tfScale;
            
            return {
                isDisplacement: bodyStrong && bodyOk && rangeOk,
                isBullish,
                isBearish: !isBullish && bodyStrong && bodyOk && rangeOk,
                body,
                range,
                bodyRatio,
                quality: bodyRatio * (body / (atr * config.dispBodyAtr))
            };
        }

        /**
         * Protected Swing Engine - Detects protected highs/lows
         */
        detectProtectedSwings(candles, config, tfScale) {
            const atr = this.calculateATR(candles, config.atrLen);
            const revThreshold = atr * config.swingRevAtr * tfScale;
            const minMove = atr * config.strMinMoveAtr * tfScale;
            
            const swings = {
                highs: [],
                lows: [],
                lastHigh: null,
                lastLow: null,
                prevHigh: null,
                prevLow: null
            };

            let dir = candles[0].close >= candles[0].open ? 1 : -1;
            let extreme = dir === 1 ? candles[0].high : candles[0].low;
            let extremeIdx = 0;
            let lastConfirmIdx = 0;

            for (let i = 1; i < candles.length; i++) {
                const candle = candles[i];
                const barsFromConfirm = i - lastConfirmIdx;
                const canConfirm = barsFromConfirm >= config.minBarsBetweenSwings;

                if (dir === 1) {
                    // Looking for high
                    if (candle.high > extreme) {
                        extreme = candle.high;
                        extremeIdx = i;
                    }

                    if (canConfirm && (extreme - candle.low >= revThreshold)) {
                        // Confirm swing high
                        swings.prevHigh = swings.lastHigh;
                        swings.lastHigh = {
                            price: extreme,
                            index: extremeIdx,
                            bar: candles[extremeIdx]
                        };
                        swings.highs.push(swings.lastHigh);

                        lastConfirmIdx = extremeIdx;
                        dir = -1;
                        extreme = candle.low;
                        extremeIdx = i;
                    }
                } else {
                    // Looking for low
                    if (candle.low < extreme) {
                        extreme = candle.low;
                        extremeIdx = i;
                    }

                    if (canConfirm && (candle.high - extreme >= revThreshold)) {
                        // Confirm swing low
                        swings.prevLow = swings.lastLow;
                        swings.lastLow = {
                            price: extreme,
                            index: extremeIdx,
                            bar: candles[extremeIdx]
                        };
                        swings.lows.push(swings.lastLow);

                        lastConfirmIdx = extremeIdx;
                        dir = 1;
                        extreme = candle.high;
                        extremeIdx = i;
                    }
                }
            }

            this.protectedSwings = swings;
            return swings;
        }

        /**
         * Cycle Swing Engine - Detects major cycle highs/lows
         */
        detectCycleSwings(candles, config, tfScale) {
            const atr = this.calculateATR(candles, config.atrLen);
            const revThreshold = atr * config.swingRevAtr * config.cycleRevMult * tfScale;
            const minBars = Math.max(1, config.minBarsBetweenSwings * config.cycleBarsMult);
            
            const swings = {
                highs: [],
                lows: [],
                lastHigh: null,
                lastLow: null,
                prevHigh: null,
                prevLow: null
            };

            let dir = candles[0].close >= candles[0].open ? 1 : -1;
            let extreme = dir === 1 ? candles[0].high : candles[0].low;
            let extremeIdx = 0;
            let lastConfirmIdx = 0;

            for (let i = 1; i < candles.length; i++) {
                const candle = candles[i];
                const barsFromConfirm = i - lastConfirmIdx;
                const canConfirm = barsFromConfirm >= minBars;

                if (dir === 1) {
                    if (candle.high > extreme) {
                        extreme = candle.high;
                        extremeIdx = i;
                    }

                    if (canConfirm && (extreme - candle.low >= revThreshold)) {
                        swings.prevHigh = swings.lastHigh;
                        swings.lastHigh = {
                            price: extreme,
                            index: extremeIdx,
                            bar: candles[extremeIdx],
                            isCycle: true
                        };
                        swings.highs.push(swings.lastHigh);

                        lastConfirmIdx = extremeIdx;
                        dir = -1;
                        extreme = candle.low;
                        extremeIdx = i;
                    }
                } else {
                    if (candle.low < extreme) {
                        extreme = candle.low;
                        extremeIdx = i;
                    }

                    if (canConfirm && (candle.high - extreme >= revThreshold)) {
                        swings.prevLow = swings.lastLow;
                        swings.lastLow = {
                            price: extreme,
                            index: extremeIdx,
                            bar: candles[extremeIdx],
                            isCycle: true
                        };
                        swings.lows.push(swings.lastLow);

                        lastConfirmIdx = extremeIdx;
                        dir = 1;
                        extreme = candle.high;
                        extremeIdx = i;
                    }
                }
            }

            this.cycleSwings = swings;
            return swings;
        }

        /**
         * Classify market structure (HH, HL, LH, LL)
         */
        classifyStructure(swings, config, atr, tfScale) {
            const minMove = atr * config.strMinMoveAtr * tfScale;
            
            const result = {
                highType: null,  // HH or LH
                lowType: null,   // HL or LL
                trend: 0,        // 1 = bullish, -1 = bearish, 0 = neutral
                isValid: false
            };

            if (swings.lastHigh && swings.prevHigh) {
                const diff = swings.lastHigh.price - swings.prevHigh.price;
                const eqTolerance = Math.abs(swings.prevHigh.price) * (config.strEqualPct * 0.01);
                
                if (Math.abs(diff) >= minMove && Math.abs(diff) > eqTolerance) {
                    result.highType = diff > 0 ? 'HH' : 'LH';
                } else {
                    result.highType = 'EH'; // Equal High
                }
            }

            if (swings.lastLow && swings.prevLow) {
                const diff = swings.lastLow.price - swings.prevLow.price;
                const eqTolerance = Math.abs(swings.prevLow.price) * (config.strEqualPct * 0.01);
                
                if (Math.abs(diff) >= minMove && Math.abs(diff) > eqTolerance) {
                    result.lowType = diff > 0 ? 'HL' : 'LL';
                } else {
                    result.lowType = 'EL'; // Equal Low
                }
            }

            // Determine trend
            if (result.highType === 'HH' && result.lowType === 'HL') {
                result.trend = 1; // Bullish
            } else if (result.highType === 'LH' && result.lowType === 'LL') {
                result.trend = -1; // Bearish
            }

            result.isValid = result.highType !== null || result.lowType !== null;
            return result;
        }

        /**
         * Detect BOS (Break of Structure) and CHoCH (Change of Character)
         */
        detectStructureBreaks(candles, swings, config, atr, tfScale, bias) {
            const currentCandle = candles[candles.length - 1];
            const prevCandle = candles[candles.length - 2];
            const bosBuf = atr * config.bosBufAtr * tfScale;
            
            const result = {
                bosUp: false,
                bosDn: false,
                chochUp: false,
                chochDn: false,
                breakLevel: null,
                displacement: null
            };

            // Check displacement
            result.displacement = this.isDisplacement(currentCandle, atr, config, tfScale);

            // Break Up Detection
            if (swings.lastHigh) {
                const breakLevel = swings.lastHigh.price + bosBuf;
                const breakUpRaw = currentCandle.close > breakLevel && prevCandle.close <= breakLevel;
                const breakUpOk = breakUpRaw && (!config.requireDisplacement || result.displacement.isBullish);

                if (breakUpOk) {
                    if (bias === 1) {
                        result.bosUp = true;
                    } else {
                        result.chochUp = true;
                    }
                    result.breakLevel = swings.lastHigh.price;
                }
            }

            // Break Down Detection
            if (swings.lastLow) {
                const breakLevel = swings.lastLow.price - bosBuf;
                const breakDnRaw = currentCandle.close < breakLevel && prevCandle.close >= breakLevel;
                const breakDnOk = breakDnRaw && (!config.requireDisplacement || result.displacement.isBearish);

                if (breakDnOk) {
                    if (bias === -1) {
                        result.bosDn = true;
                    } else {
                        result.chochDn = true;
                    }
                    result.breakLevel = swings.lastLow.price;
                }
            }

            return result;
        }

        /**
         * Select anchor based on model (Protected, Cycle, or Hybrid)
         */
        selectAnchor(timeframe) {
            const tfMinutes = this.parseTimeframeToMinutes(timeframe);
            
            let useCycle = false;
            
            if (this.anchorModel === 'cycle') {
                useCycle = true;
            } else if (this.anchorModel === 'protected') {
                useCycle = false;
            } else {
                // Hybrid mode - auto select based on profile and timeframe
                if (this.profile === 'macro') {
                    useCycle = tfMinutes >= 240; // 4H+
                } else if (this.profile === 'execution') {
                    useCycle = tfMinutes >= 10080; // Weekly+
                } else {
                    useCycle = tfMinutes >= 1440; // Daily+
                }
            }

            return {
                useCycle,
                swings: useCycle ? this.cycleSwings : this.protectedSwings,
                type: useCycle ? 'cycle' : 'protected'
            };
        }

        /**
         * Parse timeframe string to minutes
         */
        parseTimeframeToMinutes(tf) {
            const match = tf.match(/^(\d+)([mhwdM])$/i);
            if (!match) return 60; // Default 1h

            const value = parseInt(match[1]);
            const unit = match[2].toLowerCase();

            switch (unit) {
                case 'm': return value;
                case 'h': return value * 60;
                case 'd': return value * 1440;
                case 'w': return value * 10080;
                default: return value * 43200; // Month
            }
        }

        /**
         * Calculate Fibonacci levels for a leg
         */
        calculateFibLevels(A, B) {
            const levels = {};
            const P0 = B; // 0%
            const P1 = A; // 100%
            
            for (const [ratio, info] of Object.entries(CONFIG.fibLevels)) {
                const r = parseFloat(ratio);
                levels[ratio] = {
                    price: P0 + (P1 - P0) * r,
                    ...info
                };
            }

            return levels;
        }

        /**
         * Calculate OTE (Optimal Trade Entry) zone
         */
        calculateOTE(A, B) {
            const mode = CONFIG.oteModes[this.oteMode] || CONFIG.oteModes.standard;
            const P0 = B;
            const P1 = A;
            
            return {
                top: P0 + (P1 - P0) * mode.top,
                bottom: P0 + (P1 - P0) * mode.bottom,
                midpoint: P0 + (P1 - P0) * ((mode.top + mode.bottom) / 2),
                mode: this.oteMode
            };
        }

        /**
         * Calculate Golden Pocket zone
         */
        calculateGoldenPocket(A, B) {
            const P0 = B;
            const P1 = A;
            
            return {
                top: P0 + (P1 - P0) * 0.618,
                bottom: P0 + (P1 - P0) * 0.65,
                midpoint: P0 + (P1 - P0) * 0.634
            };
        }

        /**
         * Calculate Premium/Discount/Equilibrium zones
         */
        calculatePDZones(A, B) {
            const hi = Math.max(A, B);
            const lo = Math.min(A, B);
            const d = hi - lo;
            
            const pdz = CONFIG.pdZones;
            
            return {
                premium: {
                    top: hi,
                    bottom: hi - d * pdz.premiumPct,
                    label: 'Premium Zone'
                },
                discount: {
                    top: lo + d * pdz.discountPct,
                    bottom: lo,
                    label: 'Discount Zone'
                },
                equilibrium: {
                    midpoint: (hi + lo) / 2,
                    top: ((hi + lo) / 2) + d * (pdz.equilibriumPct / 2),
                    bottom: ((hi + lo) / 2) - d * (pdz.equilibriumPct / 2),
                    label: 'Equilibrium'
                }
            };
        }

        /**
         * Check mitigation status of a zone
         */
        checkMitigation(zone, candles, mitBuf) {
            const current = candles[candles.length - 1];
            const zoneTop = Math.max(zone.top, zone.bottom);
            const zoneBot = Math.min(zone.top, zone.bottom);
            
            // Check if price touched zone
            const touched = current.high >= zoneBot && current.low <= zoneTop;
            
            // Check if price closed through zone
            const closedThrough = current.close < (zoneBot - mitBuf) || current.close > (zoneTop + mitBuf);
            
            return {
                touched,
                closedThrough,
                status: closedThrough ? 'mitigated' : (touched ? 'tested' : 'fresh'),
                strength: closedThrough ? 0 : (touched ? 0.5 : 1.0)
            };
        }

        /**
         * Determine current position relative to zones
         */
        determinePosition(currentPrice, pdZones, fibLevels) {
            const { premium, discount, equilibrium } = pdZones;
            
            let position = 'neutral';
            let zone = null;
            let quality = 0;

            if (currentPrice >= premium.bottom) {
                position = 'premium';
                zone = premium;
                quality = (currentPrice - premium.bottom) / (premium.top - premium.bottom);
            } else if (currentPrice <= discount.top) {
                position = 'discount';
                zone = discount;
                quality = (discount.top - currentPrice) / (discount.top - discount.bottom);
            } else if (currentPrice >= equilibrium.bottom && currentPrice <= equilibrium.top) {
                position = 'equilibrium';
                zone = equilibrium;
                quality = 1 - Math.abs(currentPrice - equilibrium.midpoint) / (equilibrium.top - equilibrium.bottom);
            }

            // Check OTE proximity
            const ote = this.calculateOTE(
                fibLevels['1.0']?.price || 0,
                fibLevels['0']?.price || 0
            );
            
            const inOTE = currentPrice >= Math.min(ote.top, ote.bottom) && 
                          currentPrice <= Math.max(ote.top, ote.bottom);

            return {
                position,
                zone,
                quality: Math.min(1, Math.max(0, quality)),
                inOTE,
                nearGolden: currentPrice >= fibLevels['0.618']?.price * 0.995 && 
                           currentPrice <= fibLevels['0.65']?.price * 1.005
            };
        }

        /**
         * Generate entry signal based on Fibonacci analysis
         */
        generateEntrySignal(analysis, direction) {
            const { position, structure, leg, zones, ote, goldenPocket, currentPrice } = analysis;
            
            let signal = {
                valid: false,
                direction: direction,
                entry: null,
                stopLoss: null,
                targets: [],
                confidence: 0,
                reasons: [],
                warnings: []
            };

            // Validate direction alignment
            if (direction === 'LONG') {
                // For LONG: want discount zone, bullish structure, price at/below OTE
                if (position.position === 'discount') {
                    signal.confidence += 25;
                    signal.reasons.push('Price in Discount Zone');
                }
                
                if (position.inOTE) {
                    signal.confidence += 30;
                    signal.reasons.push('Price in OTE Zone');
                }
                
                if (position.nearGolden) {
                    signal.confidence += 20;
                    signal.reasons.push('Price at Golden Pocket');
                }
                
                if (structure.trend === 1) {
                    signal.confidence += 15;
                    signal.reasons.push('Bullish Structure (HH/HL)');
                }
                
                if (leg && leg.direction === 1) {
                    signal.confidence += 10;
                    signal.reasons.push('Bullish Leg Active');
                }

                // Entry/SL/TP
                if (position.inOTE) {
                    signal.entry = ote.midpoint;
                    signal.stopLoss = leg ? leg.A * 0.998 : ote.bottom * 0.995;
                    signal.targets = [
                        { price: zones.fibLevels['0.382']?.price, label: '38.2% TP1' },
                        { price: zones.fibLevels['0.236']?.price, label: '23.6% TP2' },
                        { price: zones.fibLevels['0']?.price, label: '0% TP3 (Full)' }
                    ];
                } else if (position.position === 'discount') {
                    signal.entry = currentPrice;
                    signal.stopLoss = zones.pdZones.discount.bottom * 0.995;
                    signal.targets = [
                        { price: zones.pdZones.equilibrium.midpoint, label: 'Equilibrium TP1' },
                        { price: zones.fibLevels['0.382']?.price, label: '38.2% TP2' }
                    ];
                }

            } else if (direction === 'SHORT') {
                // For SHORT: want premium zone, bearish structure, price at/above OTE
                if (position.position === 'premium') {
                    signal.confidence += 25;
                    signal.reasons.push('Price in Premium Zone');
                }
                
                if (position.inOTE) {
                    signal.confidence += 30;
                    signal.reasons.push('Price in OTE Zone (Shorting)');
                }
                
                if (position.nearGolden) {
                    signal.confidence += 20;
                    signal.reasons.push('Price at Golden Pocket (Reversal)');
                }
                
                if (structure.trend === -1) {
                    signal.confidence += 15;
                    signal.reasons.push('Bearish Structure (LH/LL)');
                }
                
                if (leg && leg.direction === -1) {
                    signal.confidence += 10;
                    signal.reasons.push('Bearish Leg Active');
                }

                // Entry/SL/TP
                if (position.inOTE) {
                    signal.entry = ote.midpoint;
                    signal.stopLoss = leg ? leg.A * 1.002 : ote.top * 1.005;
                    signal.targets = [
                        { price: zones.fibLevels['0.618']?.price, label: '61.8% TP1' },
                        { price: zones.fibLevels['0.786']?.price, label: '78.6% TP2' },
                        { price: zones.fibLevels['1.0']?.price, label: '100% TP3 (Full)' }
                    ];
                } else if (position.position === 'premium') {
                    signal.entry = currentPrice;
                    signal.stopLoss = zones.pdZones.premium.top * 1.005;
                    signal.targets = [
                        { price: zones.pdZones.equilibrium.midpoint, label: 'Equilibrium TP1' },
                        { price: zones.fibLevels['0.618']?.price, label: '61.8% TP2' }
                    ];
                }
            }

            // Warnings
            if (position.position === 'equilibrium') {
                signal.warnings.push('Price at Equilibrium - Higher uncertainty');
            }
            
            if (structure.trend === 0) {
                signal.warnings.push('No clear market structure');
            }

            signal.valid = signal.confidence >= 50 && signal.entry !== null;
            
            return signal;
        }

        /**
         * Complete analysis function
         */
        analyzeComplete(candles, timeframe = '1h') {
            if (!candles || candles.length < 50) {
                return { error: 'Insufficient data', candles: candles?.length || 0 };
            }

            const config = this.getProfileConfig();
            const tfScale = this.getTfScale(timeframe);
            const atr = this.calculateATR(candles, config.atrLen);
            
            // Detect swings
            const protectedSwings = this.detectProtectedSwings(candles, config, tfScale);
            const cycleSwings = this.detectCycleSwings(candles, config, tfScale);
            
            // Select anchor
            const anchor = this.selectAnchor(timeframe);
            const swings = anchor.swings;
            
            // Classify structure
            const structure = this.classifyStructure(swings, config, atr, tfScale);
            
            // Get current bias
            let bias = structure.trend || 0;
            if (bias === 0 && swings.lastHigh && swings.lastLow) {
                bias = swings.lastHigh.index > swings.lastLow.index ? 1 : -1;
            }
            
            // Detect breaks
            const breaks = this.detectStructureBreaks(candles, swings, config, atr, tfScale, bias);
            
            // Update bias on CHoCH
            if (breaks.chochUp) bias = 1;
            if (breaks.chochDn) bias = -1;
            
            // Select leg (A → B)
            let leg = null;
            if (swings.lastHigh && swings.lastLow) {
                const bullishLeg = swings.lastLow.index < swings.lastHigh.index;
                const A = bullishLeg ? swings.lastLow.price : swings.lastHigh.price;
                const B = bullishLeg ? swings.lastHigh.price : swings.lastLow.price;
                const Ai = bullishLeg ? swings.lastLow.index : swings.lastHigh.index;
                const Bi = bullishLeg ? swings.lastHigh.index : swings.lastLow.index;
                
                const impulse = Math.abs(B - A);
                const minImpulse = atr * config.minImpulseAtr * tfScale;
                
                if (impulse >= minImpulse) {
                    leg = {
                        A,
                        B,
                        Ai,
                        Bi,
                        direction: bullishLeg ? 1 : -1,
                        impulse,
                        isValid: true
                    };
                }
            }
            
            // Calculate zones if leg is valid
            let zones = null;
            let ote = null;
            let goldenPocket = null;
            let position = null;
            
            const currentPrice = candles[candles.length - 1].close;
            
            if (leg && leg.isValid) {
                const fibLevels = this.calculateFibLevels(leg.A, leg.B);
                const pdZones = this.calculatePDZones(leg.A, leg.B);
                ote = this.calculateOTE(leg.A, leg.B);
                goldenPocket = this.calculateGoldenPocket(leg.A, leg.B);
                
                zones = {
                    fibLevels,
                    pdZones,
                    ote,
                    goldenPocket
                };
                
                position = this.determinePosition(currentPrice, pdZones, fibLevels);
                
                // Check mitigation
                const mitBuf = atr * config.mitBufAtr * tfScale;
                zones.oteMitigation = this.checkMitigation(ote, candles, mitBuf);
                zones.goldenMitigation = this.checkMitigation(goldenPocket, candles, mitBuf);
            }

            // Store current leg
            this.currentLeg = leg;

            return {
                timestamp: Date.now(),
                timeframe,
                profile: this.profile,
                profileConfig: config,
                tfScale,
                atr,
                
                swings: {
                    protected: protectedSwings,
                    cycle: cycleSwings,
                    active: anchor
                },
                
                structure,
                bias,
                breaks,
                leg,
                zones,
                ote,
                goldenPocket,
                position,
                currentPrice,
                
                // Summary scores
                scores: this.calculateScores(structure, breaks, position, leg)
            };
        }

        /**
         * Calculate analysis scores
         */
        calculateScores(structure, breaks, position, leg) {
            let structureScore = 0;
            let entryScore = 0;
            let confirmationScore = 0;

            // Structure Score
            if (structure.trend !== 0) structureScore += 30;
            if (structure.highType === 'HH' || structure.highType === 'LH') structureScore += 20;
            if (structure.lowType === 'HL' || structure.lowType === 'LL') structureScore += 20;
            if (breaks.bosUp || breaks.bosDn) structureScore += 15;
            if (breaks.chochUp || breaks.chochDn) structureScore += 15;

            // Entry Score
            if (position) {
                if (position.inOTE) entryScore += 40;
                if (position.nearGolden) entryScore += 25;
                if (position.position === 'discount' || position.position === 'premium') {
                    entryScore += 20;
                }
                entryScore += position.quality * 15;
            }

            // Confirmation Score
            if (breaks.displacement?.isDisplacement) confirmationScore += 30;
            if (leg?.isValid) confirmationScore += 25;
            if (breaks.displacement?.quality > 0.8) confirmationScore += 20;
            if (structure.isValid) confirmationScore += 25;

            return {
                structure: Math.min(100, structureScore),
                entry: Math.min(100, entryScore),
                confirmation: Math.min(100, confirmationScore),
                overall: Math.min(100, (structureScore + entryScore + confirmationScore) / 3)
            };
        }

        /**
         * Get optimal entry recommendation
         */
        getEntryRecommendation(candles, timeframe, direction) {
            const analysis = this.analyzeComplete(candles, timeframe);
            
            if (analysis.error) {
                return { error: analysis.error };
            }

            const signal = this.generateEntrySignal(analysis, direction);
            
            return {
                analysis,
                signal,
                summary: this.generateSummary(analysis, signal)
            };
        }

        /**
         * Generate human-readable summary
         */
        generateSummary(analysis, signal) {
            const lines = [];
            
            // Profile info
            lines.push(`📊 Profile: ${analysis.profileConfig.name}`);
            lines.push(`⏱️ Timeframe: ${analysis.timeframe} (Scale: ${analysis.tfScale.toFixed(2)})`);
            
            // Structure
            const structEmoji = analysis.structure.trend === 1 ? '🟢' : analysis.structure.trend === -1 ? '🔴' : '⚪';
            lines.push(`${structEmoji} Structure: ${analysis.structure.highType || 'N/A'} / ${analysis.structure.lowType || 'N/A'}`);
            
            // Bias
            const biasLabel = analysis.bias === 1 ? 'BULLISH' : analysis.bias === -1 ? 'BEARISH' : 'NEUTRAL';
            lines.push(`🎯 Bias: ${biasLabel}`);
            
            // Position
            if (analysis.position) {
                lines.push(`📍 Position: ${analysis.position.position.toUpperCase()} (Quality: ${(analysis.position.quality * 100).toFixed(0)}%)`);
                if (analysis.position.inOTE) lines.push(`✨ IN OTE ZONE!`);
                if (analysis.position.nearGolden) lines.push(`🌟 Near Golden Pocket!`);
            }
            
            // Breaks
            if (analysis.breaks.bosUp) lines.push(`🔼 BOS UP Confirmed`);
            if (analysis.breaks.bosDn) lines.push(`🔽 BOS DOWN Confirmed`);
            if (analysis.breaks.chochUp) lines.push(`🔄 CHoCH UP - Trend Reversal!`);
            if (analysis.breaks.chochDn) lines.push(`🔄 CHoCH DOWN - Trend Reversal!`);
            
            // Scores
            lines.push('');
            lines.push(`📈 Scores:`);
            lines.push(`   Structure: ${analysis.scores.structure}/100`);
            lines.push(`   Entry: ${analysis.scores.entry}/100`);
            lines.push(`   Confirmation: ${analysis.scores.confirmation}/100`);
            lines.push(`   Overall: ${analysis.scores.overall.toFixed(0)}/100`);
            
            // Signal
            if (signal.valid) {
                lines.push('');
                lines.push(`✅ SIGNAL: ${signal.direction}`);
                lines.push(`   Entry: $${signal.entry?.toFixed(2) || 'N/A'}`);
                lines.push(`   Stop Loss: $${signal.stopLoss?.toFixed(2) || 'N/A'}`);
                signal.targets.forEach((t, i) => {
                    lines.push(`   ${t.label}: $${t.price?.toFixed(2) || 'N/A'}`);
                });
                lines.push(`   Confidence: ${signal.confidence}%`);
            }
            
            return lines.join('\n');
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTEGRATION HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Quick analysis for current asset
     */
    function quickFibAnalysis(candles, options = {}) {
        const engine = new FibonacciPrecisionEngine(options);
        return engine.analyzeComplete(candles, options.timeframe || '1h');
    }

    /**
     * Get entry signal with Fibonacci precision
     */
    function getFibEntrySignal(candles, direction, options = {}) {
        const engine = new FibonacciPrecisionEngine(options);
        return engine.getEntryRecommendation(candles, options.timeframe || '1h', direction);
    }

    /**
     * Calculate confluence with existing SMC analysis
     */
    function calculateFibSMCConfluence(fibAnalysis, smcAnalysis) {
        let confluence = 0;
        const factors = [];

        // Fibonacci factors
        if (fibAnalysis.position?.inOTE) {
            confluence += 20;
            factors.push('In OTE Zone');
        }
        if (fibAnalysis.position?.nearGolden) {
            confluence += 15;
            factors.push('Near Golden Pocket');
        }
        if (fibAnalysis.scores?.entry >= 70) {
            confluence += 15;
            factors.push('Strong Fib Entry Score');
        }

        // SMC factors (if available)
        if (smcAnalysis) {
            if (smcAnalysis.orderBlocks?.find(ob => ob.tier === 'STRONG')) {
                confluence += 20;
                factors.push('Strong Order Block');
            }
            if (smcAnalysis.fvg?.length > 0) {
                confluence += 10;
                factors.push('FVG Present');
            }
            if (smcAnalysis.premiumDiscount?.position === fibAnalysis.position?.position) {
                confluence += 10;
                factors.push('PD Zone Alignment');
            }
        }

        // Structure alignment
        if (fibAnalysis.breaks?.bosUp || fibAnalysis.breaks?.bosDn) {
            confluence += 10;
            factors.push('BOS Confirmed');
        }
        if (fibAnalysis.breaks?.chochUp || fibAnalysis.breaks?.chochDn) {
            confluence += 15;
            factors.push('CHoCH - Reversal Signal');
        }

        return {
            score: Math.min(100, confluence),
            factors,
            tier: confluence >= 70 ? 'HIGH' : confluence >= 50 ? 'MEDIUM' : 'LOW'
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EXPORT
    // ═══════════════════════════════════════════════════════════════════════════

    const FibPrecisionEngine = {
        Engine: FibonacciPrecisionEngine,
        quickAnalysis: quickFibAnalysis,
        getEntrySignal: getFibEntrySignal,
        calculateConfluence: calculateFibSMCConfluence,
        CONFIG,
        version: '1.0.0'
    };

    // Global export
    if (typeof window !== 'undefined') {
        window.FibonacciPrecisionEngine = FibPrecisionEngine;
        window.FibPrecisionEngine = FibPrecisionEngine;
    }

    // Module export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = FibPrecisionEngine;
    }

    console.log('✅ SHDW Fibonacci Precision Engine v1.0 loaded');

})();
