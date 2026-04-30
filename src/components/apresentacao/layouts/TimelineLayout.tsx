import { LayoutProps, SlideShell, H1, Eyebrow } from "./_shared";

export function TimelineLayout({ slide, theme }: LayoutProps) {
  const items = slide.blocks && slide.blocks.length > 0
    ? slide.blocks
    : (slide.body || []).map((b, i) => ({ label: `Etapa ${i + 1}`, description: b }));

  const isVertical = slide.layoutVariant === "timeline-vertical";

  return (
    <SlideShell theme={theme}>
      <div className="h-full flex flex-col gap-8">
        <div className="space-y-2">
          {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
          <H1 theme={theme} className="text-5xl">{slide.title}</H1>
        </div>

        {isVertical ? (
          <div className="flex-1 flex flex-col gap-5 relative pl-8">
            <div className="absolute left-3 top-2 bottom-2 w-0.5" style={{ backgroundColor: `${theme.palette.primary}66` }} />
            {items.slice(0, 5).map((it, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-8 top-1 h-5 w-5 rounded-full border-4" style={{ backgroundColor: theme.palette.bg, borderColor: theme.palette.primary }} />
                <div className="text-sm font-bold" style={{ color: theme.palette.primary, fontFamily: theme.fonts.heading }}>{it.label}</div>
                <div className="text-base mt-1" style={{ color: theme.palette.muted }}>{it.description}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-3">
            {items.slice(0, 5).map((it, i, arr) => (
              <div key={i} className="flex-1 flex flex-col items-center text-center gap-3">
                <div className="relative w-full flex items-center">
                  <div className="flex-1 h-0.5" style={{ backgroundColor: i === 0 ? "transparent" : `${theme.palette.primary}66` }} />
                  <div className="h-6 w-6 rounded-full border-4 z-10" style={{ backgroundColor: theme.palette.primary, borderColor: theme.palette.bg }} />
                  <div className="flex-1 h-0.5" style={{ backgroundColor: i === arr.length - 1 ? "transparent" : `${theme.palette.primary}66` }} />
                </div>
                <div className="text-sm font-bold" style={{ color: theme.palette.primary, fontFamily: theme.fonts.heading }}>{it.label}</div>
                <div className="text-xs px-2" style={{ color: theme.palette.muted }}>{it.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SlideShell>
  );
}
