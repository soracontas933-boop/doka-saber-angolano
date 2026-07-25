import { LayoutProps, SlideShell, H1, Eyebrow, getMotifStyles } from "./_shared";

// Layout dedicado para "summary" — síntese, pontos-chave, takeaways
export function SummaryLayout({ slide, theme }: LayoutProps) {
  const m = getMotifStyles(theme);
  const variant = slide.layoutVariant;
  const bodyItems = (slide.body || []).filter(Boolean);

  // Variant: summary-cards (cards com checkmarks)
  if (variant === "summary-cards") {
    return (
      <SlideShell theme={theme}>
        <div className="h-full flex flex-col gap-6 justify-center">
          <div className="space-y-2 text-center">
            {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
            <H1 theme={theme} className="text-5xl">{slide.title}</H1>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto w-full">
            {bodyItems.slice(0, 6).map((it, i) => (
              <div key={i} className="p-5 flex gap-4 items-start" style={{ backgroundColor: m.cardBg, border: m.cardBorder, boxShadow: m.cardShadow, borderRadius: m.radius }}>
                <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: theme.palette.primary, color: theme.palette.bg }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="text-base font-medium" style={{ color: theme.palette.text }}>{it}</div>
              </div>
            ))}
          </div>
        </div>
      </SlideShell>
    );
  }

  // Variant: summary-checklist (lista com ícones grandes)
  if (variant === "summary-checklist") {
    return (
      <SlideShell theme={theme}>
        <div className="h-full flex flex-col gap-6 justify-center">
          <div className="space-y-2">
            {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
            <H1 theme={theme} className="text-5xl">{slide.title}</H1>
          </div>
          <div className="space-y-3 max-w-4xl mx-auto w-full">
            {bodyItems.slice(0, 5).map((it, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl" style={{ backgroundColor: m.cardBg, border: m.cardBorder }}>
                <span className="text-2xl font-black shrink-0" style={{ color: theme.palette.primary }}>{String(i + 1).padStart(2, '0')}</span>
                <div className="text-lg font-medium" style={{ color: theme.palette.text }}>{it}</div>
              </div>
            ))}
          </div>
        </div>
      </SlideShell>
    );
  }

  // Default: summary-grid
  return (
    <SlideShell theme={theme}>
      <div className="h-full flex flex-col gap-6 justify-center">
        <div className="space-y-2 text-center">
          {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
          <H1 theme={theme} className="text-5xl">{slide.title}</H1>
        </div>
        {bodyItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto w-full">
            {bodyItems.slice(0, 6).map((it, i) => (
              <div key={i} className="p-5 flex gap-4 items-start" style={{ backgroundColor: m.cardBg, border: m.cardBorder, boxShadow: m.cardShadow, borderRadius: m.radius }}>
                <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: theme.palette.primary, color: theme.palette.bg }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div className="text-base font-medium" style={{ color: theme.palette.text }}>{it}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </SlideShell>
  );
}
