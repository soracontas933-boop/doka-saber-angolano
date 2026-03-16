import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ResumoPage = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).slice(0, 100);
      setFiles(selected);
      toast.success(`${selected.length} foto(s) seleccionada(s)`);
    }
  };

  const handleGenerate = async () => {
    if (files.length === 0) {
      toast.error("Seleccione pelo menos uma foto do caderno");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setResultado("O resumo será gerado aqui após a integração com a IA estar configurada.");
      setLoading(false);
      toast.success("Resumo gerado com sucesso!");
    }, 2000);
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
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
        className="bg-card border border-border rounded-2xl p-6 shadow-card"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Fotos do Caderno (até 100)</Label>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-accent/30">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground font-medium">
                {files.length > 0 ? `${files.length} foto(s) seleccionada(s)` : "Clique ou arraste as fotos"}
              </span>
              <span className="text-xs text-muted-foreground mt-1">JPG, PNG — máx. 100 fotos</span>
              <input type="file" className="hidden" accept="image/*" multiple onChange={handleFiles} />
            </label>
          </div>

          <Button className="w-full" onClick={handleGenerate} disabled={loading || files.length === 0}>
            {loading ? "A gerar resumo..." : "Gerar Resumo"}
          </Button>
        </div>
      </motion.div>

      {resultado && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-card border border-border rounded-2xl p-6 shadow-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Resumo</h2>
            <Button size="sm"><Download className="h-4 w-4 mr-1" /> Exportar PDF</Button>
          </div>
          <p className="text-sm text-card-foreground">{resultado}</p>
        </motion.div>
      )}
    </div>
  );
};

export default ResumoPage;
