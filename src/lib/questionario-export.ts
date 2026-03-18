import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import { showExportOverlay, hideExportOverlay } from "@/components/ExportOverlay";
import { parseQuestionarioContent, isShortAnswerTipo, cleanOptionLabel } from "@/lib/questionario-parser";

function toastSuccess() {
  import("sonner").then(({ toast }) => toast.success("Exportado com sucesso!"));
}

export async function exportQuestionarioWord(resultado: string, tipo: string, disciplina: string, titleOverride?: string) {
  showExportOverlay("A gerar ficheiro Word...");
  try {
    const parsed = parseQuestionarioContent(resultado);
    const { questions } = parsed;
    const title = titleOverride || parsed.title;
    const shortAnswer = isShortAnswerTipo(tipo);
    const paragraphs: Paragraph[] = [];

    console.log("[Word Export] raw resultado length:", resultado?.length, "first 200 chars:", resultado?.substring(0, 200));
    console.log("[Word Export] parsed questions:", questions.length, "title:", title);

    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 32, font: "Times New Roman" })],
      })
    );

    if (disciplina) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: `Disciplina: ${disciplina}`, size: 22, font: "Times New Roman" })],
        })
      );
    }

    paragraphs.push(
      new Paragraph({
        spacing: { after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } },
        children: [],
      })
    );

    paragraphs.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: "Nome: ________________________________", size: 20, font: "Times New Roman" }),
          new TextRun({ text: "          Data: ____/____/______", size: 20, font: "Times New Roman" }),
        ],
      })
    );

    if (questions.length === 0) {
      // Fallback: render raw text line by line
      const rawLines = resultado.replace(/```[\s\S]*?```/g, '').split('\n').filter(l => l.trim());
      for (const line of rawLines) {
        paragraphs.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: line, size: 20, font: "Times New Roman" })],
          })
        );
      }
    } else {
      for (const q of questions) {
        paragraphs.push(
          new Paragraph({
            spacing: { before: 200, after: 60 },
            children: [new TextRun({ text: `Pergunta ${q.number}: `, size: 20, font: "Times New Roman", color: "666666" })],
          })
        );

        paragraphs.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: q.text, bold: true, size: 22, font: "Times New Roman" })],
          })
        );

        if (shortAnswer && !q.options) {
          const lineCount = tipo === "dissertativa" ? 4 : 2;
          for (let i = 0; i < lineCount; i++) {
            paragraphs.push(
              new Paragraph({
                spacing: { after: 40 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "999999", space: 8 } },
                children: [new TextRun({ text: " ", size: 22 })],
              })
            );
          }
        }

        if (q.options) {
          for (const opt of q.options) {
            paragraphs.push(
              new Paragraph({
                spacing: { after: 40 },
                indent: { left: 360 },
                children: [
                  new TextRun({ text: "☐  ", size: 22, font: "Times New Roman" }),
                  new TextRun({ text: cleanOptionLabel(opt), size: 22, font: "Times New Roman" }),
                ],
              })
            );
          }
        }

        if (q.answer) {
          paragraphs.push(
            new Paragraph({
              spacing: { before: 60, after: 40 },
              indent: { left: 360 },
              shading: { type: "clear" as any, color: "auto", fill: "E8F5E9" },
              children: [
                new TextRun({ text: "✓ Resposta: ", bold: true, size: 20, font: "Times New Roman", color: "2E7D32" }),
                new TextRun({ text: q.answer, size: 20, font: "Times New Roman", color: "1B5E20" }),
              ],
            })
          );
          if (q.explanation) {
            paragraphs.push(
              new Paragraph({
                spacing: { after: 40 },
                indent: { left: 360 },
                children: [
                  new TextRun({ text: q.explanation, italics: true, size: 18, font: "Times New Roman", color: "555555" }),
                ],
              })
            );
          }
        }
      }
    }

    paragraphs.push(
      new Paragraph({
        spacing: { before: 400 },
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 8 } },
        children: [new TextRun({ text: "Gerado por Doka — Plataforma de Estudo Inteligente", size: 16, font: "Times New Roman", color: "999999" })],
      })
    );

    const doc = new Document({
      sections: [
        {
          properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
          children: paragraphs,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `questionario-${disciplina || "geral"}.docx`);
    toastSuccess();
  } catch (err) {
    console.error("Word export error:", err);
    import("sonner").then(({ toast }) => toast.error("Erro ao exportar Word"));
  } finally {
    hideExportOverlay();
  }
}

export async function exportQuestionarioPDF(resultado: string, tipo: string, disciplina: string, titleOverride?: string) {
  const parsed = parseQuestionarioContent(resultado);
  const { questions } = parsed;
  const title = titleOverride || parsed.title;
  const shortAnswer = isShortAnswerTipo(tipo);

  const safeTitle = escapeHtml(title || "Questionário");
  const safeDisciplina = escapeHtml(disciplina || "");

  let html = `
    <div style="text-align:center;margin-bottom:20px;">
      <h1 style="font-size:16pt;font-weight:bold;text-transform:uppercase;margin-bottom:6px;">${safeTitle}</h1>
      ${safeDisciplina ? `<p style="font-size:11pt;color:#444;">Disciplina: ${safeDisciplina}</p>` : ""}
      <hr style="border:none;border-bottom:2px solid #000;margin-top:12px;"/>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:20px;font-size:10pt;">
      <div><b>Nome:</b> <span style="border-bottom:1px solid #000;display:inline-block;width:250px;">&nbsp;</span></div>
      <div><b>Data:</b> <span style="border-bottom:1px solid #000;display:inline-block;width:60px;">&nbsp;</span>/<span style="border-bottom:1px solid #000;display:inline-block;width:60px;">&nbsp;</span></div>
    </div>
  `;

  if (questions.length === 0) {
    const rawFallback = escapeHtml(resultado || "").replace(/\n/g, "<br/>");
    html += `<div style="font-family:'Courier New',monospace;font-size:10pt;white-space:normal;">${rawFallback || "Sem conteúdo disponível para exportação."}</div>`;
  } else {
    for (const q of questions) {
      const safeQuestion = escapeHtml(q.text || "");
      html += `<div style="margin-bottom:${shortAnswer ? "24px" : "16px"};break-inside:avoid;">`;
      html += `<p style="color:#666;font-size:10pt;margin-bottom:2px;">Pergunta ${q.number}:</p>`;
      html += `<p style="font-weight:bold;font-size:11pt;margin-bottom:6px;">${safeQuestion}</p>`;

      if (shortAnswer && !q.options) {
        const lineCount = tipo === "dissertativa" ? 4 : 2;
        for (let i = 0; i < lineCount; i++) {
          html += `<div style="border-bottom:1px solid #999;height:22px;margin-bottom:4px;"></div>`;
        }
      }

      if (q.options) {
        html += `<div style="margin-left:16px;">`;
        for (const opt of q.options) {
          const safeOption = escapeHtml(cleanOptionLabel(opt));
          html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
            <span style="display:inline-block;width:13px;height:13px;border:1.5px solid #000;border-radius:2px;flex-shrink:0;"></span>
            <span>${safeOption}</span>
          </div>`;
        }
        html += `</div>`;
      }

      if (q.answer) {
        const safeAnswer = escapeHtml(q.answer);
        html += `<div style="margin-top:6px;padding:4px 10px;background:#e8f5e9;border-left:3px solid #2e7d32;border-radius:4px;">`;
        html += `<p style="font-size:10pt;color:#2e7d32;font-weight:bold;margin:0;">✓ Resposta: <span style="font-weight:normal;color:#1b5e20;">${safeAnswer}</span></p>`;
        if (q.explanation) {
          html += `<p style="font-size:9pt;color:#555;font-style:italic;margin:2px 0 0;">${escapeHtml(q.explanation)}</p>`;
        }
        html += `</div>`;
      }

      html += `</div>`;
    }
  }

  html += `<div style="border-top:1px solid #ccc;margin-top:24px;padding-top:8px;text-align:center;font-size:9pt;color:#888;">Gerado por Doka — Plataforma de Estudo Inteligente</div>`;

  await exportHtmlToPdf({
    html,
    filename: `questionario-${disciplina || "geral"}.pdf`,
    overlayMessage: "A gerar ficheiro PDF...",
    padding: "40px 50px",
  });
}

