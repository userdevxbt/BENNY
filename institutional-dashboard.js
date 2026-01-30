/**
 * ============================================================================
 * SHDWXBT — INSTITUTIONAL DASHBOARD INTEGRATION
 * ============================================================================
 * 
 * Integra o Institutional Engine e Scanner com o Dashboard UI
 * Renderiza oportunidades institucionais em tempo real
 * 
 * ============================================================================
 */

const InstitutionalDashboard = {
    // ========================================
    // ESTADO
    // ========================================
    state: {
        isInitialized: false,
        currentProfile: 'all', // all, scalping, dayTrading, swing, position
        opportunities: [],
        selectedOpportunity: null,
        autoRefresh: true
    },

    // ========================================
    // INICIALIZAÇÃO
    // ========================================
    async init() {
        if (this.state.isInitialized) {
            console.log('⚠️ Institutional Dashboard já inicializado');
            return;
        }

        console.log('🚀 Inicializando Institutional Dashboard...');

        // Iniciar Scanner
        await InstitutionalScanner.start();

        // Eventos
        this.setupEventListeners();

        // Carregar oportunidades iniciais
        await this.refreshOpportunities();

        // Auto-refresh a cada 30 segundos
        setInterval(() => {
            if (this.state.autoRefresh) {
                this.refreshOpportunities();
            }
        }, 30000);

        this.state.isInitialized = true;
        console.log('✅ Institutional Dashboard inicializado');
    },

    setupEventListeners() {
        // Eventos do scanner
        window.addEventListener('scanComplete', (e) => {
            console.log('📊 Scan completo:', e.detail);
            this.handleNewOpportunities(e.detail.opportunities);
        });

        window.addEventListener('quickScanUpdate', (e) => {
            console.log('⚡ Quick scan update');
            this.handleNewOpportunities(e.detail.opportunities);
        });

        window.addEventListener('tradingAlert', (e) => {
            console.log('🔔 Trading Alert:', e.detail);
            this.showAlert(e.detail);
        });
    },

    // ========================================
    // OPORTUNIDADES
    // ========================================
    async refreshOpportunities() {
        try {
            // Buscar do scanner
            const filters = {
                profile: this.state.currentProfile === 'all' ? null : this.state.currentProfile,
                sortBy: 'score',
                limit: 50
            };

            const opportunities = InstitutionalScanner.getOpportunities(filters);
            
            this.state.opportunities = opportunities;
            this.renderOpportunities(opportunities);

            // Atualizar estatísticas
            this.updateStats();

            return opportunities;

        } catch (error) {
            console.error('❌ Erro ao refresh oportunidades:', error);
            return [];
        }
    },

    handleNewOpportunities(opportunities) {
        // Atualizar estado
        this.state.opportunities = opportunities;
        
        // Re-render se na view correta
        if (this.state.currentProfile === 'all' || !this.state.currentProfile) {
            this.renderOpportunities(opportunities);
        } else {
            // Filtrar por perfil
            const filtered = opportunities.filter(opp => 
                opp.profile === this.state.currentProfile
            );
            this.renderOpportunities(filtered);
        }

        // Atualizar stats
        this.updateStats();
    },

    // ========================================
    // RENDERIZAÇÃO
    // ========================================
    renderOpportunities(opportunities) {
        const grid = document.getElementById('opportunities-grid');
        if (!grid) return;

        if (!opportunities || opportunities.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center min-h-[400px] glass-panel rounded-xl p-8">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-zinc-600 mb-4">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p class="text-zinc-500 text-sm font-mono">Nenhuma oportunidade institucional encontrada</p>
                    <p class="text-zinc-600 text-xs mt-2">Scanner ativo - aguardando sinais de alta precisão</p>
                </div>
            `;
            return;
        }

        // Renderizar cards
        grid.innerHTML = opportunities.map(opp => this.createOpportunityCard(opp)).join('');

        // Re-criar ícones Lucide
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    },

    createOpportunityCard(opp) {
        // Validação de dados
        if (!opp || !opp.riskManagement || !opp.marketStructure) {
            console.warn('Oportunidade inválida:', opp?.symbol);
            return '';
        }
        
        const direction = opp.marketStructure.overall;
        const isBullish = direction === 'bullish';
        const color = isBullish ? 'emerald' : 'rose';
        const icon = isBullish ? 'trending-up' : 'trending-down';
        
        // Formatar preços com validação
        const rm = opp.riskManagement;
        const entry = rm.entry || 0;
        const targets = rm.targets || [];
        const tp1 = targets[0]?.price || 0;
        const tp2 = targets[1]?.price || 0;
        const tp3 = targets[2]?.price || 0;
        const sl = rm.stopLoss || 0;

        // Quality badge
        const qualityColors = {
            exceptional: 'bg-purple-500/20 border-purple-500/40 text-purple-400',
            excellent: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
            good: 'bg-blue-500/20 border-blue-500/40 text-blue-400',
            medium: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
            acceptable: 'bg-zinc-500/20 border-zinc-500/40 text-zinc-400'
        };

        const qualityClass = qualityColors[opp.signalQuality] || qualityColors.medium;

        return `
            <div class="card-panel rounded-[24px] p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer"
                 onclick="InstitutionalDashboard.openOpportunityDetail('${opp.symbol}', '${opp.profile}')">
                
                <!-- Header -->
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <img src="${window.getCryptoLogoUrl(opp.symbol)}" 
                             alt="${opp.symbol}" 
                             class="w-12 h-12 rounded-full border border-white/10"
                             onerror="this.src='https://via.placeholder.com/48/1a1a1a/ffffff?text=${opp.symbol.slice(0,3)}'">
                        <div>
                            <h3 class="text-lg font-bold text-white">${opp.symbol.replace('USDT', '')}</h3>
                            <span class="text-xs text-zinc-500 font-mono uppercase">${opp.profile}</span>
                        </div>
                    </div>
                    
                    <!-- Score -->
                    <div class="text-right">
                        <div class="text-3xl font-mono font-bold text-white">${opp.score}</div>
                        <div class="text-xs text-zinc-500 uppercase tracking-wide">Score</div>
                    </div>
                </div>

                <!-- Direction Badge -->
                <div class="mb-4 px-3 py-2 rounded-lg bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center gap-2">
                    <svg data-lucide="${icon}" class="w-4 h-4 text-${color}-400"></svg>
                    <span class="text-sm font-mono font-bold text-${color}-400 uppercase">
                        ${isBullish ? 'BULLISH' : 'BEARISH'}
                    </span>
                </div>

                <!-- Quality Badge -->
                <div class="mb-4 px-3 py-1.5 rounded border ${qualityClass} text-center">
                    <span class="text-xs font-mono uppercase tracking-wide">${opp.signalQuality}</span>
                </div>

                <!-- Preços -->
                <div class="space-y-2 mb-4 border-t border-white/5 pt-4">
                    <div class="flex justify-between text-xs">
                        <span class="text-zinc-500">Entry</span>
                        <span class="text-white font-mono">${this.formatPrice(entry)}</span>
                    </div>
                    <div class="flex justify-between text-xs">
                        <span class="text-${color}-500">TP1</span>
                        <span class="text-white font-mono">${this.formatPrice(tp1)}</span>
                    </div>
                    <div class="flex justify-between text-xs">
                        <span class="text-${color}-400">TP2</span>
                        <span class="text-white font-mono">${this.formatPrice(tp2)}</span>
                    </div>
                    <div class="flex justify-between text-xs">
                        <span class="text-${color}-300">TP3</span>
                        <span class="text-white font-mono">${this.formatPrice(tp3)}</span>
                    </div>
                    <div class="flex justify-between text-xs border-t border-white/5 pt-2">
                        <span class="text-rose-500">Stop</span>
                        <span class="text-white font-mono">${this.formatPrice(sl)}</span>
                    </div>
                </div>

                <!-- Risk:Reward -->
                <div class="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <span class="text-xs text-zinc-500 uppercase tracking-wide">Risk:Reward</span>
                    <span class="text-sm font-mono font-bold text-yellow-500">
                        ${opp.riskManagement?.minRiskReward || 'N/A'}
                    </span>
                </div>

                <!-- Smart Money Indicators -->
                <div class="mt-4 pt-4 border-t border-white/5">
                    <div class="grid grid-cols-3 gap-2 text-center">
                        ${(opp.smartMoney?.orderBlocks?.length || 0) > 0 ? `
                            <div class="p-2 rounded bg-purple-500/10 border border-purple-500/20">
                                <div class="text-xs text-purple-400 font-mono">OB</div>
                                <div class="text-sm font-bold text-white">${opp.smartMoney.orderBlocks.length}</div>
                            </div>
                        ` : ''}
                        ${(opp.smartMoney?.fairValueGaps?.length || 0) > 0 ? `
                            <div class="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                                <div class="text-xs text-blue-400 font-mono">FVG</div>
                                <div class="text-sm font-bold text-white">${opp.smartMoney.fairValueGaps.length}</div>
                            </div>
                        ` : ''}
                        ${(opp.marketStructure?.breakOfStructure?.length || 0) > 0 ? `
                            <div class="p-2 rounded bg-${color}-500/10 border border-${color}-500/20">
                                <div class="text-xs text-${color}-400 font-mono">BOS</div>
                                <div class="text-sm font-bold text-white">${opp.marketStructure.breakOfStructure.length}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Timestamp -->
                <div class="mt-4 text-center">
                    <span class="text-xs text-zinc-600 font-mono">
                        ${this.formatTimestamp(opp.timestamp)}
                    </span>
                </div>
            </div>
        `;
    },

    // ========================================
    // MODAL DE DETALHES
    // ========================================
    openOpportunityDetail(symbol, profile) {
        const opp = this.state.opportunities.find(
            o => o.symbol === symbol && o.profile === profile
        );

        if (!opp) {
            console.warn('Oportunidade não encontrada:', symbol, profile);
            return;
        }

        this.state.selectedOpportunity = opp;

        // Abrir modal (usando o modal existente do dashboard)
        const modal = document.getElementById('detail-modal');
        if (!modal) return;

        modal.classList.remove('hidden-modal');
        modal.classList.add('visible-modal');

        // Popular dados no modal
        this.populateModal(opp);

        // Inicializar TradingView chart
        this.initTradingViewChart(opp.symbol);
    },

    populateModal(opp) {
        // Título
        document.getElementById('modal-title').textContent = opp.symbol.replace('USDT', '/USDT');
        document.getElementById('sidebar-symbol').textContent = opp.profile;

        // Direção
        const direction = opp.marketStructure.overall;
        const isBullish = direction === 'bullish';
        const directionEl = document.getElementById('overlay-direction');
        const directionIcon = document.getElementById('overlay-direction-icon');
        const directionText = document.getElementById('overlay-direction-text');

        if (isBullish) {
            directionEl.className = 'w-full py-1.5 mb-4 rounded bg-emerald-500/10 border border-emerald-500/20 text-center flex items-center justify-center gap-2';
            directionIcon.setAttribute('data-lucide', 'trending-up');
            directionText.textContent = 'LONG';
            directionText.className = 'text-xs font-mono font-bold text-emerald-500 tracking-widest';
        } else {
            directionEl.className = 'w-full py-1.5 mb-4 rounded bg-rose-500/10 border border-rose-500/20 text-center flex items-center justify-center gap-2';
            directionIcon.setAttribute('data-lucide', 'trending-down');
            directionText.textContent = 'SHORT';
            directionText.className = 'text-xs font-mono font-bold text-rose-500 tracking-widest';
        }

        // Atualizar ícones
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Preços no overlay - com validação
        const rm = opp.riskManagement || {};
        const targets = rm.targets || [];
        
        document.getElementById('overlay-entry-zone').textContent = this.formatPrice(rm.entry || 0);
        document.getElementById('overlay-tp1').textContent = this.formatPrice(targets[0]?.price || 0);
        document.getElementById('overlay-tp2').textContent = this.formatPrice(targets[1]?.price || 0);
        document.getElementById('overlay-tp3').textContent = this.formatPrice(targets[2]?.price || 0);
        document.getElementById('overlay-stoploss').textContent = this.formatPrice(rm.stopLoss || 0);
        document.getElementById('overlay-rr').textContent = rm.minRiskReward || 'N/A';

        // Score e confluence
        document.getElementById('sidebar-confidence-value').textContent = `${opp.score || 0}%`;
        const confBar = document.getElementById('sidebar-confidence-bar');
        confBar.style.width = `${opp.score || 0}%`;

        // Confluências
        this.renderConfluences(opp);

        // Contexto / Headline
        this.renderContext(opp);
    },

    renderConfluences(opp) {
        const posEl = document.getElementById('sidebar-confluences-positive');
        const negEl = document.getElementById('sidebar-confluences-negative');

        if (!posEl || !negEl) return;

        // Confluências positivas
        const positive = [];
        opp.confluence.factors.forEach(factor => {
            if (factor.score > 0) {
                positive.push(`${factor.name}: ${factor.score}/${factor.max}`);
            }
        });

        if (positive.length > 0) {
            posEl.innerHTML = positive.map(p => `
                <li class="flex items-start gap-1.5 text-[10px] text-zinc-400">
                    <span class="w-1 h-1 rounded-full bg-emerald-500 mt-1.5"></span>
                    <span>${p}</span>
                </li>
            `).join('');
        } else {
            posEl.innerHTML = '<li class="text-[10px] text-zinc-600">Nenhuma</li>';
        }

        // Confluências negativas (Score baixo = negativo)
        const negative = [];
        opp.confluence.factors.forEach(factor => {
            if (factor.score === 0 || factor.score < factor.max * 0.3) {
                negative.push(`${factor.name}: ${factor.score}/${factor.max}`);
            }
        });

        if (negative.length > 0) {
            negEl.innerHTML = negative.map(n => `
                <li class="flex items-start gap-1.5 text-[10px] text-zinc-400">
                    <span class="w-1 h-1 rounded-full bg-rose-500 mt-1.5"></span>
                    <span>${n}</span>
                </li>
            `).join('');
        } else {
            negEl.innerHTML = '<li class="text-[10px] text-zinc-600">Nenhuma</li>';
        }
    },

    renderContext(opp) {
        const headlineEl = document.getElementById('sidebar-headline');
        const contextEl = document.getElementById('sidebar-context');

        if (!headlineEl || !contextEl) return;

        // Headline baseado em SMC
        const smc = opp.smartMoney;
        const structure = opp.marketStructure;

        let headline = `Setup Institucional ${opp.marketStructure.overall === 'bullish' ? 'LONG' : 'SHORT'}`;
        
        const contextParts = [];

        // Estrutura de mercado
        if (structure.breakOfStructure.length > 0) {
            const bosType = structure.breakOfStructure[0].type;
            contextParts.push(`Break of Structure ${bosType} confirmado em ${structure.breakOfStructure.length} timeframe(s).`);
        }

        // Order Blocks
        if (smc.orderBlocks.length > 0) {
            const obStrong = smc.orderBlocks.filter(ob => ob.strength === 'strong').length;
            if (obStrong > 0) {
                contextParts.push(`${obStrong} Order Block(s) forte(s) identificado(s).`);
            }
        }

        // Fair Value Gaps
        if (smc.fairValueGaps.length > 0) {
            contextParts.push(`${smc.fairValueGaps.length} Fair Value Gap(s) detectado(s).`);
        }

        // Optimal Trade Entry
        if (smc.optimalTradeEntry && smc.optimalTradeEntry.inZone) {
            contextParts.push(`Preço atualmente na zona OTE (Optimal Trade Entry) entre Fib 0.618-0.786.`);
        }

        // Alinhamento MTF
        const trendAlign = opp.confluence.factors.find(f => f.name === 'Alinhamento Multi-Timeframe');
        if (trendAlign) {
            contextParts.push(`Alinhamento multi-timeframe: ${trendAlign.details.alignment} (${trendAlign.details.direction}).`);
        }

        headlineEl.textContent = headline;
        contextEl.innerHTML = contextParts.map(p => `<p>${p}</p>`).join('');
    },

    initTradingViewChart(symbol) {
        // Usar TradingView Widget existente do dashboard
        const chartContainer = document.getElementById('tradingview_chart');
        if (!chartContainer) return;

        // Limpar chart anterior
        chartContainer.innerHTML = '';

        // Criar novo chart
        if (typeof TradingView === 'undefined') {
            console.warn('TradingView não carregado');
            return;
        }

        new TradingView.widget({
            container_id: 'tradingview_chart',
            symbol: `BINANCE:${symbol}`,
            interval: '15',
            timezone: 'Etc/UTC',
            theme: 'dark',
            style: '1',
            locale: 'en',
            toolbar_bg: '#050505',
            enable_publishing: false,
            hide_top_toolbar: false,
            hide_legend: false,
            save_image: false,
            backgroundColor: '#050505',
            gridColor: 'rgba(255,255,255,0.06)',
            height: '100%',
            width: '100%'
        });
    },

    // ========================================
    // ESTATÍSTICAS
    // ========================================
    updateStats() {
        const stats = InstitutionalScanner.getStats();

        // Total
        const totalEl = document.getElementById('stat-active');
        if (totalEl) totalEl.textContent = stats.totalOpportunities;

        // Por perfil
        const byProfile = stats.opportunitiesByProfile;
        document.getElementById('stat-scalping')?.textContent(byProfile.scalping || 0);
        document.getElementById('stat-day')?.textContent(byProfile.dayTrading || 0);
        document.getElementById('stat-swing')?.textContent(byProfile.swing || 0);
        document.getElementById('stat-position')?.textContent(byProfile.position || 0);

        // Por quality
        const byQuality = stats.opportunitiesByQuality;
        console.log('📊 Stats atualizado:', stats);
    },

    // ========================================
    // FILTROS
    // ========================================
    filterByProfile(profile) {
        this.state.currentProfile = profile;

        // Atualizar UI dos botões
        document.querySelectorAll('[data-profile-filter]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-profile-filter="${profile}"]`)?.classList.add('active');

        // Re-render
        this.refreshOpportunities();
    },

    // ========================================
    // ALERTAS
    // ========================================
    showAlert(alert) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-20 right-4 z-50 bg-purple-500/90 backdrop-blur-sm text-white px-6 py-4 rounded-xl shadow-2xl animate-pulse';
        notification.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-2xl">🔔</span>
                <div>
                    <div class="font-bold">${alert.message}</div>
                    <div class="text-sm opacity-80">${alert.type}</div>
                </div>
            </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    },

    // ========================================
    // HELPERS
    // ========================================
    formatPrice(price) {
        if (!price || isNaN(price)) return '--';
        const num = parseFloat(price);
        if (num >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (num >= 1) return num.toFixed(2);
        if (num >= 0.01) return num.toFixed(4);
        return num.toFixed(6);
    },

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}m atrás`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h atrás`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d atrás`;
    }
};

// Expor globalmente mas NÃO auto-inicializar
// O InstitutionalDashboard usa seu próprio grid e interfere com o sistema principal do Supabase
// Para usar, chame manualmente: window.InstitutionalDashboard.init()
if (typeof window !== 'undefined') {
    window.InstitutionalDashboard = InstitutionalDashboard;
    
    // DESABILITADO: Auto-init interfere com o sistema principal de oportunidades
    // Se quiser usar o sistema institucional separado, descomente abaixo:
    /*
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            InstitutionalDashboard.init();
        });
    } else {
        InstitutionalDashboard.init();
    }
    */
    console.log('📊 InstitutionalDashboard disponível (não auto-inicializado). Use window.InstitutionalDashboard.init() para ativar.');
}
