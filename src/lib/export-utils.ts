import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, PageBreak, ImageRun } from "docx";
import { saveAs } from "file-saver";
import { showExportOverlay, hideExportOverlay } from "@/components/ExportOverlay";

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

// ─── Angola Coat of Arms URL ─────────────────────────────────────
const ANGOLA_COAT_OF_ARMS_URL = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Coat_of_arms_of_Angola.svg/200px-Coat_of_arms_of_Angola.svg.png";

async function fetchImageAsBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(url);
    return await response.arrayBuffer();
  } catch {
    return null;
  }
}

function createCoverPageParagraphs(data: CoverPageData, coatOfArmsBuffer: ArrayBuffer | null): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Coat of arms image
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

  // República de Angola
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: "República de Angola", size: 22, font: "Times New Roman" })],
    })
  );

  // Ministério da Educação
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: "Ministério da Educação", size: 22, font: "Times New Roman" })],
    })
  );

  // School name
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [new TextRun({ text: data.nomeEscola || "Instituto de Ensino", size: 22, font: "Times New Roman" })],
    })
  );

  // Type of work (big bold centered with border)
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, space: 10, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 6, space: 10, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 6, space: 10, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 6, space: 10, color: "000000" },
      },
      children: [
        new TextRun({ text: data.tipoTrabalho.toUpperCase(), bold: true, size: 48, font: "Times New Roman" }),
      ],
    })
  );

  // TEMA:
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 80 },
      children: [new TextRun({ text: "TEMA:", size: 24, font: "Times New Roman" })],
    })
  );

  // Theme title
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: data.tema.toUpperCase(), size: 24, font: "Times New Roman" })],
    })
  );

  // Empty space
  paragraphs.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

  // Student info section
  const addInfoLine = (label: string, value: string) => {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({ text: `${label}: `, bold: true, size: 22, font: "Times New Roman" }),
          new TextRun({ text: value, size: 22, font: "Times New Roman" }),
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
          children: [new TextRun({ text: `${i + 1}. ${nome}`, size: 22, font: "Times New Roman" })],
        })
      );
    });
  } else {
    if (data.nomeAluno) addInfoLine("Nome", data.nomeAluno);
  }

  if (data.numero) addInfoLine("Nº", data.numero);
  if (data.sala) addInfoLine("Sala", data.sala);
  if (data.turma) addInfoLine("Turma", data.turma);
  if (data.curso) addInfoLine("Curso", data.curso);
  if (data.disciplina) addInfoLine("Disciplina", data.disciplina);
  if (data.classe) addInfoLine("Classe", data.classe);

  // Empty space
  paragraphs.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

  // Orientador (right-aligned)
  if (data.nomeDocente) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 100, after: 40 },
        children: [new TextRun({ text: "ORIENTADOR", bold: true, size: 22, font: "Times New Roman", underline: {} })],
      })
    );
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200 },
        children: [new TextRun({ text: data.nomeDocente, size: 22, font: "Times New Roman" })],
      })
    );
  }

  // Empty space
  paragraphs.push(new Paragraph({ spacing: { after: 400 }, children: [] }));

  // Footer: school + year
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
      children: [
        new TextRun({
          text: `${data.nomeEscola || "Instituto de Ensino"}, ${data.localidade || "Luanda - Angola"}, ${data.anoLectivo || "2025/2026"}`,
          size: 20,
          font: "Times New Roman",
        }),
      ],
    })
  );

  // Page break after cover
  paragraphs.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  return paragraphs;
}

function parseMarkdownToParagraphs(text: string): Paragraph[] {
  const lines = text.split("\n");
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
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
    } else if (trimmed.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: trimmed.replace(/^##\s*/, "").replace(/\*\*/g, ""), bold: true, size: 28, font: "Times New Roman" })],
          spacing: { before: 360, after: 120 },
        })
      );
    } else if (trimmed.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: trimmed.replace(/^#\s*/, "").replace(/\*\*/g, ""), bold: true, size: 32, font: "Times New Roman" })],
          spacing: { before: 480, after: 200 },
        })
      );
    } else if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.replace(/\*\*/g, ""), bold: true, size: 26, font: "Times New Roman" })],
          spacing: { before: 360, after: 120 },
          alignment: trimmed.replace(/\*\*/g, "").length < 40 ? AlignmentType.CENTER : AlignmentType.LEFT,
        })
      );
    } else if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      const content = trimmed.replace(/^[*-]\s*/, "");
      const runs: TextRun[] = [];
      const parts = content.split(/(\*\*[^*]+\*\*)/g);
      for (const part of parts) {
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
    } else {
      const runs: TextRun[] = [];
      const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
      for (const part of parts) {
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
  }

  return paragraphs;
}

