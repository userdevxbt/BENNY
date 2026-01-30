let walletModal = null;
let currentWalletProvider = null;
let walletConnectProvider = null;
let web3modal = null;

// WalletConnect Project ID - From Reown Cloud (cloud.reown.com)
const WALLETCONNECT_PROJECT_ID = '802b1ed59d05d8007adfa5d5a2ed175c';

// ========================================
// MOBILE DETECTION
// ========================================
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isInAppBrowser() {
    // Detecta se está dentro do browser do app de carteira
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    return /MetaMask|Trust\/|OneKey/i.test(ua) || 
           (window.ethereum && (window.ethereum.isMetaMask || window.ethereum.isTrust)) ||
           (window.$onekey && window.$onekey.ethereum);
}

// ========================================
// INICIALIZAÇÃO
// ========================================
function initWalletModal() {
    walletModal = document.getElementById('walletModal');
    
    // Se mobile e já está no in-app browser, auto-conectar
    if (isMobile() && isInAppBrowser()) {
        console.log('📱 Detected in-app browser, will auto-connect');
    }
    
    // Inicializar WalletConnect
    initWalletConnect();
}

// ========================================
// WALLETCONNECT V2 INITIALIZATION
// ========================================
let wcProviderModule = null;

async function loadWalletConnectModules() {
    // Verificar se já foi carregado via script tag (UMD global)
    if (window.EthereumProvider) {
        console.log('✅ WalletConnect loaded from global (UMD)');
        return { EthereumProvider: window.EthereumProvider };
    }
    
    if (wcProviderModule) {
        return { EthereumProvider: wcProviderModule };
    }
    
    console.log('📦 Loading WalletConnect modules...');
    
    // Fallback: carregar dinamicamente se não estiver disponível globalmente
    const cdnUrls = [
        'https://esm.sh/@walletconnect/ethereum-provider@2.11.2',
        'https://cdn.jsdelivr.net/npm/@walletconnect/ethereum-provider@2.11.2/+esm'
    ];
    
    let lastError = null;
    
    for (const url of cdnUrls) {
        try {
            console.log(`📦 Trying: ${url.split('/')[2]}...`);
            const providerMod = await import(url);
            
            wcProviderModule = providerMod.EthereumProvider || providerMod.default;
            
            if (wcProviderModule && typeof wcProviderModule.init === 'function') {
                console.log('✅ WalletConnect provider loaded successfully');
                return { EthereumProvider: wcProviderModule };
            }
        } catch (e) {
            console.warn(`Failed to load from ${url.split('/')[2]}:`, e.message);
            lastError = e;
        }
    }
    
    console.error('Failed to load WalletConnect from all sources:', lastError);
    throw new Error('Failed to load WalletConnect. Please refresh the page and try again.');
}

async function initWalletConnect() {
    try {
        console.log('🔗 WalletConnect ready for on-demand loading');
    } catch (error) {
        console.error('WalletConnect init error:', error);
    }
}

