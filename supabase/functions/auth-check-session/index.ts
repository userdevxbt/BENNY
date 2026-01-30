// @ts-nocheck
// Supabase Edge Function - Check Session Validity
// Validates persistent session tokens for mobile users

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !serviceKey) {
      console.error("Missing env vars");
      return jsonResponse({ ok: false, error: "Server configuration error" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const sessionToken = String(body?.sessionToken ?? "").trim();
    
    if (!sessionToken) {
      return jsonResponse({ ok: false, error: "Missing session token" }, 400);
    }

    // Validar sessão usando a função do banco
    const { data: sessionData, error: sessionErr } = await supabase
      .rpc('validate_auth_session', { p_token: sessionToken });

    if (sessionErr) {
      console.error("Session validation error:", sessionErr);
      return jsonResponse({ ok: false, error: "Session validation failed" }, 500);
    }

    if (!sessionData || sessionData.length === 0 || !sessionData[0].valid) {
      console.log("Session invalid or expired");
      return jsonResponse({ 
        ok: false, 
        error: "Session expired or invalid",
        expired: true 
      }, 401);
    }

    const session = sessionData[0];
    const address = session.address;

    // Verificar se ainda está na whitelist
    const { data: whitelistRow, error: wlErr } = await supabase
      .from("whitelist")
      .select("wallet_address, is_active, role")
      .ilike("wallet_address", address)
      .maybeSingle();

    if (wlErr) {
      console.error("Whitelist query error:", wlErr);
    }

    const isWhitelisted = !!whitelistRow && whitelistRow.is_active === true;
    const role = whitelistRow?.role ?? null;

    console.log(`Session validated: address=${address}, whitelisted=${isWhitelisted}, remainingDays=${session.remaining_days?.toFixed(2)}`);

    return jsonResponse({
      ok: true,
      address: address,
      whitelisted: isWhitelisted,
      role: role,
      isMobile: session.is_mobile,
      expiresAt: session.expires_at,
      remainingDays: Math.floor(session.remaining_days || 0)
    });

  } catch (err) {
    console.error("Unexpected error:", err?.message || err);
    return jsonResponse({ ok: false, error: "Internal server error" }, 500);
  }
});
