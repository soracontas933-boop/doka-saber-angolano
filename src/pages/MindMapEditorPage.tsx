import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FileDown, Undo2, Redo2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  MindMapData,
  MindNode,
  fromParsedMap,
  makeId,
  nodeRadius,
} from "@/lib/mindmap/types";
import { parseMapaMental } from "@/lib/resumo-parsers";
import MindMapCanvas from "@/components/mindmap/MindMapCanvas";
import MindMapPropertiesPanel from "@/components/mindmap/MindMapPropertiesPanel";
import { exportResumoVisualPDF } from "@/lib/resumo-export";
import { useLocalStorage } from "@/hooks/use-local-storage";

interface LocationState {
  resultado?: string;
  tipoResumo?: string;
  disciplina?: string;
}

const MindMapEditorPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  // Persiste o último mapa para recarga / refresh
  const [stored, setStored] = useLocalStorage<MindMapData | null>(
    "delle_mindmap_current",
    null,
  );

  const initial = useMemo<MindMapData | null>(() => {
    if (state?.resultado) {
      const parsed = parseMapaMental(state.resultado);
      return fromParsedMap(parsed.central, parsed.branches);
    }
    return stored;
  }, [state?.resultado]);

  if (!initial) {
    toast.error("Sem mapa para editar — gere um resumo do tipo 'Mapa Mental' primeiro.");
    return <Navigate to="/resumo" replace />;
  }

  const [data, setData] = useState<MindMapData>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [history, setHistory] = useState<MindMapData[]>([initial]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const disciplina = state?.disciplina || "Geral";

  // Persiste alterações
  useEffect(() => {
    setStored(data);
  }, [data]);

  /* ---------- Histórico ---------- */
  const commit = useCallback(
    (next: MindMapData) => {
      setData(next);
      const trimmed = history.slice(0, historyIdx + 1);
      trimmed.push(next);
      setHistory(trimmed.slice(-50));
      setHistoryIdx(Math.min(trimmed.length - 1, 49));
    },
    [history, historyIdx],
  );

  const undo = () => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1);
      setData(history[historyIdx - 1]);
    }
  };
  const redo = () => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1);
      setData(history[historyIdx + 1]);
    }
  };

  /* ---------- Acções de nós ---------- */
  const addChild = () => {
    if (!selectedId) {
      toast.error("Selecione um nó primeiro.");
      return;
    }
    const parent = data.nodes.find((n) => n.id === selectedId);
    if (!parent) return;
    const angle = Math.random() * Math.PI * 2;
    const r = 140;
    const child: MindNode = {
      id: makeId(),
      label: "Novo nó",
      x: parent.x + Math.cos(angle) * r,
      y: parent.y + Math.sin(angle) * r,
      parentId: parent.id,
      size: parent.parentId === null ? "medium" : "small",
      color: parent.color,
    };
    commit({ ...data, nodes: [...data.nodes, child] });
    setSelectedId(child.id);
  };

  const deleteNode = () => {
    if (!selectedId) return;
    const target = data.nodes.find((n) => n.id === selectedId);
    if (!target || target.parentId === null) {
      toast.error("Não é possível apagar o nó central.");
      return;
    }
    // remove o nó e todos os descendentes
    const toRemove = new Set<string>();
    const stack = [selectedId];
    while (stack.length) {
      const id = stack.pop()!;
      toRemove.add(id);
      data.nodes.filter((n) => n.parentId === id).forEach((c) => stack.push(c.id));
    }
    commit({ ...data, nodes: data.nodes.filter((n) => !toRemove.has(n.id)) });
    setSelectedId(null);
  };

  /* ---------- IA ---------- */
  const aiExpand = async () => {
    if (!selectedId) return;
    const node = data.nodes.find((n) => n.id === selectedId);
    if (!node) return;
    const central = data.nodes.find((n) => n.parentId === null)?.label || "Tema";
    const siblings = data.nodes
      .filter((n) => n.parentId === node.id)
      .map((n) => n.label);

    setGeneratingAI(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke(
        "mind-map-ai",
        {
          body: {
            central,
            nodeLabel: node.label,
            context: siblings,
            mode: "subitems",
            count: 5,
          },
        },
      );
      if (error) throw error;
      const items = (resp?.items || []) as string[];
      if (!items.length) {
        toast.error("A IA não devolveu sugestões. Tente novamente.");
        return;
      }
      // disposição radial à volta do nó
      const baseAngle = Math.random() * Math.PI * 2;
      const newNodes: MindNode[] = items.map((label, i) => {
        const a = baseAngle + (i / items.length) * Math.PI * 1.4 - Math.PI * 0.7;
        const r = 130;
        return {
          id: makeId(),
          label,
          x: node.x + Math.cos(a) * r,
          y: node.y + Math.sin(a) * r,
          parentId: node.id,
          size: "small",
          color: node.color,
        };
      });
      commit({ ...data, nodes: [...data.nodes, ...newNodes] });
      toast.success(`${newNodes.length} sub-itens adicionados pela IA`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Erro ao gerar sub-itens");
    } finally {
      setGeneratingAI(false);
    }
  };

  /* ---------- Export ---------- */
  const handleExport = () => {
    if (!canvasRef.current) return;
    const central = data.nodes.find((n) => n.parentId === null)?.label || "Mapa Mental";
    return exportResumoVisualPDF(canvasRef.current, "Mapa Mental", disciplina, central);
  };

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-[1500px] mx-auto min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3 mb-5"
      >
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/resumo")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div>
            <h1 className="text-base md:text-xl font-display font-bold text-foreground">
              Editor de Mapa Mental
            </h1>
            <p className="text-[11px] md:text-sm text-muted-foreground">
              {disciplina} • arraste, edite (duplo clique), expanda com IA
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={undo} disabled={historyIdx === 0}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={historyIdx >= history.length - 1}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleExport}>
            <FileDown className="h-4 w-4 mr-1" /> Exportar PDF
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <aside className="order-2 lg:order-1">
          <MindMapPropertiesPanel
            data={data}
            selectedId={selectedId}
            onChange={commit}
            onAddChild={addChild}
            onDelete={deleteNode}
            onAIExpand={aiExpand}
            generatingAI={generatingAI}
          />
        </aside>

        <main className="order-1 lg:order-2 space-y-2">
          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
            <Save className="h-3 w-3" /> Pré-visualização A4 — o PDF sai exatamente assim.
          </div>
          <MindMapCanvas
            data={data}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={commit}
            innerRef={canvasRef}
          />
          <p className="text-[10px] text-muted-foreground text-center">
            Dica: clique no nó para selecionar, arraste para mover, duplo clique para editar texto.
          </p>
        </main>
      </div>
    </div>
  );
};

export default MindMapEditorPage;
