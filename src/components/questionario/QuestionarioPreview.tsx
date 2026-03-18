import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, FileText, Copy } from "lucide-react";
import { toast } from "sonner";
import { exportQuestionarioPDF, exportQuestionarioWord } from "@/lib/questionario-export";

interface QuestionarioPreviewProps {
  resultado: string;
  tipo: string;
  disciplina: string;
}

interface ParsedQuestion {
  number: number;
  text: string;
  options?: string[];
  hasYesNo?: boolean;
  hasLine?: boolean;
}

function parseQuestions(text: string): { title: string; questions: ParsedQuestion[] } {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let title = "";
  const questions: ParsedQuestion[] = [];
  let current: ParsedQuestion | null = null;

  for (const line of lines) {
    // Detect title-like lines (first significant non-question line)
    if (!title && !line.match(/^\d+[\.\)]/)) {
      title = line.replace(/^[#*]+\s*/, "").replace(/\*\*/g, "");
      continue;
    }

    // Detect question start: "1.", "1)", "1 -", "Pergunta 1:"
    const qMatch = line.match(/^(\d+)[\.\)\-:]\s*(.+)/);
    if (qMatch) {
      if (current) questions.push(current);
      const qText = qMatch[2].replace(/\*\*/g, "");
      current = { number: parseInt(qMatch[1]), text: qText };
      continue;
    }

    // Detect options: "a)", "A.", "1.( )", "( ) Option"
    const optMatch = line.match(/^(?:[a-dA-D][\.\)]|[\d]\.?\s*\(\s*\))\s*(.+)/);
    if (optMatch && current) {
      if (!current.options) current.options = [];
      current.options.push(line.replace(/\*\*/g, ""));
      continue;
    }

    // Detect "( ) Sim" / "( ) Não" or "Verdadeiro/Falso"
    const boolMatch = line.match(/^\(\s*\)\s*(sim|não|verdadeiro|falso|v|f)/i);
    if (boolMatch && current) {
      if (!current.options) current.options = [];
      current.options.push(line);
      continue;
    }

    // If line starts with parenthesized options
    const parenOpt = line.match(/^\(\s*\)\s+(.+)/);
    if (parenOpt && current) {
      if (!current.options) current.options = [];
      current.options.push(line);
      continue;
    }

    // Append to current question text if it seems like continuation
    if (current && !line.match(/^(gabarito|respostas|correção)/i)) {
      // Could be part of question text
      if (!current.options) {
        current.text += " " + line.replace(/\*\*/g, "");
      }
    }
  }
  if (current) questions.push(current);

  return { title: title || "Questionário", questions };
}

function isShortAnswer(tipo: string): boolean {
  return ["resposta_curta", "completar_espacos", "dissertativa"].includes(tipo);
}

const QuestionarioPreview: React.FC<QuestionarioPreviewProps> = ({ resultado, tipo, disciplina }) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const { title, questions } = parseQuestions(resultado);
  const shortAnswer = isShortAnswer(tipo);

  const handleCopy = () => {
    navigator.clipboard.writeText(resultado);
    toast.success("Copiado!");
  };

  const handleExportPDF = () => {
    exportQuestionarioPDF(resultado, tipo, disciplina, title);
  };

  const handleExportWord = () => {
    exportQuestionarioWord(resultado, tipo, disciplina, title);
  };

  return (
    <div className="space-y-4">
      {/* Export toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-base">Questionário Gerado</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-1" /> Copiar
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button size="sm" onClick={handleExportWord}>
            <FileText className="h-4 w-4 mr-1" /> Word
          </Button>
        </div>
      </div>

      {/* A4 Preview */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-border">
        <div
          ref={previewRef}
          className="questionario-a4-preview"
          style={{
            fontFamily: "'Times New Roman', serif",
            color: "#000",
            backgroundColor: "#fff",
            padding: "40px 50px",
            minHeight: "600px",
            fontSize: "11pt",
            lineHeight: "1.6",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <h1 style={{ fontSize: "16pt", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase" }}>
              {title}
            </h1>
            {disciplina && (
              <p style={{ fontSize: "11pt", color: "#444", marginBottom: "4px" }}>
                Disciplina: {disciplina}
              </p>
            )}
            <div style={{ borderBottom: "2px solid #000", width: "100%", marginTop: "12px" }} />
          </div>

          {/* Instructions */}
          {shortAnswer ? (
            <p style={{ fontSize: "10pt", color: "#555", marginBottom: "20px", fontStyle: "italic" }}>
              Responda às questões abaixo de forma clara e concisa.
            </p>
          ) : (
            <p style={{ fontSize: "10pt", color: "#555", marginBottom: "20px", fontStyle: "italic" }}>
              Assinale a opção correcta para cada questão.
            </p>
          )}

          {/* Name/Date fields */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px", fontSize: "10pt" }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: "bold" }}>Nome:</span> <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "250px" }}>&nbsp;</span>
            </div>
            <div>
              <span style={{ fontWeight: "bold" }}>Data:</span> <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "80px" }}>&nbsp;</span>/<span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "80px" }}>&nbsp;</span>
            </div>
          </div>

          {/* Questions */}
          <div>
            {questions.map((q, idx) => (
              <div key={idx} style={{ marginBottom: shortAnswer ? "28px" : "18px" }}>
                <p style={{ fontWeight: "bold", fontSize: "11pt", marginBottom: "4px" }}>
                  <span style={{ color: "#666", fontSize: "10pt" }}>Pergunta {q.number || idx + 1}:</span>
                </p>
                <p style={{ fontWeight: "bold", fontSize: "11pt", marginBottom: shortAnswer ? "8px" : "4px" }}>
                  {q.text}
                </p>

                {/* Short answer: show lines */}
                {shortAnswer && !q.options && (
                  <div style={{ marginTop: "8px" }}>
                    <div style={{ borderBottom: "1px solid #999", height: "24px", marginBottom: "4px" }} />
                    <div style={{ borderBottom: "1px solid #999", height: "24px", marginBottom: "4px" }} />
                    {tipo === "dissertativa" && (
                      <>
                        <div style={{ borderBottom: "1px solid #999", height: "24px", marginBottom: "4px" }} />
                        <div style={{ borderBottom: "1px solid #999", height: "24px" }} />
                      </>
                    )}
                  </div>
                )}

                {/* Multiple choice / V-F: show options with checkboxes */}
                {q.options && q.options.length > 0 && (
                  <div style={{ marginLeft: "16px", marginTop: "4px" }}>
                    {q.options.map((opt, oi) => (
                      <div key={oi} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", fontSize: "11pt" }}>
                        <span style={{
                          display: "inline-block",
                          width: "14px",
                          height: "14px",
                          border: "1.5px solid #000",
                          borderRadius: "2px",
                          flexShrink: 0,
                        }} />
                        <span>{opt.replace(/^[a-dA-D][\.\)]\s*/, "").replace(/^\(\s*\)\s*/, "").replace(/^\d+\.?\s*\(\s*\)\s*/, "")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ borderTop: "1px solid #ccc", marginTop: "30px", paddingTop: "10px", textAlign: "center", fontSize: "9pt", color: "#888" }}>
            Gerado por Doka — Plataforma de Estudo Inteligente
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionarioPreview;
