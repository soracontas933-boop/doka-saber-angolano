import { useState, useRef } from "react";
import { useUsageTracker } from "@/hooks/use-usage-tracker";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { motion } from "framer-motion";
import { HelpCircle, Upload, Download, Camera, X, Image, Loader2 } from "lucide-react";
import QuestionarioPreview from "@/components/questionario/QuestionarioPreview";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { extractTextFromImages, generateWithGroq, reviewWithOpenRouter, prompts, DOKA_SYSTEM_PROMPT } from "@/lib/ai-service";
import { saveProject } from "@/lib/save-project";

const tiposPerguntas = [
  { value: "multipla_escolha", label: "Selecção múltipla" },
  { value: "verdadeiro_falso", label: "Verdadeiro / Falso" },
  { value: "resposta_curta", label: "Resposta curta" },
  { value: "completar_espacos", label: "Completar espaços" },
  { value: "correspondencia", label: "Correspondência" },
  { value: "dissertativa", label: "Dissertativa" },
  { value: "ordenacao", label: "Ordenação" },
];

const disciplinas = [
  "Português", "Matemática", "História", "Geografia", "Biologia",
  "Física", "Química", "Inglês", "Educação Moral e Cívica",
  "Filosofia", "Sociologia", "Educação Visual", "Informática",
  "Economia", "Direito", "Contabilidade", "Gestão",
  "__manual__",
];

const QuestionarioPage = () => {
  const { checkLimit, logUsage } = useUsageTracker();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [fonte, setFonte] = useState<"upload" | "camera">("upload");
  const [numPerguntas, setNumPerguntas] = useLocalStorage("doka_quest_numPerguntas", "10");
  const [tipo, setTipo] = useLocalStorage("doka_quest_tipo", "multipla_escolha");
  const [disciplina, setDisciplina] = useLocalStorage("doka_quest_disciplina", "");
  const [disciplinaManual, setDisciplinaManual] = useLocalStorage("doka_quest_disciplina_manual", "");
  const [dificuldade, setDificuldade] = useLocalStorage("doka_quest_dificuldade", "medio");
  const [comGabarito, setComGabarito] = useLocalStorage("doka_quest_gabarito", "sim");
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState("");
  const [resultado, setResultado] = useLocalStorage<string | null>("doka_quest_resultado", null);
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
    
    const canProceed = await checkLimit("questionario");
    if (!canProceed) return;
    
    setLoading(true);
    setResultado(null);

    try {
      setEtapa("A extrair texto das fotos (Gemini Vision)...");
      const extractedTexts = await extractTextFromImages(files);
      const combinedText = extractedTexts.filter(Boolean).join("\n\n---\n\n");

      if (!combinedText.trim()) {
        toast.error("Não foi possível extrair texto das fotos.");
        setLoading(false);
        return;
      }

      setEtapa("A gerar questionário...");
      const nomeDisciplina = disciplina === "__manual__" ? disciplinaManual : disciplina;
      const tipoLabel = tiposPerguntas.find((t) => t.value === tipo)?.label || tipo;
      const prompt = prompts.questionario(
        combinedText,
        parseInt(numPerguntas),
        nomeDisciplina || "Geral",
        dificuldade,
        tipoLabel
      );
      const questionario = await generateWithGroq(DOKA_SYSTEM_PROMPT, prompt);

      setEtapa("A melhorar perguntas...");
      const revisado = await reviewWithOpenRouter(questionario);
      setResultado(revisado);

      toast.success("Questionário gerado com sucesso!");
      logUsage("questionario");

      const nomeDisciplinaSave = disciplina === "__manual__" ? disciplinaManual : disciplina;
      saveProject("questionario", `Questionário - ${nomeDisciplinaSave || "Geral"}`, {
        resultado: revisado,
        tipo,
        disciplina: nomeDisciplinaSave,
        numPerguntas,
        dificuldade,
        comGabarito,
      });
    } catch (err) {
      console.error("Erro ao gerar questionário:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao gerar questionário.");
    } finally {
      setLoading(false);
      setEtapa("");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <HelpCircle className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold">Questionário Interativo</h1>
            <p className="text-sm text-muted-foreground">Gere questionários a partir de fotos do conteúdo</p>
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
            Fotos do Conteúdo
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

          <div className="space-y-2">
            <Label>Disciplina</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={disciplina} onValueChange={(v) => { setDisciplina(v); if (v !== "__manual__") setDisciplinaManual(""); }}>
                <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                <SelectContent>
                  {disciplinas.filter(d => d !== "__manual__").map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  <SelectItem value="__manual__">✏️ Outra (digitar)</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Ou digite aqui"
                value={disciplinaManual}
                onChange={(e) => {
                  setDisciplinaManual(e.target.value);
                  if (e.target.value) setDisciplina("__manual__");
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nº de Perguntas</Label>
              <Input type="number" min={5} max={50} value={numPerguntas} onChange={(e) => setNumPerguntas(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tiposPerguntas.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dificuldade</Label>
              <Select value={dificuldade} onValueChange={setDificuldade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="facil">Fácil</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="dificil">Difícil</SelectItem>
                  <SelectItem value="misto">Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Gabarito</Label>
              <Select value={comGabarito} onValueChange={setComGabarito}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Com gabarito</SelectItem>
                  <SelectItem value="nao">Sem gabarito</SelectItem>
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
          ) : "Gerar Questionário"}
        </Button>
      </motion.form>

      {resultado && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 bg-card border border-border rounded-2xl p-6 shadow-card">
          <QuestionarioPreview
            resultado={resultado}
            tipo={tipo}
            disciplina={disciplina === "__manual__" ? disciplinaManual : disciplina}
          />
        </motion.div>
      )}
    </div>
  );
};

export default QuestionarioPage;
