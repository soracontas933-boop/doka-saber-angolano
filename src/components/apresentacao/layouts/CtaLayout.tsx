import { LayoutProps, SlideShell, H1, Eyebrow, getMotifStyles } from "./_shared";

// Layout dedicado para "cta" — chamada para ação
export function CtaLayout({ slide, theme }: LayoutProps) {
  const variant = slide.layoutVariant;
  const bodyItems = (slide.body || []).filter(Boolean);

  // Variant: cta-center (centralizado com botão grande)
  if (variant === "cta-center") {
    return (
      <SlideShell theme={theme}>
        <div className="h-full flex flex-col items-center justify-center text-center gap-8">
          {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
          <H1 theme={theme} className="text-6xl md:text-7xl max-w-4xl" colorPrimary>{slide.title}</H1>
          {slide.richBody && (
            <p className="text-xl max-w-2xl leading-relaxed" style={{ color: theme.palette.muted }}>{slide.richBody}</p>
          )}
          {bodyItems[0] && (
            <div className="px-12 py-5 rounded-2xl text-lg font-bold mt-4 shadow-lg"
              style={{ backgroundColor: theme.palette.primary, color: theme.palette.bg }}>
              {bodyItems[0]}
            </div>
          )}
          {bodyItems.slice(1, 4).length > 0 && (
            <div className="flex gap-3 mt-4">
              {bodyItems.slice(1, 4).map((b, i) => (
                <span key={i} className="px-4 py-2 rounded-full text-sm" style={{ backgroundColor: `${theme.palette.primary}10`, color: theme.palette.muted }}>
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>
      </SlideShell>
    );
  }

  // Variant: cta-banner (banner com gradiente)
  if (variant === "cta-banner") {
    return (
      <div className="w-full h-full flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: theme.palette.bg, fontFamily: theme.fonts.body }}>
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.palette.primary}DD, ${theme.palette.accent}DD)` }} />
        <div className="relative z-10 text-center px-20 max-w-4xl space-y-6">
          {slide.subtitle && (
            <span className="inline-block text-sm font-semibold uppercase tracking-[0.18em] px-5 py-2 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#FFFFFF" }}>
              {slide.subtitle}
            </span>
          )}
          <H1 theme={{ ...theme, palette: { ...theme.palette, text: "#FFFFFF", muted: "#FFFFFFCC", primary: "#FFFFFF" } }} className="text-6xl md:text-7xl">{slide.title}</H1>
          {slide.richBody && (
            <p className="text-xl text-white/80 max-w-2xl leading-relaxed mx-auto">{slide.richBody}</p>
          )}
          {bodyItems[0] && (
            <div className="inline-block px-12 py-5 rounded-2xl text-lg font-bold mt-4" style={{ backgroundColor: theme.palette.bg, color: theme.palette.primary }}>
              {bodyItems[0]}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default: cta-split (texto + imagem)
  return (
    <div className="w-full h-full flex" style={{ backgroundColor: theme.palette.bg, fontFamily: theme.fonts.body }}>
      <div className="w-1/2 flex flex-col justify-center p-16 gap-6">
        {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
        <H1 theme={theme} className="text-6xl" colorPrimary>{slide.title}</H1>
        {slide.richBody && (
          <p className="text-lg leading-relaxed" style={{ color: theme.palette.muted }}>{slide.richBody}</p>
        )}
        {bodyItems[0] && (
          <div className="inline-block px-10 py-4 rounded-2xl text-lg font-bold mt-4" style={{ backgroundColor: theme.palette.primary, color: theme.palette.bg }}>
            {bodyItems[0]}
          </div>
        )}
      </div>
      <div className="w-1/2 relative overflow-hidden">
        {slide.imageUrl ? (
          <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.palette.primary}22, ${theme.palette.accent}22)` }} />
        )}
      </div>
    </div>
  );
}
