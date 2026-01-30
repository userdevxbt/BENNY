// @ts-nocheck
// Supabase Edge Function - Logout / Revoke Session

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
    const address = String(body?.address ?? "").trim();
    const logoutAll = body?.logoutAll === true;

    // Logout de todas as sessões (usado quando quer revogar tudo)
    if (logoutAll && address) {
      const { data: count, error } = await supabase
        .rpc('revoke_all_sessions', { p_address: address });

      if (error) {
        console.error("Revoke all sessions error:", error);
        return jsonResponse({ ok: false, error: "Failed to revoke sessions" }, 500);
      }

      console.log(`Revoked ${count} sessions for ${address}`);
      return jsonResponse({ ok: true, revokedCount: count });
    }

    // Logout de sessão específica
    if (sessionToken) {
      const { data: revoked, error } = await supabase
        .rpc('revoke_auth_session', { p_token: sessionToken });

      if (error) {
        console.error("Revoke session error:", error);
        return jsonResponse({ ok: false, error: "Failed to revoke session" }, 500);
      }

      console.log(`Session revoked: ${revoked}`);
      return jsonResponse({ ok: true, revoked: revoked });
    }

    return jsonResponse({ ok: false, error: "Missing sessionToken or address" }, 400);

  } catch (err) {
    console.error("Unexpected error:", err?.message || err);
    return jsonResponse({ ok: false, error: "Internal server error" }, 500);
  }
});
