import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Presentation, 
  Download, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Image as ImageIcon,
  Sparkles,
  Type,
  Layout,
  Palette,
  Send,
  RefreshCw,
  CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { generateWithAI, DELLE_SYSTEM_PROMPT, generateImageAI, generateImageUrl } from "@/lib/ai-service";
import { useUsageTracker } from "@/hooks/use-usage-tracker";
import jsPDF from "jspdf";

interface Slide {
  titulo: string;
  conteudo: string;
  imageUrl?: string;
  layout?: "split" | "full" | "centered";
}

const ESTILOS = [
  { value: "moderno", label: "Moderno & Vibrante", bg: "bg-slate-950", accent: "text-violet-500", preview: "#8b5cf6" },
  { value: "minimalista", label: "Minimalista Clean", bg: "bg-white", accent: "text-slate-900", preview: "#1e293b" },
  { value: "futurista", label: "Futurista Dark", bg: "bg-black", accent: "text-cyan-400", preview: "#22d3ee" },
  { value: "elegante", label: "Elegante Soft", bg: "bg-stone-50", accent: "text-stone-800", preview: "#78716c" },
];

const SLIDE_THEMES: Record<string, { bg: string; accent: string; text: string; secondary: string }> = {
  moderno: { bg: "#0f172a", accent: "#8b5cf6", text: "#f8fafc", secondary: "#1e293b" },
  minimalista: { bg: "#ffffff", accent: "#0f172a", text: "#334155", secondary: "#f1f5f9" },
  futurista: { bg: "#000000", accent: "#22d3ee", text: "#e2e8f0", secondary: "#111111" },
  elegante: { bg: "#fafaf9", accent: "#44403c", text: "#57534e", secondary: "#f5f5f4" },
};

