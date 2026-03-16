import { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const disciplinas = [
  "Português", "Matemática", "História", "Geografia", "Biologia",
  "Física", "Química", "Inglês", "Educação Moral e Cívica",
  "Filosofia", "Sociologia", "Educação Visual", "Informática",
];

const classes = Array.from({ length: 13 }, (_, i) => `${i + 1}ª Classe`);

const PlanoAulaPage = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [tipoPlano, setTipoPlano] = useState("vertical");
  const [disciplina, setDisciplina] = useState("");
  const [classe, setClasse] = useState("");
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
      setResultado("O plano de aula será gerado aqui após a integração com a IA estar configurada.");
      setLoading(false);
      toast.success("Plano de aula gerado com sucesso!");
    }, 2000);
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
        className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4"
      >
        <div className="space-y-2">
          <Label>Fotos do Conteúdo (manual, livro ou caderno)</Label>
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-accent/30">
            <Upload className="h-7 w-7 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground font-medium">
              {files.length > 0 ? `${files.length} foto(s)` : "Carregar fotos"}
            </span>
            <input type="file" className="hidden" accept="image/*" multiple onChange={handleFiles} />
          </label>
        </div>

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

        <Button type="submit" className="w-full" disabled={loading || files.length === 0}>
          {loading ? "A gerar plano..." : "Gerar Plano de Aula"}
        </Button>
      </motion.form>

      {resultado && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 bg-card border border-border rounded-2xl p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Plano de Aula</h2>
            <Button size="sm"><Download className="h-4 w-4 mr-1" /> Exportar PDF</Button>
          </div>
          <p className="text-sm text-card-foreground">{resultado}</p>
        </motion.div>
      )}
    </div>
  );
};

export default PlanoAulaPage;
