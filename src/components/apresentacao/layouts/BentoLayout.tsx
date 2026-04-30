import { LayoutProps, SlideShell, H1, Eyebrow, getMotifStyles } from "./_shared";

export function BentoLayout({ slide, theme }: LayoutProps) {
  const m = getMotifStyles(theme);
  const blocks = slide.blocks && slide.blocks.length > 0
    ? slide.blocks
    : (slide.body || []).map((b, i) => ({ type: "card" as const, label: `Ponto ${i + 1}`, description: b }));

  const variant = slide.layoutVariant;
  const showImage = !!slide.imageUrl;

  return (
    <SlideShell theme={theme} padding="p-10">
      <div className="h-full flex flex-col gap-6">
        <div className="space-y-2">
          {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
          <H1 theme={theme} className="text-4xl md:text-5xl">{slide.title}</H1>
        </div>

        <div className="flex-1 grid gap-4" style={{
          gridTemplateColumns: variant === "bento-2x3" ? "repeat(2,1fr)" : "repeat(3,1fr)",
          gridAutoRows: "minmax(0,1fr)",
        }}>
          {showImage && (
            <div className="row-span-2 overflow-hidden" style={{ borderRadius: m.radius }}>
              <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          {blocks.slice(0, 6).map((b, i) => (
            <div key={i}
              className={`p-5 flex flex-col justify-between ${i === 0 && variant === "bento-asymm" ? "row-span-2" : ""}`}
              style={{ backgroundColor: m.cardBg, border: m.cardBorder, boxShadow: m.cardShadow, borderRadius: m.radius, backdropFilter: m.backdrop }}
            >
              {b.value && (
                <div className="text-4xl font-bold" style={{ color: theme.palette.primary, fontFamily: theme.fonts.heading }}>{b.value}</div>
              )}
              {b.label && <div className="text-base font-bold mt-2">{b.label}</div>}
              {b.description && <div className="text-sm mt-1" style={{ color: theme.palette.muted }}>{b.description}</div>}
            </div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}
