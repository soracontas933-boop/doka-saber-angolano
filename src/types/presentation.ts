// Tipos do motor de apresentações premium (estilo Gamma+)

export type SlideKind =
  | "hero"
  | "agenda"
  | "context"
  | "insight"
  | "stats"
  | "bento"
  | "split"
  | "timeline"
  | "process"
  | "comparison"
  | "quote"
  | "gallery"
  | "dashboard"
  | "case-study"
  | "summary"
  | "conclusion"
  | "references"
  | "closing"
  | "cta";

export type SlideSection =
  | "hero"
  | "agenda"
  | "context"
  | "insights"
  | "deep-dive"
  | "visual-expansion"
  | "synthesis"
  | "conclusion"
  | "references"
  | "closing";

export type BlockType = "stat" | "card" | "step" | "quote" | "compare" | "icon-text";

export interface Block {
  type: BlockType;
  label?: string;
  value?: string;
  description?: string;
  icon?: string;
}

export interface Slide {
  id: string;
  section: SlideSection;
  kind: SlideKind;
  layoutVariant: string;
  title: string;
  subtitle?: string;
  body?: string[];
  blocks?: Block[];
  imagePrompt?: string;
  imageUrl?: string;
  accentRole?: "primary" | "secondary" | "muted";
}

export type ThemeMotif =
  | "bento"
  | "editorial"
  | "minimal"
  | "glass"
  | "brutalist"
  | "luxury"
  | "cinematic";

export interface DeckPalette {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  primary: string;
  accent: string;
  isDark: boolean;
}

export interface DeckTheme {
  id: string;
  name: string;
  palette: DeckPalette;
  fonts: { heading: string; body: string };
  motif: ThemeMotif;
  radius: number;
}

export type AspectRatio = "16:9" | "4:5" | "1:1" | "A4";

export interface Deck {
  id: string;
  topic: string;
  subtitle?: string;
  theme: DeckTheme;
  slides: Slide[];
  seed: number;
  aspectRatio: AspectRatio;
}
