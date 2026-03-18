import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import { showExportOverlay, hideExportOverlay } from "@/components/ExportOverlay";

function toastSuccess() {
  import("sonner").then(({ toast }) => toast.success("Exportado com sucesso!"));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface ParsedSection {
  heading: string;
  level: number;
  items: string[];
}

function parseResumo(text: string): { title: string; sections: ParsedSection[] } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  let title = "";
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (const line of lines) {
    if (line.startsWith("# ")) {
      title = line.replace(/^#\s*/, "").replace(/\*\*/g, "");
      continue;
    }
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

// ─── Word Export ────────────────────────────────────────────────

export async function exportResumoWord(resultado: string, tipoResumo: string, disciplina: string, titleOverride?: string) {
  showExportOverlay("A gerar ficheiro Word...");
  try {
    const { title: parsedTitle, sections } = parseResumo(resultado);
    const title = titleOverride || parsedTitle || tipoResumo;
    const paragraphs: Paragraph[] = [];

    // Title
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 36, font: "Times New Roman" })],
      })
    );

    // Discipline & type
    if (disciplina) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: `Disciplina: ${disciplina}`, size: 22, font: "Times New Roman" })],
        })
      );
    }
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: tipoResumo, size: 20, font: "Times New Roman", italics: true, color: "666666" })],
      })
    );

    // Separator
    paragraphs.push(
      new Paragraph({
        spacing: { after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } },
        children: [],
      })
    );

    // Student fields
    paragraphs.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: "Nome: ________________________________", size: 20, font: "Times New Roman" }),
          new TextRun({ text: "          Data: ____/____/______", size: 20, font: "Times New Roman" }),
        ],
      })
    );

    if (sections.length === 0) {
      const rawLines = resultado.split("\n").filter((l) => l.trim());
      for (const line of rawLines) {
        paragraphs.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: line.replace(/\*\*/g, ""), size: 22, font: "Times New Roman" })],
          })
        );
      }
    } else {
      for (const section of sections) {
        if (section.heading) {
          paragraphs.push(
            new Paragraph({
              heading: section.level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
              spacing: { before: 280, after: 100 },
              children: [
                new TextRun({
                  text: section.heading.toUpperCase(),
                  bold: true,
                  size: section.level === 2 ? 26 : 24,
                  font: "Times New Roman",
                }),
              ],
            })
          );
        }

        for (const item of section.items) {
          const runs: TextRun[] = [];
          const parts = item.split(/(\*\*[^*]+\*\*)/g);
          for (const part of parts) {
            if (part.startsWith("**") && part.endsWith("**")) {
              runs.push(new TextRun({ text: part.replace(/\*\*/g, ""), bold: true, size: 22, font: "Times New Roman" }));
            } else {
              runs.push(new TextRun({ text: part, size: 22, font: "Times New Roman" }));
            }
          }

          paragraphs.push(
            new Paragraph({
              spacing: { after: 60 },
              indent: section.heading ? { left: 360 } : undefined,
              children: section.heading
                ? [new TextRun({ text: "• ", size: 22, font: "Times New Roman" }), ...runs]
                : runs,
              alignment: AlignmentType.JUSTIFIED,
            })
          );
        }
      }
    }

    // Footer
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
    saveAs(blob, `resumo-${disciplina || "geral"}.docx`);
    toastSuccess();
  } catch (err) {
    console.error("Word export error:", err);
    import("sonner").then(({ toast }) => toast.error("Erro ao exportar Word"));
  } finally {
    hideExportOverlay();
  }
}

// ─── PDF Export ─────────────────────────────────────────────────

export async function exportResumoPDF(resultado: string, tipoResumo: string, disciplina: string, titleOverride?: string) {
  const { title: parsedTitle, sections } = parseResumo(resultado);
  const title = titleOverride || parsedTitle || tipoResumo;
  const safeTitle = escapeHtml(title);
  const safeDisciplina = escapeHtml(disciplina || "");

  let html = "";

  // Decorative corners
  html += `<div style="position:absolute;top:0;left:0;width:70px;height:70px;border-top:4px solid #10b981;border-left:4px solid #10b981;"></div>`;
  html += `<div style="position:absolute;bottom:0;right:0;width:70px;height:70px;border-bottom:4px solid #10b981;border-right:4px solid #10b981;"></div>`;

  // Header
  html += `
    <div style="text-align:center;margin-bottom:24px;position:relative;z-index:1;">
      <h1 style="font-size:18pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">${safeTitle}</h1>
      ${safeDisciplina ? `<p style="font-size:11pt;color:#444;">Disciplina: ${safeDisciplina}</p>` : ""}
      <p style="font-size:10pt;color:#666;font-style:italic;">${escapeHtml(tipoResumo)}</p>
      <hr style="border:none;border-bottom:2px solid #000;margin-top:14px;"/>
    </div>
  `;

  // Student fields
  html += `
    <div style="display:flex;justify-content:space-between;margin-bottom:22px;font-size:10pt;">
      <div><b>Nome:</b> <span style="border-bottom:1px solid #000;display:inline-block;width:240px;">&nbsp;</span></div>
      <div><b>Data:</b> <span style="border-bottom:1px solid #000;display:inline-block;width:60px;">&nbsp;</span>/<span style="border-bottom:1px solid #000;display:inline-block;width:60px;">&nbsp;</span></div>
    </div>
  `;

  // Content
  if (sections.length === 0) {
    html += `<div style="font-size:11pt;white-space:pre-wrap;">${escapeHtml(resultado)}</div>`;
  } else {
    for (const section of sections) {
      html += `<div style="margin-bottom:16px;break-inside:avoid;">`;
      if (section.heading) {
        html += `<div style="margin-bottom:6px;padding-bottom:3px;${section.level === 2 ? "border-bottom:1px solid #ccc;" : ""}">`;
        html += `<h2 style="font-size:${section.level === 2 ? "13pt" : "12pt"};font-weight:bold;color:${section.level === 2 ? "#1a1a1a" : "#333"};${section.level === 2 ? "text-transform:uppercase;letter-spacing:0.5px;" : ""}margin:0;">${escapeHtml(section.heading)}</h2>`;
        html += `</div>`;
      }
      for (const item of section.items) {
        const safeItem = escapeHtml(item).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        if (section.heading) {
          html += `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:4px;padding-left:12px;font-size:11pt;">`;
          html += `<span style="color:#10b981;font-weight:bold;flex-shrink:0;">•</span>`;
          html += `<span style="text-align:justify;">${safeItem}</span>`;
          html += `</div>`;
        } else {
          html += `<p style="margin-bottom:4px;font-size:11pt;text-align:justify;">${safeItem}</p>`;
        }
      }
      html += `</div>`;
    }
  }

  // Footer
  html += `<div style="border-top:1px solid #ccc;margin-top:28px;padding-top:10px;text-align:center;font-size:9pt;color:#888;">Gerado por Doka — Plataforma de Estudo Inteligente</div>`;

  await exportHtmlToPdf({
    html,
    filename: `resumo-${disciplina || "geral"}.pdf`,
    overlayMessage: "A gerar ficheiro PDF...",
  });
}
