-- SHDWXBT - Tabela whitelist unificada
-- Compatível com Admin Panel E SIWE Authentication

-- Recriar tabela com estrutura correta
DROP TABLE IF EXISTS public.whitelist CASCADE;

CREATE TABLE public.whitelist (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,        -- usado pelo admin panel
  role TEXT NOT NULL DEFAULT 'User',          -- 'Admin' ou 'User'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,    -- usado pelo admin panel
  expires_at TIMESTAMPTZ,                     -- usado pelo admin panel
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX whitelist_wallet_idx ON public.whitelist (wallet_address);
CREATE INDEX whitelist_active_idx ON public.whitelist (is_active);
CREATE INDEX whitelist_role_idx ON public.whitelist (role);

-- Tabela auth_nonces para SIWE
DROP TABLE IF EXISTS public.auth_nonces CASCADE;

CREATE TABLE public.auth_nonces (
  nonce TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX auth_nonces_address_idx ON public.auth_nonces (address);
CREATE INDEX auth_nonces_expires_idx ON public.auth_nonces (expires_at);

-- RLS desabilitado para permitir acesso via anon key (admin panel)
-- As Edge Functions usam Service Role de qualquer forma
ALTER TABLE public.whitelist DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_nonces DISABLE ROW LEVEL SECURITY;

-- Inserir Owner Admin
INSERT INTO public.whitelist (wallet_address, role, is_active) 
VALUES ('0x9fa4a8565ef52e59014d0585f3f1d9c317a41651', 'Admin', TRUE);

-- Inserir Admin
INSERT INTO public.whitelist (wallet_address, role, is_active) 
VALUES ('0x987adc05879ef439e7ae51718c5433b4b3edd278', 'Admin', TRUE);

-- Inserir User
INSERT INTO public.whitelist (wallet_address, role, is_active) 
VALUES ('0xe5aa20630219d862ab0b43fc7ca550d4fc6fb542', 'User', TRUE);
