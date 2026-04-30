import { LayoutProps, SlideShell, H1, Eyebrow, getMotifStyles } from "./_shared";

export function DashboardLayout({ slide, theme }: LayoutProps) {
  const m = getMotifStyles(theme);
  const stats = slide.blocks?.filter(b => b.type === "stat") || [];
  const otherBlocks = slide.blocks?.filter(b => b.type !== "stat") || [];

  return (
    <SlideShell theme={theme} padding="p-10">
      <div className="h-full flex flex-col gap-5">
        <div className="space-y-2">
          {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
          <H1 theme={theme} className="text-4xl">{slide.title}</H1>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {(stats.length > 0 ? stats : (slide.blocks || []).slice(0, 4)).map((s, i) => (
            <div key={i} className="p-4"
              style={{ backgroundColor: m.cardBg, border: m.cardBorder, boxShadow: m.cardShadow, borderRadius: m.radius, backdropFilter: m.backdrop }}>
              <div className="text-xs uppercase font-bold" style={{ color: theme.palette.muted }}>{s.label}</div>
              <div className="text-3xl font-black mt-2" style={{ color: theme.palette.primary, fontFamily: theme.fonts.heading }}>{s.value || "—"}</div>
            </div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-3 gap-3">
          <div className="col-span-2 p-5 flex flex-col"
            style={{ backgroundColor: m.cardBg, border: m.cardBorder, boxShadow: m.cardShadow, borderRadius: m.radius, backdropFilter: m.backdrop }}>
            <div className="text-sm font-bold mb-2">Visão Geral</div>
            {slide.imageUrl ? (
              <img src={slide.imageUrl} alt="" className="flex-1 w-full object-cover rounded" />
            ) : (
              <div className="flex-1 rounded" style={{ background: `linear-gradient(135deg, ${theme.palette.primary}33, ${theme.palette.accent}33)` }} />
            )}
          </div>
          <div className="p-5 flex flex-col gap-2"
            style={{ backgroundColor: m.cardBg, border: m.cardBorder, boxShadow: m.cardShadow, borderRadius: m.radius, backdropFilter: m.backdrop }}>
            <div className="text-sm font-bold mb-2">Destaques</div>
            {(slide.body || otherBlocks.map(b => b.description || "")).slice(0, 4).map((b, i) => (
              <div key={i} className="text-xs flex gap-2" style={{ color: theme.palette.muted }}>
                <span style={{ color: theme.palette.accent }}>▸</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SlideShell>
  );
}
