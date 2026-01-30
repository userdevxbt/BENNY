// @ts-nocheck: Supabase Edge Functions com tipos dinâmicos da Binance API - necessário devido à natureza dinâmica das respostas da Binance e Supabase
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const BINANCE_FUTURES_URL = "https://fapi.binance.com";

// =====================================================================
// METODOLOGIA SHDWXBT - Sistema Institucional Completo
// Tabela de Pivôs Multi-Timeframe
// =====================================================================

// Timeframes e suas relações hierárquicas (reservado para uso futuro)
const _TF_HIERARCHY: Record<string, { label: string; next: string; confirmacao: string; rsiTarget: string | null; zoomOut: string }> = {
  '5m':  { label: '5 minutos',  next: '15m', confirmacao: '15m', rsiTarget: '1h',  zoomOut: '15m' },
  '15m': { label: '15 minutos', next: '1h',  confirmacao: '1h',  rsiTarget: '4h',  zoomOut: '1h' },
  '30m': { label: '30 minutos', next: '1h',  confirmacao: '4h',  rsiTarget: '12h', zoomOut: '1h' },
  '1h':  { label: '1 hora',     next: '4h',  confirmacao: '4h',  rsiTarget: '1w',  zoomOut: '4h' },
  '4h':  { label: '4 horas',    next: '1d',  confirmacao: '1d',  rsiTarget: '1M',  zoomOut: '1d' },
  '1d':  { label: 'Diário',     next: '1w',  confirmacao: '1w',  rsiTarget: null,  zoomOut: '1w' },
  '1w':  { label: 'Semanal',    next: '1M',  confirmacao: '1M',  rsiTarget: null,  zoomOut: '1M' }
};

// =====================================================================
// TABELA DE PIVÔS - Metodologia Institucional Completa
// =====================================================================

const METODOLOGIA = {
  // PIVÔS DE ALTA EM TENDÊNCIA DE ALTA (Verde - Confirmação de Fundo)
  pivo_alta_tendencia_alta: {
    '5m':  { contexto: 'Pivô de alta no 5 minutos confirma fundo no 15 minutos', acao: 'CONFIRMA_FUNDO', alvo: '15m' },
    '15m': { contexto: 'Pivô de alta no 15 minutos confirma fundo no 1 hora', acao: 'CONFIRMA_FUNDO', alvo: '1h' },
    '1h':  { contexto: 'Pivô de alta no 1 hora confirma fundo no 4 horas', acao: 'CONFIRMA_FUNDO', alvo: '4h' },
    '4h':  { contexto: 'Pivô de alta no 4 horas confirma fundo no Diário', acao: 'CONFIRMA_FUNDO', alvo: '1d' },
    '1d':  { contexto: 'Pivô de alta no Diário confirma fundo no Semanal', acao: 'CONFIRMA_FUNDO', alvo: '1w' },
    '1w':  { contexto: 'Pivô de alta no Semanal confirma fundo no Mensal', acao: 'CONFIRMA_FUNDO', alvo: '1M' }
  },

  // PIVÔS DE BAIXA EM TENDÊNCIA DE ALTA (Verde - Busca de Fundo Ascendente)
  pivo_baixa_tendencia_alta: {
    '5m':  { contexto: '15 minutos em busca do fundo ascendente contra o fundo anterior', acao: 'BUSCA_FUNDO_ASC', alvo: '15m' },
    '15m': { contexto: '1 hora em busca do fundo ascendente contra o fundo anterior', acao: 'BUSCA_FUNDO_ASC', alvo: '1h' },
    '1h':  { contexto: '4 horas em busca do fundo ascendente contra o fundo anterior', acao: 'BUSCA_FUNDO_ASC', alvo: '4h' },
    '4h':  { contexto: 'Diário em busca do fundo ascendente contra o fundo anterior', acao: 'BUSCA_FUNDO_ASC', alvo: '1d' },
    '1d':  { contexto: 'Semanal em busca do fundo ascendente contra o fundo anterior', acao: 'BUSCA_FUNDO_ASC', alvo: '1w' },
    '1w':  { contexto: 'Mensal em busca do fundo ascendente contra o fundo anterior', acao: 'BUSCA_FUNDO_ASC', alvo: '1M' }
  },

  // PIVÔS DE BAIXA EM TENDÊNCIA DE BAIXA (Vermelho - Confirmação de Topo)
  pivo_baixa_tendencia_baixa: {
    '5m':  { contexto: 'Pivô de baixa no 5 minutos confirma topo descendente no 15 minutos', acao: 'CONFIRMA_TOPO', alvo: '15m' },
    '15m': { contexto: 'Pivô de baixa no 15 minutos confirma topo descendente no 1 hora', acao: 'CONFIRMA_TOPO', alvo: '1h' },
    '1h':  { contexto: 'Pivô de baixa no 1 hora confirma topo descendente no 4 horas', acao: 'CONFIRMA_TOPO', alvo: '4h' },
    '4h':  { contexto: 'Pivô de baixa no 4 horas confirma topo descendente no Diário', acao: 'CONFIRMA_TOPO', alvo: '1d' },
    '1d':  { contexto: 'Pivô de baixa no Diário confirma topo descendente no Semanal', acao: 'CONFIRMA_TOPO', alvo: '1w' },
    '1w':  { contexto: 'Pivô de baixa no Semanal confirma topo descendente no Mensal', acao: 'CONFIRMA_TOPO', alvo: '1M' }
  },

  // PIVÔS DE ALTA EM TENDÊNCIA DE BAIXA (Vermelho - Busca de Topo Descendente)
  pivo_alta_tendencia_baixa: {
    '5m':  { contexto: '15 minutos em busca de um topo descendente contra o topo anterior', acao: 'BUSCA_TOPO_DESC', alvo: '15m' },
    '15m': { contexto: '1 hora em busca de um topo descendente contra o topo anterior', acao: 'BUSCA_TOPO_DESC', alvo: '1h' },
    '1h':  { contexto: '4 horas em busca de um topo descendente contra o topo anterior', acao: 'BUSCA_TOPO_DESC', alvo: '4h' },
    '4h':  { contexto: 'Diário em busca de um topo descendente contra o topo anterior', acao: 'BUSCA_TOPO_DESC', alvo: '1d' },
    '1d':  { contexto: 'Semanal em busca do topo descendente', acao: 'BUSCA_TOPO_DESC', alvo: '1w' },
    '1w':  { contexto: 'Reverte a tendência de baixa para tendência de alta', acao: 'REVERSAO_ALTA', alvo: '1M' }
  },

  // SOBREVENDA (RSI ≤ 30) - Possibilidade de Fundo Ascendente
  sobrevenda: {
    '5m':  { contexto: 'Possibilidade de criação de um fundo ascendente no 1 hora', alvo: '1h' },
    '15m': { contexto: 'Possibilidade de criação de um fundo ascendente no 4 horas', alvo: '4h' },
    '30m': { contexto: 'Possibilidade de criação de um fundo ascendente no 12 horas', alvo: '12h' },
    '1h':  { contexto: 'Possibilidade de criação de um fundo ascendente no Semanal', alvo: '1w' },
    '4h':  { contexto: 'Possibilidade de criação de um fundo ascendente no Mensal', alvo: '1M' },
    '1d':  { contexto: 'Sobrevenda no Diário - possibilidade de fundo macro significativo', alvo: null }
  },

  // SOBRECOMPRA (RSI ≥ 70) - Possibilidade de Topo Descendente
  sobrecompra: {
    '5m':  { contexto: 'Possibilidade de criação de um topo descendente no 1 hora', alvo: '1h' },
    '15m': { contexto: 'Possibilidade de criação de um topo descendente no 4 horas', alvo: '4h' },
    '30m': { contexto: 'Possibilidade de criação de um topo descendente no 12 horas', alvo: '12h' },
    '1h':  { contexto: 'Possibilidade de criação de um topo descendente no Semanal', alvo: '1w' },
    '4h':  { contexto: 'Sobrecompra no 4 horas - atenção para topo descendente no Mensal', alvo: '1M' },
    '1d':  { contexto: 'Sobrecompra no Diário - possibilidade de topo descendente significativo', alvo: null }
  },

  // PERDA DA TENDÊNCIA - Zoom Out
  perda_tendencia: {
    '5m':  { zoomOut: '15m', atencao: 'Atenção no sobrevenda, observar a queda contra o fundo anterior no 15 minutos' },
    '15m': { zoomOut: '1h',  atencao: 'Atenção no sobrevenda, observar a queda contra o fundo anterior no 1 hora' },
    '1h':  { zoomOut: '4h',  atencao: 'Atenção no sobrevenda, observar a queda contra o fundo anterior no 4 horas' },
    '4h':  { zoomOut: '1d',  atencao: 'Atenção no sobrevenda, observar a queda contra o fundo anterior no Diário' },
    '1d':  { zoomOut: '1w',  atencao: 'Atenção no sobrevenda, observar a queda contra o fundo anterior no Semanal' },
    '1w':  { zoomOut: '1M',  atencao: 'Atenção - possível Bear Market (6 meses de queda)' }
  },

  // CONFIRMAÇÃO DE FUNDO ASCENDENTE
  confirmacao_fundo: {
    '5m':  { pivo: 'Pivô de alta no 5 minutos', confirma: 'Confirma fundo no 15 minutos' },
    '15m': { pivo: 'Pivô de alta no 15 minutos', confirma: 'Confirma fundo no 1 hora' },
    '1h':  { pivo: 'Pivô de alta no 1 hora', confirma: 'Confirma fundo no 4 horas' },
    '4h':  { pivo: 'Pivô de alta no 4 horas', confirma: 'Confirma fundo no Diário' },
    '1d':  { pivo: 'Pivô de alta no Diário', confirma: 'Confirma fundo no Semanal' },
    '1w':  { pivo: 'Pivô de alta no Semanal', confirma: 'Confirma fundo no Mensal' }
  },

  // CONFIRMAÇÃO DE TOPO DESCENDENTE
  confirmacao_topo: {
    '5m':  { pivo: 'Pivô de baixa no 5 minutos', confirma: 'Confirma topo no 15 minutos' },
    '15m': { pivo: 'Pivô de baixa no 15 minutos', confirma: 'Confirma topo no 1 hora' },
    '1h':  { pivo: 'Pivô de baixa no 1 hora', confirma: 'Confirma topo no 4 horas' },
    '4h':  { pivo: 'Pivô de baixa no 4 horas', confirma: 'Confirma topo no Diário' },
    '1d':  { pivo: 'Pivô de baixa no Diário', confirma: 'Confirma topo no Semanal' },
    '1w':  { pivo: 'Pivô de baixa no Semanal', confirma: 'Confirma topo no Mensal' }
  }
};

