import { generateWithAI, generateImageAI, DELLE_SYSTEM_PROMPT } from "@/lib/ai-service";
import type { ComposedSlideSpec } from "./variator";
import type { Deck, DeckTheme, Block, SlideKind } from "@/types/presentation";

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
  low:    "CURTO — richBody 40-70 palavras OU 3-4 bullets de 6-12 palavras. Cada block.description tem 1 frase (10-18 palavras). Linguagem sintética, directa.",
  medium: "MODERADO — richBody 90-140 palavras com 2-3 expressões em **negrito** OU 4-6 bullets de 12-22 palavras. Cada block.description tem 2 frases (25-40 palavras). Desenvolve causa→efeito→exemplo.",
  high:   "EXTENSO — richBody 180-260 palavras estruturado em 2 parágrafos com **negritos**, dados concretos (anos, percentagens, exemplos angolanos) E 5-7 bullets de 18-30 palavras quando aplicável. Cada block.description tem 3-4 frases (50-80 palavras) explicando contexto, evidência e implicação. Desenvolve cada subtema em profundidade — proibido ficar superficial.",
};

const DENSITY_TOKEN_BUDGET: Record<DensityLevel, number> = {
  low: 6000,
  medium: 10000,
  high: 16000,
};

// Tamanho mínimo do richBody por densidade (validação)
const DENSITY_MIN_RICHBODY: Record<DensityLevel, number> = {
  low: 120,    // ~25 palavras
  medium: 280, // ~55 palavras
  high: 600,   // ~120 palavras
};

// Tamanho mínimo de description em block por densidade
const DENSITY_MIN_BLOCK_DESC: Record<DensityLevel, number> = {
  low: 25,
  medium: 60,
  high: 140,
};

interface GenDeckContentArgs {
  topic: string;
  cardsOutline: string;
  slots: ComposedSlideSpec[];
  language: "pt-AO" | "pt-BR";
  density: DensityLevel;
  extraKeywords?: string[];
}

export interface RawAISlide {
  title: string;
  subtitle?: string;
  body?: string[];
  richBody?: string;
  pill?: string;
  footnote?: string;
  blocks?: Block[];
  imagePrompt?: string;
}

// ─── Requisitos mínimos por tipo de slide ────────────────────────
// Determina o que CADA kind precisa para não renderizar vazio.
function kindRequirements(kind: SlideKind): {
  needsRichBody: boolean;
  minBullets: number;
  minBlocks: number;
  blockShape: string; // descrição para o prompt
} {
  switch (kind) {
    case "hero":
      return { needsRichBody: false, minBullets: 0, minBlocks: 0, blockShape: "" };
    case "agenda":
      return { needsRichBody: false, minBullets: 4, minBlocks: 0, blockShape: "body[]: 4-7 títulos curtos das secções" };
    case "stats":
      return { needsRichBody: false, minBullets: 0, minBlocks: 3, blockShape: "blocks[]: 3-4 stats {value:'85%', label:'curto', description:'frase explicativa'}" };
    case "bento":
      return { needsRichBody: false, minBullets: 0, minBlocks: 3, blockShape: "blocks[]: 3-4 cards {label:'título', description:'2 frases', icon:'📚'}" };
    case "timeline":
      return { needsRichBody: false, minBullets: 0, minBlocks: 4, blockShape: "blocks[]: 4-5 etapas {label:'Etapa/Ano', description:'1 frase'}" };
    case "process":
      return { needsRichBody: false, minBullets: 0, minBlocks: 3, blockShape: "blocks[]: 3-5 passos {label:'Passo', description:'1 frase'}" };
    case "comparison":
      return { needsRichBody: false, minBullets: 0, minBlocks: 4, blockShape: "blocks[]: 4-6 linhas {label:'critério', value:'col A', description:'col B'}" };
    case "quote":
      return { needsRichBody: false, minBullets: 0, minBlocks: 0, blockShape: "title=citação completa, subtitle=autor — fonte" };
    case "split":
    case "context":
    case "case-study":
    case "insight":
      return { needsRichBody: true, minBullets: 3, minBlocks: 0, blockShape: "richBody (40-90 palavras com **negrito**) + body[]: 3-4 bullets" };
    case "summary":
    case "conclusion":
      return { needsRichBody: false, minBullets: 4, minBlocks: 0, blockShape: "body[]: 4-6 takeaways" };
    case "references":
      return { needsRichBody: false, minBullets: 4, minBlocks: 0, blockShape: "body[]: 4-8 referências formatadas APA" };
    case "closing":
    case "cta":
      return { needsRichBody: false, minBullets: 1, minBlocks: 0, blockShape: "title + subtitle + body[0]=texto do botão CTA" };
    case "dashboard":
    case "gallery":
      return { needsRichBody: false, minBullets: 3, minBlocks: 0, blockShape: "body[]: 3-4 captions curtas" };
    default:
      return { needsRichBody: true, minBullets: 0, minBlocks: 0, blockShape: "richBody (40-80 palavras)" };
  }
}

