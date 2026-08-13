import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, BarChart3, CheckCircle2, Clock3, Columns2,
  Image as ImageIcon, List, Quote, Sparkles, Target, X,
} from "lucide-react";
import type { DellePresentation, DelleSlide, DelleSlideType } from "@/types/delle-presentation";

const TYPE_LABELS: Record<DelleSlideType, string> = {
  title: "Abertura",
  agenda: "Agenda",
  bullets: "Pontos-chave",
  comparison: "Comparação",
  stat: "Dado em destaque",
  timeline: "Linha do tempo",
  quote: "Citação",
  image_focus: "Foco visual",
  closing: "Próximos passos",
};

const TYPE_ICONS: Record<DelleSlideType, typeof Sparkles> = {
  title: Sparkles,
  agenda: List,
  bullets: CheckCircle2,
  comparison: Columns2,
  stat: BarChart3,
  timeline: Clock3,
  quote: Quote,
  image_focus: ImageIcon,
  closing: Target,
};

const ACCENTS = ["#6D5EF7", "#0EA5A4", "#F97316", "#E11D48", "#2563EB"];

function cleanBullet(text: string) {
  return text.replace(/^[-•*]\s*/, "").trim();
}

function SlideFrame({ children, slide, active }: { children: React.ReactNode; slide: DelleSlide; active?: boolean }) {
  const accent = ACCENTS[(slide.ordem - 1) % ACCENTS.length];
  const Icon = TYPE_ICONS[slide.tipo];
  return (
    <article
      className={`relative h-full min-h-[560px] w-full overflow-hidden rounded-[28px] border bg-[#fbfbfd] p-8 text-[#171827] shadow-[0_28px_80px_rgba(26,24,61,0.14)] transition-all md:p-14 ${active ? "" : "opacity-95"}`}
      style={{ borderColor: `${accent}22` }}
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: accent }} />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#c8c4ff] opacity-25 blur-3xl" />
      <div className="relative z-10 flex h-full flex-col">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}15` }}>
              <Icon className="h-4 w-4" />
            </span>
            {TYPE_LABELS[slide.tipo]}
          </div>
          <span className="text-xs font-semibold text-[#85869a]">{String(slide.ordem).padStart(2, "0")}</span>
        </header>
        {children}
        {slide.notas_apresentador && (
          <footer className="mt-auto border-t border-[#e7e6ef] pt-5 text-xs leading-relaxed text-[#85869a]">
            <span className="font-semibold text-[#5b5c70]">Nota do apresentador: </span>{slide.notas_apresentador}
          </footer>
        )}
        <div className="absolute bottom-5 right-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9b9caf]">Delle Presentations</div>
      </div>
    </article>
  );
}

function VisualHint({ text, imageUrl, compact = false }: { text: string; imageUrl?: string; compact?: boolean }) {
  if (imageUrl) {
    return <img src={imageUrl} alt="Visual da apresentação" className={`w-full rounded-2xl object-cover shadow-lg ${compact ? "h-32" : "h-56"}`} />;
  }
  return (
    <div className={`flex w-full items-center justify-center rounded-2xl border border-dashed border-[#bdb9f2] bg-gradient-to-br from-[#f1efff] to-[#fbfbff] p-5 text-center ${compact ? "h-32" : "h-56"}`}>
      <div className="max-w-xs">
        <ImageIcon className="mx-auto mb-3 h-7 w-7 text-[#8278e8]" />
        <p className="text-sm leading-relaxed text-[#696a82]">{text || "Sugestão visual"}</p>
      </div>
    </div>
  );
}

