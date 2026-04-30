import { LayoutProps, SlideShell, H1, RichText, MadeWithBadge } from "./_shared";

export function ClosingLayout({ slide, theme }: LayoutProps) {
  // Variant: closing-cinematic
  if (slide.layoutVariant === "closing-cinematic") {
    return (
      <div className="relative w-full h-full overflow-hidden" style={{ backgroundColor: theme.palette.bg }}>
        {slide.imageUrl && <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, transparent 0%, ${theme.palette.bg} 80%)` }} />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center gap-8 p-20">
          <H1 theme={theme} className="text-[10rem] leading-none" colorPrimary>{slide.title}</H1>
          {slide.subtitle && <p className="text-xl uppercase tracking-[0.4em]" style={{ color: theme.palette.accent }}>{slide.subtitle}</p>}
        </div>
        <MadeWithBadge theme={theme} />
      </div>
    );
  }

  // Default: CTA com numeração 01/02/03 (estilo Gamma "Junte-se à revolução")
  const steps = slide.blocks && slide.blocks.length > 0
    ? slide.blocks
    : (slide.body || []).map((b, i) => ({ label: `Passo ${i + 1}`, description: b }));

  const hasImage = !!slide.imageUrl;

  if (hasImage) {
    return (
      <div className="relative w-full h-full flex" style={{ backgroundColor: theme.palette.bg, fontFamily: theme.fonts.body }}>
        <div className="w-3/5 flex flex-col justify-center p-16 gap-8">
          <H1 theme={theme} className="text-5xl md:text-6xl" colorPrimary>{slide.title}</H1>
          {slide.subtitle && <RichText text={slide.subtitle} theme={theme} className="text-lg max-w-2xl" />}

          {steps.length > 0 && (
            <div className="grid grid-cols-2 gap-x-10 gap-y-6 mt-2">
              {steps.slice(0, 4).map((s, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="text-sm font-bold tracking-widest" style={{ color: theme.palette.muted }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="h-px w-full" style={{ backgroundColor: theme.palette.primary, opacity: 0.5 }} />
                  <div className="text-lg font-bold mt-2" style={{ color: theme.palette.text }}>{s.label}</div>
                  {s.description && <RichText text={s.description} theme={theme} className="text-sm" />}
                </div>
              ))}
            </div>
          )}

          {slide.footnote && (
            <div className="text-lg font-bold mt-6" style={{ color: theme.palette.primary }}>
              {slide.footnote}
            </div>
          )}
        </div>
        <div className="w-2/5 relative overflow-hidden">
          <img src={slide.imageUrl!} alt="" className="absolute inset-0 w-full h-full object-cover" />
        </div>
        <MadeWithBadge theme={theme} />
      </div>
    );
  }

  // Fallback: closing centralizado puro
  return (
    <SlideShell theme={theme} padding="p-20">
      <div className="h-full flex flex-col items-center justify-center text-center gap-8">
        <div className="h-1 w-16 rounded-full" style={{ backgroundColor: theme.palette.accent }} />
        <H1 theme={theme} className="text-8xl md:text-9xl" colorPrimary>{slide.title}</H1>
        {slide.subtitle && <RichText text={slide.subtitle} theme={theme} className="text-2xl max-w-2xl" />}
        {slide.footnote && (
          <div className="text-xl font-bold mt-4" style={{ color: theme.palette.primary }}>{slide.footnote}</div>
        )}
      </div>
    </SlideShell>
  );
}