// ─── Validação sensível à densidade ───────────────────────────────
function isSlideValid(s: RawAISlide, kind: SlideKind, density: DensityLevel = "medium"): boolean {
  if (!s.title || s.title.trim().length < 2) return false;
  const req = kindRequirements(kind);
  const minRich = DENSITY_MIN_RICHBODY[density];
  const minDesc = DENSITY_MIN_BLOCK_DESC[density];

  const richOk = !req.needsRichBody || (!!s.richBody && s.richBody.trim().length >= minRich);
  const validBullets = (s.body || []).filter(b => b && b.trim().length > 4);
  const bulletsOk = req.minBullets === 0 || validBullets.length >= req.minBullets;
  const validBlocks = (s.blocks || []).filter(b =>
    (b.label || b.value) &&
    (b.description ? b.description.trim().length >= minDesc : !!b.value)
  );
  const blocksOk = req.minBlocks === 0 || validBlocks.length >= req.minBlocks;

  if (req.needsRichBody && !richOk) return false;
  if (req.minBlocks > 0 && !blocksOk) return false;
  if (req.minBullets > 0 && !bulletsOk && !richOk) return false;
  return true;
}

// ─── Sanitiza ──────────────────────────────────────────────────────
function sanitizeSlide(s: RawAISlide): RawAISlide {
  return {
    ...s,
    body: (s.body || []).map(b => (b || "").trim()).filter(b => b.length > 0),
    blocks: (s.blocks || []).filter(b => (b.label || b.value || b.description)),
  };
}

// ─── Fallback determinístico — usa SEMPRE o cardsOutline real ─────
function buildFallback(kind: SlideKind, original: RawAISlide, topic: string, cardsOutline: string, density: DensityLevel = "medium"): RawAISlide {
  const req = kindRequirements(kind);
  const lines = cardsOutline.split("\n").map(l => l.trim()).filter(Boolean);
  const fb: RawAISlide = { ...original, title: original.title || topic };

  // Extrai pares título/subtemas do outline
  const parsedLines = lines.map(l => {
    const [head, ...rest] = l.split(":");
    return { head: head.trim(), tail: rest.join(":").trim() };
  });

  const expandTo = (base: string, target: number): string => {
    let out = base;
    while (out.length < target) {
      out += ` Este aspecto é particularmente relevante no contexto de ${topic}, exigindo análise cuidadosa das suas implicações práticas e estratégicas.`;
    }
    return out;
  };

  if (req.needsRichBody && (!fb.richBody || fb.richBody.length < DENSITY_MIN_RICHBODY[density])) {
    const seed = original.subtitle ||
      parsedLines.slice(0, 3).map(p => `**${p.head}** — ${p.tail || "aspecto crítico"}`).join(". ") ||
      `Análise sobre **${topic}** com foco em impacto, oportunidades e próximos passos concretos.`;
    fb.richBody = expandTo(seed + ".", DENSITY_MIN_RICHBODY[density]);
  }

  if (req.minBullets > 0 && (!fb.body || fb.body.length < req.minBullets)) {
    const need = Math.max(req.minBullets, density === "high" ? 6 : density === "medium" ? 4 : 3);
    fb.body = parsedLines.length >= need
      ? parsedLines.slice(0, need + 1).map(p => p.tail ? `${p.head}: ${p.tail}` : p.head)
      : Array.from({ length: need }, (_, i) =>
          parsedLines[i]?.head || `Ponto-chave ${i + 1} sobre ${topic}`
        );
  }

  if (req.minBlocks > 0 && (!fb.blocks || fb.blocks.length < req.minBlocks)) {
    const need = Math.max(req.minBlocks, density === "high" ? 4 : 3);
    fb.blocks = Array.from({ length: need }, (_, i) => {
      const p = parsedLines[i];
      const baseDesc = p?.tail || `Detalhe relevante sobre ${p?.head || topic}.`;
      return {
        type: "card" as const,
        label: p?.head || `Aspecto ${i + 1}`,
        value: kind === "stats" ? `0${i + 1}` : undefined,
        description: expandTo(baseDesc, DENSITY_MIN_BLOCK_DESC[density]),
        icon: ["📚", "🚀", "◆", "✦", "⚡", "🎯"][i % 6],
      };
    });
  }
  return fb;
}

