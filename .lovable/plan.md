
Diagnóstico confirmado

1. O bloqueio não é do teu plano nem do limite do utilizador
- Verifiquei o plano do teu utilizador: está em `premium` com `limite_trabalhos = -1`.
- Portanto, o “menos de 2 trabalhos por dia” não está a vir da lógica de assinatura.

2. As chaves existem, mas o orquestrador não está a geri-las como deveria
- A base tem 24 chaves activas: 6 Gemini, 6 Groq, 4 Cerebras, 7 OpenRouter e 1 Mistral.
- Mas em `supabase/functions/ai-proxy/index.ts` a função `markKeyExhausted()` está desactivada.
- O campo `ultimo_erro` é lido, mas não é usado para excluir chaves em cooldown.
- Resultado: uma chave que falhou com 429/401/404 volta a ser tentada no pedido seguinte. Ou seja, o fallback actual só roda dentro da chamada actual; não há “troca instantânea persistente” entre pedidos.

3. O frontend ainda concentra tudo no Groq
- Em `src/lib/ai-service.ts`, `generateWithGroq()` chama sempre o proxy com `service: "groq"`.
- Em `src/pages/TrabalhoPage.tsx`, tanto a estrutura como os subtemas usam `generateWithGroq()`.
- Isso força cada geração a começar pelo Groq, em vez de começar pelo provedor mais saudável.

4. Os logs mostram que o problema principal é quota/modelo, não falta de UI
- Groq: 429 com limite partilhado pela mesma organização (`org_...`). Múltiplas chaves da mesma organização não multiplicam a quota.
- Gemini: 429 com quota por projecto. Se as 6 chaves vierem do mesmo projecto Google, elas partilham a mesma quota.
- OpenRouter: o modelo `meta-llama/llama-3.3-70b-instruct:free` está a falhar por rate limit upstream.
- Cerebras: o modelo `llama-3.3-70b` está inválido/depreciado e devolve 404.
- Mistral não aparece como rota efectiva nos logs actuais, então precisa de validação real.

5. A interface de admin também está a mascarar o estado real
- Em `src/pages/ApiKeysSetup.tsx`, `isExhausted()` devolve sempre `false`.
- Isso faz parecer que todas as chaves estão saudáveis, mesmo quando acabaram de falhar.

Conclusão directa

A estimativa de ~2.985 trabalhos/dia não é válida no estado actual.
O problema não é “faltam chaves”; é este conjunto:
- fallback sem cooldown real,
- frontend preso ao Groq,
- quotas partilhadas entre chaves da mesma conta/projecto,
- modelo inválido no Cerebras,
- modelo free instável no OpenRouter.

Plano de correcção

1. Corrigir o orquestrador para fallback real entre pedidos
- Reactivar a marcação de falha por chave.
- Usar `ultimo_erro` para tirar a chave da fila durante cooldown.
- Se necessário, adicionar `cooldown_until` à tabela `api_keys` para respeitar o tempo real de retry de cada provedor.
- Filtrar a fila antes do round-robin para só incluir chaves saudáveis.

2. Parar de fixar a geração de texto no Groq
- Alterar `generateWithGroq()` para deixar de enviar `service: "groq"` nos fluxos gerais.
- Actualizar `TrabalhoPage`, `ResumoPage`, `QuestionarioPage`, `PlanoAulaPage` e `CorrecaoPage` para usar o orquestrador genérico.
- Manter pinning apenas onde fizer sentido técnico específico.

3. Corrigir os provedores que hoje estão “mortos” ou mal configurados
- Cerebras: trocar `llama-3.3-70b` por um modelo actualmente suportado.
- OpenRouter: deixar de depender de um único modelo `:free`; usar uma lista de modelos candidatos e fallback interno por modelo.
- Mistral: validar de ponta a ponta que a chave existente funciona e que o proxy realmente a usa.
- Gemini: manter como fallback, mas reconhecer que várias chaves do mesmo projecto não aumentam a quota total.

4. Tornar o painel de chaves fiável
- Mostrar quais chaves estão em cooldown.
- Mostrar último erro por chave/provedor.
- Mostrar contagem real de chaves saudáveis.
- Manter o modal para colar várias chaves, mas com feedback verdadeiro de estado.

5. Validar o backend publicado, não só o código do repositório
- Confirmar que a função publicada corresponde ao código mais recente.
- Testar directamente o proxy com pedidos reais de estrutura e subtema.
- Confirmar nos logs a sequência exacta: tentativa -> falha -> cooldown -> próximo provedor -> sucesso.

6. Recalcular a capacidade real depois da correcção
- A capacidade deve ser medida por “bucket” real de quota, não por número bruto de chaves.
- Se as chaves Groq forem da mesma organização e as Gemini do mesmo projecto, 20+ chaves não significam 20+ quotas.
- Para chegar a milhares/dia, vais precisar de:
  - buckets realmente independentes,
  - Cerebras funcional,
  - OpenRouter com modelos menos congestionados,
  - orquestrador sem pinning no Groq.

Detalhe técnico do que vou mexer

- `supabase/functions/ai-proxy/index.ts`
  - reactivar cooldown por chave
  - excluir chaves em cooldown da fila
  - corrigir modelo Cerebras
  - adicionar fallback por modelo no OpenRouter
  - validar rota Mistral
  - melhorar logs de decisão do fallback

- `src/lib/ai-service.ts`
  - remover preferência fixa por `groq` nas gerações gerais
  - deixar o orquestrador escolher

- `src/pages/TrabalhoPage.tsx`
  - usar geração genérica para estrutura e subtemas

- `src/pages/ApiKeysSetup.tsx`
  - mostrar estado real de cooldown/erro
  - manter e afinar o modal de colagem

- restantes páginas que usam `generateWithGroq`
  - alinhar com o novo orquestrador

Resultado esperado após a implementação

- quando uma chave esgotar, ela deixa de ser tentada imediatamente nos pedidos seguintes;
- o sistema passa para outro provedor/chave de forma real e persistente;
- Cerebras deixa de falhar por modelo inválido;
- OpenRouter deixa de depender de um único modelo instável;
- a UI passa a mostrar o estado verdadeiro das chaves;
- fica claro quais quotas são realmente independentes e qual é a capacidade diária real do sistema.
