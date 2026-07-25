import { LayoutProps, SlideShell, H1, Eyebrow, RichText, getMotifStyles } from "./_shared";

// Layout dedicado para "insight" — descoberta chave, dado de impacto
export function InsightLayout({ slide, theme }: LayoutProps) {
  const m = getMotifStyles(theme);
  const variant = slide.layoutVariant;
  const blocks = (slide.blocks || []).filter(b => b.label || b.description);
  const bodyItems = (slide.body || []).filter(Boolean);

  // Variant: insight-card (card gigante com dado principal)
  if (variant === "insight-card") {
    const mainBlock = blocks[0];
    return (
      <SlideShell theme={theme}>
        <div className="h-full flex flex-col justify-center gap-8">
          <div className="space-y-2">
            {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
            <H1 theme={theme} className="text-5xl">{slide.title}</H1>
          </div>
          <div className="flex gap-8 items-center">
            {slide.imageUrl && (
              <div className="w-1/3 aspect-[4/3] rounded-2xl overflow-hidden shrink-0">
                <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className={slide.imageUrl ? "w-2/3" : "w-full"}>
              {mainBlock ? (
                <div className="p-8 rounded-2xl" style={{ backgroundColor: m.cardBg, border: m.cardBorder, boxShadow: m.cardShadow }}>
                  {mainBlock.value && (
                    <div className="text-7xl font-black tracking-tight mb-3" style={{ color: theme.palette.primary }}>
                      {mainBlock.value}
                    </div>
                  )}
                  <div className="text-2xl font-bold mb-2">{mainBlock.label || ""}</div>
                  {mainBlock.description && (
                    <p className="text-base leading-relaxed" style={{ color: theme.palette.muted }}>{mainBlock.description}</p>
                  )}
                </div>
              ) : slide.richBody ? (
                <RichText text={slide.richBody} theme={theme} className="text-xl leading-[1.7]" />
              ) : null}
            </div>
          </div>
          {bodyItems.length > 0 && (
            <div className="flex gap-3 mt-4">
              {bodyItems.slice(0, 3).map((b, i) => (
                <div key={i} className="flex-1 p-4 rounded-xl text-center" style={{ backgroundColor: `${theme.palette.primary}0A`, border: `1px solid ${theme.palette.primary}1A` }}>
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.palette.primary }}>Destaque {i + 1}</div>
                  <div className="text-sm mt-1" style={{ color: theme.palette.muted }}>{b}</div>
                </div>
              ))}
            </div>
          )}
          {slide.footnote && (
            <p className="text-xs italic" style={{ color: theme.palette.muted }}>{slide.footnote}</p>
          )}
        </div>
      </SlideShell>
    );
  }

  // Variant: insight-bento-3 (3 cards em bento)
  if (variant === "insight-bento-3") {
    return (
      <SlideShell theme={theme}>
        <div className="h-full flex flex-col gap-6">
          <div className="space-y-2">
            {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
            <H1 theme={theme} className="text-5xl">{slide.title}</H1>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-4">
            {blocks.slice(0, 3).map((b, i) => (
              <div key={i} className="p-6 rounded-2xl flex flex-col gap-3" style={{ backgroundColor: m.cardBg, border: m.cardBorder, boxShadow: m.cardShadow }}>
                {b.icon && <span className="text-3xl">{b.icon}</span>}
                {b.value && (
                  <div className="text-4xl font-black" style={{ color: theme.palette.primary }}>{b.value}</div>
                )}
                <div className="text-lg font-bold">{b.label || ""}</div>
                {b.description && (
                  <p className="text-sm leading-relaxed flex-1" style={{ color: theme.palette.muted }}>{b.description}</p>
                )}
              </div>
            ))}
            {blocks.length < 3 && bodyItems.slice(0, 3 - blocks.length).map((b, i) => (
              <div key={`body-${i}`} className="p-6 rounded-2xl flex flex-col gap-3" style={{ backgroundColor: m.cardBg, border: m.cardBorder, boxShadow: m.cardShadow }}>
                <div className="text-lg font-bold">{b}</div>
              </div>
            ))}
          </div>
          {slide.footnote && (
            <p className="text-xs italic" style={{ color: theme.palette.muted }}>{slide.footnote}</p>
          )}
        </div>
      </SlideShell>
    );
  }

  // Default: insight-quote (citação de impacto com contexto)
  return (
    <SlideShell theme={theme}>
      <div className="h-full flex flex-col justify-center items-center text-center gap-6 max-w-4xl mx-auto">
        {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
        <div className="text-8xl mb-4" style={{ color: `${theme.palette.primary}40`, fontFamily: "Georgia, serif" }}>"</div>
        <H1 theme={theme} className="text-5xl max-w-3xl" style={{ fontStyle: "italic" }}>{slide.title}</H1>
        {slide.richBody && <RichText text={slide.richBody} theme={theme} className="text-xl max-w-3xl leading-[1.7]" />}
        {bodyItems.length > 0 && (
          <div className="flex gap-2 mt-4 flex-wrap justify-center">
            {bodyItems.slice(0, 4).map((b, i) => (
              <span key={i} className="px-4 py-2 rounded-full text-sm" style={{ backgroundColor: `${theme.palette.primary}10`, color: theme.palette.muted }}>
                {b}
              </span>
            ))}
          </div>
        )}
        {slide.footnote && (
          <p className="text-sm font-bold mt-6" style={{ color: theme.palette.primary }}>— {slide.footnote}</p>
        )}
      </div>
    </SlideShell>
  );
}
