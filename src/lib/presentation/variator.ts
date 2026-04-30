import type { Deck, DeckTheme, Slide, SlideKind } from "@/types/presentation";
import { DECK_THEMES } from "./themes";
import { LAYOUT_VARIANTS, buildBlueprint, type SectionSpec } from "./narrative";

// PRNG seeded (Mulberry32) — reproduzível e bem distribuído
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickAvoiding<T>(rng: () => number, arr: T[], avoid: T | undefined): T {
  if (!avoid || arr.length === 1) return pick(rng, arr);
  const filtered = arr.filter(x => x !== avoid);
  return pick(rng, filtered);
}

export interface ComposedSlideSpec {
  section: SectionSpec["section"];
  kind: SlideKind;
  layoutVariant: string;
}

// Produz a lista de "slots" (kind+variant) ANTES de chamar a IA.
// A IA depois preenche título/conteúdo respeitando estes slots.
export function composeSlots(targetSlideCount: number, seed: number): ComposedSlideSpec[] {
  const rng = mulberry32(seed);
  const blueprint = buildBlueprint(targetSlideCount);
  const slots: ComposedSlideSpec[] = [];
  let lastVariant: string | undefined;
  const variantCounts: Record<string, number> = {};

  for (const sec of blueprint) {
    for (let i = 0; i < sec.defaultCount; i++) {
      const kind = pick(rng, sec.allowedKinds);
      const variants = LAYOUT_VARIANTS[kind];
      let variant = pickAvoiding(rng, variants, lastVariant);
      // Evita usar o mesmo variant 3+ vezes no deck
      if ((variantCounts[variant] || 0) >= 2 && variants.length > 1) {
        variant = pickAvoiding(rng, variants, variant);
      }
      variantCounts[variant] = (variantCounts[variant] || 0) + 1;
      lastVariant = variant;
      slots.push({ section: sec.section, kind, layoutVariant: variant });
    }
  }
  return slots;
}

export function pickTheme(seed: number, preferredId?: string): DeckTheme {
  if (preferredId) {
    const t = DECK_THEMES.find(t => t.id === preferredId);
    if (t) return t;
  }
  const rng = mulberry32(seed ^ 0xA5A5A5);
  return pick(rng, DECK_THEMES);
}

// Combina slots+conteúdo da IA em slides finais
export function assembleDeck(args: {
  topic: string;
  subtitle?: string;
  slots: ComposedSlideSpec[];
  aiSlides: Array<{
    title: string;
    subtitle?: string;
    body?: string[];
    blocks?: Slide["blocks"];
    imagePrompt?: string;
  }>;
  theme: DeckTheme;
  seed: number;
  aspectRatio: Deck["aspectRatio"];
}): Deck {
  const slides: Slide[] = args.slots.map((slot, i) => {
    const ai = args.aiSlides[i] || { title: "" };
    return {
      id: `slide-${i}-${args.seed}`,
      section: slot.section,
      kind: slot.kind,
      layoutVariant: slot.layoutVariant,
      title: ai.title || "",
      subtitle: ai.subtitle,
      body: ai.body || [],
      richBody: (ai as any).richBody,
      pill: (ai as any).pill,
      footnote: (ai as any).footnote,
      blocks: ai.blocks || [],
      imagePrompt: ai.imagePrompt,
    };
  });

  return {
    id: `deck-${args.seed}`,
    topic: args.topic,
    subtitle: args.subtitle,
    theme: args.theme,
    slides,
    seed: args.seed,
    aspectRatio: args.aspectRatio,
  };
}

export function newSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}
