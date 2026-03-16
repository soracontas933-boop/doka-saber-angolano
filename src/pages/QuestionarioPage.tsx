import { useState } from "react";
import { motion } from "framer-motion";
import { HelpCircle, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const QuestionarioPage = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [numPerguntas, setNumPerguntas] = useState("10");
  const [tipo, setTipo] = useState("multipla");
  const [dificuldade, setDificuldade] = useState("medio");
  const [comGabarito, setComGabarito] = useState("sim");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles(selected);
      toast.success(`${selected.length} foto(s) seleccionada(s)`);
    }
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
        className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4"
      >
        <div className="space-y-2">
          <Label>Fotos do Conteúdo</Label>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-accent/30">
            <Upload className="h-7 w-7 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground font-medium">
              {files.length > 0 ? `${files.length} foto(s)` : "Carregar fotos"}
            </span>
            <input type="file" className="hidden" accept="image/*" multiple onChange={handleFiles} />
          </label>
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

        <Button type="submit" className="w-full" disabled={loading || files.length === 0}>
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