// ========================================
// WALLETCONNECT CONNECTION
// ========================================
async function connectWalletConnect() {
    try {
        console.log('🔗 Connecting via WalletConnect...');
        closeWalletModal();
        
        // Mostrar loading feedback
        const feedbackEl = document.getElementById('feedback-msg');
        if (feedbackEl) {
            feedbackEl.innerText = 'Loading WalletConnect...';
            feedbackEl.classList.remove('text-transparent');
            feedbackEl.classList.add('text-white/50');
        }
        
        // Carregar módulos dinamicamente
        const { EthereumProvider } = await loadWalletConnectModules();
        
        if (feedbackEl) {
            feedbackEl.innerText = 'Connecting...';
        }
        
        // No mobile, usar abordagem diferente
        if (isMobile()) {
            console.log('📱 Mobile detected, using custom flow...');
            
            // Criar provider sem modal QR
            walletConnectProvider = await EthereumProvider.init({
                projectId: WALLETCONNECT_PROJECT_ID,
                chains: [1],
                optionalChains: [56, 137, 42161, 10, 8453, 43114],
                showQrModal: false, // Nunca mostrar modal no mobile
                metadata: {
                    name: 'BENNY',
                    description: 'BENNY Trading Platform',
                    url: 'https://bennybsc.xyz',
                    icons: ['https://bennybsc.xyz/favicon.ico']
                },
                relayUrl: 'wss://relay.walletconnect.com'
            });
            
            // Configurar listener ANTES de conectar
            let uriReceived = false;
            
            walletConnectProvider.on('display_uri', (uri) => {
                console.log('📱 URI received:', uri ? uri.substring(0, 60) + '...' : 'null');
                uriReceived = true;
                if (uri) {
                    updateMobileWalletList(uri);
                }
            });
            
            // Mostrar modal com loading imediatamente
            showMobileWalletOptions(null);
            
            // Iniciar conexão - isso vai disparar display_uri
            console.log('📱 Starting connection...');
            
            try {
                // Usar Promise.race para timeout
                const connectionPromise = walletConnectProvider.connect();
                
                // Se depois de 2 segundos não recebemos URI, tentar obter manualmente
                setTimeout(() => {
                    if (!uriReceived && walletConnectProvider.uri) {
                        console.log('📱 Using provider.uri fallback');
                        updateMobileWalletList(walletConnectProvider.uri);
                    }
                }, 2000);
                
                await connectionPromise;
                hideMobileWalletOptions();
                
            } catch (error) {
                hideMobileWalletOptions();
                if (error.message?.includes('User rejected') || error.message?.includes('closed')) {
                    throw new Error('Connection cancelled');
                }
                throw error;
            }
            
        } else {
            // Desktop - criar provider com modal QR
            walletConnectProvider = await EthereumProvider.init({
                projectId: WALLETCONNECT_PROJECT_ID,
                chains: [1],
                optionalChains: [56, 137, 42161, 10, 8453, 43114],
                showQrModal: true,
                qrModalOptions: {
                    themeMode: 'dark',
                    themeVariables: {
                        '--wcm-z-index': '999999',
                        '--wcm-accent-color': '#a855f7',
                        '--wcm-background-color': '#18181b'
                    }
                },
                metadata: {
                    name: 'BENNY',
                    description: 'BENNY Trading Platform',
                    url: 'https://bennybsc.xyz',
                    icons: ['https://bennybsc.xyz/favicon.ico']
                },
                relayUrl: 'wss://relay.walletconnect.com'
            });
            
            console.log('🖥️ Desktop: using QR modal...');
            await walletConnectProvider.connect();
        }
        
        // Obter contas
        const accounts = walletConnectProvider.accounts;
        
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts returned from WalletConnect');
        }
        
        // Criar provider ethers compatível
        const provider = new ethers.providers.Web3Provider(walletConnectProvider);
        window.currentSigner = provider.getSigner();
        window.currentProvider = walletConnectProvider;
        window.currentEthersProvider = provider;
        
        // Configurar event listeners
        walletConnectProvider.on('disconnect', () => {
            console.log('🔌 WalletConnect disconnected');
            window.currentSigner = null;
            window.currentProvider = null;
            window.currentEthersProvider = null;
            walletConnectProvider = null;
        });
        
        walletConnectProvider.on('accountsChanged', (newAccounts) => {
            console.log('👛 WalletConnect accounts changed:', newAccounts);
            if (newAccounts.length === 0) {
                window.currentSigner = null;
                window.currentProvider = null;
            }
        });
        
        console.log('✅ WalletConnect connected:', accounts[0]);
        return accounts[0].toLowerCase();
        
    } catch (error) {
        console.error('WalletConnect error:', error);
        hideMobileWalletOptions();
        
        if (error.message?.includes('User rejected') || error.message?.includes('User closed')) {
            throw new Error('Connection rejected by user');
        }
        
        throw error;
    }
}

