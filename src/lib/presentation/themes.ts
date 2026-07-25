import type { DeckTheme } from "@/types/presentation";

// Templates inteligentes por setor + paletas curadas
// Cada template define: cores, fontes, motivo visual, raio, visibilidade do badge

export type TemplateCategory =
  | "executivo"
  | "startup"
  | "conferencia"
  | "saude"
  | "juridico"
  | "engenharia"
  | "academico"
  | "comercial"
  | "luxo"
  | "dark-premium";

export interface DeckTheme {
  id: string;
  name: string;
  palette: {
    bg: string;
    surface: string;
    text: string;
    muted: string;
    primary: string;
    accent: string;
    isDark: boolean;
  };
  fonts: { heading: string; body: string };
  motif: "bento" | "editorial" | "minimal" | "glass" | "brutalist" | "luxury" | "cinematic" | "iridescent";
  radius: number;
  category?: TemplateCategory;
  showBadge?: boolean; // padrão: true — false para temas premium/sem marca
}

export const DECK_THEMES: DeckTheme[] = [
  // ─── Executivo ───
  {
    id: "iridescent-delle",
    name: "Iridescent Delle",
    palette: { bg: "#FAFBFE", surface: "#FFFFFF", text: "#1F2230", muted: "#5A6275", primary: "#4F6FFF", accent: "#B5BFFF", isDark: false },
    fonts: { heading: "'SF Pro Display', system-ui, sans-serif", body: "'Inter', sans-serif" },
    motif: "iridescent",
    radius: 18,
    category: "academico",
  },
  {
    id: "midnight-executive",
    name: "Midnight Executive",
    palette: { bg: "#0B1437", surface: "#1A2456", text: "#FFFFFF", muted: "#CADCFC", primary: "#5B8DEF", accent: "#F2C94C", isDark: true },
    fonts: { heading: "'SF Pro Display', system-ui, sans-serif", body: "'Inter', sans-serif" },
    motif: "luxury",
    radius: 18,
    category: "executivo",
  },
  // ─── Startup ───
  {
    id: "coral-energy",
    name: "Coral Energy",
    palette: { bg: "#FFFAF5", surface: "#FFFFFF", text: "#2F3C7E", muted: "#7A6E8A", primary: "#F96167", accent: "#F9E795", isDark: false },
    fonts: { heading: "'Poppins', sans-serif", body: "'Inter', sans-serif" },
    motif: "bento",
    radius: 24,
    category: "startup",
  },
  {
    id: "neon-pulse",
    name: "Neon Pulse",
    palette: { bg: "#0A0A14", surface: "#15152A", text: "#E0E0FF", muted: "#8888AA", primary: "#00F5D4", accent: "#7B61FF", isDark: true },
    fonts: { heading: "'SF Pro Display', system-ui, sans-serif", body: "'Inter', sans-serif" },
    motif: "cinematic",
    radius: 16,
    category: "startup",
  },
  // ─── Conferência ───
  {
    id: "ocean-gradient",
    name: "Ocean Gradient",
    palette: { bg: "#0A1929", surface: "#163A5F", text: "#E3F2FD", muted: "#90CAF9", primary: "#1C7293", accent: "#21D4FD", isDark: true },
    fonts: { heading: "'SF Pro Display', system-ui, sans-serif", body: "'Inter', sans-serif" },
    motif: "cinematic",
    radius: 20,
    category: "conferencia",
  },
  {
    id: "teal-trust",
    name: "Teal Trust",
    palette: { bg: "#F0FBFA", surface: "#FFFFFF", text: "#053131", muted: "#4F7C7C", primary: "#028090", accent: "#02C39A", isDark: false },
    fonts: { heading: "'Poppins', sans-serif", body: "'Inter', sans-serif" },
    motif: "bento",
    radius: 16,
    category: "conferencia",
  },
  // ─── Saúde ───
  {
    id: "sage-calm",
    name: "Sage Calm",
    palette: { bg: "#F4F7F2", surface: "#FFFFFF", text: "#2D3F38", muted: "#7A8F87", primary: "#84B59F", accent: "#50808E", isDark: false },
    fonts: { heading: "'Georgia', serif", body: "'Inter', sans-serif" },
    motif: "minimal",
    radius: 18,
    category: "saude",
  },
  {
    id: "medical-clean",
    name: "Medical Clean",
    palette: { bg: "#F8FAFB", surface: "#FFFFFF", text: "#1A2B3C", muted: "#6B8099", primary: "#0EA5E9", accent: "#22D3EE", isDark: false },
    fonts: { heading: "'SF Pro Display', system-ui, sans-serif", body: "'Inter', sans-serif" },
    motif: "minimal",
    radius: 12,
    category: "saude",
    showBadge: false,
  },
  // ─── Jurídico ───
  {
    id: "navy-formal",
    name: "Navy Formal",
    palette: { bg: "#F5F3EF", surface: "#FFFFFF", text: "#1A1A2E", muted: "#5A5A6E", primary: "#1B2A4A", accent: "#C9A84C", isDark: false },
    fonts: { heading: "'Georgia', serif", body: "'Inter', sans-serif" },
    motif: "editorial",
    radius: 6,
    category: "juridico",
  },
  {
    id: "slate-legal",
    name: "Slate Legal",
    palette: { bg: "#FAFAFA", surface: "#FFFFFF", text: "#1C1C1C", muted: "#6B6B6B", primary: "#374151", accent: "#9CA3AF", isDark: false },
    fonts: { heading: "'Georgia', serif", body: "'Georgia', serif" },
    motif: "minimal",
    radius: 4,
    category: "juridico",
    showBadge: false,
  },
  // ─── Engenharia ───
  {
    id: "charcoal-minimal",
    name: "Charcoal Minimal",
    palette: { bg: "#FAFAFA", surface: "#FFFFFF", text: "#212121", muted: "#757575", primary: "#36454F", accent: "#FF6B35", isDark: false },
    fonts: { heading: "'Inter', sans-serif", body: "'Inter', sans-serif" },
    motif: "minimal",
    radius: 4,
    category: "engenharia",
  },
  {
    id: "steel-industrial",
    name: "Steel Industrial",
    palette: { bg: "#E8ECF0", surface: "#FFFFFF", text: "#1A1A1A", muted: "#6B7280", primary: "#3B4F63", accent: "#F59E0B", isDark: false },
    fonts: { heading: "'SF Pro Display', system-ui, sans-serif", body: "'Inter', sans-serif" },
    motif: "brutalist",
    radius: 2,
    category: "engenharia",
  },
  // ─── Acadêmico ───
  {
    id: "forest-moss",
    name: "Forest & Moss",
    palette: { bg: "#F5F5F0", surface: "#FFFFFF", text: "#1A2E1A", muted: "#5C6F5C", primary: "#2C5F2D", accent: "#97BC62", isDark: false },
    fonts: { heading: "'Georgia', serif", body: "'Inter', sans-serif" },
    motif: "editorial",
    radius: 12,
    category: "academico",
  },
  {
    id: "berry-cream",
    name: "Berry & Cream",
    palette: { bg: "#FBF4ED", surface: "#FFFFFF", text: "#3A1424", muted: "#8B5A6B", primary: "#6D2E46", accent: "#D4A574", isDark: false },
    fonts: { heading: "'Georgia', serif", body: "'Inter', sans-serif" },
    motif: "editorial",
    radius: 14,
    category: "academico",
  },
  // ─── Comercial ───
  {
    id: "cherry-bold",
    name: "Cherry Bold",
    palette: { bg: "#FCF6F5", surface: "#FFFFFF", text: "#1A1A2E", muted: "#5A5A6E", primary: "#990011", accent: "#2F3C7E", isDark: false },
    fonts: { heading: "'SF Pro Display', system-ui, sans-serif", body: "'Inter', sans-serif" },
    motif: "brutalist",
    radius: 2,
    category: "comercial",
  },
  {
    id: "warm-terracotta",
    name: "Warm Terracotta",
    palette: { bg: "#E7E8D1", surface: "#FFFFFF", text: "#3A1F1A", muted: "#8B6B5A", primary: "#B85042", accent: "#A7BEAE", isDark: false },
    fonts: { heading: "'Georgia', serif", body: "'Inter', sans-serif" },
    motif: "editorial",
    radius: 8,
    category: "comercial",
  },
  // ─── Luxo ───
  {
    id: "noir-gold",
    name: "Noir & Gold",
    palette: { bg: "#0D0D0D", surface: "#1A1A1A", text: "#F5F5F5", muted: "#A0A0A0", primary: "#D4AF37", accent: "#F5E6C8", isDark: true },
    fonts: { heading: "'Georgia', serif", body: "'Inter', sans-serif" },
    motif: "luxury",
    radius: 8,
    category: "luxo",
    showBadge: false,
  },
  {
    id: "cinematic-noir",
    name: "Cinematic Noir",
    palette: { bg: "#0D0D0D", surface: "#1A1A1A", text: "#F5F5F5", muted: "#A0A0A0", primary: "#E50914", accent: "#FFD700", isDark: true },
    fonts: { heading: "'SF Pro Display', system-ui, sans-serif", body: "'Inter', sans-serif" },
    motif: "cinematic",
    radius: 6,
    category: "luxo",
  },
  // ─── Dark Premium ───
  {
    id: "glass-arctic",
    name: "Glass Arctic",
    palette: { bg: "#E8F4FB", surface: "rgba(255,255,255,0.6)", text: "#0A2540", muted: "#5C7A99", primary: "#1E9DF1", accent: "#7FE7DC", isDark: false },
    fonts: { heading: "'SF Pro Display', system-ui, sans-serif", body: "'Inter', sans-serif" },
    motif: "glass",
    radius: 22,
    category: "dark-premium",
  },
  {
    id: "deep-space",
    name: "Deep Space",
    palette: { bg: "#050510", surface: "#0A0A1A", text: "#E0E8FF", muted: "#6B7FA0", primary: "#6366F1", accent: "#A78BFA", isDark: true },
    fonts: { heading: "'SF Pro Display', system-ui, sans-serif", body: "'Inter', sans-serif" },
    motif: "glass",
    radius: 20,
    category: "dark-premium",
    showBadge: false,
  },
];

export function getThemeById(id: string): DeckTheme {
  return DECK_THEMES.find(t => t.id === id) || DECK_THEMES[0];
}

export function getThemesByCategory(category: TemplateCategory): DeckTheme[] {
  return DECK_THEMES.filter(t => t.category === category);
}

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string; icon: string }[] = [
  { id: "executivo", label: "Executivo", icon: "📊" },
  { id: "startup", label: "Startup", icon: "🚀" },
  { id: "conferencia", label: "Conferência", icon: "🎤" },
  { id: "saude", label: "Saúde", icon: "🏥" },
  { id: "juridico", label: "Jurídico", icon: "⚖️" },
  { id: "engenharia", label: "Engenharia", icon: "🏗" },
  { id: "academico", label: "Académico", icon: "🎓" },
  { id: "comercial", label: "Comercial", icon: "🛒" },
  { id: "luxo", label: "Luxo", icon: "💎" },
  { id: "dark-premium", label: "Dark Premium", icon: "🌙" },
];

export function isBadgeVisible(theme: DeckTheme): boolean {
  return theme.showBadge !== false; // padrão: mostrar, só esconde se explicitamente false
}
