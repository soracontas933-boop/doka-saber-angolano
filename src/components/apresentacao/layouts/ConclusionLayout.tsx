import { LayoutProps, SlideShell, H1, Eyebrow, RichText, getMotifStyles } from "./_shared";

// Layout dedicado para "conclusion" — conclusão, mensagem final
export function ConclusionLayout({ slide, theme }: LayoutProps) {
  const m = getMotifStyles(theme);
  const variant = slide.layoutVariant;
  const bodyItems = (slide.body || []).filter(Boolean);

  // Variant: conclusion-center (texto centralizado com destaque)
  if (variant === "conclusion-center") {
    return (
      <SlideShell theme={theme}>
        <div className="h-full flex flex-col items-center justify-center text-center gap-8 max-w-4xl mx-auto">
          {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
          <H1 theme={theme} className="text-6xl" colorPrimary>{slide.title}</H1>
          {slide.richBody && <RichText text={slide.richBody} theme={theme} className="text-xl max-w-3xl leading-[1.7]" />}
          {bodyItems.length > 0 && (
            <div className="flex gap-4 mt-4 flex-wrap justify-center">
              {bodyItems.slice(0, 4).map((b, i) => (
                <div key={i} className="px-6 py-3 rounded-full text-sm font-medium" style={{ backgroundColor: `${theme.palette.primary}10`, color: theme.palette.primary, border: `1px solid ${theme.palette.primary}22` }}>
                  {b}
                </div>
              ))}
            </div>
          )}
          {slide.footnote && (
            <p className="text-lg font-bold italic mt-6" style={{ color: theme.palette.accent }}>— {slide.footnote}</p>
          )}
        </div>
      </SlideShell>
    );
  }

  // Variant: conclusion-split (imagem + conclusão)
  if (variant === "conclusion-split") {
    return (
      <SlideShell theme={theme} padding="p-0">
        <div className="h-full flex">
          <div className="w-3/5 flex flex-col justify-center p-16 gap-6">
            {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
            <H1 theme={theme} className="text-6xl" colorPrimary>{slide.title}</H1>
            {slide.richBody && <RichText text={slide.richBody} theme={theme} className="text-xl leading-[1.7]" />}
            {bodyItems.length > 0 && (
              <div className="space-y-3 mt-4">
                {bodyItems.slice(0, 3).map((b, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: theme.palette.primary }}>
                      <span className="text-[10px] font-bold" style={{ color: theme.palette.bg }}>{i + 1}</span>
                    </div>
                    <span className="text-base font-medium" style={{ color: theme.palette.text }}>{b}</span>
                  </div>
                ))}
              </div>
            )}
            {slide.footnote && (
              <p className="text-sm italic mt-4 pt-4 border-t" style={{ color: theme.palette.muted, borderColor: `${theme.palette.muted}22` }}>{slide.footnote}</p>
            )}
          </div>
          <div className="w-2/5 relative overflow-hidden">
            {slide.imageUrl ? (
              <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.accent})`, opacity: 0.15 }} />
            )}
          </div>
        </div>
      </SlideShell>
    );
  }

  // Default: conclusion with quote style
  return (
    <SlideShell theme={theme}>
      <div className="h-full flex flex-col items-center justify-center text-center gap-8 max-w-4xl mx-auto">
        <div className="text-7xl" style={{ color: `${theme.palette.primary}30`, fontFamily: "Georgia, serif" }}>"</div>
        <H1 theme={theme} className="text-5xl" style={{ fontStyle: "italic" }}>{slide.title}</H1>
        {slide.richBody && <RichText text={slide.richBody} theme={theme} className="text-lg max-w-2xl leading-[1.7]" />}
        {bodyItems.length > 0 && (
          <div className="flex gap-3 mt-4">
            {bodyItems.slice(0, 3).map((b, i) => (
              <div key={i} className="px-5 py-3 rounded-xl" style={{ backgroundColor: m.cardBg, border: m.cardBorder }}>
                <span className="text-sm font-medium" style={{ color: theme.palette.text }}>{b}</span>
              </div>
            ))}
          </div>
        )}
        {slide.footnote && (
          <p className="text-base font-bold mt-6" style={{ color: theme.palette.primary }}>— {slide.footnote}</p>
        )}
      </div>
    </SlideShell>
  );
}
