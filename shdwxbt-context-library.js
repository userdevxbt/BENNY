/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                  SHDWXBT — Context Library v1.0                               ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Copyright (c) 2024-2026 SHDWXBT. All rights reserved.                        ║
 * ║                                                                               ║
 * ║  PROPRIETARY AND CONFIDENTIAL                                                 ║
 * ║  This file contains trade secrets and proprietary information.                ║
 * ║  Unauthorized copying, modification, distribution, or use is prohibited.      ║
 * ║  Protected by intellectual property laws and international treaties.          ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
(function (global) {
  'use strict';

  // =====================================================================
  // CONFIGURAÇÕES
  // =====================================================================
  
  const TF_LABELS = {
    '1m': '1 minuto', '3m': '3 minutos', '5m': '5 minutos', 
    '15m': '15 minutos', '30m': '30 minutos',
    '1h': '1 hora', '2h': '2 horas', '4h': '4 horas',
    '6h': '6 horas', '12h': '12 horas',
    '1d': 'Diário', 'D': 'Diário',
    '1w': 'Semanal', 'W': 'Semanal',
    '1M': 'Mensal', 'M': 'Mensal'
  };

  const SETUPS = {
    'fundo ascendente': { tipo: 'correcao', direcaoPadrao: 'alta', label: 'Fundo Ascendente' },
    'topo descendente': { tipo: 'correcao', direcaoPadrao: 'baixa', label: 'Topo Descendente' },
    'topo ascendente': { tipo: 'continuidade', direcaoPadrao: 'alta', label: 'Topo Ascendente' },
    'fundo descendente': { tipo: 'continuidade', direcaoPadrao: 'baixa', label: 'Fundo Descendente' }
  };

  const PERFIS = {
    'scalping': {
      label: 'Scalping',
      gatilho: '5m', sinal: '15m', alvo: '1h', ancora: '4h'
    },
    'scalping_5_15': {
      label: 'Scalping 5/15',
      gatilho: '5m', sinal: '15m', alvo: '1h', ancora: '4h'
    },
    'day_trading': {
      label: 'Day Trading',
      gatilho: '15m', sinal: '1h', alvo: '4h', ancora: '1d'
    },
    'swing_trade': {
      label: 'Swing Trade',
      gatilho: '4h', sinal: '1d', alvo: '1w', ancora: '1M'
    }
  };

  // =====================================================================
  // UTILITÁRIOS
  // =====================================================================
  
  function isNum(x) {
    return typeof x === 'number' && Number.isFinite(x);
  }

  function formatNumber(n, decimals = 2) {
    if (!isNum(n)) return '—';
    if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n >= 1) return n.toFixed(decimals);
    if (n >= 0.01) return n.toFixed(4);
    return n.toFixed(6);
  }

  function getTFLabel(tf) {
    return TF_LABELS[tf] || tf;
  }

  function normalizeSetup(setup) {
    const s = String(setup || '').trim().toLowerCase();
    if (SETUPS[s]) return s;
    // Tentar mapear de inglês
    if (s.includes('higher low') || s.includes('hl')) return 'fundo ascendente';
    if (s.includes('lower high') || s.includes('lh')) return 'topo descendente';
    if (s.includes('higher high') || s.includes('hh')) return 'topo ascendente';
    if (s.includes('lower low') || s.includes('ll')) return 'fundo descendente';
    return 'fundo ascendente';
  }

  function normalizePerfil(perfil) {
    const p = String(perfil || '').trim().toLowerCase().replace(/\s+/g, '_');
    if (PERFIS[p]) return p;
    if (p.includes('scalp')) return 'scalping';
    if (p.includes('5/15')) return 'scalping_5_15';
    if (p.includes('day')) return 'day_trading';
    if (p.includes('swing')) return 'swing_trade';
    return 'day_trading';
  }

  function getRSIStatus(rsi) {
    if (!isNum(rsi)) return { status: 'neutro', label: 'Neutro' };
    if (rsi >= 70) return { status: 'sobrecompra', label: 'Sobrecompra' };
    if (rsi <= 30) return { status: 'sobrevenda', label: 'Sobrevenda' };
    if (rsi >= 55) return { status: 'forca_compradora', label: 'Força compradora' };
    if (rsi <= 45) return { status: 'forca_vendedora', label: 'Força vendedora' };
    return { status: 'neutro', label: 'Neutro' };
  }

  /**
   * Calcula targets (TP1, TP2, TP3) baseado no perfil de trading e direção
   * @param {number} entryPrice - Preço de entrada
   * @param {number} invalidationPrice - Preço de invalidação (stop loss)
   * @param {string} direction - Direção: 'bullish' ou 'bearish'
   * @param {string} tradingProfile - Perfil: 'Scalping', 'Day Trading', 'Swing Trade'
   * @returns {Array} Array com 3 objetos {price, percentage, label}
   */
  function calculateTargets(entryPrice, invalidationPrice, direction, tradingProfile) {
    if (!isNum(entryPrice) || !isNum(invalidationPrice)) {
      return [
        { price: null, percentage: null, label: 'TP1: —' },
        { price: null, percentage: null, label: 'TP2: —' },
        { price: null, percentage: null, label: 'TP3: —' }
      ];
    }

    const isBullish = direction === 'bullish';
    const range = Math.abs(entryPrice - invalidationPrice);
    
    // Definir extensões Fibonacci baseado no perfil
    let extensions;
    if (tradingProfile === 'Scalping' || tradingProfile === 'Scalping 5/15') {
      extensions = [1.1, 1.272, 1.414]; // Alvos mais curtos: ~10%, ~27%, ~41%
    } else if (tradingProfile === 'Day Trading') {
      extensions = [1.272, 1.414, 1.618]; // Alvos intermediários: ~27%, ~41%, ~62%
    } else {
      extensions = [1.272, 1.618, 2.0]; // Alvos padrão swing: ~27%, ~62%, ~100%
    }

    const targets = extensions.map((ext, index) => {
      let targetPrice;
      if (isBullish) {
        targetPrice = entryPrice + (range * ext);
      } else {
        targetPrice = entryPrice - (range * ext);
      }
      
      const percentage = ((Math.abs(targetPrice - entryPrice) / entryPrice) * 100).toFixed(2);
      const label = `TP${index + 1}: ${formatNumber(targetPrice)} (${percentage}%)`;
      
      return {
        price: targetPrice,
        percentage: parseFloat(percentage),
        label: label
      };
    });

    return targets;
  }

  // =====================================================================
  // BUILDER DE TÍTULO
  // =====================================================================
  
  function buildTitle(input) {
    const symbol = input.symbol || 'ATIVO';
    const setup = normalizeSetup(input.setup);
    const setupConfig = SETUPS[setup];
    const direcao = input.direcao === 'baixa' || input.direction === 'bearish' ? 'baixa' : 'alta';
    const perfil = normalizePerfil(input.perfil || input.trading_profile);
    const perfilConfig = PERFIS[perfil];
    const tempoAlvo = getTFLabel(input.tempoGraficoAlvo || input.target_timeframe || perfilConfig.alvo);
    
    return `${symbol} — ${perfilConfig.label} — Tendência de ${direcao}: buscando ${setup} no tempo gráfico ${tempoAlvo}`;
  }

  // =====================================================================
  // BUILDER DE CONTEXTO (Formato Visual - Múltiplas Linhas)
  // =====================================================================
  
  function buildContextLines(input) {
    const symbol = input.symbol || 'ATIVO';
    const setup = normalizeSetup(input.setup);
    const setupConfig = SETUPS[setup];
    const direcao = input.direcao === 'baixa' || input.direction === 'bearish' ? 'baixa' : 'alta';
    const perfil = normalizePerfil(input.perfil || input.trading_profile);
    const perfilConfig = PERFIS[perfil];
    
    // Timeframes
    const tfAlvo = getTFLabel(input.tempoGraficoAlvo || input.target_timeframe || perfilConfig.alvo);
    const tfSinal = getTFLabel(input.tempoGraficoSinal || input.signal_timeframe || perfilConfig.sinal);
    const tfAncora = getTFLabel(input.tempoGraficoAncora || input.anchor_timeframe || perfilConfig.ancora);
    
    // Fibonacci
    const fib = input.fibonacci || {};
    const fib382 = fib['0.382'] || fib.fib_0382;
    const fib500 = fib['0.5'] || fib.fib_050;
    const fib618 = fib['0.618'] || fib.fib_0618;
    const fib786 = fib['0.786'] || fib.fib_0786;
    
    // Indicadores
    const rsi = input.rsi || input.rsi_value;
    const rsiStatus = getRSIStatus(rsi);
    const ema200 = input.ema_200;
    const currentPrice = input.current_price || input.entry_price;
    
    // Zona Premium/Discount
    const fibZone = input.fib_zone || input.premium_discount || 'equilibrium';
    const fibZonePct = input.fib_zone_pct || 50;
    
    const lines = [];
    
    // Linha 1: Setup identificado (destaque)
    lines.push({
      type: 'highlight',
      text: `${perfilConfig.label} - Configuração de ${setupConfig.label} identificada.`
    });
    
    // Linha 2: Tendência âncora
    const anchorTrend = input.anchor_trend || (direcao === 'alta' ? 'bullish' : 'bearish');
    const anchorLabel = anchorTrend === 'bullish' ? 'alta' : anchorTrend === 'bearish' ? 'baixa' : 'indefinida';
    lines.push({
      type: 'normal',
      text: `Tendência no tempo gráfico âncora (${tfAncora}): ${anchorLabel}.`
    });
    
    // Linha 3: Correção/Continuidade no tempo alvo
    if (setupConfig.tipo === 'correcao') {
      lines.push({
        type: 'normal',
        text: `O tempo gráfico ${tfAlvo} está em correção, buscando formar ${setup}.`
      });
    } else {
      lines.push({
        type: 'normal',
        text: `O tempo gráfico ${tfAlvo} está em continuidade, buscando formar ${setup}.`
      });
    }
    
    // Linha 4: Fibonacci Zone (com cor)
    if (fibZone === 'discount' || fibZone === 'desconto') {
      lines.push({
        type: 'positive',
        text: `Preço atual na zona de desconto (favorável para compra) da retração de Fibonacci.`
      });
    } else if (fibZone === 'premium' || fibZone === 'prêmio') {
      lines.push({
        type: 'negative',
        text: `Preço atual na zona de prêmio (favorável para venda) da retração de Fibonacci.`
      });
    } else if (fibZone === 'ote') {
      lines.push({
        type: 'positive',
        text: `Preço atual na zona de entrada ótima (OTE) entre 0.618 e 0.786 de Fibonacci.`
      });
    }
    
    // Linha 5: EMA 200
    if (isNum(ema200) && isNum(currentPrice)) {
      const acimaAbaixo = currentPrice > ema200 ? 'acima' : 'abaixo';
      lines.push({
        type: 'normal',
        text: `Preço ${acimaAbaixo} da média móvel exponencial de 200 períodos no ${tfSinal}.`
      });
    }
    
    // Linha 6: RSI
    if (rsiStatus.status !== 'neutro') {
      const rsiColor = rsiStatus.status === 'sobrevenda' || rsiStatus.status === 'forca_compradora' ? 'positive' : 
                       rsiStatus.status === 'sobrecompra' || rsiStatus.status === 'forca_vendedora' ? 'negative' : 'normal';
      lines.push({
        type: rsiColor,
        text: `Índice de força relativa (14): ${isNum(rsi) ? rsi.toFixed(1) : '—'} (${rsiStatus.label.toLowerCase()}) no ${tfAlvo}.`
      });
    }
    
    // Linha 7: Ação recomendada
    const acao = direcao === 'alta' ? 'compra' : 'venda';
    lines.push({
      type: 'normal',
      text: `Aguardar confirmação de ${setup} no ${tfAlvo} para entrada em ${acao}.`
    });
    
    return lines;
  }

  // =====================================================================
  // BUILDER DE DADOS TÉCNICOS
  // =====================================================================
  
  function buildTechnicalData(input) {
    const perfil = normalizePerfil(input.perfil || input.trading_profile);
    const perfilConfig = PERFIS[perfil];
    const direcao = input.direcao === 'baixa' || input.direction === 'bearish' ? 'bearish' : 'bullish';
    
    const tfSinal = input.tempoGraficoSinal || input.signal_timeframe || perfilConfig.sinal;
    const tfAlvo = input.tempoGraficoAlvo || input.target_timeframe || perfilConfig.alvo;
    
    const fib = input.fibonacci || {};
    
    return {
      tendenciaAlvo: direcao === 'bullish' ? 'BULLISH' : 'BEARISH',
      timeframeSinal: tfSinal,
      timeframeAlvo: tfAlvo,
      fib382: fib['0.382'] || fib.fib_0382 || input.fib_0382,
      fib500: fib['0.5'] || fib.fib_050 || input.fib_050,
      fib618: fib['0.618'] || fib.fib_0618 || input.fib_0618,
      fib786: fib['0.786'] || fib.fib_0786 || input.fib_0786
    };
  }

  // =====================================================================
  // BUILDER DE CONFLUÊNCIAS
  // =====================================================================
  
  function buildConfluences(input) {
    const positive = [];
    const negative = [];
    
    // Positivas vindas do input
    if (Array.isArray(input.positive_confluences)) {
      positive.push(...input.positive_confluences);
    }
    if (Array.isArray(input.positiveFactors)) {
      positive.push(...input.positiveFactors);
    }
    
    // Negativas vindas do input
    if (Array.isArray(input.negative_confluences)) {
      negative.push(...input.negative_confluences);
    }
    if (Array.isArray(input.negativeFactors)) {
      negative.push(...input.negativeFactors);
    }
    
    // Gerar baseado em dados se não houver confluências
    if (positive.length === 0 && negative.length === 0) {
      const rsi = input.rsi || input.rsi_value;
      const ema200 = input.ema_200;
      const currentPrice = input.current_price || input.entry_price;
      const fibZone = input.fib_zone || input.premium_discount;
      const direcao = input.direction === 'bearish' ? 'baixa' : 'alta';
      
      // RSI
      if (isNum(rsi)) {
        if (direcao === 'alta' && rsi <= 35) positive.push('RSI em zona de sobrevenda');
        else if (direcao === 'baixa' && rsi >= 65) positive.push('RSI em zona de sobrecompra');
        else if (rsi > 45 && rsi < 55) negative.push('RSI em zona neutra');
      }
      
      // EMA 200
      if (isNum(ema200) && isNum(currentPrice)) {
        if (direcao === 'alta' && currentPrice > ema200) {
          positive.push('Preço acima da EMA 200');
        } else if (direcao === 'baixa' && currentPrice < ema200) {
          positive.push('Preço abaixo da EMA 200');
        }
      }
      
      // Fibonacci Zone
      if (fibZone === 'discount' && direcao === 'alta') {
        positive.push('Zona de desconto Fibonacci');
      } else if (fibZone === 'premium' && direcao === 'baixa') {
        positive.push('Zona de prêmio Fibonacci');
      } else if (fibZone === 'ote') {
        positive.push('Zona OTE (entrada ótima)');
      }
      
      // EMAs coerentes
      if (input.ema_12 && input.ema_26) {
        const ema12 = input.ema_12;
        const ema26 = input.ema_26;
        if ((direcao === 'alta' && ema12 > ema26) || (direcao === 'baixa' && ema12 < ema26)) {
          positive.push('Médias móveis exponenciais coerentes com o contexto');
        }
      }
      
      // Defaults se ainda estiver vazio
      if (positive.length === 0) {
        positive.push('Médias móveis exponenciais coerentes com o contexto');
      }
      if (negative.length === 0) {
        negative.push('Monitorar volatilidade');
      }
    }
    
    return {
      positive: [...new Set(positive)].slice(0, 5),
      negative: [...new Set(negative)].slice(0, 5)
    };
  }

  // =====================================================================
  // BUILDER DE DADOS AVANÇADOS
  // =====================================================================
  
  function buildAdvancedData(input) {
    const fibZone = input.fib_zone || 'equilibrium';
    const fibZonePct = input.fib_zone_pct || 50;
    const marketStructure = input.market_structure || input.structure_bias || 'neutral';
    const longShortRatio = input.long_short_ratio;
    const longPct = input.long_accounts_pct;
    const shortPct = input.short_accounts_pct;
    
    return {
      fibZone: {
        zone: fibZone,
        zonePct: fibZonePct,
        label: fibZone === 'discount' ? 'Desconto' :
               fibZone === 'premium' ? 'Prêmio' :
               fibZone === 'ote' ? 'OTE' : 'Equilíbrio'
      },
      marketStructure: {
        bias: marketStructure,
        label: marketStructure === 'bullish' ? 'Alta' :
               marketStructure === 'bearish' ? 'Baixa' : 'Neutro'
      },
      sentiment: isNum(longShortRatio) ? {
        longShortRatio,
        longPct: longPct || 50,
        shortPct: shortPct || 50
      } : null
    };
  }

  // =====================================================================
  // BUILDER DE INVALIDAÇÃO
  // =====================================================================
  
  function buildInvalidation(input) {
    const perfil = normalizePerfil(input.perfil || input.trading_profile);
    const perfilConfig = PERFIS[perfil];
    const tfSinal = getTFLabel(input.tempoGraficoSinal || input.signal_timeframe || perfilConfig.sinal);
    const tfAlvo = getTFLabel(input.tempoGraficoAlvo || input.target_timeframe || perfilConfig.alvo);
    
    const invalidationPrice = input.invalidation || input.stop_loss;
    const currentPrice = input.current_price || input.entry_price;
    const direcao = input.direction === 'bearish' ? 'baixa' : 'alta';
    
    let distancePct = 0;
    if (isNum(invalidationPrice) && isNum(currentPrice) && currentPrice > 0) {
      distancePct = Math.abs((invalidationPrice - currentPrice) / currentPrice * 100);
    }
    
    return {
      price: invalidationPrice,
      priceFmt: formatNumber(invalidationPrice),
      distancePct: distancePct.toFixed(1),
      timeframe: tfSinal,
      text: isNum(invalidationPrice) 
        ? `Esta análise técnica é invalidada se o preço atingir ${formatNumber(invalidationPrice)} (${distancePct.toFixed(1)}%).`
        : 'Invalidação não definida.'
    };
  }

  // =====================================================================
  // BUILDER PRINCIPAL - FORMATO COMPLETO PARA MODAL
  // =====================================================================
  
  function build(input) {
    const title = buildTitle(input);
    const contextLines = buildContextLines(input);
    const technicalData = buildTechnicalData(input);
    const confluences = buildConfluences(input);
    const advancedData = buildAdvancedData(input);
    const invalidation = buildInvalidation(input);
    const score = input.confluence_score || input.score || 0;
    
    // 🆕 Integração com Master Precision System (se disponível)
    let masterPrecision = null;
    let thermometer = null;
    
    if (typeof window !== 'undefined') {
      // Thermometer de Confluências
      if (window.ConfluenceThermometer) {
        try {
          thermometer = window.ConfluenceThermometer.analyzeContext(input);
        } catch (e) {
          console.warn('Thermometer analysis failed:', e);
        }
      }
    }
    
    return {
      title,
      contextLines,
      technicalData,
      confluences,
      advancedData,
      invalidation,
      score,
      // 🆕 Novos campos de precisão
      thermometer,
      precision: {
        enabled: !!thermometer,
        score: thermometer?.score || score,
        level: thermometer?.level?.key || 'unknown',
        action: thermometer?.action?.action || 'ANALISAR'
      }
    };
  }

  // =====================================================================
  // 🆕 BUILDER PARA ANÁLISE COMPLETA COM PRECISÃO
  // =====================================================================
  
  function buildWithPrecision(input, candles = null) {
    const baseContext = build(input);
    let masterAnalysis = null;
    let fibAnalysis = null;
    let smcAnalysis = null;
    
    if (typeof window !== 'undefined' && candles && candles.length > 50) {
      // Master Precision System
      if (window.MasterPrecision) {
        try {
          const system = new window.MasterPrecision.System();
          system.initialize();
          masterAnalysis = system.analyzeAsset(
            input.symbol,
            candles,
            input.target_timeframe || '1h'
          );
        } catch (e) {
          console.warn('Master Precision analysis failed:', e);
        }
      }
      
      // Fibonacci Precision Engine
      if (window.FibonacciPrecisionEngine) {
        try {
          const fibEngine = new window.FibonacciPrecisionEngine.Engine({
            profile: input.trading_profile === 'Scalping' ? 'execution' : 
                     input.trading_profile === 'Swing Trade' ? 'macro' : 'balanced'
          });
          fibAnalysis = fibEngine.analyzeComplete(candles, input.target_timeframe || '1h');
        } catch (e) {
          console.warn('Fibonacci analysis failed:', e);
        }
      }
      
      // SMC Precision Engine
      if (window.SMCPrecisionEngine) {
        try {
          smcAnalysis = window.SMCPrecisionEngine.analyzeComplete(candles, input.symbol);
        } catch (e) {
          console.warn('SMC analysis failed:', e);
        }
      }
    }
    
    // Atualizar thermometer com dados de precisão
    let thermometer = baseContext.thermometer;
    if (masterAnalysis && window.ConfluenceThermometer) {
      try {
        thermometer = window.ConfluenceThermometer.analyzeMasterPrecision(masterAnalysis);
      } catch (e) {
        console.warn('Thermometer update failed:', e);
      }
    }
    
    return {
      ...baseContext,
      thermometer,
      masterPrecision: masterAnalysis,
      fibonacciAnalysis: fibAnalysis,
      smcAnalysis: smcAnalysis,
      precision: {
        enabled: true,
        score: thermometer?.score || masterAnalysis?.confluence || baseContext.score,
        level: thermometer?.level?.key || masterAnalysis?.tier || 'unknown',
        action: thermometer?.action?.action || 'ANALISAR',
        tier: masterAnalysis?.tier || 'D',
        signal: masterAnalysis?.signal || null,
        entryPlan: masterAnalysis?.entry || null
      },
      // Para Supabase
      forDatabase: thermometer?.forDatabase || {
        confluence_score: baseContext.score,
        confluence_level: 'unknown',
        confluence_action: 'ANALISAR'
      }
    };
  }

  // =====================================================================
  // BUILDER PARA TEXTO SIMPLES (methodology_summary)
  // =====================================================================
  
  function buildSummaryText(input) {
    const symbol = input.symbol || 'ATIVO';
    const setup = normalizeSetup(input.setup);
    const setupConfig = SETUPS[setup];
    const direcao = input.direction === 'bearish' ? 'baixa' : 'alta';
    const perfil = normalizePerfil(input.perfil || input.trading_profile);
    const perfilConfig = PERFIS[perfil];
    
    const tfAlvo = getTFLabel(input.target_timeframe || perfilConfig.alvo);
    const tfAncora = getTFLabel(input.anchor_timeframe || perfilConfig.ancora);
    const anchorTrend = input.anchor_trend === 'bearish' ? 'baixa' : 'alta';
    
    const fib = input.fibonacci || {};
    const fib618 = fib['0.618'] || input.fib_0618;
    const fib786 = fib['0.786'] || input.fib_0786;
    
    const fibZone = input.fib_zone || 'equilibrium';
    const fibZoneLabel = fibZone === 'discount' ? 'desconto' :
                         fibZone === 'premium' ? 'prêmio' :
                         fibZone === 'ote' ? 'entrada ótima (OTE)' : 'equilíbrio';
    
    const rsi = input.rsi_value;
    const rsiStatus = getRSIStatus(rsi);
    
    let text = `${symbol} — ${perfilConfig.label} — Tendência de ${direcao}: buscando ${setup} no tempo gráfico ${tfAlvo}\n\n`;
    text += `${perfilConfig.label} - Configuração de ${setupConfig.label} identificada.\n\n`;
    text += `Tendência no tempo gráfico âncora (${tfAncora}): ${anchorTrend}.\n`;
    
    if (setupConfig.tipo === 'correcao') {
      text += `O tempo gráfico ${tfAlvo} está em correção, buscando formar ${setup}.\n`;
    } else {
      text += `O tempo gráfico ${tfAlvo} está em continuidade, buscando formar ${setup}.\n`;
    }
    
    if (fibZone !== 'equilibrium') {
      text += `◆ Preço atual na zona de ${fibZoneLabel} da retração de Fibonacci.\n`;
    }
    
    if (rsiStatus.status !== 'neutro') {
      text += `◆ Índice de força relativa (14): ${isNum(rsi) ? rsi.toFixed(1) : '—'} (${rsiStatus.label.toLowerCase()}) no ${tfAlvo}.\n`;
    }
    
    text += `\nAguardar confirmação de ${setup} no ${tfAlvo} para entrada em ${direcao === 'alta' ? 'compra' : 'venda'}.`;
    
    return text;
  }

  // =====================================================================
  // EXPORT
  // =====================================================================
  
  const SHDWXBTContext = {
    TF_LABELS,
    SETUPS,
    PERFIS,
    
    // Funções principais
    build,
    buildWithPrecision,  // 🆕 Com integração Master Precision
    buildTitle,
    buildContextLines,
    buildTechnicalData,
    buildConfluences,
    buildAdvancedData,
    buildInvalidation,
    buildSummaryText,
    
    // Utilitários
    normalizeSetup,
    normalizePerfil,
    getTFLabel,
    getRSIStatus,
    formatNumber,
    calculateTargets
  };

  // Export para browser
  if (typeof window !== 'undefined') {
    window.SHDWXBTContext = SHDWXBTContext;
  }
  
  // Export para Deno/Node
  if (typeof globalThis !== 'undefined') {
    globalThis.SHDWXBTContext = SHDWXBTContext;
  }

})(typeof window !== 'undefined' ? window : globalThis);
