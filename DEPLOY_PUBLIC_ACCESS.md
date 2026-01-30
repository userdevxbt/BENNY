# 🎉 BENNY IS NOW PUBLIC - Deploy Instructions

## Resumo das Mudanças

O BENNY foi convertido para acesso **público**. Qualquer wallet pode fazer login!

### Arquivos Modificados:

1. **login.html** - Removida verificação de whitelist no frontend
2. **app.js** - `isWhitelisted()` sempre retorna `true`
3. **dashboard.html** - Removido banner de trial
4. **supabase/functions/auth-verify/index.ts** - Acesso público garantido
5. **supabase/functions/auth-nonce/index.ts** - Aumentado tempo do nonce para 30min

### Nova Migração SQL:
- `021_fix_auth_nonces_final.sql` - Corrige permissões da tabela de nonces

---

## 📋 PASSO A PASSO PARA DEPLOY

### 1. Executar Migração SQL

Acesse o **Supabase Dashboard** → **SQL Editor** → Cole e execute:

```sql
-- Conteúdo de: supabase/migrations/021_fix_auth_nonces_final.sql
```

### 2. Deploy das Edge Functions

```bash
cd /Users/otaviocurrency/Downloads/BENNY-main

# Login no Supabase (se necessário)
supabase login

# Link ao projeto
supabase link --project-ref dbxzwynknesxuvtlissd

# Deploy das funções atualizadas
supabase functions deploy auth-nonce --no-verify-jwt
supabase functions deploy auth-verify --no-verify-jwt
```

### 3. Verificar Deploy

Após deploy, teste o login no site:
1. Acesse login.html
2. Conecte qualquer wallet
3. Assine a mensagem
4. Deve redirecionar para dashboard.html

---

## ⚠️ SOLUÇÃO DE PROBLEMAS

### Erro: "invalid message format"
- Verifique se o domínio está correto
- Limpe o cache do navegador

### Erro: "invalid or expired nonce"
- O nonce expira em 30 minutos
- Tente fazer login novamente
- Execute a migração SQL para limpar nonces antigos

### Erro: "Nonce not found"
- Execute a migração SQL
- Verifique se as Edge Functions foram deployadas

---

## 🔧 Comandos Úteis

```bash
# Ver logs das funções
supabase functions logs auth-nonce
supabase functions logs auth-verify

# Limpar nonces antigos (SQL Editor)
DELETE FROM public.auth_nonces WHERE expires_at < NOW();

# Ver todos os nonces
SELECT * FROM public.auth_nonces ORDER BY expires_at DESC LIMIT 10;
```

---

## 🎉 BENNY está agora aberto para todos!

Qualquer pessoa com uma wallet Ethereum pode acessar o terminal.
O sistema de login por carteira continua funcionando normalmente.