// ========================================
// MOBILE WALLET OPTIONS MODAL
// ========================================
function showMobileWalletOptions(wcUri) {
    // Criar modal de opções de carteira mobile
    let mobileModal = document.getElementById('mobileWalletModal');
    if (!mobileModal) {
        mobileModal = document.createElement('div');
        mobileModal.id = 'mobileWalletModal';
        mobileModal.innerHTML = `
            <style>
                #mobileWalletModal {
                    position: fixed;
                    inset: 0;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 1rem;
                }
                
                #mobileWalletModal.active {
                    display: flex;
                    animation: mobileModalFadeIn 0.3s ease-out;
                }
                
                @keyframes mobileModalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                #mobileWalletModal .modal-backdrop {
                    position: absolute;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(10px);
                }
                
                #mobileWalletModal .mobile-wallet-container {
                    position: relative;
                    width: 100%;
                    max-width: 400px;
                    max-height: 85vh;
                    overflow-y: auto;
                    padding: 2rem;
                    background: rgba(39, 39, 42, 0.98);
                    backdrop-filter: blur(40px) saturate(180%);
                    -webkit-backdrop-filter: blur(40px) saturate(180%);
                    border-radius: 1.5rem;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 
                        0 25px 60px rgba(0, 0, 0, 0.6),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    animation: mobileSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                
                @keyframes mobileSlideIn {
                    from { 
                        transform: translateY(20px) scale(0.95);
                        opacity: 0;
                    }
                    to { 
                        transform: translateY(0) scale(1);
                        opacity: 1;
                    }
                }
                
                #mobileWalletModal .mobile-wallet-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 50%;
                    background: linear-gradient(
                        180deg,
                        rgba(255, 255, 255, 0.06) 0%,
                        transparent 100%
                    );
                    border-radius: 1.5rem 1.5rem 0 0;
                    pointer-events: none;
                }
                
                #mobileWalletModal .close-btn {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 50%;
                    color: rgba(255, 255, 255, 0.6);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 1.25rem;
                }
                
                #mobileWalletModal .close-btn:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    transform: rotate(90deg);
                }
                
                #mobileWalletModal .modal-header {
                    text-align: center;
                    margin-bottom: 1.5rem;
                }
                
                #mobileWalletModal .modal-header h3 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: white;
                    margin-bottom: 0.5rem;
                }
                
                #mobileWalletModal .modal-header p {
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 0.875rem;
                }
                
                #mobileWalletModal .wallet-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                #mobileWalletModal .wallet-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem 1.25rem;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 1rem;
                    text-decoration: none;
                    color: white;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }
                
                #mobileWalletModal .wallet-item::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(
                        135deg,
                        rgba(168, 85, 247, 0.1) 0%,
                        transparent 100%
                    );
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                #mobileWalletModal .wallet-item:hover {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.2);
                    transform: translateX(4px);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                }
                
                #mobileWalletModal .wallet-item:hover::before {
                    opacity: 0;
                }
                
                #mobileWalletModal .wallet-item:active {
                    transform: translateX(4px) scale(0.98);
                }
                
                #mobileWalletModal .wallet-icon {
                    width: 2.5rem;
                    height: 2.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 0.75rem;
                    overflow: hidden;
                }
                
                #mobileWalletModal .wallet-icon img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
                
                #mobileWalletModal .wallet-name {
                    font-weight: 600;
                    font-size: 1rem;
                }
                
                #mobileWalletModal .wallet-arrow {
                    margin-left: auto;
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 1.25rem;
                    transition: transform 0.3s ease;
                }
                
                #mobileWalletModal .wallet-item:hover .wallet-arrow {
                    transform: translateX(4px);
                    color: white;
                }
            </style>
            <div class="modal-backdrop" onclick="hideMobileWalletOptions()"></div>
            <div class="mobile-wallet-container">
                <div class="close-btn" onclick="hideMobileWalletOptions()">✕</div>
                <div class="modal-header">
                    <h3>Choose Wallet</h3>
                    <p>Select your wallet app to connect</p>
                </div>
                <div id="mobileWalletLoading" class="wallet-loading" style="display: none;">
                    <div class="loading-spinner"></div>
                    <p>Generating connection...</p>
                </div>
                <div class="wallet-list" id="mobileWalletList">
                </div>
            </div>
        `;
        
        // Adicionar CSS do loading
        const style = document.createElement('style');
        style.textContent = `
            .wallet-loading {
                text-align: center;
                padding: 2rem;
            }
            .wallet-loading p {
                color: rgba(255,255,255,0.6);
                margin-top: 1rem;
                font-size: 0.875rem;
            }
            .loading-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid rgba(255,255,255,0.1);
                border-top-color: #a855f7;
                border-radius: 50%;
                margin: 0 auto;
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(mobileModal);
    }
    
    const listEl = document.getElementById('mobileWalletList');
    const loadingEl = document.getElementById('mobileWalletLoading');
    
    // Se ainda não temos URI, mostrar loading
    if (!wcUri) {
        if (loadingEl) loadingEl.style.display = 'block';
        if (listEl) listEl.style.display = 'none';
        mobileModal.classList.add('active');
        return;
    }
    
    // Temos URI, mostrar lista de carteiras
    if (loadingEl) loadingEl.style.display = 'none';
    if (listEl) listEl.style.display = 'flex';
    
    // Lista de carteiras populares com deep links e logos reais
    const wallets = [
        { 
            name: 'MetaMask', 
            icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg', 
            deepLink: `https://metamask.app.link/wc?uri=${encodeURIComponent(wcUri)}` 
        },
        { 
            name: 'Trust Wallet', 
            icon: 'https://trustwallet.com/assets/images/media/assets/trust_platform.svg', 
            deepLink: `https://link.trustwallet.com/wc?uri=${encodeURIComponent(wcUri)}` 
        },
        { 
            name: 'Rainbow', 
            icon: 'https://avatars.githubusercontent.com/u/48327834?s=200&v=4', 
            deepLink: `https://rnbwapp.com/wc?uri=${encodeURIComponent(wcUri)}` 
        },
        { 
            name: 'Coinbase Wallet', 
            icon: 'https://avatars.githubusercontent.com/u/18060234?s=200&v=4', 
            deepLink: `https://go.cb-w.com/wc?uri=${encodeURIComponent(wcUri)}` 
        },
        { 
            name: 'Ledger Live', 
            icon: 'https://www.ledger.com/wp-content/uploads/2023/10/Ledger-Live-logo.webp', 
            deepLink: `ledgerlive://wc?uri=${encodeURIComponent(wcUri)}` 
        },
        { 
            name: 'SafePal', 
            icon: 'https://www.safepal.com/images/download/logo.png', 
            deepLink: `safepalwallet://wc?uri=${encodeURIComponent(wcUri)}` 
        },
        { 
            name: 'Zerion', 
            icon: 'https://avatars.githubusercontent.com/u/43045932?s=200&v=4', 
            deepLink: `https://wallet.zerion.io/wc?uri=${encodeURIComponent(wcUri)}` 
        },
        { 
            name: 'imToken', 
            icon: 'https://token.im/img/imTokenLogo.svg', 
            deepLink: `imtokenv2://wc?uri=${encodeURIComponent(wcUri)}` 
        },
    ];
    
    listEl.innerHTML = wallets.map(w => `
        <a href="${w.deepLink}" class="wallet-item" target="_blank" rel="noopener">
            <span class="wallet-icon"><img src="${w.icon}" alt="${w.name}" onerror="this.parentElement.innerHTML='${w.name[0]}'"></span>
            <span class="wallet-name">${w.name}</span>
            <span class="wallet-arrow">→</span>
        </a>
    `).join('');
    
    mobileModal.classList.add('active');
}