// =====================================================================
// PERFIS DE TRADING
// =====================================================================

// Interfaces TypeScript para tipagem
interface Ticker {
  symbol: string;
  price: number;
  volume: number;
  priceChange: number;
  high24h: number;
  low24h: number;
}

interface TimeframeAnalysis {
  timeframe: string;
  currentPrice: number;
  rsi: number;
  ema12: number;
  ema26: number;
  ema200: number;
  swingHigh: number;
  swingLow: number;
  fib236: number;
  fib382: number;
  fib500: number;
  fib618: number;
  fib786: number;
  trend: string;
  fibZone: string;
}

interface TradingProfile {
  label: string;
  gatilho: string;
  sinal: string;
  alvo: string;
  ancora: string;
  gatilhoLabel: string;
  sinalLabel: string;
  alvoLabel: string;
  ancoraLabel: string;
  extensions: number[];
  stopPercent: number;
  minScore: number;
  watchScore: number;
}

interface MetodologiaResult {
  direction: string;
  setup: string;
  pivotType: string;
  acao: string;
  structure: string;
  metodologiaContexto: string;
  anchorTrend: string;
  signalTrend: string;
}

interface ScoreResult {
  score: number;
  direction: string;
  fibZone: string;
  positives: string[];
  negatives: string[];
}

interface OpportunityItem {
  symbol: string;
  name: string;
  direction: string;
  trend: string;
  entry_zone_start: number;
  entry_zone_end: number;
  entry_price: number;
  current_price: number;
  stop_loss: number;
  invalidation: number;
  target_1: number;
  target_2: number;
  target_3: number;
  rsi_value: number;
  rsi_status: string;
  confluence_score: number;
  fib_382: number;
  fib_500: number;
  fib_618: number;
  fib_zone: string;
  fibonacci_extensions: string;
  trading_profile: string;
  trigger_timeframe: string;
  signal_timeframe: string;
  target_timeframe: string;
  anchor_timeframe: string;
  setup_type: string;
  pivot_type: string;
  market_structure: string;
  metodologia_acao: string;
  analysis_title: string;
  methodology_summary: string;
  context_line_1: string;
  context_line_2: string;
  context_line_3: string;
  context_line_4: string;
  invalidation_text: string;
  positive_confluences: string;
  negative_confluences: string;
  is_active: boolean;
}

interface WatchlistItem {
  symbol: string;
  trading_profile?: string;
  reason: string;
  confluence_score: number;
  trend: string;
  current_price: number;
  notes: string;
  is_active: boolean;
}

interface ContextResult {
  title: string;
  subtitle: string;
  summary: string;
  lines: string[];
  invalidation: string;
}

