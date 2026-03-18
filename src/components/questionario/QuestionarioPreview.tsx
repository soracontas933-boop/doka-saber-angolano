import React from "react";
import { Button } from "@/components/ui/button";
import { FileDown, FileText, Copy } from "lucide-react";
import { toast } from "sonner";
import { exportQuestionarioPDF, exportQuestionarioWord } from "@/lib/questionario-export";
import { parseQuestionarioContent, isShortAnswerTipo, cleanOptionLabel } from "@/lib/questionario-parser";

interface QuestionarioPreviewProps {
  resultado: string;
  tipo: string;
  disciplina: string;
}

const QuestionarioPreview: React.FC<QuestionarioPreviewProps> = ({ resultado, tipo, disciplina }) => {
  const { title, questions } = parseQuestionarioContent(resultado);
  const shortAnswer = isShortAnswerTipo(tipo);

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

      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-border">
        <div
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

          {shortAnswer ? (
            <p style={{ fontSize: "10pt", color: "#555", marginBottom: "20px", fontStyle: "italic" }}>
              Responda às questões abaixo de forma clara e concisa.
            </p>
          ) : (
            <p style={{ fontSize: "10pt", color: "#555", marginBottom: "20px", fontStyle: "italic" }}>
              Assinale a opção correcta para cada questão.
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px", fontSize: "10pt" }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: "bold" }}>Nome:</span>{" "}
              <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "250px" }}>&nbsp;</span>
            </div>
            <div>
              <span style={{ fontWeight: "bold" }}>Data:</span>{" "}
              <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "80px" }}>&nbsp;</span>/
              <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "80px" }}>&nbsp;</span>
            </div>
          </div>

          {questions.length === 0 ? (
            <div style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "12px",
              backgroundColor: "#fafafa",
            }}>
              <p style={{ marginBottom: "10px", fontWeight: 700 }}>Não foi possível interpretar o formato automaticamente.</p>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "'Courier New', monospace", fontSize: "10pt" }}>{resultado}</pre>
            </div>
          ) : (
            <div>
              {questions.map((q, idx) => (
                <div key={idx} style={{ marginBottom: shortAnswer ? "28px" : "18px" }}>
                  <p style={{ fontWeight: "bold", fontSize: "11pt", marginBottom: "4px" }}>
                    <span style={{ color: "#666", fontSize: "10pt" }}>Pergunta {q.number || idx + 1}:</span>
                  </p>
                  <p style={{ fontWeight: "bold", fontSize: "11pt", marginBottom: shortAnswer ? "8px" : "4px" }}>
                    {q.text}
                  </p>

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

                  {q.options && q.options.length > 0 && (
                    <div style={{ marginLeft: "16px", marginTop: "4px" }}>
                      {q.options.map((opt, oi) => (
                        <div key={oi} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", fontSize: "11pt" }}>
                          <span
                            style={{
                              display: "inline-block",
                              width: "14px",
                              height: "14px",
                              border: "1.5px solid #000",
                              borderRadius: "2px",
                              flexShrink: 0,
                            }}
                          />
                          <span>{cleanOptionLabel(opt)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.answer && (
                    <div style={{ marginTop: "8px", padding: "6px 10px", backgroundColor: "#f0f7f0", borderLeft: "3px solid #2e7d32", borderRadius: "4px" }}>
                      <p style={{ fontSize: "10pt", color: "#2e7d32", fontWeight: "bold", marginBottom: "2px" }}>
                        ✓ Resposta: <span style={{ fontWeight: "normal", color: "#1b5e20" }}>{q.answer}</span>
                      </p>
                      {q.explanation && (
                        <p style={{ fontSize: "9pt", color: "#555", fontStyle: "italic", margin: 0 }}>
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop: "1px solid #ccc", marginTop: "30px", paddingTop: "10px", textAlign: "center", fontSize: "9pt", color: "#888" }}>
            Gerado por Doka — Plataforma de Estudo Inteligente
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionarioPreview;
