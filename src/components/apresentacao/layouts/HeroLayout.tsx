import { LayoutProps, SlideShell, H1, Eyebrow } from "./_shared";

export function HeroLayout({ slide, theme }: LayoutProps) {
  const variant = slide.layoutVariant;

  if (variant === "hero-overlay" && slide.imageUrl) {
    return (
      <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: theme.palette.bg, fontFamily: theme.fonts.body }}>
        <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.palette.bg}EE 0%, ${theme.palette.bg}88 60%, transparent 100%)` }} />
        <div className="relative z-10 h-full flex flex-col justify-end p-16">
          {slide.subtitle && <div className="mb-4"><Eyebrow theme={theme}>{slide.subtitle}</Eyebrow></div>}
          <H1 theme={theme} className="text-7xl md:text-8xl max-w-4xl">{slide.title}</H1>
        </div>
      </div>
    );
  }

  if (variant === "hero-center") {
    return (
      <SlideShell theme={theme} padding="p-16">
        <div className="h-full flex flex-col items-center justify-center text-center gap-8">
          {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
          <H1 theme={theme} className="text-7xl md:text-8xl max-w-5xl">{slide.title}</H1>
          <div className="h-1 w-24 rounded-full" style={{ backgroundColor: theme.palette.accent }} />
        </div>
      </SlideShell>
    );
  }

  if (variant === "hero-magazine") {
    return (
      <SlideShell theme={theme} padding="p-16">
        <div className="h-full flex flex-col justify-between">
          <div className="flex justify-between items-start">
            {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
            <span className="text-xs font-mono opacity-50">001</span>
          </div>
          <div className="space-y-6">
            <H1 theme={theme} className="text-8xl md:text-9xl">{slide.title}</H1>
            <div className="h-px w-full" style={{ backgroundColor: theme.palette.text, opacity: 0.2 }} />
          </div>
        </div>
      </SlideShell>
    );
  }

  // hero-split (default)
  return (
    <div className="w-full h-full flex" style={{ backgroundColor: theme.palette.bg, fontFamily: theme.fonts.body }}>
      <div className="w-1/2 flex flex-col justify-center p-16 gap-6">
        {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
        <H1 theme={theme} className="text-6xl md:text-7xl">{slide.title}</H1>
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