const PERFIS: Record<string, TradingProfile> = {
  escalping: {
    label: 'Escalping',
    gatilho: '5m', sinal: '15m', alvo: '1h', ancora: '4h',
    gatilhoLabel: '5 minutos', sinalLabel: '15 minutos', alvoLabel: '1 hora', ancoraLabel: '4 horas',
    extensions: [1.5, 2.0, 2.5],  // R:R mínimo 1.5
    stopPercent: 0.012,           // Stop 1.2%
    minScore: 88,                 // V4: Apenas sinais de altíssima qualidade
    watchScore: 60                // V4: Watchlist para scores intermediários (60-87)
  },
  day_trading: {
    label: 'Day Trading',
    gatilho: '15m', sinal: '1h', alvo: '4h', ancora: '1d',
    gatilhoLabel: '15 minutos', sinalLabel: '1 hora', alvoLabel: '4 horas', ancoraLabel: 'Diário',
    extensions: [1.5, 2.0, 3.0],  // R:R mínimo 1.5
    stopPercent: 0.025,           // Stop 2.5%
    minScore: 86,                 // V4: Sinais de alta qualidade
    watchScore: 58                // V4: Watchlist para scores intermediários (58-85)
  },
  swing_trade: {
    label: 'Swing Trade',
    gatilho: '4h', sinal: '1d', alvo: '1w', ancora: '1w',
    gatilhoLabel: '4 horas', sinalLabel: 'Diário', alvoLabel: 'Semanal', ancoraLabel: 'Semanal',
    extensions: [1.5, 2.5, 4.0],  // R:R mínimo 1.5
    stopPercent: 0.04,            // Stop 4%
    minScore: 84,                 // V4: Sinais robustos
    watchScore: 56                // V4: Watchlist para scores intermediários (56-83)
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Debug: Log key type (first 20 chars)
    console.log(`🔑 Using key starting with: ${supabaseKey?.substring(0, 30)}...`);

    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { body = {}; }

    const { maxSymbols = 300, minVolume = 5000000, route = 'all' } = body as { maxSymbols?: number; minVolume?: number; route?: string };

    console.log(`🔍 SHDWXBT Institutional Scan v2.1 - Route: ${route}`);
    console.log(`📊 Config: maxSymbols=${maxSymbols}, minVolume=${minVolume}`);

    // Get top symbols
    const tickerRes = await fetch(`${BINANCE_FUTURES_URL}/fapi/v1/ticker/24hr`);
    if (!tickerRes.ok) throw new Error(`Binance API error: ${tickerRes.status}`);
    
    const tickers = await tickerRes.json();
    const usdtPairs: Ticker[] = (tickers as Array<Record<string, string>>)
      .filter((t) => t.symbol.endsWith('USDT') && !t.symbol.includes('_'))
      .map((t) => ({
        symbol: t.symbol,
        price: parseFloat(t.lastPrice),
        volume: parseFloat(t.quoteVolume),
        priceChange: parseFloat(t.priceChangePercent),
        high24h: parseFloat(t.highPrice),
        low24h: parseFloat(t.lowPrice)
      }))
      .filter((t) => t.volume >= minVolume)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, maxSymbols);

    console.log(`📊 Analyzing ${usdtPairs.length} symbols`);

    const opportunities: OpportunityItem[] = [];
    const watchlist: OpportunityItem[] = [];

    for (const ticker of usdtPairs) {
      // Debug: Log major pairs processing
      if (['BTCUSDT', 'ETHUSDT'].includes(ticker.symbol)) {
        console.log(`🪙 Processing ${ticker.symbol}...`);
      }
      try {
        // Multi-timeframe klines (including weekly for Swing Trade)
        const [klines15m, klines1h, klines4h, klines1d, klines1w] = await Promise.all([
          fetchKlines(ticker.symbol, '15m', 100),
          fetchKlines(ticker.symbol, '1h', 100),
          fetchKlines(ticker.symbol, '4h', 50),
          fetchKlines(ticker.symbol, '1d', 30),
          fetchKlines(ticker.symbol, '1w', 20)  // Weekly for Swing Trade
        ]);

        if (!klines1h || klines1h.length < 50) continue;

        // Analyze each timeframe
        const tf15m = analyzeTimeframe(klines15m, '15m');
        const tf1h = analyzeTimeframe(klines1h, '1h');
        const tf4h = analyzeTimeframe(klines4h, '4h');
        const tf1d = analyzeTimeframe(klines1d, '1d');
        const tf1w = analyzeTimeframe(klines1w, '1w');

        // Determine profiles to analyze
        const profiles = route === 'all' 
          ? ['escalping', 'day_trading', 'swing_trade'] 
          : [route.replace(' ', '_').toLowerCase()];

        for (const profileKey of profiles) {
          const perfil = PERFIS[profileKey] || PERFIS.day_trading;
          
          // Get analyses for this profile's timeframes
          const signalTF = getAnalysisForTF(perfil.sinal, { tf15m, tf1h, tf4h, tf1d, tf1w });
          const targetTF = getAnalysisForTF(perfil.alvo, { tf15m, tf1h, tf4h, tf1d, tf1w });
          const anchorTF = getAnalysisForTF(perfil.ancora, { tf15m, tf1h, tf4h, tf1d, tf1w });
          
          if (!signalTF || !targetTF) continue;

          // ============================================
          // FILTROS INSTITUCIONAIS V3 - KILLER FILTERS
          // Condições que ELIMINAM sinais automaticamente
          // ============================================
          
          // FILTRO 1: RSI deve estar em zona extrema OU confirmação forte
          const rsi = signalTF.rsi || 50;
          const rsiIsExtremeStrong = rsi <= 30 || rsi >= 70;  // Extremo forte
          const rsiIsExtreme = rsi <= 35 || rsi >= 65;        // Extremo moderado
          
          // FILTRO 2: Fibonacci zone deve ser adequada à direção esperada
          const fibZone = signalTF.fibZone || 'equilibrium';
          
          // FILTRO 3: EMA200 - CRÍTICO para tendência
          const priceAboveEMA200 = signalTF.currentPrice > signalTF.ema200;
          const priceBelowEMA200 = signalTF.currentPrice < signalTF.ema200;
          
          // FILTRO 4: EMAs 12/26 alinhadas
          const emasAlignedBullish = signalTF.ema12 > signalTF.ema26;
          const emasAlignedBearish = signalTF.ema12 < signalTF.ema26;

          // Apply METODOLOGIA rules
          const metodologiaResult = applyMetodologia(ticker.symbol, perfil, signalTF, targetTF, anchorTF);

          if (!metodologiaResult) continue;
          
          // ============================================
          // KILLER FILTERS V3 - ELIMINAÇÃO RIGOROSA
          // ============================================
          
          const anchorTrend = anchorTF?.trend || 'neutral';
          const targetTrend = targetTF?.trend || 'neutral';
          const direction = metodologiaResult.direction;
          
          // KILLER 1: Contra-tendência do âncora SEM extremo forte de RSI = ELIMINAR
          const isCounterTrend = (direction === 'bullish' && anchorTrend === 'bearish') ||
                                 (direction === 'bearish' && anchorTrend === 'bullish');
          
          if (isCounterTrend && !rsiIsExtremeStrong) {
            continue; // ELIMINADO: contra tendência sem RSI extremo forte
          }
          
          // KILLER 2: Fibonacci zone INCORRETA sem RSI extremo = ELIMINAR
          const fibZoneCorrect = (direction === 'bullish' && (fibZone === 'discount' || fibZone === 'ote')) ||
                                 (direction === 'bearish' && (fibZone === 'premium' || fibZone === 'ote'));
          
          if (!fibZoneCorrect && !rsiIsExtreme) {
            continue; // ELIMINADO: zona fib incorreta sem confirmação
          }
          
          // KILLER 3: EMA200 em oposição à direção sem RSI extremo forte = ELIMINAR
          const ema200Conflict = (direction === 'bullish' && priceBelowEMA200) ||
                                  (direction === 'bearish' && priceAboveEMA200);
          
          if (ema200Conflict && !rsiIsExtremeStrong) {
            continue; // ELIMINADO: contra EMA200 sem RSI extremo forte
          }
          
          // KILLER 4: EMAs 12/26 em divergência com a direção = PENALIZAR FORTE
          const emasConflict = (direction === 'bullish' && emasAlignedBearish) ||
                               (direction === 'bearish' && emasAlignedBullish);
          
          // Não elimina, mas marca para penalização no score
          const hasEmaConflict = emasConflict;
          
          // KILLER 5: Timeframe alvo em tendência oposta = ELIMINAR
          const targetConflict = (direction === 'bullish' && targetTrend === 'bearish') ||
                                 (direction === 'bearish' && targetTrend === 'bullish');
          
          if (targetConflict && !rsiIsExtremeStrong) {
            continue; // ELIMINADO: alvo em oposição sem confirmação forte
          }
          
          // KILLER 6: RSI na zona OPOSTA ao sinal = ELIMINAR
          const rsiConflict = (direction === 'bullish' && rsi >= 70) ||
                              (direction === 'bearish' && rsi <= 30);
          
          if (rsiConflict) {
            continue; // ELIMINADO: RSI completamente oposto à direção
          }

          // Calculate confluence score with killer filter context
          const scoreResult = calculateAdvancedScore(ticker, signalTF, targetTF, anchorTF, perfil, metodologiaResult, {
            hasEmaConflict,
            isCounterTrend,
            fibZoneCorrect,
            rsiIsExtremeStrong
          });

          // Debug: Log score for major pairs and ALL swing trades
          if (['BTCUSDT', 'ETHUSDT', 'SOLUSDT'].includes(ticker.symbol) || profileKey === 'swing_trade') {
            console.log(`🔍 ${ticker.symbol} ${perfil.label}: score=${scoreResult.score}, metodologia=${metodologiaResult.acao || 'none'}, structure=${metodologiaResult.structure}, rsi=${rsi.toFixed(1)}, fib=${fibZone}`);
          }

          // INSTITUCIONAL V4: Score mínimo ABSOLUTO ajustado para 55 - permite watchlist capturar sinais intermediários
          if (scoreResult.score < 55) continue; // Apenas descarta sinais muito fracos

          // Build institutional context
          const analysisContext = buildInstitutionalContext(ticker.symbol, perfil, metodologiaResult, signalTF, targetTF, anchorTF, scoreResult);

          // Calculate entry zone and targets
          const entryZone = calculateEntryZone(ticker.price, signalTF, metodologiaResult.direction);
          const stopLoss = calculateStopLoss(ticker.price, signalTF, perfil, metodologiaResult.direction);
          const targets = calculateTargets(ticker.price, stopLoss, perfil.extensions, metodologiaResult.direction);
          
          // FILTRO 6: Verificar R:R mínimo de 1.5
          const risk = Math.abs(ticker.price - stopLoss);
          const reward = Math.abs(targets[0] - ticker.price);
          const riskReward = reward / risk;
          
          if (riskReward < 1.5) {
            continue; // Rejeitar sinais com R:R menor que 1.5
          }

          const item = {
            symbol: ticker.symbol,
            name: ticker.symbol.replace('USDT', ''),
            direction: metodologiaResult.direction,
            trend: metodologiaResult.direction,
            
            // Entry zone
            entry_zone_start: entryZone.start,
            entry_zone_end: entryZone.end,
            entry_price: ticker.price,
            current_price: ticker.price,
            
            // Risk management
            stop_loss: stopLoss,
            invalidation: stopLoss,
            target_1: targets[0],
            target_2: targets[1],
            target_3: targets[2],
            
            // Technical data
            rsi_value: signalTF.rsi,
            rsi_status: getRsiStatus(signalTF.rsi),
            confluence_score: scoreResult.score,
            
            // Fibonacci
            fib_382: signalTF.fib382,
            fib_500: signalTF.fib500,
            fib_618: signalTF.fib618,
            fib_zone: scoreResult.fibZone,
            fibonacci_extensions: JSON.stringify(perfil.extensions),
            
            // Profile & Timeframes
            trading_profile: perfil.label,
            trigger_timeframe: perfil.gatilhoLabel,
            signal_timeframe: perfil.sinalLabel,
            target_timeframe: perfil.alvoLabel,
            anchor_timeframe: perfil.ancoraLabel,
            
            // Metodologia
            setup_type: metodologiaResult.setup,
            pivot_type: metodologiaResult.pivotType,
            market_structure: metodologiaResult.structure,
            metodologia_acao: metodologiaResult.acao,
            
            // Context texts
            analysis_title: analysisContext.title,
            methodology_summary: analysisContext.summary,
            context_line_1: analysisContext.lines[0] || '',
            context_line_2: analysisContext.lines[1] || '',
            context_line_3: analysisContext.lines[2] || '',
            context_line_4: analysisContext.lines[3] || '',
            invalidation_text: analysisContext.invalidation,
            
            // Confluences
            positive_confluences: JSON.stringify(scoreResult.positives),
            negative_confluences: JSON.stringify(scoreResult.negatives),
            
            is_active: true
          };

          if (scoreResult.score >= perfil.minScore) {
            if (!opportunities.find(o => o.symbol === item.symbol && o.trading_profile === item.trading_profile)) {
              opportunities.push(item);
            }
          } else if (scoreResult.score >= perfil.watchScore) {
            if (!watchlist.find(w => w.symbol === item.symbol && w.trading_profile === item.trading_profile)) {
              watchlist.push(item);
            }
          }
        }

        await new Promise(r => setTimeout(r, 50));
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.warn(`Error analyzing ${ticker.symbol}:`, error.message);
        if (['BTCUSDT', 'ETHUSDT'].includes(ticker.symbol)) {
          console.error(`🚨 CRITICAL: Error on ${ticker.symbol}:`, error);
        }
      }
    }

    // Sort by score
    opportunities.sort((a, b) => b.confluence_score - a.confluence_score);
    watchlist.sort((a, b) => b.confluence_score - a.confluence_score);
    
    // Deduplicate by symbol + trading_profile (keep highest score per profile)
    const deduped: OpportunityItem[] = [];
    const seenKeys = new Set<string>();
    for (const opp of opportunities) {
      const key = `${opp.symbol}_${opp.trading_profile}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        deduped.push(opp);
      }
    }
    opportunities.length = 0;
    opportunities.push(...deduped);

    console.log(`✅ Found ${opportunities.length} opportunities (deduped by symbol+profile), ${watchlist.length} watchlist`);

    // DEBUG: Log sample item structure
    if (opportunities.length > 0) {
      const sample = opportunities[0];
      console.log('📋 Sample opportunity:');
      console.log('  - symbol:', sample.symbol);
      console.log('  - context_line_1:', sample.context_line_1 || 'EMPTY');
      console.log('  - analysis_title:', sample.analysis_title || 'EMPTY');
      console.log('  - metodologia_acao:', sample.metodologia_acao || 'EMPTY');
      console.log('  - pivot_type:', sample.pivot_type || 'EMPTY');
      console.log('  - market_structure:', sample.market_structure || 'EMPTY');
    }

    // Save to database using UPSERT via REST API with on_conflict
    let insertError: { message: string; code?: number } | null = null;
    let insertResult: OpportunityItem[] | null = null;
    
    if (opportunities.length > 0) {
      console.log(`💾 Saving ${opportunities.length} opportunities via REST UPSERT...`);
      
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      
      // Log key type for debugging
      console.log(`🔑 Key type: ${supabaseKey?.substring(0, 50)}...`);
      
      // UPSERT with on_conflict for symbol + trading_profile
      try {
        const upsertRes = await fetch(
          `${supabaseUrl}/rest/v1/opportunities?on_conflict=symbol,trading_profile`,
          {
            method: 'POST',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates,return=representation'
            },
            body: JSON.stringify(opportunities)
          }
        );
        
        if (!upsertRes.ok) {
          const errText = await upsertRes.text();
          console.error(`❌ Upsert error: ${upsertRes.status} - ${errText}`);
          insertError = { message: errText, code: upsertRes.status };
        } else {
          insertResult = await upsertRes.json();
          console.log(`✅ Upserted ${insertResult?.length || 0} records`);
        }
      } catch (e) {
        const error = e as Error;
        console.error('❌ Upsert error:', error.message);
        insertError = { message: error.message };
      }
    }

    if (watchlist.length > 0) {
      console.log(`💾 Saving ${watchlist.length} watchlist items...`);
      
      // Adapt watchlist items to match the watchlist table schema
      // After migration 010, watchlist table supports: symbol, trading_profile, reason, confluence_score, trend, current_price, notes
      const watchlistItems: WatchlistItem[] = watchlist.map((item) => ({
        symbol: item.symbol,
        trading_profile: item.trading_profile || 'Day Trading',
        reason: `${item.analysis_title || item.setup_type || 'Auto-detected'}`,
        confluence_score: item.confluence_score,
        trend: item.direction || item.trend || 'neutral',
        current_price: item.current_price,
        notes: item.methodology_summary || item.context_line_1 || '',
        is_active: true
      }));
      
      console.log(`📋 Watchlist items to save: ${watchlistItems.length}`);
      
      // Try with symbol,trading_profile constraint first (new schema)
      const { error } = await supabase
        .from('watchlist')
        .upsert(watchlistItems, { 
          onConflict: 'symbol,trading_profile',
          ignoreDuplicates: false
        });
      
      // If error (likely old schema without trading_profile), try with symbol only
      if (error) {
        console.warn('⚠️ Trying legacy watchlist schema (symbol only)...');
        
        // Deduplicate by symbol (keep highest score)
        const uniqueWatchlist: WatchlistItem[] = [];
        const seenSymbols = new Set<string>();
        watchlistItems.sort((a, b) => b.confluence_score - a.confluence_score);
        for (const item of watchlistItems) {
          if (!seenSymbols.has(item.symbol)) {
            seenSymbols.add(item.symbol);
            // Remove trading_profile for legacy schema
            const { trading_profile: _tradingProfile, ...legacyItem } = item;
            uniqueWatchlist.push(legacyItem as WatchlistItem);
          }
        }
        
        const result = await supabase
          .from('watchlist')
          .upsert(uniqueWatchlist, { 
            onConflict: 'symbol',
            ignoreDuplicates: false
          });
        
        if (result.error) {
          console.error('❌ Error saving watchlist (legacy):', result.error);
        } else {
          console.log(`✅ Watchlist saved (legacy): ${uniqueWatchlist.length} items`);
        }
      } else {
        console.log(`✅ Watchlist saved: ${watchlistItems.length} items`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        version: '3.0',
        scanned: usdtPairs.length, 
        opportunities: opportunities.length, 
        watchlist: watchlist.length,
        timestamp: new Date().toISOString(),
        // Debug: Include insert result
        dbInsertError: insertError,
        dbInsertCount: insertResult?.length || 0,
        // Debug: Include sample data in response
        sampleOpportunity: opportunities.length > 0 ? {
          symbol: opportunities[0].symbol,
          analysis_title: opportunities[0].analysis_title,
          context_line_1: opportunities[0].context_line_1,
          metodologia_acao: opportunities[0].metodologia_acao,
          pivot_type: opportunities[0].pivot_type,
          market_structure: opportunities[0].market_structure
        } : null
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const scanError = err instanceof Error ? err : new Error(String(err));
    console.error("Scan error:", scanError);
    return new Response(
      JSON.stringify({ error: "scan_error", message: scanError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

interface TimeframeAnalyses {
  tf15m: TimeframeAnalysis | null;
  tf1h: TimeframeAnalysis | null;
  tf4h: TimeframeAnalysis | null;
  tf1d: TimeframeAnalysis | null;
  tf1w: TimeframeAnalysis | null;
}

async function fetchKlines(symbol: string, interval: string, limit: number): Promise<number[][] | null> {
  try {
    const res = await fetch(`${BINANCE_FUTURES_URL}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function getAnalysisForTF(tf: string, analyses: TimeframeAnalyses): TimeframeAnalysis | null {
  const map: Record<string, keyof TimeframeAnalyses> = { 
    '5m': 'tf15m',   // Fallback to 15m for 5m
    '15m': 'tf15m', 
    '1h': 'tf1h', 
    '4h': 'tf4h', 
    '1d': 'tf1d',
    '1w': 'tf1w',
    '1M': 'tf1w'    // Use weekly as proxy for monthly (close enough for analysis)
  };
  return analyses[map[tf]] || null;
}

function analyzeTimeframe(klines: number[][] | null, tfCode: string): TimeframeAnalysis | null {
  // Use lower minimum for weekly/monthly timeframes (less historical data available)
  const minKlines = (tfCode === '1w' || tfCode === '1M') ? 10 : 30;
  if (!klines || klines.length < minKlines) return null;
  
  const closes = klines.map((k) => parseFloat(String(k[4])));
  const highs = klines.map((k) => parseFloat(String(k[2])));
  const lows = klines.map((k) => parseFloat(String(k[3])));
  
  const currentPrice = closes[closes.length - 1];
  const rsi = calculateRSI(closes, 14);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const ema200 = calculateEMA(closes, Math.min(200, closes.length - 1));
  
  // Swing detection
  const lookback = Math.min(50, klines.length);
  const recentHighs = highs.slice(-lookback);
  const recentLows = lows.slice(-lookback);
  const swingHigh = Math.max(...recentHighs);
  const swingLow = Math.min(...recentLows);
  
  // Fibonacci levels
  const range = swingHigh - swingLow;
  const fib236 = swingHigh - range * 0.236;
  const fib382 = swingHigh - range * 0.382;
  const fib500 = swingHigh - range * 0.5;
  const fib618 = swingHigh - range * 0.618;
  const fib786 = swingHigh - range * 0.786;
  
  // Trend determination
  const isBullish = ema12 > ema26 && currentPrice > ema26;
  const isBearish = ema12 < ema26 && currentPrice < ema26;
  const trend = isBullish ? 'bullish' : isBearish ? 'bearish' : 'neutral';
  
  // Fibonacci zone
  let fibZone = 'equilibrium';
  if (currentPrice <= fib618) fibZone = 'discount';
  else if (currentPrice >= fib382) fibZone = 'premium';
  if (currentPrice >= fib618 && currentPrice <= fib786) fibZone = 'ote';
  
  return {
    timeframe: tfCode,
    currentPrice, rsi, ema12, ema26, ema200,
    swingHigh, swingLow,
    fib236, fib382, fib500, fib618, fib786,
    trend, fibZone
  };
}

function applyMetodologia(_symbol: string, perfil: TradingProfile, signalTF: TimeframeAnalysis | null, _targetTF: TimeframeAnalysis | null, anchorTF: TimeframeAnalysis | null): MetodologiaResult | null {
  const anchorTrend = anchorTF?.trend || _targetTF?.trend || 'neutral';
  const signalTrend = signalTF?.trend || 'neutral';
  const rsi = signalTF?.rsi || 50;
  
  let direction = 'bullish';
  let setup = 'fundo ascendente';
  let pivotType = 'pivo_alta';
  let acao = 'BUSCA_FUNDO_ASC';
  let structure = 'Alta';
  let metodologiaContexto = '';
  
  // RSI-based detection first (extremos)
  if (rsi <= 30) {
    // SOBREVENDA - Alta probabilidade de fundo
    const sobrevenda = METODOLOGIA.sobrevenda[perfil.sinal];
    if (sobrevenda) {
      direction = 'bullish';
      setup = 'fundo ascendente';
      acao = 'SOBREVENDA';
      structure = 'Sobrevenda';
      metodologiaContexto = sobrevenda.contexto;
    }
  } else if (rsi >= 70) {
    // SOBRECOMPRA - Alta probabilidade de topo
    const sobrecompra = METODOLOGIA.sobrecompra[perfil.sinal];
    if (sobrecompra) {
      direction = 'bearish';
      setup = 'topo descendente';
      acao = 'SOBRECOMPRA';
      structure = 'Sobrecompra';
      metodologiaContexto = sobrecompra.contexto;
    }
  } else if (anchorTrend === 'bullish') {
    // TENDÊNCIA DE ALTA no âncora
    if (signalTF?.fibZone === 'discount' || signalTF?.fibZone === 'ote' || signalTrend !== 'bullish') {
      // Pivô de baixa em tendência de alta = busca fundo ascendente
      const regra = METODOLOGIA.pivo_baixa_tendencia_alta[perfil.sinal];
      if (regra) {
        direction = 'bullish';
        setup = 'fundo ascendente';
        pivotType = 'pivo_baixa';
        acao = regra.acao;
        structure = 'Alta - Correção';
        metodologiaContexto = regra.contexto;
      }
    } else {
      // Pivô de alta em tendência de alta = confirma fundo
      const regra = METODOLOGIA.pivo_alta_tendencia_alta[perfil.sinal];
      if (regra) {
        direction = 'bullish';
        setup = 'fundo confirmado';
        pivotType = 'pivo_alta';
        acao = regra.acao;
        structure = 'Alta - Confirmação';
        metodologiaContexto = regra.contexto;
      }
    }
  } else if (anchorTrend === 'bearish') {
    // TENDÊNCIA DE BAIXA no âncora
    if (signalTF?.fibZone === 'premium' || signalTrend !== 'bearish') {
      // Pivô de alta em tendência de baixa = busca topo descendente
      const regra = METODOLOGIA.pivo_alta_tendencia_baixa[perfil.sinal];
      if (regra) {
        direction = 'bearish';
        setup = 'topo descendente';
        pivotType = 'pivo_alta';
        acao = regra.acao;
        structure = 'Baixa - Correção';
        metodologiaContexto = regra.contexto;
      }
    } else {
      // Pivô de baixa em tendência de baixa = confirma topo
      const regra = METODOLOGIA.pivo_baixa_tendencia_baixa[perfil.sinal];
      if (regra) {
        direction = 'bearish';
        setup = 'topo confirmado';
        pivotType = 'pivo_baixa';
        acao = regra.acao;
        structure = 'Baixa - Confirmação';
        metodologiaContexto = regra.contexto;
      }
    }
  } else {
    // NEUTRO - usar fibonacci zone para decidir
    if (signalTF?.fibZone === 'discount' || signalTF?.fibZone === 'ote') {
      direction = 'bullish';
      setup = 'fundo ascendente';
      structure = 'Neutro - Zona de Desconto';
      metodologiaContexto = `Preço em zona de desconto no ${perfil.sinalLabel}, favorável para busca de fundo ascendente`;
    } else if (signalTF?.fibZone === 'premium') {
      direction = 'bearish';
      setup = 'topo descendente';
      structure = 'Neutro - Zona de Prêmio';
      metodologiaContexto = `Preço em zona de prêmio no ${perfil.sinalLabel}, favorável para busca de topo descendente`;
    }
  }
  
  return {
    direction,
    setup,
    pivotType,
    acao,
    structure,
    metodologiaContexto,
    anchorTrend,
    signalTrend
  };
}

function calculateAdvancedScore(
  ticker: Ticker, 
  signalTF: TimeframeAnalysis | null, 
  targetTF: TimeframeAnalysis | null, 
  anchorTF: TimeframeAnalysis | null, 
  perfil: TradingProfile, 
  metodologia: MetodologiaResult,
  context: { hasEmaConflict: boolean; isCounterTrend: boolean; fibZoneCorrect: boolean; rsiIsExtremeStrong: boolean } = {
    hasEmaConflict: false, isCounterTrend: false, fibZoneCorrect: false, rsiIsExtremeStrong: false
  }
): ScoreResult {
  // INSTITUCIONAL V3: Score base 40 - exige muitas confluências para chegar ao mínimo
  let score = 40;
  const positives: string[] = [];
  const negatives: string[] = [];
  
  const direction = metodologia.direction;
  const rsi = signalTF?.rsi || 50;
  
  // ============================================
  // PENALIZAÇÕES POR CONFLITOS DETECTADOS
  // ============================================
  
  if (context.hasEmaConflict) {
    score -= 15;
    negatives.push('EMAs 12/26 em divergência com a direção do sinal');
  }
  
  if (context.isCounterTrend) {
    score -= 10; // Penalidade (já foi filtrado mas pode passar com RSI extremo)
    negatives.push('Operação contra a tendência do timeframe âncora');
  }
  
  if (!context.fibZoneCorrect) {
    score -= 10;
    negatives.push('Preço não está na zona Fibonacci ideal para a direção');
  }
  
  // ============================================
  // BÔNUS POR CONFIRMAÇÕES FORTES
  // ============================================
  
  // RSI Confluence - MUITO mais rigoroso
  if (direction === 'bullish') {
    if (rsi <= 20) { 
      score += 25; // Extremo absoluto = bônus máximo
      positives.push('RSI em sobrevenda EXTREMA (<20) - sinal institucional'); 
    } else if (rsi <= 25) { 
      score += 20;
      positives.push('RSI em sobrevenda forte (<25) - alta probabilidade'); 
    } else if (rsi <= 30) { 
      score += 15; 
      positives.push('RSI em sobrevenda - potencial reversão'); 
    } else if (rsi <= 35) { 
      score += 8;
      positives.push('RSI em zona de força vendedora'); 
    } else if (rsi > 45 && rsi < 55) {
      score -= 12;
      negatives.push('RSI em zona NEUTRA - sem confirmação de direção');
    } else if (rsi >= 65) {
      score -= 15;
      negatives.push('RSI elevado - alto risco de correção');
    }
  } else { // bearish
    if (rsi >= 80) { 
      score += 25;
      positives.push('RSI em sobrecompra EXTREMA (>80) - sinal institucional'); 
    } else if (rsi >= 75) { 
      score += 20;
      positives.push('RSI em sobrecompra forte (>75) - alta probabilidade'); 
    } else if (rsi >= 70) { 
      score += 15; 
      positives.push('RSI em sobrecompra - potencial correção'); 
    } else if (rsi >= 65) { 
      score += 8;
      positives.push('RSI em zona de força compradora'); 
    } else if (rsi > 45 && rsi < 55) {
      score -= 12;
      negatives.push('RSI em zona NEUTRA - sem confirmação de direção');
    } else if (rsi <= 35) {
      score -= 15;
      negatives.push('RSI baixo - alto risco de reversão');
    }
  }
  
  // Fibonacci zone - CRÍTICO
  const fibZone = signalTF?.fibZone || 'equilibrium';
  if (direction === 'bullish') {
    if (fibZone === 'ote') {
      score += 20;
      positives.push('Preço na OTE (Optimal Trade Entry) - IDEAL institucional');
    } else if (fibZone === 'discount') {
      score += 15;
      positives.push('Preço na zona de desconto Fibonacci');
    } else if (fibZone === 'premium') {
      score -= 20;
      negatives.push('Preço em zona PREMIUM - NÃO comprar aqui');
    }
  } else {
    if (fibZone === 'ote') {
      score += 20;
      positives.push('Preço na OTE (Optimal Trade Entry) - IDEAL institucional');
    } else if (fibZone === 'premium') {
      score += 15;
      positives.push('Preço na zona de prêmio Fibonacci');
    } else if (fibZone === 'discount') {
      score -= 20;
      negatives.push('Preço em zona DISCOUNT - NÃO vender aqui');
    }
  }
  
  // EMA200 - A MAIS IMPORTANTE
  if (signalTF) {
    if (direction === 'bullish' && signalTF.currentPrice > signalTF.ema200) {
      score += 15;
      positives.push('Preço ACIMA da EMA200 - tendência macro de ALTA');
    } else if (direction === 'bearish' && signalTF.currentPrice < signalTF.ema200) {
      score += 15;
      positives.push('Preço ABAIXO da EMA200 - tendência macro de BAIXA');
    }
    
    // EMAs 12/26 (se não conflitantes)
    if (!context.hasEmaConflict) {
      if ((direction === 'bullish' && signalTF.ema12 > signalTF.ema26) ||
          (direction === 'bearish' && signalTF.ema12 < signalTF.ema26)) {
        score += 10;
        positives.push('EMAs 12/26 alinhadas com a direção');
      }
    }
  }
  
  // Âncora ALINHADA - CRÍTICO
  if (anchorTF && anchorTF.trend === direction) {
    score += 18;
    positives.push(`Âncora (${perfil.ancoraLabel}) CONFIRMADA - alta convicção`);
  } else if (anchorTF && anchorTF.trend === 'neutral') {
    score += 5;
    positives.push(`Âncora (${perfil.ancoraLabel}) neutra - sem resistência`);
  }
  
  // Alvo ALINHADO
  if (targetTF && targetTF.trend === direction) {
    score += 12;
    positives.push(`Timeframe alvo (${perfil.alvoLabel}) alinhado`);
  } else if (targetTF && targetTF.trend === 'neutral') {
    score += 3;
  }
  
  // Metodologia ação - MUITO IMPORTANTE
  if (metodologia.acao === 'CONFIRMA_FUNDO' && direction === 'bullish') {
    score += 15;
    positives.push('CONFIRMAÇÃO DE FUNDO pela metodologia de pivôs');
  } else if (metodologia.acao === 'CONFIRMA_TOPO' && direction === 'bearish') {
    score += 15;
    positives.push('CONFIRMAÇÃO DE TOPO pela metodologia de pivôs');
  } else if (metodologia.acao === 'SOBREVENDA' && direction === 'bullish') {
    score += 12;
    positives.push('Sobrevenda detectada pela metodologia');
  } else if (metodologia.acao === 'SOBRECOMPRA' && direction === 'bearish') {
    score += 12;
    positives.push('Sobrecompra detectada pela metodologia');
  } else if (metodologia.acao === 'BUSCA_FUNDO_ASC' || metodologia.acao === 'BUSCA_TOPO_DESC') {
    score += 8;
    positives.push('Busca de estrutura pela metodologia');
  }
  
  // Volume institucional
  if (ticker.volume > 200000000) { 
    score += 8; 
    positives.push('Volume de negociação > $200M - liquidez institucional'); 
  } else if (ticker.volume > 100000000) { 
    score += 5; 
    positives.push('Volume de negociação > $100M'); 
  } else if (ticker.volume < 20000000) {
    score -= 5;
    negatives.push('Volume baixo - risco de liquidez');
  }
  
  // BÔNUS ESPECIAL: RSI extremo + Fib zone correta + Âncora alinhada = Setup AAA
  if (context.rsiIsExtremeStrong && context.fibZoneCorrect && anchorTF?.trend === direction) {
    score += 10;
    positives.push('🔥 SETUP INSTITUCIONAL AAA - máxima confluência');
  }
  
  // ============================================
  // FILTROS FINAIS DE QUALIDADE
  // ============================================
  
  // Penalidade para sinais sem confluências fortes
  if (positives.length < 3) {
    score -= 10;
    negatives.push('Poucas confluências - setup fraco');
  }
  
  // Penalidade se há mais negativas que positivas
  if (negatives.length > positives.length) {
    score -= 10;
    negatives.push('Muitos fatores negativos - evitar entrada');
  }
  
  // Bônus extra para sinais com múltiplas confluências fortes
  if (positives.length >= 5) {
    score += 8;
    positives.push('Múltiplas confluências alinhadas - setup de alta qualidade');
  }
  
  // Default negatives
  if (negatives.length === 0) negatives.push('Monitorar volatilidade e volume');
  
  return {
    score: Math.min(100, Math.max(0, score)),
    direction,
    fibZone,
    positives: positives.slice(0, 6),
    negatives: negatives.slice(0, 4)
  };
}

function buildInstitutionalContext(symbol: string, perfil: TradingProfile, metodologia: MetodologiaResult, signalTF: TimeframeAnalysis | null, _targetTF: TimeframeAnalysis | null, anchorTF: TimeframeAnalysis | null, scoreResult: ScoreResult): ContextResult {
  // _sym and _acao reserved for future use in more detailed context generation
  const _sym: string = symbol.replace('USDT', '');
  const direction = metodologia.direction;
  const direcao = direction === 'bullish' ? 'alta' : 'baixa';
  const setup = metodologia.setup;
  const _acao: string = metodologia.acao; // SOBREVENDA, SOBRECOMPRA, CONFIRMA_FUNDO, etc.
  
  // =====================================================
  // TITLE - Padrão institucional completo
  // Formato: "SYMBOL — Profile — Tendência de X: buscando Y no Z"
  // =====================================================
  const title = `${symbol} — ${perfil.label} — Tendência de ${direcao}: buscando ${setup} no tempo gráfico ${perfil.alvoLabel}`;
  
  // =====================================================
  // SUBTITLE - Repetição do título em formato descritivo
  // =====================================================
  const subtitle = `${symbol} — ${perfil.label} — Tendência de ${direcao}: buscando ${setup} no tempo gráfico ${perfil.alvoLabel}`;
  
  // =====================================================
  // CONTEXT LINES - 4 linhas estruturadas para o banco
  // =====================================================
  const lines: string[] = [];
  
  // LINE 1: Setup + Configuração identificada
  const setupConfig = setup.includes('ascendente') 
    ? (setup.includes('fundo') ? 'Fundo Ascendente' : 'Topo Ascendente')
    : (setup.includes('fundo') ? 'Fundo Descendente' : 'Topo Descendente');
  const setupConfigEN = setup.includes('ascendente')
    ? (setup.includes('fundo') ? 'Ascending Bottom' : 'Ascending Top')
    : (setup.includes('fundo') ? 'Descending Bottom' : 'Descending Top');
  const setupConfigZH = setup.includes('ascendente')
    ? (setup.includes('fundo') ? '上升底部' : '上升顶部')
    : (setup.includes('fundo') ? '下降底部' : '下降顶部');
  lines.push(`${perfil.label} - Configuração de ${setupConfig} identificada. | ${perfil.label} - ${setupConfigEN} configuration identified. | ${perfil.label} - 识别到${setupConfigZH}配置。`);
  
  // LINE 2: Tendência âncora + Estado do timeframe alvo
  const ancoraDir = anchorTF?.trend === 'bullish' ? 'alta' : (anchorTF?.trend === 'bearish' ? 'baixa' : 'indefinida');
  const ancoraDirEN = anchorTF?.trend === 'bullish' ? 'uptrend' : (anchorTF?.trend === 'bearish' ? 'downtrend' : 'undefined');
  const ancoraDirZH = anchorTF?.trend === 'bullish' ? '上涨' : (anchorTF?.trend === 'bearish' ? '下跌' : '未定义');
  const isCorrection = (direcao === 'alta' && setup.includes('fundo')) || (direcao === 'baixa' && setup.includes('topo'));
  const estadoAlvo = isCorrection ? 'correção' : 'continuidade';
  const estadoAlvoEN = isCorrection ? 'correction' : 'continuation';
  const estadoAlvoZH = isCorrection ? '回调' : '延续';
  lines.push(`Tendência no tempo gráfico âncora (${perfil.ancoraLabel}): ${ancoraDir}. O tempo gráfico ${perfil.alvoLabel} está em ${estadoAlvo}, buscando formar ${setup}. | Trend in anchor timeframe (${perfil.ancoraLabel}): ${ancoraDirEN}. The ${perfil.alvoLabel} timeframe is in ${estadoAlvoEN}, seeking to form ${setup}. | 锐定时间周期 (${perfil.ancoraLabel}) 趋势: ${ancoraDirZH}。${perfil.alvoLabel}时间周期处于${estadoAlvoZH}，寻求形成${setup}。`);
  
  // LINE 3: Zona Fibonacci + EMA200
  const fibZone = scoreResult?.fibZone || 'equilibrium';
  const ema200 = signalTF?.ema200 || 0;
  const price = signalTF?.currentPrice || 0;
  const ema200Position = price > ema200 ? 'acima' : 'abaixo';
  
  let fibText = '';
  let fibTextEN = '';
  let fibTextZH = '';
  if (fibZone === 'premium') {
    fibText = `◆ Preço atual na zona de prêmio (favorável para venda) da retração de Fibonacci.`;
    fibTextEN = `◆ Current price in premium zone (favorable for selling) of Fibonacci retracement.`;
    fibTextZH = `◆ 当前价格处于斐波那契回调的溝价区（适合做空）。`;
  } else if (fibZone === 'discount') {
    fibText = `◆ Preço atual na zona de desconto (favorável para compra) da retração de Fibonacci.`;
    fibTextEN = `◆ Current price in discount zone (favorable for buying) of Fibonacci retracement.`;
    fibTextZH = `◆ 当前价格处于斐波那契回调的折价区（适合做多）。`;
  } else if (fibZone === 'ote') {
    fibText = `◆ Preço atual na zona de entrada ótima (OTE) da retração de Fibonacci.`;
    fibTextEN = `◆ Current price in optimal trade entry (OTE) zone of Fibonacci retracement.`;
    fibTextZH = `◆ 当前价格处于斐波那契回调的最佳交易进入区 (OTE)。`;
  } else {
    fibText = `Preço atual na zona de equilíbrio da retração de Fibonacci.`;
    fibTextEN = `Current price in equilibrium zone of Fibonacci retracement.`;
    fibTextZH = `当前价格处于斐波那契回调的平衡区。`;
  }
  lines.push(`${fibText} Preço ${ema200Position} da média móvel exponencial de 200 períodos no ${perfil.sinalLabel}. | ${fibTextEN} Price ${ema200Position} the 200-period exponential moving average on ${perfil.sinalLabel}. | ${fibTextZH} 价格在${perfil.sinalLabel}上处于200周期指数移动平均线${ema200Position === 'acima' ? '之上' : '之下'}。`);
  
  // LINE 4: RSI + Ação recomendada
  const rsiValue = signalTF?.rsi || 50;
  const rsiLabel = rsiValue > 50 ? 'força compradora' : 'força vendedora';
  const rsiLabelEN = rsiValue > 50 ? 'buying strength' : 'selling strength';
  const rsiLabelZH = rsiValue > 50 ? '买盘力量' : '卖盘力量';
  const acaoRecomendada = direcao === 'alta' 
    ? `Aguardar confirmação de ${setup} no ${perfil.alvoLabel} para entrada em compra.`
    : `Aguardar confirmação de ${setup} no ${perfil.alvoLabel} para entrada em venda.`;
  const acaoRecomendadaEN = direcao === 'alta'
    ? `Wait for confirmation of ${setup} on ${perfil.alvoLabel} for long entry.`
    : `Wait for confirmation of ${setup} on ${perfil.alvoLabel} for short entry.`;
  const acaoRecomendadaZH = direcao === 'alta'
    ? `等待${perfil.alvoLabel}上${setup}的确认，以便做多。`
    : `等待${perfil.alvoLabel}上${setup}的确认，以便做空。`;
  lines.push(`◆ Índice de força relativa (14): ${rsiValue.toFixed(1)} (${rsiLabel}) no ${perfil.alvoLabel}. ${acaoRecomendada} | ◆ Relative Strength Index (14): ${rsiValue.toFixed(1)} (${rsiLabelEN}) on ${perfil.alvoLabel}. ${acaoRecomendadaEN} | ◆ 相对强弱指数 (14): ${rsiValue.toFixed(1)} (${rsiLabelZH}) 在${perfil.alvoLabel}上。${acaoRecomendadaZH}`);
  
  // =====================================================
  // INVALIDATION - Condição de invalidação da análise
  // =====================================================
  const invalidation = direcao === 'alta'
    ? `Análise invalidada se o preço perder o fundo anterior no ${perfil.alvoLabel}, confirmando perda de estrutura de ${direcao}.`
    : `Análise invalidada se o preço superar o topo anterior no ${perfil.alvoLabel}, confirmando perda de estrutura de ${direcao}.`;
  
  // =====================================================
  // RETURN - Objeto completo com todos os textos
  // =====================================================
  return {
    title,
    subtitle,
    summary: lines.join('\n\n'),
    lines,
    invalidation
  };
}

function calculateEntryZone(price: number, signalTF: TimeframeAnalysis | null, direction: string): { start: number; end: number } {
  if (!signalTF) return { start: price * 0.99, end: price * 1.01 };
  
  // Zona de entrada mais conservadora - exigir melhor preço
  if (direction === 'bullish') {
    return {
      start: signalTF.fib618 || price * 0.96,  // Mais desconto
      end: signalTF.fib500 || price * 0.985     // Mais desconto
    };
  } else {
    return {
      start: signalTF.fib382 || price * 1.015,
      end: signalTF.fib500 || price * 1.04
    };
  }
}

function calculateStopLoss(price: number, signalTF: TimeframeAnalysis | null, perfil: TradingProfile, direction: string): number {
  // Stop loss mais conservador - usar estrutura + margem de segurança
  const safetyMargin = 0.002; // 0.2% adicional de margem
  
  if (direction === 'bullish') {
    // Para compras: stop abaixo do swing low com margem
    const swingLow = signalTF?.swingLow;
    if (swingLow) {
      // Verificar se o stop não é muito distante (máx 5%)
      const calculatedStop = swingLow * (1 - safetyMargin);
      const maxStop = price * (1 - 0.05);
      return Math.max(calculatedStop, maxStop);
    }
    return price * (1 - perfil.stopPercent);
  } else {
    // Para vendas: stop acima do swing high com margem
    const swingHigh = signalTF?.swingHigh;
    if (swingHigh) {
      // Verificar se o stop não é muito distante (máx 5%)
      const calculatedStop = swingHigh * (1 + safetyMargin);
      const maxStop = price * (1 + 0.05);
      return Math.min(calculatedStop, maxStop);
    }
    return price * (1 + perfil.stopPercent);
  }
}

function calculateTargets(price: number, stopLoss: number, extensions: number[], direction: string): number[] {
  const risk = Math.abs(price - stopLoss);
  // Targets com R:R mínimo de 1.5
  return extensions.map(ext => 
    direction === 'bullish' ? price + risk * ext : price - risk * ext
  );
}

function getRsiStatus(rsiValue: number): string {
  if (rsiValue >= 70) return 'sobrecompra';
  if (rsiValue <= 30) return 'sobrevenda';
  if (rsiValue >= 60) return 'força compradora';
  if (rsiValue <= 40) return 'força vendedora';
  return 'neutro';
}

// Função reservada para uso futuro
function _getNextFibLevel(analysis: TimeframeAnalysis, _isBullish: boolean): { key: string; value: number } {
  const price = analysis.currentPrice;
  const levels = [
    { key: '0,382', value: analysis.fib382 },
    { key: '0,5', value: analysis.fib500 },
    { key: '0,618', value: analysis.fib618 },
    { key: '0,786', value: analysis.fib786 }
  ].filter(l => l.value);
  
  if (_isBullish) {
    const below = levels.filter(l => l.value < price).sort((a, b) => b.value - a.value);
    return below[0] || { key: '0,618', value: analysis.fib618 || price * 0.95 };
  } else {
    const above = levels.filter(l => l.value > price).sort((a, b) => a.value - b.value);
    return above[0] || { key: '0,382', value: analysis.fib382 || price * 1.05 };
  }
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = prices[prices.length - i] - prices[prices.length - i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}
