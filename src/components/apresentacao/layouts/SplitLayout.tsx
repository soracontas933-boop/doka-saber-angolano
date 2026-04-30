import { LayoutProps, H1, RichText, Eyebrow, MadeWithBadge } from "./_shared";

/**
 * Split layout estilo Gamma:
 * - Imagem sangra completamente até à borda (sem padding)
 * - Texto do outro lado com título azul gigante + parágrafo rico + bullets opcionais
 */
export function SplitLayout({ slide, theme }: LayoutProps) {
  const variant = slide.layoutVariant;
  const imageRight = variant === "split-image-right";
  const widthText = variant === "split-60-40" ? "w-3/5" : "w-1/2";
  const widthImg = variant === "split-60-40" ? "w-2/5" : "w-1/2";

  const TextSide = (
    <div className={`${widthText} flex flex-col justify-center p-16 gap-6`}>
      {slide.pill && <Eyebrow theme={theme}>{slide.pill}</Eyebrow>}
      <H1 theme={theme} className="text-5xl md:text-6xl" colorPrimary>{slide.title}</H1>
      {slide.subtitle && !slide.richBody && (
        <RichText text={slide.subtitle} theme={theme} className="text-xl" />
      )}
      {slide.richBody && (
        <RichText text={slide.richBody} theme={theme} className="text-lg md:text-xl" />
      )}
      {slide.body && slide.body.length > 0 && (
        <ul className="space-y-3 text-lg mt-2">
          {slide.body.map((b, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: theme.palette.primary }} />
              <span style={{ color: theme.palette.muted }}>{b}</span>
            </li>
          ))}
        </ul>
      )}
      {slide.footnote && (
        <div className="mt-6 px-5 py-4 rounded-2xl flex items-start gap-3" style={{ backgroundColor: `${theme.palette.accent}22`, borderLeft: `3px solid ${theme.palette.primary}` }}>
          <span className="text-xl">✓</span>
          <span style={{ color: theme.palette.text }} className="text-base font-medium">{slide.footnote}</span>
        </div>
      )}
    </div>
  );

  const ImgSide = (
    <div className={`${widthImg} relative overflow-hidden`}>
      {slide.imageUrl ? (
        <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.palette.primary}22, ${theme.palette.accent}33)` }} />
      )}
    </div>
  );

  return (
    <div className="relative w-full h-full flex" style={{ backgroundColor: theme.palette.bg, fontFamily: theme.fonts.body }}>
      {imageRight ? <>{TextSide}{ImgSide}</> : <>{ImgSide}{TextSide}</>}
      <MadeWithBadge theme={theme} />
    </div>
  );
}
