// Themes/colors for CV templates — 24 colorways
export interface CVTheme {
  id: string;
  label: string;
  primary: string;   // main color (sidebar, headings)
  secondary: string; // accent
  text: string;      // body text
  muted: string;     // subtle text
  bg: string;        // page background
  sidebarText: string;
}

export const cvThemes: CVTheme[] = [
  { id: "navy",       label: "Marinho",      primary: "#1e3a5f", secondary: "#3b6ea5", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "ocean",      label: "Oceano",       primary: "#0a4d68", secondary: "#088395", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "teal",       label: "Turquesa",     primary: "#0f766e", secondary: "#14b8a6", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "emerald",    label: "Esmeralda",    primary: "#065f46", secondary: "#10b981", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "forest",     label: "Floresta",     primary: "#14532d", secondary: "#22c55e", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "olive",      label: "Oliva",        primary: "#3f6212", secondary: "#84cc16", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "sunset",     label: "Pôr-do-Sol",   primary: "#9a3412", secondary: "#f97316", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "rust",       label: "Ferrugem",     primary: "#7c2d12", secondary: "#ea580c", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "ruby",       label: "Rubi",         primary: "#991b1b", secondary: "#dc2626", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "wine",       label: "Vinho",        primary: "#7f1d1d", secondary: "#b91c1c", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "rose",       label: "Rosa",         primary: "#9f1239", secondary: "#e11d48", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "pink",       label: "Pink",         primary: "#831843", secondary: "#db2777", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "purple",     label: "Púrpura",      primary: "#581c87", secondary: "#9333ea", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "violet",     label: "Violeta",      primary: "#4c1d95", secondary: "#7c3aed", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "indigo",     label: "Índigo",       primary: "#312e81", secondary: "#4f46e5", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "blue",       label: "Azul",         primary: "#1e40af", secondary: "#3b82f6", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "sky",        label: "Céu",          primary: "#075985", secondary: "#0ea5e9", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "slate",      label: "Ardósia",      primary: "#1e293b", secondary: "#475569", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "graphite",   label: "Grafite",      primary: "#262626", secondary: "#525252", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "black",      label: "Preto",        primary: "#000000", secondary: "#404040", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "amber",      label: "Âmbar",        primary: "#78350f", secondary: "#d97706", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "gold",       label: "Ouro",         primary: "#854d0e", secondary: "#ca8a04", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "brown",      label: "Castanho",     primary: "#451a03", secondary: "#92400e", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "chocolate",  label: "Chocolate",    primary: "#3f2417", secondary: "#78502e", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "mint",       label: "Menta",        primary: "#134e4a", secondary: "#5eead4", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
  { id: "coral",      label: "Coral",        primary: "#9d174d", secondary: "#fb7185", text: "#1a1a1a", muted: "#666666", bg: "#ffffff", sidebarText: "#ffffff" },
];

export const defaultTheme = cvThemes[0];

export function getTheme(id: string): CVTheme {
  return cvThemes.find((t) => t.id === id) || defaultTheme;
}
