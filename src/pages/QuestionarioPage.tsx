import { useState, useRef, useEffect } from "react";
import { useUsageTracker } from "@/hooks/use-usage-tracker";
import CreditCostBadge from "@/components/CreditCostBadge";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { motion } from "framer-motion";
import { HelpCircle, Upload, Camera, X, Image, Loader2, FileText, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { extractTextFromImages, extractTextFromDocument, generateWithGroq, reviewWithOpenRouter, prompts, DOKA_SYSTEM_PROMPT } from "@/lib/ai-service";
import { saveProject } from "@/lib/save-project";
import { parseQuestionarioContent } from "@/lib/questionario-parser";
import QuestionarioPreview from "@/components/questionario/QuestionarioPreview";

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
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [fonte, setFonte] = useState<"upload" | "camera" | "documento">("upload");
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

  useEffect(() => {
    const pendingFile = (window as any)._pendingScannerFile;
    if (pendingFile) {
      addFiles([pendingFile]);
      delete (window as any)._pendingScannerFile;
    }
  }, []);

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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasImages = files.length > 0;
    const hasDocs = docFiles.length > 0;

    if (!hasImages && !hasDocs) {
      toast.error("Seleccione fotos ou documentos do conteúdo");
      return;
    }

    const canProceed = await checkLimit("questionario");
    if (!canProceed) return;

    setLoading(true);
    setResultado(null);

    try {
      let combinedText = "";

      if (hasImages) {
        setEtapa("A extrair texto das fotos (Gemini Vision)...");
        const extractedTexts = await extractTextFromImages(files);
        combinedText += extractedTexts.filter(Boolean).join("\n\n---\n\n");
      }

      if (hasDocs) {
        for (let i = 0; i < docFiles.length; i++) {
          setEtapa(`A extrair texto do documento ${i + 1}/${docFiles.length}...`);
          try {
            const docText = await extractTextFromDocument(docFiles[i]);
            if (docText.trim()) {
              combinedText += (combinedText ? "\n\n---\n\n" : "") + docText;
            }
          } catch (err) {
            console.error(`Erro ao extrair documento ${docFiles[i].name}:`, err);
            toast.error(`Erro ao ler ${docFiles[i].name}`);
          }
        }
      }

      if (!combinedText.trim()) {
        toast.error("Não foi possível extrair texto do conteúdo.");
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

      console.log("[Questionario] AI raw output (first 500):", questionario?.substring(0, 500));

      // Validate parsed result - skip review for structured JSON to avoid breaking the format
      const parsed = parseQuestionarioContent(questionario);
      console.log("[Questionario] Parsed questions:", parsed.questions.length);

      let finalQuestionario = questionario;

      // Only review if we couldn't parse questions (i.e. it's not structured JSON)
      if (parsed.questions.length === 0) {
        setEtapa("A melhorar perguntas...");
        try {
          const revisado = await reviewWithOpenRouter(questionario);
          const parsedRevisado = parseQuestionarioContent(revisado);
          if (parsedRevisado.questions.length > 0) {
            finalQuestionario = revisado;
          }
        } catch {
          // keep original
        }
      }

      setResultado(finalQuestionario);

      toast.success("Questionário gerado com sucesso!");
      logUsage("questionario");

      const nomeDisciplinaSave = disciplina === "__manual__" ? disciplinaManual : disciplina;
      saveProject("questionario", `Questionário - ${nomeDisciplinaSave || "Geral"}`, {
        resultado: finalQuestionario,
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
    <div className="p-3 sm:p-6 md:p-10 max-w-3xl mx-auto md:bg-background bg-background min-h-screen">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
            <HelpCircle className="h-4 w-4 md:h-5 md:w-5 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-base md:text-xl font-display font-bold text-foreground">Questionário Interativo</h1>
            <p className="text-[11px] md:text-sm text-muted-foreground">Gere questionários a partir de fotos do conteúdo</p>
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
        <div className="bg-card md:bg-card border border-border/50 md:border-border rounded-2xl p-3 sm:p-6 shadow-sm md:shadow-card space-y-3">
          <h2 className="font-display font-semibold text-[10px] md:text-sm text-muted-foreground uppercase tracking-wider">
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
            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border md:border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/30 md:bg-accent/20">
              <Image className="h-7 w-7 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground font-medium">Carregar fotos da galeria</span>
              <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
            </label>
          ) : (
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border md:border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/30 md:bg-accent/20"
            >
              <Camera className="h-7 w-7 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground font-medium">Abrir câmera</span>
              <input ref={cameraRef} type="file" className="hidden" accept="image/*" capture onChange={handleFileChange} />
            </button>
          )}

          {previews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border md:border-border">
                  <img src={src} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-card/90 md:bg-foreground/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3 text-background" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Configurações */}
        <div className="bg-card md:bg-card border border-border/50 md:border-border rounded-2xl p-3 sm:p-6 shadow-sm md:shadow-card space-y-3">
          <h2 className="font-display font-semibold text-[10px] md:text-sm text-muted-foreground uppercase tracking-wider">
            Configurações
          </h2>

          <div className="space-y-1.5">
            <Label className="text-foreground text-xs">Disciplina</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select value={disciplina} onValueChange={(v) => { setDisciplina(v); if (v !== "__manual__") setDisciplinaManual(""); }}>
                <SelectTrigger className="bg-muted md:bg-background border-border md:border-input text-foreground h-10 text-xs"><SelectValue placeholder="Seleccione" /></SelectTrigger>
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
                className="bg-muted md:bg-background border-border md:border-input text-foreground h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Nº de Perguntas</Label>
              <Input type="number" min={5} max={50} value={numPerguntas} onChange={(e) => setNumPerguntas(e.target.value)} className="bg-muted md:bg-background border-border md:border-input text-foreground h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-foreground text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="bg-muted md:bg-background border-border md:border-input text-foreground h-10 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tiposPerguntas.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          ) : (
            <span className="flex items-center gap-2">Gerar Questionário <CreditCostBadge modulo="questionario" /></span>
          )}
        </Button>
      </motion.form>

      {resultado && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-card">
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
