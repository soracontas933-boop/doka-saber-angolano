
# Engenharia de Apresentações Premium (estilo Gamma+)

Reescrita arquitetural do gerador de apresentações para produzir decks únicos, cinematográficos e modulares — superiores a Gamma/Canva/Beautiful.ai — mantendo o fluxo atual (chat → cards → customize → preview) mas trocando o motor de slides por um **sistema modular de blocos + variação procedural**.

## 1. Modelo de dados novo (`src/types/presentation.ts`)

Cada apresentação deixa de ser `Slide[]` simples e passa a ser uma `Deck` tipada:

```ts
type SlideKind =
  | "hero" | "agenda" | "context" | "insight" | "stats"
  | "bento" | "split" | "timeline" | "process" | "comparison"
  | "quote" | "gallery" | "dashboard" | "case-study"
  | "summary" | "conclusion" | "references" | "closing" | "cta";

type Slide = {
  id: string;
  kind: SlideKind;
  layoutVariant: string;    // ex: "bento-3x2", "split-left-image"
  title: string;
  subtitle?: string;
  body?: string[];          // bullets curtos (Gamma: menos texto)
  blocks?: Block[];         // cards/stats/timeline items
  imagePrompt?: string;     // 1 imagem por slide (gerada por IA)
  imageUrl?: string;
  accentRole?: "primary" | "secondary" | "muted";
};

type Block = {
  type: "stat" | "card" | "step" | "quote" | "compare" | "icon-text";
  label?: string; value?: string; description?: string; icon?: string;
};

type DeckTheme = {
  id: string; name: string;
  palette: { bg: string; surface: string; text: string; muted: string; primary: string; accent: string; };
  fonts: { heading: string; body: string; };
  motif: "bento" | "editorial" | "minimal" | "glass" | "brutalist" | "luxury" | "cinematic";
  radius: number;
};

type Deck = { id: string; topic: string; theme: DeckTheme; slides: Slide[]; seed: number; };
```

## 2. Estrutura narrativa Gamma (10 seções)

Novo arquivo `src/lib/presentation/narrative.ts` define o **blueprint obrigatório** que a IA deve preencher:

```
Hero → Agenda → Context → Insights → Deep Dive (modular) →
Visual Expansion → Synthesis → Conclusion → References → Closing
```

A IA recebe instrução para mapear os cards do utilizador nessas seções e escolher o `kind` ideal de cada slide (ex: estatísticas → `stats`, comparações → `comparison`, processos → `process`).

## 3. Biblioteca de layouts (`src/components/apresentacao/layouts/`)

12 componentes React, cada um aceitando `{ slide, theme }`:

- `HeroLayout.tsx` — full-bleed image + título massivo (3 variantes: split, overlay, center)
- `AgendaLayout.tsx` — lista numerada com ícones (2 variantes: vertical, grid)
- `BentoLayout.tsx` — grid assimétrico 3x2 / 2x3 / mosaic
- `SplitLayout.tsx` — imagem ↔ texto (4 variantes: L/R, 60/40, 50/50, diagonal)
- `StatsLayout.tsx` — números grandes (60–96pt) + label
- `TimelineLayout.tsx` — horizontal / vertical / zigzag
- `ProcessLayout.tsx` — fluxo com setas
- `ComparisonLayout.tsx` — 2 colunas / tabela
- `QuoteLayout.tsx` — citação cinematográfica
- `GalleryLayout.tsx` — grid de imagens
- `DashboardLayout.tsx` — cards + métricas
- `ClosingLayout.tsx` — “Obrigado / Q&A”

Cada layout suporta **3–5 variantes** internas (controladas por `layoutVariant`), totalizando 50+ combinações visuais.

## 4. Sistema anti-repetição (`src/lib/presentation/variator.ts`)

Função `composeDeck(narrative, seed)`:

- Usa um PRNG seeded (Mulberry32) — mesmo seed reproduz o deck, seeds diferentes produzem decks visualmente distintos.
- Para cada seção do blueprint, escolhe `kind` permitido + `layoutVariant` aleatório, **garantindo que não há 2 layouts iguais consecutivos** e evitando repetir o mesmo `layoutVariant` mais de N vezes no deck.
- Escolhe `DeckTheme` de uma biblioteca de **12 paletas curadas** (Midnight Executive, Forest Moss, Coral Energy, Terracotta, Ocean Gradient, Charcoal Minimal, Teal Trust, Berry Cream, Sage Calm, Cherry Bold, Kraft, Cinematic Noir) e 6 pares tipográficos.
- Atribui `motif` (bento/editorial/glass/etc.) que cada layout consome para mudar bordas, sombras, glass, profundidade.

## 5. Geração de conteúdo (IA de texto)

