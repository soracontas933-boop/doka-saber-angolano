

## Plano: Adicionar APIs de Geração de Imagens + Módulo de Apresentações

### Contexto
Atualmente o sistema usa apenas **Pollinations** (gratuito, sem chave) para imagens. Vamos integrar 6 novos provedores de imagem com o mesmo padrão de orquestramento (round-robin, cooldowns, fallback) já usado para texto, e criar um novo módulo de **Apresentações/Slides**.

### Alterações

#### 1. Novos provedores na página de API Keys
Adicionar ao array `PROVIDERS` em `ApiKeysSetup.tsx` uma secção separada para **APIs de Imagem**:
- **stability** — Stability AI (SDXL/SD3)
- **huggingface** — Hugging Face Inference API
- **replicate** — Replicate (Flux, SDXL)
- **cloudflare_ai** — Cloudflare Workers AI
- **segmind** — Segmind
- **leonardo** — Leonardo.ai

#### 2. Nova Edge Function `image-proxy`
Criar `supabase/functions/image-proxy/index.ts` que:
- Reutiliza a infraestrutura de chaves da tabela `api_keys` (mesma lógica de cooldown/round-robin)
- Implementa chamadas para cada provedor de imagem:
  - **Stability AI**: `https://api.stability.ai/v2beta/stable-image/generate/sd3`
  - **Hugging Face**: `https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0`
  - **Replicate**: `https://api.replicate.com/v1/predictions` (com polling)
  - **Cloudflare Workers AI**: `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/@cf/...`
  - **Segmind**: `https://api.segmind.com/v1/sdxl1.0-txt2img`
  - **Leonardo.ai**: `https://cloud.leonardo.ai/api/rest/v1/generations`
- Fallback final para Pollinations (sem chave)
- Retorna imagem em base64 ou URL

#### 3. Atualizar `ai-service.ts`
- Nova função `generateImageAI(prompt, width, height)` que chama `image-proxy`
- Manter `generateImageUrl()` (Pollinations) como fallback gratuito
- Usar a nova função nos módulos de trabalho e resumo

#### 4. Novo módulo: Geração de Apresentações
- Nova página `ApresentacaoPage.tsx` em `/apresentacao`
- Formulário: tema, disciplina, classe, número de slides, estilo visual
- Geração via IA (texto dos slides) + imagens contextuais via `image-proxy`
- Preview de slides com layout A4/widescreen
- Exportação para PDF
- Adicionar rota no `App.tsx`, botão nos quick actions do `UserHomePage`, e nav no `MobileNav`

#### 5. Migração de BD
- Nenhuma alteração na tabela `api_keys` necessária (o campo `servico` é texto livre)
- Adicionar tipo `"apresentacao"` ao usage tracking

### Ficheiros afectados
- `src/pages/ApiKeysSetup.tsx` — novos provedores de imagem
- `supabase/functions/image-proxy/index.ts` — **novo** edge function
- `src/lib/ai-service.ts` — nova função de imagem
- `src/pages/ApresentacaoPage.tsx` — **nova** página
- `src/components/apresentacao/` — componentes do módulo
- `src/App.tsx` — nova rota
- `src/pages/UserHomePage.tsx` — novo botão
- `src/components/MobileNav.tsx` — atualizar nav
- `src/hooks/use-usage-tracker.ts` — novo tipo de módulo

