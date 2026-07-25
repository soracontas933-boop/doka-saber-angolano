import { LayoutProps, SlideShell, H1, Eyebrow, getMotifStyles } from "./_shared";

// Layout dedicado para "references" — fontes, bibliografia
export function ReferencesLayout({ slide, theme }: LayoutProps) {
  const variant = slide.layoutVariant;
  const bodyClean = (slide.body || []).map(b => (b || "").trim()).filter(Boolean);

  // Variant: refs-2col (duas colunas com numeração elegante)
  if (variant === "refs-2col") {
    return (
      <SlideShell theme={theme}>
        <div className="h-full flex flex-col gap-6">
          <div className="space-y-2">
            <Eyebrow theme={theme}>Fontes & Referências</Eyebrow>
            <H1 theme={theme} className="text-5xl">{slide.title || "Bibliografia"}</H1>
          </div>
          <div className="flex-1 overflow-hidden columns-2 gap-10">
            {bodyClean.map((ref, i) => (
              <div key={i} className="mb-4 pb-4 break-inside-avoid" style={{ borderBottom: `1px solid ${theme.palette.muted}22` }}>
                <div className="flex items-start gap-3">
                  <span className="text-lg font-black shrink-0 mt-0.5" style={{ color: theme.palette.primary, opacity: 0.5 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm leading-relaxed" style={{ color: theme.palette.muted }}>{ref}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SlideShell>
    );
  }

  // Default: refs-list (lista com separadores e numeração)
  return (
    <SlideShell theme={theme}>
      <div className="h-full flex flex-col gap-6">
        <div className="space-y-2">
          <Eyebrow theme={theme}>Fontes & Referências</Eyebrow>
          <H1 theme={theme} className="text-5xl">{slide.title || "Bibliografia"}</H1>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 pr-4">
          {bodyClean.map((ref, i) => (
            <div key={i} className="flex items-start gap-4 py-3" style={{ borderBottom: `1px solid ${theme.palette.muted}11` }}>
              <span className="text-base font-bold shrink-0 mt-0.5 w-8 text-right" style={{ color: theme.palette.primary, opacity: 0.6 }}>
                {i + 1}
              </span>
              <span className="text-base leading-relaxed" style={{ color: theme.palette.muted }}>{ref}</span>
            </div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}
