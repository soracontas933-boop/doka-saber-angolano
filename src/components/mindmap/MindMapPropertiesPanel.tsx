import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Trash2, Sparkles, Plus, Palette as PaletteIcon, Type } from "lucide-react";
import {
  MindMapData,
  MindNode,
  PALETTE_PRESETS,
  getColorForNode,
} from "@/lib/mindmap/types";

interface Props {
  data: MindMapData;
  selectedId: string | null;
  onChange: (next: MindMapData) => void;
  onAddChild: () => void;
  onDelete: () => void;
  onAIExpand: () => void;
  generatingAI: boolean;
}

const COLOR_SWATCHES = [
  "#1E9DF1", "#A855F7", "#10B981", "#F59E0B",
  "#EF4444", "#EC4899", "#14B8A6", "#6366F1",
  "#0EA5E9", "#84CC16", "#F97316", "#0F172A",
];

const FONTS = [
  { name: "SF Pro / Open Sans", value: "'SF Pro Display', 'Open Sans', system-ui, sans-serif" },
  { name: "Serif clássica", value: "'Times New Roman', Georgia, serif" },
  { name: "Geométrica", value: "'Inter', system-ui, sans-serif" },
];

const BG_OPTIONS: { value: MindMapData["background"]; label: string }[] = [
  { value: "blueprint", label: "Blueprint" },
  { value: "white", label: "Branco" },
  { value: "paper", label: "Papel" },
  { value: "dark", label: "Escuro" },
];

export const MindMapPropertiesPanel: React.FC<Props> = ({
  data,
  selectedId,
  onChange,
  onAddChild,
  onDelete,
  onAIExpand,
  generatingAI,
}) => {
  const node = data.nodes.find((n) => n.id === selectedId) || null;

  const updateNode = (patch: Partial<MindNode>) => {
    if (!node) return;
    onChange({
      ...data,
      nodes: data.nodes.map((n) => (n.id === node.id ? { ...n, ...patch } : n)),
    });
  };

  return (
    <div className="space-y-4">
      {/* Nó selecionado */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Nó selecionado
        </h3>

        {!node ? (
          <p className="text-xs text-muted-foreground">
            Clique num nó no mapa para o editar. Duplo clique para alterar o texto.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Texto</Label>
              <Input
                value={node.label}
                onChange={(e) => updateNode({ label: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tamanho</Label>
              <div className="flex gap-1">
                {(["small", "medium", "large"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateNode({ size: s })}
                    className={`flex-1 h-8 rounded-md border text-[11px] font-semibold transition-colors ${
                      node.size === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {s === "small" ? "Pequeno" : s === "medium" ? "Médio" : "Grande"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Cor do nó</Label>
              <div className="grid grid-cols-6 gap-1.5">
                {COLOR_SWATCHES.map((c) => {
                  const active = (node.color || getColorForNode(data, node)) === c;
                  return (
                    <button
                      key={c}
                      onClick={() => updateNode({ color: c })}
                      className={`h-7 rounded-md border-2 transition-transform ${
                        active ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ background: c }}
                      title={c}
                    />
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={onAddChild}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Sub-nó
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDelete}
                disabled={node.parentId === null}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Apagar
              </Button>
            </div>

            <Button
              size="sm"
              className="w-full"
              onClick={onAIExpand}
              disabled={generatingAI}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              {generatingAI ? "A gerar..." : "Gerar sub-itens com IA"}
            </Button>
          </>
        )}
      </div>

      {/* Estilo global */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Type className="h-3.5 w-3.5" /> Tamanho da Letra
            </h3>
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1">
                <Slider
                  min={1}
                  max={50}
                  step={1}
                  value={[data.fontLevel || 25]}
                  onValueChange={(v) => onChange({ ...data, fontLevel: v[0] })}
                />
              </div>
              <span className="text-xs font-bold w-12 text-right tabular-nums">{data.fontLevel || 25}</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <PaletteIcon className="h-3.5 w-3.5" /> Paleta global
            </h3>
        <div className="space-y-2">
          {PALETTE_PRESETS.map((p) => {
            const active = JSON.stringify(p.colors) === JSON.stringify(data.palette);
            return (
              <button
                key={p.name}
                onClick={() => onChange({ ...data, palette: p.colors })}
                className={`w-full flex items-center gap-2 p-2 rounded-lg border text-xs ${
                  active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <span className="font-semibold text-foreground flex-1 text-left">{p.name}</span>
                <div className="flex gap-0.5">
                  {p.colors.slice(0, 6).map((c) => (
                    <span key={c} className="w-3 h-3 rounded-sm" style={{ background: c }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5 pt-1">
          <Label className="text-xs flex items-center gap-1.5">
            <Type className="h-3.5 w-3.5" /> Tipo de letra
          </Label>
          <select
            value={data.fontFamily}
            onChange={(e) => onChange({ ...data, fontFamily: e.target.value })}
            className="w-full bg-background border border-input rounded-md h-9 px-2 text-xs"
          >
            {FONTS.map((f) => (
              <option key={f.name} value={f.value}>{f.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Fundo</Label>
          <div className="grid grid-cols-2 gap-1.5">
            {BG_OPTIONS.map((b) => (
              <button
                key={b.value}
                onClick={() => onChange({ ...data, background: b.value })}
                className={`h-8 rounded-md border text-[11px] font-semibold ${
                  data.background === b.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MindMapPropertiesPanel;
