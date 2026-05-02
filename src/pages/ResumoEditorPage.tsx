import React, { useMemo, useRef, useState } from "react";
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
import FlashcardsVisual from "@/components/resumo/visuals/FlashcardsVisual";
import LinhaTempoVisual from "@/components/resumo/visuals/LinhaTempoVisual";
import QuadroComparativoVisual from "@/components/resumo/visuals/QuadroComparativoVisual";
import A4Sheet from "@/components/resumo/A4Sheet";
import { exportResumoPDF, exportResumoVisualPDF, exportResumoWord } from "@/lib/resumo-export";

interface LocationState {
  resultado: string;
  tipoResumo: string;
  disciplina: string;
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

  const [resultado, setResultado] = useState(sanitizeResumo(initial.resultado));
  const [titulo, setTitulo] = useState("");
  const [disciplina, setDisciplina] = useState(initial.disciplina || "");
  const [tipoResumo] = useState(initial.tipoResumo);
  const [palette, setPalette] = useState(PALETTE_PRESETS[0]);
  const [fontFamily, setFontFamily] = useState(FONT_PRESETS[0].value);
  const [fontLevel, setFontLevel] = useState(25);
  const fontScale = 0.55 + (fontLevel - 1) * ((2.2 - 0.55) / 49);
  const fs = (px: number) => `${px * fontScale}px`;
  const visualRef = useRef<HTMLDivElement>(null);

  const cleaned = useMemo(() => sanitizeResumo(resultado), [resultado]);

