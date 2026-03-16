import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp, ChevronDown, Trash2, Plus, Loader2, RefreshCw,
  Check, GripVertical, Play, ChevronRight, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

export interface Subtema {
  id: string;
  titulo: string;
  tipo: "introducao" | "capitulo" | "conclusao" | "bibliografia";
  descricao?: string;
  conteudo: string;
  status: "pendente" | "gerando" | "gerado";
}

interface SubtemasEditorProps {
  subtemas: Subtema[];
  onUpdate: (subtemas: Subtema[]) => void;
  onGenerateOne: (id: string) => Promise<void>;
  onGenerateAll: () => Promise<void>;
  onCompile: () => void;
  loading: boolean;
  etapa: string;
}

const tipoLabels: Record<string, string> = {
  introducao: "Introdução",
  capitulo: "Capítulo",
  conclusao: "Conclusão",
  bibliografia: "Bibliografia",
};

const tipoColors: Record<string, string> = {
  introducao: "bg-accent text-accent-foreground",
  capitulo: "bg-secondary/10 text-secondary",
  conclusao: "bg-accent text-accent-foreground",
  bibliografia: "bg-muted text-muted-foreground",
};

const SubtemasEditor: React.FC<SubtemasEditorProps> = ({
  subtemas, onUpdate, onGenerateOne, onGenerateAll, onCompile, loading, etapa,
}) => {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const allGenerated = subtemas.every((s) => s.status === "gerado");
  const anyGenerated = subtemas.some((s) => s.status === "gerado");

  const toggleOpen = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= subtemas.length) return;
    const updated = [...subtemas];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onUpdate(updated);
  };

  const updateTitle = (id: string, titulo: string) => {
    onUpdate(subtemas.map((s) => (s.id === id ? { ...s, titulo } : s)));
  };

  const removeItem = (id: string) => {
    if (subtemas.length <= 3) {
      toast.error("O trabalho precisa de pelo menos 3 secções");
      return;
    }
    onUpdate(subtemas.filter((s) => s.id !== id));
  };

  const addSubtema = () => {
    const lastCapitulo = [...subtemas].reverse().find((s) => s.tipo === "capitulo");
    const insertIndex = lastCapitulo
      ? subtemas.indexOf(lastCapitulo) + 1
      : subtemas.length - 2;

    const newSubtema: Subtema = {
      id: crypto.randomUUID(),
      titulo: "Novo Subtema",
      tipo: "capitulo",
      conteudo: "",
      status: "pendente",
    };

    const updated = [...subtemas];
    updated.splice(Math.max(0, insertIndex), 0, newSubtema);
    onUpdate(updated);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-semibold text-base">Estrutura do Trabalho</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Edite, reordene ou adicione subtemas antes de gerar o conteúdo
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent text-accent-foreground">
            {subtemas.filter((s) => s.status === "gerado").length}/{subtemas.length} gerados
          </span>
        </div>

        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {subtemas.map((subtema, index) => (
              <motion.div
                key={subtema.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Collapsible
                  open={openItems.has(subtema.id)}
                  onOpenChange={() => toggleOpen(subtema.id)}
                >
                  <div className={`border rounded-xl overflow-hidden transition-colors ${
                    subtema.status === "gerado" ? "border-primary/30 bg-primary/5" :
                    subtema.status === "gerando" ? "border-secondary/50 bg-secondary/5" :
                    "border-border"
                  }`}>
                    {/* Header */}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveItem(index, -1)}
                          disabled={index === 0 || loading}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(index, 1)}
                          disabled={index === subtemas.length - 1 || loading}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${tipoColors[subtema.tipo]}`}>
                        {tipoLabels[subtema.tipo]}
                      </span>

                      <Input
                        value={subtema.titulo}
                        onChange={(e) => updateTitle(subtema.id, e.target.value)}
                        disabled={loading}
                        className="h-8 text-sm font-medium border-0 bg-transparent shadow-none focus-visible:ring-1 flex-1"
                      />

                      <div className="flex items-center gap-1">
                        {subtema.status === "gerado" && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                        {subtema.status === "gerando" && (
                          <Loader2 className="h-4 w-4 animate-spin text-secondary" />
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={loading}
                          onClick={() => onGenerateOne(subtema.id)}
                          title={subtema.status === "gerado" ? "Regenerar" : "Gerar"}
                        >
                          {subtema.status === "gerado" ? (
                            <RefreshCw className="h-3.5 w-3.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          disabled={loading}
                          onClick={() => removeItem(subtema.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>

                        {subtema.status === "gerado" && subtema.conteudo && (
                          <CollapsibleTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${openItems.has(subtema.id) ? "rotate-90" : ""}`} />
                            </Button>
                          </CollapsibleTrigger>
                        )}
                      </div>
                    </div>

                    {/* Preview content */}
                    <CollapsibleContent>
                      {subtema.conteudo && (
                        <div className="px-4 pb-3 border-t border-border/50">
                          <div className="mt-3 text-sm text-muted-foreground leading-relaxed max-h-40 overflow-y-auto prose prose-sm">
                            {subtema.conteudo.substring(0, 500)}
                            {subtema.conteudo.length > 500 && "..."}
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Add subtema button */}
        <button
          type="button"
          onClick={addSubtema}
          disabled={loading}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Adicionar Subtema
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-11"
          disabled={loading}
          onClick={onGenerateAll}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {etapa || "A gerar..."}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Play className="h-4 w-4" /> Gerar Todos
            </span>
          )}
        </Button>

        <Button
          type="button"
          className="flex-1 h-11"
          disabled={!allGenerated || loading}
          onClick={onCompile}
        >
          <FileText className="h-4 w-4 mr-2" /> Compilar Trabalho
        </Button>
      </div>

      {!allGenerated && anyGenerated && (
        <p className="text-xs text-muted-foreground text-center">
          Gere todos os subtemas para poder compilar o trabalho completo
        </p>
      )}
    </div>
  );
};

export default SubtemasEditor;
