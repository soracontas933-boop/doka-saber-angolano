

# Plano: Sistema de Multi-Chaves com Substituição Automática

## Problema Actual
A tabela `api_keys` guarda **1 chave por serviço**. Quando o Groq esgota, passa ao próximo provedor diferente (Cerebras, etc.). Mas cada provedor gratuito tem ~6K-30K req/dia. Com apenas 1 conta por provedor, o limite máximo é ~700 gerações/dia.

## Método de Substituição — Como Funciona

```text
Pedido chega → Selecciona serviço (ex: groq)
                    ↓
         Tem múltiplas chaves? → groq_1, groq_2, groq_3...
                    ↓
         Tenta groq_1 → Erro 429/quota? → Marca como "exausta"
                    ↓
         Tenta groq_2 → Funciona? → Responde ✓
                    ↓
         Todas groq exaustas? → Passa para cerebras_1, cerebras_2...
                    ↓
         Todos provedores exaustos? → Erro 502
```

## Mudanças Necessárias

### 1. Migração da Base de Dados
- Adicionar coluna `prioridade` (INTEGER, default 0) à tabela `api_keys` para ordenar chaves do mesmo serviço
- Adicionar coluna `ultimo_erro` (TIMESTAMPTZ, nullable) para rastrear quando uma chave falhou por quota
- Remover a limitação de 1 chave por serviço (actualmente não há constraint UNIQUE, mas o código só lê 1)

### 2. Edge Function `ai-proxy` — Refactoring Principal
- **`getApiKeys()`**: Em vez de retornar `Record<string, string>` (1 chave por serviço), retornar `Record<string, string[]>` — um array de chaves por serviço, ordenadas por prioridade
- **`getServiceOrder()`**: Manter a lógica de round-robin entre serviços, mas agora cada serviço tem N chaves disponíveis
- **Loop de fallback**: Para cada serviço, iterar por todas as chaves disponíveis antes de passar ao próximo serviço
- **Detecção de quota esgotada**: Tratar erros 429, 403, e mensagens como "quota exceeded" / "rate limit" como sinal para saltar para a próxima chave
- **Registo de falha**: Quando uma chave falha por quota, actualizar `ultimo_erro` na BD para analytics

### 3. Página Admin de Chaves (`ApiKeysSetup.tsx`)
- Permitir adicionar **múltiplas chaves por serviço** (ex: 5 chaves Groq de contas diferentes)
- Interface com lista dinâmica: botão "+" para adicionar mais chaves do mesmo provedor
- Mostrar estado de cada chave (activa/exausta com base em `ultimo_erro`)

## Cálculo de Capacidade

| Provedor | Limite/dia/conta | Com 10 contas |
|----------|-----------------|---------------|
| Groq | ~6.000 req | 60.000 |
| Cerebras | ~30.000 req | 300.000 |
| Together | ~10.000 req | 100.000 |
| OpenRouter | ~5.000 req | 50.000 |
| Gemini | ~1.500 req | 15.000 |
| **Total** | ~52.500 | **525.000** |

Com 20 contas por provedor → ~1M+/dia. O método é escalável linearmente.

## Detalhes Técnicos

- A geração usa **exactamente os mesmos modelos e prompts** independentemente de qual chave é usada — a substituição é transparente
- O round-robin distribui carga uniformemente entre chaves do mesmo serviço para evitar esgotar uma antes das outras
- Reset automático: chaves marcadas como "exaustas" são reactivadas após meia-noite (os limites diários reiniciam)

## Ficheiros Afectados
1. **Migração SQL** — adicionar colunas `prioridade` e `ultimo_erro` à tabela `api_keys`
2. **`supabase/functions/ai-proxy/index.ts`** — refactoring do sistema de chaves para multi-key
3. **`src/pages/ApiKeysSetup.tsx`** — interface para gerir múltiplas chaves por provedor

