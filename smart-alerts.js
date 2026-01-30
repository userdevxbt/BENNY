/**
 * ============================================================================
 * SHDWXBT — Smart Alerts System
 * ============================================================================
 * 
 * Sistema de alertas inteligentes com múltiplas condições
 * 
 * Features:
 * - Price alerts
 * - Indicator alerts (RSI, EMA cross)
 * - Volume alerts
 * - Pattern detection alerts
 * - Telegram/Discord integration ready
 * 
 * ============================================================================
 */

const SmartAlerts = {
    // ========================================
    // CONFIGURAÇÃO
    // ========================================
    config: {
        checkInterval: 10000,   // 10 segundos
        maxActiveAlerts: 50,
        soundEnabled: false,    // Desabilitado por padrão
        notifyMethods: ['panel'] // 'panel', 'browser', 'telegram', 'discord'
    },

    state: {
        alerts: [],
        triggered: [],
        isRunning: false,
        intervalId: null
    },

    // ========================================
    // TIPOS DE ALERTA
    // ========================================
    alertTypes: {
        PRICE_ABOVE: 'price_above',
        PRICE_BELOW: 'price_below',
        PRICE_CROSS: 'price_cross',
        RSI_OVERBOUGHT: 'rsi_overbought',
        RSI_OVERSOLD: 'rsi_oversold',
        EMA_CROSS_UP: 'ema_cross_up',
        EMA_CROSS_DOWN: 'ema_cross_down',
        VOLUME_SPIKE: 'volume_spike',
        BREAKOUT: 'breakout',
        BREAKDOWN: 'breakdown',
        TP_NEAR: 'tp_near',
        SL_NEAR: 'sl_near',
        MTF_ALIGNMENT: 'mtf_alignment'
    },

    // ========================================
    // CRIAR ALERTA
    // ========================================
    createAlert(options) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            symbol: options.symbol,
            type: options.type,
            condition: options.condition,
            value: options.value,
            message: options.message || this.generateMessage(options),
            priority: options.priority || 'normal', // 'low', 'normal', 'high', 'critical'
            createdAt: new Date(),
            expiresAt: options.expiresAt || null,
            triggered: false,
            triggeredAt: null,
            triggerCount: 0,
            maxTriggers: options.maxTriggers || 1,
            cooldown: options.cooldown || 60000, // 1 minuto entre triggers
            lastTriggered: null,
            metadata: options.metadata || {}
        };

        this.state.alerts.push(alert);
        console.log(`🔔 Alert created: ${alert.id} - ${alert.type} for ${alert.symbol}`);

        this.saveAlerts();
        return alert;
    },

    generateMessage(options) {
        const templates = {
            [this.alertTypes.PRICE_ABOVE]: `🚀 ${options.symbol} acima de $${options.value}`,
            [this.alertTypes.PRICE_BELOW]: `📉 ${options.symbol} abaixo de $${options.value}`,
            [this.alertTypes.RSI_OVERBOUGHT]: `⚠️ ${options.symbol} RSI sobrecomprado (>${options.value})`,
            [this.alertTypes.RSI_OVERSOLD]: `💡 ${options.symbol} RSI sobrevendido (<${options.value})`,
            [this.alertTypes.VOLUME_SPIKE]: `📊 ${options.symbol} Volume spike detectado`,
            [this.alertTypes.BREAKOUT]: `🔥 ${options.symbol} BREAKOUT acima de $${options.value}`,
            [this.alertTypes.BREAKDOWN]: `💥 ${options.symbol} BREAKDOWN abaixo de $${options.value}`,
            [this.alertTypes.TP_NEAR]: `🎯 ${options.symbol} próximo do TP`,
            [this.alertTypes.SL_NEAR]: `⚠️ ${options.symbol} próximo do Stop Loss`,
            [this.alertTypes.MTF_ALIGNMENT]: `✅ ${options.symbol} MTF alinhado - ${options.value}`
        };

        return templates[options.type] || `Alert: ${options.symbol} - ${options.type}`;
    },

    // ========================================
    // REMOVER ALERTA
    // ========================================
    removeAlert(alertId) {
        const index = this.state.alerts.findIndex(a => a.id === alertId);
        if (index !== -1) {
            this.state.alerts.splice(index, 1);
            this.saveAlerts();
            console.log(`🗑️ Alert removed: ${alertId}`);
            return true;
        }
        return false;
    },

    // ========================================
    // VERIFICAR ALERTAS
    // ========================================
    async checkAlerts() {
        const now = Date.now();

        for (const alert of this.state.alerts) {
            // Pular alertas já totalmente triggered
            if (alert.triggerCount >= alert.maxTriggers) continue;

            // Pular se em cooldown
            if (alert.lastTriggered && (now - alert.lastTriggered) < alert.cooldown) continue;

            // Pular se expirado
            if (alert.expiresAt && new Date(alert.expiresAt) < new Date()) continue;

            try {
                const shouldTrigger = await this.evaluateCondition(alert);

                if (shouldTrigger) {
                    this.triggerAlert(alert);
                }
            } catch (error) {
                console.warn(`Error checking alert ${alert.id}:`, error);
            }
        }
    },

    async evaluateCondition(alert) {
        const currentPrice = await this.getCurrentPrice(alert.symbol);
        if (!currentPrice) return false;

        switch (alert.type) {
            case this.alertTypes.PRICE_ABOVE:
                return currentPrice >= alert.value;

            case this.alertTypes.PRICE_BELOW:
                return currentPrice <= alert.value;

            case this.alertTypes.PRICE_CROSS:
                // Precisa de estado anterior
                const lastPrice = alert.metadata.lastPrice || currentPrice;
                alert.metadata.lastPrice = currentPrice;
                return (lastPrice < alert.value && currentPrice >= alert.value) ||
                       (lastPrice > alert.value && currentPrice <= alert.value);

            case this.alertTypes.RSI_OVERBOUGHT:
                const rsiHigh = await this.getRSI(alert.symbol);
                return rsiHigh >= (alert.value || 70);

            case this.alertTypes.RSI_OVERSOLD:
                const rsiLow = await this.getRSI(alert.symbol);
                return rsiLow <= (alert.value || 30);

            case this.alertTypes.VOLUME_SPIKE:
                const volumeData = await this.getVolumeRatio(alert.symbol);
                return volumeData >= (alert.value || 2.0);

            case this.alertTypes.TP_NEAR:
                const tpDistance = Math.abs(currentPrice - alert.value) / alert.value * 100;
                return tpDistance <= (alert.metadata.threshold || 0.5); // 0.5% do TP

            case this.alertTypes.SL_NEAR:
                const slDistance = Math.abs(currentPrice - alert.value) / alert.value * 100;
                return slDistance <= (alert.metadata.threshold || 0.5); // 0.5% do SL

            default:
                return false;
        }
    },

    // ========================================
    // TRIGGER ALERTA
    // ========================================
    triggerAlert(alert) {
        alert.triggered = true;
        alert.triggeredAt = new Date();
        alert.triggerCount++;
        alert.lastTriggered = Date.now();

        // Adicionar aos triggered
        this.state.triggered.unshift({
            ...alert,
            triggeredAt: new Date()
        });

        // Manter apenas os últimos 100 triggered
        if (this.state.triggered.length > 100) {
            this.state.triggered = this.state.triggered.slice(0, 100);
        }

        // Notificar
        this.notify(alert);

        // Salvar estado
        this.saveAlerts();

        console.log(`🔔 ALERT TRIGGERED: ${alert.message}`);
    },

    // ========================================
    // NOTIFICAÇÃO
    // ========================================
    notify(alert) {
        // Panel notification (sempre)
        this.notifyPanel(alert);

        // Browser notification
        if (this.config.notifyMethods.includes('browser')) {
            this.notifyBrowser(alert);
        }

        // Sound
        if (this.config.soundEnabled) {
            this.playSound(alert.priority);
        }
    },

    notifyPanel(alert) {
        // Criar elemento de notificação no painel
        const container = document.getElementById('alerts-container');
        if (!container) return;

        const priorityColors = {
            low: 'bg-zinc-800 border-zinc-700',
            normal: 'bg-blue-900/30 border-blue-700/50',
            high: 'bg-yellow-900/30 border-yellow-700/50',
            critical: 'bg-red-900/30 border-red-700/50'
        };

        const alertEl = document.createElement('div');
        alertEl.className = `p-3 rounded-lg border ${priorityColors[alert.priority]} mb-2 animate-pulse`;
        alertEl.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <span class="font-bold text-white">${alert.symbol}</span>
                    <p class="text-sm text-zinc-300">${alert.message}</p>
                    <span class="text-xs text-zinc-500">${new Date().toLocaleTimeString()}</span>
                </div>
                <button onclick="SmartAlerts.dismissNotification(this)" class="text-zinc-500 hover:text-white">✕</button>
            </div>
        `;

        container.insertBefore(alertEl, container.firstChild);

        // Auto-remove após 30 segundos
        setTimeout(() => {
            alertEl.classList.add('opacity-0', 'transition-opacity');
            setTimeout(() => alertEl.remove(), 300);
        }, 30000);
    },

    notifyBrowser(alert) {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            new Notification('SHDWXBT Alert', {
                body: alert.message,
                icon: '/favicon.ico',
                tag: alert.id
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    },

    playSound(priority) {
        // Som desabilitado por padrão
    },

    dismissNotification(button) {
        const alertEl = button.closest('div.p-3');
        if (alertEl) alertEl.remove();
    },

    // ========================================
    // ALERTAS PRÉ-DEFINIDOS
    // ========================================
    createOpportunityAlerts(opportunity) {
        const alerts = [];

        // Alerta de entrada
        if (opportunity.entry_min) {
            alerts.push(this.createAlert({
                symbol: opportunity.symbol,
                type: this.alertTypes.PRICE_BELOW,
                value: parseFloat(opportunity.entry_max),
                message: `🎯 ${opportunity.symbol} entrou na zona de entrada!`,
                priority: 'high'
            }));
        }

        // Alertas de TP
        if (opportunity.tp1) {
            alerts.push(this.createAlert({
                symbol: opportunity.symbol,
                type: this.alertTypes.TP_NEAR,
                value: parseFloat(opportunity.tp1),
                message: `🎯 ${opportunity.symbol} próximo do TP1!`,
                priority: 'high',
                metadata: { threshold: 0.5 }
            }));
        }

        if (opportunity.tp2) {
            alerts.push(this.createAlert({
                symbol: opportunity.symbol,
                type: this.alertTypes.TP_NEAR,
                value: parseFloat(opportunity.tp2),
                message: `🎯 ${opportunity.symbol} próximo do TP2!`,
                priority: 'high',
                metadata: { threshold: 0.5 }
            }));
        }

        // Alerta de Stop Loss
        if (opportunity.stop_loss) {
            alerts.push(this.createAlert({
                symbol: opportunity.symbol,
                type: this.alertTypes.SL_NEAR,
                value: parseFloat(opportunity.stop_loss),
                message: `⚠️ ${opportunity.symbol} próximo do Stop Loss!`,
                priority: 'critical',
                metadata: { threshold: 0.3 }
            }));
        }

        return alerts;
    },

    // ========================================
    // DADOS DE MERCADO
    // ========================================
    async getCurrentPrice(symbol) {
        try {
            const response = await fetch(
                `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
            );
            const data = await response.json();
            return parseFloat(data.price);
        } catch (error) {
            return null;
        }
    },

    async getRSI(symbol, period = 14) {
        try {
            const response = await fetch(
                `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=${period + 10}`
            );
            const klines = await response.json();
            const closes = klines.map(k => parseFloat(k[4]));

            // Calcular RSI
            const changes = [];
            for (let i = 1; i < closes.length; i++) {
                changes.push(closes[i] - closes[i - 1]);
            }

            const gains = changes.map(c => c > 0 ? c : 0);
            const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);

            const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
            const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            return 100 - (100 / (1 + rs));
        } catch (error) {
            return 50; // Neutro em caso de erro
        }
    },

    async getVolumeRatio(symbol) {
        try {
            const response = await fetch(
                `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=25`
            );
            const klines = await response.json();
            const volumes = klines.map(k => parseFloat(k[5]));

            const currentVolume = volumes[volumes.length - 1];
            const avgVolume = volumes.slice(0, -1).reduce((a, b) => a + b, 0) / (volumes.length - 1);

            return currentVolume / avgVolume;
        } catch (error) {
            return 1;
        }
    },

    // ========================================
    // INICIAR/PARAR MONITORAMENTO
    // ========================================
    start() {
        if (this.state.isRunning) return;

        this.state.isRunning = true;
        this.loadAlerts();

        this.state.intervalId = setInterval(() => {
            this.checkAlerts();
        }, this.config.checkInterval);

        console.log('🔔 Smart Alerts started');
    },

    stop() {
        if (this.state.intervalId) {
            clearInterval(this.state.intervalId);
            this.state.intervalId = null;
        }
        this.state.isRunning = false;
        console.log('🔕 Smart Alerts stopped');
    },

    // ========================================
    // PERSISTÊNCIA
    // ========================================
    saveAlerts() {
        try {
            localStorage.setItem('shdwxbt_alerts', JSON.stringify(this.state.alerts));
        } catch (error) {
            console.warn('Error saving alerts:', error);
        }
    },

    loadAlerts() {
        try {
            const saved = localStorage.getItem('shdwxbt_alerts');
            if (saved) {
                this.state.alerts = JSON.parse(saved);
                console.log(`📂 Loaded ${this.state.alerts.length} alerts`);
            }
        } catch (error) {
            console.warn('Error loading alerts:', error);
        }
    },

    // ========================================
    // API
    // ========================================
    getActiveAlerts() {
        return this.state.alerts.filter(a => 
            a.triggerCount < a.maxTriggers && 
            (!a.expiresAt || new Date(a.expiresAt) > new Date())
        );
    },

    getTriggeredAlerts() {
        return this.state.triggered;
    },

    clearAll() {
        this.state.alerts = [];
        this.state.triggered = [];
        this.saveAlerts();
        console.log('🗑️ All alerts cleared');
    }
};

// Export
window.SmartAlerts = SmartAlerts;

// Auto-start quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    SmartAlerts.start();
});

console.log('🔔 Smart Alerts System loaded');
