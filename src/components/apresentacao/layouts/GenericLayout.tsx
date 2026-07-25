import { LayoutProps, SlideShell, H1, Eyebrow, RichText, getMotifStyles } from "./_shared";

// Fallback genérico — apenas para SlideKinds que não têm layout dedicado
// Todos os tipos principais agora têm layouts próprios
export function GenericLayout({ slide, theme }: LayoutProps) {
  const m = getMotifStyles(theme);
  const bodyClean = (slide.body || []).map(b => (b || "").trim()).filter(Boolean);

  return (
    <SlideShell theme={theme}>
      <div className="h-full flex flex-col gap-6 justify-center">
        <div className="space-y-2">
          {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
          <H1 theme={theme} className="text-5xl">{slide.title}</H1>
        </div>
        {slide.richBody && (
          <RichText text={slide.richBody} theme={theme} className="text-lg leading-[1.7] max-w-3xl" />
        )}
        {bodyClean.length > 0 && (
          <div className="grid grid-cols-2 gap-3 max-w-4xl">
            {bodyClean.slice(0, 6).map((b, i) => (
              <div key={i} className="p-4 rounded-xl flex gap-3 items-start" style={{ backgroundColor: m.cardBg, border: m.cardBorder, borderRadius: m.radius }}>
                <span className="text-sm font-bold shrink-0 mt-0.5" style={{ color: theme.palette.primary }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-base" style={{ color: theme.palette.text }}>{b}</span>
              </div>
            ))}
          </div>
        )}
        {(slide.blocks || []).length > 0 && (
          <div className="grid grid-cols-2 gap-3 max-w-4xl mt-2">
            {(slide.blocks || []).slice(0, 4).map((b, i) => (
              <div key={`block-${i}`} className="p-4 rounded-xl" style={{ backgroundColor: m.cardBg, border: m.cardBorder, borderRadius: m.radius }}>
                <div className="text-sm font-bold" style={{ color: theme.palette.primary }}>{b.label || ""}</div>
                {b.value && <div className="text-2xl font-bold" style={{ color: theme.palette.text }}>{b.value}</div>}
                {b.description && <p className="text-sm mt-1" style={{ color: theme.palette.muted }}>{b.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </SlideShell>
  );
}
