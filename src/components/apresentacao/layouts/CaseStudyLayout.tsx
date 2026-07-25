import { LayoutProps, SlideShell, H1, Eyebrow, RichText, getMotifStyles } from "./_shared";

// Layout dedicado para "case-study" — caso real, exemplo prático
export function CaseStudyLayout({ slide, theme }: LayoutProps) {
  const m = getMotifStyles(theme);
  const variant = slide.layoutVariant;

  // Variant: case-split (antes/depois ou problema/solução lado a lado)
  if (variant === "case-split") {
    const blocks = (slide.blocks || []).filter(b => b.label || b.description);
    return (
      <SlideShell theme={theme}>
        <div className="h-full flex flex-col gap-6">
          <div className="space-y-2">
            {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
            <H1 theme={theme} className="text-5xl">{slide.title}</H1>
          </div>
          {slide.richBody && <RichText text={slide.richBody} theme={theme} className="text-lg max-w-3xl" />}
          {blocks.length >= 2 ? (
            <div className="flex-1 grid grid-cols-2 gap-4">
              {blocks.slice(0, 4).map((b, i) => (
                <div key={i} className="p-6 rounded-2xl" style={{ backgroundColor: m.cardBg, border: m.cardBorder, boxShadow: m.cardShadow }}>
                  <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: theme.palette.primary }}>
                    {b.label || `Aspecto ${i + 1}`}
                  </div>
                  <div className="text-2xl font-bold mb-2" style={{ color: theme.palette.text }}>{b.value || ""}</div>
                  {b.description && (
                    <p className="text-sm leading-relaxed" style={{ color: theme.palette.muted }}>{b.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-2 gap-6">
              <div className="p-8 rounded-2xl" style={{ backgroundColor: `${theme.palette.primary}08`, border: `1px solid ${theme.palette.primary}22` }}>
                <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.palette.primary }}>Desafio</div>
                {slide.body?.[0] && <p className="text-base" style={{ color: theme.palette.text }}>{slide.body[0]}</p>}
                {slide.body?.[1] && <p className="text-sm mt-2" style={{ color: theme.palette.muted }}>{slide.body[1]}</p>}
              </div>
              <div className="p-8 rounded-2xl" style={{ backgroundColor: `${theme.palette.accent}08`, border: `1px solid ${theme.palette.accent}22` }}>
                <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.palette.accent }}>Resultado</div>
                {slide.body?.[2] && <p className="text-base" style={{ color: theme.palette.text }}>{slide.body[2]}</p>}
                {slide.body?.[3] && <p className="text-sm mt-2" style={{ color: theme.palette.muted }}>{slide.body[3]}</p>}
              </div>
            </div>
          )}
          {slide.footnote && (
            <p className="text-xs italic" style={{ color: theme.palette.muted }}>{slide.footnote}</p>
          )}
        </div>
      </SlideShell>
    );
  }

  // Variant: case-timeline (caso como timeline)
  if (variant === "case-timeline") {
    const blocks = (slide.blocks || []).filter(b => b.label || b.description);
    return (
      <SlideShell theme={theme}>
        <div className="h-full flex flex-col gap-6">
          <div className="space-y-2">
            {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
            <H1 theme={theme} className="text-5xl">{slide.title}</H1>
          </div>
          {blocks.length > 0 ? (
            <div className="flex-1 flex items-center">
              <div className="w-full relative">
                <div className="absolute top-5 left-0 right-0 h-0.5" style={{ backgroundColor: `${theme.palette.primary}33` }} />
                <div className="flex justify-between relative">
                  {blocks.map((b, i) => (
                    <div key={i} className="flex flex-col items-center text-center max-w-[180px]">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-3 z-10" style={{ backgroundColor: theme.palette.primary, color: theme.palette.bg }}>
                        {i + 1}
                      </div>
                      <div className="text-sm font-bold mb-1" style={{ color: theme.palette.text }}>{b.label}</div>
                      {b.description && (
                        <div className="text-xs" style={{ color: theme.palette.muted }}>{b.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <RichText text={slide.richBody || ""} theme={theme} className="text-xl max-w-3xl text-center" />
            </div>
          )}
          {slide.footnote && (
            <p className="text-xs italic" style={{ color: theme.palette.muted }}>{slide.footnote}</p>
          )}
        </div>
      </SlideShell>
    );
  }

  // Default: image + story
  return (
    <SlideShell theme={theme} padding="p-0">
      <div className="h-full flex">
        <div className="w-2/5 relative overflow-hidden">
          {slide.imageUrl ? (
            <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.palette.primary}22, ${theme.palette.accent}22)` }} />
          )}
        </div>
        <div className="w-3/5 flex flex-col justify-center p-16 gap-5">
          {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
          <H1 theme={theme} className="text-5xl">{slide.title}</H1>
          {slide.richBody && <RichText text={slide.richBody} theme={theme} className="text-lg leading-[1.7]" />}
          {(slide.body || []).filter(Boolean).map((b, i) => (
            <div key={i} className="flex gap-3 text-sm" style={{ color: theme.palette.muted }}>
              <span className="text-primary shrink-0">■</span>
              <span>{b}</span>
            </div>
          ))}
          {slide.footnote && (
            <p className="text-xs italic mt-4 pt-3 border-t" style={{ color: theme.palette.muted, borderColor: `${theme.palette.muted}22` }}>{slide.footnote}</p>
          )}
        </div>
      </div>
    </SlideShell>
  );
}
