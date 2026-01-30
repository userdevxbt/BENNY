# SHDWXBT - Supabase SIWE Authentication Setup

## Padrão Institucional (WorldLibertyFinancial Style)

Este setup implementa autenticação SIWE (Sign-In with Ethereum) com:

- Anti-replay via nonces
- Verificação de domínio
- Whitelist gerenciada no backend
- RLS (Row Level Security) ativo

---

## 1. Setup das Tabelas

Rode o SQL em `migrations/001_siwe_tables.sql` no **SQL Editor** do Supabase:

```sql
-- Acesse: Supabase Dashboard > SQL Editor > New Query
-- Cole todo o conteúdo de migrations/001_siwe_tables.sql
-- Execute
```

### Adicionar endereços na whitelist

```sql
-- Admin
INSERT INTO public.whitelist (address, role) 
VALUES (LOWER('0xSeuEnderecoAdmin'), 'Admin');

-- User
INSERT INTO public.whitelist (address, role) 
VALUES (LOWER('0xEnderecoUsuario'), 'User');
```

---

## 2. Deploy das Edge Functions

### Pré-requisitos

```bash
npm install -g supabase
supabase login
```

### Link ao projeto

```bash
cd /path/to/XBT-SITE-main
supabase link --project-ref SEU_PROJECT_REF
```

### Deploy

```bash
supabase functions deploy auth-nonce
supabase functions deploy auth-verify
supabase functions deploy auth-check-session
supabase functions deploy auth-logout
```

### Verificar secrets (automáticos no Supabase)

As Edge Functions já têm acesso a:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 3. Configurar CORS (se necessário)

As functions já incluem headers CORS. Se precisar de domínios específicos, edite os arquivos `index.ts`.

---

## 4. Fluxo de Autenticação

```text
┌─────────────┐     1. Connect      ┌─────────────┐
│   Frontend  │ ◄──────────────────►│   Wallet    │
│  login.html │                     │  (MetaMask) │
└──────┬──────┘                     └─────────────┘
       │
       │ 2. POST { address }
       ▼
┌─────────────────┐
│   auth-nonce    │  → Gera nonce único (5 min expiry)
│  Edge Function  │  → Salva em auth_nonces
└────────┬────────┘
         │ { nonce }
         ▼
┌─────────────┐     3. Sign SIWE    ┌─────────────┐
│   Frontend  │ ◄──────────────────►│   Wallet    │
│  login.html │     Message         │             │
└──────┬──────┘                     └─────────────┘
       │
       │ 4. POST { address, message, signature, isMobile }
       ▼
┌─────────────────┐
│   auth-verify   │  → Verifica assinatura (ethers.js)
│  Edge Function  │  → Valida domínio
│                 │  → Valida nonce (anti-replay)
│                 │  → Marca nonce como usado
│                 │  → Consulta whitelist
│                 │  → Cria sessão persistente (7 dias mobile)
└────────┬────────┘
         │ { ok, whitelisted, role, sessionToken, sessionExpiresAt }
         ▼
┌─────────────┐
│   Frontend  │  → Salva sessão no localStorage (mobile)
│  login.html │  → Redireciona para dashboard/admin
└─────────────┘
```

### Sessões Persistentes (Mobile)

No mobile, após autenticação com assinatura, uma sessão de **7 dias** é criada:

```text
┌─────────────┐     1. Acesso       ┌─────────────┐
│   Mobile    │ ───────────────────►│ login.html  │
│   Browser   │                     │             │
└─────────────┘                     └──────┬──────┘
                                           │
                                           │ 2. Verifica localStorage
                                           │    (shdwxbt_session)
                                           ▼
                                    ┌─────────────────┐
                                    │ auth-check-     │
                                    │ session         │  → Valida token
                                    │ Edge Function   │  → Verifica whitelist
                                    └────────┬────────┘
                                             │
                                             │ { ok, address, remainingDays }
                                             ▼
                                    ┌─────────────┐
                                    │ Auto-login  │  → Redireciona direto
                                    │ (se válido) │     para dashboard
                                    └─────────────┘
```

---

## 5. Formato da Mensagem SIWE

```text
shdwxbt.xyz wants you to sign in with your Ethereum account:
0x1234...abcd

Sign in to SHDWXBT

URI: https://shdwxbt.xyz
Version: 1
Chain ID: 1
Nonce: aB3xY7kL9mN2pQ4rS6
Issued At: 2024-01-15T10:30:00.000Z
```

---

## 6. Segurança

### O que o backend valida

- ✅ Assinatura criptográfica (prova de posse da wallet)
- ✅ Domínio (previne replay em outros sites)
- ✅ URI (deve ser do seu site)
- ✅ Nonce (previne replay attacks)
- ✅ Timestamp (mensagens antigas são rejeitadas)
- ✅ Whitelist (só endereços aprovados)

### RLS (Row Level Security)

- Tabelas `whitelist` e `auth_nonces` têm RLS ativo
- Políticas negam acesso via `anon` key
- Edge Functions usam `SERVICE_ROLE_KEY`

---

## 7. Domínios Permitidos

Edite `auth-verify/index.ts` para alterar:

```typescript
const ALLOWED_DOMAINS = new Set([
  "shdwxbt.xyz",
  "www.shdwxbt.xyz",
  // Remover em produção:
  "localhost",
  "localhost:3000",
]);
```

---

## 8. Troubleshooting

### "Nonce not found"

- Nonce expirou (5 min) ou já foi usado
- Solução: Conectar novamente

### "Invalid domain"

- Acesso via domínio não autorizado
- Solução: Adicionar domínio em `ALLOWED_DOMAINS`

### "Address mismatch"

- Assinatura não corresponde ao endereço
- Solução: Verificar se a wallet correta está conectada

### Logs das Functions

```bash
supabase functions logs auth-nonce
supabase functions logs auth-verify
```

---

## 9. Limpeza de Nonces Expirados

Opção 1 - SQL Manual:

```sql
DELETE FROM public.auth_nonces 
WHERE expires_at < NOW() - INTERVAL '1 hour';
```

Opção 2 - pg_cron (requer extensão):

```sql
SELECT cron.schedule('cleanup-nonces', '0 * * * *', 
  $$DELETE FROM public.auth_nonces WHERE expires_at < NOW() - INTERVAL '1 hour'$$
);
```
