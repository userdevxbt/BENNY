// ─────────────────────────────────────────────────────────────────────────────
const SHDWChannel = {
    channel: null,
    listeners: new Map(),
    
    init() {
        if (typeof BroadcastChannel !== 'undefined') {
            this.channel = new BroadcastChannel('shdwxbt_channel');
            this.channel.onmessage = (event) => this.handleMessage(event.data);
        }
        
        // Fallback: localStorage event listener
        window.addEventListener('storage', (event) => {
            if (event.key === 'shdwxbt_broadcast') {
                try {
                    const data = JSON.parse(event.newValue);
                    this.handleMessage(data);
                } catch (e) {}
            }
        });
        
        // Preventive cleanup on init
        this.clearOldStorage();
        
        console.log('🔗 SHDWXBT Channel initialized');
    },
    
    broadcast(type, data) {
        // Skip localStorage for large data types (use BroadcastChannel only)
        const skipLocalStorage = ['opportunities:updated', 'prices:bulk', 'market:data'];
        const message = { type, data, timestamp: Date.now() };
        
        // BroadcastChannel (preferred - no size limit)
        if (this.channel) {
            this.channel.postMessage(message);
        }
        
        // Only use localStorage for small messages
        if (!skipLocalStorage.includes(type)) {
            try {
                // Limit message size to 10KB
                const msgStr = JSON.stringify(message);
                if (msgStr.length < 10240) {
                    localStorage.setItem('shdwxbt_broadcast', msgStr);
                }
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    console.warn('⚠️ localStorage quota exceeded, clearing...');
                    this.clearOldStorage();
                }
            }
        }
        
        // Also trigger local handlers
        this.handleMessage(message);
    },
    
    clearOldStorage() {
        // More aggressive cleanup to prevent QuotaExceededError
        const keysToRemove = [];
        const criticalKeys = ['shdwxbt_auth', 'shdwxbt_session', 'shdwxbt_symbol'];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || criticalKeys.includes(key)) continue;
            
            // Remove everything except critical keys
            if (
                key.includes('_cache') || 
                key.includes('_temp') ||
                key.includes('opportunities') ||
                key.includes('signals') ||
                key.includes('watchlist') ||
                key.includes('broadcast') ||
                key.includes('market') ||
                key.includes('price') ||
                key.startsWith('shdwxbt_') && !criticalKeys.includes(key)
            ) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            try { localStorage.removeItem(key); } catch(e) {}
        });
        
        // Also try to clear the broadcast message
        try { localStorage.removeItem('shdwxbt_broadcast'); } catch(e) {}
        
        console.log(`🧹 Cleared ${keysToRemove.length} storage items`);
    },
    
    on(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type).push(callback);
    },
    
    off(type, callback) {
        if (this.listeners.has(type)) {
            const callbacks = this.listeners.get(type);
            const index = callbacks.indexOf(callback);
            if (index > -1) callbacks.splice(index, 1);
        }
    },
    
    handleMessage(message) {
        if (!message || !message.type) return;
        
        const callbacks = this.listeners.get(message.type) || [];
        callbacks.forEach(cb => {
            try {
                cb(message.data);
            } catch (e) {
                console.error('Channel handler error:', e);
            }
        });
        
        // Global event
        const allCallbacks = this.listeners.get('*') || [];
        allCallbacks.forEach(cb => {
            try {
                cb(message);
            } catch (e) {}
        });
    }
};

// Initialize channel
SHDWChannel.init();

// ========================================
// AUTH MODULE - Com suporte a sessão persistente de 7 dias para mobile
// ========================================
const Auth = {
    STORAGE_KEY: 'shdwxbt_auth',
    PERSISTENT_SESSION_KEY: 'shdwxbt_session',
    EXPIRY_HOURS: 24,
    MOBILE_EXPIRY_DAYS: 7,
    
    // 🎉 BENNY IS NOW PUBLIC - No whitelist required!
    // All wallets have full access
    WHITELIST: [],
    
    // Detecta se é dispositivo móvel
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    // Obtém informações do dispositivo para fingerprint
    getDeviceInfo() {
        return `${navigator.userAgent}|${screen.width}x${screen.height}|${navigator.language}`;
    },
    
    // Verifica autenticação (verifica primeiro sessão persistente, depois sessionStorage)
    isAuthenticated() {
        // Primeiro, verificar sessão persistente no localStorage (mobile)
        if (this.isMobile()) {
            const persistentSession = this.getPersistentSession();
            if (persistentSession && persistentSession.valid) {
                return true;
            }
        }
        
        // Fallback: sessionStorage (comportamento original)
        const auth = sessionStorage.getItem(this.STORAGE_KEY);
        if (!auth) return false;
        
        try {
            const authData = JSON.parse(auth);
            const expiryTime = this.EXPIRY_HOURS * 60 * 60 * 1000;
            
            if (Date.now() - authData.timestamp > expiryTime) {
                this.logout(false); // Não redirecionar
                return false;
            }
            return authData.authenticated === true || authData.isAuthenticated === true;
        } catch (e) {
            return false;
        }
    },
    
    // Obtém sessão persistente do localStorage
    getPersistentSession() {
        try {
            const session = localStorage.getItem(this.PERSISTENT_SESSION_KEY);
            if (!session) return null;
            
            const sessionData = JSON.parse(session);
            const expiresAt = new Date(sessionData.expiresAt).getTime();
            
            if (Date.now() > expiresAt) {
                // Sessão expirou localmente, limpar
                this.clearPersistentSession();
                return null;
            }
            
            return {
                valid: true,
                token: sessionData.token,
                address: sessionData.address,
                role: sessionData.role,
                expiresAt: sessionData.expiresAt,
                remainingDays: Math.floor((expiresAt - Date.now()) / (24 * 60 * 60 * 1000))
            };
        } catch (e) {
            console.error('Error reading persistent session:', e);
            return null;
        }
    },
    
    // Salva sessão persistente
    savePersistentSession(token, address, role, expiresAt) {
        try {
            const sessionData = {
                token,
                address,
                role,
                expiresAt,
                savedAt: new Date().toISOString(),
                deviceInfo: this.getDeviceInfo()
            };
            localStorage.setItem(this.PERSISTENT_SESSION_KEY, JSON.stringify(sessionData));
            console.log(`📱 Sessão persistente salva: expira em ${new Date(expiresAt).toLocaleDateString()}`);
            return true;
        } catch (e) {
            console.error('Error saving persistent session:', e);
            return false;
        }
    },
    
    // Limpa sessão persistente
    clearPersistentSession() {
        try {
            const session = localStorage.getItem(this.PERSISTENT_SESSION_KEY);
            if (session) {
                const sessionData = JSON.parse(session);
                // Tentar revogar no servidor (fire and forget)
                this.revokeSessionOnServer(sessionData.token);
            }
        } catch (e) {}
        localStorage.removeItem(this.PERSISTENT_SESSION_KEY);
    },
    
    // Revoga sessão no servidor
    async revokeSessionOnServer(token) {
        try {
            const supabaseUrl = window.SUPABASE_URL || window.CONFIG?.SUPABASE_URL;
            if (!supabaseUrl || !token) return;
            
            await fetch(`${supabaseUrl}/functions/v1/auth-logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': window.SUPABASE_ANON_KEY || window.CONFIG?.SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ sessionToken: token })
            });
        } catch (e) {
            console.log('Session revoke request failed (non-critical)');
        }
    },
    
    // Valida sessão persistente no servidor
    async validatePersistentSession() {
        const session = this.getPersistentSession();
        if (!session || !session.token) return null;
        
        try {
            const supabaseUrl = window.SUPABASE_URL || window.CONFIG?.SUPABASE_URL;
            if (!supabaseUrl) return session; // Retorna sessão local se não conseguir validar
            
            const response = await fetch(`${supabaseUrl}/functions/v1/auth-check-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': window.SUPABASE_ANON_KEY || window.CONFIG?.SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ sessionToken: session.token })
            });
            
            const result = await response.json();
            
            if (result.ok) {
                console.log(`✅ Sessão validada: ${result.remainingDays} dias restantes`);
                // Atualizar dados locais se necessário
                return {
                    valid: true,
                    address: result.address,
                    role: result.role,
                    whitelisted: result.whitelisted,
                    remainingDays: result.remainingDays
                };
            } else {
                console.log('❌ Sessão inválida no servidor, limpando...');
                this.clearPersistentSession();
                return null;
            }
        } catch (e) {
            console.error('Session validation error:', e);
            return session; // Em caso de erro de rede, usa sessão local
        }
    },
    
    getUser() {
        // Primeiro, verificar sessão persistente
        if (this.isMobile()) {
            const persistentSession = this.getPersistentSession();
            if (persistentSession && persistentSession.valid) {
                return {
                    wallet: persistentSession.address,
                    role: persistentSession.role,
                    authenticated: true,
                    isPersistent: true,
                    remainingDays: persistentSession.remainingDays
                };
            }
        }
        
        // Fallback: sessionStorage
        const auth = sessionStorage.getItem(this.STORAGE_KEY);
        if (!auth) return null;
        try {
            return JSON.parse(auth);
        } catch (e) {
            return null;
        }
    },
    
    // Login atualizado para suportar sessão persistente
    login(wallet, options = {}) {
        const authData = {
            wallet: wallet,
            timestamp: Date.now(),
            authenticated: true,
            role: options.role || null
        };
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(authData));
        
        // Se mobile e recebeu token de sessão, salvar sessão persistente
        if (this.isMobile() && options.sessionToken && options.sessionExpiresAt) {
            this.savePersistentSession(
                options.sessionToken,
                wallet,
                options.role,
                options.sessionExpiresAt
            );
        }
        
        // Broadcast login event to all tabs
        SHDWChannel.broadcast('auth:login', { wallet, timestamp: Date.now() });
        
        return true;
    },
    
    // Logout atualizado para limpar sessão persistente
    logout(redirect = true) {
        // Limpar sessão persistente
        this.clearPersistentSession();
        
        // Limpar sessionStorage
        sessionStorage.removeItem(this.STORAGE_KEY);
        
        // Broadcast logout to all tabs
        SHDWChannel.broadcast('auth:logout', { timestamp: Date.now() });
        
        if (redirect) {
            window.location.href = 'login.html';
        }
    },
    
    // 🎉 BENNY is PUBLIC - Everyone is whitelisted!
    isWhitelisted(wallet) {
        return true; // All wallets have access
    },
    
    // RequireAuth atualizado - BENNY é público agora!
    async requireAuth() {
        // Se mobile, tentar validar sessão persistente primeiro
        if (this.isMobile()) {
            const persistentSession = await this.validatePersistentSession();
            if (persistentSession && persistentSession.valid) {
                // Sessão persistente válida - usuário autenticado
                // BENNY is PUBLIC - no whitelist check needed!
                return true;
            }
        }
        
        // Fallback: verificar sessionStorage
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        
        // Mostrar banner de trial do sessionStorage se aplicável
        const authData = this.getAuthData();
        if (authData) {
            this.showTrialBanner(authData);
        }
        
        return true;
    },
    
    // Mostrar banner de trial
    showTrialBanner(sessionData) {
        const trialBanner = document.getElementById('trialBanner');
        const trialDaysText = document.getElementById('trialDaysText');
        
        if (!trialBanner || !trialDaysText) return;
        
        if (sessionData.isTrial && sessionData.trialDaysRemaining > 0) {
            const days = sessionData.trialDaysRemaining;
            const daysText = days === 1 ? '1 day left' : `${days} days left`;
            trialDaysText.textContent = daysText;
            trialBanner.classList.remove('hidden');
        } else {
            trialBanner.classList.add('hidden');
        }
    },
    
    // Método síncrono para verificações rápidas (não valida no servidor)
    requireAuthSync() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
};

