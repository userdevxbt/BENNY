# 📚 SHDWXBT - SQL Query Reference Guide

## Como Usar no Supabase SQL Editor

Para cada query que você precisa salvar no Supabase, copie o código e use o nome sugerido.

---

## 📋 Queries Essenciais para Salvar

### 1️⃣ SCHEMA & SETUP
| Nome para Salvar | Descrição |
|------------------|-----------|
| `Schema - Create All Tables` | Cria todas as tabelas do sistema |
| `Schema - Create Indexes` | Cria índices para performance |
| `Schema - Setup RLS` | Configura Row Level Security |

### 2️⃣ HOT SIGNALS
| Nome para Salvar | Descrição |
|------------------|-----------|
| `Hot Signals - Get Active` | Lista sinais não expirados |
| `Hot Signals - By Type` | Filtra por tipo (PUMP/DUMP/etc) |
| `Hot Signals - Stats 24h` | Estatísticas das últimas 24h |
| `Hot Signals - Insert` | Template para inserir sinal |

### 3️⃣ WATCHLIST
| Nome para Salvar | Descrição |
|------------------|-----------|
| `Watchlist - Get Active` | Lista ativos em observação |
| `Watchlist - Add Item` | Adiciona à watchlist |
| `Watchlist - Remove Item` | Remove da watchlist |
| `Watchlist - Count` | Conta total na watchlist |

### 4️⃣ OPPORTUNITIES
| Nome para Salvar | Descrição |
|------------------|-----------|
| `Opps - Get Active` | Lista oportunidades ativas |
| `Opps - By Trend` | Filtra bullish/bearish |
| `Opps - High Score (70+)` | Só alta confiança |
| `Opps - Update TP Status` | Marca TP como atingido |
| `Opps - Mark Complete` | Finaliza oportunidade |

### 5️⃣ PERFORMANCE
| Nome para Salvar | Descrição |
|------------------|-----------|
| `Perf - Stats 30 Days` | Win rate e métricas |
| `Perf - By Symbol` | Performance por ativo |
| `Perf - Daily Report` | Relatório diário |
| `Perf - Record Trade` | Registra resultado |

### 6️⃣ AUTHENTICATION
| Nome para Salvar | Descrição |
|------------------|-----------|
| `Auth - List Whitelist` | Lista wallets autorizadas |
| `Auth - Check Wallet` | Verifica se está na whitelist |
| `Auth - Add Wallet` | Adiciona nova wallet |
| `Auth - Remove Wallet` | Remove wallet |

### 7️⃣ MAINTENANCE
| Nome para Salvar | Descrição |
|------------------|-----------|
| `Maint - Cleanup Hot Signals` | Remove sinais expirados |
| `Maint - Cleanup History 90d` | Remove histórico antigo |
| `Maint - Cleanup Nonces` | Remove nonces expirados |
| `Maint - Vacuum Tables` | Otimiza banco |
| `Maint - Deactivate Old Opps` | Desativa opps antigas |

### 8️⃣ ANALYTICS
| Nome para Salvar | Descrição |
|------------------|-----------|
| `Analytics - Dashboard Overview` | Visão geral dashboard |
| `Analytics - Top Performers` | Melhores ativos |
| `Analytics - Signal Type Perf` | Performance por tipo |
| `Analytics - Hourly Distribution` | Sinais por hora |
| `Analytics - Conversion Rate` | Watchlist → Opp |

### 9️⃣ FUNCTIONS
| Nome para Salvar | Descrição |
|------------------|-----------|
| `Func - Cleanup Expired` | Função de limpeza |
| `Func - Get Performance Stats` | Função de stats |
| `Func - Promote to Opportunity` | Função de promoção |
| `Func - Update Timestamp` | Trigger de timestamp |

---

## 🗂️ Organização Recomendada no Supabase

### Estrutura de Pastas (use prefixos):
```
📁 SHARED
   └── (queries compartilhadas com equipe)

📁 FAVORITES
   └── (queries mais usadas)

📁 PRIVATE
   ├── 1-Schema/
   │   ├── Schema - Create All Tables
   │   ├── Schema - Create Indexes
   │   └── Schema - Setup RLS
   │
   ├── 2-Hot-Signals/
   │   ├── Hot Signals - Get Active
   │   ├── Hot Signals - By Type
   │   └── Hot Signals - Stats 24h
   │
   ├── 3-Watchlist/
   │   ├── Watchlist - Get Active
   │   ├── Watchlist - Add Item
   │   └── Watchlist - Remove Item
   │
   ├── 4-Opportunities/
   │   ├── Opps - Get Active
   │   ├── Opps - By Trend
   │   └── Opps - High Score
   │
   ├── 5-Performance/
   │   ├── Perf - Stats 30 Days
   │   ├── Perf - By Symbol
   │   └── Perf - Daily Report
   │
   ├── 6-Auth/
   │   ├── Auth - List Whitelist
   │   └── Auth - Check Wallet
   │
   ├── 7-Maintenance/
   │   ├── Maint - Cleanup Hot Signals
   │   └── Maint - Vacuum Tables
   │
   └── 8-Analytics/
       ├── Analytics - Dashboard Overview
       └── Analytics - Top Performers
```

---

## 🔥 Queries para Favoritar

Estas são as queries mais usadas no dia-a-dia:

1. **Hot Signals - Get Active** - Ver sinais em tempo real
2. **Opps - Get Active** - Ver oportunidades atuais
3. **Perf - Stats 30 Days** - Verificar win rate
4. **Analytics - Dashboard Overview** - Visão geral
5. **Maint - Cleanup Hot Signals** - Manutenção diária

---

## ⚠️ Queries para Deletar

Baseado na screenshot, você pode deletar:
- Todas as "Untitled query"
- Queries duplicadas
- Queries de teste

---

## 📝 Notas

- Todas as queries estão no arquivo `supabase/organized-queries.sql`
- Copie cada seção e salve com o nome sugerido
- Use prefixos numéricos para manter ordem
- Favorite as queries mais usadas
