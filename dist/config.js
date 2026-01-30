/**
 * SHDWXBT - config.js
 * Copyright (c) 2024-2026 SHDWXBT. All rights reserved.
 * 
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, modification, distribution, or use is strictly prohibited.
 * This code is protected by intellectual property laws.
 * 
 * Build: 2026-01-28T12:08:12.459Z
 * Checksum: SHDW-5C15F393
 */
const SHDWXBT_CONFIG={SUPABASE_URL:window.SUPABASE_URL||"https://dbxzwynknesxuvtlissd.supabase.co",SUPABASE_ANON_KEY:window.SUPABASE_ANON_KEY||"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRieHp3eW5rbmVzeHV2dGxpc3NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDY0OTYsImV4cCI6MjA4NDM4MjQ5Nn0.far-1warbl3rI1oWyJy9h4O8ZmMxfhi38LRDNXQZ9v8",WALLETCONNECT_PROJECT_ID:window.WALLETCONNECT_PROJECT_ID||"YOUR_WALLETCONNECT_PROJECT_ID",APP_NAME:"SHDWXBT",APP_DESCRIPTION:"Institutional Crypto Trading Dashboard",SESSION_KEY:"shdwxbt_auth",SESSION_DURATION:864e5,ROUTES:{LOGIN:"login.html",DASHBOARD:"dashboard.html",ADMIN:"admin.html"},FUNCTIONS:{ANALYZE_SYMBOL:"/functions/v1/analyze-symbol",SCAN_MARKET:"/functions/v1/scan-market",MARK_TARGET:"/functions/v1/mark-target",GET_OPPORTUNITIES:"/functions/v1/get-opportunities",GET_WATCHLIST:"/functions/v1/get-watchlist",AUTH_NONCE:"/functions/v1/auth-nonce",AUTH_VERIFY:"/functions/v1/auth-verify"}};SHDWXBT_CONFIG.SUPABASE_URL.includes("YOUR_PROJECT_REF")&&console.warn("⚠️ SHDWXBT: Supabase URL not configured. Load config.local.js or set window.SUPABASE_URL"),SHDWXBT_CONFIG.SUPABASE_ANON_KEY.includes("YOUR_ANON_KEY")&&console.warn("⚠️ SHDWXBT: Supabase anon key not configured. Load config.local.js or set window.SUPABASE_ANON_KEY"),"undefined"!=typeof module&&module.exports&&(module.exports=SHDWXBT_CONFIG);