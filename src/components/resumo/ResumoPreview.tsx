import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown, FileText, Copy } from "lucide-react";
import { toast } from "sonner";
import { exportResumoPDF, exportResumoWord } from "@/lib/resumo-export";

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
    // H1
    if (line.startsWith("# ")) {
      title = line.replace(/^#\s*/, "").replace(/\*\*/g, "");
      continue;
    }
    // H2
    if (line.startsWith("## ")) {
      if (current) sections.push(current);
      current = { heading: line.replace(/^##\s*/, "").replace(/\*\*/g, ""), level: 2, items: [] };
      continue;
    }
    // H3
    if (line.startsWith("### ")) {
      if (current) sections.push(current);
      current = { heading: line.replace(/^###\s*/, "").replace(/\*\*/g, ""), level: 3, items: [] };
      continue;
    }
    // Bold-only line as heading
    if (/^\*\*[^*]+\*\*$/.test(line)) {
      if (current) sections.push(current);
      const heading = line.replace(/\*\*/g, "");
      if (!title) {
        title = heading;
        continue;
      }
      current = { heading, level: 2, items: [] };
      continue;
    }
    // Bullet or numbered item
    if (/^[-*•]\s/.test(line) || /^\d+[.)]\s/.test(line)) {
      const item = line.replace(/^[-*•]\s*/, "").replace(/^\d+[.)]\s*/, "");
      if (current) {
        current.items.push(item);
      } else {
        current = { heading: "", level: 0, items: [item] };
      }
      continue;
    }
    // Regular text
    if (current) {
      current.items.push(line);
    } else {
      current = { heading: "", level: 0, items: [line] };
    }
  }
  if (current) sections.push(current);
  return { title, sections };
}

function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.replace(/\*\*/g, "")}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

const ResumoPreview: React.FC<ResumoPreviewProps> = ({ resultado, tipoResumo, disciplina }) => {
  const { title, sections } = parseResumoContent(resultado);

  const handleCopy = () => {
    navigator.clipboard.writeText(resultado);
    toast.success("Copiado!");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-base">Resumo Gerado</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-1" /> Copiar
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportResumoPDF(resultado, tipoResumo, disciplina, title)}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button size="sm" onClick={() => exportResumoWord(resultado, tipoResumo, disciplina, title)}>
            <FileText className="h-4 w-4 mr-1" /> Word
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-border">
        <div
          className="resumo-a4-preview"
          style={{
            fontFamily: "'Times New Roman', serif",
            color: "#000",
            backgroundColor: "#fff",
            padding: "48px 56px",
            minHeight: "700px",
            fontSize: "11pt",
            lineHeight: "1.7",
            position: "relative",
          }}
        >
          {/* Decorative corner accents */}
          <div style={{
            position: "absolute", top: 0, left: 0, width: "80px", height: "80px",
            borderTop: "4px solid #10b981", borderLeft: "4px solid #10b981",
          }} />
          <div style={{
            position: "absolute", bottom: 0, right: 0, width: "80px", height: "80px",
            borderBottom: "4px solid #10b981", borderRight: "4px solid #10b981",
          }} />

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <h1 style={{
              fontSize: "18pt", fontWeight: "bold", marginBottom: "6px",
              textTransform: "uppercase", letterSpacing: "1px",
            }}>
              {title || tipoResumo}
            </h1>
            {disciplina && (
              <p style={{ fontSize: "11pt", color: "#444", marginBottom: "4px" }}>
                Disciplina: {disciplina}
              </p>
            )}
            <p style={{ fontSize: "10pt", color: "#666", fontStyle: "italic" }}>
              {tipoResumo}
            </p>
            <div style={{ borderBottom: "2px solid #000", width: "100%", marginTop: "14px" }} />
          </div>

          {/* Student info fields */}
          <div style={{
            display: "flex", justifyContent: "space-between", marginBottom: "24px",
            fontSize: "10pt", gap: "16px",
          }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: "bold" }}>Nome:</span>{" "}
              <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "240px" }}>&nbsp;</span>
            </div>
            <div>
              <span style={{ fontWeight: "bold" }}>Data:</span>{" "}
              <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "70px" }}>&nbsp;</span>/
              <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "70px" }}>&nbsp;</span>
            </div>
          </div>

          {/* Content sections */}
          {sections.length === 0 ? (
            <div style={{
              border: "1px solid #ddd", borderRadius: "8px", padding: "16px",
              backgroundColor: "#fafafa",
            }}>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'Times New Roman', serif", fontSize: "11pt" }}>
                {resultado}
              </pre>
            </div>
          ) : (
            <div>
              {sections.map((section, idx) => (
                <div key={idx} style={{ marginBottom: "18px" }}>
                  {section.heading && (
                    <div style={{
                      marginBottom: "8px",
                      paddingBottom: "4px",
                      borderBottom: section.level === 2 ? "1px solid #ccc" : "none",
                    }}>
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
                    <div key={ii} style={{
                      display: "flex", alignItems: "flex-start", gap: "8px",
                      marginBottom: "5px", paddingLeft: section.heading ? "12px" : "0",
                      fontSize: "11pt",
                    }}>
                      {section.heading && (
                        <span style={{ color: "#10b981", fontWeight: "bold", flexShrink: 0 }}>•</span>
                      )}
                      <span style={{ textAlign: "justify" }}>{renderInlineBold(item)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{
            borderTop: "1px solid #ccc", marginTop: "32px", paddingTop: "10px",
            textAlign: "center", fontSize: "9pt", color: "#888",
          }}>
            Gerado por Doka — Plataforma de Estudo Inteligente
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumoPreview;
