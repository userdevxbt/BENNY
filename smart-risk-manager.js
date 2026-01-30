/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║        SHDWXBT — SMART POSITION SIZING & RISK MANAGEMENT v3.0                ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Copyright (c) 2024-2026 SHDWXBT. All rights reserved.                        ║
 * ║                                                                               ║
 * ║  PROPRIETARY AND CONFIDENTIAL                                                 ║
 * ║  This file contains trade secrets and proprietary information.                ║
 * ║  Unauthorized copying, modification, distribution, or use is prohibited.      ║
 * ║  Protected by intellectual property laws and international treaties.          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 💎 GERENCIAMENTO DE RISCO INSTITUCIONAL AVANÇADO
 * 
 * Funcionalidades:
 * ✅ Kelly Criterion Otimizado para Cripto
 * ✅ Optimal F Position Sizing
 * ✅ Volatility-Adjusted Position Sizing
 * ✅ Correlation-Aware Portfolio Risk
 * ✅ Monte Carlo Simulation para Risk Assessment
 * ✅ Dynamic Drawdown Protection
 * ✅ Multi-Layer Stop Loss (Trailing, Breakeven, Time-based)
 * ✅ Profit Lock System
 * ✅ Portfolio Heat Management
 * ✅ Session-Based Risk Limits
 */

