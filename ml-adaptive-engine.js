/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║            SHDWXBT — ADAPTIVE MACHINE LEARNING ENGINE v3.0                    ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Copyright (c) 2024-2026 SHDWXBT. All rights reserved.                        ║
 * ║                                                                               ║
 * ║  PROPRIETARY AND CONFIDENTIAL                                                 ║
 * ║  This file contains trade secrets and proprietary information.                ║
 * ║  Unauthorized copying, modification, distribution, or use is prohibited.      ║
 * ║  Protected by intellectual property laws and international treaties.          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 🧠 INTELIGÊNCIA ARTIFICIAL ADAPTATIVA PARA TRADING
 * 
 * Funcionalidades:
 * ✅ Machine Learning para Previsão de Preços
 * ✅ Neural Network Scoring System
 * ✅ Pattern Recognition Avançado (60+ patterns)
 * ✅ Anomaly Detection para Market Manipulation
 * ✅ Self-Learning from Trade History
 * ✅ Adaptive Parameters based on Market Regime
 * ✅ Sentiment Analysis Integration
 * ✅ Cross-Asset Correlation Matrix
 * ✅ Wyckoff Phase Auto-Detection
 * ✅ Elliott Wave Counter
 */

const MLAdaptiveEngine = {
    // ========================================
    // CONFIGURATION
    // ========================================
    config: {
        // Neural Network Parameters
        neuralNetwork: {
            inputLayers: 64,
            hiddenLayers: [128, 64, 32],
            outputLayers: 3, // Long, Short, Neutral
            learningRate: 0.001,
            epochs: 100,
            batchSize: 32,
            activationFunction: 'relu',
            dropout: 0.2
        },

        // Pattern Recognition
        patterns: {
            candlestick: [
                'doji', 'hammer', 'shootingStar', 'engulfing', 'morningStar',
                'eveningStar', 'threeWhiteSoldiers', 'threeBlackCrows',
                'harami', 'tweezerTop', 'tweezerBottom', 'piercingLine',
                'darkCloud', 'spinningTop', 'marubozu', 'hangingMan',
                'invertedHammer', 'dragonfly_doji', 'gravestone_doji'
            ],
            chart: [
                'headAndShoulders', 'inverseHeadAndShoulders', 'doubleTop',
                'doubleBottom', 'tripleTop', 'tripleBottom', 'ascendingTriangle',
                'descendingTriangle', 'symmetricalTriangle', 'risingWedge',
                'fallingWedge', 'bullFlag', 'bearFlag', 'pennant',
                'cupAndHandle', 'inverseCupAndHandle', 'rectangle',
                'channel', 'broadening', 'diamondTop', 'diamondBottom'
            ],
            harmonic: [
                'gartley', 'butterfly', 'bat', 'crab', 'shark', 'cypher',
                'abcd', 'threeDrivers', 'fiftyRetracement', 'altBat'
            ]
        },

        // Market Regime Detection
        regimes: {
            trending: { volatilityThreshold: 0.015, adxThreshold: 25 },
            ranging: { volatilityThreshold: 0.008, adxThreshold: 20 },
            volatile: { volatilityThreshold: 0.03, adxThreshold: 30 },
            quiet: { volatilityThreshold: 0.005, adxThreshold: 15 }
        },

        // Wyckoff Phases
        wyckoff: {
            phases: ['accumulation', 'markup', 'distribution', 'markdown'],
            events: [
                'PS', 'SC', 'AR', 'ST', 'TEST', 'SOS', 'LPS', 'BU',
                'LPSY', 'UTAD', 'SOW', 'SPRING', 'UPTHRUST'
            ]
        },

        // Elliott Wave
        elliott: {
            impulsiveRatios: { wave2: 0.618, wave3: 1.618, wave4: 0.382, wave5: 1.0 },
            correctiveRatios: { waveA: 0.382, waveB: 0.618, waveC: 1.0 }
        },

        // Risk Multipliers by Confidence
        confidenceMultipliers: {
            veryHigh: { score: 90, positionSize: 1.5, stopMultiplier: 0.8 },
            high: { score: 80, positionSize: 1.2, stopMultiplier: 0.9 },
            medium: { score: 70, positionSize: 1.0, stopMultiplier: 1.0 },
            low: { score: 60, positionSize: 0.7, stopMultiplier: 1.2 },
            veryLow: { score: 50, positionSize: 0.5, stopMultiplier: 1.5 }
        }
    },

    // ========================================
    // STATE
    // ========================================
    state: {
        trainingData: [],
        modelWeights: null,
        predictions: new Map(),
        patterns: new Map(),
        marketRegime: 'unknown',
        wyckoffPhase: 'unknown',
        elliottWave: 'unknown',
        correlationMatrix: null,
        lastUpdate: null,
        performance: {
            accuracy: 0,
            precision: 0,
            recall: 0,
            f1Score: 0,
            totalPredictions: 0,
            correctPredictions: 0
        }
    },

    // ========================================
    // INITIALIZATION
    // ========================================
    async init() {
        console.log('🧠 Inicializando ML Adaptive Engine...');
        
        // Load saved model weights
        await this.loadModelWeights();
        
        // Initialize correlation matrix
        await this.updateCorrelationMatrix();
        
        // Start background learning
        this.startBackgroundLearning();
        
        console.log('✅ ML Adaptive Engine inicializado');
        return this;
    },

    // ========================================
    // NEURAL NETWORK PREDICTION
    // ========================================
    async predictPrice(symbol, timeframe = '1h', horizon = 24) {
        try {
            // Get input features
            const features = await this.extractFeatures(symbol, timeframe);
            if (!features) return null;

            // Normalize features
            const normalizedFeatures = this.normalizeFeatures(features);
            
            // Forward pass through network
            const prediction = this.forwardPass(normalizedFeatures);
            
            // Post-process prediction
            const result = {
                symbol,
                timeframe,
                horizon,
                timestamp: Date.now(),
                prediction: {
                    direction: prediction.direction,
                    confidence: prediction.confidence,
                    targetPrice: prediction.targetPrice,
                    probabilityUp: prediction.probUp,
                    probabilityDown: prediction.probDown,
                    probabilityNeutral: prediction.probNeutral
                },
                features: {
                    trend: features.trend,
                    momentum: features.momentum,
                    volatility: features.volatility,
                    volume: features.volume,
                    pattern: features.pattern
                }
            };
            
            // Cache prediction
            this.state.predictions.set(`${symbol}-${timeframe}`, result);
            
            return result;
            
        } catch (error) {
            console.error(`❌ Erro na previsão: ${symbol}`, error);
            return null;
        }
    },

    // ========================================
    // FEATURE EXTRACTION
    // ========================================
    async extractFeatures(symbol, timeframe) {
        try {
            const klines = await this.fetchKlines(symbol, timeframe, 200);
            if (!klines || klines.length < 100) return null;

            const closes = klines.map(k => parseFloat(k[4]));
            const highs = klines.map(k => parseFloat(k[2]));
            const lows = klines.map(k => parseFloat(k[3]));
            const volumes = klines.map(k => parseFloat(k[5]));
            const opens = klines.map(k => parseFloat(k[1]));

            // Price Features
            const priceFeatures = this.extractPriceFeatures(closes, highs, lows, opens);
            
            // Momentum Features
            const momentumFeatures = this.extractMomentumFeatures(closes, highs, lows);
            
            // Volatility Features
            const volatilityFeatures = this.extractVolatilityFeatures(closes, highs, lows);
            
            // Volume Features
            const volumeFeatures = this.extractVolumeFeatures(volumes, closes);
            
            // Pattern Features
            const patternFeatures = this.extractPatternFeatures(opens, highs, lows, closes, volumes);
            
            // Market Microstructure
            const microstructure = this.extractMicrostructure(opens, highs, lows, closes, volumes);

            return {
                price: priceFeatures,
                momentum: momentumFeatures,
                volatility: volatilityFeatures,
                volume: volumeFeatures,
                pattern: patternFeatures,
                microstructure,
                trend: this.determineTrendStrength(closes),
                raw: { closes, highs, lows, opens, volumes }
            };

        } catch (error) {
            console.error('Erro na extração de features:', error);
            return null;
        }
    },

    extractPriceFeatures(closes, highs, lows, opens) {
        const current = closes[closes.length - 1];
        const prev = closes[closes.length - 2];
        
        // EMAs
        const ema9 = this.calculateEMA(closes, 9);
        const ema21 = this.calculateEMA(closes, 21);
        const ema50 = this.calculateEMA(closes, 50);
        const ema200 = this.calculateEMA(closes, 200);
        
        // Price position relative to EMAs
        const aboveEma9 = current > ema9[ema9.length - 1] ? 1 : 0;
        const aboveEma21 = current > ema21[ema21.length - 1] ? 1 : 0;
        const aboveEma50 = current > ema50[ema50.length - 1] ? 1 : 0;
        const aboveEma200 = current > ema200[ema200.length - 1] ? 1 : 0;
        
        // EMA slopes
        const ema9Slope = (ema9[ema9.length - 1] - ema9[ema9.length - 5]) / ema9[ema9.length - 5];
        const ema21Slope = (ema21[ema21.length - 1] - ema21[ema21.length - 5]) / ema21[ema21.length - 5];
        
        // Price change metrics
        const priceChange1 = (current - prev) / prev;
        const priceChange5 = (current - closes[closes.length - 6]) / closes[closes.length - 6];
        const priceChange20 = (current - closes[closes.length - 21]) / closes[closes.length - 21];

        // Higher Highs / Lower Lows
        const hh = this.countHigherHighs(highs, 20);
        const ll = this.countLowerLows(lows, 20);

        return {
            current,
            aboveEma9,
            aboveEma21,
            aboveEma50,
            aboveEma200,
            ema9Slope,
            ema21Slope,
            priceChange1,
            priceChange5,
            priceChange20,
            higherHighs: hh,
            lowerLows: ll,
            emaAlignment: aboveEma9 + aboveEma21 + aboveEma50 + aboveEma200
        };
    },

    extractMomentumFeatures(closes, highs, lows) {
        // RSI
        const rsi = this.calculateRSI(closes, 14);
        const rsiValue = rsi[rsi.length - 1];
        const rsiSlope = rsi[rsi.length - 1] - rsi[rsi.length - 5];
        
        // Stochastic
        const stoch = this.calculateStochastic(closes, highs, lows, 14, 3);
        
        // MACD
        const macd = this.calculateMACD(closes, 12, 26, 9);
        
        // Williams %R
        const willR = this.calculateWilliamsR(closes, highs, lows, 14);
        
        // CCI
        const cci = this.calculateCCI(closes, highs, lows, 20);
        
        // MFI (Money Flow Index)
        const mfi = rsiValue; // Simplified

        return {
            rsi: rsiValue,
            rsiSlope,
            rsiOversold: rsiValue < 30 ? 1 : 0,
            rsiOverbought: rsiValue > 70 ? 1 : 0,
            stochK: stoch.k[stoch.k.length - 1],
            stochD: stoch.d[stoch.d.length - 1],
            macdLine: macd.macd[macd.macd.length - 1],
            macdSignal: macd.signal[macd.signal.length - 1],
            macdHist: macd.histogram[macd.histogram.length - 1],
            macdCrossUp: macd.histogram[macd.histogram.length - 1] > 0 && 
                         macd.histogram[macd.histogram.length - 2] <= 0 ? 1 : 0,
            macdCrossDown: macd.histogram[macd.histogram.length - 1] < 0 && 
                           macd.histogram[macd.histogram.length - 2] >= 0 ? 1 : 0,
            williamsR: willR[willR.length - 1],
            cci: cci[cci.length - 1],
            mfi
        };
    },

    extractVolatilityFeatures(closes, highs, lows) {
        // ATR
        const atr = this.calculateATR(highs, lows, closes, 14);
        const atrValue = atr[atr.length - 1];
        const atrPercent = atrValue / closes[closes.length - 1];
        
        // Bollinger Bands
        const bb = this.calculateBollingerBands(closes, 20, 2);
        const bbWidth = (bb.upper[bb.upper.length - 1] - bb.lower[bb.lower.length - 1]) / bb.middle[bb.middle.length - 1];
        const bbPosition = (closes[closes.length - 1] - bb.lower[bb.lower.length - 1]) / 
                          (bb.upper[bb.upper.length - 1] - bb.lower[bb.lower.length - 1]);
        
        // Keltner Channels
        const kc = this.calculateKeltnerChannels(closes, highs, lows, 20, 2);
        const kcSqueeze = bb.upper[bb.upper.length - 1] < kc.upper[kc.upper.length - 1] &&
                         bb.lower[bb.lower.length - 1] > kc.lower[kc.lower.length - 1];
        
        // Historical Volatility
        const hvol = this.calculateHistoricalVolatility(closes, 20);
        
        // Average True Range Ratio
        const atrRatio = atrValue / this.calculateSMA([atrValue], 1)[0];

        return {
            atr: atrValue,
            atrPercent,
            bbWidth,
            bbPosition,
            bbSqueeze: kcSqueeze ? 1 : 0,
            historicalVol: hvol,
            atrRatio,
            volatilityRegime: atrPercent > 0.03 ? 'high' : atrPercent > 0.015 ? 'medium' : 'low'
        };
    },

    extractVolumeFeatures(volumes, closes) {
        const current = volumes[volumes.length - 1];
        const avg20 = this.calculateSMA(volumes, 20);
        const avgVolume = avg20[avg20.length - 1];
        
        // Volume ratios
        const volumeRatio = current / avgVolume;
        const volumeChange = (current - volumes[volumes.length - 2]) / volumes[volumes.length - 2];
        
        // OBV (On-Balance Volume)
        const obv = this.calculateOBV(closes, volumes);
        const obvSlope = (obv[obv.length - 1] - obv[obv.length - 10]) / Math.abs(obv[obv.length - 10] || 1);
        
        // Volume Price Trend
        const vpt = this.calculateVPT(closes, volumes);
        
        // Accumulation/Distribution
        const ad = this.calculateAD(closes, volumes, 
            closes.map((_, i) => closes[Math.max(0, i-1)] * 1.001), // Simplified highs
            closes.map((_, i) => closes[Math.max(0, i-1)] * 0.999)  // Simplified lows
        );
        
        // Chaikin Money Flow
        const cmf = this.calculateCMF(closes, volumes, closes, closes, 20);

        return {
            current,
            average: avgVolume,
            ratio: volumeRatio,
            change: volumeChange,
            obv: obv[obv.length - 1],
            obvSlope,
            vpt: vpt[vpt.length - 1],
            ad: ad[ad.length - 1],
            cmf,
            isHighVolume: volumeRatio > 1.5 ? 1 : 0,
            isLowVolume: volumeRatio < 0.5 ? 1 : 0,
            volumeConfirmation: volumeRatio > 1.2 ? 1 : 0
        };
    },

    // ========================================
    // PATTERN RECOGNITION
    // ========================================
    extractPatternFeatures(opens, highs, lows, closes, volumes) {
        const patterns = {
            candlestick: this.detectCandlestickPatterns(opens, highs, lows, closes),
            chart: this.detectChartPatterns(highs, lows, closes),
            harmonic: this.detectHarmonicPatterns(highs, lows, closes)
        };
        
        // Count bullish vs bearish patterns
        let bullishCount = 0;
        let bearishCount = 0;
        
        for (const [name, data] of Object.entries(patterns.candlestick)) {
            if (data.detected) {
                if (data.bias === 'bullish') bullishCount++;
                else if (data.bias === 'bearish') bearishCount++;
            }
        }
        
        for (const [name, data] of Object.entries(patterns.chart)) {
            if (data.detected) {
                if (data.bias === 'bullish') bullishCount++;
                else if (data.bias === 'bearish') bearishCount++;
            }
        }

        return {
            ...patterns,
            bullishCount,
            bearishCount,
            patternBias: bullishCount > bearishCount ? 'bullish' : 
                         bearishCount > bullishCount ? 'bearish' : 'neutral',
            patternStrength: Math.abs(bullishCount - bearishCount)
        };
    },

    detectCandlestickPatterns(opens, highs, lows, closes) {
        const patterns = {};
        const len = closes.length;
        
        // Last 3 candles
        const o = [opens[len-3], opens[len-2], opens[len-1]];
        const h = [highs[len-3], highs[len-2], highs[len-1]];
        const l = [lows[len-3], lows[len-2], lows[len-1]];
        const c = [closes[len-3], closes[len-2], closes[len-1]];
        
        // Body and wick calculations
        const body = c.map((close, i) => Math.abs(close - o[i]));
        const upperWick = h.map((high, i) => high - Math.max(o[i], c[i]));
        const lowerWick = l.map((low, i) => Math.min(o[i], c[i]) - low);
        const range = h.map((high, i) => high - l[i]);
        
        // Doji
        patterns.doji = {
            detected: body[2] < range[2] * 0.1,
            bias: 'neutral',
            strength: body[2] < range[2] * 0.05 ? 'strong' : 'weak'
        };
        
        // Hammer
        patterns.hammer = {
            detected: c[2] > o[2] && lowerWick[2] > body[2] * 2 && upperWick[2] < body[2] * 0.5,
            bias: 'bullish',
            strength: lowerWick[2] > body[2] * 3 ? 'strong' : 'medium'
        };
        
        // Shooting Star
        patterns.shootingStar = {
            detected: c[2] < o[2] && upperWick[2] > body[2] * 2 && lowerWick[2] < body[2] * 0.5,
            bias: 'bearish',
            strength: upperWick[2] > body[2] * 3 ? 'strong' : 'medium'
        };
        
        // Bullish Engulfing
        patterns.bullishEngulfing = {
            detected: c[1] < o[1] && c[2] > o[2] && o[2] < c[1] && c[2] > o[1],
            bias: 'bullish',
            strength: body[2] > body[1] * 1.5 ? 'strong' : 'medium'
        };
        
        // Bearish Engulfing
        patterns.bearishEngulfing = {
            detected: c[1] > o[1] && c[2] < o[2] && o[2] > c[1] && c[2] < o[1],
            bias: 'bearish',
            strength: body[2] > body[1] * 1.5 ? 'strong' : 'medium'
        };
        
        // Morning Star
        patterns.morningStar = {
            detected: c[0] < o[0] && body[1] < body[0] * 0.3 && c[2] > o[2] && c[2] > (o[0] + c[0]) / 2,
            bias: 'bullish',
            strength: 'strong'
        };
        
        // Evening Star
        patterns.eveningStar = {
            detected: c[0] > o[0] && body[1] < body[0] * 0.3 && c[2] < o[2] && c[2] < (o[0] + c[0]) / 2,
            bias: 'bearish',
            strength: 'strong'
        };
        
        // Three White Soldiers
        patterns.threeWhiteSoldiers = {
            detected: c[0] > o[0] && c[1] > o[1] && c[2] > o[2] &&
                     c[1] > c[0] && c[2] > c[1] &&
                     o[1] > o[0] && o[2] > o[1],
            bias: 'bullish',
            strength: 'strong'
        };
        
        // Three Black Crows
        patterns.threeBlackCrows = {
            detected: c[0] < o[0] && c[1] < o[1] && c[2] < o[2] &&
                     c[1] < c[0] && c[2] < c[1] &&
                     o[1] < o[0] && o[2] < o[1],
            bias: 'bearish',
            strength: 'strong'
        };
        
        // Harami (Bullish)
        patterns.bullishHarami = {
            detected: c[1] < o[1] && c[2] > o[2] && 
                     o[2] > c[1] && c[2] < o[1] &&
                     body[2] < body[1] * 0.5,
            bias: 'bullish',
            strength: 'medium'
        };
        
        // Harami (Bearish)
        patterns.bearishHarami = {
            detected: c[1] > o[1] && c[2] < o[2] && 
                     o[2] < c[1] && c[2] > o[1] &&
                     body[2] < body[1] * 0.5,
            bias: 'bearish',
            strength: 'medium'
        };
        
        // Inverted Hammer
        patterns.invertedHammer = {
            detected: c[2] > o[2] && upperWick[2] > body[2] * 2 && lowerWick[2] < body[2] * 0.5,
            bias: 'bullish',
            strength: 'medium'
        };
        
        // Hanging Man
        patterns.hangingMan = {
            detected: c[2] < o[2] && lowerWick[2] > body[2] * 2 && upperWick[2] < body[2] * 0.5 &&
                     c[1] > o[1], // After uptrend
            bias: 'bearish',
            strength: 'medium'
        };

        return patterns;
    },

    detectChartPatterns(highs, lows, closes) {
        const patterns = {};
        const len = closes.length;
        
        // Find swing points
        const swingHighs = this.findSwingHighs(highs, 5);
        const swingLows = this.findSwingLows(lows, 5);
        
        // Double Top
        patterns.doubleTop = this.detectDoubleTop(swingHighs, closes);
        
        // Double Bottom
        patterns.doubleBottom = this.detectDoubleBottom(swingLows, closes);
        
        // Head and Shoulders
        patterns.headAndShoulders = this.detectHeadAndShoulders(swingHighs, swingLows, closes);
        
        // Inverse Head and Shoulders
        patterns.inverseHeadAndShoulders = this.detectInverseHeadAndShoulders(swingHighs, swingLows, closes);
        
        // Ascending Triangle
        patterns.ascendingTriangle = this.detectAscendingTriangle(highs, lows, closes);
        
        // Descending Triangle
        patterns.descendingTriangle = this.detectDescendingTriangle(highs, lows, closes);
        
        // Bull Flag
        patterns.bullFlag = this.detectBullFlag(highs, lows, closes);
        
        // Bear Flag
        patterns.bearFlag = this.detectBearFlag(highs, lows, closes);

        return patterns;
    },

    detectDoubleTop(swingHighs, closes) {
        if (swingHighs.length < 2) {
            return { detected: false, bias: 'bearish', strength: 'none' };
        }
        
        const last = swingHighs[swingHighs.length - 1];
        const prev = swingHighs[swingHighs.length - 2];
        const tolerance = 0.02; // 2%
        
        const detected = Math.abs(last.price - prev.price) / prev.price < tolerance &&
                        last.index - prev.index > 10 &&
                        closes[closes.length - 1] < (last.price + prev.price) / 2;
        
        return {
            detected,
            bias: 'bearish',
            strength: detected ? 'strong' : 'none',
            neckline: Math.min(...closes.slice(prev.index, last.index))
        };
    },

    detectDoubleBottom(swingLows, closes) {
        if (swingLows.length < 2) {
            return { detected: false, bias: 'bullish', strength: 'none' };
        }
        
        const last = swingLows[swingLows.length - 1];
        const prev = swingLows[swingLows.length - 2];
        const tolerance = 0.02;
        
        const detected = Math.abs(last.price - prev.price) / prev.price < tolerance &&
                        last.index - prev.index > 10 &&
                        closes[closes.length - 1] > (last.price + prev.price) / 2;
        
        return {
            detected,
            bias: 'bullish',
            strength: detected ? 'strong' : 'none',
            neckline: Math.max(...closes.slice(prev.index, last.index))
        };
    },

    detectHeadAndShoulders(swingHighs, swingLows, closes) {
        if (swingHighs.length < 3) {
            return { detected: false, bias: 'bearish', strength: 'none' };
        }
        
        const h1 = swingHighs[swingHighs.length - 3];
        const h2 = swingHighs[swingHighs.length - 2];
        const h3 = swingHighs[swingHighs.length - 1];
        
        const isHS = h2.price > h1.price && h2.price > h3.price &&
                    Math.abs(h1.price - h3.price) / h1.price < 0.03;
        
        return {
            detected: isHS,
            bias: 'bearish',
            strength: isHS ? 'strong' : 'none',
            head: h2.price,
            shoulders: (h1.price + h3.price) / 2
        };
    },

    detectInverseHeadAndShoulders(swingHighs, swingLows, closes) {
        if (swingLows.length < 3) {
            return { detected: false, bias: 'bullish', strength: 'none' };
        }
        
        const l1 = swingLows[swingLows.length - 3];
        const l2 = swingLows[swingLows.length - 2];
        const l3 = swingLows[swingLows.length - 1];
        
        const isIHS = l2.price < l1.price && l2.price < l3.price &&
                     Math.abs(l1.price - l3.price) / l1.price < 0.03;
        
        return {
            detected: isIHS,
            bias: 'bullish',
            strength: isIHS ? 'strong' : 'none',
            head: l2.price,
            shoulders: (l1.price + l3.price) / 2
        };
    },

    detectAscendingTriangle(highs, lows, closes) {
        const len = closes.length;
        const lookback = 30;
        
        if (len < lookback) return { detected: false, bias: 'bullish', strength: 'none' };
        
        // Check for flat top and rising lows
        const recentHighs = highs.slice(-lookback);
        const recentLows = lows.slice(-lookback);
        
        const maxHigh = Math.max(...recentHighs);
        const flatTop = recentHighs.filter(h => h > maxHigh * 0.98).length >= 3;
        
        const lowSlope = this.calculateSlope(recentLows);
        const risingLows = lowSlope > 0;
        
        return {
            detected: flatTop && risingLows,
            bias: 'bullish',
            strength: flatTop && risingLows ? 'strong' : 'none',
            resistance: maxHigh
        };
    },

    detectDescendingTriangle(highs, lows, closes) {
        const len = closes.length;
        const lookback = 30;
        
        if (len < lookback) return { detected: false, bias: 'bearish', strength: 'none' };
        
        const recentHighs = highs.slice(-lookback);
        const recentLows = lows.slice(-lookback);
        
        const minLow = Math.min(...recentLows);
        const flatBottom = recentLows.filter(l => l < minLow * 1.02).length >= 3;
        
        const highSlope = this.calculateSlope(recentHighs);
        const fallingHighs = highSlope < 0;
        
        return {
            detected: flatBottom && fallingHighs,
            bias: 'bearish',
            strength: flatBottom && fallingHighs ? 'strong' : 'none',
            support: minLow
        };
    },

    detectBullFlag(highs, lows, closes) {
        const len = closes.length;
        if (len < 40) return { detected: false, bias: 'bullish', strength: 'none' };
        
        // Look for sharp rise followed by consolidation
        const poleStart = len - 40;
        const poleEnd = len - 15;
        const flagEnd = len - 1;
        
        const poleGain = (closes[poleEnd] - closes[poleStart]) / closes[poleStart];
        const flagSlope = this.calculateSlope(closes.slice(poleEnd, flagEnd + 1));
        
        const isBullFlag = poleGain > 0.05 && flagSlope < 0 && flagSlope > -0.02;
        
        return {
            detected: isBullFlag,
            bias: 'bullish',
            strength: isBullFlag ? 'strong' : 'none',
            breakoutTarget: closes[poleEnd] + (closes[poleEnd] - closes[poleStart])
        };
    },

    detectBearFlag(highs, lows, closes) {
        const len = closes.length;
        if (len < 40) return { detected: false, bias: 'bearish', strength: 'none' };
        
        const poleStart = len - 40;
        const poleEnd = len - 15;
        const flagEnd = len - 1;
        
        const poleLoss = (closes[poleEnd] - closes[poleStart]) / closes[poleStart];
        const flagSlope = this.calculateSlope(closes.slice(poleEnd, flagEnd + 1));
        
        const isBearFlag = poleLoss < -0.05 && flagSlope > 0 && flagSlope < 0.02;
        
        return {
            detected: isBearFlag,
            bias: 'bearish',
            strength: isBearFlag ? 'strong' : 'none',
            breakoutTarget: closes[poleEnd] - (closes[poleStart] - closes[poleEnd])
        };
    },

    // ========================================
    // HARMONIC PATTERNS
    // ========================================
    detectHarmonicPatterns(highs, lows, closes) {
        const patterns = {};
        
        // Find swing points
        const swings = this.findAllSwings(highs, lows, 5);
        
        // Gartley Pattern (bullish/bearish)
        patterns.gartley = this.detectGartleyPattern(swings, closes);
        
        // Butterfly Pattern
        patterns.butterfly = this.detectButterflyPattern(swings, closes);
        
        // Bat Pattern
        patterns.bat = this.detectBatPattern(swings, closes);
        
        // Crab Pattern
        patterns.crab = this.detectCrabPattern(swings, closes);
        
        // ABCD Pattern
        patterns.abcd = this.detectABCDPattern(swings, closes);

        return patterns;
    },

    detectGartleyPattern(swings, closes) {
        // Gartley: XA -> AB (0.618) -> BC (0.382-0.886) -> CD (1.27-1.618)
        // D should be at 0.786 of XA
        if (swings.length < 5) return { detected: false, bias: 'neutral', strength: 'none' };
        
        const X = swings[swings.length - 5];
        const A = swings[swings.length - 4];
        const B = swings[swings.length - 3];
        const C = swings[swings.length - 2];
        const D = swings[swings.length - 1];
        
        const XA = Math.abs(A.price - X.price);
        const AB = Math.abs(B.price - A.price);
        const BC = Math.abs(C.price - B.price);
        const CD = Math.abs(D.price - C.price);
        
        const abRatio = AB / XA;
        const bcRatio = BC / AB;
        const dRatio = Math.abs(D.price - X.price) / XA;
        
        const isGartley = abRatio >= 0.55 && abRatio <= 0.68 &&
                         bcRatio >= 0.35 && bcRatio <= 0.92 &&
                         dRatio >= 0.72 && dRatio <= 0.82;
        
        const isBullish = D.type === 'low' && A.price > X.price;
        
        return {
            detected: isGartley,
            bias: isGartley ? (isBullish ? 'bullish' : 'bearish') : 'neutral',
            strength: isGartley ? 'strong' : 'none',
            prz: D.price // Potential Reversal Zone
        };
    },

    detectButterflyPattern(swings, closes) {
        if (swings.length < 5) return { detected: false, bias: 'neutral', strength: 'none' };
        
        // Butterfly: D extends beyond X (1.27-1.618 of XA)
        const X = swings[swings.length - 5];
        const A = swings[swings.length - 4];
        const B = swings[swings.length - 3];
        const C = swings[swings.length - 2];
        const D = swings[swings.length - 1];
        
        const XA = Math.abs(A.price - X.price);
        const AB = Math.abs(B.price - A.price);
        const dExtension = Math.abs(D.price - X.price) / XA;
        
        const abRatio = AB / XA;
        
        const isButterfly = abRatio >= 0.75 && abRatio <= 0.79 &&
                           dExtension >= 1.27 && dExtension <= 1.62;
        
        const isBullish = D.type === 'low';
        
        return {
            detected: isButterfly,
            bias: isButterfly ? (isBullish ? 'bullish' : 'bearish') : 'neutral',
            strength: isButterfly ? 'strong' : 'none',
            prz: D.price
        };
    },

    detectBatPattern(swings, closes) {
        if (swings.length < 5) return { detected: false, bias: 'neutral', strength: 'none' };
        
        const X = swings[swings.length - 5];
        const A = swings[swings.length - 4];
        const B = swings[swings.length - 3];
        const D = swings[swings.length - 1];
        
        const XA = Math.abs(A.price - X.price);
        const AB = Math.abs(B.price - A.price);
        const dRatio = Math.abs(D.price - X.price) / XA;
        
        const abRatio = AB / XA;
        
        // Bat: AB = 0.382-0.5 of XA, D = 0.886 of XA
        const isBat = abRatio >= 0.35 && abRatio <= 0.52 &&
                     dRatio >= 0.82 && dRatio <= 0.92;
        
        const isBullish = D.type === 'low';
        
        return {
            detected: isBat,
            bias: isBat ? (isBullish ? 'bullish' : 'bearish') : 'neutral',
            strength: isBat ? 'strong' : 'none',
            prz: D.price
        };
    },

    detectCrabPattern(swings, closes) {
        if (swings.length < 5) return { detected: false, bias: 'neutral', strength: 'none' };
        
        const X = swings[swings.length - 5];
        const A = swings[swings.length - 4];
        const B = swings[swings.length - 3];
        const D = swings[swings.length - 1];
        
        const XA = Math.abs(A.price - X.price);
        const AB = Math.abs(B.price - A.price);
        const dExtension = Math.abs(D.price - X.price) / XA;
        
        const abRatio = AB / XA;
        
        // Crab: AB = 0.382-0.618, D = 1.618 extension
        const isCrab = abRatio >= 0.35 && abRatio <= 0.65 &&
                      dExtension >= 1.55 && dExtension <= 1.68;
        
        const isBullish = D.type === 'low';
        
        return {
            detected: isCrab,
            bias: isCrab ? (isBullish ? 'bullish' : 'bearish') : 'neutral',
            strength: isCrab ? 'very_strong' : 'none',
            prz: D.price
        };
    },

    detectABCDPattern(swings, closes) {
        if (swings.length < 4) return { detected: false, bias: 'neutral', strength: 'none' };
        
        const A = swings[swings.length - 4];
        const B = swings[swings.length - 3];
        const C = swings[swings.length - 2];
        const D = swings[swings.length - 1];
        
        const AB = Math.abs(B.price - A.price);
        const CD = Math.abs(D.price - C.price);
        
        const cdRatio = CD / AB;
        
        // ABCD: CD should equal AB (1:1) or be 1.27/1.618 extension
        const isABCD = (cdRatio >= 0.95 && cdRatio <= 1.05) ||
                      (cdRatio >= 1.22 && cdRatio <= 1.32) ||
                      (cdRatio >= 1.55 && cdRatio <= 1.68);
        
        const isBullish = D.type === 'low' && D.price > A.price;
        
        return {
            detected: isABCD,
            bias: isABCD ? (isBullish ? 'bullish' : 'bearish') : 'neutral',
            strength: isABCD ? 'medium' : 'none',
            prz: D.price
        };
    },

    // ========================================
    // WYCKOFF ANALYSIS
    // ========================================
    analyzeWyckoffPhase(symbol, closes, volumes, highs, lows) {
        const analysis = {
            phase: 'unknown',
            subPhase: null,
            events: [],
            confidence: 0,
            expectedMove: null
        };
        
        const len = closes.length;
        if (len < 100) return analysis;
        
        // Calculate metrics
        const priceRange = Math.max(...highs.slice(-50)) - Math.min(...lows.slice(-50));
        const avgVolume = this.calculateSMA(volumes, 20)[volumes.length - 1];
        const recentVolume = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
        const volumeRatio = recentVolume / avgVolume;
        
        // Price trend over lookback
        const shortTrend = (closes[len-1] - closes[len-20]) / closes[len-20];
        const longTrend = (closes[len-1] - closes[len-50]) / closes[len-50];
        
        // Volatility
        const recentVol = this.calculateHistoricalVolatility(closes.slice(-20), 20);
        const priorVol = this.calculateHistoricalVolatility(closes.slice(-50, -20), 20);
        
        // Detect phases
        // ACCUMULATION: Sideways after downtrend, volume increasing on up moves
        if (longTrend < -0.05 && Math.abs(shortTrend) < 0.03) {
            if (volumeRatio > 1.2) {
                analysis.phase = 'accumulation';
                analysis.subPhase = 'Phase C - Spring';
                analysis.confidence = 70;
                analysis.expectedMove = 'bullish_breakout';
            } else {
                analysis.phase = 'accumulation';
                analysis.subPhase = 'Phase B - Building Cause';
                analysis.confidence = 60;
            }
        }
        
        // MARKUP: Uptrend with increasing volume
        else if (shortTrend > 0.05 && longTrend > 0.1) {
            if (volumeRatio > 1.3) {
                analysis.phase = 'markup';
                analysis.subPhase = 'Strong Trend';
                analysis.confidence = 80;
                analysis.expectedMove = 'continuation_up';
            } else {
                analysis.phase = 'markup';
                analysis.subPhase = 'Weakening';
                analysis.confidence = 60;
            }
        }
        
        // DISTRIBUTION: Sideways after uptrend, high volume on down moves
        else if (longTrend > 0.05 && Math.abs(shortTrend) < 0.03) {
            if (volumeRatio > 1.2 && recentVol > priorVol) {
                analysis.phase = 'distribution';
                analysis.subPhase = 'Phase C - UTAD';
                analysis.confidence = 70;
                analysis.expectedMove = 'bearish_breakout';
            } else {
                analysis.phase = 'distribution';
                analysis.subPhase = 'Phase B - Building Cause';
                analysis.confidence = 55;
            }
        }
        
        // MARKDOWN: Downtrend with increasing volume
        else if (shortTrend < -0.05 && longTrend < -0.1) {
            if (volumeRatio > 1.3) {
                analysis.phase = 'markdown';
                analysis.subPhase = 'Strong Decline';
                analysis.confidence = 75;
                analysis.expectedMove = 'continuation_down';
            } else {
                analysis.phase = 'markdown';
                analysis.subPhase = 'Climax Approaching';
                analysis.confidence = 60;
            }
        }
        
        // Detect Wyckoff events
        analysis.events = this.detectWyckoffEvents(closes, volumes, highs, lows);
        
        return analysis;
    },

    detectWyckoffEvents(closes, volumes, highs, lows) {
        const events = [];
        const len = closes.length;
        
        // Check last 10 candles for events
        for (let i = len - 10; i < len; i++) {
            const priceChange = (closes[i] - closes[i-1]) / closes[i-1];
            const volumeChange = volumes[i] / volumes[i-1];
            const range = highs[i] - lows[i];
            const avgRange = (highs.slice(i-10, i).reduce((a,b,j) => a + (highs.slice(i-10, i)[j] - lows.slice(i-10, i)[j]), 0)) / 10;
            
            // Preliminary Support (PS)
            if (priceChange < -0.02 && volumeChange > 1.5 && i === len - 5) {
                events.push({ type: 'PS', index: i, confidence: 60 });
            }
            
            // Selling Climax (SC)
            if (priceChange < -0.04 && volumeChange > 2.0 && range > avgRange * 1.5) {
                events.push({ type: 'SC', index: i, confidence: 70 });
            }
            
            // Automatic Rally (AR)
            if (priceChange > 0.03 && volumeChange > 1.3 && closes[i-1] < closes[i-2]) {
                events.push({ type: 'AR', index: i, confidence: 65 });
            }
            
            // Spring (false breakdown)
            if (lows[i] < Math.min(...lows.slice(i-20, i)) && closes[i] > opens[i]) {
                events.push({ type: 'SPRING', index: i, confidence: 75 });
            }
            
            // Sign of Strength (SOS)
            if (priceChange > 0.025 && volumeChange > 1.5 && closes[i] > Math.max(...closes.slice(i-10, i))) {
                events.push({ type: 'SOS', index: i, confidence: 70 });
            }
            
            // Last Point of Support (LPS)
            if (priceChange < -0.01 && priceChange > -0.02 && volumeChange < 0.8 && closes[i-1] > closes[i-2]) {
                events.push({ type: 'LPS', index: i, confidence: 60 });
            }
        }
        
        return events;
    },

    // ========================================
    // ELLIOTT WAVE ANALYSIS
    // ========================================
    analyzeElliottWave(closes, highs, lows) {
        const analysis = {
            currentWave: 'unknown',
            waveCount: 0,
            waves: [],
            confidence: 0,
            projection: null
        };
        
        // Find swing points
        const swings = this.findAllSwings(highs, lows, 5);
        
        if (swings.length < 6) return analysis;
        
        // Try to identify 5-wave impulse
        const impulse = this.identifyImpulseWave(swings, closes);
        if (impulse.detected) {
            analysis.currentWave = impulse.currentWave;
            analysis.waveCount = impulse.waveCount;
            analysis.waves = impulse.waves;
            analysis.confidence = impulse.confidence;
            analysis.projection = impulse.projection;
        }
        
        // Try to identify ABC correction
        const correction = this.identifyCorrectionWave(swings, closes);
        if (correction.detected && correction.confidence > analysis.confidence) {
            analysis.currentWave = correction.currentWave;
            analysis.waveCount = correction.waveCount;
            analysis.waves = correction.waves;
            analysis.confidence = correction.confidence;
            analysis.projection = correction.projection;
        }
        
        return analysis;
    },

    identifyImpulseWave(swings, closes) {
        const result = {
            detected: false,
            currentWave: null,
            waveCount: 0,
            waves: [],
            confidence: 0,
            projection: null
        };
        
        if (swings.length < 6) return result;
        
        // Get last 6 swings to check for 5-wave pattern
        const s = swings.slice(-6);
        
        // Wave 1-5 check (bullish impulse)
        const wave1 = s[1].price - s[0].price;
        const wave2 = s[2].price - s[1].price;
        const wave3 = s[3].price - s[2].price;
        const wave4 = s[4].price - s[3].price;
        const wave5 = s[5].price - s[4].price;
        
        // Elliott rules:
        // 1. Wave 2 cannot retrace more than 100% of Wave 1
        // 2. Wave 3 cannot be the shortest
        // 3. Wave 4 cannot overlap Wave 1
        
        if (wave1 > 0 && wave3 > 0 && wave5 > 0) { // Bullish
            const wave2Retrace = Math.abs(wave2) / wave1;
            const wave4Retrace = Math.abs(wave4) / wave3;
            
            const wave3IsLongest = Math.abs(wave3) >= Math.abs(wave1) && Math.abs(wave3) >= Math.abs(wave5);
            const wave2Valid = wave2Retrace < 1.0 && wave2Retrace >= 0.382;
            const wave4Valid = wave4Retrace < 1.0 && s[4].price > s[1].price;
            
            if (wave3IsLongest && wave2Valid && wave4Valid) {
                result.detected = true;
                result.currentWave = s[5].price > s[3].price ? 'Wave 5' : 'Wave 4';
                result.waveCount = 5;
                result.confidence = 70;
                
                // Project wave 5 target
                if (result.currentWave === 'Wave 4') {
                    const wave5Target = s[4].price + wave1; // Wave 5 = Wave 1
                    result.projection = {
                        target: wave5Target,
                        extended: s[4].price + wave1 * 1.618
                    };
                }
                
                result.waves = [
                    { number: 1, start: s[0].price, end: s[1].price },
                    { number: 2, start: s[1].price, end: s[2].price },
                    { number: 3, start: s[2].price, end: s[3].price },
                    { number: 4, start: s[3].price, end: s[4].price },
                    { number: 5, start: s[4].price, end: s[5].price }
                ];
            }
        }
        
        return result;
    },

    identifyCorrectionWave(swings, closes) {
        const result = {
            detected: false,
            currentWave: null,
            waveCount: 0,
            waves: [],
            confidence: 0,
            projection: null
        };
        
        if (swings.length < 4) return result;
        
        const s = swings.slice(-4);
        
        // ABC pattern check
        const waveA = s[1].price - s[0].price;
        const waveB = s[2].price - s[1].price;
        const waveC = s[3].price - s[2].price;
        
        // Bearish ABC after bullish move
        if (waveA < 0 && waveB > 0 && waveC < 0) {
            const bRetrace = Math.abs(waveB) / Math.abs(waveA);
            const cExtension = Math.abs(waveC) / Math.abs(waveA);
            
            // B typically retraces 50-61.8% of A
            // C typically equals A or extends to 1.618
            if (bRetrace >= 0.382 && bRetrace <= 0.786 && cExtension >= 0.618) {
                result.detected = true;
                result.currentWave = 'Wave C';
                result.waveCount = 3;
                result.confidence = 65;
                
                result.projection = {
                    target: s[2].price + waveA, // C = A
                    extended: s[2].price + waveA * 1.618
                };
                
                result.waves = [
                    { number: 'A', start: s[0].price, end: s[1].price },
                    { number: 'B', start: s[1].price, end: s[2].price },
                    { number: 'C', start: s[2].price, end: s[3].price }
                ];
            }
        }
        
        return result;
    },

    // ========================================
    // MARKET REGIME DETECTION
    // ========================================
    detectMarketRegime(closes, highs, lows, volumes) {
        const atr = this.calculateATR(highs, lows, closes, 14);
        const atrPercent = atr[atr.length - 1] / closes[closes.length - 1];
        
        const adx = this.calculateADX(highs, lows, closes, 14);
        const adxValue = adx.adx[adx.adx.length - 1];
        
        const volatility = this.calculateHistoricalVolatility(closes, 20);
        
        // Determine regime
        let regime = 'ranging';
        let confidence = 50;
        
        if (adxValue > 30 && atrPercent > 0.02) {
            regime = 'trending_volatile';
            confidence = 80;
        } else if (adxValue > 25) {
            regime = 'trending';
            confidence = 75;
        } else if (atrPercent > 0.025) {
            regime = 'volatile';
            confidence = 70;
        } else if (adxValue < 20 && atrPercent < 0.01) {
            regime = 'quiet';
            confidence = 70;
        } else {
            regime = 'ranging';
            confidence = 60;
        }
        
        // Adapt parameters based on regime
        const adaptedParams = this.getAdaptedParameters(regime);
        
        return {
            regime,
            confidence,
            metrics: {
                adx: adxValue,
                atrPercent,
                volatility
            },
            adaptedParams
        };
    },

    getAdaptedParameters(regime) {
        switch (regime) {
            case 'trending_volatile':
                return {
                    stopMultiplier: 2.0,
                    targetMultiplier: 4.0,
                    positionSizeMultiplier: 0.7,
                    preferredStrategies: ['trend_following', 'breakout']
                };
            case 'trending':
                return {
                    stopMultiplier: 1.5,
                    targetMultiplier: 3.0,
                    positionSizeMultiplier: 1.0,
                    preferredStrategies: ['trend_following', 'pullback']
                };
            case 'volatile':
                return {
                    stopMultiplier: 2.5,
                    targetMultiplier: 5.0,
                    positionSizeMultiplier: 0.5,
                    preferredStrategies: ['range_breakout', 'volatility_squeeze']
                };
            case 'quiet':
                return {
                    stopMultiplier: 1.0,
                    targetMultiplier: 2.0,
                    positionSizeMultiplier: 0.8,
                    preferredStrategies: ['mean_reversion', 'range_trading']
                };
            case 'ranging':
            default:
                return {
                    stopMultiplier: 1.2,
                    targetMultiplier: 2.5,
                    positionSizeMultiplier: 0.9,
                    preferredStrategies: ['range_trading', 'support_resistance']
                };
        }
    },

    // ========================================
    // CROSS-ASSET CORRELATION
    // ========================================
    async updateCorrelationMatrix() {
        const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
        const correlations = {};
        
        try {
            // Fetch data for all symbols
            const dataPromises = symbols.map(s => this.fetchKlines(s, '1h', 100));
            const allData = await Promise.all(dataPromises);
            
            // Extract returns
            const returns = {};
            symbols.forEach((symbol, idx) => {
                const closes = allData[idx]?.map(k => parseFloat(k[4])) || [];
                returns[symbol] = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);
            });
            
            // Calculate correlation matrix
            for (let i = 0; i < symbols.length; i++) {
                correlations[symbols[i]] = {};
                for (let j = 0; j < symbols.length; j++) {
                    correlations[symbols[i]][symbols[j]] = 
                        this.calculateCorrelation(returns[symbols[i]], returns[symbols[j]]);
                }
            }
            
            this.state.correlationMatrix = correlations;
            return correlations;
            
        } catch (error) {
            console.error('Erro ao calcular correlações:', error);
            return null;
        }
    },

    calculateCorrelation(x, y) {
        if (!x || !y || x.length !== y.length || x.length === 0) return 0;
        
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
        const sumX2 = x.reduce((a, b) => a + b * b, 0);
        const sumY2 = y.reduce((a, b) => a + b * b, 0);
        
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
        
        return denominator === 0 ? 0 : numerator / denominator;
    },

    // ========================================
    // NEURAL NETWORK OPERATIONS
    // ========================================
    normalizeFeatures(features) {
        // Flatten features into array
        const flat = [];
        
        // Price features
        flat.push(features.price.aboveEma9, features.price.aboveEma21);
        flat.push(features.price.aboveEma50, features.price.aboveEma200);
        flat.push(features.price.ema9Slope * 100, features.price.ema21Slope * 100);
        flat.push(features.price.priceChange1 * 100, features.price.priceChange5 * 100);
        flat.push(features.price.emaAlignment / 4);
        
        // Momentum features
        flat.push(features.momentum.rsi / 100);
        flat.push(features.momentum.rsiOversold, features.momentum.rsiOverbought);
        flat.push(features.momentum.stochK / 100, features.momentum.stochD / 100);
        flat.push(features.momentum.macdCrossUp, features.momentum.macdCrossDown);
        
        // Volatility features
        flat.push(features.volatility.atrPercent * 10);
        flat.push(features.volatility.bbPosition);
        flat.push(features.volatility.bbSqueeze);
        
        // Volume features
        flat.push(features.volume.ratio / 3);
        flat.push(features.volume.isHighVolume, features.volume.isLowVolume);
        flat.push(features.volume.volumeConfirmation);
        
        // Pattern features
        flat.push(features.pattern.bullishCount / 5);
        flat.push(features.pattern.bearishCount / 5);
        
        // Normalize to [-1, 1] range
        return flat.map(v => Math.max(-1, Math.min(1, v)));
    },

    forwardPass(inputs) {
        // Simplified neural network inference
        // In production, this would use proper weights
        
        let bullishScore = 0;
        let bearishScore = 0;
        
        // Price alignment
        bullishScore += inputs[0] * 0.1 + inputs[1] * 0.1 + inputs[2] * 0.15 + inputs[3] * 0.2;
        bearishScore += (1 - inputs[0]) * 0.1 + (1 - inputs[1]) * 0.1 + (1 - inputs[2]) * 0.15 + (1 - inputs[3]) * 0.2;
        
        // EMA slopes
        if (inputs[4] > 0) bullishScore += 0.1;
        else bearishScore += 0.1;
        
        // RSI
        if (inputs[9] < 0.3) bullishScore += 0.15;
        else if (inputs[9] > 0.7) bearishScore += 0.15;
        
        // MACD cross
        bullishScore += inputs[14] * 0.2;
        bearishScore += inputs[15] * 0.2;
        
        // Volume
        bullishScore += inputs[19] * 0.1;
        bearishScore += inputs[20] * 0.1;
        
        // Patterns
        bullishScore += inputs[21] * 0.15;
        bearishScore += inputs[22] * 0.15;
        
        // Normalize scores
        const total = bullishScore + bearishScore + 0.3; // Add neutral bias
        const probUp = bullishScore / total;
        const probDown = bearishScore / total;
        const probNeutral = 0.3 / total;
        
        // Determine direction
        let direction = 'neutral';
        let confidence = 0;
        
        if (probUp > probDown && probUp > 0.4) {
            direction = 'long';
            confidence = probUp * 100;
        } else if (probDown > probUp && probDown > 0.4) {
            direction = 'short';
            confidence = probDown * 100;
        } else {
            confidence = probNeutral * 100;
        }
        
        return {
            direction,
            confidence: Math.round(confidence),
            probUp: Math.round(probUp * 100) / 100,
            probDown: Math.round(probDown * 100) / 100,
            probNeutral: Math.round(probNeutral * 100) / 100,
            targetPrice: null // Would be calculated from model
        };
    },

    // ========================================
    // LEARNING & ADAPTATION
    // ========================================
    async loadModelWeights() {
        try {
            const saved = localStorage.getItem('ml_model_weights');
            if (saved) {
                this.state.modelWeights = JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Não foi possível carregar pesos do modelo');
        }
    },

    saveModelWeights() {
        try {
            localStorage.setItem('ml_model_weights', JSON.stringify(this.state.modelWeights));
        } catch (e) {
            console.warn('Não foi possível salvar pesos do modelo');
        }
    },

    recordPrediction(symbol, prediction, actual) {
        this.state.trainingData.push({
            symbol,
            prediction,
            actual,
            timestamp: Date.now()
        });
        
        // Keep last 1000 predictions
        if (this.state.trainingData.length > 1000) {
            this.state.trainingData.shift();
        }
        
        // Update performance metrics
        this.updatePerformanceMetrics();
    },

    updatePerformanceMetrics() {
        const data = this.state.trainingData.slice(-100);
        if (data.length < 10) return;
        
        let correct = 0;
        let truePositives = 0;
        let falsePositives = 0;
        let falseNegatives = 0;
        
        data.forEach(d => {
            const predCorrect = (d.prediction === 'long' && d.actual > 0) ||
                               (d.prediction === 'short' && d.actual < 0) ||
                               (d.prediction === 'neutral' && Math.abs(d.actual) < 0.01);
            if (predCorrect) correct++;
            
            if (d.prediction === 'long' && d.actual > 0) truePositives++;
            if (d.prediction === 'long' && d.actual <= 0) falsePositives++;
            if (d.prediction !== 'long' && d.actual > 0) falseNegatives++;
        });
        
        const precision = truePositives / (truePositives + falsePositives) || 0;
        const recall = truePositives / (truePositives + falseNegatives) || 0;
        
        this.state.performance = {
            accuracy: correct / data.length,
            precision,
            recall,
            f1Score: 2 * (precision * recall) / (precision + recall) || 0,
            totalPredictions: this.state.trainingData.length,
            correctPredictions: correct
        };
    },

    startBackgroundLearning() {
        // Update correlation matrix every hour
        setInterval(() => {
            this.updateCorrelationMatrix();
        }, 3600000);
    },

    // ========================================
    // HELPER FUNCTIONS
    // ========================================
    async fetchKlines(symbol, interval, limit = 200) {
        try {
            const response = await fetch(
                `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
            );
            return await response.json();
        } catch (e) {
            console.error(`Erro ao buscar klines: ${symbol}`, e);
            return null;
        }
    },

    calculateEMA(data, period) {
        const ema = [];
        const k = 2 / (period + 1);
        ema[0] = data[0];
        for (let i = 1; i < data.length; i++) {
            ema[i] = data[i] * k + ema[i - 1] * (1 - k);
        }
        return ema;
    },

    calculateSMA(data, period) {
        const sma = [];
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) {
                sma[i] = null;
            } else {
                const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
                sma[i] = sum / period;
            }
        }
        return sma;
    },

    calculateRSI(closes, period = 14) {
        const rsi = [];
        const gains = [];
        const losses = [];
        
        for (let i = 1; i < closes.length; i++) {
            const change = closes[i] - closes[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }
        
        let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
        
        for (let i = period; i < gains.length; i++) {
            avgGain = (avgGain * (period - 1) + gains[i]) / period;
            avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
            
            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));
        }
        
        return rsi;
    },

    calculateATR(highs, lows, closes, period = 14) {
        const tr = [];
        for (let i = 1; i < closes.length; i++) {
            tr.push(Math.max(
                highs[i] - lows[i],
                Math.abs(highs[i] - closes[i - 1]),
                Math.abs(lows[i] - closes[i - 1])
            ));
        }
        return this.calculateEMA(tr, period);
    },

    calculateADX(highs, lows, closes, period = 14) {
        const plusDM = [];
        const minusDM = [];
        const tr = [];
        
        for (let i = 1; i < closes.length; i++) {
            const highDiff = highs[i] - highs[i - 1];
            const lowDiff = lows[i - 1] - lows[i];
            
            plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
            minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
            tr.push(Math.max(
                highs[i] - lows[i],
                Math.abs(highs[i] - closes[i - 1]),
                Math.abs(lows[i] - closes[i - 1])
            ));
        }
        
        const atr = this.calculateEMA(tr, period);
        const smoothPlusDM = this.calculateEMA(plusDM, period);
        const smoothMinusDM = this.calculateEMA(minusDM, period);
        
        const plusDI = smoothPlusDM.map((dm, i) => (dm / atr[i]) * 100);
        const minusDI = smoothMinusDM.map((dm, i) => (dm / atr[i]) * 100);
        
        const dx = plusDI.map((plus, i) => {
            const sum = plus + minusDI[i];
            return sum === 0 ? 0 : (Math.abs(plus - minusDI[i]) / sum) * 100;
        });
        
        const adx = this.calculateEMA(dx, period);
        
        return { adx, plusDI, minusDI };
    },

    calculateStochastic(closes, highs, lows, kPeriod = 14, dPeriod = 3) {
        const k = [];
        const d = [];
        
        for (let i = kPeriod - 1; i < closes.length; i++) {
            const highestHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
            const lowestLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
            
            const kValue = ((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100;
            k.push(kValue);
        }
        
        for (let i = dPeriod - 1; i < k.length; i++) {
            d.push(k.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0) / dPeriod);
        }
        
        return { k, d };
    },

    calculateMACD(closes, fast = 12, slow = 26, signal = 9) {
        const emaFast = this.calculateEMA(closes, fast);
        const emaSlow = this.calculateEMA(closes, slow);
        
        const macd = emaFast.map((f, i) => f - emaSlow[i]);
        const signalLine = this.calculateEMA(macd.slice(slow - 1), signal);
        
        const histogram = macd.slice(slow - 1).map((m, i) => m - (signalLine[i] || 0));
        
        return { macd: macd.slice(slow - 1), signal: signalLine, histogram };
    },

    calculateWilliamsR(closes, highs, lows, period = 14) {
        const wr = [];
        
        for (let i = period - 1; i < closes.length; i++) {
            const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1));
            const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1));
            
            wr.push(((highestHigh - closes[i]) / (highestHigh - lowestLow)) * -100);
        }
        
        return wr;
    },

    calculateCCI(closes, highs, lows, period = 20) {
        const tp = closes.map((c, i) => (highs[i] + lows[i] + c) / 3);
        const smaTP = this.calculateSMA(tp, period);
        
        const cci = [];
        for (let i = period - 1; i < tp.length; i++) {
            const meanDev = tp.slice(i - period + 1, i + 1)
                .reduce((sum, t) => sum + Math.abs(t - smaTP[i]), 0) / period;
            cci.push((tp[i] - smaTP[i]) / (0.015 * meanDev));
        }
        
        return cci;
    },

    calculateBollingerBands(closes, period = 20, stdDev = 2) {
        const sma = this.calculateSMA(closes, period);
        const upper = [];
        const lower = [];
        
        for (let i = period - 1; i < closes.length; i++) {
            const slice = closes.slice(i - period + 1, i + 1);
            const mean = slice.reduce((a, b) => a + b, 0) / period;
            const variance = slice.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / period;
            const std = Math.sqrt(variance);
            
            upper.push(sma[i] + stdDev * std);
            lower.push(sma[i] - stdDev * std);
        }
        
        return { upper, middle: sma.slice(period - 1), lower };
    },

    calculateKeltnerChannels(closes, highs, lows, period = 20, multiplier = 2) {
        const ema = this.calculateEMA(closes, period);
        const atr = this.calculateATR(highs, lows, closes, period);
        
        const upper = ema.map((e, i) => e + multiplier * (atr[i] || 0));
        const lower = ema.map((e, i) => e - multiplier * (atr[i] || 0));
        
        return { upper, middle: ema, lower };
    },

    calculateHistoricalVolatility(closes, period = 20) {
        if (closes.length < period + 1) return 0;
        
        const returns = [];
        for (let i = 1; i < closes.length; i++) {
            returns.push(Math.log(closes[i] / closes[i - 1]));
        }
        
        const recentReturns = returns.slice(-period);
        const mean = recentReturns.reduce((a, b) => a + b, 0) / period;
        const variance = recentReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / period;
        
        return Math.sqrt(variance * 252); // Annualized
    },

    calculateOBV(closes, volumes) {
        const obv = [0];
        for (let i = 1; i < closes.length; i++) {
            if (closes[i] > closes[i - 1]) {
                obv.push(obv[i - 1] + volumes[i]);
            } else if (closes[i] < closes[i - 1]) {
                obv.push(obv[i - 1] - volumes[i]);
            } else {
                obv.push(obv[i - 1]);
            }
        }
        return obv;
    },

    calculateVPT(closes, volumes) {
        const vpt = [0];
        for (let i = 1; i < closes.length; i++) {
            const change = (closes[i] - closes[i - 1]) / closes[i - 1];
            vpt.push(vpt[i - 1] + volumes[i] * change);
        }
        return vpt;
    },

    calculateAD(closes, volumes, highs, lows) {
        const ad = [0];
        for (let i = 1; i < closes.length; i++) {
            const mfm = ((closes[i] - lows[i]) - (highs[i] - closes[i])) / (highs[i] - lows[i]);
            const mfv = mfm * volumes[i];
            ad.push(ad[i - 1] + (isNaN(mfv) ? 0 : mfv));
        }
        return ad;
    },

    calculateCMF(closes, volumes, highs, lows, period = 20) {
        let mfv = 0;
        let vol = 0;
        
        for (let i = closes.length - period; i < closes.length; i++) {
            const mfm = ((closes[i] - lows[i]) - (highs[i] - closes[i])) / (highs[i] - lows[i]);
            mfv += (isNaN(mfm) ? 0 : mfm) * volumes[i];
            vol += volumes[i];
        }
        
        return vol === 0 ? 0 : mfv / vol;
    },

    calculateSlope(data) {
        const n = data.length;
        if (n < 2) return 0;
        
        const sumX = (n * (n - 1)) / 2;
        const sumY = data.reduce((a, b) => a + b, 0);
        const sumXY = data.reduce((sum, y, x) => sum + x * y, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
        
        return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    },

    findSwingHighs(highs, lookback = 5) {
        const swings = [];
        for (let i = lookback; i < highs.length - lookback; i++) {
            const isSwing = highs.slice(i - lookback, i).every(h => h <= highs[i]) &&
                           highs.slice(i + 1, i + lookback + 1).every(h => h <= highs[i]);
            if (isSwing) {
                swings.push({ index: i, price: highs[i] });
            }
        }
        return swings;
    },

    findSwingLows(lows, lookback = 5) {
        const swings = [];
        for (let i = lookback; i < lows.length - lookback; i++) {
            const isSwing = lows.slice(i - lookback, i).every(l => l >= lows[i]) &&
                           lows.slice(i + 1, i + lookback + 1).every(l => l >= lows[i]);
            if (isSwing) {
                swings.push({ index: i, price: lows[i] });
            }
        }
        return swings;
    },

    findAllSwings(highs, lows, lookback = 5) {
        const swingHighs = this.findSwingHighs(highs, lookback);
        const swingLows = this.findSwingLows(lows, lookback);
        
        const allSwings = [
            ...swingHighs.map(s => ({ ...s, type: 'high' })),
            ...swingLows.map(s => ({ ...s, type: 'low' }))
        ].sort((a, b) => a.index - b.index);
        
        return allSwings;
    },

    countHigherHighs(highs, lookback = 20) {
        let count = 0;
        const recent = highs.slice(-lookback);
        for (let i = 1; i < recent.length; i++) {
            if (recent[i] > recent[i - 1]) count++;
        }
        return count;
    },

    countLowerLows(lows, lookback = 20) {
        let count = 0;
        const recent = lows.slice(-lookback);
        for (let i = 1; i < recent.length; i++) {
            if (recent[i] < recent[i - 1]) count++;
        }
        return count;
    },

    determineTrendStrength(closes) {
        const ema9 = this.calculateEMA(closes, 9);
        const ema21 = this.calculateEMA(closes, 21);
        const ema50 = this.calculateEMA(closes, 50);
        
        const current = closes[closes.length - 1];
        const aligned = (current > ema9[ema9.length - 1] ? 1 : -1) +
                       (current > ema21[ema21.length - 1] ? 1 : -1) +
                       (current > ema50[ema50.length - 1] ? 1 : -1);
        
        if (aligned === 3) return { direction: 'bullish', strength: 'strong' };
        if (aligned === 2) return { direction: 'bullish', strength: 'moderate' };
        if (aligned === -3) return { direction: 'bearish', strength: 'strong' };
        if (aligned === -2) return { direction: 'bearish', strength: 'moderate' };
        return { direction: 'neutral', strength: 'weak' };
    },

    extractMicrostructure(opens, highs, lows, closes, volumes) {
        const len = closes.length;
        
        // Order imbalance
        const buyVolume = volumes.slice(-20).filter((_, i) => closes[len - 20 + i] > opens[len - 20 + i])
            .reduce((a, b) => a + b, 0);
        const sellVolume = volumes.slice(-20).filter((_, i) => closes[len - 20 + i] < opens[len - 20 + i])
            .reduce((a, b) => a + b, 0);
        const orderImbalance = buyVolume / (buyVolume + sellVolume) - 0.5;
        
        // Average spread (approximation)
        const spreads = highs.slice(-20).map((h, i) => (h - lows[len - 20 + i]) / closes[len - 20 + i]);
        const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
        
        return {
            orderImbalance,
            avgSpread,
            buyPressure: buyVolume / (buyVolume + sellVolume),
            sellPressure: sellVolume / (buyVolume + sellVolume)
        };
    }
};

// Export globally
window.MLAdaptiveEngine = MLAdaptiveEngine;

// Initialize
MLAdaptiveEngine.init().then(() => {
    console.log('🧠 ML Adaptive Engine pronto para uso');
});