export async function generateDeckContent(args: GenDeckContentArgs): Promise<RawAISlide[]> {
  const slotsList = args.slots
    .map((s, i) => {
      const req = kindRequirements(s.kind);
      return `${i + 1}. [${s.kind}] → ${req.blockShape || "richBody"}`;
    })
    .join("\n");

  const userPrompt = `
Cria o conteúdo de uma apresentação executiva premium estilo Gamma sobre: "${args.topic}".

Tópicos do utilizador (matéria-prima — distribui pelos slides certos, NUNCA inventes do zero ignorando isto):
${args.cardsOutline}

ESTRUTURA OBRIGATÓRIA (respeita a ordem e o tipo de cada slot, e PREENCHE OS CAMPOS PEDIDOS):
${slotsList}

REGRA #1 — NENHUM SLIDE PODE TER CARDS/BULLETS VAZIOS.
Se um slot pede "blocks: 3-4 stats", devolves 3-4 blocks completos com value, label E description.
Se pede "body: 4-6 takeaways", devolves 4-6 strings reais (não placeholders).
Slides vazios serão rejeitados e regenerados — não desperdices tokens.

REGRA #2 — IDIOMA: ${args.language === "pt-AO" ? "Português de Angola ('utilizador', 'parceria', 'ficheiro', 'óptimo')" : "Português do Brasil"}.

REGRA #3 — Tom executivo, cinematográfico, premium. ZERO meta-comentário ("neste slide", "vamos ver"). Frases directas e densas.

REGRA #4 — DENSIDADE OBRIGATÓRIA: ${DENSITY_HINT[args.density]}
   ⚠ Esta regra é IMPERATIVA. Slides com texto abaixo do limiar serão rejeitados. Cada subtema do utilizador DEVE ser desenvolvido com profundidade proporcional à densidade pedida — não te limites a repetir o título do subtema, EXPLICA, contextualiza e dá exemplos concretos angolanos.

CAMPOS DISPONÍVEIS POR SLIDE:
- title (obrigatório, 3-7 palavras de impacto, vai aparecer GIGANTE)
- subtitle (opcional, ≤20 palavras de contexto)
- pill (opcional, MAIÚSCULAS curtas tipo "OPORTUNIDADE · 2025") — usar sobretudo no hero
- richBody (parágrafo único 40-90 palavras com 2-3 expressões em **negrito**)
- body (array de strings curtas, sem markdown)
- footnote (frase ≤15 palavras de impacto, opcional)
- blocks (array de objectos {type, label, value, description, icon})
  • stats → {value:"85%", label:"Curto", description:"frase explicativa"}
  • bento → {label:"Título", description:"2 frases", icon:"📚"}
  • timeline/process → {label:"Etapa", description:"1 frase"}
  • comparison → {label:"critério", value:"opção A", description:"opção B"}
- imagePrompt (EM INGLÊS, ≤30 palavras, sem texto na imagem)

REGRAS ESPECIAIS:
- HERO: pill + title curto + subtitle tagline. Sem body/blocks.
- QUOTE: title = citação completa entre aspas; subtitle = "Autor — Fonte".
- REFERENCES: body = 4-8 referências APA reais (autor, ano, título, fonte).
- CLOSING/CTA: title curto + subtitle + body[0] = texto do botão.

${args.extraKeywords?.length ? `Vibe visual: ${args.extraKeywords.join(", ")}.` : ""}

Devolve APENAS JSON válido (sem comentários, sem markdown):
{ "slides": [ {...}, {...} ] }
`.trim();

  const result = await generateWithAI(DELLE_SYSTEM_PROMPT, userPrompt, DENSITY_TOKEN_BUDGET[args.density], 0.8);
  const match = result.content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Resposta da IA sem JSON");

  let parsed: { slides?: RawAISlide[] };
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    const cleaned = match[0].replace(/,(\s*[}\]])/g, "$1");
    parsed = JSON.parse(cleaned);
  }

  let slides = (parsed.slides || []).map(sanitizeSlide);

  while (slides.length < args.slots.length) {
    slides.push({ title: args.topic, body: [] });
  }
  slides = slides.slice(0, args.slots.length);

  // ─── Identificar slides inválidos ──
  const invalidIndexes = slides
    .map((s, i) => (isSlideValid(s, args.slots[i].kind) ? -1 : i))
    .filter(i => i >= 0);

  // ─── Tentar regenerar inválidos numa segunda passagem (uma vez) ──
  if (invalidIndexes.length > 0) {
    console.log(`[ai-deck] ${invalidIndexes.length} slides inválidos — a regenerar`);
    try {
      const fixPrompt = `
Os seguintes slides ficaram incompletos. PREENCHE-OS por completo respeitando o tipo e os campos obrigatórios.

Tema: "${args.topic}"
Tópicos do utilizador:
${args.cardsOutline}

Slides a corrigir (devolve no MESMO índice):
${invalidIndexes.map(i => {
  const req = kindRequirements(args.slots[i].kind);
  return `Índice ${i} — tipo "${args.slots[i].kind}" — precisa de: ${req.blockShape}\nTítulo actual: "${slides[i].title}"`;
}).join("\n\n")}

Devolve APENAS JSON: { "fixes": [ { "index": 0, "slide": { ...slide completo... } }, ... ] }
Idioma: ${args.language === "pt-AO" ? "pt-AO" : "pt-BR"}.
`.trim();

      const fixResult = await generateWithAI(DELLE_SYSTEM_PROMPT, fixPrompt, 4000, 0.7);
      const fmatch = fixResult.content.match(/\{[\s\S]*\}/);
      if (fmatch) {
        const fparsed = JSON.parse(fmatch[0].replace(/,(\s*[}\]])/g, "$1"));
        for (const fix of (fparsed.fixes || [])) {
          if (typeof fix.index === "number" && fix.slide) {
            slides[fix.index] = sanitizeSlide({ ...slides[fix.index], ...fix.slide });
          }
        }
      }
    } catch (e) {
      console.warn("[ai-deck] regeneração falhou — a usar fallback determinístico", e);
    }
  }

  // ─── Fallback determinístico para os que ainda estão inválidos ──
  slides = slides.map((s, i) => {
    if (isSlideValid(s, args.slots[i].kind)) return s;
    console.log(`[ai-deck] fallback no slide ${i} (${args.slots[i].kind})`);
    return buildFallback(args.slots[i].kind, s, args.topic, args.cardsOutline);
  });

  return slides;
}

