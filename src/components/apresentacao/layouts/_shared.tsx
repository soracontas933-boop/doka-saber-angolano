import type { DeckTheme, Slide } from "@/types/presentation";

export interface LayoutProps {
  slide: Slide;
  theme: DeckTheme;
}

export function getMotifStyles(theme: DeckTheme) {
  const { motif, palette, radius } = theme;
  switch (motif) {
    case "glass":
      return {
        cardBg: "rgba(255,255,255,0.5)",
        cardBorder: "1px solid rgba(255,255,255,0.6)",
        cardShadow: "0 8px 32px rgba(0,0,0,0.08)",
        backdrop: "blur(12px)",
        radius,
      };
    case "brutalist":
      return {
        cardBg: palette.surface,
        cardBorder: `3px solid ${palette.text}`,
        cardShadow: `6px 6px 0 ${palette.text}`,
        backdrop: "none",
        radius,
      };
    case "luxury":
      return {
        cardBg: palette.surface,
        cardBorder: `1px solid ${palette.accent}33`,
        cardShadow: "0 24px 60px rgba(0,0,0,0.25)",
        backdrop: "none",
        radius,
      };
    case "cinematic":
      return {
        cardBg: palette.surface,
        cardBorder: "none",
        cardShadow: "0 30px 80px rgba(0,0,0,0.45)",
        backdrop: "none",
        radius,
      };
    case "minimal":
      return {
        cardBg: palette.surface,
        cardBorder: `1px solid ${palette.muted}22`,
        cardShadow: "0 1px 2px rgba(0,0,0,0.04)",
        backdrop: "none",
        radius,
      };
    case "editorial":
      return {
        cardBg: palette.surface,
        cardBorder: `1px solid ${palette.muted}33`,
        cardShadow: "0 12px 30px rgba(0,0,0,0.08)",
        backdrop: "none",
        radius,
      };
    default: // bento
      return {
        cardBg: palette.surface,
        cardBorder: `1px solid ${palette.muted}22`,
        cardShadow: "0 14px 40px rgba(0,0,0,0.10)",
        backdrop: "none",
        radius,
      };
  }
}

export function SlideShell({ children, theme, padding = "p-12" }: { children: React.ReactNode; theme: DeckTheme; padding?: string }) {
  return (
    <div
      className={`w-full h-full overflow-hidden ${padding}`}
      style={{
        backgroundColor: theme.palette.bg,
        color: theme.palette.text,
        fontFamily: theme.fonts.body,
      }}
    >
      {children}
    </div>
  );
}

export function H1({ children, theme, className = "" }: { children: React.ReactNode; theme: DeckTheme; className?: string }) {
  return (
    <h1
      className={`font-bold leading-[1.05] tracking-tight ${className}`}
      style={{ fontFamily: theme.fonts.heading, color: theme.palette.text }}
    >
      {children}
    </h1>
  );
}

export function Eyebrow({ children, theme }: { children: React.ReactNode; theme: DeckTheme }) {
  return (
    <span
      className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full"
      style={{ backgroundColor: `${theme.palette.primary}22`, color: theme.palette.primary }}
    >
      {children}
    </span>
  );
}