// Listen for auth events from other tabs
SHDWChannel.on('auth:logout', () => {
    if (window.location.pathname.includes('dashboard')) {
        window.location.href = 'login.html';
    }
});

SHDWChannel.on('auth:login', (data) => {
    console.log('🔐 User logged in from another tab:', data.wallet);
});

// ========================================
// REAL-TIME DATA MANAGER
// ========================================
const RealTimeManager = {
    updateInterval: null,
    priceInterval: null,
    isRunning: false,
    subscribers: new Map(),
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        console.log('🚀 Real-time manager started');
        
        // Initial load
        this.loadOpportunities();
        
        // Update opportunities every 30 seconds
        this.updateInterval = setInterval(() => {
            this.loadOpportunities();
        }, 30000);
        
        // Update prices every 5 seconds
        this.priceInterval = setInterval(() => {
            this.updatePrices();
        }, 5000);
        
        // Broadcast that real-time is active
        SHDWChannel.broadcast('realtime:started', { timestamp: Date.now() });
    },
    
    stop() {
        this.isRunning = false;
        if (this.updateInterval) clearInterval(this.updateInterval);
        if (this.priceInterval) clearInterval(this.priceInterval);
        
        SHDWChannel.broadcast('realtime:stopped', { timestamp: Date.now() });
    },
    
    async loadOpportunities() {
        try {
            // Use SupabaseService (new integration)
            if (typeof SupabaseService !== 'undefined') {
                console.log('📡 Loading opportunities from Supabase...');
                
                const opportunities = await SupabaseService.getOpportunities();
                const watchlist = await SupabaseService.getWatchlist();
                
                const result = {
                    opportunities: opportunities || [],
                    watchlist: watchlist || []
                };
                
                if (result.opportunities.length > 0) {
                    // Broadcast new opportunities
                    SHDWChannel.broadcast('opportunities:updated', {
                        opportunities: result.opportunities,
                        watchlist: result.watchlist,
                        timestamp: Date.now()
                    });
                    
                    // Notify local subscribers
                    this.notifySubscribers('opportunities', result);
                    console.log('✅ Opportunities loaded:', result.opportunities.length);
                } else {
                    console.log('ℹ️ No opportunities found in Supabase');
                }
            } else {
                console.warn('⚠️ SupabaseService not available');
            }
        } catch (error) {
            console.error('Failed to load opportunities:', error);
        }
    },
    
    async updatePrices() {
        try {
            // Prices are updated via WebSocket in dashboard.html
            // This is a fallback for REST API updates
            if (typeof BinanceAPI !== 'undefined') {
                const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'BNBUSDT'];
                
                for (const symbol of symbols) {
                    const ticker = await BinanceAPI.getTicker(symbol);
                    if (ticker) {
                        SHDWChannel.broadcast('price:update', {
                            symbol,
                            price: ticker.lastPrice,
                            change: ticker.priceChangePercent
                        });
                    }
                }
            }
        } catch (error) {
            // Silent fail for price updates
        }
    },
    
    subscribe(event, callback) {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        this.subscribers.get(event).push(callback);
    },
    
    notifySubscribers(event, data) {
        const callbacks = this.subscribers.get(event) || [];
        callbacks.forEach(cb => {
            try {
                cb(data);
            } catch (e) {}
        });
    }
};

// ========================================
// PAGE NAVIGATION MANAGER
// ========================================
const Navigation = {
    pages: {
        login: 'login.html',
        dashboard: 'dashboard.html',
        chart: 'dashboard.html',
        live: 'dashboard-live.html'
    },
    
    getCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('dashboard.html')) return 'chart';
        if (path.includes('dashboard-live')) return 'live';
        if (path.includes('dashboard')) return 'dashboard';
        if (path.includes('login')) return 'login';
        return 'unknown';
    },
    
    goTo(page, params = {}) {
        const url = this.pages[page];
        if (!url) return;
        
        // Store params in localStorage for the target page
        if (Object.keys(params).length > 0) {
            localStorage.setItem('shdwxbt_nav_params', JSON.stringify(params));
        }
        
        // Broadcast navigation
        SHDWChannel.broadcast('navigation', { page, params, timestamp: Date.now() });
        
        window.location.href = url;
    },
    
    getParams() {
        try {
            const params = localStorage.getItem('shdwxbt_nav_params');
            localStorage.removeItem('shdwxbt_nav_params');
            return params ? JSON.parse(params) : {};
        } catch (e) {
            return {};
        }
    },
    
    openChart(symbol) {
        localStorage.setItem('shdwxbt_symbol', symbol);
        SHDWChannel.broadcast('chart:open', { symbol, timestamp: Date.now() });
        this.goTo('chart', { symbol });
    }
};

