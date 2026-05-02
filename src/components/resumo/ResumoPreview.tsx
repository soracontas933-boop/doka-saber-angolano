import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown, FileText, Copy, Type, Palette, LayoutGrid } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { exportResumoPDF, exportResumoWord, exportResumoVisualPDF } from "@/lib/resumo-export";
import {
  sanitizeResumo,
  parseMapaMental,
  parseFlashcards,
  parseLinhaTempo,
  parseQuadroComparativo,
} from "@/lib/resumo-parsers";
import MapaMentalVisual from "./visuals/MapaMentalVisual";
import FlashcardsVisual from "./visuals/FlashcardsVisual";
import LinhaTempoVisual from "./visuals/LinhaTempoVisual";
import QuadroComparativoVisual from "./visuals/QuadroComparativoVisual";
import TopicosVisual, { TopicosStyle, TopicoSection } from "./visuals/TopicosVisual";
import A4Sheet from "./A4Sheet";

interface ResumoPreviewProps {
  resultado: string;
  tipoResumo: string;
  disciplina: string;
}

/**
 * Limpa marcadores estranhos da IA (%%, ##, ***, ===, ___, etc.) preservando
 * o conteúdo real e a hierarquia (# / ## / - / *).
 */
function cleanArtifacts(text: string): string {
  return text
    // Remove "%%" e "===" e "___"
    .replace(/%%+/g, "")
    .replace(/={3,}/g, "")
    .replace(/_{3,}/g, "")
    // Remove "***" decorativo (mas mantém **bold** intacto)
    .replace(/(?<!\*)\*{3,}(?!\*)/g, "")
    // Remove "##" soltos no meio das linhas (mantém ## no início para títulos)
    .replace(/(?<!^)(?<!\n)#{2,}/g, "")
    // Remove sequências tipo "##- " ou "## **"
    .replace(/^#{2,}\s*[-*]\s*/gm, "## ")
    // Remove caracteres de controle estranhos
    .replace(/[•◦▪▫]{2,}/g, "")
    .replace(/^\s*[-•*]\s*[-•*]\s*/gm, "- ")
    .trim();
}

function parseResumoSections(text: string): { title: string; sections: TopicoSection[] } {
  const lines = text.split("\n").map((l) => l.trim());
  let title = "";
  const sections: TopicoSection[] = [];
  let current: TopicoSection | null = null;

  for (const raw of lines) {
    if (!raw) continue;
    const line = raw;

    // Title: # Algo
    if (/^#\s+/.test(line) && !title) {
      title = line.replace(/^#\s+/, "").replace(/\*\*/g, "").trim();
      continue;
    }

    // Section heading: ## Algo  ou  ### Algo  ou  **Algo**
    if (/^#{2,3}\s+/.test(line)) {
      if (current) sections.push(current);
      current = {
        heading: line.replace(/^#{2,3}\s+/, "").replace(/\*\*/g, "").trim(),
        items: [],
      };
      continue;
    }
    if (/^\*\*[^*]+\*\*\s*:?$/.test(line)) {
      if (current) sections.push(current);
      const heading = line.replace(/\*\*/g, "").replace(/:$/, "").trim();
      if (!title) {
        title = heading;
        continue;
      }
      current = { heading, items: [] };
      continue;
    }

    // Numbered heading: "1. Tema importante" (linha curta sem ponto final, considera heading)
    const numMatch = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (numMatch && numMatch[2].length < 80 && !numMatch[2].endsWith(".") && !current) {
      current = { heading: numMatch[2].replace(/\*\*/g, "").trim(), items: [] };
      continue;
    }

    // Bullets / itens
    if (/^[-*•]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      const item = line
        .replace(/^[-*•]\s+/, "")
        .replace(/^\d+[.)]\s+/, "")
        .trim();
      if (!current) current = { heading: "Conteúdo", items: [] };
      if (item) current.items.push(item);
      continue;
    }

    // Texto solto → adicionado como item ao bloco atual
    if (current) {
      current.items.push(line);
    } else {
      current = { heading: title || "Introdução", items: [line] };
    }
  }
  if (current) sections.push(current);

  // Remove secções vazias
  const filtered = sections.filter((s) => s.heading || s.items.length);
  return { title: title || "Resumo", sections: filtered };
}

const TIPOS_TEXTUAIS = ["Resumo por Tópicos", "Resumo Esquemático", "Resumo Narrativo", "Resumo com Mnemônicos"];

const STYLE_OPTIONS: { value: TopicosStyle; label: string }[] = [
  { value: "step-cards", label: "Step Cards" },
  { value: "timeline-blocks", label: "Timeline Blocks" },
  { value: "process-indicators", label: "Process Indicators" },
  { value: "infographic-panels", label: "Infographic Panels" },
  { value: "topic-containers", label: "Topic Containers" },
  { value: "learning-modules", label: "Learning Modules" },
  { value: "flow-cards", label: "Flow Cards" },
  { value: "smart-content", label: "Smart Content" },
  { value: "bento-cards", label: "Bento Cards" },
  { value: "glassmorphism", label: "Glassmorphism" },
  { value: "gradient-tiles", label: "Gradient Tiles" },
  { value: "dashboard-widgets", label: "Dashboard Widgets" },
  { value: "story-blocks", label: "Story Blocks" },
  { value: "numbered-blocks", label: "Numbered Blocks" },
  { value: "ribbon-labels", label: "Ribbon Labels" },
  { value: "highlight-boxes", label: "Highlight Boxes" },
  { value: "milestone-cards", label: "Milestone Cards" },
  { value: "bento-grid", label: "Bento Grid" },
  { value: "glassmorphism-cards", label: "Glassmorphism" },
  { value: "modern-timeline", label: "Modern Timeline" },
  { value: "interactive-nodes", label: "Interactive Nodes" },
];

const PALETTE_OPTIONS = [
  { value: "azul", label: "Azul" },
  { value: "verde", label: "Verde" },
  { value: "roxo", label: "Roxo" },
  { value: "laranja", label: "Laranja" },
  { value: "cinza", label: "Cinza" },
] as const;

const ResumoPreview: React.FC<ResumoPreviewProps> = ({ resultado, tipoResumo, disciplina }) => {
  const cleaned = React.useMemo(() => cleanArtifacts(sanitizeResumo(resultado)), [resultado]);
  const { title, sections } = React.useMemo(() => parseResumoSections(cleaned), [cleaned]);
  const visualRef = React.useRef<HTMLDivElement>(null);

  // Tamanho da letra: 1..50 → 0.55x..2.2x
  const [fontLevel, setFontLevel] = React.useState<number>(25);
  const fontScale = 0.55 + (fontLevel - 1) * ((2.2 - 0.55) / 49);
  const a4FontPt = Math.max(6, Math.round(11 * fontScale * 10) / 10);

  // Estilo visual e paleta para resumos textuais
  const [topicosStyle, setTopicosStyle] = React.useState<TopicosStyle>("step-cards");
  const [palette, setPalette] = React.useState<typeof PALETTE_OPTIONS[number]["value"]>("azul");

  const isTextual = TIPOS_TEXTUAIS.includes(tipoResumo);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleaned);
    toast.success("Copiado!");
  };

  const handleExportPDF = () => {
    if (visualRef.current) {
      return exportResumoVisualPDF(visualRef.current, tipoResumo, disciplina, title || tipoResumo);
    }
    return exportResumoPDF(cleaned, tipoResumo, disciplina, title);
  };

  const renderVisual = () => {
    switch (tipoResumo) {
      case "Mapa Mental": {
        const data = parseMapaMental(cleaned);
        if (data.branches.length === 0) return null;
        return (
          <A4Sheet orientation="landscape">
            <MapaMentalVisual
              central={data.central}
              branches={data.branches}
              fillA4
              fontScale={fontScale}
            />
          </A4Sheet>
        );
      }
      case "Flashcards": {
        const cards = parseFlashcards(cleaned);
        if (cards.length === 0) return null;
        return <FlashcardsVisual cards={cards} fontScale={fontScale} />;
      }
      case "Linha do Tempo": {
        const events = parseLinhaTempo(cleaned);
        if (events.length === 0) return null;
        return <LinhaTempoVisual events={events} fontScale={fontScale} />;
      }
      case "Quadro Comparativo": {
        const data = parseQuadroComparativo(cleaned);
        if (!data) return null;
        return <QuadroComparativoVisual data={data} fontScale={fontScale} />;
      }
      default:
        // Tipos textuais → renderiza com estilo escolhido em A4 portrait
        if (isTextual && sections.length > 0) {
          return (
            <A4Sheet orientation="portrait">
              <TopicosVisual
                title={title}
                disciplina={disciplina}
                sections={sections}
                style={topicosStyle}
                fontScale={fontScale}
                palette={palette}
              />
            </A4Sheet>
          );
        }
        return null;
    }
  };

  const visual = renderVisual();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display font-semibold text-base">Resumo Gerado</h2>
        <div className="flex gap-2 flex-wrap items-center">
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-1" /> Copiar
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button size="sm" onClick={() => exportResumoWord(cleaned, tipoResumo, disciplina, title)}>
            <FileText className="h-4 w-4 mr-1" /> Word
          </Button>
        </div>
      </div>

      {/* Controlos de personalização */}
      <div className="space-y-3 p-3 rounded-xl bg-muted/40 border border-border/60">
        {/* Tamanho da letra */}
        <div className="flex items-center gap-3">
          <Type className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-[120px]">
            <Slider
              min={1}
              max={50}
              step={1}
              value={[fontLevel]}
              onValueChange={(v) => setFontLevel(v[0])}
            />
          </div>
          <span className="text-xs font-semibold text-foreground tabular-nums w-20 text-right">
            Letra {fontLevel}/50
          </span>
        </div>

        {/* Estilo visual + paleta (apenas para resumos textuais) */}
        {isTextual && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={topicosStyle} onValueChange={(v) => setTopicosStyle(v as TopicosStyle)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Estilo visual" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {STYLE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={palette} onValueChange={(v) => setPalette(v as any)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Paleta" />
                </SelectTrigger>
                <SelectContent>
                  {PALETTE_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Visual principal */}
      {visual && (
        <div ref={visualRef} className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                {tipoResumo}
              </div>
              <h3 className="font-display font-bold text-base text-foreground leading-tight">{title || tipoResumo}</h3>
            </div>
            {disciplina && (
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                {disciplina}
              </span>
            )}
          </div>
          {visual}
        </div>
      )}

      {/* Fallback textual A4 — só quando NÃO há visual rico */}
      {!visual && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-border">
          <div
            className="resumo-a4-preview"
            style={{
              fontFamily: "'Times New Roman', serif",
              color: "#000",
              backgroundColor: "#fff",
              padding: "48px 56px",
              minHeight: "700px",
              fontSize: `${a4FontPt}pt`,
              lineHeight: "1.7",
              position: "relative",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "28px" }}>
              <h1 style={{ fontSize: `${(a4FontPt * 18) / 11}pt`, fontWeight: "bold", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>
                {title || tipoResumo}
              </h1>
              {disciplina && (
                <p style={{ fontSize: `${a4FontPt}pt`, color: "#444", marginBottom: "4px" }}>Disciplina: {disciplina}</p>
              )}
              <p style={{ fontSize: `${(a4FontPt * 10) / 11}pt`, color: "#666", fontStyle: "italic" }}>{tipoResumo}</p>
              <div style={{ borderBottom: "2px solid #000", width: "100%", marginTop: "14px" }} />
            </div>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'Times New Roman', serif", fontSize: `${a4FontPt}pt` }}>
              {cleaned}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumoPreview;
