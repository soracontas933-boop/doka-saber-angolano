import { generateWithAI, generateImageAI, DELLE_SYSTEM_PROMPT } from "@/lib/ai-service";
import type { ComposedSlideSpec } from "./variator";
import type { Deck, DeckTheme } from "@/types/presentation";

const MOTIF_PROMPT_HINTS: Record<string, string> = {
  bento:      "modern bento UI style, soft rounded blocks, premium product design",
  editorial:  "editorial magazine photography, elegant composition, soft natural light",
  minimal:    "minimalist composition, generous negative space, monochrome with single accent",
  glass:      "glassmorphism, frosted layers, soft gradients, ultra modern UI",
  brutalist:  "brutalist design, bold typography, raw textures, high contrast",
  luxury:     "luxury corporate design, deep shadows, premium materials, gold accents",
  cinematic:  "cinematic lighting, volumetric light, film still, dramatic mood",
  iridescent: "soft iridescent holographic illustration, pastel pink lavender cyan reflections, soap-bubble shimmer, hand-drawn modern editorial style, dreamy diffuse light, premium magazine illustration",
};

export type DensityLevel = "low" | "medium" | "high";

const DENSITY_HINT: Record<DensityLevel, string> = {
  low:    "Mínimo de texto: 2-3 bullets curtos (≤8 palavras cada). Estilo Gamma.",
  medium: "Equilibrado: 3-5 bullets (≤12 palavras cada).",
  high:   "Detalhado: 5-7 bullets (≤16 palavras cada). Inclui dados concretos.",
};

interface GenDeckContentArgs {
  topic: string;
  cardsOutline: string;          // texto formatado dos cards do utilizador
  slots: ComposedSlideSpec[];
  language: "pt-AO" | "pt-BR";
  density: DensityLevel;
  extraKeywords?: string[];
}

export interface RawAISlide {
  title: string;
  subtitle?: string;
  body?: string[];
  /** Parágrafo rico estilo Gamma com **negrito** inline em palavras-chave */
  richBody?: string;
  /** Pill curta no topo (ex: "OPORTUNIDADE · ANGOLA · 2025") */
  pill?: string;
  /** Frase de impacto no rodapé do slide */
  footnote?: string;
  blocks?: import("@/types/presentation").Block[];
  imagePrompt?: string;
}

export async function generateDeckContent(args: GenDeckContentArgs): Promise<RawAISlide[]> {
  const slotsList = args.slots
    .map((s, i) => `${i + 1}. [${s.section} / ${s.kind} / ${s.layoutVariant}]`)
    .join("\n");

  const userPrompt = `
Cria o conteúdo de uma apresentação executiva premium estilo Gamma sobre: "${args.topic}".

Tópicos do utilizador (matéria-prima — distribui pelos slides certos):
${args.cardsOutline}

Estrutura narrativa obrigatória (ordem e tipo exactos):
${slotsList}

Regras INVIOLÁVEIS:
- Total: ${args.slots.length} slides, ordem exacta.
- Idioma: ${args.language === "pt-AO" ? "Português de Angola (use 'utilizador', 'parceria', 'ficheiro')" : "Português do Brasil"}.
- Tom: executivo, cinematográfico, premium. ZERO meta-comentário, ZERO "neste slide".

CAMPOS POR SLIDE:
- "title": curto, impacto, 3-7 palavras (vai aparecer GIGANTE em azul).
- "subtitle": uma frase de contexto (≤20 palavras), opcional.
- "richBody": **PREFERIDO**. Parágrafo único curto (40-80 palavras) com 2-3 palavras em **negrito**. Ex: "Angola tem **2,9 milhões de estudantes** sem ferramentas digitais — a Delle chega primeiro."
- "body": só quando faz sentido bullets (lista de features). 3-5 itens curtos.
- "pill": tag MAIÚSCULAS (ex: "OPORTUNIDADE · 2025"). Apenas no hero/closing.
- "footnote": frase de impacto final (≤15 palavras), opcional.
- "imagePrompt": EM INGLÊS, ≤30 palavras, sem texto na imagem.
- "blocks": para stats/bento/process/timeline/comparison — {type, label, value, description, icon}.
  • stats → value ("1,6M","85%"), label, description curta.
  • bento-numbered → label (título) + description curta.
  • bento-icon-grid → icon (📚 🚀 ◆), label, description.
  • process/timeline → label (etapa), description.

DENSIDADE: ${DENSITY_HINT[args.density]}

REGRAS ESPECIAIS:
- HERO: usa "pill" + "title" curto + "subtitle" tagline.
- Slides "quote": title = citação, subtitle = autor.
- Slides "references": body = lista APA.
- Slides "closing": title curto + blocks com próximos passos numerados.

${args.extraKeywords?.length ? `Vibe visual: ${args.extraKeywords.join(", ")}.` : ""}

Devolve APENAS JSON válido:
{ "slides": [ { "title": "...", "pill": "...", "richBody": "...", "footnote": "...", "blocks": [...], "imagePrompt": "..." } ] }
`.trim();

  const result = await generateWithAI(DELLE_SYSTEM_PROMPT, userPrompt, 6000, 0.85);
  const match = result.content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Resposta da IA sem JSON");

  let parsed: { slides?: RawAISlide[] };
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    // tenta limpar trailing commas
    const cleaned = match[0].replace(/,(\s*[}\]])/g, "$1");
    parsed = JSON.parse(cleaned);
  }

  const slides = parsed.slides || [];
  // Garante que temos um item por slot (preenche faltas)
  while (slides.length < args.slots.length) {
    slides.push({ title: "Slide", body: [] });
  }
  return slides.slice(0, args.slots.length);
}

// Geração paralela com limite de concorrência
async function pMapLimit<T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      try {
        results[i] = await fn(items[i], i);
      } catch (e) {
        console.warn("[deck-image] falha slide", i, e);
        results[i] = undefined as unknown as R;
      }
    }
  });
  await Promise.all(workers);
  return results;
}

export async function generateDeckImages(
  deck: Deck,
  onProgress?: (slideIndex: number, imageUrl: string) => void
): Promise<void> {
  const motifHint = MOTIF_PROMPT_HINTS[deck.theme.motif] || "premium design";
  const paletteHint = `color palette: ${deck.theme.palette.primary}, ${deck.theme.palette.accent}`;

  const tasks = deck.slides
    .map((s, i) => ({ slide: s, index: i }))
    // skipa slides puramente tipográficos
    .filter(t => !["quote", "closing", "references"].includes(t.slide.kind));

  await pMapLimit(tasks, 3, async (task) => {
    const baseHint = task.slide.imagePrompt || `${task.slide.title} ${task.slide.subtitle || ""}`;
    let kindHint = "";
    if (task.slide.kind === "process") kindHint = ", clean infographic, flow diagram, no text";
    else if (task.slide.kind === "timeline") kindHint = ", elegant timeline infographic, no text";
    else if (task.slide.kind === "comparison") kindHint = ", split visual comparison, no text";
    else if (task.slide.kind === "dashboard") kindHint = ", modern UI dashboard mockup, no text";
    else if (task.slide.kind === "stats") kindHint = ", abstract data visualization, no text";

    const prompt = `${baseHint}, ${motifHint}, ${paletteHint}${kindHint}, professional, premium, no watermark`;
    try {
      const r = await generateImageAI(prompt, 1024, 768);
      task.slide.imageUrl = r.image_url;
      onProgress?.(task.index, r.image_url);
    } catch (e) {
      console.warn("[deck-image] erro", e);
    }
  });
}
