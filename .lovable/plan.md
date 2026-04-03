

# Plano: Nova Arquitectura do Orquestrador de IA — DELLE

## Problema Actual
O sistema de fallback actual falha porque: o cooldown de 6 horas é excessivo (chaves ficam bloqueadas o dia todo), falta o provedor Mistral AI, e as 24+ chaves fornecidas não estão na base de dados.

## Mudanças

### 1. Migração SQL — Inserir todas as chaves API
Inserir na tabela `api_keys` todas as chaves fornecidas (6 Gemini, 6 Groq, 4 Cerebras, 7 OpenRouter, 1 Mistral), com prioridades distribuídas para round-robin eficaz. Limpar chaves antigas/inválidas primeiro.

### 2. Reescrever `supabase/functions/ai-proxy/index.ts`
- **Adicionar Mistral AI** como novo provedor (endpoint `https://api.mistral.ai/v1/chat/completions`, modelo `mistral-small-latest`)
- **Reduzir cooldown de 6h para 15 minutos** — as APIs gratuitas reiniciam os limites rapidamente
- **Melhorar round-robin** — distribuir chamadas uniformemente entre TODAS as chaves de TODOS os provedores em vez de esgotar um provedor inteiro antes de passar ao próximo
- **Adicionar timeout por chamada** — 30 segundos max por tentativa individual para não bloquear o sistema
- **Tratar TODOS os erros como retryable** — qualquer falha marca a chave e avança, nunca para
- **Ordem de serviços**: gemini → groq → cerebras → openrouter → mistral → together (priorizar os mais rápidos e com mais chaves)

### 3. Actualizar `src/lib/ai-service.ts`
- Remover referência fixa a `service: "groq"` na função `generateWithGroq` — deixar o orquestrador decidir
- Aumentar timeout de 2min para 3min para trabalhos grandes com muitos subtemas

### 4. Actualizar `src/pages/ApiKeysSetup.tsx`
- Adicionar "mistral" à lista de serviços disponíveis na interface

## Detalhe Técnico — Nova função `callMistral`
```typescript
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

async function callMistral(messages, apiKey, maxTokens, temperature) {
  const res = await fetch(MISTRAL_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "mistral-small-latest", messages, max_tokens: maxTokens, temperature }),
  });
  if (!res.ok) throw new Error(`Mistral error ${res.status}: ${await res.text()}`);
  return res.json();
}
```

## Detalhe Técnico — Round-Robin melhorado
Em vez de tentar todas as chaves de um serviço antes de passar ao próximo, o novo sistema intercala: Gemini-key1 → Groq-key1 → Cerebras-key1 → OpenRouter-key1 → Mistral-key1 → Gemini-key2 → Groq-key2... Isto distribui a carga uniformemente.

## Ficheiros afectados
1. **Migração SQL** — inserir 24 chaves, limpar inválidas
2. **`supabase/functions/ai-proxy/index.ts`** — reescrever orquestrador
3. **`src/lib/ai-service.ts`** — ajustar timeouts
4. **`src/pages/ApiKeysSetup.tsx`** — adicionar Mistral à UI

## Resultado esperado
Com 24 chaves distribuídas por 5 provedores, cooldown de 15 min, e round-robin intercalado, o sistema suportará facilmente 10.000+ gerações/dia.