// Atualizar lista quando URI chegar
function updateMobileWalletList(wcUri) {
    const listEl = document.getElementById('mobileWalletList');
    const loadingEl = document.getElementById('mobileWalletLoading');
    
    if (!listEl || !wcUri) return;
    
    if (loadingEl) loadingEl.style.display = 'none';
    listEl.style.display = 'flex';
    
    const wallets = [
        { name: 'MetaMask', icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg', deepLink: `https://metamask.app.link/wc?uri=${encodeURIComponent(wcUri)}` },
        { name: 'Trust Wallet', icon: 'https://trustwallet.com/assets/images/media/assets/trust_platform.svg', deepLink: `https://link.trustwallet.com/wc?uri=${encodeURIComponent(wcUri)}` },
        { name: 'Rainbow', icon: 'https://avatars.githubusercontent.com/u/48327834?s=200&v=4', deepLink: `https://rnbwapp.com/wc?uri=${encodeURIComponent(wcUri)}` },
        { name: 'Coinbase Wallet', icon: 'https://avatars.githubusercontent.com/u/18060234?s=200&v=4', deepLink: `https://go.cb-w.com/wc?uri=${encodeURIComponent(wcUri)}` },
        { name: 'Ledger Live', icon: 'https://www.ledger.com/wp-content/uploads/2023/10/Ledger-Live-logo.webp', deepLink: `ledgerlive://wc?uri=${encodeURIComponent(wcUri)}` },
        { name: 'SafePal', icon: 'https://www.safepal.com/images/download/logo.png', deepLink: `safepalwallet://wc?uri=${encodeURIComponent(wcUri)}` },
        { name: 'Zerion', icon: 'https://avatars.githubusercontent.com/u/43045932?s=200&v=4', deepLink: `https://wallet.zerion.io/wc?uri=${encodeURIComponent(wcUri)}` },
        { name: 'imToken', icon: 'https://token.im/img/imTokenLogo.svg', deepLink: `imtokenv2://wc?uri=${encodeURIComponent(wcUri)}` },
    ];
    
    listEl.innerHTML = wallets.map(w => `
        <a href="${w.deepLink}" class="wallet-item" target="_blank" rel="noopener">
            <span class="wallet-icon"><img src="${w.icon}" alt="${w.name}" onerror="this.parentElement.innerHTML='${w.name[0]}'"></span>
            <span class="wallet-name">${w.name}</span>
            <span class="wallet-arrow">→</span>
        </a>
    `).join('');
}

function hideMobileWalletOptions() {
    const mobileModal = document.getElementById('mobileWalletModal');
    if (mobileModal) {
        mobileModal.classList.remove('active');
    }
}

// Função para desconectar WalletConnect
async function disconnectWalletConnect() {
    try {
        if (walletConnectProvider) {
            await walletConnectProvider.disconnect();
            walletConnectProvider = null;
            console.log('🔌 WalletConnect disconnected');
        }
    } catch (error) {
        console.error('Error disconnecting WalletConnect:', error);
    }
}

// Abrir modal de seleção
function openWalletModal() {
    if (walletModal) {
        walletModal.classList.add('active');
    }
}

// Fechar modal
function closeWalletModal() {
    if (walletModal) {
        walletModal.classList.remove('active');
    }
}

// Fechar modal e cancelar conexão
function cancelWalletConnection() {
    closeWalletModal();
    if (window.walletConnectionPromise) {
        window.walletConnectionPromise.reject(new Error('Connection cancelled'));
        window.walletConnectionPromise = null;
    }
}

// ========================================
// 1. METAMASK / INJECTED WALLET
// ========================================
async function connectMetaMask() {
    try {
        console.log('🦊 Connecting MetaMask...');
        closeWalletModal();
        
        // Se mobile e não tem MetaMask injetado, abrir deep link
        if (isMobile() && !window.ethereum?.isMetaMask) {
            const currentUrl = encodeURIComponent(window.location.href);
            const deepLink = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
            
            console.log('📱 Opening MetaMask app via deep link:', deepLink);
            
            // Abrir deep link
            window.location.href = deepLink;
            
            // Throw para parar execução - usuário será redirecionado
            throw new Error('REDIRECT_TO_APP');
        }
        
        if (!window.ethereum) {
            if (isMobile()) {
                const deepLink = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
                window.location.href = deepLink;
                throw new Error('REDIRECT_TO_APP');
            }
            throw new Error('MetaMask not installed. Please install MetaMask extension.');
        }
        
        // Usar MetaMask especificamente se disponível
        let eth = window.ethereum;
        if (window.ethereum.providers) {
            eth = window.ethereum.providers.find(p => p.isMetaMask) || window.ethereum;
        }
        
        const accounts = await eth.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found in MetaMask');
        }
        
        const provider = new ethers.providers.Web3Provider(eth);
        window.currentSigner = provider.getSigner();
        window.currentProvider = eth;
        window.currentEthersProvider = provider;
        
        console.log('✅ MetaMask connected:', accounts[0]);
        return accounts[0].toLowerCase();
        
    } catch (error) {
        if (error.message === 'REDIRECT_TO_APP') {
            // Não mostrar erro, apenas aguardar redirecionamento
            return new Promise(() => {}); // Promise que nunca resolve
        }
        console.error('MetaMask connection error:', error);
        throw error;
    }
}

