/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                  SHDW Confluence Thermometer v1.0                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Copyright (c) 2024-2026 SHDWXBT. All rights reserved.                        ║
 * ║                                                                               ║
 * ║  PROPRIETARY AND CONFIDENTIAL                                                 ║
 * ║  This file contains trade secrets and proprietary information.                ║
 * ║  Unauthorized copying, modification, distribution, or use is prohibited.      ║
 * ║  Protected by intellectual property laws and international treaties.          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * 🌡️ TERMÔMETRO VISUAL DE CONFLUÊNCIAS
 * 
 * Sistema de pontuação e visualização de confluências para:
 * - Análises da metodologia SHDWXBT
 * - Integração com Master Precision System
 * - Scoring padronizado para Supabase
 * 
 * Componentes Analisados:
 * ✅ Estrutura de Mercado (BOS/CHoCH)
 * ✅ Zonas Fibonacci (OTE, Golden Pocket, Premium/Discount)
 * ✅ Order Blocks (SMC)
 * ✅ Fair Value Gaps (FVG)
 * ✅ Momentum/Displacement
 * ✅ Multi-Timeframe Alignment
 * ✅ Risk/Reward Quality
 * ✅ Indicadores (RSI, EMAs)
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════

    const CONFIG = {
        // Thermometer Levels
        levels: {
            freezing: { min: 0, max: 20, label: 'CONGELADO', emoji: '🥶', color: '#0066FF', cssClass: 'freezing' },
            cold: { min: 20, max: 40, label: 'FRIO', emoji: '❄️', color: '#00BFFF', cssClass: 'cold' },
            neutral: { min: 40, max: 60, label: 'MORNO', emoji: '🌤️', color: '#FFD700', cssClass: 'neutral' },
            warm: { min: 60, max: 80, label: 'QUENTE', emoji: '🔥', color: '#FF8C00', cssClass: 'warm' },
            hot: { min: 80, max: 100, label: 'MUITO QUENTE', emoji: '🌋', color: '#FF0000', cssClass: 'hot' }
        },

        // Weight Categories
        weights: {
            structure: {
                label: 'Estrutura de Mercado',
                maxPoints: 20,
                items: {
                    trend_aligned: 5,
                    bos_confirmed: 8,
                    choch_detected: 10,
                    hh_hl_pattern: 5,
                    ll_lh_pattern: 5
                }
            },
            fibonacci: {
                label: 'Zonas Fibonacci',
                maxPoints: 20,
                items: {
                    in_ote: 10,
                    in_golden_pocket: 8,
                    in_discount: 6,
                    in_premium: 6,
                    near_key_level: 4
                }
            },
            smc: {
                label: 'Smart Money Concepts',
                maxPoints: 20,
                items: {
                    strong_order_block: 10,
                    high_order_block: 7,
                    fvg_present: 5,
                    liquidity_sweep: 8,
                    mitigation_block: 5
                }
            },
            momentum: {
                label: 'Momentum',
                maxPoints: 15,
                items: {
                    displacement: 8,
                    strong_body: 5,
                    volume_spike: 5,
                    rsi_confirmation: 4
                }
            },
            mtf: {
                label: 'Multi-Timeframe',
                maxPoints: 15,
                items: {
                    anchor_aligned: 5,
                    signal_aligned: 5,
                    trigger_aligned: 5,
                    all_aligned: 8
                }
            },
            risk: {
                label: 'Risco/Retorno',
                maxPoints: 10,
                items: {
                    rr_above_3: 5,
                    rr_above_2: 3,
                    clear_invalidation: 3,
                    tight_stop: 2
                }
            }
        },

        // Action Thresholds
        actions: {
            90: { action: 'ENTRADA IMEDIATA', description: 'Setup perfeito - Executar entrada', priority: 'critical' },
            80: { action: 'ENTRADA FORTE', description: 'Excelente confluência - Alta probabilidade', priority: 'high' },
            70: { action: 'ENTRADA VÁLIDA', description: 'Boa confluência - Entrada recomendada', priority: 'medium' },
            60: { action: 'AGUARDAR', description: 'Confluência moderada - Esperar mais confirmação', priority: 'low' },
            0: { action: 'NÃO OPERAR', description: 'Confluência insuficiente - Evitar entrada', priority: 'none' }
        }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFLUENCE ANALYZER CLASS
    // ═══════════════════════════════════════════════════════════════════════════

    class ConfluenceThermometer {
        constructor() {
            this.components = {};
            this.totalScore = 0;
            this.breakdown = {};
            this.activeItems = [];
        }

        /**
         * Analyze from methodology context data
         */
        analyzeFromContext(contextData) {
            this.reset();
            
            const direction = contextData.direction || contextData.direcao;
            const isBullish = direction === 'bullish' || direction === 'alta';

            // Structure Analysis
            this.analyzeStructure(contextData, isBullish);
            
            // Fibonacci Analysis
            this.analyzeFibonacci(contextData, isBullish);
            
            // Indicators
            this.analyzeIndicators(contextData, isBullish);
            
            // Multi-Timeframe
            this.analyzeMTF(contextData, isBullish);

            // Calculate total
            this.calculateTotal();

            return this.getResult();
        }

        /**
         * Analyze from Master Precision System output
         */
        analyzeFromMasterPrecision(masterAnalysis) {
            this.reset();

            const direction = masterAnalysis.signal?.direction;
            const isBullish = direction === 'LONG';

            // Structure from components
            if (masterAnalysis.components?.structure) {
                const struct = masterAnalysis.components.structure;
                
                if (struct.trend !== 0) {
                    this.addItem('structure', 'trend_aligned', struct.trend === (isBullish ? 1 : -1));
                }
                if (struct.bos?.length > 0) {
                    this.addItem('structure', 'bos_confirmed', true);
                }
                if (struct.choch?.length > 0) {
                    this.addItem('structure', 'choch_detected', true);
                }
                if (struct.structure?.includes('HH') || struct.structure?.includes('HL')) {
                    this.addItem('structure', 'hh_hl_pattern', isBullish);
                }
                if (struct.structure?.includes('LL') || struct.structure?.includes('LH')) {
                    this.addItem('structure', 'll_lh_pattern', !isBullish);
                }
            }

            // Fibonacci from components
            if (masterAnalysis.components?.fibonacci) {
                const fib = masterAnalysis.components.fibonacci;
                
                if (fib.position?.inOTE) {
                    this.addItem('fibonacci', 'in_ote', true);
                }
                if (fib.position?.nearGolden) {
                    this.addItem('fibonacci', 'in_golden_pocket', true);
                }
                if (fib.position?.position === 'discount' && isBullish) {
                    this.addItem('fibonacci', 'in_discount', true);
                }
                if (fib.position?.position === 'premium' && !isBullish) {
                    this.addItem('fibonacci', 'in_premium', true);
                }
            }

            // SMC from components
            if (masterAnalysis.components?.smc) {
                const smc = masterAnalysis.components.smc;
                
                if (smc.orderBlocks?.length > 0) {
                    const strongOB = smc.orderBlocks.find(ob => ob.tier === 'STRONG');
                    const highOB = smc.orderBlocks.find(ob => ob.tier === 'HIGH');
                    
                    if (strongOB) this.addItem('smc', 'strong_order_block', true);
                    else if (highOB) this.addItem('smc', 'high_order_block', true);
                }
                if (smc.fvg?.length > 0) {
                    this.addItem('smc', 'fvg_present', true);
                }
                if (smc.liquiditySweep) {
                    this.addItem('smc', 'liquidity_sweep', true);
                }
            }

            // Momentum from components
            if (masterAnalysis.components?.momentum) {
                const mom = masterAnalysis.components.momentum;
                
                if (mom.displacement?.isDisplacement) {
                    this.addItem('momentum', 'displacement', true);
                }
                if (mom.strength === 'strong' || mom.strength === 'very_strong') {
                    this.addItem('momentum', 'strong_body', true);
                }
            }

            // Risk from entry plan
            if (masterAnalysis.entry?.riskReward) {
                const rr = parseFloat(masterAnalysis.entry.riskReward);
                if (rr >= 3) this.addItem('risk', 'rr_above_3', true);
                else if (rr >= 2) this.addItem('risk', 'rr_above_2', true);
            }
            if (masterAnalysis.entry?.stopLoss) {
                this.addItem('risk', 'clear_invalidation', true);
            }

            this.calculateTotal();
            return this.getResult();
        }

        /**
         * Manual analysis with specific items
         */
        analyze(items) {
            this.reset();

            for (const [category, categoryItems] of Object.entries(items)) {
                if (CONFIG.weights[category]) {
                    for (const [item, value] of Object.entries(categoryItems)) {
                        if (value) {
                            this.addItem(category, item, true);
                        }
                    }
                }
            }

            this.calculateTotal();
            return this.getResult();
        }

        /**
         * Reset analyzer
         */
        reset() {
            this.components = {};
            this.totalScore = 0;
            this.breakdown = {};
            this.activeItems = [];

            for (const category of Object.keys(CONFIG.weights)) {
                this.components[category] = {
                    score: 0,
                    items: []
                };
            }
        }

        /**
         * Add item to analysis
         */
        addItem(category, item, condition = true) {
            if (!condition) return;
            
            const categoryConfig = CONFIG.weights[category];
            if (!categoryConfig || !categoryConfig.items[item]) return;

            const points = categoryConfig.items[item];
            
            // Avoid duplicates
            if (this.components[category].items.includes(item)) return;

            this.components[category].items.push(item);
            this.components[category].score += points;
            this.activeItems.push({ category, item, points });
        }

        /**
         * Analyze structure from context
         */
        analyzeStructure(ctx, isBullish) {
            const setup = (ctx.setup || '').toLowerCase();
            const trend = ctx.anchor_trend || ctx.market_structure;
            
            // Trend aligned with direction
            if ((trend === 'bullish' && isBullish) || (trend === 'bearish' && !isBullish)) {
                this.addItem('structure', 'trend_aligned', true);
            }

            // Setup patterns
            if (isBullish && (setup.includes('fundo ascendente') || setup.includes('higher low'))) {
                this.addItem('structure', 'hh_hl_pattern', true);
            }
            if (!isBullish && (setup.includes('topo descendente') || setup.includes('lower high'))) {
                this.addItem('structure', 'll_lh_pattern', true);
            }

            // BOS/CHoCH from context
            if (ctx.bos_confirmed || ctx.structure_break) {
                this.addItem('structure', 'bos_confirmed', true);
            }
            if (ctx.choch_detected || ctx.trend_reversal) {
                this.addItem('structure', 'choch_detected', true);
            }
        }

        /**
         * Analyze Fibonacci from context
         */
        analyzeFibonacci(ctx, isBullish) {
            const fibZone = ctx.fib_zone || ctx.premium_discount;
            const fibPct = ctx.fib_zone_pct || ctx.fibonacci_pct;

            // OTE Zone (61.8 - 78.6)
            if (fibZone === 'ote' || (fibPct >= 61.8 && fibPct <= 78.6)) {
                this.addItem('fibonacci', 'in_ote', true);
            }

            // Golden Pocket (61.8 - 65)
            if (fibPct >= 61.8 && fibPct <= 65) {
                this.addItem('fibonacci', 'in_golden_pocket', true);
            }

            // Premium/Discount
            if (fibZone === 'discount' && isBullish) {
                this.addItem('fibonacci', 'in_discount', true);
            }
            if (fibZone === 'premium' && !isBullish) {
                this.addItem('fibonacci', 'in_premium', true);
            }

            // Near key levels
            if (ctx.near_fib_level || ctx.at_key_level) {
                this.addItem('fibonacci', 'near_key_level', true);
            }
        }

        /**
         * Analyze indicators from context
         */
        analyzeIndicators(ctx, isBullish) {
            const rsi = ctx.rsi || ctx.rsi_value;
            
            // RSI confirmation
            if (typeof rsi === 'number') {
                if ((isBullish && rsi <= 35) || (!isBullish && rsi >= 65)) {
                    this.addItem('momentum', 'rsi_confirmation', true);
                }
            }

            // Volume
            if (ctx.volume_spike || ctx.high_volume) {
                this.addItem('momentum', 'volume_spike', true);
            }

            // Displacement
            if (ctx.displacement || ctx.strong_move) {
                this.addItem('momentum', 'displacement', true);
            }
        }

        /**
         * Analyze Multi-Timeframe from context
         */
        analyzeMTF(ctx, isBullish) {
            const anchorTrend = ctx.anchor_trend;
            const signalTrend = ctx.signal_trend;
            const targetTrend = ctx.target_trend;

            const bullishTrend = isBullish ? 'bullish' : 'bearish';

            if (anchorTrend === bullishTrend) {
                this.addItem('mtf', 'anchor_aligned', true);
            }
            if (signalTrend === bullishTrend) {
                this.addItem('mtf', 'signal_aligned', true);
            }
            if (targetTrend === bullishTrend || ctx.trigger_aligned) {
                this.addItem('mtf', 'trigger_aligned', true);
            }

            // All aligned bonus
            if (anchorTrend === bullishTrend && 
                signalTrend === bullishTrend && 
                (targetTrend === bullishTrend || ctx.trigger_aligned)) {
                this.addItem('mtf', 'all_aligned', true);
            }
        }

        /**
         * Calculate total score
         */
        calculateTotal() {
            let total = 0;
            let maxPossible = 0;

            for (const [category, config] of Object.entries(CONFIG.weights)) {
                const categoryScore = Math.min(this.components[category].score, config.maxPoints);
                this.breakdown[category] = {
                    score: categoryScore,
                    maxPoints: config.maxPoints,
                    percentage: Math.round((categoryScore / config.maxPoints) * 100),
                    items: this.components[category].items,
                    label: config.label
                };
                total += categoryScore;
                maxPossible += config.maxPoints;
            }

            this.totalScore = Math.round((total / maxPossible) * 100);
        }

        /**
         * Get thermometer level
         */
        getLevel() {
            for (const [key, level] of Object.entries(CONFIG.levels)) {
                if (this.totalScore >= level.min && this.totalScore < level.max) {
                    return { key, ...level };
                }
            }
            return { key: 'hot', ...CONFIG.levels.hot };
        }

        /**
         * Get action recommendation
         */
        getAction() {
            for (const [threshold, action] of Object.entries(CONFIG.actions).sort((a, b) => b[0] - a[0])) {
                if (this.totalScore >= parseInt(threshold)) {
                    return action;
                }
            }
            return CONFIG.actions[0];
        }

        /**
         * Get complete result
         */
        getResult() {
            const level = this.getLevel();
            const action = this.getAction();

            return {
                score: this.totalScore,
                level: level,
                action: action,
                breakdown: this.breakdown,
                activeItems: this.activeItems,
                timestamp: Date.now(),
                
                // Formatted outputs
                display: {
                    score: `${this.totalScore}/100`,
                    level: `${level.emoji} ${level.label}`,
                    action: action.action,
                    color: level.color,
                    cssClass: level.cssClass
                },
                
                // For Supabase
                forDatabase: {
                    confluence_score: this.totalScore,
                    confluence_level: level.key,
                    confluence_action: action.action,
                    confluence_breakdown: JSON.stringify(this.breakdown),
                    confluence_items: this.activeItems.length
                }
            };
        }

        /**
         * Generate HTML thermometer visualization
         */
        generateHTML(containerId = 'thermometer') {
            const result = this.getResult();
            const level = result.level;
            
            return `
            <div id="${containerId}" class="confluence-thermometer ${level.cssClass}">
                <div class="thermo-header">
                    <span class="thermo-emoji">${level.emoji}</span>
                    <span class="thermo-score">${result.score}</span>
                    <span class="thermo-label">${level.label}</span>
                </div>
                
                <div class="thermo-bar-container">
                    <div class="thermo-bar" style="width: ${result.score}%; background: ${level.color}"></div>
                    <div class="thermo-markers">
                        <span class="marker" style="left: 20%">20</span>
                        <span class="marker" style="left: 40%">40</span>
                        <span class="marker" style="left: 60%">60</span>
                        <span class="marker" style="left: 80%">80</span>
                    </div>
                </div>
                
                <div class="thermo-action" style="background: ${level.color}20; border-color: ${level.color}">
                    <strong>${result.action.action}</strong>
                    <p>${result.action.description}</p>
                </div>
                
                <div class="thermo-breakdown">
                    ${Object.entries(result.breakdown).map(([key, data]) => `
                        <div class="breakdown-item">
                            <span class="breakdown-label">${data.label}</span>
                            <div class="breakdown-bar">
                                <div class="breakdown-fill" style="width: ${data.percentage}%"></div>
                            </div>
                            <span class="breakdown-score">${data.score}/${data.maxPoints}</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="thermo-items">
                    <strong>Confluências Ativas (${result.activeItems.length}):</strong>
                    <ul>
                        ${result.activeItems.map(item => `
                            <li>✓ ${this.formatItemName(item.item)} (+${item.points})</li>
                        `).join('')}
                    </ul>
                </div>
            </div>`;
        }

        /**
         * Generate compact thermometer for tables/lists
         */
        generateCompactHTML() {
            const result = this.getResult();
            const level = result.level;
            
            return `
            <div class="thermo-compact ${level.cssClass}">
                <span class="thermo-emoji">${level.emoji}</span>
                <span class="thermo-score" style="color: ${level.color}">${result.score}</span>
                <div class="thermo-mini-bar">
                    <div style="width: ${result.score}%; background: ${level.color}"></div>
                </div>
            </div>`;
        }

        /**
         * Format item name for display
         */
        formatItemName(item) {
            const names = {
                trend_aligned: 'Tendência alinhada',
                bos_confirmed: 'BOS confirmado',
                choch_detected: 'CHoCH detectado',
                hh_hl_pattern: 'Padrão HH/HL',
                ll_lh_pattern: 'Padrão LL/LH',
                in_ote: 'Na zona OTE',
                in_golden_pocket: 'No Golden Pocket',
                in_discount: 'Zona de desconto',
                in_premium: 'Zona de prêmio',
                near_key_level: 'Próximo de nível chave',
                strong_order_block: 'Order Block forte',
                high_order_block: 'Order Block alto',
                fvg_present: 'FVG presente',
                liquidity_sweep: 'Varredura de liquidez',
                mitigation_block: 'Bloco de mitigação',
                displacement: 'Displacement',
                strong_body: 'Corpo forte',
                volume_spike: 'Spike de volume',
                rsi_confirmation: 'RSI confirma',
                anchor_aligned: 'Âncora alinhada',
                signal_aligned: 'Sinal alinhado',
                trigger_aligned: 'Gatilho alinhado',
                all_aligned: 'Todos TFs alinhados',
                rr_above_3: 'R:R > 3:1',
                rr_above_2: 'R:R > 2:1',
                clear_invalidation: 'Invalidação clara',
                tight_stop: 'Stop apertado'
            };
            return names[item] || item.replace(/_/g, ' ');
        }

        /**
         * Get CSS styles for thermometer
         */
        static getStyles() {
            return `
            <style>
            .confluence-thermometer {
                font-family: 'Inter', sans-serif;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 12px;
                padding: 20px;
                color: white;
                max-width: 400px;
            }
            
            .thermo-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 16px;
            }
            
            .thermo-emoji {
                font-size: 2.5em;
            }
            
            .thermo-score {
                font-size: 3em;
                font-weight: 700;
                background: linear-gradient(90deg, #FFD700, #FF8C00);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            
            .thermo-label {
                font-size: 1.2em;
                opacity: 0.8;
            }
            
            .thermo-bar-container {
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
                height: 24px;
                position: relative;
                margin-bottom: 16px;
            }
            
            .thermo-bar {
                height: 100%;
                border-radius: 10px;
                transition: width 0.5s ease-out;
            }
            
            .thermo-markers {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                display: flex;
                font-size: 0.7em;
                opacity: 0.5;
                padding-top: 4px;
            }
            
            .thermo-markers .marker {
                position: absolute;
                transform: translateX(-50%);
            }
            
            .thermo-action {
                padding: 12px;
                border-radius: 8px;
                border-left: 4px solid;
                margin-bottom: 16px;
            }
            
            .thermo-action strong {
                font-size: 1.1em;
                display: block;
                margin-bottom: 4px;
            }
            
            .thermo-action p {
                margin: 0;
                opacity: 0.8;
                font-size: 0.9em;
            }
            
            .thermo-breakdown {
                margin-bottom: 16px;
            }
            
            .breakdown-item {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }
            
            .breakdown-label {
                flex: 0 0 140px;
                font-size: 0.85em;
                opacity: 0.8;
            }
            
            .breakdown-bar {
                flex: 1;
                background: rgba(255,255,255,0.1);
                border-radius: 4px;
                height: 8px;
            }
            
            .breakdown-fill {
                height: 100%;
                background: linear-gradient(90deg, #00ff88, #00bfff);
                border-radius: 4px;
                transition: width 0.3s ease;
            }
            
            .breakdown-score {
                flex: 0 0 50px;
                text-align: right;
                font-size: 0.85em;
                opacity: 0.8;
            }
            
            .thermo-items {
                background: rgba(255,255,255,0.05);
                border-radius: 8px;
                padding: 12px;
                font-size: 0.85em;
            }
            
            .thermo-items ul {
                margin: 8px 0 0 0;
                padding-left: 0;
                list-style: none;
            }
            
            .thermo-items li {
                padding: 4px 0;
                color: #00ff88;
            }
            
            /* Compact version */
            .thermo-compact {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 8px;
                background: rgba(0,0,0,0.3);
                border-radius: 20px;
            }
            
            .thermo-compact .thermo-emoji {
                font-size: 1em;
            }
            
            .thermo-compact .thermo-score {
                font-size: 0.9em;
                font-weight: 700;
            }
            
            .thermo-mini-bar {
                width: 50px;
                height: 6px;
                background: rgba(255,255,255,0.2);
                border-radius: 3px;
                overflow: hidden;
            }
            
            .thermo-mini-bar > div {
                height: 100%;
                border-radius: 3px;
            }
            
            /* Level classes */
            .confluence-thermometer.freezing { border: 2px solid #0066FF; }
            .confluence-thermometer.cold { border: 2px solid #00BFFF; }
            .confluence-thermometer.neutral { border: 2px solid #FFD700; }
            .confluence-thermometer.warm { border: 2px solid #FF8C00; }
            .confluence-thermometer.hot { border: 2px solid #FF0000; }
            </style>`;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTEGRATION HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Quick analysis from context data
     */
    function analyzeContext(contextData) {
        const thermo = new ConfluenceThermometer();
        return thermo.analyzeFromContext(contextData);
    }

    /**
     * Quick analysis from Master Precision output
     */
    function analyzeMasterPrecision(masterAnalysis) {
        const thermo = new ConfluenceThermometer();
        return thermo.analyzeFromMasterPrecision(masterAnalysis);
    }

    /**
     * Create thermometer for Supabase data format
     */
    function createForSupabase(data) {
        const thermo = new ConfluenceThermometer();
        
        // Map Supabase fields to analysis
        const contextData = {
            direction: data.trend || data.direction,
            setup: data.setup || data.pattern,
            fib_zone: data.fib_zone || data.premium_discount,
            fib_zone_pct: data.fib_zone_pct,
            anchor_trend: data.anchor_trend,
            signal_trend: data.signal_trend,
            rsi: data.rsi_value || data.rsi,
            bos_confirmed: data.bos_confirmed,
            choch_detected: data.choch_detected,
            volume_spike: data.volume_spike
        };
        
        return thermo.analyzeFromContext(contextData);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EXPORT
    // ═══════════════════════════════════════════════════════════════════════════

    const ConfluenceThermo = {
        Thermometer: ConfluenceThermometer,
        analyzeContext,
        analyzeMasterPrecision,
        createForSupabase,
        getStyles: ConfluenceThermometer.getStyles,
        CONFIG,
        version: '1.0.0'
    };

    // Global export
    if (typeof window !== 'undefined') {
        window.ConfluenceThermometer = ConfluenceThermo;
        window.ConfluenceThermo = ConfluenceThermo;
    }

    // Module export
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ConfluenceThermo;
    }

    console.log('✅ SHDW Confluence Thermometer v1.0 loaded');

})();
