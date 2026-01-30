-- SHDWXBT - Persistent Sessions for Mobile
-- Permite que usuários no mobile mantenham sessão por 7 dias

-- Tabela de sessões persistentes
CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  device_info TEXT,                          -- User-Agent / Device fingerprint
  is_mobile BOOLEAN DEFAULT FALSE,           -- Flag se é dispositivo móvel
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,           -- Padrão: 7 dias para mobile, 24h para desktop
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ                     -- NULL = sessão ativa
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS auth_sessions_address_idx ON public.auth_sessions (address);
CREATE INDEX IF NOT EXISTS auth_sessions_token_idx ON public.auth_sessions (session_token);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_idx ON public.auth_sessions (expires_at);
CREATE INDEX IF NOT EXISTS auth_sessions_active_idx ON public.auth_sessions (address, revoked_at) WHERE revoked_at IS NULL;

-- RLS desabilitado (acesso via Service Role)
ALTER TABLE public.auth_sessions DISABLE ROW LEVEL SECURITY;

-- Função para gerar token de sessão seguro
CREATE OR REPLACE FUNCTION generate_session_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INT;
BEGIN
  -- Gerar token de 64 caracteres
  FOR i IN 1..64 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Função para criar sessão
CREATE OR REPLACE FUNCTION create_auth_session(
  p_address TEXT,
  p_device_info TEXT DEFAULT NULL,
  p_is_mobile BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(session_token TEXT, expires_at TIMESTAMPTZ) AS $$
DECLARE
  v_token TEXT;
  v_expires TIMESTAMPTZ;
  v_duration INTERVAL;
BEGIN
  -- Mobile: 7 dias, Desktop: 24 horas
  IF p_is_mobile THEN
    v_duration := INTERVAL '7 days';
  ELSE
    v_duration := INTERVAL '24 hours';
  END IF;
  
  v_token := generate_session_token();
  v_expires := NOW() + v_duration;
  
  INSERT INTO public.auth_sessions (
    address, 
    session_token, 
    device_info, 
    is_mobile, 
    expires_at
  )
  VALUES (
    lower(p_address), 
    v_token, 
    p_device_info, 
    p_is_mobile, 
    v_expires
  );
  
  RETURN QUERY SELECT v_token, v_expires;
END;
$$ LANGUAGE plpgsql;

-- Função para validar sessão
CREATE OR REPLACE FUNCTION validate_auth_session(p_token TEXT)
RETURNS TABLE(
  valid BOOLEAN,
  address TEXT,
  is_mobile BOOLEAN,
  expires_at TIMESTAMPTZ,
  remaining_days NUMERIC
) AS $$
DECLARE
  v_session RECORD;
BEGIN
  SELECT s.* INTO v_session
  FROM public.auth_sessions s
  WHERE s.session_token = p_token
    AND s.revoked_at IS NULL
    AND s.expires_at > NOW();
  
  IF v_session IS NULL THEN
    RETURN QUERY SELECT 
      FALSE::BOOLEAN, 
      NULL::TEXT, 
      FALSE::BOOLEAN, 
      NULL::TIMESTAMPTZ,
      0::NUMERIC;
  ELSE
    -- Atualizar last_activity
    UPDATE public.auth_sessions 
    SET last_activity_at = NOW() 
    WHERE session_token = p_token;
    
    RETURN QUERY SELECT 
      TRUE::BOOLEAN,
      v_session.address,
      v_session.is_mobile,
      v_session.expires_at,
      EXTRACT(EPOCH FROM (v_session.expires_at - NOW())) / 86400;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para revogar sessão
CREATE OR REPLACE FUNCTION revoke_auth_session(p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.auth_sessions 
  SET revoked_at = NOW() 
  WHERE session_token = p_token 
    AND revoked_at IS NULL;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Função para revogar todas as sessões de um endereço
CREATE OR REPLACE FUNCTION revoke_all_sessions(p_address TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.auth_sessions 
  SET revoked_at = NOW() 
  WHERE address = lower(p_address) 
    AND revoked_at IS NULL;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Limpeza automática de sessões expiradas (rodar via cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.auth_sessions 
  WHERE expires_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE public.auth_sessions IS 'Sessões persistentes para autenticação SIWE - Mobile: 7 dias, Desktop: 24h';
COMMENT ON COLUMN public.auth_sessions.session_token IS 'Token único para identificar a sessão';
COMMENT ON COLUMN public.auth_sessions.is_mobile IS 'True se o dispositivo é móvel (sessão estendida de 7 dias)';
COMMENT ON COLUMN public.auth_sessions.revoked_at IS 'Se não NULL, sessão foi revogada (logout manual)';
