

## Plano: Remover notificação de tokens dos utilizadores

### Problema
O toast `🤖 groq — 1.234 tokens usados` aparece a todos os utilizadores após cada geração. Isto expõe informação técnica interna (nome do serviço de IA, contagem de tokens) que não deve ser visível.

### Solução
Remover o toast de tokens do `src/lib/ai-service.ts` (linhas 54-59). Manter apenas o `console.log` para debug interno.

### Ficheiro a alterar
- `src/lib/ai-service.ts` — remover o bloco `sonnerToast.info(...)` das linhas 54-59, substituir por `console.log` silencioso.

