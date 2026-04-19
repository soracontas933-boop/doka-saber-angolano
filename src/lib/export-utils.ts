import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, PageBreak, ImageRun } from "docx";
import { saveAs } from "file-saver";
import { showExportOverlay, hideExportOverlay } from "@/components/ExportOverlay";
import { escapeHtml, exportHtmlToPdf } from "@/lib/pdf-export-helper";

export interface CoverPageData {
  nomeEscola?: string;
  tipoTrabalho: string;
  tema: string;
  nomeAluno?: string;
  numero?: string;
  sala?: string;
  turma?: string;
  curso?: string;
  disciplina?: string;
  nomeDocente?: string;
  localidade?: string;
  anoLectivo?: string;
  classe?: string;
  nomesIntegrantes?: string[];
  modalidade?: "individual" | "grupo";
}

const ANGOLA_COAT_OF_ARMS_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Coat_of_arms_of_Angola.svg/200px-Coat_of_arms_of_Angola.svg.png";

const EMPTY_CONTENT_MESSAGE = "Sem conteúdo suficiente para exportar.";

async function fetchImageAsBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch {
    return null;
  }
}

function decodeBasicHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function sanitizeTextForDocx(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\u00A0/g, " ");
}

function stripHtmlTags(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|h1|h2|h3|h4|h5|h6)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
}

function normalizeExportText(content: string): string {
  const stripped = stripHtmlTags(content || "");
  return sanitizeTextForDocx(decodeBasicHtmlEntities(stripped))
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function applyInlineBold(value: string): string {
  return escapeHtml(value).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function toSafeDocx(value?: string): string {
  return sanitizeTextForDocx((value || "").trim());
}

function createCoverPageParagraphs(data: CoverPageData, coatOfArmsBuffer: ArrayBuffer | null): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  if (coatOfArmsBuffer) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new ImageRun({
            data: coatOfArmsBuffer,
            transformation: { width: 80, height: 80 },
            type: "png",
          }),
        ],
      })
    );
  }

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: "República de Angola", size: 22, font: "Times New Roman" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: "Ministério da Educação", size: 22, font: "Times New Roman" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [new TextRun({ text: toSafeDocx(data.nomeEscola) || "Instituto de Ensino", size: 22, font: "Times New Roman" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, space: 10, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 6, space: 10, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 6, space: 10, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 6, space: 10, color: "000000" },
      },
      children: [new TextRun({ text: toSafeDocx(data.tipoTrabalho).toUpperCase(), bold: true, size: 48, font: "Times New Roman" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 80 },
      children: [new TextRun({ text: "TEMA:", size: 24, font: "Times New Roman" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: toSafeDocx(data.tema).toUpperCase(), size: 24, font: "Times New Roman" })],
    }),
    new Paragraph({ spacing: { after: 200 }, children: [] })
  );

  const addInfoLine = (label: string, value: string) => {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: `${label}: `, bold: true, size: 22, font: "Times New Roman" }),
          new TextRun({ text: toSafeDocx(value), size: 22, font: "Times New Roman" }),
        ],
      })
    );
  };

  if (data.modalidade === "grupo" && data.nomesIntegrantes && data.nomesIntegrantes.length > 0) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: "Integrantes:", bold: true, size: 22, font: "Times New Roman" })],
      })
    );

    data.nomesIntegrantes.filter(Boolean).forEach((nome, i) => {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 40 },
          indent: { left: 360 },
          children: [new TextRun({ text: `${i + 1}. ${toSafeDocx(nome)}`, size: 22, font: "Times New Roman" })],
        })
      );
    });
  } else if (data.nomeAluno) {
    addInfoLine("Nome", data.nomeAluno);
  }

  if (data.numero) addInfoLine("Nº", data.numero);
  if (data.sala) addInfoLine("Sala", data.sala);
  if (data.turma) addInfoLine("Turma", data.turma);
  if (data.curso) addInfoLine("Curso", data.curso);
  if (data.disciplina) addInfoLine("Disciplina", data.disciplina);
  if (data.classe) addInfoLine("Classe", data.classe);

  paragraphs.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

  if (data.nomeDocente) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 100, after: 40 },
        children: [new TextRun({ text: "ORIENTADOR", bold: true, size: 22, font: "Times New Roman", underline: {} })],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200 },
        children: [new TextRun({ text: toSafeDocx(data.nomeDocente), size: 22, font: "Times New Roman" })],
      })
    );
  }

  paragraphs.push(
    new Paragraph({ spacing: { after: 400 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: `${toSafeDocx(data.nomeEscola) || "Instituto de Ensino"}, ${toSafeDocx(data.localidade) || "Luanda - Angola"}, ${toSafeDocx(data.anoLectivo) || "2025/2026"}`,
          size: 20,
          font: "Times New Roman",
        }),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] })
  );

  return paragraphs;
}