// ========================================
// 2. ONEKEY WALLET
// ========================================
async function connectOneKey() {
    try {
        console.log('🔑 Connecting OneKey...');
        closeWalletModal();
        
        // Se mobile e não tem OneKey injetado, abrir deep link
        if (isMobile() && !(window.$onekey && window.$onekey.ethereum)) {
            const currentUrl = encodeURIComponent(window.location.href);
            // OneKey deep link
            const deepLink = `onekey-wallet://wc?uri=${currentUrl}`;
            
            console.log('📱 Opening OneKey app via deep link');
            window.location.href = deepLink;
            
            // Fallback para app store após timeout
            setTimeout(() => {
                if (document.visibilityState === 'visible') {
                    // Se ainda visível, app não abriu - redirecionar para store
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                    if (isIOS) {
                        window.location.href = 'https://apps.apple.com/app/onekey/id1609559473';
                    } else {
                        window.location.href = 'https://play.google.com/store/apps/details?id=so.onekey.app.wallet';
                    }
                }
            }, 2500);
            
            throw new Error('REDIRECT_TO_APP');
        }
        
        // OneKey injeta $onekey no window
        if (window.$onekey && window.$onekey.ethereum) {
            const accounts = await window.$onekey.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            const provider = new ethers.providers.Web3Provider(window.$onekey.ethereum);
            window.currentSigner = provider.getSigner();
            window.currentProvider = window.$onekey.ethereum;
            window.currentEthersProvider = provider;
            
            console.log('✅ OneKey connected:', accounts[0]);
            return accounts[0].toLowerCase();
        }
        
        throw new Error('OneKey Wallet not detected. Please install OneKey extension.');
        
    } catch (error) {
        if (error.message === 'REDIRECT_TO_APP') {
            return new Promise(() => {});
        }
        console.error('OneKey error:', error);
        throw error;
    }
}

