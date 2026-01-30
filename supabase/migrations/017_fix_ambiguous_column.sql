-- =====================================================
-- BENNY - Fix: Corrigir erro de coluna ambígua
-- Resolver: column reference "wallet_address" is ambiguous
-- =====================================================

-- Recriar função check_user_access com referências de coluna explícitas
CREATE OR REPLACE FUNCTION check_user_access(p_wallet_address TEXT)
RETURNS TABLE (
    has_access BOOLEAN,
    is_trial BOOLEAN,
    is_whitelisted BOOLEAN,
    trial_days_remaining INTEGER,
    role TEXT
) AS $$
DECLARE
    v_user RECORD;
    v_has_access BOOLEAN := FALSE;
    v_is_trial BOOLEAN := FALSE;
    v_is_whitelisted BOOLEAN := FALSE;
    v_days_remaining INTEGER := 0;
BEGIN
    -- Buscar usuário (com referência explícita à coluna)
    SELECT * INTO v_user
    FROM public.whitelist
    WHERE LOWER(public.whitelist.wallet_address) = LOWER(p_wallet_address)
    LIMIT 1;

    -- Se não encontrou, criar trial
    IF v_user IS NULL THEN
        -- Criar novo usuário em trial
        SELECT * INTO v_user
        FROM create_trial_user(p_wallet_address)
        LIMIT 1;
    END IF;

    -- Verificar acesso
    IF v_user IS NOT NULL THEN
        -- Usuário whitelisted permanente (não é trial)
        IF v_user.is_active = TRUE AND (v_user.is_trial = FALSE OR v_user.is_trial IS NULL) THEN
            v_has_access := TRUE;
            v_is_whitelisted := TRUE;
            v_is_trial := FALSE;
        
        -- Usuário em trial válido
        ELSIF v_user.is_trial = TRUE AND v_user.trial_ends_at > NOW() THEN
            v_has_access := TRUE;
            v_is_trial := TRUE;
            v_is_whitelisted := FALSE;
            v_days_remaining := EXTRACT(DAY FROM (v_user.trial_ends_at - NOW()))::INTEGER;
            
            -- Atualizar is_active se estiver FALSE mas trial ainda válido
            IF v_user.is_active = FALSE THEN
                UPDATE public.whitelist 
                SET is_active = TRUE 
                WHERE LOWER(public.whitelist.wallet_address) = LOWER(p_wallet_address);
            END IF;
        
        -- Trial expirado
        ELSIF v_user.is_trial = TRUE AND v_user.trial_ends_at <= NOW() THEN
            v_has_access := FALSE;
            v_is_trial := TRUE;
            v_is_whitelisted := FALSE;
            v_days_remaining := 0;
            
            -- Desativar usuário se trial expirou
            UPDATE public.whitelist 
            SET is_active = FALSE 
            WHERE LOWER(public.whitelist.wallet_address) = LOWER(p_wallet_address);
        END IF;
    END IF;

    -- Retornar resultado
    RETURN QUERY SELECT 
        v_has_access,
        v_is_trial,
        v_is_whitelisted,
        v_days_remaining,
        COALESCE(v_user.role, 'User');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_user_access IS 'Verifica se usuário tem acesso (trial válido ou whitelist permanente) - FIX: referências explícitas';
