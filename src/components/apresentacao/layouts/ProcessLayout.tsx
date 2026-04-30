import { LayoutProps, SlideShell, H1, RichText, Eyebrow } from "./_shared";

/**
 * Process layout estilo Gamma:
 * - Círculos grandes interligados (overlapping) com ícones lineares dentro
 * - Label por baixo de cada círculo
 */
export function ProcessLayout({ slide, theme }: LayoutProps) {
  const steps = slide.blocks && slide.blocks.length > 0
    ? slide.blocks
    : (slide.body || []).map((b, i) => ({ label: `Passo ${i + 1}`, description: b, icon: undefined as string | undefined }));

  const count = Math.min(steps.length, 5);
  // Ícones default por posição (fallback simples)
  const DEFAULT_ICONS = ["◇", "✦", "◈", "▲", "●"];

  return (
    <SlideShell theme={theme} padding="p-16">
      <div className="h-full flex flex-col gap-8">
        <div className="space-y-3">
          {slide.pill && <Eyebrow theme={theme}>{slide.pill}</Eyebrow>}
          <H1 theme={theme} className="text-5xl md:text-6xl" colorPrimary>{slide.title}</H1>
          {slide.subtitle && <RichText text={slide.subtitle} theme={theme} className="text-lg max-w-4xl" />}
        </div>

        {/* Cadeia de círculos overlapping */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center" style={{ marginLeft: -20 * count }}>
            {steps.slice(0, count).map((s, i) => (
              <div key={i} className="flex flex-col items-center" style={{ marginLeft: i === 0 ? 0 : -32 }}>
                <div
                  className="rounded-full flex items-center justify-center text-5xl"
                  style={{
                    height: 200,
                    width: 200,
                    backgroundColor: theme.palette.bg,
                    border: `8px solid ${theme.palette.primary}66`,
                    color: theme.palette.text,
                    position: "relative",
                    zIndex: count - i,
                  }}
                >
                  <span style={{ fontSize: 56, opacity: 0.85 }}>{s.icon || DEFAULT_ICONS[i]}</span>
                </div>
                <div className="text-center mt-5 max-w-[180px]">
                  <div className="text-lg font-semibold" style={{ color: theme.palette.text }}>{s.label}</div>
                  {s.description && (
                    <div className="text-xs mt-1.5 leading-snug" style={{ color: theme.palette.muted }}>{s.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {slide.footnote && (
          <RichText text={slide.footnote} theme={theme} className="text-base max-w-4xl" />
        )}
      </div>
    </SlideShell>
  );
}
