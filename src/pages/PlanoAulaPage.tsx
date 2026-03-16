import { useState, useRef } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { motion } from "framer-motion";
import { ClipboardList, Upload, Download, Camera, X, Image, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { extractTextFromImages, generateWithGroq, reviewWithOpenRouter, generateImageUrl, imagePrompts, prompts, DOKA_SYSTEM_PROMPT } from "@/lib/ai-service";
import { saveProject } from "@/lib/save-project";

const disciplinas = [
  "Português", "Matemática", "História", "Geografia", "Biologia",
  "Física", "Química", "Inglês", "Educação Moral e Cívica",
  "Filosofia", "Sociologia", "Educação Visual", "Informática",
  "Economia", "Direito", "Contabilidade", "Gestão",
];

const classes = [...Array.from({ length: 13 }, (_, i) => `${i + 1}ª Classe`), "Ensino Superior"];

const PlanoAulaPage = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [fonte, setFonte] = useState<"upload" | "camera">("upload");
  const [tipoPlano, setTipoPlano] = useLocalStorage("doka_plano_tipo", "vertical");
  const [disciplina, setDisciplina] = useLocalStorage("doka_plano_disciplina", "");
  const [classe, setClasse] = useLocalStorage("doka_plano_classe", "");
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState("");
  const [resultado, setResultado] = useLocalStorage<string | null>("doka_plano_resultado", null);
  const [imagemPlano, setImagemPlano] = useLocalStorage<string | null>("doka_plano_imagem", null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const addFiles = (newFiles: File[]) => {
    const total = [...files, ...newFiles].slice(0, 50);
    setFiles(total);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, 50));
    toast.success(`${newFiles.length} foto(s) adicionada(s)`);
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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error("Seleccione pelo menos uma foto do conteúdo");
      return;
    }
    setLoading(true);
    setResultado(null);
    setImagemPlano(null);

    try {
      setEtapa("A extrair texto das fotos (Gemini Vision)...");
      const extractedTexts = await extractTextFromImages(files);
      const combinedText = extractedTexts.filter(Boolean).join("\n\n---\n\n");

      if (!combinedText.trim()) {
        toast.error("Não foi possível extrair texto das fotos.");
        setLoading(false);
        return;
      }

      setEtapa("A gerar plano de aula...");
      const prompt = tipoPlano === "vertical"
        ? prompts.planoVertical(disciplina || "Geral", classe || "10ª Classe", combinedText)
        : prompts.planoHorizontal(disciplina || "Geral", classe || "10ª Classe");

      const plano = await generateWithGroq(DOKA_SYSTEM_PROMPT, prompt);

      setEtapa("A complementar estratégias...");
      const revisado = await reviewWithOpenRouter(plano);
      setResultado(revisado);

      setEtapa("A gerar ilustração...");
      const imgUrl = generateImageUrl(imagePrompts.planoAula());
      setImagemPlano(imgUrl);

      toast.success("Plano de aula gerado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar plano:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao gerar plano de aula.");
    } finally {
      setLoading(false);
      setEtapa("");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold">Plano de Aula</h1>
            <p className="text-sm text-muted-foreground">Crie planos de aula no formato do INIDE</p>
          </div>
        </div>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleGenerate}
        className="space-y-6"
      >
        {/* Fotos */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Fotos do Conteúdo (manual, livro ou caderno)
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
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-accent/20">
              <Image className="h-7 w-7 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground font-medium">Carregar fotos da galeria</span>
              <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
            </label>
          ) : (
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-accent/20"
            >
              <Camera className="h-7 w-7 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground font-medium">Abrir câmera</span>
              <input ref={cameraRef} type="file" className="hidden" accept="image/*" capture onChange={handleFileChange} />
            </button>
          )}

          {previews.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
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
        </div>

        {/* Configurações */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Configurações
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Plano</Label>
              <Select value={tipoPlano} onValueChange={setTipoPlano}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="horizontal">Horizontal (anual)</SelectItem>
                  <SelectItem value="vertical">Vertical (aula)</SelectItem>
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
            <div className="space-y-2">
              <Label>Classe</Label>
              <Select value={classe} onValueChange={setClasse}>
                <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full h-12 text-base" disabled={loading || files.length === 0}>
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {etapa || "A processar..."}
            </span>
          ) : "Gerar Plano de Aula"}
        </Button>
      </motion.form>

      {resultado && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
          {imagemPlano && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
              <img src={imagemPlano} alt="Ilustração do plano" className="w-full h-40 object-cover" />
            </div>
          )}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold">Plano de Aula</h2>
              <Button size="sm" onClick={() => { navigator.clipboard.writeText(resultado); toast.success("Copiado!"); }}>
                <Download className="h-4 w-4 mr-1" /> Copiar
              </Button>
            </div>
            <div className="prose prose-sm max-w-none text-card-foreground whitespace-pre-wrap">
              {resultado}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PlanoAulaPage;
