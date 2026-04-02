

# Correcção: Erro 401 Bloqueia Todo o Sistema de Fallback

## Problema
O erro `Cerebras error 401: Wrong API Key` está a impedir a geração de trabalhos. O problema é duplo:

1. **Chave Cerebras inválida** — a chave guardada na base de dados está errada ou expirada
2. **Bug no fallback** — quando ocorre um erro 401 (chave inválida), o código actual faz `break` (linha 233), abandonando **todo o serviço e todos os seguintes**. Ou seja, uma única chave má do Cerebras impede que o sistema tente Groq, Together, OpenRouter ou Gemini.

O `isQuotaError()` só detecta erros 429/403, mas um 401 ("Wrong API Key") não é capturado, então o sistema trata-o como erro fatal e para.

## Solução

### 1. Corrigir `isQuotaError` → renomear para `isRetryableError` (ai-proxy/index.ts)
Expandir a detecção para incluir erros 401 (chave inválida) e 400 (bad request) como erros recuperáveis que devem marcar a chave como exausta e continuar para a próxima:

```typescript
function isRetryableError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return msg.includes("429") || msg.includes("401") || msg.includes("403")
    || msg.includes("rate limit") || msg.includes("quota")
    || msg.includes("exceeded") || msg.includes("too many")
    || msg.includes("wrong_api_key") || msg.includes("invalid");
}
```

### 2. Mudar o `break` para `continue` no loop de serviços (ai-proxy/index.ts)
Actualmente, quando um erro não-quota ocorre, o código faz `break` e abandona o serviço inteiro. Em vez disso, deve marcar a chave como exausta e **continuar para o próximo serviço**:

```typescript
// Em vez de break no catch:
await markKeyExhausted(keyEntry.id);
continue; // sempre tentar próxima chave/serviço
```

### 3. Reorganizar o loop principal
Após esgotar todas as chaves de um serviço (quota ou chave má), o loop exterior deve continuar automaticamente para o próximo serviço na lista de prioridade. Remover o `break` que corta essa cadeia.

## Ficheiro afectado
- `supabase/functions/ai-proxy/index.ts` — corrigir lógica de fallback para nunca parar num erro de chave inválida

## Resultado esperado
Com esta correcção, mesmo que a chave Cerebras esteja errada, o sistema marca-a como exausta e tenta imediatamente Groq → Together → OpenRouter → Gemini, garantindo que a geração de trabalhos funciona enquanto houver pelo menos 1 chave válida em qualquer provedor.