  // Detecta título do conteúdo
  const detectedTitle = useMemo(() => {
    const m = cleaned.match(/^#\s+(.+)$/m);
    return m ? m[1].replace(/\*\*/g, "").trim() : tipoResumo;
  }, [cleaned, tipoResumo]);

  const finalTitle = titulo || detectedTitle;

  const renderVisual = () => {
    switch (tipoResumo) {
      case "Mapa Mental": {
        const data = parseMapaMental(cleaned);
        if (!data.branches.length) return null;
        return (
          <A4Sheet orientation="landscape" innerRef={visualRef}>
            <MapaMentalVisual central={data.central} branches={data.branches} fillA4 fontScale={fontScale} />
          </A4Sheet>
        );
      }
      case "Flashcards": {
        const cards = parseFlashcards(cleaned);
        if (!cards.length) return null;
        return (
          <A4Sheet orientation="portrait" innerRef={visualRef}>
            <div style={{ padding: 28, height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
              <h2 style={{ textAlign: "center", fontFamily, fontSize: fs(22), fontWeight: 800, color: palette.primary, margin: 0 }}>
                {finalTitle}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, flex: 1, overflow: "hidden" }}>
                {cards.slice(0, 8).map((c, i) => (
                  <div key={i} style={{
                    border: `2px solid ${palette.primary}`,
                    borderRadius: 14,
                    padding: 12,
                    background: `linear-gradient(135deg, ${palette.primary}11, ${palette.accent}11)`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}>
                    <div style={{ fontSize: fs(9), letterSpacing: 1.5, color: palette.primary, fontWeight: 700, textTransform: "uppercase" }}>
                      Cartão {i + 1}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: fs(13), color: "#0f172a", fontFamily }}>{c.frente}</div>
                    <div style={{ borderTop: `1px dashed ${palette.primary}55`, paddingTop: 6, fontSize: fs(11), color: "#334155", fontFamily }}>
                      {c.verso}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </A4Sheet>
        );
      }
      case "Linha do Tempo": {
        const events = parseLinhaTempo(cleaned);
        if (!events.length) return null;
        return (
          <A4Sheet orientation="portrait" innerRef={visualRef}>
            <div style={{ padding: 32, height: "100%", overflow: "hidden" }}>
              <h2 style={{ textAlign: "center", fontFamily, fontSize: fs(22), fontWeight: 800, color: palette.primary, margin: "0 0 18px" }}>
                {finalTitle}
              </h2>
              <div style={{ position: "relative", paddingLeft: 36 }}>
                <div style={{ position: "absolute", left: 12, top: 0, bottom: 0, width: 3, background: `linear-gradient(${palette.primary}, ${palette.accent})`, borderRadius: 4 }} />
                {events.slice(0, 10).map((e, i) => (
                  <div key={i} style={{ position: "relative", marginBottom: 14 }}>
                    <div style={{ position: "absolute", left: -32, top: 4, width: 18, height: 18, borderRadius: "50%", background: palette.primary, border: "3px solid #fff", boxShadow: `0 0 0 2px ${palette.primary}55` }} />
                    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 14px" }}>
                      <span style={{ fontSize: fs(10), fontWeight: 700, color: "#fff", background: palette.primary, padding: "2px 8px", borderRadius: 999 }}>{e.data}</span>
                      <div style={{ fontWeight: 700, fontSize: fs(13), color: "#0f172a", fontFamily, marginTop: 4 }}>{e.titulo}</div>
                      {e.descricao && <div style={{ fontSize: fs(11), color: "#475569", fontFamily, marginTop: 2 }}>{e.descricao}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </A4Sheet>
        );
      }
      case "Quadro Comparativo": {
        const data = parseQuadroComparativo(cleaned);
        if (!data) return null;
        return (
          <A4Sheet orientation="landscape" innerRef={visualRef}>
            <div style={{ padding: 28, height: "100%", display: "flex", flexDirection: "column" }}>
              <h2 style={{ textAlign: "center", fontFamily, fontSize: fs(22), fontWeight: 800, color: palette.primary, margin: "0 0 14px" }}>
                {finalTitle}
              </h2>
              <div style={{ flex: 1, overflow: "hidden", border: "1px solid #e2e8f0", borderRadius: 12 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily, fontSize: fs(12) }}>
                  <thead>
                    <tr>
                      {data.headers.map((h, i) => (
                        <th key={i} style={{ padding: 10, textAlign: "left", color: "#fff", background: i === 0 ? "#0f172a" : palette.primary, fontSize: fs(12) }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, ri) => (
                      <tr key={ri} style={{ background: ri % 2 ? `${palette.primary}08` : "#fff" }}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ padding: 10, borderTop: "1px solid #e2e8f0", verticalAlign: "top", fontWeight: ci === 0 ? 700 : 400, color: "#0f172a" }}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </A4Sheet>
        );
      }
      default:
        return null;
    }
  };

  const visual = renderVisual();

  const handleExportPDF = () => {
    if (visualRef.current) {
      return exportResumoVisualPDF(visualRef.current, tipoResumo, disciplina, finalTitle);
    }
    return exportResumoPDF(cleaned, tipoResumo, disciplina, finalTitle);
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
        {/* Painel de edição */}
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
                <Slider
                  min={1}
                  max={50}
                  step={1}
                  value={[fontLevel]}
                  onValueChange={(v) => setFontLevel(v[0])}
                />
              </div>
              <span className="text-xs font-bold w-12 text-right tabular-nums">{fontLevel}</span>
            </div>
          </div>

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
              rows={14}
              className="font-mono text-[11px] leading-relaxed"
            />
            <p className="text-[10px] text-muted-foreground">
              Edita o markdown gerado pela IA. As alterações aparecem na pré-visualização A4.
            </p>
          </div>
        </aside>

        {/* Pré-visualização A4 */}
        <main className="space-y-3">
          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
            <Save className="h-3 w-3" /> Pré-visualização A4 — exporta exatamente como aparece aqui.
          </div>
          {visual ? (
            visual
          ) : (
            <A4Sheet orientation="portrait" innerRef={visualRef}>
              <div style={{ padding: "48px 56px", fontFamily, color: "#000", height: "100%", overflow: "hidden" }}>
                <h1 style={{ textAlign: "center", fontSize: 22, color: palette.primary, margin: "0 0 12px", fontWeight: 800 }}>
                  {finalTitle.toUpperCase()}
                </h1>
                {disciplina && <p style={{ textAlign: "center", fontSize: 12, color: "#475569" }}>Disciplina: {disciplina}</p>}
                <hr style={{ border: "none", borderTop: `2px solid ${palette.primary}`, margin: "12px 0 18px" }} />
                <pre style={{ whiteSpace: "pre-wrap", fontFamily, fontSize: 12, lineHeight: 1.7 }}>{cleaned}</pre>
              </div>
            </A4Sheet>
          )}
        </main>
      </div>
    </div>
  );
};

export default ResumoEditorPage;