// ========================================
// AUTO-START REAL-TIME ON DASHBOARD PAGES
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = Navigation.getCurrentPage();
    
    // Skip login page
    if (currentPage === 'login') return;
    
    // Check authentication
    if (!Auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Auto-start real-time manager on dashboard pages
    if (['dashboard', 'chart', 'live'].includes(currentPage)) {
        // Wait for other scripts to load
        setTimeout(() => {
            RealTimeManager.start();

            // Iniciar auto scanner com intervalo de 10 minutos (server-side scan-market)
            if (typeof AutoScanner !== 'undefined') {
                if (!window.__AUTO_SCANNER_RUNNING) {
                    window.__AUTO_SCANNER_RUNNING = true;
                    AutoScanner.start();
                } else {
                    console.log('ℹ️ Auto scanner already running');
                }
            } else {
                console.warn('⚠️ AutoScanner not available on this page');
            }
            
            // Iniciar monitoramento automático de targets
            if (typeof SupabaseService !== 'undefined' && SupabaseService.startTargetMonitoring) {
                SupabaseService.startTargetMonitoring(30000); // Verificar a cada 30s
                console.log('🎯 Target monitoring started');
            }
        }, 500);
    }
    
    // Listener para targets atingidos - DESABILITADO
    // window.addEventListener('targetHit', (event) => {
    //     const hits = event.detail;
    //     hits.forEach(hit => {
    //         showNotification(`🎯 ${hit.symbol} atingiu ${hit.target}!`, `Preço: ${hit.currentPrice.toFixed(6)}`, 'success');
    //     });
    // });
});

// Helper para mostrar notificações
function showNotification(title, message, type = 'info') {
    // Se existir um sistema de toast/notificação, usar aqui
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    
    // Fallback: alert visual simples
    if (typeof window !== 'undefined' && window.Notification && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: '/favicon.ico'
        });
    }
}

