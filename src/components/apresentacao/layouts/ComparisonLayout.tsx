import { LayoutProps, SlideShell, H1, Eyebrow, getMotifStyles } from "./_shared";

export function ComparisonLayout({ slide, theme }: LayoutProps) {
  const m = getMotifStyles(theme);
  const items = slide.blocks && slide.blocks.length >= 2
    ? slide.blocks.slice(0, 2)
    : [
        { label: "Opção A", description: slide.body?.[0] || "" },
        { label: "Opção B", description: slide.body?.[1] || "" },
      ];

  return (
    <SlideShell theme={theme}>
      <div className="h-full flex flex-col gap-8">
        <div className="space-y-2 text-center">
          {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
          <H1 theme={theme} className="text-5xl">{slide.title}</H1>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-6 relative">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 h-16 w-16 rounded-full flex items-center justify-center text-xl font-black"
            style={{ backgroundColor: theme.palette.accent, color: theme.palette.bg, fontFamily: theme.fonts.heading }}>
            VS
          </div>
          {items.map((it, i) => (
            <div key={i} className="p-8 flex flex-col gap-4"
              style={{
                backgroundColor: m.cardBg,
                border: m.cardBorder,
                boxShadow: m.cardShadow,
                borderRadius: m.radius,
                backdropFilter: m.backdrop,
                borderLeft: i === 0 ? `4px solid ${theme.palette.primary}` : m.cardBorder,
                borderRight: i === 1 ? `4px solid ${theme.palette.accent}` : m.cardBorder,
              }}>
              <div className="text-2xl font-bold" style={{ color: i === 0 ? theme.palette.primary : theme.palette.accent, fontFamily: theme.fonts.heading }}>
                {it.label}
              </div>
              <div className="text-base flex-1" style={{ color: theme.palette.muted }}>{it.description}</div>
              {it.value && <div className="text-3xl font-black" style={{ color: theme.palette.text, fontFamily: theme.fonts.heading }}>{it.value}</div>}
            </div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}