// ─── Regenerar UM slide isolado (usado pelo editor lateral) ──────
export async function regenerateSingleSlide(args: {
  topic: string;
  cardsOutline: string;
  kind: SlideKind;
  currentTitle?: string;
  language: "pt-AO" | "pt-BR";
  density: DensityLevel;
  hint?: string;
}): Promise<RawAISlide> {
  const req = kindRequirements(args.kind);
  const prompt = `
Regenera UM slide de uma apresentação premium sobre "${args.topic}".

Tipo: "${args.kind}"
Campos exigidos: ${req.blockShape || "richBody (40-80 palavras)"}
${args.currentTitle ? `Título actual (podes manter ou melhorar): "${args.currentTitle}"` : ""}
${args.hint ? `Pedido extra do utilizador: ${args.hint}` : ""}

Tópicos do utilizador (matéria-prima):
${args.cardsOutline}

Idioma: ${args.language === "pt-AO" ? "pt-AO" : "pt-BR"}.
Densidade: ${DENSITY_HINT[args.density]}
Tom executivo, cinematográfico. ZERO meta-comentário.

Devolve APENAS JSON: { "slide": { "title":"...", "subtitle":"...", "richBody":"...", "body":[...], "blocks":[...], "pill":"...", "footnote":"...", "imagePrompt":"..." } }
`.trim();

  const result = await generateWithAI(DELLE_SYSTEM_PROMPT, prompt, 2500, 0.8);
  const m = result.content.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Sem JSON");
  const parsed = JSON.parse(m[0].replace(/,(\s*[}\]])/g, "$1"));
  let s = sanitizeSlide(parsed.slide || {});
  if (!isSlideValid(s, args.kind)) s = buildFallback(args.kind, s, args.topic, args.cardsOutline);
  return s;
}

// ─── Image generation (inalterado) ───────────────────────────────
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
