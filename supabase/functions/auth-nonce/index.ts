// @ts-nocheck
// Supabase Edge Function - Auth Nonce Generator

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

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

function generateNonce(length = 22) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
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
    const supabase = createClient(supabaseUrl, serviceKey);

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const addressRaw = String(body?.address ?? "").trim();
    
    if (!addressRaw) {
      return jsonResponse({ ok: false, error: "Missing address" }, 400);
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(addressRaw)) {
      return jsonResponse({ ok: false, error: "Invalid Ethereum address format" }, 400);
    }

    const address = addressRaw.toLowerCase();
    const nonce = generateNonce(22);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutos (aumentado para evitar expiração)

    // Limpar apenas nonces expirados para esse endereço
    const { data: deletedData, error: deleteError } = await supabase
      .from("auth_nonces")
      .delete()
      .eq("address", address)
      .lt("expires_at", new Date().toISOString())
      .select();
    
    if (deleteError) {
      console.warn("Error cleaning old nonces:", deleteError);
    } else if (deletedData && deletedData.length > 0) {
      console.log(`Cleaned ${deletedData.length} expired nonces for ${address}`);
    }

    const { data: insertedData, error } = await supabase
      .from("auth_nonces")
      .insert({ nonce, address, expires_at: expiresAt, used_at: null })
      .select();

    if (error) {
      console.error("Database error:", error);
      return jsonResponse({ ok: false, error: "Failed to generate nonce" }, 500);
    }

    console.log(`Nonce generated for ${address}: ${nonce}, expires: ${expiresAt}`);
    console.log(`Inserted data:`, insertedData);

    return jsonResponse({ ok: true, nonce, expiresAt });

  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ ok: false, error: "Internal server error" }, 500);
  }
});
