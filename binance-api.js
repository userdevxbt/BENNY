const BinanceAPI = {
    // ========================================
    // CONFIGURATION
    // ========================================
    config: {
        // Binance Futures (USDT-M perpetual)
        baseUrl: 'https://fapi.binance.com/fapi/v1',
        wsUrl: 'wss://fstream.binance.com/ws',
        wsCombinedUrl: 'wss://fstream.binance.com/stream?streams=',
        
        // Rate limiting
        maxRequestsPerMinute: 1200,
        requestWeight: {
            ticker: 1,
            klines: 1,
            ticker24hr: 1
        },
        
        // Cache TTL (in milliseconds)
        cacheTTL: {
            ticker: 5000,      // 5 seconds for price
            klines: 60000,     // 1 minute for klines
            ticker24hr: 30000  // 30 seconds for 24hr stats
        }
    },

    // ========================================
    // STATE
    // ========================================
    state: {
        requestCount: 0,
        requestWindowStart: Date.now(),
        cache: new Map(),
        wsConnections: new Map(),
        tickers: new Map(),
        subscribedSymbols: new Set(),
        tickerCallback: null,
        isConnected: false,
        lastError: null
    },

    // ========================================
    // RATE LIMITER
    // ========================================
    async checkRateLimit(weight = 1) {
        const now = Date.now();
        const windowDuration = 60000; // 1 minute
        
        // Reset counter if window expired
        if (now - this.state.requestWindowStart > windowDuration) {
            this.state.requestCount = 0;
            this.state.requestWindowStart = now;
        }
        
        // Check if we'd exceed limit
        if (this.state.requestCount + weight > this.config.maxRequestsPerMinute) {
            const waitTime = windowDuration - (now - this.state.requestWindowStart);
            console.warn(`⏳ Rate limit approaching, waiting ${waitTime}ms...`);
            await new Promise(r => setTimeout(r, waitTime + 100));
            this.state.requestCount = 0;
            this.state.requestWindowStart = Date.now();
        }
        
        this.state.requestCount += weight;
    },

    // ========================================
    // CACHE MANAGEMENT
    // ========================================
    getCached(key) {
        const cached = this.state.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > cached.ttl) {
            this.state.cache.delete(key);
            return null;
        }
        
        return cached.data;
    },

    setCache(key, data, ttl) {
        this.state.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    },

    // ========================================
    // API REQUESTS
    // ========================================
    async request(endpoint, params = {}, weight = 1) {
        // Check cache first
        const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        // Rate limit check
        await this.checkRateLimit(weight);

        try {
            const url = new URL(this.config.baseUrl + endpoint);
            Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

            const response = await fetch(url.toString());
            
            if (!response.ok) {
                if (response.status === 429) {
                    console.warn('⚠️ Rate limited by Binance, using cache/fallback');
                    this.state.lastError = 'rate_limited';
                    return null;
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            // Determine TTL based on endpoint
            let ttl = this.config.cacheTTL.ticker;
            if (endpoint.includes('klines')) ttl = this.config.cacheTTL.klines;
            if (endpoint.includes('24hr')) ttl = this.config.cacheTTL.ticker24hr;
            
            this.setCache(cacheKey, data, ttl);
            this.state.isConnected = true;
            
            return data;
        } catch (error) {
            console.error('Binance API Error:', error.message);
            this.state.lastError = error.message;
            return null;
        }
    },

    // ========================================
    // PUBLIC METHODS
    // ========================================
    
    /**
     * Get current price for a symbol
     */
    async getTicker(symbol) {
        const data = await this.request('/ticker/price', { symbol }, 1);
        if (!data) return this.getSimulatedTicker(symbol);
        
        // Store in tickers map
        this.state.tickers.set(symbol, {
            symbol,
            price: parseFloat(data.price),
            lastPrice: parseFloat(data.price),
            timestamp: Date.now()
        });
        
        return this.state.tickers.get(symbol);
    },

    /**
     * Get 24hr ticker stats (batched for efficiency)
     */
    async getTicker24hr(symbol) {
        const data = await this.request('/ticker/24hr', { symbol }, 40);
        if (!data) return this.getSimulatedTicker(symbol);
        
        const ticker = {
            symbol: data.symbol,
            price: parseFloat(data.lastPrice),
            lastPrice: parseFloat(data.lastPrice),
            price24hPcnt: parseFloat(data.priceChangePercent),
            volume24h: parseFloat(data.quoteVolume),
            high24h: parseFloat(data.highPrice),
            low24h: parseFloat(data.lowPrice),
            timestamp: Date.now()
        };
        
        this.state.tickers.set(symbol, ticker);
        return ticker;
    },

    /**
     * Get all tickers at once (more efficient)
     */
    async getAllTickers() {
        const data = await this.request('/ticker/price', {}, 2);
        if (!data) return [];
        
        data.forEach(t => {
            this.state.tickers.set(t.symbol, {
                symbol: t.symbol,
                price: parseFloat(t.price),
                lastPrice: parseFloat(t.price),
                timestamp: Date.now()
            });
        });
        
        return data;
    },

    /**
     * Get klines (candlesticks)
     */
    async getKlines(symbol, interval, limit = 200) {
        // Convert interval format if needed
        const intervalMap = {
            '1': '1m', '3': '3m', '5': '5m', '15': '15m', '30': '30m',
            '60': '1h', '120': '2h', '240': '4h', '360': '6h', '720': '12h',
            'D': '1d', 'W': '1w', 'M': '1M'
        };
        
        const binanceInterval = intervalMap[interval] || interval;
        
        const data = await this.request('/klines', {
            symbol,
            interval: binanceInterval,
            limit
        }, 1);
        
        if (!data || !Array.isArray(data)) {
            return this.generateSimulatedKlines(symbol, limit, interval);
        }
        
        // Transform to standard format
        return data.map(k => ({
            timestamp: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
            closeTime: k[6]
        }));
    },

    /**
     * Get cached ticker (for quick access)
     */
    getCachedTicker(symbol) {
        return this.state.tickers.get(symbol) || null;
    },

    // ========================================
    // WEBSOCKET (Real-time prices)
    // ========================================
    
    /**
     * Subscribe to real-time price updates (chunks combined streams, avoids !ticker@arr ambiguity)
     */
    subscribeToTicker(symbols, callback) {
        if (!Array.isArray(symbols)) symbols = [symbols];

        // Normalize symbols
        const normalized = symbols.map(s => s.toUpperCase());
        this.state.tickerCallback = callback;
        this.state.subscribedSymbols = new Set(normalized);

        // Close any existing ticker sockets
        for (const [key, sock] of this.state.wsConnections.entries()) {
            if (key.startsWith('tickers') && sock && sock.readyState !== WebSocket.CLOSED) {
                try { sock.close(); } catch {}
            }
        }

        // Chunk symbols to avoid URL limits (~90 symbols per combined stream)
        const chunkSize = 90;
        const chunks = [];
        for (let i = 0; i < normalized.length; i += chunkSize) {
            chunks.push(normalized.slice(i, i + chunkSize));
        }

        chunks.forEach((chunk, idx) => {
            const streams = chunk.map(s => `${s.toLowerCase()}@ticker`).join('/');
            const wsUrl = `${this.config.wsCombinedUrl}${streams}`;

            try {
                const ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    console.log(`🔗 Binance WebSocket connected [chunk ${idx+1}/${chunks.length}] (${chunk.length} symbols)`);
                    this.state.isConnected = true;
                };

                ws.onmessage = (event) => {
                    try {
                        const payload = JSON.parse(event.data);
                        // Combined stream returns {stream, data}
                        const data = payload?.data || payload;
                        if (!data?.s) return;

                        const ticker = {
                            symbol: data.s,
                            price: parseFloat(data.c),
                            lastPrice: parseFloat(data.c),
                            price24hPcnt: parseFloat(data.P),
                            volume24h: parseFloat(data.q),
                            timestamp: Date.now()
                        };

                        this.state.tickers.set(data.s, ticker);
                        if (callback) callback(ticker);
                    } catch (e) {}
                };

                ws.onerror = (error) => {
                    console.warn('WebSocket error:', error);
                };

                ws.onclose = () => {
                    console.log(`WebSocket chunk ${idx+1} disconnected, reconnecting in 5s...`);
                    this.state.isConnected = false;
                    setTimeout(() => {
                        if (this.state.subscribedSymbols && this.state.subscribedSymbols.size > 0) {
                            const allSyms = Array.from(this.state.subscribedSymbols);
                            this.subscribeToTicker(allSyms, this.state.tickerCallback);
                        }
                    }, 5000);
                };

                this.state.wsConnections.set(`tickers_${idx}`, ws);
            } catch (error) {
                console.error('WebSocket connection failed:', error);
            }
        });
    },
    
    /**
     * Add symbols to existing subscription
     */
    addSymbolsToTicker(newSymbols) {
        if (!Array.isArray(newSymbols)) newSymbols = [newSymbols];
        
        const normalizedSymbols = newSymbols.map(s => s.toUpperCase());
        normalizedSymbols.forEach(s => this.state.subscribedSymbols.add(s));
        
        // Reconnect with updated symbol list
        const allSyms = Array.from(this.state.subscribedSymbols);
        this.subscribeToTicker(allSyms, this.state.tickerCallback);
    },

    /**
     * Subscribe to kline updates
     */
    subscribeToKlines(symbol, interval, callback) {
        const intervalMap = {
            '1': '1m', '5': '5m', '15': '15m', '60': '1h', '240': '4h', 'D': '1d', 'W': '1w'
        };
        
        const binanceInterval = intervalMap[interval] || '1h';
        const wsUrl = `${this.config.wsUrl}/${symbol.toLowerCase()}@kline_${binanceInterval}`;
        
        try {
            const ws = new WebSocket(wsUrl);
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const k = data.k;
                    
                    const kline = {
                        timestamp: k.t,
                        open: parseFloat(k.o),
                        high: parseFloat(k.h),
                        low: parseFloat(k.l),
                        close: parseFloat(k.c),
                        volume: parseFloat(k.v),
                        isClosed: k.x
                    };
                    
                    if (callback) callback(kline);
                } catch (e) {}
            };
            
            this.state.wsConnections.set(`klines_${symbol}_${interval}`, ws);
            
        } catch (error) {
            console.error('Klines WebSocket failed:', error);
        }
    },

    // ========================================
    // SIMULATION (Fallback)
    // ========================================
    
    getSimulatedTicker(symbol) {
        const basePrice = this.getBasePrice(symbol);
        const variation = (Math.random() - 0.5) * 0.02;
        
        return {
            symbol,
            price: basePrice * (1 + variation),
            lastPrice: basePrice * (1 + variation),
            price24hPcnt: (Math.random() - 0.5) * 10,
            volume24h: Math.random() * 100000000,
            timestamp: Date.now()
        };
    },

    generateSimulatedKlines(symbol, count, interval) {
        const basePrice = this.getBasePrice(symbol);
        const klines = [];
        let price = basePrice * (1 + (Math.random() - 0.5) * 0.1);
        
        const minutesPerBar = {
            '1': 1, '5': 5, '15': 15, '60': 60, '240': 240,
            'D': 1440, 'W': 10080, 'M': 43200
        }[interval] || 60;
        
        for (let i = 0; i < count; i++) {
            const change = (Math.random() - 0.5) * price * 0.015;
            const open = price;
            const close = price + change;
            const high = Math.max(open, close) * (1 + Math.random() * 0.008);
            const low = Math.min(open, close) * (1 - Math.random() * 0.008);
            
            klines.push({
                timestamp: Date.now() - (count - i) * minutesPerBar * 60000,
                open, high, low, close,
                volume: Math.random() * 1000000
            });
            
            price = close;
        }
        
        return klines;
    },

    getBasePrice(symbol) {
        const prices = {
            BTCUSDT: 100000, ETHUSDT: 3200, BNBUSDT: 700, SOLUSDT: 200,
            XRPUSDT: 2.5, ADAUSDT: 1.0, DOGEUSDT: 0.35, AVAXUSDT: 40,
            LINKUSDT: 25, DOTUSDT: 8, MATICUSDT: 0.5, LTCUSDT: 120
        };
        return prices[symbol] || (Math.random() * 100 + 1);
    },

    // ========================================
    // BATCH OPERATIONS (Efficient)
    // ========================================
    
    /**
     * Get klines for multiple symbols efficiently
     */
    async getBatchKlines(symbols, interval, limit = 200) {
        const results = {};
        
        // Process in batches of 5 to avoid rate limiting
        const batchSize = 5;
        for (let i = 0; i < symbols.length; i += batchSize) {
            const batch = symbols.slice(i, i + batchSize);
            
            const promises = batch.map(symbol => 
                this.getKlines(symbol, interval, limit)
                    .then(data => ({ symbol, data }))
                    .catch(() => ({ symbol, data: this.generateSimulatedKlines(symbol, limit, interval) }))
            );
            
            const batchResults = await Promise.all(promises);
            batchResults.forEach(r => { results[r.symbol] = r.data; });
            
            // Small delay between batches
            if (i + batchSize < symbols.length) {
                await new Promise(r => setTimeout(r, 200));
            }
        }
        
        return results;
    },

    /**
     * Get all data for a symbol efficiently
     */
    async getSymbolData(symbol) {
        const [ticker, klines60, klines240, klinesD] = await Promise.all([
            this.getTicker24hr(symbol),
            this.getKlines(symbol, '60', 200),
            this.getKlines(symbol, '240', 200),
            this.getKlines(symbol, 'D', 200)
        ]);
        
        return {
            symbol,
            ticker,
            klines: {
                '60': klines60,
                '240': klines240,
                'D': klinesD
            }
        };
    },

    // ========================================
    // STATUS
    // ========================================
    
    getStatus() {
        return {
            isConnected: this.state.isConnected,
            requestCount: this.state.requestCount,
            cacheSize: this.state.cache.size,
            tickersCount: this.state.tickers.size,
            lastError: this.state.lastError
        };
    }
};

// Expose globally
if (typeof window !== 'undefined') {
    window.BinanceAPI = BinanceAPI;
}
