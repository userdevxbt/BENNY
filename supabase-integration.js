let supabaseClient = null;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 5;

function getConfig() {
    if (typeof SHDWXBT_CONFIG !== 'undefined') {
        return { url: SHDWXBT_CONFIG.SUPABASE_URL, anonKey: SHDWXBT_CONFIG.SUPABASE_ANON_KEY };
    }
    console.warn('⚠️ SHDWXBT_CONFIG not found');
    return { url: '', anonKey: '' };
}

function initSupabase() {
    try {
        initAttempts++;
        console.log(`🔧 Supabase init attempt ${initAttempts}/${MAX_INIT_ATTEMPTS}`);
        
        const config = getConfig();
        if (!config.url || !config.anonKey) {
            console.warn('⚠️ Supabase config missing');
            return false;
        }
        
        // Try multiple ways to access Supabase library
        let supabaseLib = null;
        
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            supabaseLib = window.supabase;
            console.log('✅ Found window.supabase');
        } else if (typeof window.supabasejs !== 'undefined' && window.supabasejs.createClient) {
            supabaseLib = window.supabasejs;
            console.log('✅ Found window.supabasejs');
        } else if (typeof supabase !== 'undefined' && supabase.createClient) {
            supabaseLib = supabase;
            console.log('✅ Found global supabase');
        }
        
        if (supabaseLib && supabaseLib.createClient) {
            supabaseClient = supabaseLib.createClient(config.url, config.anonKey);
            console.log('✅ Supabase client initialized successfully');
            return true;
        }
        
        console.warn('⚠️ Supabase library not found - will retry');
        return false;
    } catch (error) {
        console.error('❌ Supabase init error:', error);
        return false;
    }
}

// Retry init every 500ms until successful or max attempts reached
async function ensureSupabaseInit() {
    if (supabaseClient) return true;
    
    for (let i = 0; i < MAX_INIT_ATTEMPTS; i++) {
        if (initSupabase()) return true;
        await new Promise(r => setTimeout(r, 500));
    }
    
    return false;
}