function SlideContent({ slide }: { slide: DelleSlide }) {
  const bullets = slide.bullets?.map(cleanBullet).filter(Boolean) || [];
  switch (slide.tipo) {
    case "title":
      return (
        <div className="flex flex-1 flex-col justify-center gap-10 md:flex-row md:items-center">
          <div className="max-w-2xl flex-1">
            <p className="mb-5 text-sm font-bold uppercase tracking-[0.25em] text-[#6d5ef7]">Uma nova perspectiva</p>
            <h1 className="text-5xl font-black leading-[0.98] tracking-[-0.05em] md:text-7xl">{slide.headline}</h1>
            {bullets[0] && <p className="mt-7 max-w-xl text-lg leading-relaxed text-[#68697e]">{bullets[0]}</p>}
          </div>
          <div className="w-full max-w-sm"><VisualHint text={slide.sugestao_visual} imageUrl={slide.imageUrl} /></div>
        </div>
      );
    case "agenda":
      return (
        <div className="flex flex-1 flex-col justify-center">
          <h2 className="max-w-3xl text-5xl font-black leading-tight tracking-[-0.04em] md:text-6xl">{slide.headline}</h2>
          <div className="mt-10 grid gap-3 md:grid-cols-2">
            {bullets.map((bullet, index) => <div key={bullet + index} className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#ebeaf4]"><span className="text-xl font-black text-[#6d5ef7]">{String(index + 1).padStart(2, "0")}</span><span className="font-semibold text-[#36374b]">{bullet}</span></div>)}
          </div>
        </div>
      );
    case "comparison":
      return (
        <div className="flex flex-1 flex-col justify-center">
          <h2 className="max-w-3xl text-4xl font-black leading-tight tracking-[-0.04em] md:text-6xl">{slide.headline}</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {(bullets.length ? bullets : ["Antes", "Depois"]).slice(0, 2).map((bullet, index) => <div key={bullet + index} className={`rounded-3xl p-7 ${index === 0 ? "bg-[#f0effa]" : "bg-[#19182d] text-white"}`}><div className="mb-8 text-xs font-bold uppercase tracking-[0.2em] opacity-60">{index === 0 ? "Ponto de partida" : "Nova direção"}</div><p className="text-xl font-bold leading-relaxed">{bullet}</p></div>)}
          </div>
        </div>
      );
    case "stat":
      return (
        <div className="flex flex-1 flex-col justify-center md:flex-row md:items-center md:gap-16">
          <div className="flex-1"><p className="text-8xl font-black tracking-[-0.08em] text-[#6d5ef7] md:text-[10rem]">{bullets[0] || "[inserir dado]"}</p><h2 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-[-0.04em] md:text-6xl">{slide.headline}</h2>{bullets.slice(1).map((bullet, i) => <p key={bullet + i} className="mt-5 max-w-xl text-lg text-[#68697e]">{bullet}</p>)}</div>
          <div className="mt-8 w-full max-w-sm md:mt-0"><VisualHint text={slide.sugestao_visual} imageUrl={slide.imageUrl} compact /></div>
        </div>
      );
    case "timeline":
      return (
        <div className="flex flex-1 flex-col justify-center"><h2 className="max-w-3xl text-4xl font-black leading-tight tracking-[-0.04em] md:text-6xl">{slide.headline}</h2><div className="relative mt-12 grid gap-5 md:grid-cols-3"><div className="absolute left-8 right-8 top-8 hidden h-px bg-[#d8d5f7] md:block" />{bullets.map((bullet, i) => <div key={bullet + i} className="relative z-10 flex gap-4 md:block"><span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#6d5ef7] text-lg font-black text-white shadow-lg shadow-[#6d5ef7]/25">{i + 1}</span><p className="pt-2 text-base font-semibold leading-relaxed text-[#48495e] md:mt-5 md:pr-4">{bullet}</p></div>)}</div></div>
      );
    case "quote":
      return <div className="flex flex-1 flex-col items-center justify-center text-center"><Quote className="mb-7 h-12 w-12 text-[#6d5ef7]" /><blockquote className="max-w-4xl text-4xl font-black leading-tight tracking-[-0.04em] md:text-6xl">{slide.headline}</blockquote>{bullets[0] && <p className="mt-8 text-lg text-[#68697e]">{bullets[0]}</p>}</div>;
    case "image_focus":
      return <div className="flex flex-1 flex-col justify-center"><h2 className="mb-8 max-w-3xl text-4xl font-black leading-tight tracking-[-0.04em] md:text-6xl">{slide.headline}</h2><VisualHint text={slide.sugestao_visual} imageUrl={slide.imageUrl} /></div>;
    case "closing":
      return <div className="flex flex-1 flex-col items-center justify-center text-center"><div className="mb-7 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#6d5ef7] text-white shadow-xl shadow-[#6d5ef7]/30"><Target className="h-9 w-9" /></div><h2 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.05em] md:text-7xl">{slide.headline}</h2><div className="mt-8 flex flex-wrap justify-center gap-3">{bullets.map((bullet, i) => <span key={bullet + i} className="rounded-full bg-[#f0effa] px-5 py-3 text-sm font-semibold text-[#4f4d78]">{bullet}</span>)}</div></div>;
    default:
      return <div className="flex flex-1 flex-col justify-center"><h2 className="text-5xl font-black">{slide.headline}</h2><ul className="mt-8 space-y-4">{bullets.map((bullet, i) => <li key={bullet + i} className="flex gap-3 text-lg"><span className="text-[#6d5ef7]">•</span>{bullet}</li>)}</ul></div>;
  }
}

export function DelleSlideRenderer({ slide }: { slide: DelleSlide }) {
  return <SlideFrame slide={slide} active><SlideContent slide={slide} /></SlideFrame>;
}

export default function DellePresentationRenderer({ presentation, initialSlide = 0, onClose }: { presentation: DellePresentation; initialSlide?: number; onClose?: () => void }) {
  const [current, setCurrent] = useState(initialSlide);
  const slide = presentation.slides[current];
  const canGoBack = current > 0;
  const canGoNext = current < presentation.slides.length - 1;
  const progress = useMemo(() => ((current + 1) / presentation.slides.length) * 100, [current, presentation.slides.length]);

  useEffect(() => { setCurrent(initialSlide); }, [initialSlide, presentation.meta.titulo_apresentacao]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setCurrent(value => Math.min(value + 1, presentation.slides.length - 1));
      if (event.key === "ArrowLeft") setCurrent(value => Math.max(value - 1, 0));
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, presentation.slides.length]);

  if (!slide) return null;
  return (
    <section className="fixed inset-0 z-50 flex flex-col bg-[#11101f] p-3 md:p-7">
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4 pb-4 text-white">
        <div className="min-w-0"><p className="truncate text-sm font-bold">{presentation.meta.titulo_apresentacao}</p><p className="text-xs text-white/50">{presentation.meta.publico_alvo} · {presentation.meta.tom}</p></div>
        {onClose && <button onClick={onClose} aria-label="Fechar apresentação" className="rounded-xl p-2 text-white/60 transition hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>}
      </div>
      <div className="mx-auto min-h-0 w-full max-w-[1500px] flex-1"><DelleSlideRenderer slide={slide} /></div>
      <div className="mx-auto flex w-full max-w-[1500px] items-center gap-4 pt-4 text-white">
        <button onClick={() => setCurrent(value => Math.max(value - 1, 0))} disabled={!canGoBack} className="rounded-xl p-2 transition hover:bg-white/10 disabled:opacity-30"><ArrowLeft className="h-5 w-5" /></button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#8b7cff] transition-all" style={{ width: `${progress}%` }} /></div>
        <span className="min-w-[52px] text-center text-xs text-white/60">{current + 1} / {presentation.slides.length}</span>
        <button onClick={() => setCurrent(value => Math.min(value + 1, presentation.slides.length - 1))} disabled={!canGoNext} className="rounded-xl p-2 transition hover:bg-white/10 disabled:opacity-30"><ArrowRight className="h-5 w-5" /></button>
      </div>
    </section>
  );
}

export { SlideContent };
