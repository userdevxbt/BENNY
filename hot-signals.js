/**
 * Hot Signals - Sistema de Detecção de Movimentos em Tempo Real
 * ALTA PRECISÃO - Integrado com Supabase
 * Monitora WebSocket e detecta:
 * - Movimentos de preço bruscos (pump/dump)
 * - Volume anormal (spike)
 * - Breakouts de níveis importantes
 * - Correlação com oportunidades ativas
 */

const HotSignals = {
    config: {
        // Thresholds para detecção - ALTA PRECISÃO
        priceChangeThreshold: 1.5,      // % de mudança para trigger (reduzido para mais sensibilidade)
        volumeSpikeMultiplier: 2.5,     // Volume X vezes maior que média
        checkInterval: 3000,            // Verificar a cada 3 segundos (mais rápido)
        maxSignals: 50,                 // Máximo de sinais armazenados
        signalExpiry: 600000,           // Sinais expiram em 10 minutos
        cooldownPeriod: 30000,          // 30 segundos de cooldown por símbolo (reduzido)
        
        // Thresholds de precisão
        minDataPoints: 3,               // Mínimo de pontos de dados para análise
        trendConfirmation: true,        // Confirmar com tendência das oportunidades
        
        // Tipos de sinal com prioridade
        signalTypes: {
            PUMP: { emoji: '🚀', label: 'PUMP', color: '#10b981', priority: 1 },
            DUMP: { emoji: '📉', label: 'DUMP', color: '#ef4444', priority: 1 },
            VOLUME_SPIKE: { emoji: '📊', label: 'VOLUME', color: '#f59e0b', priority: 2 },
            BREAKOUT_UP: { emoji: '⬆️', label: 'BREAKOUT', color: '#3b82f6', priority: 1 },
            BREAKOUT_DOWN: { emoji: '⬇️', label: 'BREAKDOWN', color: '#8b5cf6', priority: 1 },
            ENTRY_ZONE: { emoji: '🎯', label: 'ENTRY ZONE', color: '#06b6d4', priority: 1 },
            NEAR_TP: { emoji: '💰', label: 'NEAR TP', color: '#22c55e', priority: 1 },
            NEAR_SL: { emoji: '⚠️', label: 'NEAR SL', color: '#dc2626', priority: 1 }
        }
    },

    state: {
        isActive: false,
        signals: [],
        priceHistory: {},      // { symbol: [{ price, timestamp }] }
        volumeHistory: {},     // { symbol: [{ volume, timestamp }] }
        lastSignalTime: {},    // { symbol: timestamp } - cooldown tracker
        averageVolumes: {},    // { symbol: avgVolume24h }
        checkIntervalId: null,
        supabaseSyncInterval: null
    },

    /**
     * Iniciar monitoramento de Hot Signals
     */
    start() {
        if (this.state.isActive) {
            console.log('🔥 Hot Signals already active');
            return;
        }

        console.log('🔥 Hot Signals started - HIGH PRECISION MODE');
        console.log('📋 Config:', {
            priceThreshold: this.config.priceChangeThreshold + '%',
            volumeMultiplier: this.config.volumeSpikeMultiplier + 'x',
            checkInterval: this.config.checkInterval / 1000 + 's'
        });

        this.state.isActive = true;

        // Carregar sinais do Supabase
        this.loadSignalsFromSupabase();

        // Iniciar verificação periódica
        this.state.checkIntervalId = setInterval(() => {
            this.analyzeMarket();
            this.checkOpportunityLevels();
            this.cleanupExpiredSignals();
        }, this.config.checkInterval);

        // Sync com Supabase a cada 30 segundos
        this.state.supabaseSyncInterval = setInterval(() => {
            this.syncWithSupabase();
        }, 30000);

        // Escutar atualizações de preço do WebSocket
        this.attachPriceListener();

        // Atualizar UI
        this.updateUI();

        console.log('✅ Hot Signals monitoring active - INTEGRATED WITH SUPABASE');
    },

    /**
     * Parar monitoramento
     */
    stop() {
        if (!this.state.isActive) return;

        console.log('⏸️ Hot Signals stopped');
        this.state.isActive = false;

        if (this.state.checkIntervalId) {
            clearInterval(this.state.checkIntervalId);
            this.state.checkIntervalId = null;
        }
        
        if (this.state.supabaseSyncInterval) {
            clearInterval(this.state.supabaseSyncInterval);
            this.state.supabaseSyncInterval = null;
        }
    },

    /**
     * Carregar sinais do Supabase
     */
    async loadSignalsFromSupabase() {
        try {
            if (typeof SupabaseFunctions !== 'undefined') {
                const signals = await SupabaseFunctions.getHotSignals({ limit: 50 });
                if (signals && signals.length > 0) {
                    // Converter formato do Supabase para formato local
                    this.state.signals = signals.map(s => ({
                        id: s.id || `${s.symbol}-${Date.now()}`,
                        type: s.type,
                        symbol: s.symbol,
                        price: s.price,
                        change: s.change,
                        message: s.message,
                        timestamp: new Date(s.timestamp || s.created_at).getTime(),
                        ...this.config.signalTypes[s.type]
                    }));
                    console.log(`📥 Loaded ${this.state.signals.length} hot signals from Supabase`);
                    this.updateUI();
                }
            }
        } catch (e) {
            console.warn('Failed to load signals from Supabase:', e);
        }
    },

    /**
     * Sincronizar com Supabase
     */
    async syncWithSupabase() {
        // Atualizar contador de sinais na UI
        const counter = document.getElementById('hot-signals-count');
        if (counter) {
            counter.textContent = this.state.signals.length;
            counter.style.display = this.state.signals.length > 0 ? 'flex' : 'none';
        }
    },

    /**
     * Escutar atualizações de preço do WebSocket
     */
    attachPriceListener() {
        // Interceptar atualizações de preço do sistema existente
        const originalUpdatePrice = window.updateTickerPrice;
        
        window.updateTickerPrice = (symbol, data) => {
            // Chamar função original
            if (originalUpdatePrice) {
                originalUpdatePrice(symbol, data);
            }

            // Processar para Hot Signals
            this.recordPriceUpdate(symbol, data);
        };

        // Também escutar evento customizado se disponível
        window.addEventListener('priceUpdate', (e) => {
            if (e.detail) {
                this.recordPriceUpdate(e.detail.symbol, e.detail);
            }
        });
    },

    /**
     * Registrar atualização de preço
     */
    recordPriceUpdate(symbol, data) {
        if (!symbol || !data) return;

        const cleanSymbol = symbol.replace('USDT', '').toUpperCase() + 'USDT';
        const price = parseFloat(data.price || data.c || data.lastPrice);
        const volume = parseFloat(data.volume || data.v || data.quoteVolume || 0);

        if (isNaN(price)) return;

        const now = Date.now();

        // Inicializar histórico se não existir
        if (!this.state.priceHistory[cleanSymbol]) {
            this.state.priceHistory[cleanSymbol] = [];
        }
        if (!this.state.volumeHistory[cleanSymbol]) {
            this.state.volumeHistory[cleanSymbol] = [];
        }

        // Adicionar ao histórico (manter últimos 120 pontos = ~6 minutos com updates a cada 3s)
        this.state.priceHistory[cleanSymbol].push({ price, timestamp: now });
        if (volume > 0) {
            this.state.volumeHistory[cleanSymbol].push({ volume, timestamp: now });
        }

        // Limitar tamanho do histórico
        if (this.state.priceHistory[cleanSymbol].length > 120) {
            this.state.priceHistory[cleanSymbol].shift();
        }
        if (this.state.volumeHistory[cleanSymbol].length > 120) {
            this.state.volumeHistory[cleanSymbol].shift();
        }
    },

    /**
     * Analisar mercado e detectar sinais
     */
    analyzeMarket() {
        const now = Date.now();

        for (const symbol of Object.keys(this.state.priceHistory)) {
            // Verificar cooldown
            if (this.state.lastSignalTime[symbol] && 
                now - this.state.lastSignalTime[symbol] < this.config.cooldownPeriod) {
                continue;
            }

            const priceData = this.state.priceHistory[symbol];
            if (priceData.length < this.config.minDataPoints) continue;

            // Calcular mudança de preço
            const oldestPrice = priceData[0].price;
            const currentPrice = priceData[priceData.length - 1].price;
            const priceChange = ((currentPrice - oldestPrice) / oldestPrice) * 100;

            // Detectar PUMP - ALTA PRECISÃO
            if (priceChange >= this.config.priceChangeThreshold) {
                // Verificar se é uma oportunidade ativa com trend bullish
                const opp = this.findOpportunity(symbol);
                const isPrecise = !opp || opp.trend === 'bullish';
                
                if (isPrecise) {
                    this.addSignal({
                        type: 'PUMP',
                        symbol: symbol,
                        price: currentPrice,
                        change: priceChange,
                        message: `+${priceChange.toFixed(2)}% em ${this.getTimespan(priceData)}`,
                        saveToSupabase: true
                    });
                }
            }
            // Detectar DUMP - ALTA PRECISÃO
            else if (priceChange <= -this.config.priceChangeThreshold) {
                const opp = this.findOpportunity(symbol);
                const isPrecise = !opp || opp.trend === 'bearish';
                
                if (isPrecise) {
                    this.addSignal({
                        type: 'DUMP',
                        symbol: symbol,
                        price: currentPrice,
                        change: priceChange,
                        message: `${priceChange.toFixed(2)}% em ${this.getTimespan(priceData)}`,
                        saveToSupabase: true
                    });
                }
            }

            // Detectar Volume Spike
            const volumeData = this.state.volumeHistory[symbol];
            if (volumeData && volumeData.length >= this.config.minDataPoints) {
                const avgVolume = this.calculateAverageVolume(volumeData.slice(0, -1));
                const currentVolume = volumeData[volumeData.length - 1]?.volume || 0;
                
                if (avgVolume > 0 && currentVolume > avgVolume * this.config.volumeSpikeMultiplier) {
                    this.addSignal({
                        type: 'VOLUME_SPIKE',
                        symbol: symbol,
                        price: currentPrice,
                        change: priceChange,
                        message: `Volume ${(currentVolume / avgVolume).toFixed(1)}x acima da média`,
                        volumeSpike: currentVolume / avgVolume,
                        saveToSupabase: true
                    });
                }
            }
        }
    },

    /**
     * Verificar níveis das oportunidades ativas - ALTA PRECISÃO
     */
    checkOpportunityLevels() {
        const opportunities = window.currentOpportunities || [];
        const now = Date.now();

        for (const opp of opportunities) {
            const symbol = opp.symbol;
            const priceData = this.state.priceHistory[symbol];
            if (!priceData || priceData.length < 2) continue;

            // Verificar cooldown
            if (this.state.lastSignalTime[symbol] && 
                now - this.state.lastSignalTime[symbol] < this.config.cooldownPeriod) {
                continue;
            }

            const currentPrice = priceData[priceData.length - 1].price;
            const entryPrice = parseFloat(opp.entry_price || opp.entryPrice || opp.entryZone?.low);
            const entryHigh = parseFloat(opp.entryZone?.high || entryPrice * 1.01);
            const stopLoss = parseFloat(opp.invalidation?.price || opp.stopLoss);

            if (!entryPrice) continue;

            // Verificar se preço entrou na zona de entrada
            if (currentPrice >= entryPrice * 0.995 && currentPrice <= entryHigh * 1.005) {
                this.addSignal({
                    type: 'ENTRY_ZONE',
                    symbol: symbol,
                    price: currentPrice,
                    change: 0,
                    message: `Preço na zona de entrada! ($${entryPrice.toFixed(4)})`,
                    saveToSupabase: true
                });
            }

            // Verificar proximidade dos TPs
            const targets = opp.targets || [];
            for (let i = 0; i < targets.length && i < 3; i++) {
                const tp = targets[i];
                if (!tp || !tp.price) continue;
                
                const tpPrice = parseFloat(tp.price);
                const distance = Math.abs((currentPrice - tpPrice) / tpPrice) * 100;
                
                // Se estiver a menos de 1% do TP
                if (distance < 1 && !tp.hit) {
                    this.addSignal({
                        type: 'NEAR_TP',
                        symbol: symbol,
                        price: currentPrice,
                        change: distance,
                        message: `Próximo ao TP${i + 1}! ($${tpPrice.toFixed(4)}) - ${distance.toFixed(2)}%`,
                        saveToSupabase: true
                    });
                }
            }

            // Verificar proximidade do Stop Loss
            if (stopLoss) {
                const slDistance = Math.abs((currentPrice - stopLoss) / stopLoss) * 100;
                
                // Se estiver a menos de 1.5% do SL
                if (slDistance < 1.5) {
                    this.addSignal({
                        type: 'NEAR_SL',
                        symbol: symbol,
                        price: currentPrice,
                        change: -slDistance,
                        message: `⚠️ Próximo ao Stop Loss! ($${stopLoss.toFixed(4)}) - ${slDistance.toFixed(2)}%`,
                        saveToSupabase: true
                    });
                }
            }
        }
    },

    /**
     * Encontrar oportunidade para um símbolo
     */
    findOpportunity(symbol) {
        const opportunities = window.currentOpportunities || [];
        const watchlist = window.currentWatchlist || [];
        const allItems = [...opportunities, ...watchlist];
        
        return allItems.find(o => {
            const oppSymbol = (o.symbol || '').toUpperCase();
            return oppSymbol === symbol || oppSymbol === symbol.replace('USDT', '') + 'USDT';
        });
    },

    /**
     * Adicionar novo sinal
     */
    async addSignal(signalData) {
        const now = Date.now();
        const signalType = this.config.signalTypes[signalData.type];

        // Verificar se já existe sinal similar recente
        const existing = this.state.signals.find(s => 
            s.symbol === signalData.symbol && 
            s.type === signalData.type &&
            now - s.timestamp < 60000 // 1 minuto
        );
        if (existing) return;

        const signal = {
            id: `${signalData.symbol}-${now}`,
            type: signalData.type,
            symbol: signalData.symbol,
            price: signalData.price,
            change: signalData.change,
            message: signalData.message,
            timestamp: now,
            ...signalType
        };

        // Adicionar ao início da lista
        this.state.signals.unshift(signal);

        // Limitar número de sinais
        if (this.state.signals.length > this.config.maxSignals) {
            this.state.signals = this.state.signals.slice(0, this.config.maxSignals);
        }

        // Registrar cooldown
        this.state.lastSignalTime[signalData.symbol] = now;

        // Log
        console.log(`🔥 HOT SIGNAL: ${signal.emoji} ${signal.label} ${signal.symbol} | ${signal.message}`);

        // Salvar no Supabase se configurado
        if (signalData.saveToSupabase && typeof SupabaseFunctions !== 'undefined') {
            try {
                await SupabaseFunctions.saveHotSignal({
                    symbol: signal.symbol,
                    type: signal.type,
                    price: signal.price,
                    change: signal.change,
                    message: signal.message,
                    volumeSpike: signalData.volumeSpike
                });
            } catch (e) {
                console.warn('Failed to save signal to Supabase:', e);
            }
        }

        // Disparar evento
        window.dispatchEvent(new CustomEvent('hotSignal', { detail: signal }));

        // Atualizar UI
        this.updateUI();

        // Notificação sonora para sinais de alta prioridade
        if (signalType.priority === 1) {
            this.playNotificationSound();
        }

        // Toast notification
        this.showToast(signal);
    },

    /**
     * Mostrar toast notification - MENOS INTRUSIVO
     */
    showToast(signal) {
        // Desabilitado - sinais apenas no painel lateral
        // Usuários podem ver sinais clicando no botão HOT
        return;
    },

    /**
     * Tocar som de notificação - DESABILITADO
     */
    playNotificationSound() {
        // Desabilitado para não atrapalhar
        return;
    },

    /**
     * Atualizar UI do painel de Hot Signals
     */
    updateUI() {
        const container = document.getElementById('hot-signals-list');
        if (!container) return;

        if (this.state.signals.length === 0) {
            container.innerHTML = `
                <div class="text-center text-white/30 py-8">
                    <div class="text-3xl mb-2">🔍</div>
                    <div class="text-sm">Monitorando mercado...</div>
                    <div class="text-xs mt-1">Sinais aparecerão aqui</div>
                </div>
            `;
            return;
        }

        container.innerHTML = this.state.signals.map(signal => `
            <div class="hot-signal-item p-3 rounded-lg cursor-pointer hover:bg-white/5 transition border-l-2"
                 style="border-color: ${signal.color}; background: ${signal.color}10"
                 onclick="window.openOpportunityModal && window.openOpportunityModal('${signal.symbol}')">
                <div class="flex items-center gap-3">
                    <span class="text-xl">${signal.emoji}</span>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-sm" style="color: ${signal.color}">${signal.symbol.replace('USDT', '')}</span>
                            <span class="text-xs px-1.5 py-0.5 rounded" style="background: ${signal.color}30; color: ${signal.color}">${signal.label}</span>
                        </div>
                        <div class="text-xs text-white/60 truncate">${signal.message}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs font-mono text-white/80">$${signal.price.toFixed(signal.price > 100 ? 2 : 4)}</div>
                        <div class="text-xs" style="color: ${signal.change >= 0 ? '#10b981' : '#ef4444'}">
                            ${signal.change >= 0 ? '+' : ''}${signal.change.toFixed(2)}%
                        </div>
                    </div>
                </div>
                <div class="text-xs text-white/30 mt-1">${this.formatTime(signal.timestamp)}</div>
            </div>
        `).join('');

        // Atualizar contador
        const counter = document.getElementById('hot-signals-count');
        if (counter) {
            counter.textContent = this.state.signals.length;
            counter.style.display = this.state.signals.length > 0 ? 'flex' : 'none';
        }
    },

    /**
     * Limpar sinais expirados
     */
    cleanupExpiredSignals() {
        const now = Date.now();
        const before = this.state.signals.length;
        
        this.state.signals = this.state.signals.filter(
            signal => now - signal.timestamp < this.config.signalExpiry
        );

        if (this.state.signals.length !== before) {
            this.updateUI();
        }
    },

    /**
     * Calcular volume médio
     */
    calculateAverageVolume(volumeData) {
        if (!volumeData || volumeData.length === 0) return 0;
        const sum = volumeData.reduce((acc, v) => acc + v.volume, 0);
        return sum / volumeData.length;
    },

    /**
     * Obter timespan dos dados
     */
    getTimespan(priceData) {
        if (priceData.length < 2) return '0s';
        const diff = priceData[priceData.length - 1].timestamp - priceData[0].timestamp;
        if (diff < 60000) return Math.round(diff / 1000) + 's';
        return Math.round(diff / 60000) + 'min';
    },

    /**
     * Formatar timestamp
     */
    formatTime(timestamp) {
        const diff = Date.now() - timestamp;
        if (diff < 60000) return 'agora';
        if (diff < 3600000) return Math.round(diff / 60000) + ' min atrás';
        return new Date(timestamp).toLocaleTimeString();
    },

    /**
     * Obter sinais ativos
     */
    getSignals() {
        return this.state.signals;
    },

    /**
     * Limpar todos os sinais
     */
    clearSignals() {
        this.state.signals = [];
        this.updateUI();
    }
};

// Expor globalmente
if (typeof window !== 'undefined') {
    window.HotSignals = HotSignals;
    
    // CSS para animações
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        .hot-signal-toast {
            animation: slideIn 0.3s ease-out;
        }
        .hot-signal-item {
            transition: all 0.2s ease;
        }
        .hot-signal-item:hover {
            transform: translateX(4px);
        }
        #hot-signals-count {
            min-width: 18px;
            height: 18px;
            font-size: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    `;
    document.head.appendChild(style);
}