// ========================================
// TRANSLATION MODULE - COMPLETE i18n
// ========================================
const i18n = {
    currentLang: 'en',
    supportedLanguages: ['en', 'zh'],
    
    translations: {
        'en': {
            // System Status
            'sys_op': 'System Operational',
            'live_data': 'Live Data',
            'loading': 'Loading opportunities...',
            'loading_analysis': 'Loading analysis...',
            'waiting_selection': 'Waiting for asset selection...',
            'waiting_data': 'Waiting for data...',
            
            // Navigation
            'nav_dashboard': 'Dashboard',
            'nav_admin': 'Admin',
            
            // Stats
            'stat_active': 'Active Signals',
            'stat_bullish': 'Bullish Bias',
            'stat_bearish': 'Bearish Bias',
            'stat_watchlist': 'Watchlist',
            
            // Filters
            'filter_confirmed': 'Confirmed',
            'filter_active': 'Active',
            'filter_closed': 'Closed',
            
            // Sections
            'sec_confirmed': 'CONFIRMED OPPORTUNITIES',
            'sec_whitelist': 'WATCHLIST PROTOCOL',
            'sub_whitelist': 'Monitoring confirmation signals',
            
            // Trends
            'trend_bearish': 'Bearish',
            'trend_bullish': 'Bullish',
            
            // Card Labels
            'card_tech': 'Tech Zone',
            'card_invalid': 'Invalidation',
            'card_date': 'Date',
            'card_time': 'Time',
            'card_targets': 'Targets',
            'card_entry': 'ENTRY',
            'card_filled': 'FILLED',
            
            // Monitor/Watchlist
            'monitor_proto': 'WATCHLIST PROTOCOL',
            'monitor_desc': 'Scan initialized. Waiting for confirmation.',
            'status_pending': 'PENDING',
            
            // Auth
            'access_granted': 'ACCESS GRANTED',
            'connect_wallet': 'CONNECT WALLET',
            'not_whitelisted': 'NOT WHITELISTED',
            'enter_dashboard': 'ENTER DASHBOARD',
            'requesting_signature': 'REQUESTING SIGNATURE...',
            'checking_whitelist': 'CHECKING WHITELIST...',
            
            // Chart Overlay
            'overlay_levels': 'CHART LEVELS',
            'overlay_entry': 'Entry Zone',
            'overlay_stoploss': 'Stop Loss',
            'overlay_current': 'Current',
            'overlay_rr': 'R:R (TP1)',
            
            // Warnings
            'warn_title': 'Warning: Timeframes in opposite directions',
            'warn_text': 'Smaller and larger timeframes point in opposite directions. Both are correct according to the methodology. Warning created only to give more context to your decision.',
            
            // Sidebar Technical Data
            'sidebar_tech_data': 'Technical Data',
            'sidebar_trend': 'Target Trend',
            'sidebar_tf_signal': 'Timeframe (signal)',
            'sidebar_tf_target': 'Target Timeframe',
            'sidebar_fibo_382': 'Fibo 0.382',
            'sidebar_fibo_5': 'Fibo 0.5',
            'sidebar_fibo_618': 'Fibo 0.618',
            
            // Timeline
            'timeline_title': 'Signal Timeline',
            'timeline_signal': 'Signal Created',
            'timeline_zone': 'Entered Zone',
            'timeline_tp1': 'TP1 Hit',
            'timeline_tp2': 'TP2 Hit',
            'timeline_tp3': 'TP3 Hit',
            'timeline_sl': 'Stop Loss Hit',
            
            // Confluences
            'sidebar_conf_title': 'Thermometer Confluences',
            'sidebar_conf_positive': 'Positive Confluences',
            'sidebar_conf_negative': 'Negative Confluences',
            'sidebar_conf_score': 'Confidence Score',
            
            // Advanced Data
            'sidebar_advanced_title': 'Advanced Data',
            'sidebar_fib_zone': 'Fibonacci Zone',
            'sidebar_structure': 'Structure (AlphaDesk)',
            'sidebar_ls_ratio': 'Long/Short Ratio',
            'sidebar_funding': 'Funding Rate',
            'sidebar_oi': 'Open Interest 24h',
            
            // TP/SL History
            'tab_tp_history': 'TP History',
            'tab_sl_history': 'SL History',
            'tp_history_title': 'TAKE PROFITS HIT',
            'tp_appear_here': 'Take Profits will appear here when hit',
            'no_tp_24h': 'No TP recorded in the last 24h',
            'sl_history_title': 'STOP LOSSES HIT',
            'sl_appear_here': 'Stop Losses will appear here when hit',
            'no_sl_24h': 'No SL recorded in the last 24h',
            
            // My Trades
            'tab_my_trades': 'My Trades',
            'tab_my_trades_desc': 'Track your active trades',
            'trades_active': 'active',
            'my_trades_title': 'MY ACTIVE TRADES',
            'no_trades_desc': 'Click "Enter Trade" on any opportunity to track here',
            'no_trades': 'No active trades',
            
            // Thermometer Actions
            'action_strong_entry': 'STRONG ENTRY',
            'action_valid_entry': 'VALID ENTRY',
            'action_wait': 'WAIT',
            'action_avoid': 'AVOID',
            
            // Thermometer Levels
            'level_hot': 'Hot',
            'level_warm': 'Warm',
            'level_neutral': 'Neutral',
            'level_cold': 'Cold',
            'level_freezing': 'Freezing',
            
            // Buttons
            'btn_enter_trade': 'Enter Trade',
            'btn_close_trade': 'Close Trade',
            'btn_view_details': 'View Details',
            'btn_add_watchlist': 'Add to Watchlist',
            'btn_remove_watchlist': 'Remove from Watchlist',
            
            // Tiers
            'tier_s': 'Perfect Setup',
            'tier_a': 'Excellent',
            'tier_b': 'Good',
            'tier_c': 'Average',
            'tier_d': 'Weak'
        },
        
        'pt-br': {
            // Status do Sistema
            'sys_op': 'Sistema Operacional',
            'live_data': 'Dados em Tempo Real',
            'loading': 'Carregando oportunidades...',
            'loading_analysis': 'Carregando análise...',
            'waiting_selection': 'Aguardando seleção de ativo...',
            'waiting_data': 'Aguardando dados...',
            
            // Navegação
            'nav_dashboard': 'Painel',
            'nav_admin': 'Admin',
            
            // Estatísticas
            'stat_active': 'Sinais Ativos',
            'stat_bullish': 'Viés de Alta',
            'stat_bearish': 'Viés de Baixa',
            'stat_watchlist': 'Lista de Observação',
            
            // Filtros
            'filter_confirmed': 'Confirmados',
            'filter_active': 'Ativos',
            'filter_closed': 'Fechados',
            
            // Seções
            'sec_confirmed': 'OPORTUNIDADES CONFIRMADAS',
            'sec_whitelist': 'PROTOCOLO WATCHLIST',
            'sub_whitelist': 'Monitorando sinais de confirmação',
            
            // Tendências
            'trend_bearish': 'Baixa',
            'trend_bullish': 'Alta',
            
            // Labels dos Cards
            'card_tech': 'Zona Técnica',
            'card_invalid': 'Invalidação',
            'card_date': 'Data',
            'card_time': 'Hora',
            'card_targets': 'Alvos',
            'card_entry': 'ENTRADA',
            'card_filled': 'PREENCHIDO',
            
            // Monitor/Watchlist
            'monitor_proto': 'PROTOCOLO DE MONITORAMENTO',
            'monitor_desc': 'Varredura iniciada. Aguardando confirmação.',
            'status_pending': 'PENDENTE',
            
            // Autenticação
            'access_granted': 'ACESSO CONCEDIDO',
            'connect_wallet': 'CONECTAR CARTEIRA',
            'not_whitelisted': 'NÃO ESTÁ NA WHITELIST',
            'enter_dashboard': 'ENTRAR NO PAINEL',
            'requesting_signature': 'SOLICITANDO ASSINATURA...',
            'checking_whitelist': 'VERIFICANDO WHITELIST...',
            
            // Overlay do Gráfico
            'overlay_levels': 'NÍVEIS DO GRÁFICO',
            'overlay_entry': 'Zona de Entrada',
            'overlay_stoploss': 'Stop Loss',
            'overlay_current': 'Atual',
            'overlay_rr': 'R:R (TP1)',
            
            // Avisos
            'warn_title': 'Atenção: Timeframes em direções opostas',
            'warn_text': 'Timeframes menores e maiores apontam direções opostas. Ambos estão corretos conforme a metodologia. Aviso criado apenas para dar mais contexto à sua decisão.',
            
            // Dados Técnicos da Sidebar
            'sidebar_tech_data': 'Dados Técnicos',
            'sidebar_trend': 'Tendência do Alvo',
            'sidebar_tf_signal': 'Timeframe (sinal)',
            'sidebar_tf_target': 'Timeframe Alvo',
            'sidebar_fibo_382': 'Fibo 0.382',
            'sidebar_fibo_5': 'Fibo 0.5',
            'sidebar_fibo_618': 'Fibo 0.618',
            
            // Timeline
            'timeline_title': 'Linha do Tempo',
            'timeline_signal': 'Sinal Criado',
            'timeline_zone': 'Entrou na Zona',
            'timeline_tp1': 'TP1 Atingido',
            'timeline_tp2': 'TP2 Atingido',
            'timeline_tp3': 'TP3 Atingido',
            'timeline_sl': 'Stop Loss Atingido',
            
            // Confluências
            'sidebar_conf_title': 'Confluências do Termômetro',
            'sidebar_conf_positive': 'Confluências Positivas',
            'sidebar_conf_negative': 'Confluências Negativas',
            'sidebar_conf_score': 'Pontuação de Confiança',
            
            // Dados Avançados
            'sidebar_advanced_title': 'Dados Avançados',
            'sidebar_fib_zone': 'Zona Fibonacci',
            'sidebar_structure': 'Estrutura (AlphaDesk)',
            'sidebar_ls_ratio': 'Razão Long/Short',
            'sidebar_funding': 'Taxa de Funding',
            'sidebar_oi': 'Open Interest 24h',
            
            // Histórico TP/SL
            'tab_tp_history': 'Histórico TP',
            'tab_sl_history': 'Histórico SL',
            'tp_history_title': 'TAKE PROFITS ATINGIDOS',
            'tp_appear_here': 'Take Profits aparecerão aqui quando atingidos',
            'no_tp_24h': 'Nenhum TP registrado nas últimas 24h',
            'sl_history_title': 'STOP LOSSES ATINGIDOS',
            'sl_appear_here': 'Stop Losses aparecerão aqui quando atingidos',
            'no_sl_24h': 'Nenhum SL registrado nas últimas 24h',
            
            // Minhas Operações
            'tab_my_trades': 'Minhas Operações',
            'tab_my_trades_desc': 'Acompanhe seus trades ativos',
            'trades_active': 'ativos',
            'my_trades_title': 'MINHAS OPERAÇÕES ATIVAS',
            'no_trades_desc': 'Clique em "Entrar na Operação" em qualquer oportunidade para acompanhar aqui',
            'no_trades': 'Nenhuma operação ativa',
            
            // Ações do Termômetro
            'action_strong_entry': 'ENTRADA FORTE',
            'action_valid_entry': 'ENTRADA VÁLIDA',
            'action_wait': 'AGUARDAR',
            'action_avoid': 'EVITAR',
            
            // Níveis do Termômetro
            'level_hot': 'Quente',
            'level_warm': 'Morno',
            'level_neutral': 'Neutro',
            'level_cold': 'Frio',
            'level_freezing': 'Congelado',
            
            // Botões
            'btn_enter_trade': 'Entrar na Operação',
            'btn_close_trade': 'Fechar Operação',
            'btn_view_details': 'Ver Detalhes',
            'btn_add_watchlist': 'Adicionar à Watchlist',
            'btn_remove_watchlist': 'Remover da Watchlist',
            
            // Tiers
            'tier_s': 'Setup Perfeito',
            'tier_a': 'Excelente',
            'tier_b': 'Bom',
            'tier_c': 'Médio',
            'tier_d': 'Fraco'
        },
        
        'es': {
            // Estado del Sistema
            'sys_op': 'Sistema Operativo',
            'live_data': 'Datos en Vivo',
            'loading': 'Cargando oportunidades...',
            'loading_analysis': 'Cargando análisis...',
            'waiting_selection': 'Esperando selección de activo...',
            'waiting_data': 'Esperando datos...',
            
            // Navegación
            'nav_dashboard': 'Panel',
            'nav_admin': 'Admin',
            
            // Estadísticas
            'stat_active': 'Señales Activas',
            'stat_bullish': 'Sesgo Alcista',
            'stat_bearish': 'Sesgo Bajista',
            'stat_watchlist': 'Lista de Seguimiento',
            
            // Filtros
            'filter_confirmed': 'Confirmados',
            'filter_active': 'Activos',
            'filter_closed': 'Cerrados',
            
            // Secciones
            'sec_confirmed': 'OPORTUNIDADES CONFIRMADAS',
            'sec_whitelist': 'PROTOCOLO WATCHLIST',
            'sub_whitelist': 'Monitoreando señales de confirmación',
            
            // Tendencias
            'trend_bearish': 'Bajista',
            'trend_bullish': 'Alcista',
            
            // Etiquetas de Cards
            'card_tech': 'Zona Técnica',
            'card_invalid': 'Invalidación',
            'card_date': 'Fecha',
            'card_time': 'Hora',
            'card_targets': 'Objetivos',
            'card_entry': 'ENTRADA',
            'card_filled': 'EJECUTADO',
            
            // Monitor/Watchlist
            'monitor_proto': 'PROTOCOLO DE MONITOREO',
            'monitor_desc': 'Escaneo iniciado. Esperando confirmación.',
            'status_pending': 'PENDIENTE',
            
            // Autenticación
            'access_granted': 'ACCESO CONCEDIDO',
            'connect_wallet': 'CONECTAR BILLETERA',
            'not_whitelisted': 'NO ESTÁ EN LA WHITELIST',
            'enter_dashboard': 'ENTRAR AL PANEL',
            'requesting_signature': 'SOLICITANDO FIRMA...',
            'checking_whitelist': 'VERIFICANDO WHITELIST...',
            
            // Overlay del Gráfico
            'overlay_levels': 'NIVELES DEL GRÁFICO',
            'overlay_entry': 'Zona de Entrada',
            'overlay_stoploss': 'Stop Loss',
            'overlay_current': 'Actual',
            'overlay_rr': 'R:R (TP1)',
            
            // Advertencias
            'warn_title': 'Atención: Timeframes en direcciones opuestas',
            'warn_text': 'Los timeframes menores y mayores apuntan en direcciones opuestas. Ambos son correctos según la metodología. Aviso creado solo para dar más contexto a su decisión.',
            
            // Datos Técnicos del Sidebar
            'sidebar_tech_data': 'Datos Técnicos',
            'sidebar_trend': 'Tendencia Objetivo',
            'sidebar_tf_signal': 'Timeframe (señal)',
            'sidebar_tf_target': 'Timeframe Objetivo',
            'sidebar_fibo_382': 'Fibo 0.382',
            'sidebar_fibo_5': 'Fibo 0.5',
            'sidebar_fibo_618': 'Fibo 0.618',
            
            // Línea de Tiempo
            'timeline_title': 'Línea de Tiempo',
            'timeline_signal': 'Señal Creada',
            'timeline_zone': 'Entró en Zona',
            'timeline_tp1': 'TP1 Alcanzado',
            'timeline_tp2': 'TP2 Alcanzado',
            'timeline_tp3': 'TP3 Alcanzado',
            'timeline_sl': 'Stop Loss Alcanzado',
            
            // Confluencias
            'sidebar_conf_title': 'Confluencias del Termómetro',
            'sidebar_conf_positive': 'Confluencias Positivas',
            'sidebar_conf_negative': 'Confluencias Negativas',
            'sidebar_conf_score': 'Puntuación de Confianza',
            
            // Datos Avanzados
            'sidebar_advanced_title': 'Datos Avanzados',
            'sidebar_fib_zone': 'Zona Fibonacci',
            'sidebar_structure': 'Estructura (AlphaDesk)',
            'sidebar_ls_ratio': 'Ratio Long/Short',
            'sidebar_funding': 'Tasa de Funding',
            'sidebar_oi': 'Open Interest 24h',
            
            // Historial TP/SL
            'tab_tp_history': 'Historial TP',
            'tab_sl_history': 'Historial SL',
            'tp_history_title': 'TAKE PROFITS ALCANZADOS',
            'tp_appear_here': 'Los Take Profits aparecerán aquí cuando se alcancen',
            'no_tp_24h': 'Ningún TP registrado en las últimas 24h',
            'sl_history_title': 'STOP LOSSES ALCANZADOS',
            'sl_appear_here': 'Los Stop Losses aparecerán aquí cuando se alcancen',
            'no_sl_24h': 'Ningún SL registrado en las últimas 24h',
            
            // Mis Operaciones
            'tab_my_trades': 'Mis Operaciones',
            'tab_my_trades_desc': 'Sigue tus trades activos',
            'trades_active': 'activos',
            'my_trades_title': 'MIS OPERACIONES ACTIVAS',
            'no_trades_desc': 'Haz clic en "Entrar en Operación" en cualquier oportunidad para seguirla aquí',
            'no_trades': 'Sin operaciones activas',
            
            // Acciones del Termómetro
            'action_strong_entry': 'ENTRADA FUERTE',
            'action_valid_entry': 'ENTRADA VÁLIDA',
            'action_wait': 'ESPERAR',
            'action_avoid': 'EVITAR',
            
            // Niveles del Termómetro
            'level_hot': 'Caliente',
            'level_warm': 'Tibio',
            'level_neutral': 'Neutro',
            'level_cold': 'Frío',
            'level_freezing': 'Congelado',
            
            // Botones
            'btn_enter_trade': 'Entrar en Operación',
            'btn_close_trade': 'Cerrar Operación',
            'btn_view_details': 'Ver Detalles',
            'btn_add_watchlist': 'Añadir a Watchlist',
            'btn_remove_watchlist': 'Quitar de Watchlist',
            
            // Tiers
            'tier_s': 'Setup Perfecto',
            'tier_a': 'Excelente',
            'tier_b': 'Bueno',
            'tier_c': 'Medio',
            'tier_d': 'Débil'
        },
        
        'zh': {
            // 系统状态
            'sys_op': '系统运行中',
            'live_data': '实时数据',
            'loading': '加载机会中...',
            'loading_analysis': '加载分析中...',
            'waiting_selection': '等待资产选择...',
            'waiting_data': '等待数据...',
            
            // 导航
            'nav_dashboard': '仪表板',
            'nav_admin': '管理',
            
            // 统计
            'stat_active': '活跃信号',
            'stat_bullish': '看涨趋势',
            'stat_bearish': '看跌趋势',
            'stat_watchlist': '观察列表',
            
            // 筛选
            'filter_confirmed': '已确认',
            'filter_active': '活跃',
            'filter_closed': '已关闭',
            
            // 板块
            'sec_confirmed': '确认的机会',
            'sec_whitelist': '观察列表协议',
            'sub_whitelist': '监控确认信号',
            
            // 趋势
            'trend_bearish': '看跌',
            'trend_bullish': '看涨',
            
            // 卡片标签
            'card_tech': '技术区域',
            'card_invalid': '无效化',
            'card_date': '日期',
            'card_time': '时间',
            'card_targets': '目标',
            'card_entry': '入场',
            'card_filled': '已成交',
            
            // 监控/观察列表
            'monitor_proto': '监控协议',
            'monitor_desc': '扫描已启动。等待确认。',
            'status_pending': '待定',
            
            // 认证
            'access_granted': '访问已授权',
            'connect_wallet': '连接钱包',
            'not_whitelisted': '不在白名单',
            'enter_dashboard': '进入仪表板',
            'requesting_signature': '请求签名中...',
            'checking_whitelist': '检查白名单中...',
            
            // 图表叠加
            'overlay_levels': '图表级别',
            'overlay_entry': '入场区域',
            'overlay_stoploss': '止损',
            'overlay_current': '当前',
            'overlay_rr': '风险回报 (TP1)',
            
            // 警告
            'warn_title': '注意：时间框架方向相反',
            'warn_text': '较小和较大的时间框架指向相反的方向。根据方法论，两者都是正确的。此警告仅为您的决策提供更多背景。',
            
            // 侧边栏技术数据
            'sidebar_tech_data': '技术数据',
            'sidebar_trend': '目标趋势',
            'sidebar_tf_signal': '时间框架（信号）',
            'sidebar_tf_target': '目标时间框架',
            'sidebar_fibo_382': 'Fibo 0.382',
            'sidebar_fibo_5': 'Fibo 0.5',
            'sidebar_fibo_618': 'Fibo 0.618',
            
            // 时间线
            'timeline_title': '信号时间线',
            'timeline_signal': '信号创建',
            'timeline_zone': '进入区域',
            'timeline_tp1': 'TP1 达成',
            'timeline_tp2': 'TP2 达成',
            'timeline_tp3': 'TP3 达成',
            'timeline_sl': '止损触发',
            
            // 汇流
            'sidebar_conf_title': '温度计汇流',
            'sidebar_conf_positive': '正向汇流',
            'sidebar_conf_negative': '负向汇流',
            'sidebar_conf_score': '置信度得分',
            
            // 高级数据
            'sidebar_advanced_title': '高级数据',
            'sidebar_fib_zone': '斐波那契区域',
            'sidebar_structure': '结构 (AlphaDesk)',
            'sidebar_ls_ratio': '多空比率',
            'sidebar_funding': '资金费率',
            'sidebar_oi': '24h 未平仓量',
            
            // TP/SL 历史
            'tab_tp_history': 'TP 历史',
            'tab_sl_history': 'SL 历史',
            'tp_history_title': '已达成止盈',
            'tp_appear_here': '止盈达成后将显示在此处',
            'no_tp_24h': '过去24小时无TP记录',
            'sl_history_title': '已触发止损',
            'sl_appear_here': '止损触发后将显示在此处',
            'no_sl_24h': '过去24小时无SL记录',
            
            // 我的交易
            'tab_my_trades': '我的交易',
            'tab_my_trades_desc': '跟踪您的活跃交易',
            'trades_active': '活跃',
            'my_trades_title': '我的活跃交易',
            'no_trades_desc': '点击任何机会上的"进入交易"在此跟踪',
            'no_trades': '无活跃交易',
            
            // 温度计动作
            'action_strong_entry': '强力入场',
            'action_valid_entry': '有效入场',
            'action_wait': '等待',
            'action_avoid': '避免',
            
            // 温度计级别
            'level_hot': '热',
            'level_warm': '温',
            'level_neutral': '中性',
            'level_cold': '冷',
            'level_freezing': '冰冻',
            
            // 按钮
            'btn_enter_trade': '进入交易',
            'btn_close_trade': '关闭交易',
            'btn_view_details': '查看详情',
            'btn_add_watchlist': '添加到观察列表',
            'btn_remove_watchlist': '从观察列表移除',
            
            // 等级
            'tier_s': '完美设置',
            'tier_a': '优秀',
            'tier_b': '良好',
            'tier_c': '一般',
            'tier_d': '较弱',
            
            // 分析上下文翻译 (用于侧边栏)
            'setup_fundo_ascendente': '上升底部',
            'setup_topo_ascendente': '上升顶部',
            'setup_topo_descendente': '下降顶部',
            'setup_fundo_descendente': '下降底部',
            'analysis_scalping': '超短线',
            'analysis_day_trading': '日内交易',
            'analysis_swing_trade': '波段交易',
            'analysis_position': '长线交易',
            'analysis_pullback': '回调',
            'analysis_continuation': '延续',
            'analysis_confirmation': '确认',
            'analysis_invalidation': '失效条件',
            'analysis_fibonacci_discount': '折扣区',
            'analysis_fibonacci_premium': '溢价区',
            'analysis_fibonacci_equilibrium': '平衡区',
            'analysis_fibonacci_ote': '最佳入场区',
            'analysis_overbought': '超买',
            'analysis_oversold': '超卖',
            'analysis_neutral': '中性',
            'analysis_buying_pressure': '买方力量',
            'analysis_selling_pressure': '卖方力量',
            'analysis_wait_confirmation': '等待确认',
            'analysis_support': '支撑',
            'analysis_resistance': '阻力',
            'analysis_breakout': '突破',
            'analysis_retest': '回测',
            'analysis_ema_consistent': 'EMA与趋势一致',
            'analysis_rsi_aligned': 'RSI与价格走势一致',
            'analysis_ema_unfavorable': 'EMA处出现不利反应',
            'analysis_price_far_fibo': '价格远离斐波那契区域',
            'analysis_rsi_unfavorable': 'RSI对交易不利',
            'analysis_monitor_volatility': '监控波动性',
            'analysis_timeframe_conflict': '时间框架方向相反'
        },
        
        'ru': {
            // Статус системы
            'sys_op': 'Система Работает',
            'live_data': 'Живые Данные',
            'loading': 'Загрузка возможностей...',
            'loading_analysis': 'Загрузка анализа...',
            'waiting_selection': 'Ожидание выбора актива...',
            'waiting_data': 'Ожидание данных...',
            
            // Навигация
            'nav_dashboard': 'Панель',
            'nav_admin': 'Админ',
            
            // Статистика
            'stat_active': 'Активные Сигналы',
            'stat_bullish': 'Бычий Уклон',
            'stat_bearish': 'Медвежий Уклон',
            'stat_watchlist': 'Список Наблюдения',
            
            // Фильтры
            'filter_confirmed': 'Подтверждённые',
            'filter_active': 'Активные',
            'filter_closed': 'Закрытые',
            
            // Разделы
            'sec_confirmed': 'ПОДТВЕРЖДЁННЫЕ ВОЗМОЖНОСТИ',
            'sec_whitelist': 'ПРОТОКОЛ НАБЛЮДЕНИЯ',
            'sub_whitelist': 'Мониторинг сигналов подтверждения',
            
            // Тренды
            'trend_bearish': 'Медвежий',
            'trend_bullish': 'Бычий',
            
            // Метки карточек
            'card_tech': 'Тех. Зона',
            'card_invalid': 'Инвалидация',
            'card_date': 'Дата',
            'card_time': 'Время',
            'card_targets': 'Цели',
            'card_entry': 'ВХОД',
            'card_filled': 'ИСПОЛНЕНО',
            
            // Мониторинг
            'monitor_proto': 'ПРОТОКОЛ МОНИТОРИНГА',
            'monitor_desc': 'Сканирование запущено. Ожидание подтверждения.',
            'status_pending': 'ОЖИДАНИЕ',
            
            // Аутентификация
            'access_granted': 'ДОСТУП РАЗРЕШЁН',
            'connect_wallet': 'ПОДКЛЮЧИТЬ КОШЕЛЁК',
            'not_whitelisted': 'НЕ В БЕЛОМ СПИСКЕ',
            'enter_dashboard': 'ВОЙТИ В ПАНЕЛЬ',
            'requesting_signature': 'ЗАПРОС ПОДПИСИ...',
            'checking_whitelist': 'ПРОВЕРКА БЕЛОГО СПИСКА...',
            
            // Оверлей графика
            'overlay_levels': 'УРОВНИ ГРАФИКА',
            'overlay_entry': 'Зона Входа',
            'overlay_stoploss': 'Стоп Лосс',
            'overlay_current': 'Текущий',
            'overlay_rr': 'R:R (TP1)',
            
            // Предупреждения
            'warn_title': 'Внимание: Таймфреймы в противоположных направлениях',
            'warn_text': 'Младшие и старшие таймфреймы указывают в противоположных направлениях. Оба верны согласно методологии. Предупреждение создано для дополнительного контекста.',
            
            // Технические данные сайдбара
            'sidebar_tech_data': 'Технические Данные',
            'sidebar_trend': 'Целевой Тренд',
            'sidebar_tf_signal': 'Таймфрейм (сигнал)',
            'sidebar_tf_target': 'Целевой Таймфрейм',
            'sidebar_fibo_382': 'Fibo 0.382',
            'sidebar_fibo_5': 'Fibo 0.5',
            'sidebar_fibo_618': 'Fibo 0.618',
            
            // Таймлайн
            'timeline_title': 'Хронология Сигнала',
            'timeline_signal': 'Сигнал Создан',
            'timeline_zone': 'Вошёл в Зону',
            'timeline_tp1': 'TP1 Достигнут',
            'timeline_tp2': 'TP2 Достигнут',
            'timeline_tp3': 'TP3 Достигнут',
            'timeline_sl': 'Стоп Лосс Достигнут',
            
            // Конфлюенции
            'sidebar_conf_title': 'Конфлюенции Термометра',
            'sidebar_conf_positive': 'Положительные Конфлюенции',
            'sidebar_conf_negative': 'Отрицательные Конфлюенции',
            'sidebar_conf_score': 'Оценка Уверенности',
            
            // Продвинутые данные
            'sidebar_advanced_title': 'Продвинутые Данные',
            'sidebar_fib_zone': 'Зона Фибоначчи',
            'sidebar_structure': 'Структура (AlphaDesk)',
            'sidebar_ls_ratio': 'Соотношение Long/Short',
            'sidebar_funding': 'Ставка Финансирования',
            'sidebar_oi': 'Открытый Интерес 24ч',
            
            // История TP/SL
            'tab_tp_history': 'История TP',
            'tab_sl_history': 'История SL',
            'tp_history_title': 'ДОСТИГНУТЫЕ TAKE PROFITS',
            'tp_appear_here': 'Take Profits появятся здесь при достижении',
            'no_tp_24h': 'Нет TP за последние 24ч',
            'sl_history_title': 'ДОСТИГНУТЫЕ STOP LOSSES',
            'sl_appear_here': 'Stop Losses появятся здесь при достижении',
            'no_sl_24h': 'Нет SL за последние 24ч',
            
            // Мои Сделки
            'tab_my_trades': 'Мои Сделки',
            'tab_my_trades_desc': 'Отслеживайте активные сделки',
            'trades_active': 'активных',
            'my_trades_title': 'МОИ АКТИВНЫЕ СДЕЛКИ',
            'no_trades_desc': 'Нажмите "Войти в Сделку" на любой возможности для отслеживания',
            'no_trades': 'Нет активных сделок',
            
            // Действия термометра
            'action_strong_entry': 'СИЛЬНЫЙ ВХОД',
            'action_valid_entry': 'ДОПУСТИМЫЙ ВХОД',
            'action_wait': 'ЖДАТЬ',
            'action_avoid': 'ИЗБЕГАТЬ',
            
            // Уровни термометра
            'level_hot': 'Горячий',
            'level_warm': 'Тёплый',
            'level_neutral': 'Нейтральный',
            'level_cold': 'Холодный',
            'level_freezing': 'Морозный',
            
            // Кнопки
            'btn_enter_trade': 'Войти в Сделку',
            'btn_close_trade': 'Закрыть Сделку',
            'btn_view_details': 'Подробнее',
            'btn_add_watchlist': 'Добавить в Наблюдение',
            'btn_remove_watchlist': 'Удалить из Наблюдения',
            
            // Уровни
            'tier_s': 'Идеальный Сетап',
            'tier_a': 'Отличный',
            'tier_b': 'Хороший',
            'tier_c': 'Средний',
            'tier_d': 'Слабый'
        }
    },
    
    t(key) {
        return this.translations[this.currentLang]?.[key] || this.translations['en']?.[key] || key;
    },
    
    setLanguage(lang) {
        if (!this.translations[lang]) return;

        this.currentLang = lang;
        localStorage.setItem('shdwxbt_lang', this.currentLang);
        this.updateUI();
    },
    
    // Ciclar entre idiomas suportados
    toggle() {
        const langs = this.supportedLanguages;
        const currentIndex = langs.indexOf(this.currentLang);
        const nextIndex = (currentIndex + 1) % langs.length;
        this.setLanguage(langs[nextIndex]);
    },
    
    // Mostrar menu de seleção de idioma
    showLanguageMenu() {
        const existing = document.getElementById('lang-menu');
        if (existing) {
            existing.remove();
            return;
        }
        
        const langNames = {
            'en': '🇺🇸 English',
            'zh': '🇨🇳 中文'
        };
        
        const menu = document.createElement('div');
        menu.id = 'lang-menu';
        menu.className = 'fixed z-[9999] bg-zinc-900/95 border border-zinc-700 rounded-lg shadow-2xl backdrop-blur-sm overflow-hidden';
        menu.style.cssText = 'min-width: 160px;';
        
        this.supportedLanguages.forEach(lang => {
            const btn = document.createElement('button');
            btn.className = `w-full px-4 py-2.5 text-left text-sm font-mono hover:bg-zinc-800 transition-colors flex items-center gap-2 ${lang === this.currentLang ? 'bg-emerald-500/20 text-emerald-400' : 'text-white'}`;
            btn.innerHTML = `${langNames[lang] || lang.toUpperCase()} ${lang === this.currentLang ? '<span class="ml-auto">✓</span>' : ''}`;
            btn.onclick = () => {
                this.setLanguage(lang);
                menu.remove();
            };
            menu.appendChild(btn);
        });
        
        // Posicionar menu próximo ao botão de idioma
        const langBtn = document.getElementById('lang-toggle');
        if (langBtn) {
            const rect = langBtn.getBoundingClientRect();
            menu.style.top = (rect.bottom + 8) + 'px';
            menu.style.right = (window.innerWidth - rect.right) + 'px';
        } else {
            menu.style.top = '60px';
            menu.style.right = '20px';
        }
        
        document.body.appendChild(menu);
        
        // Fechar ao clicar fora
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target) && e.target.id !== 'lang-toggle') {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    },
    
    updateUI() {
        const langLabel = document.getElementById('current-lang');
        if (langLabel) {
            // Mostrar bandeira + código
            const flags = { 'en': '🇺🇸', 'zh': '🇨🇳' };
            langLabel.textContent = `${flags[this.currentLang] || ''} ${this.currentLang.toUpperCase()}`;
        }
        
        document.documentElement.lang = this.currentLang;
        
        // Texto interno
        document.querySelectorAll('[data-key]').forEach(el => {
            const key = el.getAttribute('data-key');
            const translation = this.translations[this.currentLang]?.[key] || this.translations['en']?.[key];
            if (translation) {
                el.textContent = translation;
            }
        });
        // Placeholder
        document.querySelectorAll('[data-key-placeholder]').forEach(el => {
            const key = el.getAttribute('data-key-placeholder');
            const translation = this.translations[this.currentLang]?.[key] || this.translations['en']?.[key];
            if (translation) {
                el.placeholder = translation;
            }
        });
        // Title / tooltip
        document.querySelectorAll('[data-key-title]').forEach(el => {
            const key = el.getAttribute('data-key-title');
            const translation = this.translations[this.currentLang]?.[key] || this.translations['en']?.[key];
            if (translation) {
                el.title = translation;
            }
        });
        // aria-label
        document.querySelectorAll('[data-key-aria]').forEach(el => {
            const key = el.getAttribute('data-key-aria');
            const translation = this.translations[this.currentLang]?.[key] || this.translations['en']?.[key];
            if (translation) {
                el.setAttribute('aria-label', translation);
            }
        });
        
        // Disparar evento customizado para componentes dinâmicos
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: this.currentLang } }));
    },
    
    init() {
        // 1) Preferência salva
        const savedLang = localStorage.getItem('shdwxbt_lang');
        if (savedLang && this.translations[savedLang]) {
            this.currentLang = savedLang;
        } else {
            // 2) Detectar idioma do navegador
            const navLang = (navigator.language || 'en').toLowerCase();
            if (navLang.startsWith('zh')) this.currentLang = 'zh';
            else this.currentLang = 'en';
        }
        this.updateUI();
    }
};

