import { LayoutProps, SlideShell, H1 } from "./_shared";

export function ClosingLayout({ slide, theme }: LayoutProps) {
  if (slide.layoutVariant === "closing-cinematic") {
    return (
      <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: theme.palette.bg }}>
        {slide.imageUrl && <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, transparent 0%, ${theme.palette.bg} 80%)` }} />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center gap-8 p-20">
          <H1 theme={theme} className="text-[10rem] leading-none">{slide.title}</H1>
          {slide.subtitle && <p className="text-xl uppercase tracking-[0.4em]" style={{ color: theme.palette.accent }}>{slide.subtitle}</p>}
        </div>
      </div>
    );
  }

  return (
    <SlideShell theme={theme} padding="p-20">
      <div className="h-full flex flex-col items-center justify-center text-center gap-8">
        <div className="h-1 w-16 rounded-full" style={{ backgroundColor: theme.palette.accent }} />
        <H1 theme={theme} className="text-8xl md:text-9xl">{slide.title}</H1>
        {slide.subtitle && <p className="text-2xl mt-2" style={{ color: theme.palette.muted }}>{slide.subtitle}</p>}
        {slide.body && slide.body.length > 0 && (
          <div className="flex gap-6 mt-8 text-sm font-medium" style={{ color: theme.palette.muted }}>
            {slide.body.slice(0, 3).map((b, i) => <span key={i}>{b}</span>)}
          </div>
        )}
      </div>
    </SlideShell>
  );
}
