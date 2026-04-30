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
  blocks?: import("@/types/presentation").Block[];
  imagePrompt?: string;
}

export async function generateDeckContent(args: GenDeckContentArgs): Promise<RawAISlide[]> {
  const slotsList = args.slots
    .map((s, i) => `${i + 1}. [${s.section} / ${s.kind} / ${s.layoutVariant}]`)
    .join("\n");

  const userPrompt = `
Cria o conteúdo de uma apresentação profissional sobre: "${args.topic}".

Tópicos do utilizador (usa-os como matéria-prima — distribui pelos slides certos):
${args.cardsOutline}

Estrutura narrativa obrigatória (segue EXACTAMENTE esta ordem e tipo de cada slide):
${slotsList}

Regras INVIOLÁVEIS:
- Total: ${args.slots.length} slides, na ordem exacta acima.
- Para cada slide, devolve "title" (curto, impacto), opcional "subtitle", "body" (array de bullets curtos) e "imagePrompt" (descrição em INGLÊS para gerar imagem).
- Para slides de tipo "stats", "bento", "comparison", "timeline", "process", "dashboard", "summary": devolve "blocks" — array de objectos com {type, label, value, description}.
  • stats   → blocks com value (ex "78%") e label.
  • timeline/process → blocks com label (ano/etapa) e description.
  • comparison → blocks com label e description (2-4 itens).
  • bento/summary → blocks com label e description curta.
- ${DENSITY_HINT[args.density]}
- Slides "quote": title = a citação completa, subtitle = autor.
- Slides "references": body = lista de fontes formatadas.
- Slides "closing": title curto ("Obrigado", "Q&A"), subtitle opcional.
- Idioma: ${args.language === "pt-AO" ? "Português de Angola" : "Português"}.
- Tom: cinematográfico, executivo, premium. ZERO meta-comentário.
${args.extraKeywords?.length ? `- Vibe visual: ${args.extraKeywords.join(", ")}.` : ""}

Devolve APENAS JSON válido com este formato exacto:
{
  "slides": [
    { "title": "...", "subtitle": "...", "body": ["...","..."], "blocks": [{"type":"stat","label":"...","value":"..."}], "imagePrompt": "..." }
  ]
}
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
