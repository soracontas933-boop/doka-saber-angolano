import type { DeckTheme } from "@/types/presentation";

// 12 paletas curadas inspiradas em decks premium
export const DECK_THEMES: DeckTheme[] = [
  {
    id: "midnight-executive",
    name: "Midnight Executive",
    palette: { bg: "#0B1437", surface: "#1A2456", text: "#FFFFFF", muted: "#CADCFC", primary: "#5B8DEF", accent: "#F2C94C", isDark: true },
    fonts: { heading: "'SF Pro Display', system-ui, sans-serif", body: "'Inter', sans-serif" },
    motif: "luxury",
    radius: 18,
  },
  {
    id: "forest-moss",
    name: "Forest & Moss",
    palette: { bg: "#F5F5F0", surface: "#FFFFFF", text: "#1A2E1A", muted: "#5C6F5C", primary: "#2C5F2D", accent: "#97BC62", isDark: false },
    fonts: { heading: "'Georgia', serif", body: "'Inter', sans-serif" },
    motif: "editorial",
    radius: 12,
  },
  {
    id: "coral-energy",
    name: "Coral Energy",
    palette: { bg: "#FFFAF5", surface: "#FFFFFF", text: "#2F3C7E", muted: "#7A6E8A", primary: "#F96167", accent: "#F9E795", isDark: false },
    fonts: { heading: "'Poppins', sans-serif", body: "'Inter', sans-serif" },
    motif: "bento",
    radius: 24,
  },
  {
    id: "warm-terracotta",
    name: "Warm Terracotta",
    palette: { bg: "#E7E8D1", surface: "#FFFFFF", text: "#3A1F1A", muted: "#8B6B5A", primary: "#B85042", accent: "#A7BEAE", isDark: false },
    fonts: { heading: "'Georgia', serif", body: "'Inter', sans-serif" },
    motif: "editorial",
    radius: 8,
  },
  {
    id: "ocean-gradient",
    name: "Ocean Gradient",
    palette: { bg: "#0A1929", surface: "#163A5F", text: "#E3F2FD", muted: "#90CAF9", primary: "#1C7293", accent: "#21D4FD", isDark: true },
    fonts: { heading: "'SF Pro Display', system-ui, sans-serif", body: "'Inter', sans-serif" },
    motif: "cinematic",
    radius: 20,
  },
  {
    id: "charcoal-minimal",
    name: "Charcoal Minimal",
    palette: { bg: "#FAFAFA", surface: "#FFFFFF", text: "#212121", muted: "#757575", primary: "#36454F", accent: "#FF6B35", isDark: false },
    fonts: { heading: "'Inter', sans-serif", body: "'Inter', sans-serif" },
    motif: "minimal",
    radius: 4,
  },
  {
    id: "teal-trust",
    name: "Teal Trust",
    palette: { bg: "#F0FBFA", surface: "#FFFFFF", text: "#053131", muted: "#4F7C7C", primary: "#028090", accent: "#02C39A", isDark: false },
    fonts: { heading: "'Poppins', sans-serif", body: "'Inter', sans-serif" },
    motif: "bento",
    radius: 16,
  },
  {
    id: "berry-cream",
    name: "Berry & Cream",
    palette: { bg: "#FBF4ED", surface: "#FFFFFF", text: "#3A1424", muted: "#8B5A6B", primary: "#6D2E46", accent: "#D4A574", isDark: false },
    fonts: { heading: "'Georgia', serif", body: "'Inter', sans-serif" },
    motif: "editorial",
    radius: 14,
  },
  {
    id: "cherry-bold",
    name: "Cherry Bold",
    palette: { bg: "#FCF6F5", surface: "#FFFFFF", text: "#1A1A2E", muted: "#5A5A6E", primary: "#990011", accent: "#2F3C7E", isDark: false },
    fonts: { heading: "'SF Pro Display', system-ui, sans-serif", body: "'Inter', sans-serif" },
    motif: "brutalist",
    radius: 2,
  },
  {
    id: "cinematic-noir",
    name: "Cinematic Noir",
    palette: { bg: "#0D0D0D", surface: "#1A1A1A", text: "#F5F5F5", muted: "#A0A0A0", primary: "#E50914", accent: "#FFD700", isDark: true },
    fonts: { heading: "'SF Pro Display', system-ui, sans-serif", body: "'Inter', sans-serif" },
    motif: "cinematic",
    radius: 6,
  },
  {
    id: "glass-arctic",
    name: "Glass Arctic",
    palette: { bg: "#E8F4FB", surface: "rgba(255,255,255,0.6)", text: "#0A2540", muted: "#5C7A99", primary: "#1E9DF1", accent: "#7FE7DC", isDark: false },
    fonts: { heading: "'SF Pro Display', system-ui, sans-serif", body: "'Inter', sans-serif" },
    motif: "glass",
    radius: 22,
  },
  {
    id: "sage-calm",
    name: "Sage Calm",
    palette: { bg: "#F4F7F2", surface: "#FFFFFF", text: "#2D3F38", muted: "#7A8F87", primary: "#84B59F", accent: "#50808E", isDark: false },
    fonts: { heading: "'Georgia', serif", body: "'Inter', sans-serif" },
    motif: "minimal",
    radius: 18,
  },
];

export function getThemeById(id: string): DeckTheme {
  return DECK_THEMES.find(t => t.id === id) || DECK_THEMES[0];
}
