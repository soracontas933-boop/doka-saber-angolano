import { LayoutProps, SlideShell, H1, Eyebrow, getMotifStyles } from "./_shared";

export function GalleryLayout({ slide, theme }: LayoutProps) {
  const m = getMotifStyles(theme);
  const captions = slide.body || [];
  const slots = Math.max(3, Math.min(captions.length, 4));

  return (
    <SlideShell theme={theme}>
      <div className="h-full flex flex-col gap-6">
        <div className="space-y-2">
          {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
          <H1 theme={theme} className="text-4xl">{slide.title}</H1>
        </div>
        <div className="flex-1 grid gap-3" style={{ gridTemplateColumns: `repeat(${slots}, 1fr)` }}>
          {Array.from({ length: slots }).map((_, i) => (
            <div key={i} className="relative overflow-hidden flex items-end" style={{ borderRadius: m.radius, backgroundColor: `${theme.palette.primary}22` }}>
              {slide.imageUrl && (
                <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: `hue-rotate(${i * 20}deg)` }} />
              )}
              {captions[i] && (
                <div className="relative z-10 p-4 w-full" style={{ background: `linear-gradient(0deg, ${theme.palette.bg}EE, transparent)` }}>
                  <div className="text-xs font-bold" style={{ color: theme.palette.text }}>{captions[i]}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}
