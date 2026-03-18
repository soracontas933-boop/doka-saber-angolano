import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, TabStopType, TabStopPosition } from "docx";
import { saveAs } from "file-saver";
import { showExportOverlay, hideExportOverlay } from "@/components/ExportOverlay";

function isShortAnswer(tipo: string): boolean {
  return ["resposta_curta", "completar_espacos", "dissertativa"].includes(tipo);
}

interface ParsedQ {
  number: number;
  text: string;
  options?: string[];
}

function parseQuestionsSimple(text: string): { title: string; questions: ParsedQ[] } {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let title = "";
  const questions: ParsedQ[] = [];
  let current: ParsedQ | null = null;

  for (const line of lines) {
    if (!title && !line.match(/^\d+[\.\)]/)) {
      title = line.replace(/^[#*]+\s*/, "").replace(/\*\*/g, "");
      continue;
    }
    const qMatch = line.match(/^(\d+)[\.\)\-:]\s*(.+)/);
    if (qMatch) {
      if (current) questions.push(current);
      current = { number: parseInt(qMatch[1]), text: qMatch[2].replace(/\*\*/g, "") };
      continue;
    }
    const optMatch = line.match(/^(?:[a-dA-D][\.\)]|[\d]\.?\s*\(\s*\)|\(\s*\))\s*(.+)/);
    if (optMatch && current) {
      if (!current.options) current.options = [];
      current.options.push(line.replace(/\*\*/g, ""));
      continue;
    }
    if (current && !current.options) {
      current.text += " " + line.replace(/\*\*/g, "");
    }
  }
  if (current) questions.push(current);
  return { title: title || "Questionário", questions };
}

// ── Word Export ────────────────────────────────────────────
export async function exportQuestionarioWord(resultado: string, tipo: string, disciplina: string, titleOverride?: string) {
  showExportOverlay("A gerar ficheiro Word...");
  try {
    const { title, questions } = parseQuestionsSimple(resultado);
    const shortAnswer = isShortAnswer(tipo);
    const paragraphs: Paragraph[] = [];

    // Title
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: (titleOverride || title).toUpperCase(), bold: true, size: 32, font: "Times New Roman" })],
    }));

    if (disciplina) {
      paragraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: `Disciplina: ${disciplina}`, size: 22, font: "Times New Roman" })],
      }));
    }

    // Separator
    paragraphs.push(new Paragraph({
      spacing: { after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } },
      children: [],
    }));

    // Name / Date
    paragraphs.push(new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: "Nome: ________________________________", size: 20, font: "Times New Roman" }),
        new TextRun({ text: "          Data: ____/____/______", size: 20, font: "Times New Roman" }),
      ],
    }));

    // Questions
    for (const q of questions) {
      paragraphs.push(new Paragraph({
        spacing: { before: 200, after: 60 },
        children: [
          new TextRun({ text: `Pergunta ${q.number}: `, size: 20, font: "Times New Roman", color: "666666" }),
        ],
      }));
      paragraphs.push(new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: q.text, bold: true, size: 22, font: "Times New Roman" })],
      }));

      if (shortAnswer && !q.options) {
        const lineCount = tipo === "dissertativa" ? 4 : 2;
        for (let i = 0; i < lineCount; i++) {
          paragraphs.push(new Paragraph({
            spacing: { after: 40 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "999999", space: 8 } },
            children: [new TextRun({ text: " ", size: 22 })],
          }));
        }
      }

      if (q.options) {
        for (const opt of q.options) {
          const cleanOpt = opt.replace(/^[a-dA-D][\.\)]\s*/, "").replace(/^\(\s*\)\s*/, "").replace(/^\d+\.?\s*\(\s*\)\s*/, "");
          paragraphs.push(new Paragraph({
            spacing: { after: 40 },
            indent: { left: 360 },
            children: [
              new TextRun({ text: "☐  ", size: 22, font: "Times New Roman" }),
              new TextRun({ text: cleanOpt, size: 22, font: "Times New Roman" }),
            ],
          }));
        }
      }
    }

    // Footer
    paragraphs.push(new Paragraph({
      spacing: { before: 400 },
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 8 } },
      children: [new TextRun({ text: "Gerado por Doka — Plataforma de Estudo Inteligente", size: 16, font: "Times New Roman", color: "999999" })],
    }));

    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
        children: paragraphs,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `questionario-${disciplina || "geral"}.docx`);
    toast_success();
  } finally {
    hideExportOverlay();
  }
}