// ========================================
// CHART MODULE (TradingView Integration)
// ========================================
const Chart = {
    SYMBOL_KEY: 'shdwxbt_symbol',
    widget: null,
    
    getSelectedSymbol() {
        return localStorage.getItem(this.SYMBOL_KEY) || 'BTCUSDT';
    },
    
    setSelectedSymbol(symbol) {
        localStorage.setItem(this.SYMBOL_KEY, symbol);
    },
    
    loadChart(symbol, containerId = 'tradingview-widget') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (typeof TradingView === 'undefined') {
            console.warn('TradingView library not loaded');
            return;
        }
        
        this.widget = new TradingView.widget({
            "autosize": true,
            "symbol": "BINANCE:" + symbol,
            "interval": "60",
            "timezone": "America/Sao_Paulo",
            "theme": "dark",
            "style": "1",
            "locale": i18n.currentLang === 'pt-br' ? 'br' : 'en',
            "toolbar_bg": "#0a0a0a",
            "enable_publishing": false,
            "hide_side_toolbar": false,
            "allow_symbol_change": true,
            "container_id": containerId,
            "studies": [
                "MAExp@tv-basicstudies",
                "RSI@tv-basicstudies"
            ],
            "overrides": {
                "paneProperties.background": "#050505",
                "paneProperties.vertGridProperties.color": "#111",
                "paneProperties.horzGridProperties.color": "#111",
                "scalesProperties.textColor": "#AAA"
            }
        });
    },
    
    openChart(symbol) {
        this.setSelectedSymbol(symbol);
        window.location.href = 'dashboard.html';
    }
};

