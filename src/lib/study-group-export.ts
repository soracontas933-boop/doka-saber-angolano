// Exportação de uma parte individual de um grupo de estudo, em Word ou PDF.
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import { saveAs } from "file-saver";
import { exportHtmlToPdf } from "@/lib/pdf-export-helper";

interface PartExportData {
  grupoNome: string;
  tema: string;
  disciplina: string;
  membroNome: string;
  titulo: string;
  conteudo: string;
  defesa?: {
    resumo?: string;
    pontos_chave?: string[];
    perguntas?: { q: string; a: string }[];
  } | null;
}

function paragraphs(text: string): Paragraph[] {
  return (text || "")
    .split(/\n+/)
    .filter((l) => l.trim().length > 0)
    .map(
      (l) =>
        new Paragraph({
          children: [new TextRun({ text: l.trim(), size: 24 })],
          spacing: { after: 160 },
        }),
    );
}

export async function exportPartToWord(d: PartExportData) {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: d.tema, bold: true, size: 36 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `${d.disciplina} • ${d.grupoNome}`, size: 22 }),
            ],
            spacing: { after: 240 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `Parte de: ${d.membroNome}`, italics: true, size: 22 }),
            ],
            spacing: { after: 480 },
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: d.titulo, bold: true, size: 30 })],
            spacing: { after: 200 },
          }),
          ...paragraphs(d.conteudo),
          ...(d.defesa
            ? [
                new Paragraph({
                  heading: HeadingLevel.HEADING_2,
                  children: [new TextRun({ text: "Defesa Oral", bold: true, size: 28 })],
                  spacing: { before: 360, after: 160 },
                }),
                new Paragraph({
                  children: [new TextRun({ text: "Resumo:", bold: true, size: 24 })],
                }),
                ...paragraphs(d.defesa.resumo || ""),
                new Paragraph({
                  children: [new TextRun({ text: "Pontos-chave:", bold: true, size: 24 })],
                  spacing: { before: 200 },
                }),
                ...(d.defesa.pontos_chave || []).map(
                  (p) =>
                    new Paragraph({
                      children: [new TextRun({ text: `• ${p}`, size: 24 })],
                      spacing: { after: 80 },
                    }),
                ),
                new Paragraph({
                  children: [new TextRun({ text: "Perguntas e Respostas:", bold: true, size: 24 })],
                  spacing: { before: 200 },
                }),
                ...(d.defesa.perguntas || []).flatMap((p) => [
                  new Paragraph({
                    children: [new TextRun({ text: `P: ${p.q}`, bold: true, size: 24 })],
                    spacing: { after: 60 },
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: `R: ${p.a}`, size: 24 })],
                    spacing: { after: 160 },
                  }),
                ]),
              ]
            : []),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${d.tema} - ${d.membroNome}.docx`);
}

export async function exportPartToPDF(d: PartExportData) {
  const html = `
    <div style="font-family: 'Times New Roman', serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #000; background:#fff;">
      <h1 style="text-align:center; font-size: 24px; margin-bottom: 6px;">${escapeHtml(d.tema)}</h1>
      <p style="text-align:center; font-size: 14px; margin-top:0;">${escapeHtml(d.disciplina)} • ${escapeHtml(d.grupoNome)}</p>
      <p style="text-align:center; font-size: 13px; font-style: italic;">Parte de: ${escapeHtml(d.membroNome)}</p>
      <h2 style="font-size: 18px; margin-top: 30px;">${escapeHtml(d.titulo)}</h2>
      <div style="font-size: 14px; line-height: 1.6; text-align: justify;">
        ${(d.conteudo || "")
          .split(/\n+/)
          .filter((p) => p.trim())
          .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
          .join("")}
      </div>
      ${
        d.defesa
          ? `
        <h2 style="font-size: 18px; margin-top: 30px;">Defesa Oral</h2>
        <h3 style="font-size:15px;">Resumo</h3>
        <p style="font-size:14px; line-height:1.6;">${escapeHtml(d.defesa.resumo || "")}</p>
        <h3 style="font-size:15px;">Pontos-chave</h3>
        <ul style="font-size:14px;">
          ${(d.defesa.pontos_chave || []).map((p) => `<li>${escapeHtml(p)}</li>`).join("")}
        </ul>
        <h3 style="font-size:15px;">Perguntas e Respostas</h3>
        ${(d.defesa.perguntas || [])
          .map(
            (p) =>
              `<p style="font-size:14px;"><b>P:</b> ${escapeHtml(p.q)}<br/><b>R:</b> ${escapeHtml(p.a)}</p>`,
          )
          .join("")}
      `
          : ""
      }
    </div>
  `;
  await exportHtmlToPdf(html, `${d.tema} - ${d.membroNome}.pdf`);
}

function escapeHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
