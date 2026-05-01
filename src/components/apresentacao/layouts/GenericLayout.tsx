import { LayoutProps, SlideShell, H1, Eyebrow, RichText, getMotifStyles } from "./_shared";

// Cobre: insight, summary, conclusion, references, cta, case-study, context
export function GenericLayout({ slide, theme }: LayoutProps) {
  const m = getMotifStyles(theme);

  const bodyClean = (slide.body || []).map(b => (b || "").trim()).filter(Boolean);

  if (slide.kind === "references") {
    return (
      <SlideShell theme={theme}>
        <div className="h-full flex flex-col gap-6">
          <div className="space-y-2">
            <Eyebrow theme={theme}>Fontes</Eyebrow>
            <H1 theme={theme} className="text-5xl">{slide.title}</H1>
          </div>
          <div className="flex-1 overflow-hidden columns-2 gap-8">
            {bodyClean.map((ref, i) => (
              <div key={i} className="text-sm py-2 break-inside-avoid border-b" style={{ color: theme.palette.muted, borderColor: `${theme.palette.muted}22` }}>
                <span className="font-bold mr-2" style={{ color: theme.palette.primary }}>[{i + 1}]</span>
                {ref}
              </div>
            ))}
          </div>
        </div>
      </SlideShell>
    );
  }

  if (slide.kind === "summary" || slide.kind === "insight") {
    const items = bodyClean;
    return (
      <SlideShell theme={theme}>
        <div className="h-full flex flex-col gap-8 justify-center">
          <div className="space-y-2 text-center">
            {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
            <H1 theme={theme} className="text-5xl">{slide.title}</H1>
          </div>
          {items.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto w-full">
              {items.slice(0, 6).map((it, i) => (
                <div key={i} className="p-5 flex gap-4 items-start"
                  style={{ backgroundColor: m.cardBg, border: m.cardBorder, boxShadow: m.cardShadow, borderRadius: m.radius, backdropFilter: m.backdrop }}>
                  <div className="h-9 w-9 rounded-full flex items-center justify-center font-bold shrink-0"
                    style={{ backgroundColor: theme.palette.primary, color: theme.palette.bg }}>
                    ✓
                  </div>
                  <div className="text-base">{it}</div>
                </div>
              ))}
            </div>
          ) : slide.richBody ? (
            <div className="max-w-3xl mx-auto text-center text-xl" style={{ color: theme.palette.muted }}>{slide.richBody}</div>
          ) : null}
        </div>
      </SlideShell>
    );
  }

  if (slide.kind === "cta") {
    return (
      <SlideShell theme={theme}>
        <div className="h-full flex flex-col items-center justify-center text-center gap-8">
          <Eyebrow theme={theme}>Próximo Passo</Eyebrow>
          <H1 theme={theme} className="text-7xl max-w-4xl">{slide.title}</H1>
          {slide.subtitle && <p className="text-xl max-w-2xl" style={{ color: theme.palette.muted }}>{slide.subtitle}</p>}
          {slide.body?.[0] && (
            <div className="px-10 py-5 rounded-full text-lg font-bold mt-4"
              style={{ backgroundColor: theme.palette.primary, color: theme.palette.bg }}>
              {slide.body[0]}
            </div>
          )}
        </div>
      </SlideShell>
    );
  }

  // context / case-study / conclusion (split with image)
  return (
    <div className="w-full h-full flex" style={{ backgroundColor: theme.palette.bg, fontFamily: theme.fonts.body }}>
      <div className="w-1/2 flex flex-col justify-center p-14 gap-5">
        {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
        <H1 theme={theme} className="text-5xl">{slide.title}</H1>
        {slide.body && (
          <ul className="space-y-2 mt-3">
            {slide.body.map((b, i) => (
              <li key={i} className="flex gap-3 text-base" style={{ color: theme.palette.muted }}>
                <span style={{ color: theme.palette.accent }}>▸</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="w-1/2 relative overflow-hidden">
        {slide.imageUrl ? (
          <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 animate-pulse" style={{ backgroundColor: `${theme.palette.primary}22` }} />
        )}
      </div>
    </div>
  );
}
