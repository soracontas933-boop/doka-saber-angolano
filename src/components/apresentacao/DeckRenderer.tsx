import { useEffect, useRef, useState, useCallback } from "react";
import type { Deck, Slide } from "@/types/presentation";
import { HeroLayout } from "./layouts/HeroLayout";
import { AgendaLayout } from "./layouts/AgendaLayout";
import { BentoLayout } from "./layouts/BentoLayout";
import { SplitLayout } from "./layouts/SplitLayout";
import { StatsLayout } from "./layouts/StatsLayout";
import { TimelineLayout } from "./layouts/TimelineLayout";
import { ProcessLayout } from "./layouts/ProcessLayout";
import { ComparisonLayout } from "./layouts/ComparisonLayout";
import { QuoteLayout } from "./layouts/QuoteLayout";
import { GalleryLayout } from "./layouts/GalleryLayout";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { ClosingLayout } from "./layouts/ClosingLayout";
import { GenericLayout } from "./layouts/GenericLayout";

const ASPECT: Record<Deck["aspectRatio"], { w: number; h: number }> = {
  "16:9": { w: 1920, h: 1080 },
  "4:5":  { w: 1080, h: 1350 },
  "1:1":  { w: 1080, h: 1080 },
  "A4":   { w: 1240, h: 1754 },
};

export function SlideRenderer({ slide, theme }: { slide: Slide; theme: Deck["theme"] }) {
  const props = { slide, theme };
  switch (slide.kind) {
    case "hero":       return <HeroLayout {...props} />;
    case "agenda":     return <AgendaLayout {...props} />;
    case "bento":      return <BentoLayout {...props} />;
    case "split":      return <SplitLayout {...props} />;
    case "stats":      return <StatsLayout {...props} />;
    case "timeline":   return <TimelineLayout {...props} />;
    case "process":    return <ProcessLayout {...props} />;
    case "comparison": return <ComparisonLayout {...props} />;
    case "quote":      return <QuoteLayout {...props} />;
    case "gallery":    return <GalleryLayout {...props} />;
    case "dashboard":  return <DashboardLayout {...props} />;
    case "closing":    return <ClosingLayout {...props} />;
    default:           return <GenericLayout {...props} />;
  }
}

export function ScaledSlide({ deck, slide, className = "" }: { deck: Deck; slide: Slide; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const dim = ASPECT[deck.aspectRatio];

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const s = Math.min(r.width / dim.w, r.height / dim.h);
      setScale(s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [dim.w, dim.h]);

  return (
    <div ref={wrapRef} className={`relative w-full h-full overflow-hidden ${className}`} style={{ backgroundColor: deck.theme.palette.bg }}>
      <div
        className="absolute"
        style={{
          width: dim.w,
          height: dim.h,
          left: "50%",
          top: "50%",
          marginLeft: -dim.w / 2,
          marginTop: -dim.h / 2,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
        data-slide-id={slide.id}
      >
        <SlideRenderer slide={slide} theme={deck.theme} />
      </div>
    </div>
  );
}

interface DeckRendererProps {
  deck: Deck;
  current: number;
  onChange: (i: number) => void;
}

export function DeckRenderer({ deck, current, onChange }: DeckRendererProps) {
  const slide = deck.slides[current];
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const goto = useCallback((dir: 1 | -1) => {
    const next = Math.max(0, Math.min(deck.slides.length - 1, current + dir));
    if (next !== current) onChange(next);
  }, [current, deck.slides.length, onChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") goto(1);
      else if (e.key === "ArrowLeft") goto(-1);
      else if (e.key === "Escape" && document.fullscreenElement) document.exitFullscreen();
      else if (e.key === "f" || e.key === "F5") {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goto]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  if (!slide) return null;

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col bg-black/5 dark:bg-black/30">
      <div className="flex-1 min-h-0 p-2 md:p-4">
        <div className="w-full h-full max-w-[1400px] mx-auto rounded-2xl overflow-hidden shadow-2xl">
          <ScaledSlide deck={deck} slide={slide} />
        </div>
      </div>
      {/* dots / counter */}
      {!fullscreen && (
        <div className="shrink-0 flex items-center justify-center gap-2 py-3 flex-wrap">
          {deck.slides.map((_, i) => (
            <button
              key={i}
              onClick={() => onChange(i)}
              className="h-2 rounded-full transition-all"
              style={{
                width: i === current ? 28 : 8,
                backgroundColor: i === current ? deck.theme.palette.primary : "#CBD5E1",
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
          <span className="ml-3 text-xs text-muted-foreground">{current + 1} / {deck.slides.length}</span>
          <button onClick={toggleFullscreen} className="ml-3 text-xs underline opacity-60 hover:opacity-100">Apresentar (F)</button>
        </div>
      )}
    </div>
  );
}

export { ASPECT };
