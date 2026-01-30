/**
 * ============================================================================
 * SHDWXBT — Configuration
 * ============================================================================
 * 
 * Centralized configuration for the SHDWXBT trading platform.
 * 
 * ⚠️  IMPORTANT: 
 *     - This file contains PUBLIC configuration only
 *     - Never commit service_role keys or secrets
 *     - For production, load config.local.js before this file
 * 
 * ============================================================================
 */

const SHDWXBT_CONFIG = {
  // ─────────────────────────────────────────────────────────────────────────
  // Supabase Configuration (PUBLIC - anon key only)
  // The anon key is PUBLIC by design - it's safe to expose
  // ─────────────────────────────────────────────────────────────────────────
  SUPABASE_URL: window.SUPABASE_URL || 'https://dbxzwynknesxuvtlissd.supabase.co',
  SUPABASE_ANON_KEY: window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRieHp3eW5rbmVzeHV2dGxpc3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDY0OTYsImV4cCI6MjA4NDM4MjQ5Nn0.far-1warbl3rI1oWyJy9h4O8ZmMxfhi38LRDNXQZ9v8',

  // ─────────────────────────────────────────────────────────────────────────
  // WalletConnect Configuration
  // ─────────────────────────────────────────────────────────────────────────
  WALLETCONNECT_PROJECT_ID: window.WALLETCONNECT_PROJECT_ID || 'YOUR_WALLETCONNECT_PROJECT_ID',

  // ─────────────────────────────────────────────────────────────────────────
  // Application Settings
  // ─────────────────────────────────────────────────────────────────────────
  APP_NAME: 'SHDWXBT',
  APP_DESCRIPTION: 'Institutional Crypto Trading Dashboard',

  // ─────────────────────────────────────────────────────────────────────────
  // Session Configuration
  // ─────────────────────────────────────────────────────────────────────────
  SESSION_KEY: 'shdwxbt_auth',
  SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours

  // ─────────────────────────────────────────────────────────────────────────
  // Routes
  // ─────────────────────────────────────────────────────────────────────────
  ROUTES: {
    LOGIN: 'login.html',
    DASHBOARD: 'dashboard.html',
    ADMIN: 'admin.html'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Edge Functions Endpoints
  // ─────────────────────────────────────────────────────────────────────────
  FUNCTIONS: {
    ANALYZE_SYMBOL: '/functions/v1/analyze-symbol',
    SCAN_MARKET: '/functions/v1/scan-market',
    MARK_TARGET: '/functions/v1/mark-target',
    GET_OPPORTUNITIES: '/functions/v1/get-opportunities',
    GET_WATCHLIST: '/functions/v1/get-watchlist',
    AUTH_NONCE: '/functions/v1/auth-nonce',
    AUTH_VERIFY: '/functions/v1/auth-verify'
  }
};

// Validate configuration
(function validateConfig() {
  if (SHDWXBT_CONFIG.SUPABASE_URL.includes('YOUR_PROJECT_REF')) {
    console.warn('⚠️ SHDWXBT: Supabase URL not configured. Load config.local.js or set window.SUPABASE_URL');
  }
  if (SHDWXBT_CONFIG.SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY')) {
    console.warn('⚠️ SHDWXBT: Supabase anon key not configured. Load config.local.js or set window.SUPABASE_ANON_KEY');
  }
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SHDWXBT_CONFIG;
}