const SupabaseService = {
    opportunitiesBySymbol: new Map(),
    monitoringInterval: null,
    presenceChannel: null,

    getOpportunity(symbol) { return this.opportunitiesBySymbol.get(symbol); },

    updateOpportunitiesCache(opportunities) {
        if (!opportunities || !Array.isArray(opportunities)) return;
        opportunities.forEach(opp => { if (opp && opp.symbol) this.opportunitiesBySymbol.set(opp.symbol, opp); });
    },

    async getOpportunities() {
        try {
            // Ensure Supabase is initialized
            const initialized = await ensureSupabaseInit();
            if (!initialized) {
                console.error('❌ getOpportunities: Could not initialize Supabase after retries');
                return [];
            }
            
            // Same limit for all devices - unified experience
            const limit = 2000;
            
            console.log(`📡 Fetching opportunities (limit: ${limit})...`);
            
            const { data, error } = await supabaseClient.functions.invoke('get-opportunities', { 
                body: { isActive: true, limit: limit } 
            });
            
            if (error) {
                console.error('❌ getOpportunities error:', error);
                throw error;
            }
            
            const opportunities = data?.data || [];
            console.log(`✅ Fetched ${opportunities.length} opportunities (total available: ${data?.total || 'unknown'})`);
            
            this.updateOpportunitiesCache(opportunities);
            return opportunities;
        } catch (error) { 
            console.error('❌ getOpportunities catch:', error);
            return []; 
        }
    },

    async getWatchlist() {
        try {
            // Ensure Supabase is initialized
            const initialized = await ensureSupabaseInit();
            if (!initialized) {
                console.error('❌ getWatchlist: Could not initialize Supabase after retries');
                return [];
            }
            
            console.log('📡 Fetching watchlist from Edge Function...');
            
            // Request up to 500 watchlist items
            const { data, error } = await supabaseClient.functions.invoke('get-watchlist', { 
                body: { limit: 500 } 
            });
            
            if (error) {
                console.error('❌ getWatchlist error:', error);
                throw error;
            }
            
            const watchlist = data?.data || [];
            console.log(`✅ Fetched ${watchlist.length} watchlist items`);
            
            return watchlist;
        } catch (error) { 
            console.error('❌ getWatchlist catch:', error);
            return []; 
        }
    },

    async createOpportunity(opportunity) { return null; },
    async createWatchlistItem(item) { return null; },
    async updateTargets(symbol, targets) { return null; },

    async markTargetHit(symbol, targetNumber, currentPrice, direction) {
        // targetNumber: -1 = zone hit, 0 = stop loss, 1/2/3 = TP levels
        if (!symbol) return null;
        const validTargets = [-1, 0, 1, 2, 3];
        if (!validTargets.includes(Number(targetNumber))) return null;
        
        try {
            if (!supabaseClient) initSupabase();
            const opportunity = this.getOpportunity(symbol);
            
            // CRITICAL: Only call API if we have this opportunity in our cache
            // This prevents 404 errors for symbols not in our opportunities table
            if (!opportunity) {
                // Silently skip - this symbol is not in our tracked opportunities
                return null;
            }
            
            // For TP hits (1, 2, 3), check if already hit
            if (targetNumber > 0) {
                const tpHitField = `tp_hit_${targetNumber}`;
                if (opportunity[tpHitField] === true) return opportunity;
            }
            
            // For zone hit (-1), check if already hit
            if (targetNumber === -1) {
                if (opportunity.zone_hit === true || opportunity.entry_zone_hit === true) return opportunity;
            }
            
            // For SL hit (0), check if already hit
            if (targetNumber === 0) {
                if (opportunity.sl_hit === true || opportunity.is_stopped === true) return opportunity;
            }
            
            // Send to Supabase Edge Function
            const { data, error } = await supabaseClient.functions.invoke('mark-target', {
                body: { 
                    symbol, 
                    tp_index: targetNumber, 
                    hit_price: currentPrice, 
                    direction: direction || opportunity.trend || 'bullish',
                    hit_type: targetNumber === -1 ? 'zone' : (targetNumber === 0 ? 'stop_loss' : 'take_profit')
                }
            });
            
            if (error) {
                // Only log if it's not a 404 (opportunity not found is expected in some cases)
                if (!error.message?.includes('404') && !error.message?.includes('not found')) {
                    console.warn(`☁️ markTargetHit error for ${symbol}:`, error);
                }
                return null;
            }
            
            if (data?.updated && data.row) {
                this.opportunitiesBySymbol.set(symbol, data.row);
            }
            
            return data?.row || null;
        } catch (error) { 
            // Silently handle errors to avoid console spam
            return null; 
        }
    },

    async closeOpportunity(symbol) { return null; },
    async syncOpportunities(opportunities) { return []; },
    setupRealtime(onUpdate) { return null; },

    async monitorTargets() {
        try {
            if (!supabaseClient) initSupabase();
            const { data, error } = await supabaseClient.functions.invoke('get-opportunities', { body: { isActive: true, limit: 2000 } });
            if (error) throw error;
            const opportunities = data?.data || [];
            if (!opportunities || opportunities.length === 0) return [];
            this.updateOpportunitiesCache(opportunities);
            const targetHits = [];
            for (const opp of opportunities) {
                const currentPrice = opp.current_price;
                const direction = opp.direction || opp.trend;
                const fibExtensions = opp.fibonacci_extensions || [1.272, 1.618, 2.0];
                const entryPrice = opp.entry_price;
                const stopLoss = opp.stop_loss;
                if (!currentPrice || !entryPrice || !stopLoss) continue;
                const range = Math.abs(entryPrice - stopLoss);
                const targets = {};
                fibExtensions.forEach((ext, index) => {
                    const tpNumber = index + 1;
                    let targetPrice = direction === 'bullish' ? entryPrice + (range * ext) : entryPrice - (range * ext);
                    targets[`tp${tpNumber}`] = { price: targetPrice, hit: opp[`tp_hit_${tpNumber}`] || opp.targets?.[`tp${tpNumber}Hit`] || false };
                });
                for (let i = 1; i <= 3; i++) {
                    const tp = targets[`tp${i}`];
                    if (!tp || tp.hit) continue;
                    const tolerance = tp.price * 0.001;
                    let targetReached = direction === 'bullish' ? currentPrice >= (tp.price - tolerance) : currentPrice <= (tp.price + tolerance);
                    if (targetReached) {
                        await this.markTargetHit(opp.symbol, i, currentPrice, direction);
                        targetHits.push({ symbol: opp.symbol, target: `TP${i}`, targetPrice: tp.price, currentPrice: currentPrice, timestamp: new Date().toISOString() });
                    }
                }
            }
            return targetHits;
        } catch (error) { return []; }
    },

    startTargetMonitoring(intervalMs = 30000) {
        if (this.monitoringInterval) return;
        this.monitorTargets().catch(e => {});
        const self = this;
        this.monitoringInterval = setInterval(function() {
            self.monitorTargets().then(function(hits) {
                if (hits && hits.length > 0 && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('targetHit', { detail: hits }));
                }
            }).catch(function(e) {});
        }, intervalMs);
    },

    stopTargetMonitoring() {
        if (this.monitoringInterval) { clearInterval(this.monitoringInterval); this.monitoringInterval = null; }
    },

    async startPresenceTracking() {
        try {
            if (!supabaseClient) return;
            let userWallet = 'anonymous_' + Date.now();
            const sessionKey = typeof SHDWXBT_CONFIG !== 'undefined' ? SHDWXBT_CONFIG.SESSION_KEY : 'shdwxbt_auth';
            const authData = sessionStorage.getItem(sessionKey);
            if (authData) { try { const auth = JSON.parse(authData); userWallet = auth.wallet || userWallet; } catch(e) {} }
            this.presenceChannel = supabaseClient.channel('dashboard_presence', { config: { presence: { key: userWallet } } });
            const self = this;
            this.presenceChannel.on('presence', { event: 'sync' }, function() {}).subscribe(async function(status) {
                if (status === 'SUBSCRIBED') {
                    await self.presenceChannel.track({ wallet: userWallet, page: 'dashboard', joined_at: new Date().toISOString() });
                }
            });
        } catch (e) {}
    },

    async stopPresenceTracking() {
        if (this.presenceChannel) {
            await this.presenceChannel.untrack();
            await supabaseClient.removeChannel(this.presenceChannel);
            this.presenceChannel = null;
        }
    }
};

if (typeof window !== 'undefined') {
    window.SupabaseService = SupabaseService;
    window.supabaseIntegration = SupabaseService;
    
    // More robust initialization for mobile
    const tryInit = async function() {
        console.log('🔧 Starting SupabaseService initialization...');
        
        // Try to init with retries
        const success = await ensureSupabaseInit();
        
        if (success) {
            console.log('✅ SupabaseService ready');
            // Don't auto-fetch - let dashboard handle it
        } else {
            console.error('❌ SupabaseService failed to initialize after all retries');
        }
    };
    
    // Run init when document is ready
    if (document.readyState === 'loading') { 
        document.addEventListener('DOMContentLoaded', tryInit); 
    } else { 
        // Small delay to ensure all scripts are loaded
        setTimeout(tryInit, 100);
    }
    
    window.addEventListener('beforeunload', function() { 
        if (SupabaseService.presenceChannel) {
            SupabaseService.stopPresenceTracking(); 
        }
    });
}

if (typeof module !== 'undefined' && module.exports) { module.exports = SupabaseService; }