export default function ApresentacaoPage() {
  const navigate = useNavigate();
  const { checkLimit, logUsage } = useUsageTracker();
  
  // State for Gamma-like flow
  const [step, setStep] = useState<"input" | "outline" | "generating" | "editor">("input");
  const [prompt, setPrompt] = useState("");
  const [outline, setOutline] = useState<{ title: string; topics: string[] } | null>(null);
  const [estilo, setEstilo] = useState("moderno");
  const [numSlides, setNumSlides] = useState("8");
  
  const [loading, setLoading] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [generatingImages, setGeneratingImages] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);

  // Auto-focus input on mount
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (step === "input") inputRef.current?.focus();
  }, [step]);

  const generateOutline = async () => {
    if (!prompt.trim()) {
      toast.error("Diz-me sobre o que queres a apresentação.");
      return;
    }

    setLoading(true);
    try {
      const aiPrompt = `Cria um esboço estruturado para uma apresentação sobre: "${prompt}".
Retorna APENAS JSON:
{
  "title": "Título Criativo",
  "topics": ["Tópico 1", "Tópico 2", "Tópico 3", "Tópico 4", "Tópico 5"]
}
Gere entre 5 a 8 tópicos principais.`;

      const result = await generateWithAI(DELLE_SYSTEM_PROMPT, aiPrompt, 1000, 0.7);
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] || result.content);
      
      setOutline(parsed);
      setStep("outline");
    } catch (err) {
      toast.error("Erro ao gerar esboço. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFull = async () => {
    const allowed = await checkLimit("apresentacao" as any);
    if (!allowed) return;

    setStep("generating");
    setLoading(true);
    setSlides([]);

    try {
      const fullPrompt = `Gera uma apresentação completa baseada neste esboço: ${JSON.stringify(outline)}.
Estilo visual: ${estilo}. Número de slides: ${numSlides}.

Retorna APENAS JSON válido:
{
  "slides": [
    {
      "titulo": "Título do slide",
      "conteudo": "Conteúdo rico e criativo em tópicos (usar \\n para quebras).",
      "layout": "split" | "full" | "centered",
      "image_prompt": "Detailed artistic image description in English"
    }
  ]
}
O conteúdo deve ser em Português de Angola, profissional e cativante.`;

      const result = await generateWithAI(DELLE_SYSTEM_PROMPT, fullPrompt, 4000, 0.8);
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] || result.content);

      const rawSlides: Slide[] = (parsed.slides || []).map((s: any) => ({
        titulo: s.titulo || "",
        conteudo: s.conteudo || "",
        layout: s.layout || "split",
        imageUrl: undefined,
      }));

      setSlides(rawSlides);
      setStep("editor");
      setCurrentSlide(0);
      await logUsage("apresentacao" as any, result.service_used, result.tokens_used);

      // Background image generation
      setGeneratingImages(true);
      const imagePrompts = (parsed.slides || []).map((s: any) => s.image_prompt || "");
      
      for (let i = 0; i < rawSlides.length; i++) {
        if (!imagePrompts[i]) continue;
        try {
          const imgResult = await generateImageAI(`${imagePrompts[i]}, high quality, digital art, ${estilo} style`, 1024, 576);
          setSlides(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], imageUrl: imgResult.image_url };
            return updated;
          });
        } catch {
          const fallbackUrl = generateImageUrl(imagePrompts[i], 1024, 576);
          setSlides(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], imageUrl: fallbackUrl };
            return updated;
          });
        }
      }
      setGeneratingImages(false);
    } catch (err: any) {
      toast.error("Erro ao gerar apresentação.");
      setStep("outline");
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    if (slides.length === 0) return;
    toast.info("A preparar o teu PDF criativo...");

    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1280, 720] });
    const theme = SLIDE_THEMES[estilo] || SLIDE_THEMES.moderno;

    for (let i = 0; i < slides.length; i++) {
      if (i > 0) pdf.addPage();
      const slide = slides[i];

      // Background
      pdf.setFillColor(theme.bg);
      pdf.rect(0, 0, 1280, 720, "F");

      // Title
      pdf.setTextColor(theme.accent);
      pdf.setFontSize(42);
      pdf.setFont("helvetica", "bold");
      pdf.text(slide.titulo, 60, 80, { maxWidth: 1160 });

      // Content
      pdf.setTextColor(theme.text);
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "normal");
      const lines = slide.conteudo.split("\\n").join("\n").split("\n");
      let y = 160;
      for (const line of lines) {
        if (y > 650) break;
        pdf.text(line.startsWith("•") ? line : `• ${line}`, 60, y, { maxWidth: 700 });
        y += 35;
      }

      // Footer
      pdf.setFontSize(14);
      pdf.setTextColor(theme.accent);
      pdf.text(`Doka Saber - ${i + 1}`, 1200, 700);
    }

    pdf.save(`doka-apresentacao-${outline?.title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
    toast.success("PDF pronto!");
  };

  const theme = SLIDE_THEMES[estilo] || SLIDE_THEMES.moderno;

  return (
    <div className="min-h-screen bg-[#030303] text-white overflow-hidden flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-white/5 bg-black/50 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-violet-600 rounded-lg">
              <Presentation className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg">Doka <span className="text-violet-500">Gamma</span></span>
          </div>
        </div>
        
        {step === "editor" && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep("input")} className="bg-white/5 border-white/10 hover:bg-white/10">
              <RefreshCw className="h-4 w-4 mr-2" /> Novo
            </Button>
            <Button size="sm" onClick={exportPDF} className="bg-violet-600 hover:bg-violet-700">
              <Download className="h-4 w-4 mr-2" /> Exportar PDF
            </Button>
          </div>
        )}
      </header>

      <main className="flex-1 relative flex flex-col items-center justify-center p-4 md:p-8">
        <AnimatePresence mode="wait">
          {/* STEP 1: INPUT */}
          {step === "input" && (
            <motion.div 
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-3xl space-y-8 text-center"
            >
              <div className="space-y-4">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="inline-block p-3 bg-violet-500/10 rounded-2xl border border-violet-500/20 mb-4"
                >
                  <Sparkles className="h-8 w-8 text-violet-500" />
                </motion.div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
                  O que vamos criar hoje?
                </h1>
                <p className="text-slate-400 text-lg max-w-xl mx-auto">
                  Escreve um tema ou uma ideia e eu transformo numa apresentação incrível em segundos.
                </p>
              </div>

              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-500 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
                <div className="relative flex items-center bg-zinc-900 rounded-2xl p-2 border border-white/10">
                  <Input 
                    ref={inputRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && generateOutline()}
                    placeholder="Ex: A história de Angola, Como funciona a IA, Plano de Marketing..."
                    className="bg-transparent border-0 focus-visible:ring-0 text-xl h-14 px-4 placeholder:text-slate-600"
                  />
                  <Button 
                    onClick={generateOutline}
                    disabled={loading || !prompt.trim()}
                    className="h-12 w-12 rounded-xl bg-violet-600 hover:bg-violet-700 shrink-0"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2 text-sm text-slate-500">
                <span>Sugestões:</span>
                {["Energias Renováveis", "Culinária Angolana", "Futuro do Trabalho"].map(s => (
                  <button 
                    key={s} 
                    onClick={() => setPrompt(s)}
                    className="px-3 py-1 rounded-full border border-white/5 hover:border-white/20 hover:text-white transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 2: OUTLINE */}
          {step === "outline" && outline && (
            <motion.div 
              key="outline"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              <div className="md:col-span-2 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Layout className="h-5 w-5 text-violet-500" />
                  <h2 className="text-xl font-bold">Estrutura da Apresentação</h2>
                </div>
                <Card className="bg-zinc-900 border-white/10 overflow-hidden">
                  <CardContent className="p-6 space-y-4">
                    <div className="pb-4 border-b border-white/5">
                      <h3 className="text-2xl font-bold text-white">{outline.title}</h3>
                    </div>
                    <ul className="space-y-3">
                      {outline.topics.map((topic, i) => (
                        <motion.li 
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="flex items-center gap-3 text-slate-300"
                        >
                          <div className="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-violet-400">
                            {i + 1}
                          </div>
                          {topic}
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Button 
                  onClick={handleGenerateFull} 
                  className="w-full h-14 text-lg font-bold bg-violet-600 hover:bg-violet-700 rounded-2xl shadow-lg shadow-violet-600/20"
                >
                  Continuar para Gerar Slides <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Palette className="h-5 w-5 text-violet-500" />
                  <h2 className="text-xl font-bold">Personalização</h2>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Estilo Visual</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ESTILOS.map(e => (
                        <button
                          key={e.value}
                          onClick={() => setEstilo(e.value)}
                          className={`p-3 rounded-xl border text-left transition-all ${estilo === e.value ? "border-violet-500 bg-violet-500/10" : "border-white/5 bg-white/5 hover:bg-white/10"}`}
                        >
                          <div className="w-full h-2 rounded-full mb-2" style={{ backgroundColor: e.preview }}></div>
                          <span className="text-xs font-medium">{e.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-400">Quantidade de Slides</label>
                    <select 
                      value={numSlides} 
                      onChange={(e) => setNumSlides(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm focus:ring-violet-500"
                    >
                      <option value="5">5 Slides (Rápido)</option>
                      <option value="8">8 Slides (Padrão)</option>
                      <option value="12">12 Slides (Detalhado)</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: GENERATING */}
          {step === "generating" && (
            <motion.div 
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-8"
            >
              <div className="relative">
                <div className="h-32 w-32 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin mx-auto"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-violet-500 animate-pulse" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">A criar a tua obra-prima...</h2>
                <p className="text-slate-400 animate-pulse">A IA está a escrever o conteúdo e a desenhar os slides.</p>
              </div>
              <div className="max-w-xs mx-auto bg-white/5 rounded-full h-2 overflow-hidden">
                <motion.div 
                  className="h-full bg-violet-500"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 15 }}
                />
              </div>
            </motion.div>
          )}

          {/* STEP 4: EDITOR/VIEWER */}
          {step === "editor" && slides.length > 0 && (
            <motion.div 
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-full flex flex-col gap-6"
            >
              {/* Main Slide Area */}
              <div className="flex-1 flex items-center justify-center relative group">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  disabled={currentSlide === 0}
                  onClick={() => setCurrentSlide(p => p - 1)}
                  className="absolute left-0 z-20 h-12 w-12 rounded-full bg-black/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>

                <div 
                  ref={slideRef}
                  className="w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 relative flex"
                  style={{ backgroundColor: theme.bg }}
                >
                  {/* Slide Content Layouts */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentSlide}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.02 }}
                      className="w-full h-full flex"
                    >
                      {/* Image Section (for split layout) */}
                      {slides[currentSlide].imageUrl && slides[currentSlide].layout !== "full" && (
                        <div className="w-1/2 h-full relative overflow-hidden">
                          <img 
                            src={slides[currentSlide].imageUrl} 
                            className="w-full h-full object-cover"
                            alt=""
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[inherit]" style={{ backgroundImage: `linear-gradient(to right, transparent, ${theme.bg})` }}></div>
                        </div>
                      )}

                      {/* Text Section */}
                      <div className={`flex flex-col justify-center p-12 md:p-20 ${slides[currentSlide].imageUrl && slides[currentSlide].layout !== "full" ? "w-1/2" : "w-full text-center items-center"}`}>
                        <motion.h2 
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="text-3xl md:text-5xl font-black mb-8 leading-tight" 
                          style={{ color: theme.accent }}
                        >
                          {slides[currentSlide].titulo}
                        </motion.h2>
                        <motion.div 
                          initial={{ y: 20, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.4 }}
                          className="text-lg md:text-xl leading-relaxed space-y-4" 
                          style={{ color: theme.text }}
                        >
                          {slides[currentSlide].conteudo.split("\\n").map((line, idx) => (
                            <p key={idx} className="flex items-start gap-3">
                              {line.trim() && <span className="mt-2 h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: theme.accent }}></span>}
                              {line}
                            </p>
                          ))}
                        </motion.div>
                      </div>

                      {/* Full Background Image Layout */}
                      {slides[currentSlide].imageUrl && slides[currentSlide].layout === "full" && (
                        <div className="absolute inset-0 -z-10">
                          <img src={slides[currentSlide].imageUrl} className="w-full h-full object-cover opacity-30" alt="" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Slide Progress Bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/5">
                    <motion.div 
                      className="h-full bg-violet-500"
                      initial={false}
                      animate={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
                    />
                  </div>
                </div>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  disabled={currentSlide === slides.length - 1}
                  onClick={() => setCurrentSlide(p => p + 1)}
                  className="absolute right-0 z-20 h-12 w-12 rounded-full bg-black/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </div>

              {/* Thumbnail Strip */}
              <div className="flex gap-3 overflow-x-auto pb-4 px-2 scrollbar-thin scrollbar-thumb-white/10">
                {slides.map((slide, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`flex-shrink-0 w-40 aspect-video rounded-xl border-2 transition-all overflow-hidden relative group ${i === currentSlide ? "border-violet-500 scale-105 shadow-lg shadow-violet-500/20" : "border-white/5 opacity-50 hover:opacity-100"}`}
                  >
                    {slide.imageUrl ? (
                      <img src={slide.imageUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                        <Type className="h-4 w-4 text-white/20" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-2">
                      <span className="text-[10px] font-bold text-center line-clamp-2">{slide.titulo}</span>
                    </div>
                    <div className="absolute bottom-1 right-2 text-[8px] font-mono text-white/40">{i + 1}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Status */}
      {generatingImages && step === "editor" && (
        <div className="fixed bottom-6 right-6 bg-zinc-900/90 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center gap-3 shadow-2xl z-50">
          <Loader2 className="h-4 w-4 text-violet-500 animate-spin" />
          <span className="text-xs font-medium text-slate-300">A gerar imagens em alta definição...</span>
        </div>
      )}
    </div>
  );
}
