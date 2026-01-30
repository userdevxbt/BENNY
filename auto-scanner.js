/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                   SHDWXBT — AUTO SCANNER                                      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Copyright (c) 2024-2026 SHDWXBT. All rights reserved.                        ║
 * ║                                                                               ║
 * ║  PROPRIETARY AND CONFIDENTIAL                                                 ║
 * ║  This file contains trade secrets and proprietary information.                ║
 * ║  Unauthorized copying, modification, distribution, or use is prohibited.      ║
 * ║  Protected by intellectual property laws and international treaties.          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
const AutoScanner = {
    config: {
        minConfluence: 70,    // Score mínimo para ser oportunidade (AUMENTADO de 50 para 70)
        watchConfluence: 50,  // Score mínimo para watchlist (AUMENTADO de 30 para 50)
        maxSymbols: 400,      // até 400 ativos por scan
        minVolume: 5000000,   // 5M USDT volume mínimo (AUMENTADO para filtrar ruído)
        batchSize: 100,       // Processar 100 símbolos por vez
        batchDelay: 2000,     // 2 segundos entre batches
        scanInterval: 300000, // 5 minutos entre scans completos (300000ms)
        route: 'all'          // Escanear todas as rotas: Scalping, Day Trading, Swing Trade
    },

    state: {
        isScanning: false,
        lastScan: null,
        totalSymbols: 0,
        processed: 0,
        opportunities: 0,
        watchlist: 0
    },

    /**
     * DEPRECATED - Obter todos os símbolos USDT da Binance
     * ⚠️ NÃO USAR - A Edge Function scan-market busca símbolos automaticamente no servidor
     * Esta função expõe chamadas de API que deveriam estar no servidor
     */
    async getAllUSDTSymbols() {
        console.warn('⚠️ getAllUSDTSymbols() is deprecated - API calls should be server-side only');
        console.log('💡 Use scan-market Edge Function instead');
        return [];
    },

    /**
     * Processar símbolos em lotes
     */
    async processBatch(symbols) {
        const results = {
            opportunities: [],
            watchlist: []
        };

        for (const symbol of symbols) {
            try {
                // Usar Edge Function (Metodologia Protegida no Servidor)
                let analysis = null;
                
                if (typeof SupabaseFunctions !== 'undefined') {
                    // Usar análise completa com metodologia protegida
                    analysis = await SupabaseFunctions.analyzeSymbol(symbol, TRADING_PROFILES.dayTrading);
                } else {
                    // Fallback: análise simples
                    const ticker = await this.getTickerData(symbol);
                    if (!ticker) continue;
                    
                    const score = this.calculateSimpleScore(ticker);
                    analysis = {
                        symbol: ticker.symbol,
                        name: ticker.symbol.replace('USDT', ''),
                        current_price: parseFloat(ticker.lastPrice),
                        price_24h_pcnt: parseFloat(ticker.priceChangePercent),
                        volume_24h: parseFloat(ticker.volume),
                        trend: parseFloat(ticker.priceChangePercent) > 0 ? 'bullish' : 'bearish',
                        trend_label: parseFloat(ticker.priceChangePercent) > 0 ? 'alta' : 'baixa',
                        setup: 'monitoramento automático',
                        analysis_title: `${ticker.symbol} - Análise Automática`,
                        analysis_text: `Ativo detectado com atividade. Volume 24h: ${ticker.volume}. Variação: ${ticker.priceChangePercent}%`,
                        confluence: {
                            score: score,
                            positive: ['Volume detectado', 'Volatilidade presente'],
                            negative: []
                        },
                        mandatory: {
                            pass: true,
                            passed: ['Volume', 'Liquidez'],
                            failed: []
                        },
                        status: 'active'
                    };
                }
                
                if (!analysis) continue;

                // Verificar score de confluência
                const score = analysis.confluence?.score || 0;
                
                if (score >= this.config.minConfluence) {
                    // Alta confluência = Oportunidade
                    results.opportunities.push(analysis);
                    console.log(`✅ Opportunity: ${symbol} (Score: ${score})`);
                } else if (score >= this.config.watchConfluence) {
                    // Média confluência = Watchlist (score 30-49)
                    results.watchlist.push(analysis);
                    console.log(`👁️ Watchlist: ${symbol} (Score: ${score})`);
                }

                this.state.processed++;
            } catch (error) {
                console.warn(`Error analyzing ${symbol}:`, error.message);
            }
        }

        return results;
    },

    /**
     * DEPRECATED - Obter dados do ticker da Binance
     * ⚠️ NÃO USAR - A Edge Function analyze-symbol busca dados automaticamente no servidor
     * Esta função expõe chamadas de API que deveriam estar no servidor
     */
    async getTickerData(symbol) {
        console.warn('⚠️ getTickerData() is deprecated - API calls should be server-side only');
        console.log('💡 Use analyze-symbol Edge Function instead');
        return null;
    },

    /**
     * Calcular score simples baseado em volume e volatilidade
     */
    calculateSimpleScore(ticker) {
        let score = 0;
        
        // Volume (0-40 pontos)
        const volume = parseFloat(ticker.quoteVolume);
        if (volume > 100000000) score += 40; // > 100M
        else if (volume > 50000000) score += 30; // > 50M
        else if (volume > 10000000) score += 20; // > 10M
        else if (volume > 1000000) score += 10; // > 1M
        
        // Volatilidade (0-30 pontos)
        const priceChange = Math.abs(parseFloat(ticker.priceChangePercent));
        if (priceChange > 10) score += 30; // > 10%
        else if (priceChange > 5) score += 20; // > 5%
        else if (priceChange > 2) score += 10; // > 2%
        
        // Trades (0-30 pontos)
        const trades = parseInt(ticker.count);
        if (trades > 100000) score += 30;
        else if (trades > 50000) score += 20;
        else if (trades > 10000) score += 10;
        
        return Math.min(score, 100);
    },

    /**
     * Scan completo de todos os símbolos - USA EDGE FUNCTION
     */
    async fullScan() {
        if (this.state.isScanning) {
            console.log('⏳ Scan already in progress...');
            return;
        }

        this.state.isScanning = true;
        this.state.processed = 0;
        this.state.opportunities = 0;
        this.state.watchlist = 0;

        console.log('🔍 Starting full market scan via Edge Function (ALL ROUTES)...');

        try {
            // Usar Edge Function scan-market que tem toda a metodologia protegida
            if (typeof SupabaseFunctions !== 'undefined' && typeof SupabaseFunctions.scanMarket === 'function') {
                console.log('📡 Calling scan-market Edge Function...');
                console.log(`   Max Symbols: ${this.config.maxSymbols}`);
                console.log(`   Min Confluence for Opportunities: ${this.config.minConfluence}`);
                console.log(`   Min Confluence for Watchlist: ${this.config.watchConfluence}`);
                console.log(`   Routes: ${this.config.route || 'all'}`);
                console.log(`   Scan Interval: ${this.config.scanInterval / 60000} minutes`);
                
                // Usar watchConfluence (30) para capturar também itens de watchlist
                const result = await SupabaseFunctions.scanMarket({
                    profile: { name: 'All Routes' },
                    maxSymbols: this.config.maxSymbols || 200,
                    minConfluence: this.config.watchConfluence || 30,  // Usar threshold mais baixo para capturar watchlist
                    minVolume: this.config.minVolume || 5000000,
                    route: this.config.route || 'all'  // Scalping + Day Trading + Swing Trade
                });

                if (result.success) {
                    this.state.opportunities = result.opportunities || 0;
                    this.state.watchlist = result.watchlist || 0;
                    this.state.processed = result.scanned || 0;
                    this.state.lastScan = new Date();

                    console.log(`✅ Edge Function scan complete!`);
                    console.log(`📊 Scanned: ${result.scanned} symbols`);
                    console.log(`🎯 Opportunities found: ${this.state.opportunities}`);
                    console.log(`👁️ Watchlist items: ${this.state.watchlist}`);
                    console.log(`⏱️ Execution time: ${result.executionTime}ms`);

                    // Recarregar dashboard após scan
                    if (typeof window.loadDashboard === 'function') {
                        console.log('🔄 Reloading dashboard with new data...');
                        setTimeout(() => window.loadDashboard(), 2000);
                    }
                } else {
                    console.error('❌ Edge Function returned error:', result.error);
                }
            } else {
                console.warn('⚠️ SupabaseFunctions.scanMarket not available, using fallback...');
                await this.fallbackScan();
            }

        } catch (error) {
            console.error('❌ Scan failed:', error);
            console.log('🔄 Trying fallback scan method...');
            await this.fallbackScan();
        } finally {
            this.state.isScanning = false;
        }
    },

    /**
     * Fallback scan (método antigo) - apenas se Edge Function falhar
     */
    async fallbackScan() {
        console.log('⚠️ Using fallback scan method (without methodology)...');
        
        try {
            const allSymbols = await this.getAllUSDTSymbols();
            this.state.totalSymbols = allSymbols.length;

            // Dividir em lotes
            const batches = [];
            for (let i = 0; i < allSymbols.length; i += this.config.batchSize) {
                batches.push(allSymbols.slice(i, i + this.config.batchSize));
            }

            console.log(`📦 Processing ${batches.length} batches (fallback mode)...`);

            // Processar apenas primeiro lote para teste
            const batch = batches[0];
            const results = await this.processBatch(batch);

            // Salvar no Supabase
            if (typeof SupabaseService !== 'undefined') {
                for (const opp of results.opportunities) {
                    await SupabaseService.createOpportunity(opp);
                    this.state.opportunities++;
                }
            }

            this.state.lastScan = new Date();
            console.log(`⚠️ Fallback scan complete (limited results)`);
        } catch (error) {
            console.error('❌ Fallback scan also failed:', error);
        }
    },

    /**
     * Iniciar scanner automático
     */
    start() {
        console.log('🚀 Auto Scanner started');
        console.log('📋 Configuration:', {
            minConfluence: this.config.minConfluence,
            batchSize: this.config.batchSize,
            scanInterval: this.config.scanInterval / 1000 / 60 + ' minutes'
        });
        
        // Scan inicial após 5 segundos
        console.log('⏱️ First scan will run in 5 seconds...');
        setTimeout(() => {
            console.log('▶️ Starting first scan...');
            this.fullScan();
        }, 5000);
        
        // Scan periódico
        const intervalId = setInterval(() => {
            if (!this.state.isScanning) {
                console.log('🔄 Starting periodic scan...');
                this.fullScan();
            } else {
                console.log('⏭️ Skipping scan (previous scan still running)');
            }
        }, this.config.scanInterval);
        
        // Armazenar ID para poder parar depois
        this.intervalId = intervalId;
        
        console.log('✅ Auto Scanner is now active');
    },

    /**
     * Parar scanner
     */
    stop() {
        console.log('⏸️ Auto Scanner stopped');
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('✅ Interval cleared');
        }
    }
};

// Expor globalmente
if (typeof window !== 'undefined') {
    window.AutoScanner = AutoScanner;
}
