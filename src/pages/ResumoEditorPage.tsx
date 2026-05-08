import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, FileDown, FileText, Palette, Type, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  sanitizeResumo,
  parseMapaMental,
  parseFlashcards,
  parseLinhaTempo,
  parseQuadroComparativo,
} from "@/lib/resumo-parsers";
import MapaMentalVisual from "@/components/resumo/visuals/MapaMentalVisual";
import TopicosVisual, { TopicosStyle, TopicoSection } from "@/components/resumo/visuals/TopicosVisual";
import A4Sheet from "@/components/resumo/A4Sheet";
import A4MultiPageSmart from "@/components/resumo/A4MultiPageSmart";
import { exportResumoWord } from "@/lib/resumo-export";
import { exportMultiPagePdf } from "@/lib/multi-page-pdf";
import { setSidebarCollapsed } from "@/hooks/use-sidebar-collapsed";

interface LocationState {
  resultado: string;
  tipoResumo: string;
  disciplina: string;
  numPaginas?: number;
}

const PALETTE_PRESETS = [
  { name: "Azul Delle", primary: "#1E9DF1", accent: "#A855F7" },
  { name: "Esmeralda", primary: "#10B981", accent: "#0EA5E9" },
  { name: "Coral", primary: "#EF4444", accent: "#F59E0B" },
  { name: "Violeta", primary: "#7C3AED", accent: "#EC4899" },
  { name: "Grafite", primary: "#0F172A", accent: "#475569" },
];

const FONT_PRESETS = [
  { name: "SF Pro / Open Sans", value: "'SF Pro Display', 'Open Sans', system-ui, sans-serif" },
  { name: "Serif clássica", value: "'Times New Roman', Georgia, serif" },
  { name: "Geométrica", value: "'Inter', system-ui, sans-serif" },
];

const ResumoEditorPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initial = location.state as LocationState | null;

  if (!initial?.resultado) {
    return <Navigate to="/resumo" replace />;
  }

  // Fecha a sidebar automaticamente ao entrar no editor
  useEffect(() => {
    setSidebarCollapsed(true);
  }, []);

  const [resultado, setResultado] = useState(sanitizeResumo(initial.resultado));
  const [titulo, setTitulo] = useState("");
  const [disciplina, setDisciplina] = useState(initial.disciplina || "");
  const [tipoResumo] = useState(initial.tipoResumo);
  const [palette, setPalette] = useState(PALETTE_PRESETS[0]);
  const [fontFamily, setFontFamily] = useState(FONT_PRESETS[0].value);
  const [fontLevel, setFontLevel] = useState(25);
  const [topicosStyle, setTopicosStyle] = useState<TopicosStyle>("step-cards");
  const [extraPages, setExtraPages] = useState(0);
  // Densidade manual: leve = mais espaço/menos por folha, normal = equilibrado, agressivo = comprime
  type Density = "leve" | "normal" | "agressivo";
  const [density, setDensity] = useState<Density>("normal");
  const densityFactor: Record<Density, number> = { leve: 1.18, normal: 1, agressivo: 0.78 };
  // Páginas alvo definidas pelo utilizador na tela anterior
  const targetPages = Math.max(1, initial.numPaginas || 1);
  // Páginas reais geradas pelo conteúdo (reportadas pelo A4MultiPageSmart)
  const [contentPages, setContentPages] = useState(targetPages);
  // Auto-ajuste do tamanho de letra: se o conteúdo gerar MAIS páginas que o alvo,
  // diminui o tamanho de letra automaticamente para caber. Se gerar menos, mantém
  // (folhas vazias serão preenchidas pelo targetFill no A4MultiPageSmart).
  const autoFontLevel = React.useMemo(() => {
    if (contentPages <= targetPages) return fontLevel;
    // razão de excesso (ex: 5 páginas em 3 alvo = 1.67) → reduz fontLevel proporcional
    const ratio = targetPages / contentPages;
    const adjusted = Math.max(8, Math.round(fontLevel * Math.sqrt(ratio)));
    return adjusted;
  }, [contentPages, targetPages, fontLevel]);
  const fontScale = (0.55 + (autoFontLevel - 1) * ((2.2 - 0.55) / 49)) * densityFactor[density];
  const fs = (px: number) => `${px * fontScale}px`;

  const cleaned = useMemo(() => sanitizeResumo(resultado), [resultado]);

  const detectedTitle = useMemo(() => {
    const m = cleaned.match(/^#\s+(.+)$/m);
    return m ? m[1].replace(/\*\*/g, "").trim() : tipoResumo;
  }, [cleaned, tipoResumo]);

  const finalTitle = titulo || detectedTitle;

  const parseResumoSections = (text: string): TopicoSection[] => {
    const lines = text.split("\n").map((l) => l.trim());
    const sections: TopicoSection[] = [];
    let current: TopicoSection | null = null;
    for (const line of lines) {
      if (!line || line.startsWith("# ")) continue;
      if (/^#{2,3}\s+/.test(line)) {
        if (current) sections.push(current);
        current = { heading: line.replace(/^#{2,3}\s+/, "").replace(/\*\*/g, "").trim(), items: [] };
        continue;
      }
      if (/^[-*•]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
        const item = line.replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, "").trim();
        if (!current) current = { heading: "Conteúdo", items: [] };
        if (item) current.items.push(item);
        continue;
      }
      if (current) current.items.push(line);
      else current = { heading: "Introdução", items: [line] };
    }
    if (current) sections.push(current);
    return sections.filter((s) => s.heading || s.items.length);
  };

  const handleAddPage = () => setExtraPages((p) => p + 1);
  const handleRemovePage = () => setExtraPages((p) => Math.max(0, p - 1));

  // Renderização do conteúdo (sem A4Sheet — A4MultiPage trata da paginação)
  const renderInner = () => {
    switch (tipoResumo) {
      case "Mapa Mental": {
        const data = parseMapaMental(cleaned);
        if (!data.branches.length) return null;
        return (
          <MapaMentalVisual
            central={data.central}
            branches={data.branches}
            fillA4
            fontScale={fontScale}
          />
        );
      }
      case "Flashcards": {
        const cards = parseFlashcards(cleaned);
        if (!cards.length) return null;
        return (
          <div style={{ fontFamily, color: "#0f172a" }}>
            <h2 style={{ textAlign: "center", fontSize: fs(22), fontWeight: 800, color: palette.primary, margin: "0 0 16px" }}>
              {finalTitle}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {cards.map((c, i) => (
                <div
                  key={i}
                  style={{
                    border: `2px solid ${palette.primary}`,
                    borderRadius: 14,
                    padding: 14,
                    background: `linear-gradient(135deg, ${palette.primary}11, ${palette.accent}11)`,
                    breakInside: "avoid",
                  }}
                >
                  <div style={{ fontSize: fs(9), letterSpacing: 1.5, color: palette.primary, fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
                    Cartão {i + 1}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: fs(13), marginBottom: 6 }}>{c.frente}</div>
                  <div style={{ borderTop: `1px dashed ${palette.primary}55`, paddingTop: 6, fontSize: fs(11), color: "#334155" }}>
                    {c.verso}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case "Linha do Tempo": {
        const events = parseLinhaTempo(cleaned);
        if (!events.length) return null;
        return (
          <div style={{ fontFamily, color: "#0f172a" }}>
            <h2 style={{ textAlign: "center", fontSize: fs(22), fontWeight: 800, color: palette.primary, margin: "0 0 16px" }}>
              {finalTitle}
            </h2>
            <div style={{ position: "relative", paddingLeft: 36 }}>
              <div style={{ position: "absolute", left: 12, top: 0, bottom: 0, width: 3, background: `linear-gradient(${palette.primary}, ${palette.accent})`, borderRadius: 4 }} />
              {events.map((e, i) => (
                <div key={i} style={{ position: "relative", marginBottom: 14, breakInside: "avoid" }}>
                  <div style={{ position: "absolute", left: -32, top: 4, width: 18, height: 18, borderRadius: "50%", background: palette.primary, border: "3px solid #fff", boxShadow: `0 0 0 2px ${palette.primary}55` }} />
                  <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 14px" }}>
                    <span style={{ fontSize: fs(10), fontWeight: 700, color: "#fff", background: palette.primary, padding: "2px 8px", borderRadius: 999 }}>{e.data}</span>
                    <div style={{ fontWeight: 700, fontSize: fs(13), marginTop: 4 }}>{e.titulo}</div>
                    {e.descricao && <div style={{ fontSize: fs(11), color: "#475569", marginTop: 2 }}>{e.descricao}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case "Quadro Comparativo": {
        const data = parseQuadroComparativo(cleaned);
        if (!data) return null;
        return (
          <div style={{ fontFamily, color: "#0f172a" }}>
            <h2 style={{ textAlign: "center", fontSize: fs(22), fontWeight: 800, color: palette.primary, margin: "0 0 14px" }}>
              {finalTitle}
            </h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: fs(12) }}>
              <thead>
                <tr>
                  {data.headers.map((h, i) => (
                    <th key={i} style={{ padding: 10, textAlign: "left", color: "#fff", background: i === 0 ? "#0f172a" : palette.primary }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 ? `${palette.primary}08` : "#fff" }}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: 10, borderTop: "1px solid #e2e8f0", verticalAlign: "top", fontWeight: ci === 0 ? 700 : 400 }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      default: {
        const sections = parseResumoSections(cleaned);
        if (!sections.length) return null;
        const handleSectionsChange = (next: TopicoSection[]) => {
          // Reconstrói markdown preservando título global
          const titleLine = `# ${finalTitle}`;
          const body = next
            .map((s) => `## ${s.heading}\n${s.items.map((it) => `- ${it}`).join("\n")}`)
            .join("\n\n");
          setResultado(`${titleLine}\n\n${body}`);
        };
        const handleTitleChange = (newTitle: string) => {
          setTitulo(newTitle);
          // Atualiza também o markdown se já houver linha de título
          if (/^#\s+/m.test(cleaned)) {
            setResultado(cleaned.replace(/^#\s+.+$/m, `# ${newTitle}`));
          }
        };
        return (
          <TopicosVisual
            title={finalTitle}
            disciplina={disciplina}
            sections={sections}
            style={topicosStyle}
            fontScale={fontScale}
            palette={palette.name.toLowerCase().includes("azul") ? "azul" : palette.name.toLowerCase().includes("esmeralda") ? "verde" : palette.name.toLowerCase().includes("coral") ? "laranja" : palette.name.toLowerCase().includes("violeta") ? "roxo" : "cinza"}
            editable
            onChange={handleSectionsChange}
            onTitleChange={handleTitleChange}
          />
        );
      }
    }
  };

  // Mapa Mental usa folha única em landscape (sem multi-página — é radial e cabe em 1 folha A4)
  const isMapaMental = tipoResumo === "Mapa Mental";
  const orientation: "portrait" | "landscape" = isMapaMental ? "landscape" : "portrait";
  const inner = renderInner();

  // Capturar o(s) elemento(s) A4 vivo(s) e exportar
  const handleExportPDF = async () => {
    const pageEls = Array.from(
      document.querySelectorAll<HTMLElement>("[data-a4-page]")
    );
    if (!pageEls.length) {
      toast.error("Nada para exportar.");
      return;
    }
    const filename = `resumo-${(disciplina || "geral")
      .toLowerCase()
      .replace(/\s+/g, "-")}-${tipoResumo.toLowerCase().replace(/\s+/g, "-")}.pdf`;
    await exportMultiPagePdf({
      pages: pageEls,
      filename,
      orientation,
      scale: 3,
      overlayMessage: "A gerar PDF...",
    });
  };

  const handleResetText = () => {
    setResultado(sanitizeResumo(initial.resultado));
    toast.success("Texto restaurado");
  };

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-screen">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/resumo")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div>
            <h1 className="text-base md:text-xl font-display font-bold text-foreground">Editor do Resumo</h1>
            <p className="text-[11px] md:text-sm text-muted-foreground">{tipoResumo} • {disciplina || "Sem disciplina"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportResumoWord(cleaned, tipoResumo, disciplina, finalTitle)}>
            <FileText className="h-4 w-4 mr-1" /> Word
          </Button>
          <Button size="sm" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-1" /> Exportar PDF
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <aside className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Type className="h-3.5 w-3.5" /> Cabeçalho
            </h3>
            <div className="space-y-1.5">
              <Label className="text-xs">Título</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={detectedTitle} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Disciplina</Label>
              <Input value={disciplina} onChange={(e) => setDisciplina(e.target.value)} />
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Type className="h-3.5 w-3.5" /> Tamanho da Letra
            </h3>
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1">
                <Slider min={1} max={50} step={1} value={[fontLevel]} onValueChange={(v) => setFontLevel(v[0])} />
              </div>
              <span className="text-xs font-bold w-12 text-right tabular-nums">{fontLevel}</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Type className="h-3.5 w-3.5" /> Densidade do Conteúdo
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(["leve", "normal", "agressivo"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDensity(d)}
                  className={`text-xs py-2 rounded-lg border transition-all capitalize ${
                    density === d
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Leve = mais respiração; Agressivo = mais conteúdo por folha.
            </p>
          </div>

          {!isMapaMental && (
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Palette className="h-3.5 w-3.5" /> Estilo Visual
              </h3>
              <select
                value={topicosStyle}
                onChange={(e) => setTopicosStyle(e.target.value as TopicosStyle)}
                className="w-full bg-background border border-input rounded-md h-9 px-2 text-xs"
              >
                <optgroup label="Mais usados">
                  <option value="step-cards">Step Cards</option>
                  <option value="modern-timeline">Timeline Blocks</option>
                  <option value="process-indicators">Process Indicators</option>
                  <option value="infographic-panels">Infographic Panels</option>
                  <option value="topic-containers">Topic Containers</option>
                  <option value="learning-modules">Learning Modules</option>
                  <option value="flow-cards">Flow Cards</option>
                </optgroup>
                <optgroup label="Estilos Premium">
                  <option value="bento-grid">Bento Grid</option>
                  <option value="glassmorphism-cards">Glassmorphism</option>
                  <option value="interactive-nodes">Interactive Nodes</option>
                  <option value="dashboard-widgets">Dashboard Widgets</option>
                </optgroup>
              </select>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Palette className="h-3.5 w-3.5" /> Paleta
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {PALETTE_PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setPalette(p)}
                  title={p.name}
                  className={`h-10 rounded-lg border-2 transition-all ${palette.name === p.name ? "border-foreground scale-105" : "border-transparent"}`}
                  style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.accent})` }}
                />
              ))}
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Tipo de letra</Label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full bg-background border border-input rounded-md h-9 px-2 text-xs"
              >
                {FONT_PRESETS.map((f) => <option key={f.name} value={f.value}>{f.name}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conteúdo</h3>
              <Button variant="ghost" size="sm" onClick={handleResetText} className="h-7 text-xs">
                <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
              </Button>
            </div>
            <Textarea
              value={resultado}
              onChange={(e) => setResultado(e.target.value)}
              rows={20}
              className="font-mono text-[12px] leading-relaxed min-h-[420px] resize-y"
              spellCheck
            />
            <p className="text-[10px] text-muted-foreground">
              Edita o markdown gerado pela IA. As alterações aparecem na pré-visualização A4.
            </p>
          </div>
        </aside>

        <main className="space-y-3">
          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
            <Save className="h-3 w-3" /> Pré-visualização A4 — cada folha aqui = 1 página no PDF.
            <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              Alvo: {targetPages} • Conteúdo: {contentPages}
              {contentPages > targetPages && " (letra reduzida automaticamente)"}
            </span>
          </div>

          {inner ? (
            isMapaMental ? (
              // Mapa mental: 1 folha landscape fixa
              <A4Sheet orientation="landscape">
                <div data-a4-page={1} data-a4-orientation="landscape" style={{ width: "100%", height: "100%" }}>
                  {inner}
                </div>
              </A4Sheet>
            ) : (
              <A4MultiPageSmart
                orientation={orientation}
                extraPages={extraPages}
                onAddPage={handleAddPage}
                onRemovePage={handleRemovePage}
                padding={48}
                targetPages={targetPages}
                onContentPagesChange={setContentPages}
              >
                <div style={{ fontFamily, color: "#000" }}>{inner}</div>
              </A4MultiPageSmart>
            )
          ) : (
            <A4MultiPageSmart
              orientation="portrait"
              extraPages={extraPages}
              onAddPage={handleAddPage}
              onRemovePage={handleRemovePage}
              targetPages={targetPages}
              onContentPagesChange={setContentPages}
            >
              <div style={{ fontFamily, color: "#000" }}>
                <h1 style={{ textAlign: "center", fontSize: 22, color: palette.primary, margin: "0 0 12px", fontWeight: 800 }}>
                  {finalTitle.toUpperCase()}
                </h1>
                {disciplina && <p style={{ textAlign: "center", fontSize: 12, color: "#475569" }}>Disciplina: {disciplina}</p>}
                <hr style={{ border: "none", borderTop: `2px solid ${palette.primary}`, margin: "12px 0 18px" }} />
                <pre style={{ whiteSpace: "pre-wrap", fontFamily, fontSize: 12, lineHeight: 1.7 }}>{cleaned}</pre>
              </div>
            </A4MultiPageSmart>
          )}
        </main>
      </div>
    </div>
  );
};

export default ResumoEditorPage;
