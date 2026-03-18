

## Plano: Manter IAs 100% Gratuitas (sem Lovable AI)

### Situação Actual

O teu projecto **já usa APIs gratuitas** através da Edge Function `ai-proxy`:
- **Groq** (Llama 3.3 70B) — gratuito com limite generoso
- **OpenRouter** (DeepSeek V3 free) — gratuito
- **Gemini 2.0 Flash** — gratuito com limite diário
- **Self-hosted** — ilimitado se configurado

O OCR (`ocr-extract`) também usa a chave Gemini gratuita da tabela `api_keys`.

**Nenhuma parte do código usa o Lovable AI (que tem limites pagos).** Tudo já passa pelas tuas chaves gratuitas.

### O que posso melhorar

1. **Adicionar mais provedores gratuitos ao fallback** para reduzir chances de rate-limit:
   - Adicionar **Cerebras** (Llama 3.3 70B, gratuito e rápido)
   - Adicionar **Together AI** (modelos gratuitos)
   
2. **Melhorar o round-robin** para distribuir carga entre todos os provedores e minimizar erros 429

3. **OCR com fallback**: Se o Gemini falhar no OCR, tentar Groq Vision ou outro provedor gratuito com suporte a imagens

### Alterações Técnicas

| Ficheiro | Mudança |
|---|---|
| `supabase/functions/ai-proxy/index.ts` | Adicionar Cerebras e Together AI como provedores de fallback |
| `supabase/functions/ocr-extract/index.ts` | Adicionar fallback caso Gemini dê 429 |
| `src/pages/ApiKeysSetup.tsx` | Adicionar campos para novas chaves (Cerebras, Together) |

### Resumo

O sistema já é gratuito. O plano é torná-lo **mais resistente a limites** adicionando mais provedores gratuitos ao sistema de fallback, garantindo que sempre haja uma IA disponível para os teus utilizadores.

