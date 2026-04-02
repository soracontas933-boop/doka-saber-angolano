

# Correcção: Modelo OpenRouter Indisponível

## Problema
O modelo `deepseek/deepseek-chat-v3-0324:free` foi removido/descontinuado do OpenRouter, causando erro 404 em todas as chamadas.

## Solução
Actualizar o modelo no ficheiro `supabase/functions/ai-proxy/index.ts` (linha 48) para um modelo gratuito disponível no OpenRouter. A melhor alternativa actual é `deepseek/deepseek-chat-v3-0324` (sem o sufixo `:free`) ou `meta-llama/llama-3.3-70b-instruct:free`.

Adicionalmente, actualizar o `HTTP-Referer` de `doka-angola-smart-learn` para `wame-angola-smart-learn` (linha 45) para corresponder ao domínio actual.

## Ficheiro afectado
- `supabase/functions/ai-proxy/index.ts` — linha 48: trocar modelo para `meta-llama/llama-3.3-70b-instruct:free`