function parseMarkdownToParagraphs(markdown: string): Paragraph[] {
  const lines = normalizeExportText(markdown).split("\n");
  const paragraphs: Paragraph[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      paragraphs.push(new Paragraph({ text: "" }));
      continue;
    }

    if (trimmed.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: trimmed.replace(/^###\s*/, "").replace(/\*\*/g, ""), bold: true, size: 24, font: "Times New Roman" })],
          spacing: { before: 240, after: 120 },
        })
      );
      // Adicionar parágrafo vazio após heading para garantir separação
      if (i + 1 < lines.length && lines[i + 1].trim() && !lines[i + 1].trim().startsWith("#")) {
        paragraphs.push(new Paragraph({ text: "", spacing: { after: 60 } }));
      }
      continue;
    }

    if (trimmed.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: trimmed.replace(/^##\s*/, "").replace(/\*\*/g, ""), bold: true, size: 28, font: "Times New Roman" })],
          spacing: { before: 360, after: 120 },
        })
      );
      // Adicionar parágrafo vazio após heading para garantir separação
      if (i + 1 < lines.length && lines[i + 1].trim() && !lines[i + 1].trim().startsWith("#")) {
        paragraphs.push(new Paragraph({ text: "", spacing: { after: 60 } }));
      }
      continue;
    }

    if (trimmed.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: trimmed.replace(/^#\s*/, "").replace(/\*\*/g, ""), bold: true, size: 32, font: "Times New Roman" })],
          spacing: { before: 480, after: 200 },
        })
      );
      // Adicionar parágrafo vazio após heading para garantir separação
      if (i + 1 < lines.length && lines[i + 1].trim() && !lines[i + 1].trim().startsWith("#")) {
        paragraphs.push(new Paragraph({ text: "", spacing: { after: 60 } }));
      }
      continue;
    }

    if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.replace(/\*\*/g, ""), bold: true, size: 26, font: "Times New Roman" })],
          spacing: { before: 360, after: 120 },
          alignment: trimmed.replace(/\*\*/g, "").length < 40 ? AlignmentType.CENTER : AlignmentType.LEFT,
        })
      );
      continue;
    }

    if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      const content = trimmed.replace(/^[*\-•]\s*/, "");
      const runs: TextRun[] = [];
      const parts = content.split(/(\*\*[^*]+\*\*)/g);

      for (const part of parts) {
        if (!part) continue;
        if (part.startsWith("**") && part.endsWith("**")) {
          runs.push(new TextRun({ text: part.replace(/\*\*/g, ""), bold: true, size: 22, font: "Times New Roman" }));
        } else {
          runs.push(new TextRun({ text: part, size: 22, font: "Times New Roman" }));
        }
      }

      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: "• ", size: 22, font: "Times New Roman" }), ...runs],
          spacing: { before: 60, after: 60 },
          indent: { left: 720 },
        })
      );
      continue;
    }

    const runs: TextRun[] = [];
    const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
    for (const part of parts) {
      if (!part) continue;
      if (part.startsWith("**") && part.endsWith("**")) {
        runs.push(new TextRun({ text: part.replace(/\*\*/g, ""), bold: true, size: 22, font: "Times New Roman" }));
      } else {
        runs.push(new TextRun({ text: part, size: 22, font: "Times New Roman" }));
      }
    }

    paragraphs.push(
      new Paragraph({
        children: runs,
        spacing: { before: 60, after: 60 },
        alignment: AlignmentType.JUSTIFIED,
      })
    );
  }

  return paragraphs;
}