const SmartRiskManager = {
    // ========================================
    // CONFIGURATION
    // ========================================
    config: {
        // Capital Settings
        capital: {
            initial: 10000,
            current: 10000,
            reserved: 0.20, // 20% always in reserve
            maxDrawdownAllowed: 0.15 // 15% max drawdown before pause
        },

        // Risk Limits
        limits: {
            maxRiskPerTrade: 0.01,      // 1% max per trade
            maxRiskPerDay: 0.03,        // 3% max per day
            maxRiskPerWeek: 0.07,       // 7% max per week
            maxOpenPositions: 5,         // Max simultaneous positions
            maxCorrelatedPositions: 2,   // Max positions in correlated assets
            maxSectorExposure: 0.15,     // 15% max per sector
            maxSingleAssetExposure: 0.20 // 20% max single asset
        },

        // Position Sizing Methods
        sizingMethod: 'adaptive', // 'fixed', 'kelly', 'optimalF', 'adaptive'
        
        // Kelly Criterion Settings
        kelly: {
            fraction: 0.25, // Use 1/4 Kelly (conservative)
            minEdge: 0.05,  // 5% minimum edge required
            maxAllocation: 0.10 // 10% max from Kelly
        },

        // Stop Loss Settings
        stopLoss: {
            type: 'atr', // 'fixed', 'atr', 'structure', 'volatility'
            atrMultiplier: 1.5,
            fixedPercent: 0.02,
            timeBasedCandles: 12, // Exit after X candles without profit
            trailingActivation: 0.015, // 1.5% profit to activate trailing
            trailingDistance: 0.01,    // 1% trailing distance
            breakEvenActivation: 0.01  // 1% profit to move stop to breakeven
        },

        // Take Profit Settings
        takeProfit: {
            levels: [
                { target: 1.5, closePercent: 0.30 },  // TP1: 1.5R, close 30%
                { target: 2.5, closePercent: 0.40 },  // TP2: 2.5R, close 40%
                { target: 4.0, closePercent: 0.30 }   // TP3: 4R, close remaining 30%
            ],
            trailingAfterTP2: true
        },

        // Drawdown Protection
        drawdown: {
            yellowZone: 0.05,  // 5% - reduce size by 50%
            redZone: 0.10,     // 10% - reduce size by 75%
            pauseZone: 0.15,   // 15% - pause trading
            resetPeriodDays: 3  // Days in pause before resume
        },

        // Sector Classification
        sectors: {
            major: ['BTCUSDT', 'ETHUSDT'],
            defi: ['AAVEUSDT', 'UNIUSDT', 'LINKUSDT', 'COMPUSDT', 'MKRUSDT', 'SUSHIUSDT'],
            layer1: ['SOLUSDT', 'AVAXUSDT', 'ADAUSDT', 'DOTUSDT', 'ATOMUSDT', 'NEARUSDT'],
            layer2: ['MATICUSDT', 'ARBUSDT', 'OPUSDT'],
            gaming: ['SANDUSDT', 'MANAUSDT', 'AXSUSDT', 'GALAUSDT', 'ENJUSDT'],
            ai: ['FETUSDT', 'AGIXUSDT', 'OCEANUSDT', 'RNDRUSDT'],
            meme: ['DOGEUSDT', 'SHIBUSDT', 'PEPEUSDT', 'BONKUSDT', 'WIFUSDT']
        }
    },

    // ========================================
    // STATE
    // ========================================
    state: {
        positions: [],
        closedTrades: [],
        dailyStats: {
            date: null,
            pnl: 0,
            riskUsed: 0,
            tradesCount: 0,
            winCount: 0,
            lossCount: 0
        },
        weeklyStats: {
            weekStart: null,
            pnl: 0,
            riskUsed: 0
        },
        drawdownState: {
            peak: 10000,
            current: 10000,
            drawdown: 0,
            maxDrawdown: 0,
            zone: 'green',
            pausedUntil: null
        },
        performance: {
            winRate: 0,
            avgWin: 0,
            avgLoss: 0,
            profitFactor: 0,
            expectancy: 0,
            sharpeRatio: 0,
            totalTrades: 0
        }
    },

    // ========================================
    // INITIALIZATION
    // ========================================
    init(initialCapital = 10000) {
        console.log('💎 Inicializando Smart Risk Manager...');
        
        this.config.capital.initial = initialCapital;
        this.config.capital.current = initialCapital;
        this.state.drawdownState.peak = initialCapital;
        this.state.drawdownState.current = initialCapital;
        
        // Load saved state
        this.loadState();
        
        // Reset daily stats if new day
        this.checkDailyReset();
        
        console.log('✅ Smart Risk Manager inicializado');
        console.log(`💰 Capital: $${initialCapital.toLocaleString()}`);
        
        return this;
    },

    // ========================================
    // POSITION SIZING
    // ========================================
    
    /**
     * Calculate optimal position size for a trade
     * @param {Object} params - Trade parameters
     * @returns {Object} Position sizing result
     */
    calculatePositionSize(params) {
        const {
            symbol,
            entryPrice,
            stopLoss,
            confidence = 70,
            winRate = null,
            avgWinLoss = null,
            profile = 'dayTrading'
        } = params;

        // Validate inputs
        if (!symbol || !entryPrice || !stopLoss) {
            return { valid: false, error: 'Parâmetros inválidos' };
        }

        // Check if trading is allowed
        const tradingCheck = this.canOpenTrade(symbol);
        if (!tradingCheck.allowed) {
            return { valid: false, error: tradingCheck.reason };
        }

        // Calculate risk per trade
        const riskDistance = Math.abs(entryPrice - stopLoss);
        const riskPercent = riskDistance / entryPrice;

        // Get base position size using configured method
        let positionSize;
        switch (this.config.sizingMethod) {
            case 'kelly':
                positionSize = this.calculateKellySize(winRate, avgWinLoss);
                break;
            case 'optimalF':
                positionSize = this.calculateOptimalF();
                break;
            case 'adaptive':
                positionSize = this.calculateAdaptiveSize(confidence, riskPercent);
                break;
            default:
                positionSize = this.config.limits.maxRiskPerTrade;
        }

        // Apply drawdown adjustment
        positionSize = this.applyDrawdownAdjustment(positionSize);

        // Apply volatility adjustment
        positionSize = this.applyVolatilityAdjustment(positionSize, symbol);

        // Apply confidence adjustment
        positionSize = this.applyConfidenceAdjustment(positionSize, confidence);

        // Ensure within limits
        const maxAllocation = this.config.capital.current * this.config.limits.maxSingleAssetExposure;
        const riskAmount = this.config.capital.current * positionSize;
        const positionValue = riskAmount / riskPercent;
        
        // Calculate quantity
        const quantity = Math.min(positionValue, maxAllocation) / entryPrice;
        const adjustedRiskAmount = quantity * riskDistance;
        const adjustedRiskPercent = adjustedRiskAmount / this.config.capital.current;

        // Calculate take profit levels
        const takeProfitLevels = this.calculateTakeProfitLevels(
            entryPrice, 
            stopLoss, 
            riskDistance
        );

        return {
            valid: true,
            symbol,
            entryPrice,
            stopLoss,
            quantity: Math.floor(quantity * 1000) / 1000, // Round to 3 decimals
            positionValue: Math.round(quantity * entryPrice * 100) / 100,
            riskAmount: Math.round(adjustedRiskAmount * 100) / 100,
            riskPercent: Math.round(adjustedRiskPercent * 10000) / 100, // Percentage with 2 decimals
            maxRiskAllowed: Math.round(this.config.limits.maxRiskPerTrade * 10000) / 100,
            takeProfitLevels,
            method: this.config.sizingMethod,
            adjustments: {
                drawdown: this.state.drawdownState.zone,
                confidence,
                volatility: 'normal' // Would be calculated
            }
        };
    },

    calculateKellySize(winRate, avgWinLoss) {
        // Kelly Formula: K = W - (1-W)/R
        // W = win rate, R = win/loss ratio
        
        const W = winRate || this.state.performance.winRate || 0.55;
        const R = avgWinLoss || this.state.performance.avgWin / (this.state.performance.avgLoss || 1) || 2;
        
        const kelly = W - ((1 - W) / R);
        
        // Use fractional Kelly
        const fractionalKelly = kelly * this.config.kelly.fraction;
        
        // Cap at max allocation
        return Math.min(
            Math.max(0, fractionalKelly),
            this.config.kelly.maxAllocation
        );
    },

    calculateOptimalF() {
        // Optimal F based on historical trades
        const trades = this.state.closedTrades.slice(-30);
        if (trades.length < 10) return this.config.limits.maxRiskPerTrade;
        
        // Find the fraction that maximizes geometric growth
        let optimalF = 0;
        let maxTWR = 0;
        
        for (let f = 0.01; f <= 0.30; f += 0.01) {
            let twr = 1;
            trades.forEach(trade => {
                const hpr = 1 + (trade.pnlPercent / 100) * f / this.config.limits.maxRiskPerTrade;
                twr *= hpr;
            });
            
            if (twr > maxTWR) {
                maxTWR = twr;
                optimalF = f;
            }
        }
        
        // Use fractional Optimal F
        return Math.min(optimalF * 0.5, this.config.limits.maxRiskPerTrade * 2);
    },

    calculateAdaptiveSize(confidence, riskPercent) {
        // Start with base risk
        let size = this.config.limits.maxRiskPerTrade;
        
        // Adjust based on confidence (70-100 scale)
        if (confidence >= 90) size *= 1.3;
        else if (confidence >= 80) size *= 1.15;
        else if (confidence >= 70) size *= 1.0;
        else if (confidence >= 60) size *= 0.75;
        else size *= 0.5;
        
        // Adjust based on recent performance
        if (this.state.performance.winRate > 0.60) size *= 1.1;
        else if (this.state.performance.winRate < 0.40) size *= 0.8;
        
        // Ensure minimum edge
        const expectedValue = this.calculateExpectedValue(confidence);
        if (expectedValue < this.config.kelly.minEdge) {
            size *= 0.5;
        }
        
        return size;
    },

    calculateExpectedValue(confidence) {
        // EV = (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
        const winRate = confidence / 100;
        const lossRate = 1 - winRate;
        const avgWin = 2.5; // Assumed R:R
        const avgLoss = 1.0;
        
        return (winRate * avgWin) - (lossRate * avgLoss);
    },

    applyDrawdownAdjustment(size) {
        const zone = this.state.drawdownState.zone;
        
        switch (zone) {
            case 'yellow':
                return size * 0.5;
            case 'red':
                return size * 0.25;
            case 'pause':
                return 0;
            default:
                return size;
        }
    },

    applyVolatilityAdjustment(size, symbol) {
        // Would use actual volatility data
        // For now, reduce size for high-volatility assets
        const highVolAssets = ['PEPEUSDT', 'BONKUSDT', 'WIFUSDT', 'SHIBUSDT'];
        if (highVolAssets.includes(symbol)) {
            return size * 0.7;
        }
        return size;
    },

    applyConfidenceAdjustment(size, confidence) {
        const multiplier = this.config.confidenceMultipliers || {
            90: 1.3,
            80: 1.1,
            70: 1.0,
            60: 0.8,
            50: 0.6
        };
        
        if (confidence >= 90) return size * 1.3;
        if (confidence >= 80) return size * 1.1;
        if (confidence >= 70) return size * 1.0;
        if (confidence >= 60) return size * 0.8;
        return size * 0.6;
    },

    calculateTakeProfitLevels(entry, stop, riskDistance) {
        const direction = entry > stop ? 'long' : 'short';
        
        return this.config.takeProfit.levels.map((level, index) => {
            const targetDistance = riskDistance * level.target;
            const targetPrice = direction === 'long' 
                ? entry + targetDistance 
                : entry - targetDistance;
            
            return {
                level: index + 1,
                price: Math.round(targetPrice * 100) / 100,
                riskReward: level.target,
                closePercent: level.closePercent * 100,
                profit: Math.round(targetDistance * 100) / 100
            };
        });
    },

    // ========================================
    // TRADE VALIDATION
    // ========================================
    
    canOpenTrade(symbol) {
        // Check if in pause zone
        if (this.state.drawdownState.zone === 'pause') {
            if (this.state.drawdownState.pausedUntil > Date.now()) {
                return { allowed: false, reason: 'Trading pausado por drawdown excessivo' };
            }
        }

        // Check daily risk limit
        if (this.state.dailyStats.riskUsed >= this.config.limits.maxRiskPerDay) {
            return { allowed: false, reason: 'Limite de risco diário atingido' };
        }

        // Check weekly risk limit
        if (this.state.weeklyStats.riskUsed >= this.config.limits.maxRiskPerWeek) {
            return { allowed: false, reason: 'Limite de risco semanal atingido' };
        }

        // Check max open positions
        if (this.state.positions.length >= this.config.limits.maxOpenPositions) {
            return { allowed: false, reason: 'Número máximo de posições abertas' };
        }

        // Check if already have position in this asset
        const existingPosition = this.state.positions.find(p => p.symbol === symbol);
        if (existingPosition) {
            return { allowed: false, reason: 'Já existe posição aberta neste ativo' };
        }

        // Check sector exposure
        const sector = this.getSector(symbol);
        const sectorExposure = this.calculateSectorExposure(sector);
        if (sectorExposure >= this.config.limits.maxSectorExposure) {
            return { allowed: false, reason: `Exposição máxima ao setor ${sector} atingida` };
        }

        // Check correlated positions
        const correlatedCount = this.countCorrelatedPositions(symbol);
        if (correlatedCount >= this.config.limits.maxCorrelatedPositions) {
            return { allowed: false, reason: 'Muitas posições em ativos correlacionados' };
        }

        return { allowed: true };
    },

    getSector(symbol) {
        for (const [sector, symbols] of Object.entries(this.config.sectors)) {
            if (symbols.includes(symbol)) return sector;
        }
        return 'other';
    },

    calculateSectorExposure(sector) {
        const sectorPositions = this.state.positions.filter(
            p => this.getSector(p.symbol) === sector
        );
        const totalExposure = sectorPositions.reduce(
            (sum, p) => sum + (p.positionValue / this.config.capital.current), 
            0
        );
        return totalExposure;
    },

    countCorrelatedPositions(symbol) {
        const sector = this.getSector(symbol);
        return this.state.positions.filter(
            p => this.getSector(p.symbol) === sector
        ).length;
    },

    // ========================================
    // STOP LOSS MANAGEMENT
    // ========================================
    
    calculateStopLoss(params) {
        const { entry, direction, atr, structure, type = this.config.stopLoss.type } = params;
        
        let stopPrice;
        
        switch (type) {
            case 'atr':
                const atrStop = atr * this.config.stopLoss.atrMultiplier;
                stopPrice = direction === 'long' ? entry - atrStop : entry + atrStop;
                break;
                
            case 'structure':
                // Use market structure (swing low/high)
                stopPrice = structure || (direction === 'long' 
                    ? entry * (1 - this.config.stopLoss.fixedPercent)
                    : entry * (1 + this.config.stopLoss.fixedPercent));
                break;
                
            case 'volatility':
                // Use volatility bands
                const volStop = entry * this.config.stopLoss.fixedPercent * 1.5;
                stopPrice = direction === 'long' ? entry - volStop : entry + volStop;
                break;
                
            default: // fixed
                const fixedStop = entry * this.config.stopLoss.fixedPercent;
                stopPrice = direction === 'long' ? entry - fixedStop : entry + fixedStop;
        }
        
        return Math.round(stopPrice * 100) / 100;
    },

    updateTrailingStop(position, currentPrice) {
        const { entry, direction, stopLoss, highestPrice, lowestPrice } = position;
        
        // Calculate current profit
        const profitPercent = direction === 'long'
            ? (currentPrice - entry) / entry
            : (entry - currentPrice) / entry;
        
        // Check if trailing should be activated
        if (profitPercent < this.config.stopLoss.trailingActivation) {
            return { updated: false, newStop: stopLoss };
        }
        
        // Calculate trailing stop
        let newStop;
        if (direction === 'long') {
            const peak = Math.max(highestPrice || entry, currentPrice);
            const trailStop = peak * (1 - this.config.stopLoss.trailingDistance);
            newStop = Math.max(stopLoss, trailStop);
        } else {
            const trough = Math.min(lowestPrice || entry, currentPrice);
            const trailStop = trough * (1 + this.config.stopLoss.trailingDistance);
            newStop = Math.min(stopLoss, trailStop);
        }
        
        return {
            updated: newStop !== stopLoss,
            newStop: Math.round(newStop * 100) / 100,
            type: 'trailing'
        };
    },

    checkBreakevenStop(position, currentPrice) {
        const { entry, direction, stopLoss } = position;
        
        const profitPercent = direction === 'long'
            ? (currentPrice - entry) / entry
            : (entry - currentPrice) / entry;
        
        // Check if breakeven should be activated
        if (profitPercent >= this.config.stopLoss.breakEvenActivation) {
            // Move stop to entry + small buffer
            const buffer = entry * 0.001; // 0.1% buffer
            const newStop = direction === 'long' ? entry + buffer : entry - buffer;
            
            // Only if it improves the stop
            if ((direction === 'long' && newStop > stopLoss) ||
                (direction === 'short' && newStop < stopLoss)) {
                return {
                    activated: true,
                    newStop: Math.round(newStop * 100) / 100,
                    type: 'breakeven'
                };
            }
        }
        
        return { activated: false };
    },

    // ========================================
    // POSITION MANAGEMENT
    // ========================================
    
    openPosition(params) {
        const sizing = this.calculatePositionSize(params);
        
        if (!sizing.valid) {
            return { success: false, error: sizing.error };
        }
        
        const position = {
            id: `pos_${Date.now()}`,
            symbol: params.symbol,
            direction: params.entryPrice > params.stopLoss ? 'long' : 'short',
            entry: sizing.entryPrice,
            stopLoss: sizing.stopLoss,
            quantity: sizing.quantity,
            positionValue: sizing.positionValue,
            riskAmount: sizing.riskAmount,
            riskPercent: sizing.riskPercent,
            takeProfitLevels: sizing.takeProfitLevels,
            openTime: Date.now(),
            status: 'open',
            highestPrice: sizing.entryPrice,
            lowestPrice: sizing.entryPrice,
            partialCloses: [],
            stopHistory: [{ price: sizing.stopLoss, type: 'initial', time: Date.now() }]
        };
        
        this.state.positions.push(position);
        this.state.dailyStats.riskUsed += sizing.riskPercent / 100;
        this.state.weeklyStats.riskUsed += sizing.riskPercent / 100;
        this.state.dailyStats.tradesCount++;
        
        this.saveState();
        
        return { success: true, position };
    },

    updatePosition(positionId, currentPrice) {
        const position = this.state.positions.find(p => p.id === positionId);
        if (!position) return { updated: false, error: 'Posição não encontrada' };
        
        // Update high/low
        position.highestPrice = Math.max(position.highestPrice, currentPrice);
        position.lowestPrice = Math.min(position.lowestPrice, currentPrice);
        
        const updates = [];
        
        // Check breakeven
        const beCheck = this.checkBreakevenStop(position, currentPrice);
        if (beCheck.activated) {
            position.stopLoss = beCheck.newStop;
            position.stopHistory.push({ 
                price: beCheck.newStop, 
                type: beCheck.type, 
                time: Date.now() 
            });
            updates.push('breakeven');
        }
        
        // Check trailing stop
        const trailCheck = this.updateTrailingStop(position, currentPrice);
        if (trailCheck.updated) {
            position.stopLoss = trailCheck.newStop;
            position.stopHistory.push({ 
                price: trailCheck.newStop, 
                type: trailCheck.type, 
                time: Date.now() 
            });
            updates.push('trailing');
        }
        
        // Check stop loss hit
        const stopHit = position.direction === 'long'
            ? currentPrice <= position.stopLoss
            : currentPrice >= position.stopLoss;
        
        if (stopHit) {
            return this.closePosition(positionId, currentPrice, 'stop_loss');
        }
        
        // Check take profit levels
        for (const tp of position.takeProfitLevels) {
            if (tp.hit) continue;
            
            const tpHit = position.direction === 'long'
                ? currentPrice >= tp.price
                : currentPrice <= tp.price;
            
            if (tpHit) {
                const closeQuantity = position.quantity * (tp.closePercent / 100);
                this.partialClose(positionId, closeQuantity, currentPrice, tp.level);
                tp.hit = true;
                updates.push(`tp${tp.level}`);
            }
        }
        
        this.saveState();
        
        return { updated: updates.length > 0, updates, position };
    },

    partialClose(positionId, quantity, price, tpLevel) {
        const position = this.state.positions.find(p => p.id === positionId);
        if (!position) return;
        
        const pnl = position.direction === 'long'
            ? (price - position.entry) * quantity
            : (position.entry - price) * quantity;
        
        position.partialCloses.push({
            quantity,
            price,
            pnl,
            tpLevel,
            time: Date.now()
        });
        
        position.quantity -= quantity;
        
        // Record profit
        this.state.dailyStats.pnl += pnl;
        this.state.weeklyStats.pnl += pnl;
        this.config.capital.current += pnl;
        
        this.updateDrawdown();
    },

    closePosition(positionId, closePrice, reason = 'manual') {
        const posIndex = this.state.positions.findIndex(p => p.id === positionId);
        if (posIndex === -1) return { success: false, error: 'Posição não encontrada' };
        
        const position = this.state.positions[posIndex];
        
        // Calculate final PnL
        const remainingPnl = position.direction === 'long'
            ? (closePrice - position.entry) * position.quantity
            : (position.entry - closePrice) * position.quantity;
        
        const totalPnl = remainingPnl + 
            position.partialCloses.reduce((sum, pc) => sum + pc.pnl, 0);
        
        const closedTrade = {
            ...position,
            closePrice,
            closeTime: Date.now(),
            reason,
            pnl: totalPnl,
            pnlPercent: (totalPnl / position.positionValue) * 100,
            holdingTime: Date.now() - position.openTime,
            rMultiple: totalPnl / position.riskAmount
        };
        
        // Remove from open positions
        this.state.positions.splice(posIndex, 1);
        
        // Add to closed trades
        this.state.closedTrades.push(closedTrade);
        
        // Update stats
        this.state.dailyStats.pnl += remainingPnl;
        this.state.weeklyStats.pnl += remainingPnl;
        this.config.capital.current += remainingPnl;
        
        if (totalPnl > 0) {
            this.state.dailyStats.winCount++;
        } else {
            this.state.dailyStats.lossCount++;
        }
        
        // Update performance metrics
        this.updatePerformanceMetrics();
        this.updateDrawdown();
        this.saveState();
        
        return {
            success: true,
            trade: closedTrade
        };
    },

    // ========================================
    // DRAWDOWN MANAGEMENT
    // ========================================
    
    updateDrawdown() {
        const current = this.config.capital.current;
        const peak = this.state.drawdownState.peak;
        
        // Update peak if new high
        if (current > peak) {
            this.state.drawdownState.peak = current;
        }
        
        // Calculate drawdown
        const drawdown = (this.state.drawdownState.peak - current) / this.state.drawdownState.peak;
        this.state.drawdownState.current = current;
        this.state.drawdownState.drawdown = drawdown;
        
        // Update max drawdown
        if (drawdown > this.state.drawdownState.maxDrawdown) {
            this.state.drawdownState.maxDrawdown = drawdown;
        }
        
        // Determine zone
        if (drawdown >= this.config.drawdown.pauseZone) {
            this.state.drawdownState.zone = 'pause';
            this.state.drawdownState.pausedUntil = Date.now() + 
                (this.config.drawdown.resetPeriodDays * 24 * 60 * 60 * 1000);
        } else if (drawdown >= this.config.drawdown.redZone) {
            this.state.drawdownState.zone = 'red';
        } else if (drawdown >= this.config.drawdown.yellowZone) {
            this.state.drawdownState.zone = 'yellow';
        } else {
            this.state.drawdownState.zone = 'green';
        }
        
        this.saveState();
    },

    // ========================================
    // PERFORMANCE METRICS
    // ========================================
    
    updatePerformanceMetrics() {
        const trades = this.state.closedTrades;
        if (trades.length === 0) return;
        
        const winners = trades.filter(t => t.pnl > 0);
        const losers = trades.filter(t => t.pnl <= 0);
        
        // Win rate
        this.state.performance.winRate = winners.length / trades.length;
        
        // Average win/loss
        this.state.performance.avgWin = winners.length > 0
            ? winners.reduce((sum, t) => sum + t.pnl, 0) / winners.length
            : 0;
        this.state.performance.avgLoss = losers.length > 0
            ? Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0) / losers.length)
            : 0;
        
        // Profit factor
        const grossProfit = winners.reduce((sum, t) => sum + t.pnl, 0);
        const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0));
        this.state.performance.profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit;
        
        // Expectancy
        this.state.performance.expectancy = 
            (this.state.performance.winRate * this.state.performance.avgWin) -
            ((1 - this.state.performance.winRate) * this.state.performance.avgLoss);
        
        // Sharpe Ratio (simplified)
        const returns = trades.map(t => t.pnlPercent);
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        this.state.performance.sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
        
        this.state.performance.totalTrades = trades.length;
    },

    // ========================================
    // MONTE CARLO SIMULATION
    // ========================================
    
    runMonteCarloSimulation(numSimulations = 1000, numTrades = 100) {
        const trades = this.state.closedTrades;
        if (trades.length < 20) {
            return { error: 'Insuficientes trades para simulação (mín. 20)' };
        }
        
        const results = [];
        const returnsArray = trades.map(t => t.pnlPercent);
        
        for (let sim = 0; sim < numSimulations; sim++) {
            let equity = 100;
            let maxEquity = 100;
            let maxDrawdown = 0;
            
            for (let i = 0; i < numTrades; i++) {
                // Random selection with replacement
                const randomReturn = returnsArray[Math.floor(Math.random() * returnsArray.length)];
                equity *= (1 + randomReturn / 100);
                
                if (equity > maxEquity) {
                    maxEquity = equity;
                } else {
                    const dd = (maxEquity - equity) / maxEquity;
                    if (dd > maxDrawdown) maxDrawdown = dd;
                }
            }
            
            results.push({
                finalEquity: equity,
                return: ((equity - 100) / 100) * 100,
                maxDrawdown: maxDrawdown * 100
            });
        }
        
        // Analyze results
        results.sort((a, b) => a.finalEquity - b.finalEquity);
        
        return {
            simulations: numSimulations,
            trades: numTrades,
            percentiles: {
                p5: results[Math.floor(numSimulations * 0.05)],
                p25: results[Math.floor(numSimulations * 0.25)],
                p50: results[Math.floor(numSimulations * 0.50)],
                p75: results[Math.floor(numSimulations * 0.75)],
                p95: results[Math.floor(numSimulations * 0.95)]
            },
            probabilityOfProfit: results.filter(r => r.return > 0).length / numSimulations,
            probabilityOfRuin: results.filter(r => r.return < -50).length / numSimulations,
            averageReturn: results.reduce((sum, r) => sum + r.return, 0) / numSimulations,
            averageMaxDD: results.reduce((sum, r) => sum + r.maxDrawdown, 0) / numSimulations
        };
    },

    // ========================================
    // REPORTING
    // ========================================
    
    getPortfolioSummary() {
        const openPositions = this.state.positions;
        const totalExposure = openPositions.reduce((sum, p) => sum + p.positionValue, 0);
        const unrealizedPnL = 0; // Would calculate from current prices
        
        return {
            capital: {
                initial: this.config.capital.initial,
                current: Math.round(this.config.capital.current * 100) / 100,
                pnl: Math.round((this.config.capital.current - this.config.capital.initial) * 100) / 100,
                pnlPercent: Math.round(((this.config.capital.current / this.config.capital.initial) - 1) * 10000) / 100
            },
            positions: {
                open: openPositions.length,
                maxAllowed: this.config.limits.maxOpenPositions,
                totalExposure: Math.round(totalExposure * 100) / 100,
                exposurePercent: Math.round((totalExposure / this.config.capital.current) * 10000) / 100
            },
            risk: {
                dailyUsed: Math.round(this.state.dailyStats.riskUsed * 10000) / 100,
                dailyLimit: this.config.limits.maxRiskPerDay * 100,
                weeklyUsed: Math.round(this.state.weeklyStats.riskUsed * 10000) / 100,
                weeklyLimit: this.config.limits.maxRiskPerWeek * 100
            },
            drawdown: {
                current: Math.round(this.state.drawdownState.drawdown * 10000) / 100,
                max: Math.round(this.state.drawdownState.maxDrawdown * 10000) / 100,
                zone: this.state.drawdownState.zone,
                peak: Math.round(this.state.drawdownState.peak * 100) / 100
            },
            performance: {
                winRate: Math.round(this.state.performance.winRate * 10000) / 100,
                profitFactor: Math.round(this.state.performance.profitFactor * 100) / 100,
                expectancy: Math.round(this.state.performance.expectancy * 100) / 100,
                sharpeRatio: Math.round(this.state.performance.sharpeRatio * 100) / 100,
                totalTrades: this.state.performance.totalTrades
            },
            daily: {
                date: this.state.dailyStats.date,
                pnl: Math.round(this.state.dailyStats.pnl * 100) / 100,
                trades: this.state.dailyStats.tradesCount,
                wins: this.state.dailyStats.winCount,
                losses: this.state.dailyStats.lossCount
            }
        };
    },

    getDetailedPositions() {
        return this.state.positions.map(p => ({
            id: p.id,
            symbol: p.symbol,
            direction: p.direction,
            entry: p.entry,
            currentStop: p.stopLoss,
            quantity: p.quantity,
            value: p.positionValue,
            risk: p.riskAmount,
            riskPercent: p.riskPercent,
            targets: p.takeProfitLevels,
            partialCloses: p.partialCloses.length,
            holdingTime: Math.round((Date.now() - p.openTime) / 60000), // minutes
            stopMoves: p.stopHistory.length - 1
        }));
    },

    // ========================================
    // PERSISTENCE
    // ========================================
    
    saveState() {
        try {
            const stateToSave = {
                ...this.state,
                capital: this.config.capital.current,
                savedAt: Date.now()
            };
            localStorage.setItem('smart_risk_manager_state', JSON.stringify(stateToSave));
        } catch (e) {
            console.warn('Não foi possível salvar estado do Risk Manager');
        }
    },

    loadState() {
        try {
            const saved = localStorage.getItem('smart_risk_manager_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.state = { ...this.state, ...parsed };
                if (parsed.capital) {
                    this.config.capital.current = parsed.capital;
                }
            }
        } catch (e) {
            console.warn('Não foi possível carregar estado do Risk Manager');
        }
    },

    checkDailyReset() {
        const today = new Date().toDateString();
        if (this.state.dailyStats.date !== today) {
            this.state.dailyStats = {
                date: today,
                pnl: 0,
                riskUsed: 0,
                tradesCount: 0,
                winCount: 0,
                lossCount: 0
            };
        }
        
        // Check weekly reset
        const now = new Date();
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay())).toDateString();
        if (this.state.weeklyStats.weekStart !== weekStart) {
            this.state.weeklyStats = {
                weekStart,
                pnl: 0,
                riskUsed: 0
            };
        }
    },

    // ========================================
    // EXPORT
    // ========================================
    
    exportTradeHistory() {
        return {
            trades: this.state.closedTrades,
            performance: this.state.performance,
            exportedAt: Date.now()
        };
    }
};

// Export globally
window.SmartRiskManager = SmartRiskManager;

// Initialize with default capital
SmartRiskManager.init();

console.log('💎 Smart Risk Manager pronto para uso');
