import { LayoutProps, SlideShell, H1, Pill, RichText, MadeWithBadge } from "./_shared";

export function HeroLayout({ slide, theme }: LayoutProps) {
  const variant = slide.layoutVariant;

  // Variant 1: Hero overlay (imagem de fundo full-bleed)
  if (variant === "hero-overlay" && slide.imageUrl) {
    return (
      <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: theme.palette.bg, fontFamily: theme.fonts.body }}>
        <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.palette.bg}EE 0%, ${theme.palette.bg}88 60%, transparent 100%)` }} />
        <div className="relative z-10 h-full flex flex-col justify-end p-20 gap-6 max-w-5xl">
          {slide.pill && <Pill theme={theme}>{slide.pill}</Pill>}
          <H1 theme={theme} className="text-7xl md:text-8xl" colorPrimary>{slide.title}</H1>
          {slide.subtitle && <RichText text={slide.subtitle} theme={theme} className="text-2xl max-w-3xl" />}
        </div>
        <MadeWithBadge theme={theme} />
      </div>
    );
  }

  // Variant 2: Hero center (cover puro centralizado)
  if (variant === "hero-center") {
    return (
      <SlideShell theme={theme} padding="p-20">
        <div className="h-full flex flex-col items-center justify-center text-center gap-8 max-w-5xl mx-auto">
          {slide.pill && <Pill theme={theme}>{slide.pill}</Pill>}
          <H1 theme={theme} className="text-7xl md:text-9xl" colorPrimary>{slide.title}</H1>
          {slide.subtitle && <RichText text={slide.subtitle} theme={theme} className="text-2xl max-w-3xl" />}
        </div>
      </SlideShell>
    );
  }

  // hero-split (DEFAULT, estilo Gamma): imagem sangra a esquerda, texto à direita
  return (
    <div className="relative w-full h-full flex" style={{ backgroundColor: theme.palette.bg, fontFamily: theme.fonts.body }}>
      <div className="w-1/2 relative overflow-hidden">
        {slide.imageUrl ? (
          <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.palette.primary}33, ${theme.palette.accent}33)` }} />
        )}
      </div>
      <div className="w-1/2 flex flex-col justify-center p-20 gap-7">
        <H1 theme={theme} className="text-7xl md:text-8xl" colorPrimary>{slide.title}</H1>
        {slide.subtitle && <RichText text={slide.subtitle} theme={theme} className="text-xl md:text-2xl max-w-xl" />}
        {slide.pill && <div className="mt-2"><Pill theme={theme}>{slide.pill}</Pill></div>}
      </div>
      <MadeWithBadge theme={theme} />
    </div>
  );
}