// ========================================
// 3. TRUST WALLET
// ========================================
async function connectTrust() {
    try {
        console.log('🛡️ Connecting Trust Wallet...');
        closeWalletModal();
        
        // Se já está no app Trust Wallet (in-app browser)
        if (window.ethereum && window.ethereum.isTrust) {
            console.log('📱 Inside Trust Wallet app, connecting...');
            
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            window.currentSigner = provider.getSigner();
            window.currentProvider = window.ethereum;
            window.currentEthersProvider = provider;
            
            console.log('✅ Trust Wallet connected:', accounts[0]);
            return accounts[0].toLowerCase();
        }
        
        // Se mobile mas não está no app Trust, abrir via deep link
        if (isMobile()) {
            const currentUrl = encodeURIComponent(window.location.href);
            // Trust Wallet deep link format atualizado
            const deepLink = `https://link.trustwallet.com/open_url?coin_id=60&url=${currentUrl}`;
            
            console.log('📱 Opening Trust Wallet app via deep link:', deepLink);
            window.location.href = deepLink;
            
            throw new Error('REDIRECT_TO_APP');
        }
        
        // Desktop sem Trust Wallet
        throw new Error('Trust Wallet not detected. Please use Trust Wallet mobile app or install the browser extension.');
        
    } catch (error) {
        if (error.message === 'REDIRECT_TO_APP') {
            return new Promise(() => {});
        }
        console.error('Trust Wallet error:', error);
        throw error;
    }
}

