import { LayoutProps, SlideShell, H1 } from "./_shared";

export function QuoteLayout({ slide, theme }: LayoutProps) {
  if (slide.layoutVariant === "quote-overlay" && slide.imageUrl) {
    return (
      <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: theme.palette.bg }}>
        <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(0deg, ${theme.palette.bg}EE, ${theme.palette.bg}66)` }} />
        <div className="relative z-10 h-full flex flex-col justify-center items-center text-center p-20 gap-6">
          <div className="text-9xl font-black leading-none" style={{ color: theme.palette.accent, fontFamily: theme.fonts.heading }}>"</div>
          <H1 theme={theme} className="text-5xl md:text-6xl max-w-4xl italic">{slide.title}</H1>
          {slide.subtitle && <div className="text-lg font-medium" style={{ color: theme.palette.muted }}>— {slide.subtitle}</div>}
        </div>
      </div>
    );
  }

  return (
    <SlideShell theme={theme} padding="p-20">
      <div className="h-full flex flex-col justify-center items-center text-center gap-8">
        <div className="text-[10rem] font-black leading-none" style={{ color: theme.palette.primary, fontFamily: theme.fonts.heading, opacity: 0.6 }}>"</div>
        <H1 theme={theme} className="text-4xl md:text-6xl max-w-5xl italic font-light">{slide.title}</H1>
        {slide.subtitle && (
          <div className="flex items-center gap-3">
            <div className="h-px w-12" style={{ backgroundColor: theme.palette.accent }} />
            <span className="text-base font-bold uppercase tracking-wider" style={{ color: theme.palette.muted }}>{slide.subtitle}</span>
          </div>
        )}
      </div>
    </SlideShell>
  );
}