// ========================================
// OPPORTUNITIES DATA
// ========================================
const Opportunities = {
    data: {
        'XRPUSDT': {
            name: 'RIPPLE',
            symbol: 'XRPUSDT',
            trend: 'bearish',
            timeframe: '15m | 4h',
            techZone: '2.0748 - 2.0881',
            invalidation: '2.1000 (0.89%)',
            targets: ['TP1: 2.0629', 'TP2: 2.0447 (1.77%)', 'TP3: 2.0265 (2.64%)'],
            fibo: { '0.382': '2.0629', '0.5': '2.0548', '0.618': '2.0467' },
            confidence: 44,
            pnl: '+1.01%',
            filled: 44,
            status: 'confirmed',
            date: '16/01/2026',
            time: '21:45:00',
            context: 'XRPUSDT iniciou uma correção no tempo gráfico 4h em busca do seu topo descendente.',
            positiveConf: ['EMAs coerentes com o contexto', 'RSI do 15min alinhado ao movimento do preço'],
            negativeConf: ['Reação desfavorável na EMA 12 do 15min', 'Preço longe das zonas de Fibo']
        },
        'DOGEUSDT': {
            name: 'DOGE',
            symbol: 'DOGEUSDT',
            trend: 'bearish',
            timeframe: '5m | 1h',
            techZone: '0.1379 - 0.1393',
            invalidation: '0.1400 (1.01%)',
            targets: ['TP1: 0.1372', 'TP2: 0.1361 (1.79%)', 'TP3: 0.1350 (2.58%)'],
            fibo: { '0.382': '0.13618', '0.5': '0.13653', '0.618': '0.13689' },
            confidence: 47,
            pnl: '+1.01%',
            filled: 47,
            status: 'confirmed',
            date: '16/01/2026',
            time: '19:03:00',
            context: 'DOGEUSDT iniciou uma correção no tempo gráfico 1h em busca do seu topo descendente.',
            positiveConf: ['EMAs coerentes com o contexto', 'RSI do 15min alinhado ao movimento do preço'],
            negativeConf: ['Reação desfavorável na EMA 12 do 15min', 'RSI do 15min desfavorável ao trade', 'Preço longe das zonas de Fibo']
        },
        'LINKUSDT': {
            name: 'Chainlink',
            symbol: 'LINKUSDT',
            trend: 'bullish',
            timeframe: '1h | 1D',
            techZone: '13.563 - 13.361',
            invalidation: '13.300 (1.20%)',
            targets: ['TP1: 13.624', 'TP2: 13.932 (3.49%)', 'TP3: 14.240 (5.78%)'],
            fibo: { '0.382': '13.624', '0.5': '13.778', '0.618': '13.932' },
            confidence: 47,
            pnl: '+1.20%',
            filled: 47,
            status: 'active',
            date: '15/01/2026',
            time: '05:03:00',
            context: 'LINKUSDT está formando um fundo ascendente no tempo gráfico Diário.',
            positiveConf: ['Tendência de alta no Diário', 'Volume crescente'],
            negativeConf: ['Resistência na EMA 200']
        },
        'SOLUSDT': {
            name: 'Solana',
            symbol: 'SOLUSDT',
            trend: 'bearish',
            timeframe: '4h | 1W',
            techZone: '145.27 - 158.45',
            invalidation: '158.50 (4.37%)',
            targets: ['TP1: 145.22', 'TP2: 131.03 (13.72%)', 'TP3: 116.84 (23.06%)'],
            fibo: { '0.382': '145.22', '0.5': '138.12', '0.618': '131.03' },
            confidence: 32,
            pnl: '+4.37%',
            filled: 32,
            status: 'active',
            date: '13/01/2026',
            time: '17:03:00',
            context: 'SOLUSDT em tendência de baixa no semanal, buscando alvos de Fibonacci.',
            positiveConf: ['Tendência de baixa confirmada'],
            negativeConf: ['Alto volume de compra', 'Suporte próximo']
        }
    },
    
    get(symbol) {
        return this.data[symbol] || null;
    },
    
    getAll() {
        return Object.values(this.data);
    },
    
    getByStatus(status) {
        return this.getAll().filter(opp => opp.status === status);
    }
};

