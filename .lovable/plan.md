

## Plano: Adaptar webhook ao formato real da Kuenha

### Problema
O webhook espera campos no nível raiz (`email`, `plan`, `event`) mas a Kuenha envia uma estrutura aninhada com `buyer.email`, `product.name` e `status` com valores como `"PENDING"`, `"COMPLETED"`, `"ABANDONED"`, etc.

### Solução

**Alterar `supabase/functions/payment-webhook/index.ts`** para:

1. **Extrair campos da estrutura Kuenha**:
   - Email: `body.buyer?.email`
   - Plano: extrair de `body.product?.name` (ex: "Doka Intermédio" → "intermedio")
   - Evento: `body.status` (ex: "PENDING", "COMPLETED", "ABANDONED")

2. **Mapear status da Kuenha para eventos internos**:
   - `COMPLETED` / `PAID` → `compra_realizada`
   - `ABANDONED` / `CANCELLED` → `compra_abandonada`
   - `PENDING` → `compra_iniciada`
   - `PENDING_REFERENCE` → `pagamento_referencia`
   - `PENDING_EXPRESS` → `pagamento_express`
   - `PENDING_INTERNATIONAL` → `pagamento_internacional`

3. **Extrair nome do plano do nome do produto**:
   - "Doka Intermédio" → procura "intermédio" nos aliases → `intermedio`
   - "Doka Premium" → `premium`
   - Percorre `PLAN_ALIASES` e verifica se o nome do produto contém algum alias

4. **Manter retrocompatibilidade** com o formato antigo (campos no nível raiz) como fallback

### Ficheiros a alterar
- `supabase/functions/payment-webhook/index.ts` — adaptar parsing ao formato Kuenha

