import { LayoutProps, SlideShell, H1, Eyebrow } from "./_shared";

export function SplitLayout({ slide, theme }: LayoutProps) {
  const variant = slide.layoutVariant;
  const imageRight = variant === "split-image-right";
  const widthText = variant === "split-60-40" ? "w-3/5" : "w-1/2";
  const widthImg  = variant === "split-60-40" ? "w-2/5" : "w-1/2";

  const TextSide = (
    <div className={`${widthText} flex flex-col justify-center p-14 gap-6`}>
      {slide.subtitle && <Eyebrow theme={theme}>{slide.subtitle}</Eyebrow>}
      <H1 theme={theme} className="text-5xl md:text-6xl">{slide.title}</H1>
      {slide.body && slide.body.length > 0 && (
        <ul className="space-y-3 text-lg mt-2" style={{ color: theme.palette.text }}>
          {slide.body.map((b, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: theme.palette.accent }} />
              <span style={{ color: theme.palette.muted }}>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const ImgSide = (
    <div className={`${widthImg} relative overflow-hidden`}>
      {slide.imageUrl ? (
        <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 animate-pulse" style={{ backgroundColor: `${theme.palette.primary}22` }} />
      )}
      {variant === "split-diagonal" && (
        <div className="absolute inset-0" style={{ background: `linear-gradient(120deg, ${theme.palette.bg} 0%, transparent 40%)` }} />
      )}
    </div>
  );

  return (
    <div className="w-full h-full flex" style={{ backgroundColor: theme.palette.bg, fontFamily: theme.fonts.body }}>
      {imageRight ? <>{TextSide}{ImgSide}</> : <>{ImgSide}{TextSide}</>}
    </div>
  );
}
