-- Fix auth_nonces table permissions
-- Run this SQL in the Supabase SQL Editor

-- First, check if table exists, if not create it
CREATE TABLE IF NOT EXISTS public.auth_nonces (
  nonce TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS auth_nonces_address_idx ON public.auth_nonces (address);
CREATE INDEX IF NOT EXISTS auth_nonces_expires_idx ON public.auth_nonces (expires_at);

-- Disable RLS (critical for Edge Functions to work)
ALTER TABLE public.auth_nonces DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might interfere
DROP POLICY IF EXISTS "auth_nonces_service_all" ON public.auth_nonces;
DROP POLICY IF EXISTS "auth_nonces_anon_all" ON public.auth_nonces;

-- Grant all permissions to service_role (used by Edge Functions)
GRANT ALL ON public.auth_nonces TO service_role;
GRANT ALL ON public.auth_nonces TO postgres;
GRANT ALL ON public.auth_nonces TO anon;
GRANT ALL ON public.auth_nonces TO authenticated;

-- Clean up any stale nonces older than 1 hour
DELETE FROM public.auth_nonces 
WHERE expires_at < NOW() - INTERVAL '1 hour';

-- Add a test nonce to verify everything works (will be cleaned up on next cleanup)
INSERT INTO public.auth_nonces (nonce, address, expires_at, used_at)
VALUES ('TEST_NONCE_DELETE_ME', '0x0000000000000000000000000000000000000000', NOW() + INTERVAL '1 minute', NULL)
ON CONFLICT (nonce) DO NOTHING;

-- Verify by selecting
SELECT COUNT(*) as nonce_count FROM public.auth_nonces;

-- Show table info
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'auth_nonces' 
AND table_schema = 'public';
