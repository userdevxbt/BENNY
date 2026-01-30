/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                   SHDWXBT — INSTITUTIONAL SCANNER                             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Copyright (c) 2024-2026 SHDWXBT. All rights reserved.                        ║
 * ║                                                                               ║
 * ║  PROPRIETARY AND CONFIDENTIAL                                                 ║
 * ║  This file contains trade secrets and proprietary information.                ║
 * ║  Unauthorized copying, modification, distribution, or use is prohibited.      ║
 * ║  Protected by intellectual property laws and international treaties.          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 * 
 * Scanner automático multi-timeframe institucional
 * Varre mercado 24/7 buscando setups de alta precisão
 * 
 * Features:
 * ✅ Scanner Multi-Asset (60+ criptomoedas)
 * ✅ Análise simultânea de 4 perfis (Scalping/Day/Swing/Position)
 * ✅ Filtros inteligentes de alta precisão
 * ✅ Ranking por score institucional
 * ✅ Alertas em tempo real
 */

const InstitutionalScanner = {
    // ========================================
    // CONFIGURAÇÃO
    // ========================================
    config: {
        // Assets principais para scan - EXPANDIDO para cobrir mais mercado
        watchlist: [
            // Top 20 by Market Cap
            'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT',
            'DOGEUSDT', 'SOLUSDT', 'TRXUSDT', 'DOTUSDT', 'MATICUSDT',
            'LTCUSDT', 'SHIBUSDT', 'AVAXUSDT', 'LINKUSDT', 'ATOMUSDT',
            'UNIUSDT', 'ETCUSDT', 'XLMUSDT', 'NEARUSDT', 'APTUSDT',
            // DeFi & Infra
            'AAVEUSDT', 'MKRUSDT', 'COMPUSDT', 'ARBUSDT', 'OPUSDT',
            'INJUSDT', 'TIAUSDT', 'SEIUSDT', 'SUIUSDT', 'PEPEUSDT',
            'ORDIUSDT', 'WIFUSDT', 'JUPUSDT', 'PYTHUSDT', 'JTOUSDT',
            'STXUSDT', 'IMXUSDT', 'GALAUSDT', 'SANDUSDT', 'MANAUSDT',
            // AI & Gaming
            'RNDRUSDT', 'FETUSDT', 'OCEANUSDT', 'AGIXUSDT', 'WLDUSDT',
            'FILUSDT', 'ICPUSDT', 'VETUSDT', 'ALGOUSDT', 'FTMUSDT',
            'EGLDUSDT', 'FLOWUSDT', 'XTZUSDT', 'EOSUSDT', 'ARUSDT',
            // Additional high volume pairs
            'HBARUSDT', 'QNTUSDT', 'LDOUSDT', 'CRVUSDT', 'SNXUSDT',
            'APEUSDT', 'AXSUSDT', 'GRTUSDT', 'GMXUSDT', 'DYDXUSDT',
            'RUNEUSDT', 'MINAUSDT', 'KASUSDT', 'BONKUSDT', 'ONDOUSDT',
            'ENAUSDT', 'BOMEUSDT', 'WUSDT', 'BELUSDT', 'ZROUSDT',
            // New trending
            'TAOUSDT', 'PENGUUSDT', 'MOVEUSDT', 'BLURUSDT', 'CYBERUSDT',
            'ARKMUSDT', 'PENDLEUSDT', 'ALTUSDT', '1000PEPEUSDT', '1000SHIBUSDT',
            'JASMYUSDT', 'CFXUSDT', 'AGLDUSDT', 'LPTUSDT', 'THETAUSDT',
            'KCSUSDT', 'NEOUSDT', 'ZILUSDT', 'IOSTUSDT', 'ONTUSDT',
            // More pairs
            'WOOUSDT', 'MAGICUSDT', 'RDNTUSDT', 'GLMUSDT', 'API3USDT',
            'ACHUSDT', 'LRCUSDT', 'ENSUSDT', 'MASKUSDT', 'YFIUSDT'
        ],

        // Perfis para análise simultânea
        profiles: ['scalping', 'dayTrading', 'swing', 'position'],

        // Scan intervals (ms)
        scanInterval: 60000, // 1 minuto
        quickScanInterval: 15000, // 15 segundos para top moedas

        // Filtros de qualidade - REDUZIDOS para capturar mais sinais
        filters: {
            minScore: {
                scalping: 55,      // Reduzido de 65
                dayTrading: 50,    // Reduzido de 60
                swing: 45,         // Reduzido de 55
                position: 40       // Reduzido de 50
            },
            minRiskReward: 2.5,    // Reduzido de 3.0
            minVolume: 500000,     // Reduzido de 1000000
            maxSpread: 0.003       // Aumentado de 0.002
        },

        // Top moedas para scan rápido
        topCoins: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT'],

        // Máximo de oportunidades simultâneas por perfil - AUMENTADO
        maxOpportunities: 50
    },

    // Estado do scanner
    state: {
        isRunning: false,
        lastScan: null,
        opportunities: [],
        scanHistory: [],
        stats: {
            totalScans: 0,
            opportunitiesFound: 0,
            avgScore: 0,
            topSymbol: null
        }
    },

    // ========================================
    // CONTROLE DO SCANNER
    // ========================================
    async start() {
        if (this.state.isRunning) {
            console.warn('⚠️ Scanner já está em execução');
            return;
        }

        console.log('🚀 Iniciando Institutional Scanner...');
        this.state.isRunning = true;

        // Primeiro scan imediato
        await this.performFullScan();

        // Agendar scans regulares
        this.scheduleScan();

        console.log('✅ Institutional Scanner iniciado com sucesso');
    },

    stop() {
        console.log('🛑 Parando Institutional Scanner...');
        this.state.isRunning = false;
        
        if (this.scanTimer) {
            clearInterval(this.scanTimer);
            this.scanTimer = null;
        }
        
        if (this.quickScanTimer) {
            clearInterval(this.quickScanTimer);
            this.quickScanTimer = null;
        }

        console.log('✅ Scanner parado');
    },

    scheduleScan() {
        // Full scan
        this.scanTimer = setInterval(async () => {
            if (this.state.isRunning) {
                await this.performFullScan();
            }
        }, this.config.scanInterval);

        // Quick scan para top moedas
        this.quickScanTimer = setInterval(async () => {
            if (this.state.isRunning) {
                await this.performQuickScan();
            }
        }, this.config.quickScanInterval);
    },

    // ========================================
    // SCANNING
    // ========================================
    async performFullScan() {
        const startTime = Date.now();
        console.log(`\n🔍 Full Scan iniciado - ${new Date().toLocaleTimeString()}`);
        console.log(`📊 Analisando ${this.config.watchlist.length} ativos...`);

        const newOpportunities = [];

        // Dividir em batches para não sobrecarregar
        const batchSize = 5;
        const batches = [];
        
        for (let i = 0; i < this.config.watchlist.length; i += batchSize) {
            batches.push(this.config.watchlist.slice(i, i + batchSize));
        }

        // Processar batches
        for (const batch of batches) {
            const promises = batch.map(symbol => this.analyzeSymbol(symbol));
            const results = await Promise.all(promises);
            
            // Filtrar e adicionar oportunidades válidas
            results.forEach(result => {
                if (result && result.opportunities) {
                    newOpportunities.push(...result.opportunities);
                }
            });
        }

        // Atualizar estado
        this.updateOpportunities(newOpportunities);

        const duration = Date.now() - startTime;
        this.state.lastScan = Date.now();
        this.state.stats.totalScans++;

        console.log(`✅ Full Scan completo em ${(duration / 1000).toFixed(2)}s`);
        console.log(`📈 ${newOpportunities.length} oportunidades encontradas`);

        // Emitir evento para UI
        this.emitScanComplete(newOpportunities);

        return newOpportunities;
    },

    async performQuickScan() {
        console.log(`⚡ Quick Scan - ${new Date().toLocaleTimeString()}`);

        const promises = this.config.topCoins.map(symbol => 
            this.analyzeSymbol(symbol, true)
        );
        
        const results = await Promise.all(promises);
        const opportunities = [];

        results.forEach(result => {
            if (result && result.opportunities) {
                opportunities.push(...result.opportunities);
            }
        });

        if (opportunities.length > 0) {
            this.updateOpportunities(opportunities);
            this.emitQuickScanUpdate(opportunities);
        }

        return opportunities;
    },

    async analyzeSymbol(symbol, quickMode = false) {
        try {
            const result = {
                symbol,
                timestamp: Date.now(),
                opportunities: []
            };

            // Análise para cada perfil
            const profiles = quickMode 
                ? ['dayTrading', 'swing'] // Quick mode: apenas 2 perfis
                : this.config.profiles; // Full mode: todos os perfis

            for (const profile of profiles) {
                const analysis = await InstitutionalEngine.analyzeMultiTimeframeInstitutional(
                    symbol,
                    profile
                );

                if (!analysis) continue;

                // Verificar se passa nos filtros
                if (this.passesFilters(analysis, profile)) {
                    result.opportunities.push({
                        symbol,
                        profile,
                        score: analysis.score,
                        recommendation: analysis.recommendation,
                        riskManagement: analysis.riskManagement,
                        confluence: analysis.confluence,
                        marketStructure: analysis.marketStructure,
                        smartMoney: analysis.smartMoney,
                        timeframes: analysis.timeframes,
                        timestamp: analysis.timestamp,
                        signalQuality: this.calculateSignalQuality(analysis)
                    });
                }
            }

            return result;

        } catch (error) {
            console.error(`❌ Erro ao analisar ${symbol}:`, error.message);
            return null;
        }
    },

    passesFilters(analysis, profile) {
        // Validação básica
        if (!analysis) return false;
        
        const filters = this.config.filters;

        // Filtro 1: Score mínimo
        if (!analysis.score || analysis.score < filters.minScore[profile]) {
            return false;
        }

        // Filtro 2: Risk Management válido
        if (!analysis.riskManagement || !analysis.riskManagement.valid) {
            return false;
        }

        // Filtro 3: Risk:Reward mínimo
        const minRR = parseFloat(analysis.riskManagement.minRiskReward || 0);
        if (isNaN(minRR) || minRR < filters.minRiskReward) {
            return false;
        }

        // Filtro 4: Recomendação válida
        if (!analysis.recommendation || 
            analysis.recommendation.action === 'AVOID' ||
            analysis.recommendation.action === 'MONITOR') {
            return false;
        }

        // Filtro 5: Market Structure definida
        if (!analysis.marketStructure || analysis.marketStructure.overall === 'neutral') {
            return false;
        }

        return true;
    },

    calculateSignalQuality(analysis) {
        // Validação
        if (!analysis || !analysis.recommendation || !analysis.riskManagement) {
            return 'unknown';
        }
        
        let quality = 'medium';
        
        const score = analysis.score || 0;
        const confidence = analysis.recommendation.confidence || 'low';
        const rrMin = parseFloat(analysis.riskManagement.minRiskReward || 0);

        // Critérios para quality
        if (score >= 80 && confidence === 'very_high' && rrMin >= 5) {
            quality = 'exceptional';
        } else if (score >= 75 && (confidence === 'very_high' || confidence === 'high') && rrMin >= 4) {
            quality = 'excellent';
        } else if (score >= 70 && confidence === 'high' && rrMin >= 3.5) {
            quality = 'good';
        } else if (score >= 65) {
            quality = 'medium';
        } else {
            quality = 'acceptable';
        }

        return quality;
    },

    // ========================================
    // GERENCIAMENTO DE OPORTUNIDADES
    // ========================================
    updateOpportunities(newOpportunities) {
        // Remover oportunidades antigas (mais de 1 hora)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        this.state.opportunities = this.state.opportunities.filter(
            opp => opp.timestamp > oneHourAgo
        );

        // Adicionar novas (evitando duplicatas)
        for (const newOpp of newOpportunities) {
            const exists = this.state.opportunities.find(
                opp => opp.symbol === newOpp.symbol && opp.profile === newOpp.profile
            );

            if (exists) {
                // Atualizar existente
                Object.assign(exists, newOpp);
            } else {
                // Adicionar nova
                this.state.opportunities.push(newOpp);
            }
        }

        // Ordenar por score (maior primeiro)
        this.state.opportunities.sort((a, b) => b.score - a.score);

        // Limitar quantidade por perfil
        for (const profile of this.config.profiles) {
            const profileOpps = this.state.opportunities.filter(
                opp => opp.profile === profile
            );
            
            if (profileOpps.length > this.config.maxOpportunities) {
                // Remover as de menor score
                const toRemove = profileOpps.slice(this.config.maxOpportunities);
                toRemove.forEach(opp => {
                    const index = this.state.opportunities.indexOf(opp);
                    if (index > -1) {
                        this.state.opportunities.splice(index, 1);
                    }
                });
            }
        }

        // Atualizar estatísticas
        this.updateStats();
    },

    updateStats() {
        const opps = this.state.opportunities;
        
        if (opps.length === 0) {
            this.state.stats.avgScore = 0;
            this.state.stats.topSymbol = null;
            return;
        }

        // Score médio
        const totalScore = opps.reduce((sum, opp) => sum + opp.score, 0);
        this.state.stats.avgScore = Math.round(totalScore / opps.length);

        // Total de oportunidades encontradas
        this.state.stats.opportunitiesFound = opps.length;

        // Top symbol (maior score)
        const topOpp = opps[0];
        this.state.stats.topSymbol = {
            symbol: topOpp.symbol,
            score: topOpp.score,
            profile: topOpp.profile
        };
    },

    // ========================================
    // QUERIES E FILTROS
    // ========================================
    getOpportunities(filters = {}) {
        let opportunities = [...this.state.opportunities];

        // Filtro por perfil
        if (filters.profile) {
            opportunities = opportunities.filter(
                opp => opp.profile === filters.profile
            );
        }

        // Filtro por score mínimo
        if (filters.minScore) {
            opportunities = opportunities.filter(
                opp => opp.score >= filters.minScore
            );
        }

        // Filtro por quality
        if (filters.quality) {
            opportunities = opportunities.filter(
                opp => opp.signalQuality === filters.quality
            );
        }

        // Filtro por símbolo
        if (filters.symbol) {
            opportunities = opportunities.filter(
                opp => opp.symbol.includes(filters.symbol.toUpperCase())
            );
        }

        // Filtro por direção
        if (filters.direction) {
            opportunities = opportunities.filter(
                opp => opp.marketStructure.overall === filters.direction
            );
        }

        // Ordenação
        const sortBy = filters.sortBy || 'score';
        if (sortBy === 'score') {
            opportunities.sort((a, b) => b.score - a.score);
        } else if (sortBy === 'riskReward') {
            opportunities.sort((a, b) => {
                const rrA = parseFloat(a.riskManagement.minRiskReward);
                const rrB = parseFloat(b.riskManagement.minRiskReward);
                return rrB - rrA;
            });
        } else if (sortBy === 'timestamp') {
            opportunities.sort((a, b) => b.timestamp - a.timestamp);
        }

        // Limite
        if (filters.limit) {
            opportunities = opportunities.slice(0, filters.limit);
        }

        return opportunities;
    },

    getTopOpportunities(limit = 10) {
        return this.getOpportunities({ limit, sortBy: 'score' });
    },

    getOpportunityBySymbol(symbol, profile = null) {
        if (profile) {
            return this.state.opportunities.find(
                opp => opp.symbol === symbol && opp.profile === profile
            );
        }
        
        // Retornar melhor score para o símbolo
        const symbolOpps = this.state.opportunities.filter(
            opp => opp.symbol === symbol
        );
        
        if (symbolOpps.length === 0) return null;
        
        return symbolOpps.sort((a, b) => b.score - a.score)[0];
    },

    getStats() {
        return {
            ...this.state.stats,
            isRunning: this.state.isRunning,
            lastScan: this.state.lastScan,
            totalOpportunities: this.state.opportunities.length,
            opportunitiesByProfile: this.getOpportunitiesByProfile(),
            opportunitiesByQuality: this.getOpportunitiesByQuality()
        };
    },

    getOpportunitiesByProfile() {
        const byProfile = {};
        
        for (const profile of this.config.profiles) {
            byProfile[profile] = this.state.opportunities.filter(
                opp => opp.profile === profile
            ).length;
        }
        
        return byProfile;
    },

    getOpportunitiesByQuality() {
        const byQuality = {
            exceptional: 0,
            excellent: 0,
            good: 0,
            medium: 0,
            acceptable: 0
        };
        
        this.state.opportunities.forEach(opp => {
            byQuality[opp.signalQuality]++;
        });
        
        return byQuality;
    },

    // ========================================
    // EVENTOS
    // ========================================
    emitScanComplete(opportunities) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('scanComplete', {
                detail: {
                    opportunities,
                    stats: this.getStats(),
                    timestamp: Date.now()
                }
            }));
        }
    },

    emitQuickScanUpdate(opportunities) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('quickScanUpdate', {
                detail: {
                    opportunities,
                    timestamp: Date.now()
                }
            }));
        }
    },

    // ========================================
    // ALERTAS
    // ========================================
    checkAlerts(opportunity) {
        // Alertar se exceptional quality
        if (opportunity.signalQuality === 'exceptional') {
            this.sendAlert({
                type: 'exceptional',
                symbol: opportunity.symbol,
                profile: opportunity.profile,
                score: opportunity.score,
                message: `🚀 OPORTUNIDADE EXCEPCIONAL: ${opportunity.symbol} [${opportunity.profile}] - Score ${opportunity.score}`
            });
        }
        
        // Alertar se score > 85
        if (opportunity.score >= 85) {
            this.sendAlert({
                type: 'high_score',
                symbol: opportunity.symbol,
                profile: opportunity.profile,
                score: opportunity.score,
                message: `⭐ ALTA CONFLUÊNCIA: ${opportunity.symbol} - Score ${opportunity.score}`
            });
        }
        
        // Alertar se R:R > 6
        const rr = parseFloat(opportunity.riskManagement.minRiskReward);
        if (rr >= 6) {
            this.sendAlert({
                type: 'high_rr',
                symbol: opportunity.symbol,
                profile: opportunity.profile,
                riskReward: rr,
                message: `💎 EXCELENTE R:R: ${opportunity.symbol} - ${rr}:1`
            });
        }
    },

    sendAlert(alert) {
        console.log(`🔔 ALERTA: ${alert.message}`);
        
        // Emitir evento
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tradingAlert', {
                detail: alert
            }));
        }
        
        // Poderia integrar com notificações do navegador
        // ou Telegram/Discord webhooks aqui
    }
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.InstitutionalScanner = InstitutionalScanner;
}
