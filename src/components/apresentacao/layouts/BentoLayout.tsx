import { LayoutProps, SlideShell, H1, RichText, Eyebrow, getMotifStyles } from "./_shared";

export function BentoLayout({ slide, theme }: LayoutProps) {
  const m = getMotifStyles(theme);
  const rawBlocks = slide.blocks && slide.blocks.length > 0
    ? slide.blocks
    : (slide.body || []).filter(Boolean).map((b, i) => ({ type: "card" as const, label: `Ponto ${i + 1}`, description: b }));
  // Filtra blocks completamente vazios para não renderizar cards fantasma
  const blocks = rawBlocks.filter(b => (b.label?.trim() || b.value?.trim() || b.description?.trim()));

  const variant = slide.layoutVariant;

  // Variant: bento-numbered (estilo "3 Razões para apostar..." do Gamma)
  if (variant === "bento-numbered" || (!slide.imageUrl && blocks.length <= 4)) {
    const count = Math.min(blocks.length, 4);
    return (
      <SlideShell theme={theme} padding="p-16">
        <div className="h-full flex flex-col gap-12">
          <div className="space-y-3">
            {slide.pill && <Eyebrow theme={theme}>{slide.pill}</Eyebrow>}
            <H1 theme={theme} className="text-5xl md:text-6xl" colorPrimary>{slide.title}</H1>
            {slide.subtitle && <RichText text={slide.subtitle} theme={theme} className="text-lg max-w-3xl" />}
          </div>
          <div className="flex-1 grid gap-6 items-start" style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}>
            {blocks.slice(0, count).map((b, i) => (
              <div key={i} className="relative pt-10">
                {/* Círculo numerado sobreposto à borda superior */}
                <div
                  className="absolute -top-0 left-1/2 -translate-x-1/2 h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold z-10"
                  style={{
                    backgroundColor: `${theme.palette.primary}22`,
                    color: theme.palette.primary,
                    border: `2px solid ${theme.palette.bg}`,
                    fontFamily: theme.fonts.heading,
                  }}
                >
                  {i + 1}
                </div>
                <div
                  className="p-7 pt-12 h-full flex flex-col gap-3"
                  style={{
                    backgroundColor: m.cardBg,
                    border: `1px solid ${theme.palette.primary}33`,
                    boxShadow: m.cardShadow,
                    borderRadius: m.radius,
                  }}
                >
                  {b.label && <div className="text-xl font-bold" style={{ color: theme.palette.text }}>{b.label}</div>}
                  {b.description && <RichText text={b.description} theme={theme} className="text-base" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SlideShell>
    );
  }

  // Variant: bento-icon-grid (estilo "O que é a Delle" — 2x2 com ícones)
  if (variant === "bento-icon-grid" || (!slide.imageUrl && blocks.length === 4)) {
    return (
      <SlideShell theme={theme} padding="p-16">
        <div className="h-full flex flex-col gap-10">
          <div className="space-y-3">
            {slide.pill && <Eyebrow theme={theme}>{slide.pill}</Eyebrow>}
            <H1 theme={theme} className="text-5xl md:text-6xl" colorPrimary>{slide.title}</H1>
            {slide.subtitle && <RichText text={slide.subtitle} theme={theme} className="text-lg max-w-4xl" />}
          </div>
          <div className="flex-1 grid grid-cols-2 gap-x-16 gap-y-10">
            {blocks.slice(0, 4).map((b, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${theme.palette.primary}1A`, color: theme.palette.primary }}>
                  {b.icon || "◆"}
                </div>
                {b.label && <div className="text-2xl font-bold" style={{ color: theme.palette.text }}>{b.label}</div>}
                {b.description && <RichText text={b.description} theme={theme} className="text-base max-w-md" />}
              </div>
            ))}
          </div>
        </div>
      </SlideShell>
    );
  }

  // Default: bento com imagem
  return (
    <SlideShell theme={theme} padding="p-12">
      <div className="h-full flex flex-col gap-6">
        <div className="space-y-2">
          {slide.pill && <Eyebrow theme={theme}>{slide.pill}</Eyebrow>}
          <H1 theme={theme} className="text-4xl md:text-5xl" colorPrimary>{slide.title}</H1>
        </div>
        <div className="flex-1 grid gap-4" style={{
          gridTemplateColumns: variant === "bento-2x3" ? "repeat(2,1fr)" : "repeat(3,1fr)",
          gridAutoRows: "minmax(0,1fr)",
        }}>
          {slide.imageUrl && (
            <div className="row-span-2 overflow-hidden" style={{ borderRadius: m.radius }}>
              <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          {blocks.slice(0, 6).map((b, i) => (
            <div key={i} className="p-5 flex flex-col justify-between"
              style={{ backgroundColor: m.cardBg, border: m.cardBorder, boxShadow: m.cardShadow, borderRadius: m.radius, backdropFilter: m.backdrop }}>
              {b.value && <div className="text-4xl font-bold" style={{ color: theme.palette.primary, fontFamily: theme.fonts.heading }}>{b.value}</div>}
              {b.label && <div className="text-base font-bold mt-2">{b.label}</div>}
              {b.description && <div className="text-sm mt-1" style={{ color: theme.palette.muted }}>{b.description}</div>}
            </div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}
