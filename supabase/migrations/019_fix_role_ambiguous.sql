-- =====================================================
-- BENNY - Fix: Corrigir ambiguidade da coluna "role"
-- Resolver: column reference "role" is ambiguous
-- =====================================================

-- Corrigir função check_user_access para evitar ambiguidade de "role"
CREATE OR REPLACE FUNCTION check_user_access(p_wallet_address TEXT)
RETURNS TABLE (
    has_access BOOLEAN,
    is_trial BOOLEAN,
    is_whitelisted BOOLEAN,
    trial_days_remaining INTEGER,
    role TEXT
) AS $$
DECLARE
    v_wallet_address TEXT;
    v_is_active BOOLEAN;
    v_role TEXT;
    v_is_trial BOOLEAN;
    v_trial_started_at TIMESTAMPTZ;
    v_trial_ends_at TIMESTAMPTZ;
    v_has_access BOOLEAN := FALSE;
    v_is_trial_user BOOLEAN := FALSE;
    v_is_whitelisted BOOLEAN := FALSE;
    v_days_remaining INTEGER := 0;
BEGIN
    -- Buscar usuário usando variáveis explícitas
    SELECT 
        w.wallet_address,
        w.is_active,
        w.role,
        w.is_trial,
        w.trial_started_at,
        w.trial_ends_at
    INTO 
        v_wallet_address,
        v_is_active,
        v_role,
        v_is_trial,
        v_trial_started_at,
        v_trial_ends_at
    FROM public.whitelist w
    WHERE LOWER(w.wallet_address) = LOWER(p_wallet_address)
    LIMIT 1;

    -- Se não encontrou, criar trial
    IF v_wallet_address IS NULL THEN
        -- Criar novo usuário em trial
        SELECT 
            t.wallet_address,
            t.is_active,
            t.role,
            t.is_trial,
            t.trial_started_at,
            t.trial_ends_at
        INTO 
            v_wallet_address,
            v_is_active,
            v_role,
            v_is_trial,
            v_trial_started_at,
            v_trial_ends_at
        FROM create_trial_user(p_wallet_address) t
        LIMIT 1;
    END IF;

    -- Verificar acesso
    IF v_wallet_address IS NOT NULL THEN
        -- Usuário whitelisted permanente (não é trial)
        IF v_is_active = TRUE AND (v_is_trial = FALSE OR v_is_trial IS NULL) THEN
            v_has_access := TRUE;
            v_is_whitelisted := TRUE;
            v_is_trial_user := FALSE;
        
        -- Usuário em trial válido
        ELSIF v_is_trial = TRUE AND v_trial_ends_at > NOW() THEN
            v_has_access := TRUE;
            v_is_trial_user := TRUE;
            v_is_whitelisted := FALSE;
            v_days_remaining := EXTRACT(DAY FROM (v_trial_ends_at - NOW()))::INTEGER;
            
            -- Atualizar is_active se estiver FALSE mas trial ainda válido
            IF v_is_active = FALSE THEN
                UPDATE public.whitelist w
                SET is_active = TRUE 
                WHERE LOWER(w.wallet_address) = LOWER(p_wallet_address);
            END IF;
        
        -- Trial expirado
        ELSIF v_is_trial = TRUE AND v_trial_ends_at <= NOW() THEN
            v_has_access := FALSE;
            v_is_trial_user := TRUE;
            v_is_whitelisted := FALSE;
            v_days_remaining := 0;
            
            -- Desativar usuário se trial expirou
            UPDATE public.whitelist w
            SET is_active = FALSE 
            WHERE LOWER(w.wallet_address) = LOWER(p_wallet_address);
        END IF;
    END IF;

    -- Retornar resultado usando variáveis locais explícitas
    RETURN QUERY SELECT 
        v_has_access,
        v_is_trial_user,
        v_is_whitelisted,
        v_days_remaining,
        COALESCE(v_role, 'User')::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_user_access IS 'Verifica acesso do usuário (trial ou whitelist) - FIX: sem ambiguidade de role';
