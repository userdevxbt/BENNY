-- =========================================
-- FIX AUTH_NONCES TABLE - FINAL
-- 🎉 BENNY IS NOW PUBLIC - No whitelist!
-- =========================================

-- Garantir que a tabela existe com estrutura correta
CREATE TABLE IF NOT EXISTS public.auth_nonces (
  nonce TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices se não existem
CREATE INDEX IF NOT EXISTS auth_nonces_address_idx ON public.auth_nonces (address);
CREATE INDEX IF NOT EXISTS auth_nonces_expires_idx ON public.auth_nonces (expires_at);
CREATE INDEX IF NOT EXISTS auth_nonces_created_idx ON public.auth_nonces (created_at);

-- IMPORTANTE: Desabilitar RLS para Edge Functions funcionarem
ALTER TABLE public.auth_nonces DISABLE ROW LEVEL SECURITY;

-- Remover todas as policies existentes
DROP POLICY IF EXISTS "auth_nonces_service_all" ON public.auth_nonces;
DROP POLICY IF EXISTS "auth_nonces_anon_all" ON public.auth_nonces;
DROP POLICY IF EXISTS "Enable all for service role" ON public.auth_nonces;
DROP POLICY IF EXISTS "Allow all" ON public.auth_nonces;

-- Garantir permissões totais
GRANT ALL ON public.auth_nonces TO service_role;
GRANT ALL ON public.auth_nonces TO postgres;
GRANT ALL ON public.auth_nonces TO anon;
GRANT ALL ON public.auth_nonces TO authenticated;

-- Limpar nonces antigos (mais de 1 hora)
DELETE FROM public.auth_nonces 
WHERE expires_at < NOW() - INTERVAL '1 hour';

-- Limpar nonces usados antigos
DELETE FROM public.auth_nonces 
WHERE used_at IS NOT NULL 
AND used_at < NOW() - INTERVAL '1 hour';

-- =========================================
-- FUNÇÃO PARA LIMPEZA AUTOMÁTICA DE NONCES
-- =========================================
CREATE OR REPLACE FUNCTION cleanup_expired_nonces()
RETURNS void AS $$
BEGIN
  DELETE FROM public.auth_nonces 
  WHERE expires_at < NOW() 
     OR (used_at IS NOT NULL AND used_at < NOW() - INTERVAL '1 hour');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissão para executar a função
GRANT EXECUTE ON FUNCTION cleanup_expired_nonces() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_nonces() TO anon;

-- =========================================
-- VERIFICAÇÃO FINAL
-- =========================================
DO $$
BEGIN
  RAISE NOTICE '✅ auth_nonces table configured for PUBLIC access';
  RAISE NOTICE '✅ RLS disabled for Edge Functions compatibility';
  RAISE NOTICE '✅ All permissions granted';
END $$;

-- Mostrar estatísticas
SELECT 
  COUNT(*) as total_nonces,
  COUNT(*) FILTER (WHERE used_at IS NULL AND expires_at > NOW()) as valid_nonces,
  COUNT(*) FILTER (WHERE used_at IS NOT NULL) as used_nonces,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired_nonces
FROM public.auth_nonces;
