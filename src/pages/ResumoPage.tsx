import { useState, useRef } from "react";
import { useUsageTracker } from "@/hooks/use-usage-tracker";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { motion } from "framer-motion";
import { BookOpen, Upload, Camera, X, Image, Loader2, FileText, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { extractTextFromImages, extractTextFromDocument, generateWithGroq, reviewWithOpenRouter, generateImageUrl, imagePrompts, prompts, DOKA_SYSTEM_PROMPT } from "@/lib/ai-service";
import { saveProject } from "@/lib/save-project";
import ResumoPreview from "@/components/resumo/ResumoPreview";

const tiposResumo = [
  "Resumo por Tópicos",
  "Resumo Esquemático",
  "Mapa Mental",
  "Flashcards",
  "Resumo Narrativo",
  "Resumo com Mnemônicos",
  "Quadro Comparativo",
  "Linha do Tempo",
];

const disciplinas = [
  "Português", "Matemática", "História", "Geografia", "Biologia",
  "Física", "Química", "Inglês", "Educação Moral e Cívica",
  "Filosofia", "Sociologia", "Educação Visual", "Informática",
  "Economia", "Direito", "Contabilidade", "Gestão",
];

const ResumoPage = () => {
  const { checkLimit, logUsage } = useUsageTracker();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [tipoResumo, setTipoResumo] = useLocalStorage("doka_resumo_tipo", "Resumo por Tópicos");
  const [disciplina, setDisciplina] = useLocalStorage("doka_resumo_disciplina", "");
  const [fonte, setFonte] = useState<"upload" | "camera" | "documento">("upload");
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState("");
  const [resultado, setResultado] = useLocalStorage<string | null>("doka_resumo_resultado", null);
  const [imagemResumo, setImagemResumo] = useLocalStorage<string | null>("doka_resumo_imagem", null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const addFiles = (newFiles: File[]) => {
    const total = [...files, ...newFiles].slice(0, 100);
    setFiles(total);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, 100));
    toast.success(`${newFiles.length} foto(s) adicionada(s) — total: ${total.length}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newDocs = Array.from(e.target.files);
      setDocFiles((prev) => [...prev, ...newDocs].slice(0, 10));
      toast.success(`${newDocs.length} documento(s) adicionado(s)`);
      e.target.value = "";
    }
  };

  const removeDoc = (index: number) => {
    setDocFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (files.length === 0) {
      toast.error("Seleccione pelo menos uma foto do caderno");
      return;
    }
    
    const canProceed = await checkLimit("resumo");
    if (!canProceed) return;
    
    setLoading(true);
    setResultado(null);
    setImagemResumo(null);

    try {
      // Pipeline: Gemini → Groq → OpenRouter → Pollinations
      setEtapa("A extrair texto das fotos (Gemini Vision)...");
      const extractedTexts = await extractTextFromImages(files);
      const combinedText = extractedTexts.filter(Boolean).join("\n\n---\n\n");

      if (!combinedText.trim()) {
        toast.error("Não foi possível extrair texto das fotos. Tente novamente com fotos mais nítidas.");
        setLoading(false);
        return;
      }

      setEtapa("A gerar resumo inteligente...");
      const prompt = prompts.resumo(combinedText, disciplina || "Geral", tipoResumo);
      const resumo = await generateWithGroq(DOKA_SYSTEM_PROMPT, prompt);

      setEtapa("A revisar conteúdo...");
      const revisado = await reviewWithOpenRouter(resumo);
      setResultado(revisado);

      setEtapa("A gerar ilustração...");
      const imgUrl = generateImageUrl(imagePrompts.resumo(disciplina || "educação angolana"));
      setImagemResumo(imgUrl);

      toast.success("Resumo gerado com sucesso!");
      logUsage("resumo");

      saveProject("resumo", `${tipoResumo} - ${disciplina || "Geral"}`, {
        resultado: revisado,
        tipoResumo,
        disciplina,
        imagemResumo: imgUrl,
      });
    } catch (err) {
      console.error("Erro ao gerar resumo:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao gerar resumo. Verifique as chaves API.");
    } finally {
      setLoading(false);
      setEtapa("");
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold">Resumo do Caderno</h1>
            <p className="text-sm text-muted-foreground">Tire fotos do caderno e receba um resumo inteligente</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-6"
      >
        {/* Configurações */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Configurações
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Resumo</Label>
              <Select value={tipoResumo} onValueChange={setTipoResumo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tiposResumo.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Select value={disciplina} onValueChange={setDisciplina}>
                <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                <SelectContent>
                  {disciplinas.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Fotos */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Fotos do Caderno (até 100)
          </h2>

          <Tabs value={fonte} onValueChange={(v) => setFonte(v as "upload" | "camera")}>
            <TabsList className="w-full">
              <TabsTrigger value="upload" className="flex-1 gap-2">
                <Upload className="h-4 w-4" /> Galeria
              </TabsTrigger>
              <TabsTrigger value="camera" className="flex-1 gap-2">
                <Camera className="h-4 w-4" /> Câmera
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {fonte === "upload" ? (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-accent/20">
              <Image className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground font-medium">Clique ou arraste as fotos</span>
              <span className="text-xs text-muted-foreground mt-1">JPG, PNG — máx. 100 fotos</span>
              <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
            </label>
          ) : (
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-accent/20"
            >
              <Camera className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground font-medium">Toque para abrir a câmera</span>
              <span className="text-xs text-muted-foreground mt-1">Tire fotos directamente do caderno</span>
              <input ref={cameraRef} type="file" className="hidden" accept="image/*" capture onChange={handleFileChange} />
            </button>
          )}

          {previews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                  <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-foreground/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3 text-background" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {files.length > 0 && (
            <p className="text-xs text-muted-foreground">{files.length} de 100 fotos</p>
          )}
        </div>

        <Button className="w-full h-12 text-base" onClick={handleGenerate} disabled={loading || files.length === 0}>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {etapa || "A processar..."}
            </span>
          ) : "Gerar Resumo"}
        </Button>
      </motion.div>

      {resultado && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-4"
        >
          {imagemResumo && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
              <img src={imagemResumo} alt="Ilustração do resumo" className="w-full h-40 object-cover" />
            </div>
          )}
          <ResumoPreview resultado={resultado} tipoResumo={tipoResumo} disciplina={disciplina} />
        </motion.div>
      )}
    </div>
  );
};

export default ResumoPage;
