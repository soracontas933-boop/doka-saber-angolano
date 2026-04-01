

# Plano: Sistema Multi-IA de Geração de Imagens para Trabalhos

## Situação Actual
- Apenas usa **Pollinations** (URL estática, sem autenticação) — qualidade limitada e pouco fiável
- O campo "Elementos Visuais" existe no formulário mas as imagens não são inseridas no corpo do trabalho, apenas na capa

## Arquitectura Proposta

```text
Utilizador escolhe:
  - Nº de imagens (0-10)
  - Estilo: Realista | Ilustração | Diagrama | Minimalista
  
Compilação do trabalho → Para cada imagem:
  ↓
  Gera prompt contextual baseado no subtema
  ↓
  Tenta Provedor 1 (Nano Banana / Gemini Flash Image) → Falhou?
  ↓
  Tenta Provedor 2 (Nano Banana Pro / Gemini Pro Image) → Falhou?
  ↓
  Tenta Provedor 3 (Pollinations - fallback gratuito ilimitado)
  ↓
  Imagem gerada → Inserida no subtema correspondente
```

## Provedores de Imagens (Todos Gratuitos via Lovable AI)

| Provedor | Modelo | Qualidade | Velocidade |
|----------|--------|-----------|------------|
| **Nano Banana 2** | gemini-3.1-flash-image-preview | Alta | Rápido |
| **Nano Banana** | gemini-2.5-flash-image | Boa | Rápido |
| **Nano Banana Pro** | gemini-3-pro-image-preview | Máxima | Lento |
| **Pollinations** | Flux (URL) | Básica | Instantâneo |

Estes modelos estão disponíveis via Lovable AI Gateway (`LOVABLE_API_KEY`) — sem necessidade de chaves adicionais do utilizador.

## Mudanças

### 1. Nova Edge Function `image-proxy`
- Recebe: `prompt`, `style` (realista/ilustração/diagrama), `width`, `height`
- Tenta gerar com Gemini Flash Image → fallback Pro → fallback Pollinations URL
- Retorna: imagem em base64 ou URL
- Usa `LOVABLE_API_KEY` (já configurado) para chamar o Lovable AI Gateway

### 2. `src/lib/ai-service.ts` — Nova função `generateImage()`
- Chama a edge function `image-proxy`
- Gera prompts contextuais baseados no subtema e disciplina
- Retorna URL da imagem gerada

### 3. `src/pages/TrabalhoPage.tsx` — Opções de Imagem no Formulário
- Adicionar selector de **estilo de imagem**: Realista, Ilustração Educativa, Diagrama, Minimalista
- Na fase de compilação: gerar imagens contextualmente e inseri-las entre os subtemas
- Mostrar progresso: "A gerar imagem 2 de 5..."

### 4. `src/components/trabalho/TrabalhoCompleto.tsx` — Renderizar Imagens
- Inserir imagens geradas nas secções correspondentes do trabalho
- Legendas automáticas: "Figura 1: [descrição contextual]"

### 5. Exportação (PDF/Word)
- Incluir as imagens geradas nos exports existentes

## Ficheiros Afectados
1. **`supabase/functions/image-proxy/index.ts`** — nova edge function
2. **`src/lib/ai-service.ts`** — adicionar `generateImage()` e prompts de imagem contextuais
3. **`src/pages/TrabalhoPage.tsx`** — opções de estilo + lógica de geração na compilação
4. **`src/components/trabalho/TrabalhoCompleto.tsx`** — renderizar imagens inline
5. **`src/lib/export-utils.ts`** — incluir imagens nos exports

