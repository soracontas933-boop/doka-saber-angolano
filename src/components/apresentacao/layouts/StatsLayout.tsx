import { LayoutProps, SlideShell, H1, Eyebrow, getMotifStyles } from "./_shared";

export function StatsLayout({ slide, theme }: LayoutProps) {
  const m = getMotifStyles(theme);
  const stats = slide.blocks && slide.blocks.length > 0
    ? slide.blocks
    : (slide.body || []).slice(0, 4).map((b, i) => ({ type: "stat" as const, value: `0${i + 1}`, label: b }));

  if (slide.layoutVariant === "stats-hero" && stats[0]) {
    return (
      <SlideShell theme={theme}>
        <div className="h-full flex flex-col justify-center items-center text-center gap-6">
          {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
          <div className="text-[12rem] font-black leading-none" style={{ color: theme.palette.primary, fontFamily: theme.fonts.heading }}>
            {stats[0].value}
          </div>
          <H1 theme={theme} className="text-3xl md:text-4xl max-w-3xl">{stats[0].label || slide.title}</H1>
          {stats[0].description && <p className="text-lg max-w-2xl" style={{ color: theme.palette.muted }}>{stats[0].description}</p>}
        </div>
      </SlideShell>
    );
  }

  const cols = slide.layoutVariant === "stats-grid-4" ? 4 : 3;

  return (
    <SlideShell theme={theme}>
      <div className="h-full flex flex-col justify-center gap-10">
        <div className="space-y-2 text-center">
          {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
          <H1 theme={theme} className="text-5xl">{slide.title}</H1>
        </div>
        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {stats.slice(0, cols).map((s, i) => (
            <div key={i} className="p-8 text-center"
              style={{ backgroundColor: m.cardBg, border: m.cardBorder, boxShadow: m.cardShadow, borderRadius: m.radius, backdropFilter: m.backdrop }}>
              <div className="text-6xl font-black" style={{ color: theme.palette.primary, fontFamily: theme.fonts.heading }}>{s.value}</div>
              <div className="text-base font-bold mt-3">{s.label}</div>
              {s.description && <div className="text-sm mt-2" style={{ color: theme.palette.muted }}>{s.description}</div>}
            </div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}