// ========================================
// 4. GENERIC INJECTED WALLET (fallback)
// ========================================
async function connectInjected() {
    try {
        console.log('🔗 Connecting to injected wallet...');
        closeWalletModal();
        
        if (!window.ethereum) {
            throw new Error('No wallet detected. Please install a Web3 wallet.');
        }
        
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found');
        }
        
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        window.currentSigner = provider.getSigner();
        window.currentProvider = window.ethereum;
        window.currentEthersProvider = provider;
        
        console.log('✅ Wallet connected:', accounts[0]);
        return accounts[0].toLowerCase();
        
    } catch (error) {
        console.error('Injected wallet error:', error);
        throw error;
    }
}

// ========================================
// UTILITY: REQUEST WALLET (CALLED BY APP)
// ========================================
async function requestWallet() {
    // Se já está em um in-app browser, conectar diretamente
    if (isMobile() && window.ethereum) {
        console.log('📱 Mobile with injected wallet detected, auto-connecting...');
        try {
            return await connectInjected();
        } catch (e) {
            console.log('Auto-connect failed, showing modal...');
        }
    }
    
    return new Promise((resolve, reject) => {
        // Abrir modal e aguardar seleção
        openWalletModal();
        
        // Timeout de 60 segundos
        const timeout = setTimeout(() => {
            closeWalletModal();
            reject(new Error('Connection timeout. Please try again.'));
            window.walletConnectionPromise = null;
        }, 60000);
        
        // Guardar resolve/reject para uso posterior
        window.walletConnectionPromise = { 
            resolve: (addr) => {
                clearTimeout(timeout);
                resolve(addr);
                window.walletConnectionPromise = null;
            }, 
            reject: (err) => {
                clearTimeout(timeout);
                reject(err);
                window.walletConnectionPromise = null;
            }
        };
    });
}

function handleWalletSelection(connectFn) {
    if (!window.walletConnectionPromise) {
        // Se não tem promise, criar uma nova com handlers simples
        window.walletConnectionPromise = {
            resolve: (addr) => console.log('Connected:', addr),
            reject: (err) => console.error('Failed:', err)
        };
    }
    
    Promise.resolve()
        .then(() => connectFn())
        .then(addr => {
            if (addr && window.walletConnectionPromise) {
                window.walletConnectionPromise.resolve(addr);
            }
        })
        .catch(err => {
            if (err.message !== 'REDIRECT_TO_APP') {
                console.error(err);
                if (window.walletConnectionPromise) {
                    window.walletConnectionPromise.reject(err);
                }
            }
        });
}

// ========================================
// EXPORTS
// ========================================
window.isMobile = isMobile;
window.isInAppBrowser = isInAppBrowser;
window.requestWallet = requestWallet;
window.openWalletModal = openWalletModal;
window.closeWalletModal = closeWalletModal;
window.cancelWalletConnection = cancelWalletConnection;
window.connectMetaMask = connectMetaMask;
window.connectOneKey = connectOneKey;
window.connectTrust = connectTrust;
window.connectInjected = connectInjected;
window.connectWalletConnect = connectWalletConnect;
window.disconnectWalletConnect = disconnectWalletConnect;
window.handleWalletSelection = handleWalletSelection;
window.showMobileWalletOptions = showMobileWalletOptions;
window.hideMobileWalletOptions = hideMobileWalletOptions;

// Inicializar quando DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWalletModal);
} else {
    initWalletModal();
}
