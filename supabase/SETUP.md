# SHDWXBT - Supabase Setup Guide

## 📋 Visão Geral

Este diretório contém todos os arquivos necessários para configurar o backend do SHDWXBT no Supabase:
- Schema SQL para tabelas e funções
- Edge Functions para API

## 🚀 Deploy Rápido

### 1. Configurar o Schema SQL

1. Acesse o **Supabase Dashboard** > **SQL Editor**
2. Copie e cole todo o conteúdo de `schema.sql`
3. Execute o script

### 2. Deploy das Edge Functions

No terminal, navegue até a pasta do projeto e execute:

```bash
# Login no Supabase (se ainda não estiver logado)
supabase login

# Link com seu projeto
supabase link --project-ref SEU_PROJECT_REF

# Deploy de todas as funções
supabase functions deploy save-hot-signal
supabase functions deploy get-hot-signals
supabase functions deploy add-to-watchlist
supabase functions deploy remove-from-watchlist
supabase functions deploy promote-to-opportunity
supabase functions deploy get-performance-stats
```

### 3. Verificar as Funções

Acesse **Supabase Dashboard** > **Edge Functions** para verificar se todas as funções estão online.

## 📊 Tabelas Criadas

| Tabela | Descrição |
|--------|-----------|
| `hot_signals` | Sinais de movimentos em tempo real |
| `watchlist` | Ativos em monitoramento (score 30-49) |
| `performance_history` | Histórico de performance |

## 🔧 Edge Functions

| Função | Endpoint | Descrição |
|--------|----------|-----------|
| `save-hot-signal` | POST | Salva novo hot signal |
| `get-hot-signals` | POST | Retorna sinais ativos |
| `add-to-watchlist` | POST | Adiciona item à watchlist |
| `remove-from-watchlist` | POST | Remove da watchlist |
| `promote-to-opportunity` | POST | Promove para oportunidade |
| `get-performance-stats` | POST | Estatísticas de performance |

## 🔐 Configuração de Segurança

As tabelas usam Row Level Security (RLS):
- Leitura: Habilitada para todos (anon key)
- Escrita: Apenas via Edge Functions (service_role)

## 📈 Estatísticas de Performance

A função `get-performance-stats` retorna:
- Win Rate geral
- TP1/TP2/TP3 hits
- Stop Loss hits
- Performance por direção (bullish/bearish)
- Contadores de sinais ativos

## 🔄 Manutenção

### Limpar Sinais Expirados

Execute periodicamente:
```sql
SELECT cleanup_expired_signals();
```

Ou configure um cron job no Supabase:
```sql
SELECT cron.schedule('cleanup-signals', '*/5 * * * *', 'SELECT cleanup_expired_signals()');
```

## 📝 Variáveis de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas no frontend:
- `SUPABASE_URL`: URL do seu projeto Supabase
- `SUPABASE_ANON_KEY`: Chave anônima do Supabase

## 🆘 Troubleshooting

### Watchlist está vazia
1. Verifique se o scan-market está usando `minConfluence: 30`
2. Execute manualmente: `SELECT * FROM watchlist WHERE is_active = true`

### Hot Signals não aparecem
1. Verifique se a função `save-hot-signal` está deployada
2. Verifique logs: **Dashboard** > **Edge Functions** > **Logs**

### Erro de permissão
1. Verifique se as políticas RLS estão criadas corretamente
2. Verifique se está usando a chave correta (anon vs service_role)
