

## Plano: Webhooks de pagamento automático com eventos

### Objectivo
Criar uma edge function que recebe webhooks POST dos provedores de pagamento externos. Consoante o tipo de evento, ou actualiza o plano automaticamente ou notifica o admin para confirmação manual.

### Lógica de eventos

| Evento | Acção |
|---|---|
| `compra_realizada` | Actualiza plano + créditos automaticamente |
| `compra_abandonada` | Notifica admin |
| `pagamento_referencia` | Notifica admin |
| `pagamento_express` | Notifica admin |
| `pagamento_internacional` | Notifica admin |
| `compra_iniciada` | Notifica admin |

### O que será feito

**1. Criar edge function `supabase/functions/payment-webhook/index.ts`**
- Endpoint POST público (sem JWT — webhooks externos não têm token)
- Recebe JSON com: `event`, `plan` (basico/intermedio/profissional/premium), `email` (email do utilizador), e opcionalmente `amount`, `reference`
- Valida input com Zod
- Procura o utilizador pelo email (via `find_user_by_email` RPC existente)
- Se evento = `compra_realizada`: actualiza `user_plans` com os limites do plano (via service role), reseta créditos, envia notificação ao utilizador
- Se evento é qualquer outro dos listados: insere notificação para os admins com detalhes do evento para confirmação manual
- Protecção por secret/token no header para evitar chamadas falsas

**2. Adicionar configuração de webhook secret no Admin**
- No `AdminPaymentsTab.tsx`, adicionar campo para configurar um `webhook_secret` na tabela `payment_settings`
- Mostrar o URL do webhook para o admin copiar e colar no provedor externo

**3. Migração de base de dados**
- Adicionar entrada `webhook_secret` na tabela `payment_settings` (dados, não schema)

**4. Actualizar `supabase/config.toml`**
- Adicionar bloco `[functions.payment-webhook]` com `verify_jwt = false`

### Ficheiros a criar/alterar
- `supabase/functions/payment-webhook/index.ts` — novo
- `src/components/AdminPaymentsTab.tsx` — secção webhook secret + URL
- `supabase/config.toml` — config da nova function

### Segurança
- Webhook protegido por header `X-Webhook-Secret` comparado com o valor guardado em `payment_settings`
- Usa `SUPABASE_SERVICE_ROLE_KEY` para actualizar planos (bypassa RLS)
- Validação de input rigorosa com Zod