export async function exportToWord(content: string, filename: string, coverData?: CoverPageData) {
  const coatOfArmsBuffer = await fetchImageAsBuffer(ANGOLA_COAT_OF_ARMS_URL);
  const coverParagraphs = coverData ? createCoverPageParagraphs(coverData, coatOfArmsBuffer) : [];
  const contentParagraphs = parseMarkdownToParagraphs(content);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
            borders: coverData ? {
              pageBorderTop: { style: BorderStyle.DOUBLE, size: 6, space: 24, color: "000080" },
              pageBorderBottom: { style: BorderStyle.DOUBLE, size: 6, space: 24, color: "000080" },
              pageBorderLeft: { style: BorderStyle.DOUBLE, size: 6, space: 24, color: "000080" },
              pageBorderRight: { style: BorderStyle.DOUBLE, size: 6, space: 24, color: "000080" },
            } : undefined,
          },
        },
        children: [...coverParagraphs, ...contentParagraphs],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}

function generateCoverPageHTML(data: CoverPageData): string {
  const studentsHTML = data.modalidade === "grupo" && data.nomesIntegrantes
    ? `<p style="margin:4px 0"><strong>Integrantes:</strong></p>` +
      data.nomesIntegrantes.filter(Boolean).map((n, i) => `<p style="margin:2px 0 2px 20px">${i + 1}. ${n}</p>`).join("")
    : data.nomeAluno ? `<p style="margin:4px 0"><strong>Nome:</strong> ${data.nomeAluno}</p>` : "";

  return `
    <div style="font-family: 'Times New Roman', serif; width: 100%; min-height: 1050px; border: 3px double #000080; padding: 40px 50px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; position: relative; page-break-after: always;">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${ANGOLA_COAT_OF_ARMS_URL}" style="width: 70px; height: 70px; margin-bottom: 8px;" crossorigin="anonymous" />
        <p style="margin: 4px 0; font-size: 13pt;">República de Angola</p>
        <p style="margin: 4px 0; font-size: 13pt;">Ministério da Educação</p>
        <p style="margin: 4px 0; font-size: 13pt;">${data.nomeEscola || "Instituto de Ensino"}</p>
      </div>
      
      <div style="border: 2px solid #000; padding: 30px 40px; margin: 20px 0; text-align: center; width: 85%;">
        <h1 style="font-size: 28pt; font-weight: bold; margin: 0; letter-spacing: 2px;">${data.tipoTrabalho.toUpperCase()}</h1>
      </div>

      <div style="text-align: center; margin: 15px 0 30px;">
        <p style="margin: 6px 0; font-size: 13pt;">TEMA:</p>
        <p style="margin: 6px 0; font-size: 13pt; font-weight: 500;">${data.tema.toUpperCase()}</p>
      </div>

      <div style="width: 100%; text-align: left; margin-top: auto; font-size: 11pt; line-height: 1.8;">
        ${studentsHTML}
        ${data.numero ? `<p style="margin:4px 0"><strong>Nº</strong> ${data.numero}</p>` : ""}
        ${data.sala ? `<p style="margin:4px 0"><strong>Sala:</strong> ${data.sala}</p>` : ""}
        ${data.turma ? `<p style="margin:4px 0"><strong>Turma:</strong> ${data.turma}</p>` : ""}
        ${data.curso ? `<p style="margin:4px 0"><strong>Curso:</strong> ${data.curso}</p>` : ""}
        ${data.disciplina ? `<p style="margin:4px 0"><strong>Disciplina:</strong> ${data.disciplina}</p>` : ""}
        ${data.classe ? `<p style="margin:4px 0"><strong>Classe:</strong> ${data.classe}</p>` : ""}
      </div>

      ${data.nomeDocente ? `
        <div style="width: 100%; text-align: right; margin-top: 20px; font-size: 11pt;">
          <p style="margin:4px 0"><strong><u>ORIENTADOR</u></strong></p>
          <p style="margin:4px 0">${data.nomeDocente}</p>
        </div>
      ` : ""}

      <div style="text-align: center; margin-top: auto; padding-top: 30px; font-size: 10pt; color: #333;">
        <p>${data.nomeEscola || "Instituto de Ensino"}, ${data.localidade || "Luanda - Angola"}, ${data.anoLectivo || "2025/2026"}</p>
      </div>
    </div>
  `;
}

export async function exportToPDF(content: string, filename: string, coverData?: CoverPageData) {
  const container = document.createElement("div");
  container.style.cssText = "font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #000; max-width: 700px;";

  // Cover page
  if (coverData) {
    container.innerHTML = generateCoverPageHTML(coverData);
  }

  // Content
  const contentDiv = document.createElement("div");
  contentDiv.style.cssText = "padding: 40px;";
  const html = content
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.+)$/gm, '<h3 style="font-size: 14pt; margin-top: 18px; margin-bottom: 8px;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size: 16pt; margin-top: 24px; margin-bottom: 10px;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size: 18pt; margin-top: 30px; margin-bottom: 12px; text-align: center;">$1</h1>')
    .replace(/^\* (.+)$/gm, '<li style="margin-left: 20px;">$1</li>')
    .replace(/^- (.+)$/gm, '<li style="margin-left: 20px;">$1</li>')
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");

  contentDiv.innerHTML = html;
  container.appendChild(contentDiv);
  document.body.appendChild(container);

  const html2pdf = (await import("html2pdf.js")).default;

  await html2pdf()
    .set({
      margin: [15, 15, 15, 15],
      filename: `${filename}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    } as any)
    .from(container)
    .save();

  document.body.removeChild(container);
}
