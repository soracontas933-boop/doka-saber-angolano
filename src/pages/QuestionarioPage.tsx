import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { HelpCircle, Upload, Download, Camera, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const tiposPerguntas = [
  { value: "multipla", label: "Selecção múltipla" },
  { value: "vf", label: "Verdadeiro / Falso" },
  { value: "curta", label: "Resposta curta" },
  { value: "completar", label: "Completar espaços" },
  { value: "correspondencia", label: "Correspondência" },
  { value: "dissertativa", label: "Dissertativa" },
  { value: "ordenacao", label: "Ordenação" },
];

const disciplinas = [
  "Português", "Matemática", "História", "Geografia", "Biologia",
  "Física", "Química", "Inglês", "Educação Moral e Cívica",
  "Filosofia", "Sociologia", "Educação Visual", "Informática",
  "Economia", "Direito", "Contabilidade", "Gestão",
];

const QuestionarioPage = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [fonte, setFonte] = useState<"upload" | "camera">("upload");
  const [numPerguntas, setNumPerguntas] = useState("10");
  const [tipo, setTipo] = useState("multipla");
  const [disciplina, setDisciplina] = useState("");
  const [dificuldade, setDificuldade] = useState("medio");
  const [comGabarito, setComGabarito] = useState("sim");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

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
    setTimeout(() => {
      setResultado("O questionário será gerado aqui após a integração com a IA estar configurada.");
      setLoading(false);
      toast.success("Questionário gerado com sucesso!");
    }, 2000);
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
              <input
                ref={uploadRef}
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileChange}
              />
            </label>
          ) : (
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-accent/20"
            >
              <Camera className="h-7 w-7 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground font-medium">Abrir câmera</span>
              <input
                ref={cameraRef}
                type="file"
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
              />
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
            <Select value={disciplina} onValueChange={setDisciplina}>
              <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
              <SelectContent>
                {disciplinas.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
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
          {loading ? "A gerar questionário..." : "Gerar Questionário"}
        </Button>
      </motion.form>

      {resultado && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Questionário</h2>
            <Button size="sm"><Download className="h-4 w-4 mr-1" /> Exportar PDF</Button>
          </div>
          <p className="text-sm text-card-foreground">{resultado}</p>
        </motion.div>
      )}
    </div>
  );
};

export default QuestionarioPage;
