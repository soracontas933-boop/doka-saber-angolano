import { LayoutProps, SlideShell, H1, RichText, Eyebrow, getMotifStyles, MadeWithBadge } from "./_shared";
import type { Block } from "@/types/presentation";

export function StatsLayout({ slide, theme }: LayoutProps) {
  const m = getMotifStyles(theme);
  const rawStats: Block[] = slide.blocks && slide.blocks.length > 0
    ? slide.blocks
    : (slide.body || []).filter(Boolean).slice(0, 4).map((b, i) => ({ type: "stat" as const, value: `0${i + 1}`, label: b }));
  // Só conta como stat se tiver value (o destaque do layout)
  const stats = rawStats.filter(s => s.value?.trim() || s.label?.trim());

  // Variant 1: stats-hero — 1 número gigante centralizado
  if (slide.layoutVariant === "stats-hero" && stats[0]) {
    return (
      <SlideShell theme={theme}>
        <div className="h-full flex flex-col justify-center items-center text-center gap-6">
          {slide.pill && <Eyebrow theme={theme}>{slide.pill}</Eyebrow>}
          <div className="text-[14rem] font-black leading-none" style={{ color: theme.palette.primary, fontFamily: theme.fonts.heading }}>
            {stats[0].value}
          </div>
          <H1 theme={theme} className="text-3xl md:text-4xl max-w-3xl">{stats[0].label || slide.title}</H1>
          {stats[0].description && <RichText text={stats[0].description} theme={theme} className="text-lg max-w-2xl" />}
        </div>
      </SlideShell>
    );
  }

  // Variant 2 (DEFAULT estilo Gamma): stats-vertical-split — números empilhados à esquerda + imagem half-bleed à direita
  if (slide.layoutVariant === "stats-vertical-split" || slide.imageUrl) {
    return (
      <div className="relative w-full h-full flex" style={{ backgroundColor: theme.palette.bg, fontFamily: theme.fonts.body }}>
        <div className="w-3/5 flex flex-col justify-center p-16 gap-6">
          <H1 theme={theme} className="text-4xl md:text-5xl mb-4" colorPrimary>{slide.title}</H1>
          <div className="space-y-7">
            {stats.slice(0, 4).map((s, i) => (
              <div key={i} className="flex flex-col">
                <div className="text-6xl md:text-7xl font-black leading-none" style={{ color: theme.palette.text, fontFamily: theme.fonts.heading }}>
                  {s.value}
                </div>
                {s.label && <div className="text-lg font-semibold mt-2" style={{ color: theme.palette.text }}>{s.label}</div>}
                {s.description && <div className="text-sm mt-1" style={{ color: theme.palette.muted }}>{s.description}</div>}
              </div>
            ))}
          </div>
          {slide.footnote && (
            <RichText text={slide.footnote} theme={theme} className="text-base mt-4 max-w-md" />
          )}
        </div>
        <div className="w-2/5 relative overflow-hidden">
          {slide.imageUrl ? (
            <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.palette.primary}22, ${theme.palette.accent}33)` }} />
          )}
        </div>
        <MadeWithBadge theme={theme} />
      </div>
    );
  }

  // Variant 3: grid de cards
  const cols = slide.layoutVariant === "stats-grid-4" ? 4 : 3;
  return (
    <SlideShell theme={theme}>
      <div className="h-full flex flex-col justify-center gap-10">
        <div className="space-y-2">
          {slide.pill && <Eyebrow theme={theme}>{slide.pill}</Eyebrow>}
          <H1 theme={theme} className="text-5xl" colorPrimary>{slide.title}</H1>
        </div>
        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {stats.slice(0, cols).map((s, i) => (
            <div key={i} className="p-8"
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