export async function exportToWord(content: string, filename: string, coverData?: CoverPageData) {
  showExportOverlay("A gerar ficheiro Word...");

  try {
    const normalizedContent = normalizeExportText(content);
    if (!normalizedContent) {
      const { toast } = await import("sonner");
      toast.error(EMPTY_CONTENT_MESSAGE);
      return;
    }

    const coatOfArmsBuffer = await fetchImageAsBuffer(ANGOLA_COAT_OF_ARMS_URL);
    const coverParagraphs = coverData ? createCoverPageParagraphs(coverData, coatOfArmsBuffer) : [];
    const contentParagraphs = parseMarkdownToParagraphs(normalizedContent);

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
              borders: coverData
                ? {
                    pageBorderTop: { style: BorderStyle.DOUBLE, size: 6, space: 24, color: "000080" },
                    pageBorderBottom: { style: BorderStyle.DOUBLE, size: 6, space: 24, color: "000080" },
                    pageBorderLeft: { style: BorderStyle.DOUBLE, size: 6, space: 24, color: "000080" },
                    pageBorderRight: { style: BorderStyle.DOUBLE, size: 6, space: 24, color: "000080" },
                  }
                : undefined,
            },
          },
          children: [...coverParagraphs, ...contentParagraphs],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${filename}.docx`);
  } finally {
    hideExportOverlay();
  }
}

function generateCoverPageHTML(data: CoverPageData): string {
  const e = escapeHtml;

  const studentsHTML =
    data.modalidade === "grupo" && data.nomesIntegrantes
      ? `<p style="margin:4px 0"><strong>Integrantes:</strong></p>${data.nomesIntegrantes
          .filter(Boolean)
          .map((n, i) => `<p style="margin:2px 0 2px 20px">${i + 1}. ${e(n)}</p>`)
          .join("")}`
      : data.nomeAluno
      ? `<p style="margin:4px 0"><strong>Nome:</strong> ${e(data.nomeAluno)}</p>`
      : "";

  return `
    <div data-pdf-section style="font-family: 'Times New Roman', serif; width: 100%; min-height: 1050px; border: 3px double #000080; padding: 40px 50px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; position: relative; page-break-after: always; break-inside: avoid;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${ANGOLA_COAT_OF_ARMS_URL}" style="width: 70px; height: 70px; margin-bottom: 8px;" crossorigin="anonymous" />
        <p style="margin: 4px 0; font-size: 13pt;">República de Angola</p>
        <p style="margin: 4px 0; font-size: 13pt;">Ministério da Educação</p>
        <p style="margin: 4px 0; font-size: 13pt;">${e(data.nomeEscola || "Instituto de Ensino")}</p>
      </div>

      <div style="border: 2px solid #000; padding: 30px 40px; margin: 20px 0; text-align: center; width: 85%;">
        <h1 style="font-size: 28pt; font-weight: bold; margin: 0; letter-spacing: 2px;">${e(data.tipoTrabalho.toUpperCase())}</h1>
      </div>

      <div style="text-align: center; margin: 15px 0 30px;">
        <p style="margin: 6px 0; font-size: 13pt;">TEMA:</p>
        <p style="margin: 6px 0; font-size: 13pt; font-weight: 500;">${e(data.tema.toUpperCase())}</p>
      </div>

      <div style="width: 100%; text-align: left; margin-top: auto; font-size: 11pt; line-height: 1.8;">
        ${studentsHTML}
        ${data.numero ? `<p style="margin:4px 0"><strong>Nº:</strong> ${e(data.numero)}</p>` : ""}
        ${data.sala ? `<p style="margin:4px 0"><strong>Sala:</strong> ${e(data.sala)}</p>` : ""}
        ${data.turma ? `<p style="margin:4px 0"><strong>Turma:</strong> ${e(data.turma)}</p>` : ""}
        ${data.curso ? `<p style="margin:4px 0"><strong>Curso:</strong> ${e(data.curso)}</p>` : ""}
        ${data.disciplina ? `<p style="margin:4px 0"><strong>Disciplina:</strong> ${e(data.disciplina)}</p>` : ""}
        ${data.classe ? `<p style="margin:4px 0"><strong>Classe:</strong> ${e(data.classe)}</p>` : ""}
      </div>

      ${
        data.nomeDocente
          ? `
        <div style="width: 100%; text-align: right; margin-top: 20px; font-size: 11pt;">
          <p style="margin:4px 0"><strong><u>ORIENTADOR</u></strong></p>
          <p style="margin:4px 0">${e(data.nomeDocente)}</p>
        </div>
      `
          : ""
      }

      <div style="text-align: center; margin-top: auto; padding-top: 30px; font-size: 10pt; color: #333;">
        <p>${e(data.nomeEscola || "Instituto de Ensino")}, ${e(data.localidade || "Luanda - Angola")}, ${e(data.anoLectivo || "2025/2026")}</p>
      </div>
    </div>
  `;
}

async function imageToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function buildPdfBodyHtml(content: string): string {
  const lines = normalizeExportText(content).split("\n");
  const chunks: string[] = [];
  let listOpen = false;

  const closeList = () => {
    if (listOpen) {
      chunks.push("</ul>");
      listOpen = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      chunks.push('<div style="height:8px"></div>');
      continue;
    }

    if (line.startsWith("### ")) {
      closeList();
      chunks.push(`<h3 data-pdf-section style="font-size:14pt;margin:14px 0 8px;break-inside:avoid;">${applyInlineBold(line.replace(/^###\s*/, ""))}</h3>`);
      // Adicionar espaço após heading para garantir separação do primeiro parágrafo
      chunks.push('<div style="height:6px"></div>');
      continue;
    }

    if (line.startsWith("## ")) {
      closeList();
      chunks.push(`<h2 data-pdf-section style="font-size:16pt;margin:18px 0 10px;break-inside:avoid;">${applyInlineBold(line.replace(/^##\s*/, ""))}</h2>`);
      // Adicionar espaço após heading para garantir separação do primeiro parágrafo
      chunks.push('<div style="height:6px"></div>');
      continue;
    }

    if (line.startsWith("# ")) {
      closeList();
      chunks.push(`<h1 data-pdf-section style="font-size:18pt;margin:24px 0 12px;text-align:center;break-inside:avoid;">${applyInlineBold(line.replace(/^#\s*/, ""))}</h1>`);
      // Adicionar espaço após heading para garantir separação do primeiro parágrafo
      chunks.push('<div style="height:6px"></div>');
      continue;
    }

    if (/^[-*•]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      const item = line.replace(/^[-*•]\s+/, "").replace(/^\d+[.)]\s+/, "");
      if (!listOpen) {
        chunks.push('<ul style="margin:0 0 10px 22px;padding:0;">');
        listOpen = true;
      }
      chunks.push(`<li data-pdf-section style="margin:0 0 5px;break-inside:avoid;">${applyInlineBold(item)}</li>`);
      continue;
    }

    closeList();
    chunks.push(`<p data-pdf-section style="margin:0 0 10px;text-align:justify;break-inside:avoid;">${applyInlineBold(line)}</p>`);
  }

  closeList();

  if (chunks.length === 0) {
    return `<p>${escapeHtml(EMPTY_CONTENT_MESSAGE)}</p>`;
  }

  return chunks.join("");
}

