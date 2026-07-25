import { LayoutProps, SlideShell, H1, Eyebrow, RichText, getMotifStyles } from "./_shared";

// Layout dedicado para "context" — problema/contexto/pesquisa
export function ContextLayout({ slide, theme }: LayoutProps) {
  const m = getMotifStyles(theme);
  const variant = slide.layoutVariant;

  // Variant: split-50 (texto esquerda, imagem direita)
  if (variant === "split-50") {
    return (
      <SlideShell theme={theme} padding="p-0">
        <div className="h-full flex">
          <div className="w-1/2 flex flex-col justify-center p-14 gap-5">
            {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
            <H1 theme={theme} className="text-5xl">{slide.title}</H1>
            {slide.richBody && <RichText text={slide.richBody} theme={theme} className="text-lg" />}
            {(slide.body || []).filter(Boolean).map((b, i) => (
              <div key={i} className="flex gap-3 text-base" style={{ color: theme.palette.muted }}>
                <span className="mt-1 shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${theme.palette.primary}1A`, color: theme.palette.primary }}>
                  {i + 1}
                </span>
                <span>{b}</span>
              </div>
            ))}
            {slide.footnote && (
              <p className="text-xs italic mt-2" style={{ color: theme.palette.muted }}>{slide.footnote}</p>
            )}
          </div>
          <div className="w-1/2 relative overflow-hidden">
            {slide.imageUrl ? (
              <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.palette.primary}15, ${theme.palette.accent}15)` }} />
            )}
          </div>
        </div>
      </SlideShell>
    );
  }

  // Variant: split-60-40 (texto 60%, imagem 40%)
  if (variant === "split-60-40") {
    return (
      <SlideShell theme={theme} padding="p-0">
        <div className="h-full flex">
          <div className="w-3/5 flex flex-col justify-center p-16 gap-5">
            {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
            <H1 theme={theme} className="text-6xl">{slide.title}</H1>
            {slide.richBody && <RichText text={slide.richBody} theme={theme} className="text-xl leading-[1.7]" />}
            {slide.footnote && (
              <p className="text-sm italic mt-3 pt-3 border-t" style={{ color: theme.palette.muted, borderColor: `${theme.palette.muted}22` }}>{slide.footnote}</p>
            )}
          </div>
          <div className="w-2/5 relative overflow-hidden">
            {slide.imageUrl ? (
              <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${theme.palette.primary}22, ${theme.palette.accent}22)` }} />
            )}
          </div>
        </div>
      </SlideShell>
    );
  }

  // Variant: split-image-right (imagem esquerda, texto direita)
  if (variant === "split-image-right") {
    return (
      <SlideShell theme={theme} padding="p-0">
        <div className="h-full flex">
          <div className="w-2/5 relative overflow-hidden">
            {slide.imageUrl ? (
              <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.palette.primary}22, ${theme.palette.accent}15)` }} />
            )}
          </div>
          <div className="w-3/5 flex flex-col justify-center p-16 gap-5">
            {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
            <H1 theme={theme} className="text-6xl">{slide.title}</H1>
            {slide.richBody && <RichText text={slide.richBody} theme={theme} className="text-xl leading-[1.7]" />}
            {(slide.body || []).filter(Boolean).length > 0 && (
              <ul className="space-y-2 mt-3">
                {(slide.body || []).filter(Boolean).map((b, i) => (
                  <li key={i} className="flex gap-3 text-base" style={{ color: theme.palette.muted }}>
                    <span style={{ color: theme.palette.accent }}>▸</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {slide.footnote && (
              <p className="text-xs italic mt-4" style={{ color: theme.palette.muted }}>{slide.footnote}</p>
            )}
          </div>
        </div>
      </SlideShell>
    );
  }

  // Default: quote-style context (texto central com destaque)
  return (
    <SlideShell theme={theme}>
      <div className="h-full flex flex-col justify-center items-center text-center gap-8 max-w-4xl mx-auto">
        {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
        <H1 theme={theme} className="text-6xl max-w-3xl">{slide.title}</H1>
        {slide.richBody && <RichText text={slide.richBody} theme={theme} className="text-xl max-w-3xl leading-[1.7]" />}
        {(slide.body || []).filter(Boolean).length > 0 && (
          <div className="grid grid-cols-2 gap-4 max-w-3xl w-full mt-2">
            {(slide.body || []).filter(Boolean).slice(0, 4).map((b, i) => (
              <div key={i} className="p-4 rounded-xl text-left" style={{ backgroundColor: m.cardBg, border: m.cardBorder, borderRadius: m.radius }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: theme.palette.primary }}>Ponto {i + 1}</div>
                <div className="text-sm" style={{ color: theme.palette.muted }}>{b}</div>
              </div>
            ))}
          </div>
        )}
        {slide.footnote && (
          <p className="text-xs italic mt-4" style={{ color: theme.palette.muted }}>{slide.footnote}</p>
        )}
      </div>
    </SlideShell>
  );
}