function toast_success() {
  // Imported dynamically to avoid circular deps
  import("sonner").then(({ toast }) => toast.success("Exportado com sucesso!"));
}

// ── PDF Export ────────────────────────────────────────────
export async function exportQuestionarioPDF(resultado: string, tipo: string, disciplina: string, titleOverride?: string) {
  showExportOverlay("A gerar ficheiro PDF...");
  try {
    const { title, questions } = parseQuestionsSimple(resultado);
    const shortAnswer = isShortAnswer(tipo);

    const container = document.createElement("div");
    container.style.cssText = "font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.6; color: #000; background: #fff; max-width: 700px; padding: 40px 50px; position: absolute; left: -9999px; top: 0;";

    let html = `
      <div style="text-align:center;margin-bottom:20px;">
        <h1 style="font-size:16pt;font-weight:bold;text-transform:uppercase;margin-bottom:6px;">${titleOverride || title}</h1>
        ${disciplina ? `<p style="font-size:11pt;color:#444;">Disciplina: ${disciplina}</p>` : ""}
        <hr style="border:none;border-bottom:2px solid #000;margin-top:12px;"/>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:20px;font-size:10pt;">
        <div><b>Nome:</b> <span style="border-bottom:1px solid #000;display:inline-block;width:250px;">&nbsp;</span></div>
        <div><b>Data:</b> <span style="border-bottom:1px solid #000;display:inline-block;width:60px;">&nbsp;</span>/<span style="border-bottom:1px solid #000;display:inline-block;width:60px;">&nbsp;</span></div>
      </div>
    `;

    for (const q of questions) {
      html += `<div style="margin-bottom:${shortAnswer ? "24px" : "16px"};">`;
      html += `<p style="color:#666;font-size:10pt;margin-bottom:2px;">Pergunta ${q.number}:</p>`;
      html += `<p style="font-weight:bold;font-size:11pt;margin-bottom:6px;">${q.text}</p>`;

      if (shortAnswer && !q.options) {
        const lineCount = tipo === "dissertativa" ? 4 : 2;
        for (let i = 0; i < lineCount; i++) {
          html += `<div style="border-bottom:1px solid #999;height:22px;margin-bottom:4px;"></div>`;
        }
      }

      if (q.options) {
        html += `<div style="margin-left:16px;">`;
        for (const opt of q.options) {
          const clean = opt.replace(/^[a-dA-D][\.\)]\s*/, "").replace(/^\(\s*\)\s*/, "").replace(/^\d+\.?\s*\(\s*\)\s*/, "");
          html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
            <span style="display:inline-block;width:13px;height:13px;border:1.5px solid #000;border-radius:2px;flex-shrink:0;"></span>
            <span>${clean}</span>
          </div>`;
        }
        html += `</div>`;
      }

      html += `</div>`;
    }

    html += `<div style="border-top:1px solid #ccc;margin-top:24px;padding-top:8px;text-align:center;font-size:9pt;color:#888;">Gerado por Doka — Plataforma de Estudo Inteligente</div>`;

    container.innerHTML = html;
    document.body.appendChild(container);

    const html2pdf = (await import("html2pdf.js")).default;
    await html2pdf()
      .set({
        margin: [15, 15, 15, 15],
        filename: `questionario-${disciplina || "geral"}.pdf`,
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      } as any)
      .from(container)
      .save();

    document.body.removeChild(container);
    toast_success();
  } catch (err) {
    console.error("PDF export error:", err);
  } finally {
    hideExportOverlay();
  }
}