export async function exportToPDF(content: string, filename: string, coverData?: CoverPageData) {
  const normalizedContent = normalizeExportText(content);
  if (!normalizedContent) {
    const { toast } = await import("sonner");
    toast.error(EMPTY_CONTENT_MESSAGE);
    return;
  }

  try {
    let coverHtml = "";
    if (coverData) {
      let cover = generateCoverPageHTML(coverData);
      const coatDataUrl = await imageToDataUrl(ANGOLA_COAT_OF_ARMS_URL);

      if (coatDataUrl) {
        cover = cover.replace(ANGOLA_COAT_OF_ARMS_URL, coatDataUrl);
      } else {
        cover = cover.replace(/<img[^>]*>/g, "");
      }

      coverHtml = cover;
    }

    const bodyHtml = `
      <div data-pdf-section style="padding:40px 50px;font-family:'Times New Roman',serif;font-size:12pt;line-height:1.65;color:#000;background:#fff;">
        ${buildPdfBodyHtml(normalizedContent)}
      </div>
    `;

    await exportHtmlToPdf({
      html: `${coverHtml}${bodyHtml}`,
      filename: `${filename}.pdf`,
      overlayMessage: "A gerar ficheiro PDF...",
      containerWidth: 794,
      padding: "0",
    });
  } catch (err) {
    console.error("PDF export error:", err);
    throw err;
  }
}
