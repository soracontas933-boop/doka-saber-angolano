import { LayoutProps, SlideShell, H1, Eyebrow, getMotifStyles } from "./_shared";

export function AgendaLayout({ slide, theme }: LayoutProps) {
  const items = slide.body && slide.body.length > 0 ? slide.body : (slide.blocks?.map(b => b.label || "") ?? []);
  const m = getMotifStyles(theme);
  const variant = slide.layoutVariant;

  if (variant === "agenda-grid") {
    return (
      <SlideShell theme={theme}>
        <div className="h-full flex flex-col gap-8">
          <div className="space-y-3">
            <Eyebrow theme={theme}>Agenda</Eyebrow>
            <H1 theme={theme} className="text-5xl">{slide.title}</H1>
          </div>
          <div className="grid grid-cols-3 gap-5 flex-1">
            {items.map((item, i) => (
              <div key={i} className="flex flex-col justify-between p-6"
                style={{ backgroundColor: m.cardBg, border: m.cardBorder, boxShadow: m.cardShadow, borderRadius: m.radius, backdropFilter: m.backdrop }}>
                <div className="text-4xl font-bold" style={{ color: theme.palette.primary, fontFamily: theme.fonts.heading }}>0{i + 1}</div>
                <p className="text-lg font-semibold mt-4" style={{ color: theme.palette.text }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </SlideShell>
    );
  }

  // agenda-list / agenda-numbered
  return (
    <SlideShell theme={theme}>
      <div className="h-full grid grid-cols-2 gap-12">
        <div className="flex flex-col justify-center gap-4">
          <Eyebrow theme={theme}>Agenda</Eyebrow>
          <H1 theme={theme} className="text-6xl">{slide.title}</H1>
          {slide.subtitle && <p className="text-xl mt-4" style={{ color: theme.palette.muted }}>{slide.subtitle}</p>}
        </div>
        <div className="flex flex-col justify-center gap-4">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-5 py-4 border-b" style={{ borderColor: `${theme.palette.muted}33` }}>
              <span className="text-2xl font-bold w-12" style={{ color: theme.palette.primary, fontFamily: theme.fonts.heading }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-xl font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}
