import { useState, useRef, useEffect } from "react";
import { useUsageTracker } from "@/hooks/use-usage-tracker";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { motion } from "framer-motion";
import { ClipboardList, Upload, Camera, X, Image, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { extractTextFromImages, generateWithGroq, reviewWithOpenRouter, DOKA_SYSTEM_PROMPT, prompts } from "@/lib/ai-service";
import { saveProject } from "@/lib/save-project";
import PlanoHorizontalForm, { type PlanoHorizontalData } from "@/components/plano-aula/PlanoHorizontalForm";
import PlanoHorizontalResult from "@/components/plano-aula/PlanoHorizontalResult";
import { Input } from "@/components/ui/input";

const disciplinas = [
  "Português", "Matemática", "História", "Geografia", "Biologia",
  "Física", "Química", "Inglês", "Educação Moral e Cívica",
  "Filosofia", "Sociologia", "Educação Visual", "Informática",
  "Economia", "Direito", "Contabilidade", "Gestão",
];

const classes = [...Array.from({ length: 13 }, (_, i) => `${i + 1}ª Classe`), "Ensino Superior"];

const defaultHorizontalData: PlanoHorizontalData = {
  nome: "",
  escola: "",
  classe: "",
  disciplina: "",
  unidade: "",
  sumario: "",
  perfilEntrada: "",
  perfilSaida: "",
  data: "",
  periodo: "",
  tempo: "45 min",
  duracao: "45 min",
  anoLectivo: "2025-2026",
  objectivoGeral: "",
  objectivosEspecificos: "",
};

interface FaseAula {
  tempo: string;
  fase: string;
  conteudo: string;
  metodos: string;
  actividades: string;
  estrategia: string;
  meios: string;
  avaliacao: string;
  obs: string;
}

const PlanoAulaPage = () => {
  const { checkLimit, logUsage } = useUsageTracker();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [fonte, setFonte] = useState<"upload" | "camera">("upload");
  const [tipoPlano, setTipoPlano] = useLocalStorage("doka_plano_tipo", "horizontal");
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState("");
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const pendingFile = (window as any)._pendingScannerFile;
    if (pendingFile) {
      addFiles([pendingFile]);
      delete (window as any)._pendingScannerFile;
      // If coming from scanner, we default to vertical mode which is more direct for photo content
      setTipoPlano("vertical");
    }
  }, []);

  // Vertical state
  const [disciplinaV, setDisciplinaV] = useLocalStorage("doka_plano_disciplina", "");
  const [classeV, setClasseV] = useLocalStorage("doka_plano_classe", "");
  const [resultadoV, setResultadoV] = useLocalStorage<string | null>("doka_plano_resultado", null);

  // Horizontal state
  const [hData, setHData] = useLocalStorage<PlanoHorizontalData>("doka_plano_h_dados", defaultHorizontalData);
  const [hFases, setHFases] = useLocalStorage<FaseAula[] | null>("doka_plano_h_fases", null);

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

  const handleGenerateHorizontal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hData.sumario && files.length === 0) {
      toast.error("Preencha o sumário ou adicione fotos do conteúdo");
      return;
    }
    setLoading(true);
    setHFases(null);

    try {
      let extraContent = "";
      if (files.length > 0) {
        setEtapa("A extrair texto das fotos...");
        const texts = await extractTextFromImages(files);
        extraContent = texts.filter(Boolean).join("\n\n");
      }

      setEtapa("A gerar plano horizontal...");
      const prompt = prompts.planoHorizontal({
        disciplina: hData.disciplina || "Geral",
        classe: hData.classe || "8ª Classe",
        unidade: hData.unidade,
        sumario: hData.sumario + (extraContent ? `\n\nConteúdo extraído das fotos:\n${extraContent}` : ""),
        perfilEntrada: hData.perfilEntrada,
        perfilSaida: hData.perfilSaida,
        objectivoGeral: hData.objectivoGeral,
        objectivosEspecificos: hData.objectivosEspecificos,
        tempo: hData.tempo,
      });

      const raw = await generateWithGroq(DOKA_SYSTEM_PROMPT, prompt);

      // Parse JSON from response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Resposta da IA não contém JSON válido");

      const parsed = JSON.parse(jsonMatch[0]);
      const fases: FaseAula[] = parsed.fases;
      setHFases(fases);

      // IMPORTANTE: Validar e debitar créditos ANTES de salvar/exibir
      const logSuccess = await logUsage("plano_aula");
      if (!logSuccess) {
        toast.error("Não foi possível debitar os créditos. O plano não foi salvo.");
        return;
      }
      toast.success("Plano de aula horizontal gerado e créditos debitados com sucesso!");

      saveProject("plano-aula", `Plano Horizontal - ${hData.disciplina || "Geral"} - ${hData.classe}`, {
        tipo: "horizontal",
        dados: hData,
        fases,
      });
    } catch (err) {
      console.error("Erro:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao gerar plano");
    } finally {
      setLoading(false);
      setEtapa("");
    }
  };

  const handleGenerateVertical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error("Seleccione pelo menos uma foto do conteúdo");
      return;
    }
    
    const canProceed = await checkLimit("plano_aula");
    if (!canProceed) return;
    
    setLoading(true);
    setResultadoV(null);

    try {
      setEtapa("A extrair texto das fotos...");
      const texts = await extractTextFromImages(files);
      const combined = texts.filter(Boolean).join("\n\n---\n\n");
      if (!combined.trim()) {
        toast.error("Não foi possível extrair texto das fotos.");
        setLoading(false);
        return;
      }

      setEtapa("A gerar plano de aula...");
      const prompt = prompts.planoVertical(disciplinaV || "Geral", classeV || "10ª Classe", combined);
      const plano = await generateWithGroq(DOKA_SYSTEM_PROMPT, prompt);

      setEtapa("A complementar estratégias...");
      const revisado = await reviewWithOpenRouter(plano);
      setResultadoV(revisado);
      // IMPORTANTE: Validar e debitar créditos ANTES de salvar/exibir
      const logSuccess = await logUsage("plano_aula");
      if (!logSuccess) {
        toast.error("Não foi possível debitar os créditos. O plano não foi salvo.");
        return;
      }
      toast.success("Plano de aula gerado e créditos debitados com sucesso!");

      saveProject("plano-aula", `Plano Vertical - ${disciplinaV || "Geral"} - ${classeV}`, {
        tipo: "vertical",
        resultado: revisado,
        disciplina: disciplinaV,
        classe: classeV,
      });
    } catch (err) {
      console.error("Erro:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao gerar plano");
    } finally {
      setLoading(false);
      setEtapa("");
    }
  };

  const isHorizontal = tipoPlano === "horizontal";

  return (
    <div className="p-3 sm:p-6 md:p-10 max-w-4xl mx-auto min-h-screen">
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
        onSubmit={isHorizontal ? handleGenerateHorizontal : handleGenerateVertical}
        className="space-y-6"
      >
        {/* Tipo de Plano */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Tipo de Plano
          </h2>
          <Tabs value={tipoPlano} onValueChange={setTipoPlano}>
            <TabsList className="w-full">
              <TabsTrigger value="horizontal" className="flex-1">Horizontal (INIDE)</TabsTrigger>
              <TabsTrigger value="vertical" className="flex-1">Vertical (aula)</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isHorizontal ? (
          <PlanoHorizontalForm data={hData} onChange={setHData} />
        ) : (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
            <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Configurações
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Disciplina</Label>
                <Select value={disciplinaV} onValueChange={setDisciplinaV}>
                  <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                  <SelectContent>
                    {disciplinas.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Classe</Label>
                <Select value={classeV} onValueChange={setClasseV}>
                  <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Fotos */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Fotos do Conteúdo {isHorizontal ? "(opcional)" : "(obrigatório)"}
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

        <Button
          type="submit"
          className="w-full h-12 text-base"
          disabled={loading || (!isHorizontal && files.length === 0)}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {etapa || "A processar..."}
            </span>
          ) : "Gerar Plano de Aula"}
        </Button>
      </motion.form>

      {/* Horizontal Result */}
      {isHorizontal && hFases && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <PlanoHorizontalResult dados={hData} fases={hFases} />
        </motion.div>
      )}

      {/* Vertical Result */}
      {!isHorizontal && resultadoV && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
            <h2 className="font-display font-semibold mb-4">Plano de Aula</h2>
            <div className="prose prose-sm max-w-none text-card-foreground whitespace-pre-wrap">
              {resultadoV}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default PlanoAulaPage;
