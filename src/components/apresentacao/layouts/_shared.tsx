import type { DeckTheme, Slide } from "@/types/presentation";

export interface LayoutProps {
  slide: Slide;
  theme: DeckTheme;
}

export function getMotifStyles(theme: DeckTheme) {
  const { motif, palette, radius } = theme;
  switch (motif) {
    case "glass":
      return { cardBg: "rgba(255,255,255,0.5)", cardBorder: "1px solid rgba(255,255,255,0.6)", cardShadow: "0 8px 32px rgba(0,0,0,0.08)", backdrop: "blur(12px)", radius };
    case "brutalist":
      return { cardBg: palette.surface, cardBorder: `3px solid ${palette.text}`, cardShadow: `6px 6px 0 ${palette.text}`, backdrop: "none", radius };
    case "luxury":
      return { cardBg: palette.surface, cardBorder: `1px solid ${palette.accent}33`, cardShadow: "0 24px 60px rgba(0,0,0,0.25)", backdrop: "none", radius };
    case "cinematic":
      return { cardBg: palette.surface, cardBorder: "none", cardShadow: "0 30px 80px rgba(0,0,0,0.45)", backdrop: "none", radius };
    case "minimal":
      return { cardBg: palette.surface, cardBorder: `1px solid ${palette.muted}22`, cardShadow: "0 1px 2px rgba(0,0,0,0.04)", backdrop: "none", radius };
    case "editorial":
      return { cardBg: palette.surface, cardBorder: `1px solid ${palette.muted}33`, cardShadow: "0 12px 30px rgba(0,0,0,0.08)", backdrop: "none", radius };
    case "iridescent":
      return { cardBg: `${palette.primary}0D`, cardBorder: `1px solid ${palette.primary}22`, cardShadow: "0 10px 40px rgba(79,111,255,0.10)", backdrop: "none", radius };
    default: // bento
      return { cardBg: palette.surface, cardBorder: `1px solid ${palette.muted}22`, cardShadow: "0 14px 40px rgba(0,0,0,0.10)", backdrop: "none", radius };
  }
}

/** Shell base do slide — aplica fundo, fonte, cor e renderiza o badge "Made with Delle" */
export function SlideShell({ children, theme, padding = "p-16", noBadge = false }: { children: React.ReactNode; theme: DeckTheme; padding?: string; noBadge?: boolean }) {
  return (
    <div
      className={`relative w-full h-full overflow-hidden ${padding}`}
      style={{ backgroundColor: theme.palette.bg, color: theme.palette.text, fontFamily: theme.fonts.body }}
    >
      {children}
      {!noBadge && <MadeWithBadge theme={theme} />}
    </div>
  );
}

/** Título de slide — tamanho responsivo via prop className */
export function H1({ children, theme, className = "", colorPrimary = false }: { children: React.ReactNode; theme: DeckTheme; className?: string; colorPrimary?: boolean }) {
  return (
    <h1
      className={`font-bold leading-[1.05] tracking-tight ${className}`}
      style={{ fontFamily: theme.fonts.heading, color: colorPrimary ? theme.palette.primary : theme.palette.text }}
    >
      {children}
    </h1>
  );
}

/** Pill/eyebrow padrão (lavanda Gamma) */
export function Eyebrow({ children, theme }: { children: React.ReactNode; theme: DeckTheme }) {
  return (
    <span
      className="inline-block text-[12px] font-semibold uppercase tracking-[0.18em] px-4 py-1.5 rounded-full"
      style={{ backgroundColor: `${theme.palette.primary}1A`, color: theme.palette.primary, border: `1px solid ${theme.palette.primary}33` }}
    >
      {children}
    </span>
  );
}

/** Renderiza texto rico com **bold** inline (estilo Gamma) */
export function RichText({ text, theme, className = "" }: { text: string; theme: DeckTheme; className?: string }) {
  // Simples parser de **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className={`leading-[1.65] ${className}`} style={{ color: theme.palette.muted }}>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={i} style={{ color: theme.palette.text, fontWeight: 700 }}>
              {p.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </p>
  );
}

/** Badge "Made with Delle" no canto inferior direito (estilo Gamma) */
export function MadeWithBadge({ theme }: { theme: DeckTheme }) {
  return (
    <div
      className="absolute bottom-5 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium z-50 pointer-events-none"
      style={{
        backgroundColor: theme.palette.isDark ? "#FFFFFF15" : "#0F1729",
        color: "#FFFFFF",
        backdropFilter: "blur(8px)",
      }}
    >
      <span className="opacity-70">Made with</span>
      <span className="font-bold tracking-wide">Delle</span>
    </div>
  );
}

/** Pill genérica para qualquer texto (usado em hero) */
export function Pill({ children, theme }: { children: React.ReactNode; theme: DeckTheme }) {
  return (
    <span
      className="inline-block text-[13px] font-semibold tracking-wider px-5 py-2 rounded-full"
      style={{ backgroundColor: `${theme.palette.primary}1F`, color: theme.palette.primary }}
    >
      {children}
    </span>
  );
}
