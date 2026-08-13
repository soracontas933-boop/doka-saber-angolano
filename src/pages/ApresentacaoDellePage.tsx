import { useState } from "react";
import { ArrowLeft, FileText, Loader2, Presentation, Sparkles, WandSparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import DellePresentationRenderer from "@/components/apresentacao/DellePresentationRenderer";
import { generateDellePresentation, generateDelleSlideImage } from "@/lib/presentation/delle-presentation-service";
import type { DellePresentation } from "@/types/delle-presentation";

const EXAMPLES = [
  "A transformação digital nas escolas de Angola",
  "Estratégia de marketing para uma startup educativa",
  "Evolução climática e impacto na agricultura familiar",
];

export default function ApresentacaoDellePage() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("consultivo e inspirador");
  const [presentation, setPresentation] = useState<DellePresentation | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [presenting, setPresenting] = useState(false);

  const generate = async () => {
    if (topic.trim().length < 8) {
      toast.error("Descreve um tema ou cola um outline com mais detalhes.");
      return;
    }
    setLoading(true);
    try {
      const input = [
        `INPUT DO UTILIZADOR:\n${topic.trim()}`,
        audience.trim() ? `PÚBLICO-ALVO:\n${audience.trim()}` : "",
        tone.trim() ? `TOM PREFERIDO:\n${tone.trim()}` : "",
        "IDIOMA DE SAÍDA: Português de Angola.",
      ].filter(Boolean).join("\n\n");
      const result = await generateDellePresentation(input);
      setPresentation(result);
      toast.success(`${result.slides.length} slides criados pela Delle.`);
      setLoadingImages(true);
      const slidesWithImages = await Promise.all(result.slides.map(async (slide) => {
        if (!["image_focus", "title", "stat"].includes(slide.tipo)) return slide;
        const imageUrl = await generateDelleSlideImage(slide, result.meta);
        return imageUrl ? { ...slide, imageUrl } : slide;
      }));
      setPresentation({ ...result, slides: slidesWithImages });
    } catch (error) {
      console.error("[delle-presentation] generation failed", error);
      toast.error("Não foi possível criar a apresentação. Tenta novamente com um tema mais detalhado.");
    } finally {
      setLoading(false);
      setLoadingImages(false);
    }
  };

  if (presenting && presentation) {
    return <DellePresentationRenderer presentation={presentation} onClose={() => setPresenting(false)} />;
  }

  if (presentation) {
    return (
      <main className="min-h-screen bg-[#f4f3f9] px-4 py-6 md:px-8 md:py-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6d5ef7]">Delle Presentations</p><h1 className="mt-2 text-3xl font-black tracking-tight text-[#19182d]">{presentation.meta.titulo_apresentacao}</h1><p className="mt-1 text-sm text-[#77788e]">{presentation.meta.publico_alvo} · {presentation.meta.tom} · {presentation.slides.length} slides</p></div>
            <div className="flex gap-2"><Button variant="outline" onClick={() => setPresentation(null)}>Nova apresentação</Button><Button onClick={() => setPresenting(true)} className="bg-[#6d5ef7] hover:bg-[#5c4de4]"><Presentation className="mr-2 h-4 w-4" />Apresentar</Button></div>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{presentation.slides.map((slide) => <button key={slide.ordem} onClick={() => setPresenting(true)} className="group text-left"><div className="aspect-[16/10] overflow-hidden rounded-2xl transition group-hover:-translate-y-1"><DellePresentationRenderer presentation={{ ...presentation, slides: [slide] }} /></div><p className="mt-2 truncate text-sm font-semibold text-[#45465b]">{String(slide.ordem).padStart(2, "0")} · {slide.headline}</p></button>)}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f7fc] px-4 py-6 md:px-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        <button onClick={() => navigate(-1)} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#77788e] transition hover:text-[#6d5ef7]"><ArrowLeft className="h-4 w-4" />Voltar</button>
        <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#ebe9ff] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#6d5ef7]"><Sparkles className="h-4 w-4" />Novo sistema Delle</div>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.06em] text-[#19182d] md:text-7xl">Apresentações que contam uma história</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#68697e]">Transforma um tema, outline ou documento numa apresentação clara, visual e pronta para apresentar. A Delle escolhe o formato certo para cada ideia.</p>
            <div className="mt-8 flex flex-wrap gap-3">{EXAMPLES.map((example) => <button key={example} onClick={() => setTopic(example)} className="rounded-full border border-[#dedcf0] bg-white px-4 py-2 text-left text-sm font-medium text-[#5b5c70] transition hover:border-[#aaa1ff] hover:text-[#6d5ef7]">{example}</button>)}</div>
          </section>
          <section className="rounded-[28px] border border-[#e8e6f1] bg-white p-6 shadow-[0_20px_60px_rgba(42,39,87,0.08)] md:p-8">
            <div className="mb-6 flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ebe9ff] text-[#6d5ef7]"><WandSparkles className="h-5 w-5" /></div><div><h2 className="font-bold text-[#25253a]">Criar apresentação</h2><p className="text-xs text-[#85869a]">Uma chamada. Uma narrativa completa.</p></div></div>
            <label className="mb-2 block text-sm font-semibold text-[#404158]">Tema ou conteúdo-base</label>
            <Textarea value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Escreve um tema, cola o teu outline ou insere o texto de um documento..." className="min-h-44 resize-y rounded-2xl border-[#e2e0ee] bg-[#fcfcfe] p-4 leading-relaxed focus-visible:ring-[#6d5ef7]" />
            <div className="mt-5 grid gap-4 sm:grid-cols-2"><div><label className="mb-2 block text-sm font-semibold text-[#404158]">Público-alvo <span className="font-normal text-[#9a9aac]">(opcional)</span></label><Input value={audience} onChange={(event) => setAudience(event.target.value)} placeholder="Ex.: estudantes universitários" className="rounded-xl border-[#e2e0ee]" /></div><div><label className="mb-2 block text-sm font-semibold text-[#404158]">Tom</label><Input value={tone} onChange={(event) => setTone(event.target.value)} placeholder="Ex.: formal e académico" className="rounded-xl border-[#e2e0ee]" /></div></div>
            <Button onClick={generate} disabled={loading} className="mt-6 h-12 w-full rounded-xl bg-[#6d5ef7] text-base font-bold shadow-lg shadow-[#6d5ef7]/20 hover:bg-[#5c4de4]">{loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />A construir narrativa...</> : <><FileText className="mr-2 h-5 w-5" />Gerar apresentação Delle</>}</Button>
            {loadingImages && !loading && <p className="mt-4 text-center text-xs text-[#85869a]">A criar os visuais de apoio...</p>}
          </section>
        </div>
        <div className="mt-16 grid gap-4 text-sm text-[#68697e] md:grid-cols-3"><div className="rounded-2xl bg-white p-5"><strong className="text-[#25253a]">Narrativa lógica</strong><p className="mt-2 leading-relaxed">Abertura, contexto, desenvolvimento e próximos passos sem repetição.</p></div><div className="rounded-2xl bg-white p-5"><strong className="text-[#25253a]">Slides com propósito</strong><p className="mt-2 leading-relaxed">Comparações, dados, cronologias e visuais escolhidos por ideia.</p></div><div className="rounded-2xl bg-white p-5"><strong className="text-[#25253a]">Pronto para apresentar</strong><p className="mt-2 leading-relaxed">Modo de apresentação limpo, navegação por teclado e layout responsivo.</p></div></div>
      </div>
    </main>
  );
}
