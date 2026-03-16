import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const disciplinas = [
  "Português", "Matemática", "História", "Geografia", "Biologia",
  "Física", "Química", "Inglês", "Educação Moral e Cívica",
  "Filosofia", "Sociologia", "Educação Visual", "Informática",
];

const classes = Array.from({ length: 13 }, (_, i) => `${i + 1}ª Classe`);

const TrabalhoPage = () => {
  const [titulo, setTitulo] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [classe, setClasse] = useState("");
  const [paginas, setPaginas] = useState("10");
  const [tipo, setTipo] = useState("individual");
  const [nivel, setNivel] = useState("medio");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: integrate AI
    setTimeout(() => {
      setResultado("O trabalho será gerado aqui após a integração com a IA estar configurada.");
      setLoading(false);
      toast.success("Trabalho gerado com sucesso!");
    }, 2000);
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <FileText className="h-5 w-5 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold">Gerar Trabalho Escolar</h1>
            <p className="text-sm text-muted-foreground">Preencha os dados e gere o seu trabalho completo</p>
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
          <Label htmlFor="titulo">Título do Trabalho</Label>
          <Input id="titulo" placeholder="Ex: A importância da água" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Disciplina</Label>
            <Select value={disciplina} onValueChange={setDisciplina} required>
              <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
              <SelectContent>
                {disciplinas.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Classe</Label>
            <Select value={classe} onValueChange={setClasse} required>
              <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="paginas">Páginas (5-25)</Label>
            <Input id="paginas" type="number" min={5} max={25} value={paginas} onChange={(e) => setPaginas(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="grupo">Grupo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nível de Detalhe</Label>
            <Select value={nivel} onValueChange={setNivel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="basico">Básico</SelectItem>
                <SelectItem value="medio">Médio</SelectItem>
                <SelectItem value="avancado">Avançado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "A gerar trabalho..." : "Gerar Trabalho"}
        </Button>
      </motion.form>

      {resultado && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-card border border-border rounded-2xl p-6 shadow-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Resultado</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(resultado); toast.success("Copiado!"); }}>
                <Copy className="h-4 w-4 mr-1" /> Copiar
              </Button>
              <Button size="sm">
                <Download className="h-4 w-4 mr-1" /> Exportar PDF
              </Button>
            </div>
          </div>
          <div className="prose prose-sm max-w-none text-card-foreground">
            <p>{resultado}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TrabalhoPage;
