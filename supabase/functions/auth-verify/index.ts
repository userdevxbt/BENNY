// @ts-nocheck
// Supabase Edge Function - SIWE Signature Verification

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ethers } from "https://esm.sh/ethers@6.9.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseSiweDomain(message) {
  const firstLine = message.split("\n")[0]?.trim() ?? "";
  const match = firstLine.match(/^([^\s]+)\s+wants you to sign in/i);
  return match?.[1]?.trim() ?? null;
}

function parseSiweAddress(message) {
  const lines = message.split("\n").map((l) => l.trim());
  const found = lines.find((l) => /^0x[a-fA-F0-9]{40}$/.test(l));
  return found ?? null;
}

function parseSiweField(message, label) {
  const regex = new RegExp(`^${label}:\\s*(.+)\\s*$`, "mi");
  const match = message.match(regex);
  return match?.[1]?.trim() ?? null;
}

const ALLOWED_DOMAINS = new Set([
  "bennybsc.xyz",
  "www.bennybsc.xyz",
  "benny.bennybsc.xyz",
  "app.bennybsc.xyz",
  "localhost",
  "localhost:3000",
  "localhost:5500",
  "localhost:5501",
  "localhost:8080",
  "127.0.0.1",
  "127.0.0.1:3000",
  "127.0.0.1:5500",
  "127.0.0.1:5501",
  "127.0.0.1:8080",
  // Adicionar domínios de preview/staging se necessário
]);