// ========================================
// VIDEO BACKGROUND MODULE
// ========================================
const VideoBackground = {
    videoSrc: 'https://customer-cbeadsgr09pnsezs.cloudflarestream.com/b17f76a1270818e8cdc55e8719b9ace8/manifest/video.m3u8',
    
    init() {
        const video = document.getElementById('bg-video');
        if (!video) return;
        
        if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
            hls.loadSource(this.videoSrc);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = this.videoSrc;
            video.addEventListener('loadedmetadata', () => video.play());
        }
    }
};

// ========================================
// FILTER MODULE
// ========================================
const Filter = {
    init() {
        const filterBtns = document.querySelectorAll('[data-filter]');
        const cards = document.querySelectorAll('[data-status]');
        
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                filterBtns.forEach(b => {
                    b.classList.remove('bg-white/10', 'text-white', 'border', 'border-white/5', 'shadow-[0_0_15px_rgba(255,255,255,0.1)]');
                    b.classList.add('text-white/40');
                });
                btn.classList.add('bg-white/10', 'text-white', 'border', 'border-white/5', 'shadow-[0_0_15px_rgba(255,255,255,0.1)]');
                btn.classList.remove('text-white/40');
                
                // Filter cards
                const filter = btn.getAttribute('data-filter');
                cards.forEach(card => {
                    if (filter === 'all' || card.getAttribute('data-status') === filter) {
                        card.style.display = '';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }
};

// ========================================
// MODAL MODULE
// ========================================
const Modal = {
    element: null,
    
    init() {
        this.element = document.getElementById('analysis-modal');
        
        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });
    },
    
    open(symbol) {
        if (!this.element) return;
        
        const data = Opportunities.get(symbol);
        if (!data) return;
        
        // Update modal content
        this.updateContent(data);
        
        // Load chart
        Chart.loadChart(symbol);
        
        // Show modal
        this.element.classList.remove('hidden');
        void this.element.offsetWidth;
        this.element.classList.remove('opacity-0');
        document.body.style.overflow = 'hidden';
    },
    
    close() {
        if (!this.element) return;
        
        this.element.classList.add('opacity-0');
        setTimeout(() => {
            this.element.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    },
    
    updateContent(data) {
        // Update header
        const header = this.element.querySelector('.p-6.border-b h2');
        if (header) header.textContent = data.name;
        
        const symbol = this.element.querySelector('.p-6.border-b span.text-zinc-500');
        if (symbol) symbol.textContent = data.symbol;
    }
};

// ========================================
// GLOBAL FUNCTIONS (for HTML onclick handlers)
// ========================================
function toggleLanguage() {
    i18n.toggle();
}

function logout() {
    Auth.logout();
}

function openChart(symbol) {
    Chart.openChart(symbol);
}

function openAnalysis(pair, name, trend) {
    Modal.open(pair);
}

function closeAnalysis() {
    Modal.close();
}

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize video background
    VideoBackground.init();
    
    // Initialize translations
    i18n.init();
    
    // Initialize lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Initialize filter (if on dashboard)
    Filter.init();
    
    // Initialize modal (if exists)
    Modal.init();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Auth, i18n, Chart, Opportunities, VideoBackground, Filter, Modal };
}
