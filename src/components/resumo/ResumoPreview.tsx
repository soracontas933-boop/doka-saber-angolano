import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown, FileText, Copy } from "lucide-react";
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

interface ResumoPreviewProps {
  resultado: string;
  tipoResumo: string;
  disciplina: string;
}

interface ParsedSection {
  heading: string;
  level: number;
  items: string[];
}

function parseResumoContent(text: string): { title: string; sections: ParsedSection[] } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let title = "";
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (const line of lines) {
    if (line.startsWith("# ")) { title = line.replace(/^#\s*/, "").replace(/\*\*/g, ""); continue; }
    if (line.startsWith("## ")) {
      if (current) sections.push(current);
      current = { heading: line.replace(/^##\s*/, "").replace(/\*\*/g, ""), level: 2, items: [] };
      continue;
    }
    if (line.startsWith("### ")) {
      if (current) sections.push(current);
      current = { heading: line.replace(/^###\s*/, "").replace(/\*\*/g, ""), level: 3, items: [] };
      continue;
    }
    if (/^\*\*[^*]+\*\*$/.test(line)) {
      if (current) sections.push(current);
      const heading = line.replace(/\*\*/g, "");
      if (!title) { title = heading; continue; }
      current = { heading, level: 2, items: [] };
      continue;
    }
    if (/^[-*•]\s/.test(line) || /^\d+[.)]\s/.test(line)) {
      const item = line.replace(/^[-*•]\s*/, "").replace(/^\d+[.)]\s*/, "");
      if (current) current.items.push(item);
      else current = { heading: "", level: 0, items: [item] };
      continue;
    }
    if (current) current.items.push(line);
    else current = { heading: "", level: 0, items: [line] };
  }
  if (current) sections.push(current);
  return { title, sections };
}

function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.replace(/\*\*/g, "")}</strong>
      : <span key={i}>{part}</span>
  );
}

const ResumoPreview: React.FC<ResumoPreviewProps> = ({ resultado, tipoResumo, disciplina }) => {
  const cleaned = sanitizeResumo(resultado);
  const { title, sections } = parseResumoContent(cleaned);
  const visualRef = React.useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleaned);
    toast.success("Copiado!");
  };

  const handleExportPDF = () => {
    // Se houver visual rico (mapa mental, flashcards, etc.) exporta o visual real
    if (visualRef.current) {
      return exportResumoVisualPDF(visualRef.current, tipoResumo, disciplina, title || tipoResumo);
    }
    return exportResumoPDF(cleaned, tipoResumo, disciplina, title);
  };

  // Decide o componente visual conforme o tipo
  const renderVisual = () => {
    switch (tipoResumo) {
      case "Mapa Mental": {
        const data = parseMapaMental(cleaned);
        if (data.branches.length === 0) return null;
        return <MapaMentalVisual central={data.central} branches={data.branches} />;
      }
      case "Flashcards": {
        const cards = parseFlashcards(cleaned);
        if (cards.length === 0) return null;
        return <FlashcardsVisual cards={cards} />;
      }
      case "Linha do Tempo": {
        const events = parseLinhaTempo(cleaned);
        if (events.length === 0) return null;
        return <LinhaTempoVisual events={events} />;
      }
      case "Quadro Comparativo": {
        const data = parseQuadroComparativo(cleaned);
        if (!data) return null;
        return <QuadroComparativoVisual data={data} />;
      }
      default:
        return null;
    }
  };

  const visual = renderVisual();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display font-semibold text-base">Resumo Gerado</h2>
        <div className="flex gap-2">
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

      {/* Componente visual quando aplicável */}
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

      {/* Render textual A4 — sempre, para fallback / leitura completa / exportação */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-border">
        <div
          className="resumo-a4-preview"
          style={{
            fontFamily: "'Times New Roman', serif",
            color: "#000",
            backgroundColor: "#fff",
            padding: "48px 56px",
            minHeight: visual ? "auto" : "700px",
            fontSize: "11pt",
            lineHeight: "1.7",
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, width: "80px", height: "80px", borderTop: "4px solid #10b981", borderLeft: "4px solid #10b981" }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: "80px", height: "80px", borderBottom: "4px solid #10b981", borderRight: "4px solid #10b981" }} />

          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <h1 style={{ fontSize: "18pt", fontWeight: "bold", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>
              {title || tipoResumo}
            </h1>
            {disciplina && (
              <p style={{ fontSize: "11pt", color: "#444", marginBottom: "4px" }}>Disciplina: {disciplina}</p>
            )}
            <p style={{ fontSize: "10pt", color: "#666", fontStyle: "italic" }}>{tipoResumo}</p>
            <div style={{ borderBottom: "2px solid #000", width: "100%", marginTop: "14px" }} />
          </div>

          {sections.length === 0 ? (
            <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px", backgroundColor: "#fafafa" }}>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'Times New Roman', serif", fontSize: "11pt" }}>
                {cleaned}
              </pre>
            </div>
          ) : (
            <div>
              {sections.map((section, idx) => (
                <div key={idx} style={{ marginBottom: "18px" }}>
                  {section.heading && (
                    <div style={{ marginBottom: "8px", paddingBottom: "4px", borderBottom: section.level === 2 ? "1px solid #ccc" : "none" }}>
                      <h2 style={{
                        fontSize: section.level === 2 ? "13pt" : "12pt",
                        fontWeight: "bold",
                        color: section.level === 2 ? "#1a1a1a" : "#333",
                        textTransform: section.level === 2 ? "uppercase" : "none",
                        letterSpacing: section.level === 2 ? "0.5px" : "0",
                        margin: 0,
                      }}>
                        {section.heading}
                      </h2>
                    </div>
                  )}
                  {section.items.map((item, ii) => (
                    <div key={ii} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "5px", paddingLeft: section.heading ? "12px" : "0", fontSize: "11pt" }}>
                      {section.heading && <span style={{ color: "#10b981", fontWeight: "bold", flexShrink: 0 }}>•</span>}
                      <span style={{ textAlign: "justify" }}>{renderInlineBold(item)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop: "1px solid #ccc", marginTop: "32px", paddingTop: "10px", textAlign: "center", fontSize: "9pt", color: "#888" }}>
            Gerado por Delle — Plataforma de Estudo Inteligente
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumoPreview;
