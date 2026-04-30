import { LayoutProps, SlideShell, H1, Eyebrow, getMotifStyles } from "./_shared";

export function ProcessLayout({ slide, theme }: LayoutProps) {
  const m = getMotifStyles(theme);
  const steps = slide.blocks && slide.blocks.length > 0
    ? slide.blocks
    : (slide.body || []).map((b, i) => ({ label: `Passo ${i + 1}`, description: b }));

  return (
    <SlideShell theme={theme}>
      <div className="h-full flex flex-col gap-8">
        <div className="space-y-2">
          {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
          <H1 theme={theme} className="text-5xl">{slide.title}</H1>
        </div>
        <div className="flex-1 grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(steps.length, 4)}, 1fr)` }}>
          {steps.slice(0, 4).map((s, i) => (
            <div key={i} className="relative p-6 flex flex-col gap-3"
              style={{ backgroundColor: m.cardBg, border: m.cardBorder, boxShadow: m.cardShadow, borderRadius: m.radius, backdropFilter: m.backdrop }}>
              <div className="h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold"
                style={{ backgroundColor: theme.palette.primary, color: theme.palette.bg, fontFamily: theme.fonts.heading }}>
                {i + 1}
              </div>
              <div className="text-lg font-bold">{s.label}</div>
              <div className="text-sm" style={{ color: theme.palette.muted }}>{s.description}</div>
              {i < Math.min(steps.length, 4) - 1 && (
                <div className="absolute top-1/2 -right-2 text-2xl" style={{ color: theme.palette.primary }}>→</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}
