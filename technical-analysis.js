/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║         SHDWXBT - Technical Analysis (Institutional MTF)                      ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Copyright (c) 2024-2026 SHDWXBT. All rights reserved.                        ║
 * ║                                                                               ║
 * ║  PROPRIETARY AND CONFIDENTIAL                                                 ║
 * ║  This file contains trade secrets and proprietary information.                ║
 * ║  Unauthorized copying, modification, distribution, or use is prohibited.      ║
 * ║  Protected by intellectual property laws and international treaties.          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Multi-timeframe routing (escalping / day trading / swing / posição)
 * Estrutura (fundos e topos): fundo ascendente, topo ascendente, etc.
 */

const TechnicalAnalysis = {
  // ========================================
  // TIMEFRAMES
  // ========================================
  timeframes: {
    '1': { label: '1 minuto', minutes: 1 },
    '3': { label: '3 minutos', minutes: 3 },
    '5': { label: '5 minutos', minutes: 5 },
    '15': { label: '15 minutos', minutes: 15 },
    '30': { label: '30 minutos', minutes: 30 },
    '60': { label: '1 hora', minutes: 60 },
    '120': { label: '2 horas', minutes: 120 },
    '240': { label: '4 horas', minutes: 240 },
    '360': { label: '6 horas', minutes: 360 },
    '720': { label: '12 horas', minutes: 720 },
    'D': { label: 'Diário', minutes: 1440 },
    'W': { label: 'Semanal', minutes: 10080 },
    'M': { label: 'Mensal', minutes: 43200 }
  },

  formatTimeframe(tf) {
    return (this.timeframes[tf] && this.timeframes[tf].label) ? this.timeframes[tf].label : String(tf);
  },

  // ========================================
  // HELPERS
  // ========================================
  clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  },

  round(n, decimals = 2) {
    const p = Math.pow(10, decimals);
    return Math.round((Number(n) || 0) * p) / p;
  },

  // ========================================
  // INDICATORS
  // ========================================
  sma(data, period) {
    const out = [];
    if (!data || data.length < period) return out;
    for (let i = period - 1; i < data.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += data[i - j];
      out.push(sum / period);
    }
    return out;
  },

  ema(data, period) {
    const out = [];
    if (!data || data.length < period) return out;
    const k = 2 / (period + 1);

    let sum = 0;
    for (let i = 0; i < period; i++) sum += data[i];
    let prev = sum / period;
    out.push(prev);

    for (let i = period; i < data.length; i++) {
      prev = (data[i] - prev) * k + prev;
      out.push(prev);
    }
    return out;
  },

  rsi(closes, period = 14) {
    if (!closes || closes.length < period + 2) return [];

    const changes = [];
    for (let i = 1; i < closes.length; i++) changes.push(closes[i] - closes[i - 1]);

    const gains = changes.map(c => (c > 0 ? c : 0));
    const losses = changes.map(c => (c < 0 ? Math.abs(c) : 0));

    const avgG = this.ema(gains, period);
    const avgL = this.ema(losses, period);

    const out = [];
    for (let i = 0; i < Math.min(avgG.length, avgL.length); i++) {
      if (avgL[i] === 0) out.push(100);
      else {
        const rs = avgG[i] / avgL[i];
        out.push(100 - (100 / (1 + rs)));
      }
    }
    return out;
  },

  getForceIndexStatus(rsiValue) {
    if (rsiValue >= 70) return { status: 'sobrecompra' };
    if (rsiValue <= 30) return { status: 'sobrevenda' };
    if (rsiValue >= 60) return { status: 'força compradora' };
    if (rsiValue <= 40) return { status: 'força vendedora' };
    return { status: 'neutro' };
  },

  atr(klines, period = 14) {
    if (!klines || klines.length < period + 2) return 0;

    const trs = [];
    for (let i = 1; i < klines.length; i++) {
      const high = klines[i].high;
      const low = klines[i].low;
      const prevClose = klines[i - 1].close;
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trs.push(tr);
    }

    const atrSeries = this.ema(trs, period);
    return atrSeries.length ? atrSeries[atrSeries.length - 1] : 0;
  },

  // ========================================
  // FIBONACCI
  // ========================================
  fibonacci(high, low, isUptrend = true) {
    const diff = high - low;
    const level = (p) => (isUptrend ? high - diff * p : low + diff * p);

    return {
      0.0: isUptrend ? high : low,
      0.236: level(0.236),
      0.382: level(0.382),
      0.5: level(0.5),
      0.618: level(0.618),
      0.786: level(0.786),
      1.0: isUptrend ? low : high
    };
  },

  // ========================================
  // CORE ANALYSIS PER TIMEFRAME
  // ========================================
  analyzeTimeframe(klines, tfCode) {
    if (!klines || klines.length < 60) return null;

    const closes = klines.map(k => k.close);
    const highs = klines.map(k => k.high);
    const lows = klines.map(k => k.low);
    const volumes = klines.map(k => Number(k.volume || 0));

    const currentPrice = closes[closes.length - 1];

    const ema12Series = this.ema(closes, 12);
    const ema26Series = this.ema(closes, 26);
    const ema200Series = this.ema(closes, 200);

    const ema12 = ema12Series.length ? ema12Series[ema12Series.length - 1] : currentPrice;
    const ema26 = ema26Series.length ? ema26Series[ema26Series.length - 1] : currentPrice;
    const ema200 = ema200Series.length ? ema200Series[ema200Series.length - 1] : currentPrice;

    const rsiSeries = this.rsi(closes, 14);
    const rsiValue = rsiSeries.length ? rsiSeries[rsiSeries.length - 1] : 50;

    const atrValue = this.atr(klines, 14);

    // Recent swing window
    const lookback = Math.min(120, klines.length);
    const recentHigh = Math.max(...highs.slice(-lookback));
    const recentLow = Math.min(...lows.slice(-lookback));

    const bullishByAverages = currentPrice >= ema200 && ema12 >= ema26;
    const bearishByAverages = currentPrice <= ema200 && ema12 <= ema26;
    const trend = bullishByAverages ? 'bullish' : (bearishByAverages ? 'bearish' : 'neutral');

    const isUptrend = trend === 'bullish';
    const fib = this.fibonacci(recentHigh, recentLow, isUptrend);

    // Pullback depth vs last swing
    const range = Math.max(1e-9, Math.abs(recentHigh - recentLow));
    const pullbackPctFromHigh = isUptrend ? ((recentHigh - currentPrice) / range) : ((currentPrice - recentLow) / range);

    // Volume slope (simple)
    const volWindow = volumes.slice(-40);
    const priceWindow = closes.slice(-40);
    const volSlope = this.simpleSlope(volWindow);
    const priceSlope = this.simpleSlope(priceWindow);

    return {
      timeframe: tfCode,
      timeframeLabel: this.formatTimeframe(tfCode),
      currentPrice,
      ema12,
      ema26,
      ema200,
      rsi: rsiValue,
      rsiStatus: this.getForceIndexStatus(rsiValue),
      atr: atrValue,
      recentHigh,
      recentLow,
      fib,
      trend,
      pullbackDepth: this.clamp(pullbackPctFromHigh, 0, 1),
      volumeSlope: volSlope,
      priceSlope: priceSlope
    };
  },

  simpleSlope(values) {
    // Very small linear regression slope estimate (normalized)
    if (!values || values.length < 5) return 0;
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      const x = i;
      const y = Number(values[i]) || 0;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }
    const denom = (n * sumXX - sumX * sumX);
    if (denom === 0) return 0;
    const slope = (n * sumXY - sumX * sumY) / denom;
    // normalize by average magnitude
    const avg = Math.max(1e-9, Math.abs(sumY / n));
    return slope / avg;
  },

  // ========================================
  // ROUTE EVALUATION (MULTI-TIMEFRAME)
  // ========================================
  analyzeRoutes(klinesByTf, symbol, routes) {
    if (!klinesByTf || typeof klinesByTf !== 'object') return [];
    const routeList = Array.isArray(routes) ? routes : [];

    // 1) Build per-timeframe analysis cache
    const analyses = {};
    for (const [tf, klines] of Object.entries(klinesByTf)) {
      if (Array.isArray(klines) && klines.length >= 60) {
        try {
          analyses[tf] = this.analyzeTimeframe(klines, tf);
        } catch (e) {
          // ignore timeframe errors
        }
      }
    }

    // 2) Evaluate routes
    const reports = [];
    for (const route of routeList) {
      try {
        const rep = this.evaluateRoute(symbol, analyses, route);
        if (rep) reports.push(rep);
      } catch (e) {
        // ignore route errors
      }
    }

    // 3) Sort by score
    reports.sort((a, b) => (b?.confluence?.score || 0) - (a?.confluence?.score || 0));
    return reports;
  },

  evaluateRoute(symbol, analyses, route) {
    const target = analyses[route.target];
    const signal = analyses[route.signal];
    const trigger = route.trigger ? analyses[route.trigger] : null;
    const anchor = route.anchor ? analyses[route.anchor] : null;

    if (!target || !signal) return null;

    // Direction comes from target timeframe (anchor can tighten)
    let direction = target.trend;
    if (anchor && anchor.trend !== 'neutral' && anchor.trend !== direction && direction !== 'neutral') {
      // conflict penalty, but keep direction from target
    }

    if (direction === 'neutral') return null;

    const bullish = direction === 'bullish';

    // Identify setup
    const setup = this.identifySetup(target, signal, bullish);

    // Confluence engine
    const conf = this.buildConfluence(target, signal, trigger, anchor, bullish, route, setup);

    // Mandatory checks (modelos inteligentes)
    const mandatory = this.checkMandatoryConfluences({ target, signal, trigger, anchor, bullish, route, setup, flags: conf.flags || {} });

    // Invalidation
    const invalidation = this.buildInvalidation(target, signal, bullish);

    // Standard text
    const text = this.buildStandardText(symbol, setup, bullish, route, target, signal, invalidation);

    // Fibonacci for "Dados técnicos" (use target)
    const fib = {
      0.382: target.fib[0.382],
      0.5: target.fib[0.5],
      0.618: target.fib[0.618]
    };

    // Decision (compatível com o restante do sistema)
    const decision = (conf.score >= route.minScore && mandatory.pass)
      ? 'opportunity'
      : (conf.score >= route.watchScore ? 'watchlist' : 'ignore');

    return {
      symbol,
      routeId: route.id,
      routeLabel: route.label,
      trend: bullish ? 'bullish' : 'bearish',
      setup,
      timeframe: {
        trigger: route.trigger ? this.formatTimeframe(route.trigger) : null,
        signal: this.formatTimeframe(route.signal),
        target: this.formatTimeframe(route.target),
        anchor: route.anchor ? this.formatTimeframe(route.anchor) : null
      },
      currentPrice: signal.currentPrice,
      indicators: {
        // Compatibilidade com o front-end legado
        ema12: this.round(signal.ema12, 6),
        ema26: this.round(signal.ema26, 6),
        ema200: this.round(signal.ema200, 6),
        rsi: this.round(signal.rsi, 2),
        rsiStatus: signal.rsiStatus,
        atr: this.round(signal.atr, 6),

        // Campos descritivos (sem siglas)
        mediaMovelExponencial12: this.round(signal.ema12, 6),
        mediaMovelExponencial26: this.round(signal.ema26, 6),
        mediaMovelExponencial200: this.round(signal.ema200, 6),
        indiceDeForcaRelativa: this.round(signal.rsi, 2),
        statusIndiceDeForcaRelativa: signal.rsiStatus,
        amplitudeMediaReal: this.round(signal.atr, 6)
      },
      fibonacci: fib,
      confluence: conf,
      mandatory,
      invalidation,
      text,
      debug: {
        targetTrend: target.trend,
        signalTrend: signal.trend,
        triggerTrend: trigger ? trigger.trend : null,
        anchorTrend: anchor ? anchor.trend : null,
        pullbackDepth: this.round(target.pullbackDepth, 3)
      },
      decision
    };
  },

  // ========================================
  // MANDATORY CONFLUENCE GATES (INTELIGENTE)
  // ========================================
  checkMandatoryConfluences({ target, signal, trigger, anchor, bullish, route, setup, flags }) {
    const req = route?.required || {};
    const passed = [];
    const failed = [];

    const need = (enabled, condition, okText, failText) => {
      if (!enabled) return;
      if (condition) passed.push(okText);
      else failed.push(failText);
    };

    // 1) Alinhamento estrutural entre tempo gráfico alvo e tempo gráfico de sinal
    need(
      !!req.requireSignalAlignment,
      !flags.signalConflict,
      `Tempo gráfico de sinal sem conflito com o tempo gráfico alvo`,
      `Conflito estrutural entre o tempo gráfico de sinal e o tempo gráfico alvo`
    );

    // 2) Proximidade em retração de Fibonacci (zona)
    need(
      !!req.requireFibProximity,
      !!flags.nearFib,
      `Preço dentro ou próximo das zonas de retração de Fibonacci`,
      `Preço fora das zonas de retração de Fibonacci`
    );

    // 3) Regra de filtro pela média móvel exponencial de 200 períodos no tempo gráfico de sinal
    need(
      !!req.requireEma200Alignment,
      !!flags.ema200Aligned,
      `Preço respeitando a média móvel exponencial de 200 períodos no tempo gráfico de sinal`,
      `Preço contra a média móvel exponencial de 200 períodos no tempo gráfico de sinal`
    );

    // 4) Gatilho (tempo gráfico menor) presente
    need(
      !!req.requireTriggerData,
      !!trigger,
      `Dados do tempo gráfico de gatilho disponíveis`,
      `Sem dados do tempo gráfico de gatilho`
    );

    // 5) Gatilho sem conflito com a direção
    need(
      !!req.requireTriggerAlignment,
      !flags.triggerConflict,
      `Tempo gráfico de gatilho sem conflito com a direção`,
      `Conflito no tempo gráfico de gatilho`
    );

    // 6) Reação técnica no gatilho (proximidade das médias móveis exponenciais)
    need(
      !!req.requireTriggerReaction,
      !!flags.triggerNearAverages,
      `Reação técnica no tempo gráfico de gatilho (médias móveis exponenciais)`,
      `Sem reação técnica no tempo gráfico de gatilho`
    );

    // 7) Profundidade da correção coerente quando o setup for de correção
    const isCorrectionSetup = (setup === 'fundo ascendente' || setup === 'topo descendente');
    const depthOk = !isCorrectionSetup || (target.pullbackDepth >= 0.20 && target.pullbackDepth <= 0.80);
    need(
      !!req.requirePullbackDepth,
      depthOk,
      `Profundidade da correção coerente para o setup`,
      `Profundidade da correção fora do padrão esperado para o setup`
    );

    return {
      pass: failed.length === 0,
      passed,
      failed
    };
  },

  identifySetup(target, signal, bullish) {
    // Heuristics based on pullback depth and position vs Fibonacci and averages
    const price = signal.currentPrice;
    const fib0382 = target.fib[0.382];
    const fib0500 = target.fib[0.5];
    const fib0618 = target.fib[0.618];

    const inRetracementZoneBull = price <= Math.max(fib0382, fib0618) && price >= Math.min(fib0382, fib0618);
    const inRetracementZoneBear = price >= Math.min(fib0382, fib0618) && price <= Math.max(fib0382, fib0618);

    // Depth filter
    const depth = target.pullbackDepth;

    if (bullish) {
      if (inRetracementZoneBull && depth >= 0.25 && depth <= 0.75) return 'fundo ascendente';
      // if price is pressing highs, call it topo ascendente
      const nearHigh = Math.abs(target.recentHigh - price) / Math.max(1e-9, target.atr || (price * 0.01)) < 1.2;
      if (nearHigh) return 'topo ascendente';
      // default
      return 'fundo ascendente';
    }

    // bearish
    if (inRetracementZoneBear && depth >= 0.25 && depth <= 0.75) return 'topo descendente';
    const nearLow = Math.abs(price - target.recentLow) / Math.max(1e-9, target.atr || (price * 0.01)) < 1.2;
    if (nearLow) return 'fundo descendente';
    return 'topo descendente';
  },

  buildConfluence(target, signal, trigger, anchor, bullish, route, setup) {
    const positive = [];
    const negative = [];

    let score = 50;

    const flags = {
      nearFib: false,
      signalConflict: false,
      ema200Aligned: false,
      triggerConflict: false,
      triggerNearAverages: false
    };

    // 1) Anchor alignment (optional)
    if (anchor) {
      if (anchor.trend === 'neutral') {
        // do nothing
      } else if (anchor.trend === target.trend) {
        positive.push(`Estrutura no ${anchor.timeframeLabel} alinhada com o tempo gráfico alvo`);
        score += 6;
      } else {
        negative.push(`Estrutura no ${anchor.timeframeLabel} em conflito com o tempo gráfico alvo`);
        score -= 10;
      }
    }

    // 1b) Alinhamento entre tempo gráfico de sinal e tempo gráfico alvo (confluência extra)
    if (signal && signal.trend !== 'neutral') {
      if (signal.trend === target.trend) {
        positive.push(`Estrutura no ${signal.timeframeLabel} alinhada com o tempo gráfico alvo`);
        score += 6;
      } else {
        flags.signalConflict = true;
        negative.push(`Estrutura no ${signal.timeframeLabel} em conflito com o tempo gráfico alvo`);
        score -= 8;
      }
    }

    // 2) Signal vs moving averages
    const price = signal.currentPrice;
    const dist12 = Math.abs(price - signal.ema12) / Math.max(1e-9, price) * 100;
    const dist26 = Math.abs(price - signal.ema26) / Math.max(1e-9, price) * 100;

    const near12 = dist12 <= 0.6;
    const near26 = dist26 <= 0.8;

    if (bullish) {
      if (price >= signal.ema200) {
        flags.ema200Aligned = true;
        positive.push(`Preço acima da média móvel exponencial de 200 períodos no ${signal.timeframeLabel}`);
        score += 8;
      } else {
        negative.push(`Preço abaixo da média móvel exponencial de 200 períodos no ${signal.timeframeLabel}`);
        score -= 10;
      }

      if (near12) { positive.push(`Reação favorável na média móvel exponencial de 12 períodos no ${signal.timeframeLabel}`); score += 7; }
      if (near26) { positive.push(`Reação favorável na média móvel exponencial de 26 períodos no ${signal.timeframeLabel}`); score += 6; }
      if (!near12 && !near26) { negative.push(`Preço distante das médias móveis exponenciais de 12 e 26 períodos no ${signal.timeframeLabel}`); score -= 5; }
    } else {
      if (price <= signal.ema200) {
        flags.ema200Aligned = true;
        positive.push(`Preço abaixo da média móvel exponencial de 200 períodos no ${signal.timeframeLabel}`);
        score += 8;
      } else {
        negative.push(`Preço acima da média móvel exponencial de 200 períodos no ${signal.timeframeLabel}`);
        score -= 10;
      }

      if (near12) { positive.push(`Reação favorável na média móvel exponencial de 12 períodos no ${signal.timeframeLabel}`); score += 7; }
      if (near26) { positive.push(`Reação favorável na média móvel exponencial de 26 períodos no ${signal.timeframeLabel}`); score += 6; }
      if (!near12 && !near26) { negative.push(`Preço distante das médias móveis exponenciais de 12 e 26 períodos no ${signal.timeframeLabel}`); score -= 5; }
    }

    // 3) Fibonacci proximity (target)
    const fib0382 = target.fib[0.382];
    const fib0500 = target.fib[0.5];
    const fib0618 = target.fib[0.618];

    const fibDist = (lvl) => Math.abs(price - lvl) / Math.max(1e-9, price) * 100;
    const d382 = fibDist(fib0382);
    const d500 = fibDist(fib0500);
    const d618 = fibDist(fib0618);

    const nearFib = Math.min(d382, d500, d618) <= route.fibProximityPct;
    flags.nearFib = nearFib;

    if (nearFib) {
      positive.push(`Preço próximo aos níveis de retração de Fibonacci no ${target.timeframeLabel}`);
      score += 12;
    } else {
      negative.push('Preço distante das zonas de retração de Fibonacci');
      score -= 10;
    }

    // 4) Índice de força relativa no tempo gráfico de sinal
    const rsi = signal.rsi;
    const rsiStatus = signal.rsiStatus.status;

    if (bullish) {
      if (rsi <= 35) { positive.push(`Índice de força relativa no ${signal.timeframeLabel} em sobrevenda ou próximo de sobrevenda`); score += 10; }
      else if (rsi <= 55) { positive.push(`Índice de força relativa no ${signal.timeframeLabel} em normalização`); score += 4; }
      else if (rsi >= 70) { negative.push(`Índice de força relativa no ${signal.timeframeLabel} em sobrecompra`); score -= 10; }
    } else {
      if (rsi >= 65) { positive.push(`Índice de força relativa no ${signal.timeframeLabel} em sobrecompra ou próximo de sobrecompra`); score += 10; }
      else if (rsi >= 45) { positive.push(`Índice de força relativa no ${signal.timeframeLabel} em normalização`); score += 4; }
      else if (rsi <= 30) { negative.push(`Índice de força relativa no ${signal.timeframeLabel} em sobrevenda`); score -= 10; }
    }

    // 5) Volume behavior on target timeframe
    const volSlope = target.volumeSlope;
    const priceSlope = target.priceSlope;

    // Correction logic: if volume decreases while price moves countertrend
    if (bullish) {
      const counterMove = priceSlope < 0;
      if (counterMove && volSlope < 0) {
        positive.push(`Volume decrescente durante a correção no ${target.timeframeLabel}`);
        score += 8;
      } else if (counterMove && volSlope > 0) {
        negative.push(`Volume crescente durante a correção no ${target.timeframeLabel}`);
        score -= 7;
      }
    } else {
      const counterMove = priceSlope > 0;
      if (counterMove && volSlope < 0) {
        positive.push(`Volume decrescente durante a correção no ${target.timeframeLabel}`);
        score += 8;
      } else if (counterMove && volSlope > 0) {
        negative.push(`Volume crescente durante a correção no ${target.timeframeLabel}`);
        score -= 7;
      }
    }

    // 6) Premium/Discount (extra confluence)
    const discount = price <= target.fib[0.5];
    const premium = price >= target.fib[0.5];
    if (bullish && discount) {
      positive.push(`Preço em zona de desconto (abaixo do nível de equilíbrio de Fibonacci) no ${target.timeframeLabel}`);
      score += 4;
    }
    if (!bullish && premium) {
      positive.push(`Preço em zona de prêmio (acima do nível de equilíbrio de Fibonacci) no ${target.timeframeLabel}`);
      score += 4;
    }

    // 7) Gatilho (tempo gráfico menor) como refinamento
    if (trigger) {
      if (trigger.trend !== 'neutral' && trigger.trend !== target.trend) {
        flags.triggerConflict = true;
        negative.push(`Tempo gráfico de gatilho (${trigger.timeframeLabel}) em conflito com a direção`);
        score -= 6;
      } else {
        positive.push(`Tempo gráfico de gatilho (${trigger.timeframeLabel}) sem conflito com a direção`);
        score += 3;
      }

      const tPrice = trigger.currentPrice;
      const tDist12 = Math.abs(tPrice - trigger.ema12) / Math.max(1e-9, tPrice) * 100;
      const tDist26 = Math.abs(tPrice - trigger.ema26) / Math.max(1e-9, tPrice) * 100;
      const tNear12 = tDist12 <= 0.6;
      const tNear26 = tDist26 <= 0.8;
      flags.triggerNearAverages = tNear12 || tNear26;

      if (flags.triggerNearAverages) {
        positive.push(`Reação técnica no tempo gráfico de gatilho (${trigger.timeframeLabel}) nas médias móveis exponenciais`);
        score += 6;
      } else {
        negative.push(`Preço distante das médias móveis exponenciais no tempo gráfico de gatilho (${trigger.timeframeLabel})`);
        score -= 4;
      }
    }

    // Normalize
    score = this.clamp(Math.round(score), 0, 100);

    // Provide factors in a structure the UI can consume
    return {
      score,
      positive,
      negative,
      factors: [...positive.map(t => ({ type: 'positive', text: t })), ...negative.map(t => ({ type: 'negative', text: t }))],
      flags
    };
  },

  // ========================================
  // TEXT HELPERS
  // ========================================
  pickNextFibLevel(target, price, bullish) {
    // Returns the "next" practical level for support/resistance based on current price.
    const levels = [
      { k: 0.382, v: target.fib[0.382] },
      { k: 0.5, v: target.fib[0.5] },
      { k: 0.618, v: target.fib[0.618] },
      { k: 0.786, v: target.fib[0.786] }
    ].filter(x => Number.isFinite(x.v));

    if (!levels.length) return { key: 0.5, value: target.fib[0.5] };

    if (bullish) {
      // choose the highest level that is <= price (support below)
      const sorted = levels.sort((a, b) => b.v - a.v);
      const found = sorted.find(l => l.v <= price) || sorted[sorted.length - 1];
      return { key: found.k, value: found.v };
    }

    // bearish: choose the lowest level that is >= price (resistance above)
    const sorted = levels.sort((a, b) => a.v - b.v);
    const found = sorted.find(l => l.v >= price) || sorted[sorted.length - 1];
    return { key: found.k, value: found.v };
  },

  buildInvalidation(target, signal, bullish) {
    // Tactical invalidation uses signal swings approximation: use ATR band around recent low/high
    const price = signal.currentPrice;
    const atr = Math.max(1e-9, signal.atr || (price * 0.01));

    const tactical = bullish ? (signal.recentLow - atr * 0.25) : (signal.recentHigh + atr * 0.25);
    const structural = bullish ? (target.recentLow - (target.atr || atr) * 0.25) : (target.recentHigh + (target.atr || atr) * 0.25);

    return {
      tactical: this.round(tactical, 4),
      structural: this.round(structural, 4)
    };
  },

  buildStandardText(symbol, setup, bullish, route, target, signal, invalidation) {
    const directionText = bullish ? 'alta' : 'baixa';
    const setupText = setup;

    const routeLabel = route?.label ? `${route.label} - ` : '';
    const title = `${symbol} - ${routeLabel}Tendência de ${directionText}: buscando ${setupText} no ${target.timeframeLabel}`;

    const context = [];

    // Line 1
    if (setup === 'fundo ascendente') {
      context.push(`${symbol} iniciou uma correção no tempo gráfico ${target.timeframeLabel} em busca do seu fundo ascendente.`);
    } else if (setup === 'topo ascendente') {
      context.push(`${symbol} está em movimento de continuidade no tempo gráfico ${target.timeframeLabel}, buscando topo ascendente.`);
    } else if (setup === 'topo descendente') {
      context.push(`${symbol} iniciou uma correção no tempo gráfico ${target.timeframeLabel} em busca do seu topo descendente.`);
    } else if (setup === 'fundo descendente') {
      context.push(`${symbol} está em movimento de continuidade no tempo gráfico ${target.timeframeLabel}, buscando fundo descendente.`);
    } else {
      context.push(`${symbol} está em reprecificação no tempo gráfico ${target.timeframeLabel} dentro da metodologia.`);
    }

    // Line 2 (supports/resistances + força relativa)
    const rsiInfo = signal?.rsiStatus?.status || 'neutro';
    if (bullish) {
      context.push(`Suportes importantes podem ser na média móvel exponencial de 12 períodos, na média móvel exponencial de 26 períodos e nas zonas de retração de Fibonacci, juntamente com o índice de força relativa do ${signal.timeframeLabel} em ${rsiInfo}.`);
    } else {
      context.push(`Resistências importantes podem ser na média móvel exponencial de 12 períodos, na média móvel exponencial de 26 períodos e nas zonas de retração de Fibonacci, juntamente com o índice de força relativa do ${signal.timeframeLabel} em ${rsiInfo}.`);
    }

    // Line 3 (Fibonacci next level)
    const nextFib = this.pickNextFibLevel(target, signal.currentPrice, bullish);
    const fibKey = String(nextFib.key).replace('.', ',');
    const fibVal = this.round(nextFib.value, 5);
    const fibLine = bullish
      ? `Retração de Fibonacci (${target.timeframeLabel}): próximo suporte é a retração de ${fibKey} em ${fibVal}.`
      : `Retração de Fibonacci (${target.timeframeLabel}): próxima resistência é a retração de ${fibKey} em ${fibVal}.`;
    context.push(fibLine);

    // Line 4 (EMA200)
    if (bullish) {
      context.push(`A média móvel exponencial de 200 períodos do ${signal.timeframeLabel}, juntamente com as médias móveis do ${target.timeframeLabel}, pode atuar como região de suporte.`);
    } else {
      context.push(`A média móvel exponencial de 200 períodos do ${signal.timeframeLabel}, juntamente com as médias móveis do ${target.timeframeLabel}, pode atuar como região de resistência.`);
    }

    const invalidationTitle = 'Invalidação';
    const invalidationText = `Essa análise técnica é invalidada se o preço atingir ${this.round(invalidation.tactical, 5)}.`;

    return {
      title,
      contextLines: context,
      invalidationTitle,
      invalidationText,
      // Extra fields for advanced view
      invalidationMultiTimeframe: {
        tactical: invalidation.tactical,
        structural: invalidation.structural,
        tacticalLabel: `Invalidação tática (${signal.timeframeLabel})`,
        structuralLabel: `Invalidação estrutural (${target.timeframeLabel})`
      },
      routeLabel: route.label
    };
  },

  // ========================================
  // BACKWARD COMPAT (single timeframe)
  // ========================================
  analyzeOpportunity(klines, symbol, timeframe = '60') {
    const tf = this.analyzeTimeframe(klines, timeframe);
    if (!tf) return null;

    const bullish = tf.trend === 'bullish';
    const setup = bullish ? 'fundo ascendente' : 'topo descendente';

    const conf = this.buildConfluence(
      tf,
      tf,
      null,
      null,
      bullish,
      { fibProximityPct: 2.0, label: 'Análise', required: {} },
      setup
    );

    const invalidation = this.buildInvalidation(tf, tf, bullish);

    const text = this.buildStandardText(symbol, setup, bullish, { id: 'single', label: 'Análise' }, tf, tf, invalidation);

    return {
      symbol,
      timestamp: Date.now(),
      currentPrice: tf.currentPrice,
      trend: bullish ? 'bullish' : 'bearish',
      trendLabel: bullish ? 'ALTA' : 'BAIXA',
      indicators: {
        ema12: tf.ema12,
        ema26: tf.ema26,
        ema200: tf.ema200,
        rsi: tf.rsi,
        rsiStatus: tf.rsiStatus
      },
      fibonacci: tf.fib,
      confluence: {
        score: conf.score,
        factors: conf.factors,
        positive: conf.positive,
        negative: conf.negative
      },
      invalidation: {
        price: invalidation.tactical,
        percentage: Math.abs((invalidation.tactical - tf.currentPrice) / Math.max(1e-9, tf.currentPrice) * 100)
      },
      marketStructure: {
        setup
      },
      timeframe: {
        signal: this.formatTimeframe(timeframe),
        target: this.formatTimeframe(timeframe)
      },
      text
    };
  }
};

// Expose globally
if (typeof window !== 'undefined') {
  window.TechnicalAnalysis = TechnicalAnalysis;
}
