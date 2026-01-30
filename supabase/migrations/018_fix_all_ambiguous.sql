-- =====================================================
-- BENNY - Fix: Corrigir TODAS as referências ambíguas
-- Resolver: column reference "wallet_address" is ambiguous
-- =====================================================

-- Corrigir função create_trial_user com alias de tabela
CREATE OR REPLACE FUNCTION create_trial_user(p_wallet_address TEXT)
RETURNS TABLE (
    wallet_address TEXT,
    is_active BOOLEAN,
    role TEXT,
    is_trial BOOLEAN,
    trial_started_at TIMESTAMPTZ,
    trial_ends_at TIMESTAMPTZ
) AS $$
DECLARE
    v_trial_start TIMESTAMPTZ := NOW();
    v_trial_end TIMESTAMPTZ := NOW() + INTERVAL '7 days';
BEGIN
    -- Inserir novo usuário em trial
    INSERT INTO public.whitelist (
        wallet_address,
        role,
        is_active,
        is_trial,
        trial_started_at,
        trial_ends_at,
        notes
    ) VALUES (
        LOWER(p_wallet_address),
        'User',
        TRUE,
        TRUE,
        v_trial_start,
        v_trial_end,
        'Trial de 7 dias - criado automaticamente'
    )
    ON CONFLICT (wallet_address) DO UPDATE SET
        -- Se usuário já existe mas trial expirou, renovar trial apenas se is_active = FALSE
        trial_started_at = CASE 
            WHEN whitelist.is_active = FALSE AND whitelist.is_trial = TRUE 
            THEN v_trial_start 
            ELSE whitelist.trial_started_at 
        END,
        trial_ends_at = CASE 
            WHEN whitelist.is_active = FALSE AND whitelist.is_trial = TRUE 
            THEN v_trial_end 
            ELSE whitelist.trial_ends_at 
        END,
        is_active = CASE 
            WHEN whitelist.trial_ends_at > NOW() OR whitelist.is_active = TRUE 
            THEN TRUE 
            ELSE FALSE 
        END;

    -- Retornar dados do usuário usando alias
    RETURN QUERY
    SELECT 
        w.wallet_address,
        w.is_active,
        w.role,
        w.is_trial,
        w.trial_started_at,
        w.trial_ends_at
    FROM public.whitelist w
    WHERE LOWER(w.wallet_address) = LOWER(p_wallet_address);
END;
$$ LANGUAGE plpgsql;

-- Corrigir função check_user_access com alias de tabela
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
    -- Buscar usuário usando alias de tabela
    SELECT 
        w.wallet_address,
        w.is_active,
        w.role,
        w.is_trial,
        w.trial_started_at,
        w.trial_ends_at
    INTO v_user
    FROM public.whitelist w
    WHERE LOWER(w.wallet_address) = LOWER(p_wallet_address)
    LIMIT 1;

    -- Se não encontrou, criar trial
    IF v_user IS NULL THEN
        -- Criar novo usuário em trial
        SELECT 
            wallet_address,
            is_active,
            role,
            is_trial,
            trial_started_at,
            trial_ends_at
        INTO v_user
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
                UPDATE public.whitelist w
                SET is_active = TRUE 
                WHERE LOWER(w.wallet_address) = LOWER(p_wallet_address);
            END IF;
        
        -- Trial expirado
        ELSIF v_user.is_trial = TRUE AND v_user.trial_ends_at <= NOW() THEN
            v_has_access := FALSE;
            v_is_trial := TRUE;
            v_is_whitelisted := FALSE;
            v_days_remaining := 0;
            
            -- Desativar usuário se trial expirou
            UPDATE public.whitelist w
            SET is_active = FALSE 
            WHERE LOWER(w.wallet_address) = LOWER(p_wallet_address);
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

COMMENT ON FUNCTION create_trial_user IS 'Cria automaticamente um trial de 7 dias para novos usuários - FIX: sem ambiguidade';
COMMENT ON FUNCTION check_user_access IS 'Verifica se usuário tem acesso (trial válido ou whitelist permanente) - FIX: sem ambiguidade';
