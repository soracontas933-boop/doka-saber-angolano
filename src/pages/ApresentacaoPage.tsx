import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Presentation, Download, Loader2, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { generateWithAI, DELLE_SYSTEM_PROMPT, generateImageAI, generateImageUrl } from "@/lib/ai-service";
import { useUsageTracker } from "@/hooks/use-usage-tracker";
import jsPDF from "jspdf";

interface Slide {
  titulo: string;
  conteudo: string;
  imageUrl?: string;
}

const CLASSES = ["7ª Classe", "8ª Classe", "9ª Classe", "10ª Classe", "11ª Classe", "12ª Classe", "13ª Classe", "Universitário"];

const ESTILOS = [
  { value: "academico", label: "Académico" },
  { value: "moderno", label: "Moderno & Visual" },
  { value: "minimalista", label: "Minimalista" },
];

const SLIDE_COLORS: Record<string, { bg: string; accent: string; text: string }> = {
  academico: { bg: "#1a1f36", accent: "#3b82f6", text: "#f1f5f9" },
  moderno: { bg: "#0f172a", accent: "#8b5cf6", text: "#f8fafc" },
  minimalista: { bg: "#ffffff", accent: "#1e293b", text: "#1e293b" },
};

export default function ApresentacaoPage() {
  const navigate = useNavigate();
  const { checkLimit, logUsage } = useUsageTracker();
  const [tema, setTema] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [classe, setClasse] = useState("");
  const [numSlides, setNumSlides] = useState("8");
  const [estilo, setEstilo] = useState("academico");
  const [loading, setLoading] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [generatingImages, setGeneratingImages] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    if (!tema.trim() || !disciplina.trim() || !classe) {
      toast.error("Preenche todos os campos obrigatórios.");
      return;
    }

    const allowed = await checkLimit("apresentacao" as any);
    if (!allowed) return;

    setLoading(true);
    setSlides([]);

    try {
      const prompt = `Gera uma apresentação de slides sobre "${tema}" para a disciplina de ${disciplina}, ${classe}.
Número de slides: ${numSlides}. Estilo: ${estilo}.

Retorna APENAS JSON válido (sem markdown, sem backticks):
{
  "slides": [
    {
      "titulo": "Título do slide",
      "conteudo": "Conteúdo em tópicos com bullet points (usar \\n para quebras de linha). Máximo 5-6 linhas por slide.",
      "image_prompt": "Descrição curta em inglês para gerar uma imagem contextual para este slide (educational, clean, flat design)"
    }
  ]
}

O primeiro slide deve ser a capa (título + disciplina + classe). O último deve ser referências/agradecimento.
Conteúdo deve ser educativo, adequado ao nível ${classe} de Angola, em Português.`;

      const result = await generateWithAI(DELLE_SYSTEM_PROMPT, prompt, 4000, 0.7);
      
      let parsed: any;
      try {
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(jsonMatch?.[0] || result.content);
      } catch {
        toast.error("Erro ao processar resposta da IA. Tenta novamente.");
        return;
      }

      const rawSlides: Slide[] = (parsed.slides || []).map((s: any) => ({
        titulo: s.titulo || "",
        conteudo: s.conteudo || "",
        imageUrl: undefined,
      }));

      setSlides(rawSlides);
      setCurrentSlide(0);
      await logUsage("apresentacao" as any, result.service_used, result.tokens_used);

      // Generate images in background
      setGeneratingImages(true);
      const imagePrompts = (parsed.slides || []).map((s: any) => s.image_prompt || "");
      
      for (let i = 0; i < rawSlides.length; i++) {
        if (!imagePrompts[i]) continue;
        try {
          const imgResult = await generateImageAI(imagePrompts[i], 800, 450);
          setSlides(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], imageUrl: imgResult.image_url };
            return updated;
          });
        } catch {
          // Use pollinations fallback
          const fallbackUrl = generateImageUrl(imagePrompts[i], 800, 450);
          setSlides(prev => {
            const updated = [...prev];
            updated[i] = { ...updated[i], imageUrl: fallbackUrl };
            return updated;
          });
        }
      }
      setGeneratingImages(false);

      toast.success("Apresentação gerada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar apresentação.");
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    if (slides.length === 0) return;
    toast.info("A exportar PDF...");

    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [960, 540] });
    const colors = SLIDE_COLORS[estilo] || SLIDE_COLORS.academico;

    for (let i = 0; i < slides.length; i++) {
      if (i > 0) pdf.addPage();
      const slide = slides[i];

      // Background
      pdf.setFillColor(colors.bg);
      pdf.rect(0, 0, 960, 540, "F");

      // Accent bar
      pdf.setFillColor(colors.accent);
      pdf.rect(0, 0, 8, 540, "F");

      // Title
      pdf.setTextColor(colors.accent);
      pdf.setFontSize(28);
      pdf.setFont("helvetica", "bold");
      pdf.text(slide.titulo, 40, 60, { maxWidth: 880 });

      // Content
      pdf.setTextColor(colors.text);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "normal");
      const lines = slide.conteudo.split("\\n").join("\n").split("\n");
      let y = 110;
      for (const line of lines) {
        if (y > 480) break;
        pdf.text(line, 40, y, { maxWidth: 560 });
        y += 24;
      }

      // Slide number
      pdf.setFontSize(12);
      pdf.setTextColor("#666");
      pdf.text(`${i + 1} / ${slides.length}`, 900, 520);
    }

    pdf.save(`apresentacao-${tema.substring(0, 30).replace(/\s+/g, "-")}.pdf`);
    toast.success("PDF exportado!");
  };

  const colors = SLIDE_COLORS[estilo] || SLIDE_COLORS.academico;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Presentation className="h-5 w-5 text-primary" />
        <h1 className="font-semibold text-foreground">Gerador de Apresentações</h1>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Form */}
        {slides.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label>Tema da Apresentação *</Label>
                  <Input value={tema} onChange={e => setTema(e.target.value)} placeholder="Ex: Revolução Industrial" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Disciplina *</Label>
                    <Input value={disciplina} onChange={e => setDisciplina(e.target.value)} placeholder="Ex: História" />
                  </div>
                  <div className="space-y-2">
                    <Label>Classe *</Label>
                    <Select value={classe} onValueChange={setClasse}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Número de Slides</Label>
                    <Select value={numSlides} onValueChange={setNumSlides}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["5", "8", "10", "12", "15"].map(n => <SelectItem key={n} value={n}>{n} slides</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estilo Visual</Label>
                    <Select value={estilo} onValueChange={setEstilo}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ESTILOS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleGenerate} disabled={loading} className="w-full gap-2">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> A gerar apresentação...</> : <><Presentation className="h-4 w-4" /> Gerar Apresentação</>}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Slide Preview */}
        {slides.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => { setSlides([]); setCurrentSlide(0); }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Nova Apresentação
              </Button>
              <div className="flex items-center gap-2">
                {generatingImages && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <ImageIcon className="h-3 w-3 animate-pulse" /> A gerar imagens...
                  </span>
                )}
                <Button size="sm" onClick={exportPDF} className="gap-1">
                  <Download className="h-4 w-4" /> PDF
                </Button>
              </div>
            </div>

            {/* Slide Display */}
            <div
              ref={slideRef}
              className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-border"
              style={{ backgroundColor: colors.bg }}
            >
              {/* Accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-2" style={{ backgroundColor: colors.accent }} />

              {/* Image */}
              {slides[currentSlide]?.imageUrl && (
                <div className="absolute right-0 top-0 bottom-0 w-2/5 opacity-20">
                  <img
                    src={slides[currentSlide].imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}

              {/* Content */}
              <div className="relative z-10 p-8 md:p-12 h-full flex flex-col justify-center max-w-[65%]">
                <h2 className="text-xl md:text-3xl font-bold mb-4 leading-tight" style={{ color: colors.accent }}>
                  {slides[currentSlide]?.titulo}
                </h2>
                <div className="text-sm md:text-base leading-relaxed whitespace-pre-line" style={{ color: colors.text }}>
                  {slides[currentSlide]?.conteudo?.replace(/\\n/g, "\n")}
                </div>
              </div>

              {/* Slide number */}
              <div className="absolute bottom-4 right-6 text-xs opacity-50" style={{ color: colors.text }}>
                {currentSlide + 1} / {slides.length}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="icon" disabled={currentSlide === 0} onClick={() => setCurrentSlide(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex gap-1.5">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${i === currentSlide ? "bg-primary scale-125" : "bg-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <Button variant="outline" size="icon" disabled={currentSlide === slides.length - 1} onClick={() => setCurrentSlide(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Thumbnails */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {slides.map((slide, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={`flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden border-2 transition-all ${i === currentSlide ? "border-primary shadow-lg" : "border-transparent opacity-60"}`}
                  style={{ backgroundColor: colors.bg }}
                >
                  <div className="p-2 h-full flex flex-col justify-center">
                    <p className="text-[7px] font-bold truncate" style={{ color: colors.accent }}>{slide.titulo}</p>
                    <p className="text-[5px] line-clamp-2 mt-0.5" style={{ color: colors.text }}>{slide.conteudo?.substring(0, 60)}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
