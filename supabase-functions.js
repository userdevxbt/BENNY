function getSupabaseUrl() {
  if (typeof SHDWXBT_CONFIG !== 'undefined' && SHDWXBT_CONFIG.SUPABASE_URL) return SHDWXBT_CONFIG.SUPABASE_URL;
  return '';
}

function getSupabaseAnonKey() {
  if (typeof SHDWXBT_CONFIG !== 'undefined' && SHDWXBT_CONFIG.SUPABASE_ANON_KEY) return SHDWXBT_CONFIG.SUPABASE_ANON_KEY;
  return '';
}

class SupabaseFunctions {
  static async _request(endpoint, body = {}) {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();
    if (!url || !key) throw new Error('Configuration not loaded');
    return fetch(`${url}${endpoint}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  static async analyzeSymbol(symbol, profile) {
    try {
      const response = await this._request('/functions/v1/analyze-symbol', { symbol, profile });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || response.statusText); }
      return await response.json();
    } catch (error) { throw error; }
  }

  static async scanMarket(options = {}) {
    try {
      const profile = options.profile || { name: 'Day Trading' };
      const maxSymbols = options.maxSymbols || 400;
      const minConfluence = options.minConfluence || 30;
      const minVolume = options.minVolume || 3000000;
      const route = options.route || 'all';
      const response = await this._request('/functions/v1/scan-market', { maxSymbols, minConfluence, minVolume, route });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || response.statusText); }
      return await response.json();
    } catch (error) { throw error; }
  }

  static async getOpportunities(options = {}) {
    try {
      const response = await this._request('/functions/v1/get-opportunities', {
        isActive: options.isActive !== false,
        minConfluence: options.minConfluence || 0,
        direction: options.direction,
        tradingProfile: options.tradingProfile,
        limit: options.limit || 2000
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || response.statusText); }
      const result = await response.json();
      return result.data || [];
    } catch (error) { return []; }
  }

  static async getWatchlist(options = {}) {
    try {
      const response = await this._request('/functions/v1/get-watchlist', { limit: options.limit || 500 });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || response.statusText); }
      const result = await response.json();
      return result.data || [];
    } catch (error) { return []; }
  }

  // ========== HOT SIGNALS - Supabase Integration ==========
  
  static async saveHotSignal(signal) {
    try {
      const response = await this._request('/functions/v1/save-hot-signal', {
        symbol: signal.symbol,
        type: signal.type,
        price: signal.price,
        change: signal.change,
        message: signal.message,
        volume_spike: signal.volumeSpike || null,
        timestamp: new Date().toISOString()
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || response.statusText); }
      return await response.json();
    } catch (error) { 
      console.warn('☁️ saveHotSignal error:', error);
      return null; 
    }
  }

  static async getHotSignals(options = {}) {
    try {
      const response = await this._request('/functions/v1/get-hot-signals', {
        limit: options.limit || 50,
        since: options.since || null, // ISO timestamp
        type: options.type || null // 'PUMP', 'DUMP', 'VOLUME_SPIKE', etc
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || response.statusText); }
      const result = await response.json();
      return result.data || [];
    } catch (error) { return []; }
  }

  // ========== WATCHLIST - Supabase Integration ==========

  static async addToWatchlist(symbol, data = {}) {
    try {
      const response = await this._request('/functions/v1/add-to-watchlist', {
        symbol: symbol,
        reason: data.reason || 'Manual add',
        confluence_score: data.confluenceScore || 0,
        trend: data.trend || 'neutral',
        current_price: data.currentPrice || 0,
        notes: data.notes || ''
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || response.statusText); }
      return await response.json();
    } catch (error) { 
      console.warn('☁️ addToWatchlist error:', error);
      return null; 
    }
  }

  static async removeFromWatchlist(symbol) {
    try {
      const response = await this._request('/functions/v1/remove-from-watchlist', { symbol });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || response.statusText); }
      return await response.json();
    } catch (error) { 
      console.warn('☁️ removeFromWatchlist error:', error);
      return null; 
    }
  }

  static async promoteToOpportunity(symbol) {
    try {
      const response = await this._request('/functions/v1/promote-to-opportunity', { symbol });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || response.statusText); }
      return await response.json();
    } catch (error) { 
      console.warn('☁️ promoteToOpportunity error:', error);
      return null; 
    }
  }

  static async markTarget(symbol, tpIndex, hitPrice, direction, hitType = 'take_profit') {
    // tpIndex: -1 = zone hit, 0 = stop loss, 1/2/3 = TP levels
    try {
      const response = await this._request('/functions/v1/mark-target', { 
        symbol, 
        tp_index: tpIndex, 
        hit_price: hitPrice, 
        direction,
        hit_type: hitType
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || response.statusText); }
      return await response.json();
    } catch (error) { 
      console.warn(`☁️ markTarget error for ${symbol}:`, error);
      return null; 
    }
  }

  static async generateAnalysisText(data) {
    try {
      const response = await this._request('/functions/v1/generate-analysis-text', data);
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || response.statusText); }
      return await response.json();
    } catch (error) { throw error; }
  }

  static async analyzeBatch(symbols, profile, batchSize = 5) {
    const opportunities = [];
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(symbol => this.analyzeSymbol(symbol, profile).catch(err => null));
      const results = await Promise.all(batchPromises);
      opportunities.push(...results.filter(r => r !== null));
      if (i + batchSize < symbols.length) await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return opportunities;
  }

  // ========== PERFORMANCE TRACKING ==========

  static async getPerformanceStats() {
    try {
      const response = await this._request('/functions/v1/get-performance-stats', {});
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || response.statusText); }
      return await response.json();
    } catch (error) { 
      console.warn('☁️ getPerformanceStats error:', error);
      return { winRate: 0, totalSignals: 0, tpHits: 0, slHits: 0 }; 
    }
  }

  static async checkFunctionsStatus() {
    const functions = ['analyze-symbol', 'scan-market', 'get-opportunities', 'get-watchlist', 'mark-target', 'save-hot-signal', 'get-hot-signals'];
    const status = {};
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();
    for (const func of functions) {
      try {
        const response = await fetch(`${url}/functions/v1/${func}`, { method: 'OPTIONS', headers: { 'Authorization': `Bearer ${key}` } });
        status[func] = response.ok ? 'Online' : 'Offline';
      } catch (error) { status[func] = 'Error'; }
    }
    return status;
  }
}

const TRADING_PROFILES = {
  scalping: { name: 'Scalping', trigger: '5m', signal: '15m', target: '1h', anchor: '4h' },
  scalping515: { name: 'Scalping 5/15', trigger: '5m', signal: '15m', target: '1h', anchor: '4h' },
  dayTrading: { name: 'Day Trading', trigger: '15m', signal: '1h', target: '4h', anchor: 'D' },
  swingTrading: { name: 'Swing Trading', trigger: '4h', signal: 'D', target: 'W', anchor: 'M' }
};

if (typeof window !== 'undefined') { window.SupabaseFunctions = SupabaseFunctions; window.TRADING_PROFILES = TRADING_PROFILES; }
if (typeof module !== 'undefined' && module.exports) { module.exports = { SupabaseFunctions, TRADING_PROFILES }; }
