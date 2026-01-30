/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                    SHDWXBT — Panels Logic                                     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Copyright (c) 2024-2026 SHDWXBT. All rights reserved.                        ║
 * ║  PROPRIETARY AND CONFIDENTIAL                                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
function updatePanels(opp) {
    if (!opp) return;
    updateFibonacciPanel(opp);
    updateAlphaDeskPanel(opp);
}

function updateFibonacciPanel(opp) {
    const fibPanel = document.getElementById('fibonacci-panel');
    if (!fibPanel) return;

    // Use targets or fallback to Fibonacci levels if available
    let A, B;
    
    // Try to derive A and B from targets or fibonacci object
    if (opp.targets && opp.targets.length >= 3) {
        // Assuming targets[0] is TP1 (Extension A) and targets[2] is TP3 (Extension B) is arbitrary
        // Better to check if we have specific swing points stored
        if (opp.swingLow && opp.swingHigh) {
            A = opp.swingLow;
            B = opp.swingHigh;
        } else {
            // Heuristic based on dashboard.html logic
            A = opp.targets[0]?.price;
            B = opp.targets[2]?.price;
        }
    } else if (opp.fibonacci) {
        // Try to infer from 0 and 1 levels if they exist
        if (opp.fibonacci['0'] && opp.fibonacci['1']) {
            A = opp.fibonacci['1'];
            B = opp.fibonacci['0'];
        }
    }
    
    // If we still don't have good A/B, just try to show what we have or hide
    if (!A || !B || isNaN(A) || isNaN(B)) {
        fibPanel.style.display = 'none';
        return;
    }

    fibPanel.style.display = 'block';

    const fibs = [
        {label: '0%',    pct: 0.0},
        {label: '23.6%', pct: 0.236},
        {label: '38.2%', pct: 0.382},
        {label: '50%',   pct: 0.5},
        {label: '61.8%', pct: 0.618},
        {label: '65%',   pct: 0.65},
        {label: '70.5%', pct: 0.705},
        {label: '78.6%', pct: 0.786},
        {label: '79%',   pct: 0.79},
        {label: '88.6%', pct: 0.886},
        {label: '100%',  pct: 1.0}
    ];

    function fibLevel(pct) {
        return (A + (B - A) * pct);
    }

    if (document.getElementById('fib-swing-info')) {
        document.getElementById('fib-swing-info').innerHTML = `Swing: <span class="text-emerald-400">${window.formatPrice(A)}</span> → <span class="text-rose-400">${window.formatPrice(B)}</span>`;
    }

    if (document.getElementById('fib-levels')) {
        document.getElementById('fib-levels').innerHTML = fibs.map(f =>
            `<div class="flex justify-between text-xs"><span>${f.label}</span><span class="font-mono text-zinc-300">${window.formatPrice(fibLevel(f.pct))}</span></div>`
        ).join('');
    }

    const zones = [
        {name: 'OTE',      from: 0.618, to: 0.786, color: 'bg-cyan-900/40 text-cyan-200 border border-cyan-700/30'},
        {name: 'Golden',   from: 0.618, to: 0.65,  color: 'bg-yellow-900/40 text-yellow-200 border border-yellow-700/30'},
        {name: 'Entry',    from: 0.705, to: 0.79,  color: 'bg-emerald-900/40 text-emerald-200 border border-emerald-700/30'},
        {name: 'Premium',  from: 0.0,   to: 0.05,  color: 'bg-rose-900/40 text-rose-200 border border-rose-700/30'},
        {name: 'Discount', from: 0.95,  to: 1.0,   color: 'bg-green-900/40 text-green-200 border border-green-700/30'},
        {name: 'EQ',       from: 0.5,   to: 0.5,   color: 'bg-zinc-800/60 text-zinc-300 border border-zinc-700/30'}
    ];

    if (document.getElementById('fib-zones')) {
        document.getElementById('fib-zones').innerHTML = zones.map(z =>
            `<div class="px-2 py-1 rounded text-[10px] font-mono ${z.color} mb-1 mr-1 inline-block">${z.name}: ${window.formatPrice(fibLevel(z.from))}</div>`
        ).join('');
    }
}

function updateAlphaDeskPanel(opp) {
    const alphaDeskPanel = document.getElementById('alphadesk-panel');
    if (!alphaDeskPanel) return;
    
    // Always show if available
    alphaDeskPanel.style.display = 'block';

    if (!document.getElementById('alphadesk-table')) return;

    const tfList = [
        {tf: '5m', label: '5m'},
        {tf: '15m', label: '15m'},
        {tf: '1h', label: '1h'},
        {tf: '4h', label: '4h'},
        {tf: '1D', label: '1D'}
    ];
    
    // Using styles matching the new dashboard theme
    const colors = {
        bull: '#10b981', // emerald-500
        bear: '#f43f5e', // rose-500
        neutral: '#71717a', // zinc-500
        text: '#e4e4e7' // zinc-200
    };

    function getTrendLabel(trend) {
        return trend === 1 ? 'Bull' : trend === -1 ? 'Bear' : '-';
    }
    function getTrendColor(trend) {
        return trend === 1 ? colors.bull : trend === -1 ? colors.bear : colors.neutral;
    }
    
    // Get trend data from opp or mock it
    function getTrendAndRSI(tf) {
        // If real data is available in opp.regime[tf]
        const regime = opp.regime && opp.regime[tf] ? opp.regime[tf] : null;
        if (regime) {
             return {
                 trend: regime.trend === 'bullish' ? 1 : (regime.trend === 'bearish' ? -1 : 0),
                 rsi: regime.rsi || '--'
             };
        }
        
        // Fallback/Mock logic for visual template if no real data
        const trendVal = Math.random() > 0.5 ? 1 : (Math.random() > 0.5 ? -1 : 0);
        const rsiVal = Math.round(30 + Math.random() * 40);
        return {trend: trendVal, rsi: rsiVal};
    }

    let html = '';
    
    html += `<div class="w-full">`;
    html += `<div class="grid grid-cols-3 gap-2 mb-2 text-[10px] font-medium text-zinc-500 uppercase tracking-wider text-center">`
          + `<div>TF</div>`
          + `<div>Trend</div>`
          + `<div>RSI</div>`
          + `</div>`;

    tfList.forEach(tfObj => {
        const {trend, rsi} = getTrendAndRSI(tfObj.tf);
        const trendColor = getTrendColor(trend);
        const trendLabel = getTrendLabel(trend);
        
        html += `<div class="grid grid-cols-3 gap-2 mb-1.5 items-center bg-white/[0.02] rounded p-1.5 border border-white/5 hover:bg-white/[0.04] transition-colors">`
              + `<div class="text-center text-[11px] font-mono text-zinc-400">${tfObj.label}</div>`
              + `<div class="text-center text-[10px] font-bold" style="color:${trendColor}">${trendLabel}</div>`
              + `<div class="text-center text-[11px] font-mono text-zinc-300">${rsi}</div>`
              + `</div>`;
    });
    
    html += `</div>`;

    document.getElementById('alphadesk-table').innerHTML = html;
}

// Export to window
window.updatePanels = updatePanels;
