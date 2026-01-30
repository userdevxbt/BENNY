/**
 * SHDWXBT - Opportunities Service (Institutional Multi-Timeframe)
 *
 * Core behavior
 * - Varre ativos e tempos gráficos
 * - Avalia rotas (escalping / day trading / swing / posição)
 * - Só publica em "oportunidades confirmadas" quando passa na lógica e no score
 * - Textos padronizados (sem siglas abreviadas)
 */

const OpportunitiesService = {
  // ========================================
  // CONFIGURATION
  // ========================================
  config: {
    // Principais ativos monitorados
    allSymbols: [
      'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT',
      'DOGEUSDT', 'SOLUSDT', 'TRXUSDT', 'DOTUSDT', 'MATICUSDT',
      'LTCUSDT', 'SHIBUSDT', 'AVAXUSDT', 'LINKUSDT', 'ATOMUSDT',
      'UNIUSDT', 'ETCUSDT', 'XLMUSDT', 'NEARUSDT', 'APTUSDT',
      'AAVEUSDT', 'MKRUSDT', 'COMPUSDT', 'SNXUSDT', 'CRVUSDT',
      'LDOUSDT', '1INCHUSDT', 'SUSHIUSDT', 'YFIUSDT', 'RUNEUSDT',
      'ARBUSDT', 'OPUSDT', 'IMXUSDT', 'MANTAUSDT', 'STXUSDT',
      'SANDUSDT', 'MANAUSDT', 'AXSUSDT', 'ENJUSDT', 'GALAUSDT',
      'FETUSDT', 'AGIXUSDT', 'OCEANUSDT', 'RNDRUSDT', 'WLDUSDT',
      'FILUSDT', 'ICPUSDT', 'VETUSDT', 'ALGOUSDT', 'FTMUSDT',
      'EGLDUSDT', 'FLOWUSDT', 'XTZUSDT', 'EOSUSDT', 'ARUSDT',
      'INJUSDT', 'TIAUSDT', 'SEIUSDT', 'SUIUSDT', 'PEPEUSDT',
      'ORDIUSDT', 'KASUSDT', 'BONKUSDT', 'WIFUSDT', 'JUPUSDT'
    ],

    // Tempos gráficos analisados (códigos Bybit + internos)
    // 5 = 5 minutos, 15 = 15 minutos, 60 = 1 hora, 240 = 4 horas, D = diário, W = semanal, M = mensal
    analysisTimeframes: ['5', '15', '60', '240', 'D', 'W', 'M'],

    // Rotas (metodologia multitempo)
    // Observação: a zona de prêmio/desconto é confluência extra (não obrigatória)
    routes: [
      // PERFIL A (pedido):
      // - Escalping: alvo 1 hora, sinal 15 minutos, gatilho 5 minutos
      // - Day Trading: alvo 4 horas, sinal 1 hora, gatilho 15 minutos
      // - Swing Trade: alvo semanal, sinal diário, gatilho 4 horas
      {
        id: 'escalping',
        label: 'Escalping',
        trigger: '5',
        signal: '15',
        target: '60',
        anchor: '240',

        // Sensibilidade
        fibProximityPct: 0.9,

        // Score por perfil
        minScore: 70,
        watchScore: 45,

        // Confluências obrigatórias (modelo inteligente)
        required: {
          requireSignalAlignment: true,
          requireFibProximity: true,
          requireEma200Alignment: true,
          requireTriggerData: true,
          requireTriggerAlignment: true,
          requireTriggerReaction: true,
          requirePullbackDepth: true
        }
      },
      {
        id: 'day_trading',
        label: 'Day Trading',
        trigger: '15',
        signal: '60',
        target: '240',
        anchor: 'D',
        fibProximityPct: 1.1,
        minScore: 65,
        watchScore: 42,
        required: {
          requireSignalAlignment: true,
          requireFibProximity: true,
          requireEma200Alignment: true,
          requireTriggerData: true,
          requireTriggerAlignment: true,
          requireTriggerReaction: true,
          requirePullbackDepth: true
        }
      },
      {
        id: 'swing_trade',
        label: 'Swing Trade',
        trigger: '240',
        signal: 'D',
        target: 'W',
        anchor: 'M',
        fibProximityPct: 1.4,
        minScore: 60,
        watchScore: 38,
        required: {
          requireSignalAlignment: true,
          requireFibProximity: true,
          requireEma200Alignment: false,
          requireTriggerData: false,
          requireTriggerAlignment: true,
          requireTriggerReaction: false,
          requirePullbackDepth: true
        }
      }
    ],

    // Regras gerais (baseline)
    rules: {
      // Se o ativo não tiver liquidez mínima, não publica
      minVolume24h: 5_000_000,
      // Limita quantas oportunidades por ativo (pra evitar spam de rotas)
      maxOppsPerSymbol: 2
    }
  },

  // ========================================
  // STATE
  // ========================================
  state: {
    opportunities: [],
    watchlist: [],
    allAssets: [],
    lastFullScan: null,
    scanInProgress: false,
    connectionStatus: 'unknown'
  },

  // Subscribers
  subscribers: new Map(),

  // Symbol metadata
  symbolMeta: {
    BTCUSDT: { name: 'Bitcoin', icon: 'bitcoin', color: 'orange' },
    ETHUSDT: { name: 'Ethereum', icon: 'gem', color: 'purple' },
    BNBUSDT: { name: 'BNB', icon: 'database', color: 'yellow' },
    XRPUSDT: { name: 'Ripple', icon: 'x', color: 'white' },
    ADAUSDT: { name: 'Cardano', icon: 'atom', color: 'blue' },
    DOGEUSDT: { name: 'Doge', icon: 'dog', color: 'yellow' },
    SOLUSDT: { name: 'Solana', icon: 'layers', color: 'purple' },
    LINKUSDT: { name: 'Chainlink', icon: 'hexagon', color: 'blue' },
    MATICUSDT: { name: 'Polygon', icon: 'hexagon', color: 'purple' },
    AVAXUSDT: { name: 'Avalanche', icon: 'layers', color: 'red' },
    DOTUSDT: { name: 'Polkadot', icon: 'circle', color: 'pink' },
    TRXUSDT: { name: 'Tron', icon: 'circle', color: 'red' },
    LTCUSDT: { name: 'Litecoin', icon: 'anchor', color: 'gray' },
    SHIBUSDT: { name: 'Shiba Inu', icon: 'dog', color: 'orange' },
    ARBUSDT: { name: 'Arbitrum', icon: 'layers', color: 'blue' },
    OPUSDT: { name: 'Optimism', icon: 'circle', color: 'red' },
    AAVEUSDT: { name: 'Aave', icon: 'circle', color: 'purple' },
    INJUSDT: { name: 'Injective', icon: 'circle', color: 'blue' },
    SUIUSDT: { name: 'Sui', icon: 'circle', color: 'blue' },
    PEPEUSDT: { name: 'Pepe', icon: 'circle', color: 'green' },
    WIFUSDT: { name: 'dogwifhat', icon: 'dog', color: 'brown' },
    JUPUSDT: { name: 'Jupiter', icon: 'circle', color: 'green' },
    BONKUSDT: { name: 'Bonk', icon: 'dog', color: 'orange' }
  },

  // ========================================
  // PUBLIC API
  // ========================================

  /**
   * Compatível com app.js (RealTimeManager chama fullScan).
   */
  async fullScan() {
    return this.runFullScan();
  },

  on(event, callback) {
    if (!this.subscribers.has(event)) this.subscribers.set(event, []);
    this.subscribers.get(event).push(callback);
  },

  notifySubscribers(event, data) {
    const callbacks = this.subscribers.get(event) || [];
    callbacks.forEach(cb => {
      try { cb(data); } catch (e) {}
    });
  },

  // ========================================
  // FULL SCAN
  // ========================================

  async runFullScan() {
    if (this.state.scanInProgress) {
      return { opportunities: this.state.opportunities, watchlist: this.state.watchlist };
    }

    this.state.scanInProgress = true;
    const startTime = Date.now();

    const newOpportunities = [];
    const newWatchlist = [];
    const allAssets = [];

    // Determine connection status (best-effort)
    this.state.connectionStatus = (typeof BybitAPI !== 'undefined') ? 'available' : 'simulated';

    for (const symbol of this.config.allSymbols) {
      try {
        const result = await this.analyzeSymbol(symbol);
        if (!result) continue;

        // Save base asset snapshot
        allAssets.push(result.asset);

        // Append opportunities (cap per symbol)
        const opps = result.opportunities
          .sort((a, b) => b.confluence.score - a.confluence.score)
          .slice(0, this.config.rules.maxOppsPerSymbol);

        opps.forEach(o => newOpportunities.push(o));

        // Append watchlist best item (optional)
        if (result.watchlist) newWatchlist.push(result.watchlist);

      } catch (e) {
        // silent per symbol
      }
    }

    // Sort output
    newOpportunities.sort((a, b) => b.confluence.score - a.confluence.score);
    newWatchlist.sort((a, b) => (b.confluence || 0) - (a.confluence || 0));

    // Persist state
    this.state.opportunities = newOpportunities;
    this.state.watchlist = newWatchlist;
    this.state.allAssets = allAssets;
    this.state.lastFullScan = new Date().toISOString();
    this.state.scanInProgress = false;

    // Notify
    this.notifySubscribers('opportunities', this.state.opportunities);
    this.notifySubscribers('watchlist', this.state.watchlist);
    this.notifySubscribers('scanComplete', {
      opportunities: newOpportunities.length,
      watchlist: newWatchlist.length,
      total: allAssets.length,
      duration: Date.now() - startTime
    });

    return { opportunities: newOpportunities, watchlist: newWatchlist };
  },

  // ========================================
  // SYMBOL ANALYSIS
  // ========================================

  async analyzeSymbol(symbol) {
    const { klines, ticker } = await this.getMarketData(symbol);

    // Liquidity filter (if available)
    const volume24h = ticker?.volume24h || 0;
    if (volume24h && volume24h < this.config.rules.minVolume24h) {
      return null;
    }

    const currentPrice = ticker?.lastPrice || ticker?.price || this.getDefaultPrice(symbol);

    // Build MTF reports
    let reports = [];
    if (typeof TechnicalAnalysis !== 'undefined' && TechnicalAnalysis.analyzeRoutes) {
      reports = TechnicalAnalysis.analyzeRoutes(klines, symbol, this.config.routes);
    } else {
      // Fallback: single timeframe
      const tf = klines['60'] || klines['240'] || klines['15'];
      if (!tf) return null;
      const single = (typeof TechnicalAnalysis !== 'undefined' && TechnicalAnalysis.analyzeOpportunity)
        ? TechnicalAnalysis.analyzeOpportunity(tf, symbol, '60')
        : null;
      if (!single) return null;
      reports = [
        {
          routeId: 'fallback',
          routeName: 'Monitoramento',
          ...single,
          decision: (single.confluence?.score || 0) >= 60 ? 'opportunity' : ((single.confluence?.score || 0) >= 35 ? 'watchlist' : 'ignore')
        }
      ];
    }

    // Convert reports into UI items
    const meta = this.getSymbolMeta(symbol);

    const opps = [];
    let bestWatch = null;

    for (const rep of reports) {
      // attach ticker values
      rep.currentPrice = currentPrice;
      rep.price24hPcnt = ticker?.price24hPcnt || 0;
      rep.volume24h = volume24h;

      if (rep.decision === 'opportunity') {
        opps.push(this.createOpportunity(rep, meta));
      } else if (rep.decision === 'watchlist') {
        const wl = this.createWatchlistItem(rep, meta);
        if (!bestWatch || (wl.confluence || 0) > (bestWatch.confluence || 0)) bestWatch = wl;
      }
    }

    // asset snapshot
    const asset = {
      symbol,
      name: meta.name,
      icon: meta.icon,
      color: meta.color,
      currentPrice,
      price24hPcnt: ticker?.price24hPcnt || 0,
      volume24h
    };

    return { asset, opportunities: opps, watchlist: bestWatch };
  },

  async getMarketData(symbol) {
    // Attempt API
    if (typeof BybitAPI !== 'undefined') {
      try {
        const klines = {};
        for (const tf of this.config.analysisTimeframes) {
          // Some SDKs might not support D/W/M; best-effort
          try {
            const data = await BybitAPI.getKlines(symbol, tf, 200);
            if (data && data.length) klines[tf] = data;
          } catch (e) {}
        }
        let ticker = null;
        try {
          ticker = BybitAPI.getCachedTicker?.(symbol) || await BybitAPI.getTicker(symbol);
        } catch (e) {}

        // If missing core frames, fallback
        if (!klines['60'] || klines['60'].length < 60) {
          const simulated = this.generateSimulatedData(symbol);
          return { klines: simulated.klines, ticker: simulated.ticker };
        }

        return { klines, ticker };
      } catch (e) {
        // fallthrough
      }
    }

    // Simulation
    const simulated = this.generateSimulatedData(symbol);
    return { klines: simulated.klines, ticker: simulated.ticker };
  },

  // ========================================
  // UI ITEM BUILDERS
  // ========================================

  createOpportunity(report, meta) {
    const now = new Date();

    // Title and combined text for modal (padrão institucional)
    const analysisTitle = report.text?.title || `${report.symbol}`;
    const contextLines = Array.isArray(report.text?.contextLines) ? report.text.contextLines : [];
    const invalidationTitle = report.text?.invalidationTitle || 'Invalidação';
    const invalidationText = report.text?.invalidationText || '';

    const analysisText = [
      'Contexto:',
      ...contextLines,
      '',
      invalidationTitle,
      invalidationText
    ].filter(Boolean).join('\n');

    return {
      id: `${report.symbol}_${report.routeId}_${now.getTime()}`,
      symbol: report.symbol,
      name: meta.name,
      icon: meta.icon,
      color: meta.color,

      route: {
        id: report.routeId,
        name: report.routeLabel || report.routeName || 'Rota'
      },

      currentPrice: report.currentPrice,
      price24hPcnt: report.price24hPcnt || 0,
      volume24h: report.volume24h || 0,

      trend: report.trend,
      trendLabel: report.trend === 'bullish' ? 'alta' : (report.trend === 'bearish' ? 'baixa' : 'neutra'),

      setup: report.setup,
      analysisTitle,
      analysisText,

      timeframe: {
        trigger: report.timeframe?.trigger,
        signal: report.timeframe?.signal,
        target: report.timeframe?.target,
        anchor: report.timeframe?.anchor
      },

      // Technical data for modal
      fibonacci: report.fibonacci,
      invalidation: report.invalidation,

      indicators: report.indicators,

      confluence: report.confluence,

      // Confluências obrigatórias (transparência de metodologia)
      mandatory: report.mandatory,

      // For thermometer UI
      thermometer: {
        positive: report.confluence?.positive || [],
        negative: report.confluence?.negative || [],
        score: report.confluence?.score || 0
      },

      // Small helper for UI bar
      fillPercentage: this.estimateFill(report),

      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      publishedAt: now.toISOString(),

      signalTime: {
        utc: now.toUTCString(),
        local: now.toLocaleString(),
        timestamp: now.getTime(),
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString()
      }
    };
  },

  createWatchlistItem(report, meta) {
    const fail = report?.mandatory?.failed?.[0];
    const baseReason = report.text?.title || 'Monitorando estrutura';
    const reason = fail ? `${baseReason} | Pendência: ${fail}` : baseReason;

    return {
      symbol: report.symbol,
      name: meta.name,
      icon: meta.icon,
      color: meta.color,
      currentPrice: report.currentPrice,
      trend: report.trend,
      setup: report.setup,
      confluence: report.confluence?.score || 0,
      reason,
      updatedAt: new Date().toISOString()
    };
  },

  estimateFill(report) {
    // Rough proxy: higher confluence tends to mean closer to zone
    const s = report.confluence?.score || 0;
    return Math.max(10, Math.min(95, Math.round(s)));
  },

  getSymbolMeta(symbol) {
    return this.symbolMeta[symbol] || {
      name: symbol.replace('USDT', ''),
      icon: 'circle',
      color: 'white'
    };
  },

  // ========================================
  // SIMULATION HELPERS
  // ========================================

  generateSimulatedData(symbol) {
    const basePrice = this.getDefaultPrice(symbol);

    const klines = {
      '5': this.generateKlines(basePrice, 250, 5),
      '15': this.generateKlines(basePrice, 250, 15),
      '60': this.generateKlines(basePrice, 250, 60),
      '240': this.generateKlines(basePrice, 250, 240),
      'D': this.generateKlines(basePrice, 250, 1440),
      'W': this.generateKlines(basePrice, 250, 10080),
      'M': this.generateKlines(basePrice, 250, 43200)
    };

    const ticker = {
      symbol,
      lastPrice: basePrice * (1 + (Math.random() - 0.5) * 0.02),
      price24hPcnt: (Math.random() - 0.5) * 10,
      volume24h: Math.random() * 100_000_000
    };

    return { klines, ticker };
  },

  generateKlines(basePrice, count, minutesPerBar) {
    const klines = [];
    let price = basePrice * (1 + (Math.random() - 0.5) * 0.1);

    for (let i = 0; i < count; i++) {
      const change = (Math.random() - 0.5) * price * 0.012;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) * (1 + Math.random() * 0.006);
      const low = Math.min(open, close) * (1 - Math.random() * 0.006);

      klines.push({
        open,
        high,
        low,
        close,
        volume: Math.random() * 1_000_000,
        timestamp: Date.now() - (count - i) * minutesPerBar * 60_000
      });

      price = close;
    }

    return klines;
  },

  getDefaultPrice(symbol) {
    const map = {
      BTCUSDT: 100000,
      ETHUSDT: 3000,
      SOLUSDT: 150,
      ADAUSDT: 0.6,
      XRPUSDT: 0.6,
      LINKUSDT: 20,
      AVAXUSDT: 35,
      DOGEUSDT: 0.2
    };
    return map[symbol] || (Math.random() * 100 + 1);
  }
};

// Expose globally
if (typeof window !== 'undefined') {
  window.OpportunitiesService = OpportunitiesService;
}
