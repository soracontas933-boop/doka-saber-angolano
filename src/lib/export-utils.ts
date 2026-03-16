import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";

function parseMarkdownToParagraphs(text: string): Paragraph[] {
  const lines = text.split("\n");
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      paragraphs.push(new Paragraph({ text: "" }));
      continue;
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: trimmed.replace(/^###\s*/, "").replace(/\*\*/g, ""), bold: true, size: 24 })],
          spacing: { before: 240, after: 120 },
        })
      );
    } else if (trimmed.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: trimmed.replace(/^##\s*/, "").replace(/\*\*/g, ""), bold: true, size: 28 })],
          spacing: { before: 360, after: 120 },
        })
      );
    } else if (trimmed.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: trimmed.replace(/^#\s*/, "").replace(/\*\*/g, ""), bold: true, size: 32 })],
          spacing: { before: 480, after: 200 },
        })
      );
    } else if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
      // Bold-only lines (section titles)
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed.replace(/\*\*/g, ""), bold: true, size: 26 })],
          spacing: { before: 360, after: 120 },
          alignment: trimmed.replace(/\*\*/g, "").length < 40 ? AlignmentType.CENTER : AlignmentType.LEFT,
        })
      );
    } else if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      // Bullet points
      const content = trimmed.replace(/^[*-]\s*/, "");
      const runs: TextRun[] = [];
      // Handle **bold** within bullet
      const parts = content.split(/(\*\*[^*]+\*\*)/g);
      for (const part of parts) {
        if (part.startsWith("**") && part.endsWith("**")) {
          runs.push(new TextRun({ text: part.replace(/\*\*/g, ""), bold: true, size: 22 }));
        } else {
          runs.push(new TextRun({ text: part, size: 22 }));
        }
      }
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: "• ", size: 22 }), ...runs],
          spacing: { before: 60, after: 60 },
          indent: { left: 720 },
        })
      );
    } else {
      // Normal paragraph with inline bold
      const runs: TextRun[] = [];
      const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
      for (const part of parts) {
        if (part.startsWith("**") && part.endsWith("**")) {
          runs.push(new TextRun({ text: part.replace(/\*\*/g, ""), bold: true, size: 22 }));
        } else {
          runs.push(new TextRun({ text: part, size: 22 }));
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

export async function exportToWord(content: string, filename: string) {
  const paragraphs = parseMarkdownToParagraphs(content);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${filename}.docx`);
}

export async function exportToPDF(content: string, filename: string) {
  // Create a styled HTML element for PDF generation
  const container = document.createElement("div");
  container.style.cssText = "font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #000; padding: 40px; max-width: 700px;";

  // Convert markdown-ish content to HTML
  const html = content
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.+)$/gm, '<h3 style="font-size: 14pt; margin-top: 18px; margin-bottom: 8px;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size: 16pt; margin-top: 24px; margin-bottom: 10px;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size: 18pt; margin-top: 30px; margin-bottom: 12px; text-align: center;">$1</h1>')
    .replace(/^\* (.+)$/gm, '<li style="margin-left: 20px;">$1</li>')
    .replace(/^- (.+)$/gm, '<li style="margin-left: 20px;">$1</li>')
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");

  container.innerHTML = html;
  document.body.appendChild(container);

  const html2pdf = (await import("html2pdf.js")).default;

  await html2pdf()
    .set({
      margin: [15, 15, 15, 15],
      filename: `${filename}.pdf`,
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    })
    .from(container)
    .save();

  document.body.removeChild(container);
}