Nova função `generateDeckContent()` em `src/lib/presentation/ai-deck.ts`:

- Usa `generateWithAI` com **tool calling** (JSON Schema) em vez de regex parsing — mais robusto.
- Prompt instruindo: pouco texto por slide (máx 6 bullets de ≤12 palavras), tom cinematográfico, dados concretos quando aplicável, e — crucialmente — **escolher o `kind` adequado por slide** dentro do blueprint.
- Retorna `{ slides: [{ kind, title, subtitle, body, blocks, imagePrompt }] }`.

## 6. Geração de imagens (IA visual)

`generateDeckImages(deck)`:

- 1 imagem premium por slide (exceto `quote` e `closing` que podem ser puramente tipográficos).
- `imagePrompt` é enriquecido automaticamente com o `motif` do tema (ex: `"...cinematic, editorial, soft volumetric light, premium magazine style"`).
- Continua a usar `generateImageAI` (Round-Robin orquestrado já existente, regra do projeto).
- Geração em paralelo limitada (3 simultâneas) com fallback silencioso.
- **Infográficos, diagramas e ilustrações** ficam por conta da IA de imagem (conforme pedido), com prompt especializado quando `kind ∈ {process, timeline, comparison, dashboard}`.

## 7. Renderer (`src/components/apresentacao/DeckRenderer.tsx`)

Substitui o bloco hardcoded split-image atual. Recebe `Deck` e mapeia cada `slide.kind` → componente de layout correspondente. Suporta:

- Aspect ratios 16:9 / 4:5 / 1:1 / A4 (já no estado atual).
- Modo apresentação fullscreen (Fullscreen API + atalhos ←/→/Esc/F5).
- Thumbnails laterais para navegação.
- Tema dark/light por slide.

## 8. Refator de `ApresentacaoPage.tsx`

- Mantém os passos `chat → cards → customize → preview`.
- Step **customize** ganha:
  - Galeria de 12 paletas (preview real).
  - 3 níveis de densidade textual (Mínimo / Equilibrado / Detalhado).
  - Toggle “Variar layout a cada slide” (default ON).
  - Botão **“Re-gerar com novo seed”** no preview → mesmo conteúdo, design totalmente diferente.
- Step **preview** usa `DeckRenderer` + barra de ações (Guardar, Exportar PDF/PPTX, Apresentar, Re-shuffle).

## 9. Exportação

- **PDF**: já existe staging container + html2canvas/jsPDF na arquitetura do projeto (regra global). Exportador novo `src/lib/presentation/deck-export.ts` itera slides, renderiza cada um a 1920×1080 num clone deep, captura, adiciona ao PDF.
- **PPTX**: deferido para fase 2 (não no escopo desta entrega) — se o utilizador pedir, implementa-se com `pptxgenjs` server-side.

## 10. Detalhes técnicos / regras do projeto respeitadas

- Continua a usar **Lovable AI gateway** via `generateWithAI` / `generateImageAI` (orquestrador Round-Robin já implementado).
- Cobra créditos via `useUsageTracker` (`apresentacao` = 12 créditos, já no `CREDIT_COSTS`).
- Linguagem PT-AO mantida.
- Nada exposto sobre modelos/keys ao utilizador (apenas console.log).
- Sem alteração de schema do Supabase — o `Deck` é guardado como JSON em `saveProject("trabalho", ...)` (já é assim hoje).

## Estrutura de ficheiros final

```text
src/
  types/presentation.ts                 (novo)
  lib/presentation/
    narrative.ts                        (blueprint Gamma)
    variator.ts                         (PRNG + composição)
    themes.ts                           (12 paletas + 6 fontes)
    ai-deck.ts                          (IA texto + imagens)
    deck-export.ts                      (PDF)
  components/apresentacao/
    DeckRenderer.tsx
    layouts/
      HeroLayout.tsx
      AgendaLayout.tsx
      BentoLayout.tsx
      SplitLayout.tsx
      StatsLayout.tsx
      TimelineLayout.tsx
      ProcessLayout.tsx
      ComparisonLayout.tsx
      QuoteLayout.tsx
      GalleryLayout.tsx
      DashboardLayout.tsx
      ClosingLayout.tsx
  pages/ApresentacaoPage.tsx            (refatorada)
```

## Fora do escopo (ficam para depois, se quiseres)

- Editor drag-and-drop por bloco dentro do slide (atualmente edita-se via cards na etapa 2).
- Animações de transição entre slides em modo apresentação (entra a seguir).
- Exportação PPTX nativa.
- Co-edição em tempo real.

Confirmas para eu avançar com a implementação completa? Se quiseres, posso também reduzir o scope inicial para **6 layouts essenciais** (Hero, Bento, Split, Stats, Timeline, Closing) e expandir depois.