const ALLOWED_URI_PREFIXES = [
  "https://bennybsc.xyz",
  "https://www.bennybsc.xyz",
  "https://benny.bennybsc.xyz",
  "https://app.bennybsc.xyz",
  "http://localhost",
  "http://127.0.0.1",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    // Verificar env vars
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !serviceKey) {
      console.error("Missing env vars: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return jsonResponse({ ok: false, error: "Server configuration error" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const message = String(body?.message ?? "").trim();
    const signature = String(body?.signature ?? "").trim();
    const addressInput = String(body?.address ?? "").trim();
    const isMobile = body?.isMobile === true;
    const deviceInfo = String(body?.deviceInfo ?? "").trim() || null;
    const createSession = body?.createSession !== false; // Default: true

    if (!message || !signature) {
      return jsonResponse({ ok: false, error: "Missing message or signature" }, 400);
    }

    const domain = parseSiweDomain(message);
    const siweAddress = parseSiweAddress(message);
    const nonce = parseSiweField(message, "Nonce");
    const uri = parseSiweField(message, "URI");
    const chainId = parseSiweField(message, "Chain ID");
    const issuedAt = parseSiweField(message, "Issued At");

    console.log("SIWE Parse:", { domain, siweAddress, nonce, uri, chainId, issuedAt });

    if (!domain || !siweAddress || !nonce || !uri) {
      return jsonResponse({ ok: false, error: "Malformed SIWE message" }, 400);
    }

    // Validar domínio - MAIS FLEXÍVEL para desenvolvimento e produção
    const domainLower = domain.toLowerCase().replace(/^www\./, ''); // Remove www. prefix
    const isAllowedDomain = ALLOWED_DOMAINS.has(domainLower) || 
                           ALLOWED_DOMAINS.has(`www.${domainLower}`) ||
                           ALLOWED_DOMAINS.has(domain.toLowerCase()) ||
                           domainLower.includes("localhost") ||
                           domainLower.includes("127.0.0.1") ||
                           domainLower.endsWith(".pages.dev") ||
                           domainLower.endsWith(".github.io") ||
                           domainLower.endsWith(".vercel.app") ||
                           domainLower.endsWith(".netlify.app") ||
                           domainLower === "bennybsc.xyz" ||
                           domainLower.endsWith(".bennybsc.xyz");
    
    console.log("Domain validation:", { domain, domainLower, isAllowedDomain });
    
    if (!isAllowedDomain) {
      console.warn(`Invalid domain: ${domain}`);
      return jsonResponse({ ok: false, error: `Invalid domain: ${domain}` }, 401);
    }

    // Validar URI - MAIS FLEXÍVEL
    const uriLower = uri.toLowerCase();
    const uriValid = ALLOWED_URI_PREFIXES.some(prefix => uriLower.startsWith(prefix.toLowerCase())) ||
                     uriLower.includes("localhost") ||
                     uriLower.includes("127.0.0.1") ||
                     uriLower.includes(".pages.dev") ||
                     uriLower.includes(".github.io") ||
                     uriLower.includes(".vercel.app") ||
                     uriLower.includes(".netlify.app") ||
                     uriLower.includes("bennybsc.xyz");
    
    console.log("URI validation:", { uri, uriLower, uriValid });
    
    if (!uriValid) {
      console.warn(`Invalid URI: ${uri}`);
      return jsonResponse({ ok: false, error: "Invalid URI origin" }, 401);
    }

    // Verificar assinatura
    let recoveredAddress;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (err) {
      console.error("Signature verification failed:", err);
      return jsonResponse({ ok: false, error: "Invalid signature" }, 401);
    }

    const recoveredLower = recoveredAddress.toLowerCase();
    const siweAddressLower = siweAddress.toLowerCase();
    const inputAddressLower = addressInput?.toLowerCase() || siweAddressLower;

    if (recoveredLower !== siweAddressLower) {
      console.warn(`Address mismatch: recovered=${recoveredLower}, siwe=${siweAddressLower}`);
      return jsonResponse({ ok: false, error: "Signature does not match address" }, 401);
    }

    if (addressInput && recoveredLower !== inputAddressLower) {
      return jsonResponse({ ok: false, error: "Signature does not match provided address" }, 401);
    }

    console.log(`Signature verified for: ${recoveredLower}`);

    // Buscar nonce no banco
    console.log(`Looking for nonce: ${nonce} for address: ${recoveredLower}`);
    
    const { data: nonceRow, error: nonceErr } = await supabase
      .from("auth_nonces")
      .select("nonce, address, expires_at, used_at")
      .eq("nonce", nonce)
      .maybeSingle();

    console.log(`Nonce query result:`, { nonceRow, nonceErr });

    if (nonceErr) {
      console.error("Nonce query error:", JSON.stringify(nonceErr));
      return jsonResponse({ ok: false, error: `nonce_db_error: ${nonceErr.message}` }, 500);
    }

    if (!nonceRow) {
      // Tentar buscar todos os nonces para esse endereço para debug
      const { data: allNonces } = await supabase
        .from("auth_nonces")
        .select("nonce, address, expires_at, used_at")
        .eq("address", recoveredLower)
        .order("expires_at", { ascending: false })
        .limit(5);
      
      console.warn(`Nonce not found: ${nonce}. Available nonces for ${recoveredLower}:`, allNonces);
      return jsonResponse({ ok: false, error: "Nonce not found or expired" }, 401);
    }

    if ((nonceRow.address ?? "").toLowerCase() !== recoveredLower) {
      console.warn(`Nonce address mismatch: ${nonceRow.address} vs ${recoveredLower}`);
      return jsonResponse({ ok: false, error: "Nonce address mismatch" }, 401);
    }

    if (nonceRow.used_at) {
      console.warn(`Nonce already used: ${nonce}`);
      return jsonResponse({ ok: false, error: "Nonce already used" }, 401);
    }

    const expiresAtMs = Date.parse(nonceRow.expires_at);
    if (Number.isFinite(expiresAtMs) && Date.now() > expiresAtMs) {
      console.warn(`Nonce expired: ${nonceRow.expires_at}`);
      return jsonResponse({ ok: false, error: "Nonce expired" }, 401);
    }

    if (issuedAt) {
      const issuedMs = Date.parse(issuedAt);
      const maxAge = 30 * 60 * 1000;
      if (Number.isFinite(issuedMs) && Date.now() - issuedMs > maxAge) {
        return jsonResponse({ ok: false, error: "Message timestamp too old" }, 401);
      }
    }

    // Consumir nonce
    const { error: consumeErr } = await supabase
      .from("auth_nonces")
      .update({ used_at: new Date().toISOString() })
      .eq("nonce", nonce);

    if (consumeErr) {
      console.error("Consume nonce error:", JSON.stringify(consumeErr));
      return jsonResponse({ ok: false, error: `consume_nonce_error: ${consumeErr.message}` }, 500);
    }

    // 🎉 BENNY IS NOW PUBLIC - No whitelist required!
    // All wallets have full access
    console.log(`✅ PUBLIC ACCESS: Granting full access to ${recoveredLower}`);
    
    const hasAccess = true;
    const isTrial = false; // Not trial - full access!
    const isWhitelisted = true; // Everyone is welcome!
    const trialDaysRemaining = 0;
    const role = 'User';

    console.log(`✅ Access granted: address=${recoveredLower}, publicAccess=true`);

    // Criar sessão persistente se solicitado e usuário tem acesso
    let sessionToken = null;
    let sessionExpiresAt = null;

    if (createSession && hasAccess) {
      try {
        const { data: sessionData, error: sessionErr } = await supabase
          .rpc('create_auth_session', { 
            p_address: recoveredLower,
            p_device_info: deviceInfo,
            p_is_mobile: isMobile
          });

        if (sessionErr) {
          console.error("Session creation error:", sessionErr);
          // Não falhar a autenticação por causa de erro na sessão
        } else if (sessionData && sessionData.length > 0) {
          sessionToken = sessionData[0].session_token;
          sessionExpiresAt = sessionData[0].expires_at;
          console.log(`Session created: mobile=${isMobile}, expires=${sessionExpiresAt}`);
        }
      } catch (sessionCreateErr) {
        console.error("Session creation exception:", sessionCreateErr);
      }
    }

    return jsonResponse({
      ok: true,
      address: recoveredLower,
      whitelisted: isWhitelisted,
      isTrial: isTrial,
      trialDaysRemaining: trialDaysRemaining,
      role: role,
      chainId: chainId ? parseInt(chainId, 10) : null,
      // Session info for persistent login
      sessionToken: sessionToken,
      sessionExpiresAt: sessionExpiresAt,
      isMobile: isMobile
    });

  } catch (err) {
    console.error("Unexpected error:", err?.message || err);
    return jsonResponse({ ok: false, error: `unexpected_error: ${err?.message || "unknown"}` }, 500);
  }
});
