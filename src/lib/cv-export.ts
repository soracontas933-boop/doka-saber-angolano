import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun, BorderStyle } from "docx";
import { saveAs } from "file-saver";
import { showExportOverlay, hideExportOverlay } from "@/components/ExportOverlay";
import { exportHtmlToPdf } from "@/lib/pdf-export-helper";
import type { CVData, CVTemplate } from "@/types/cv";
import { toast } from "sonner";

export async function exportCVToPdf(data: CVData, template: CVTemplate) {
  const wrapper = document.getElementById("cv-preview-capture");
  if (!wrapper || !wrapper.innerHTML.trim()) {
    toast.error("Preencha os dados do CV antes de exportar.");
    return;
  }

  // The actual A4 page is the inner div (sibling of any scale transform)
  const innerPage = wrapper.querySelector<HTMLElement>(".bg-white.shadow-xl") || (wrapper.firstElementChild as HTMLElement);
  if (!innerPage) {
    toast.error("Erro ao localizar o conteúdo do CV.");
    return;
  }

  // Save original styles so we can restore them after capture
  const originalInnerTransform = innerPage.style.transform;
  const originalInnerTransformOrigin = innerPage.style.transformOrigin;
  const originalInnerBoxShadow = innerPage.style.boxShadow;
  const originalWrapperHeight = wrapper.style.height;
  const originalWrapperOverflow = wrapper.style.overflow;

  // Temporarily remove the preview scale so html2canvas captures at true A4 size
  innerPage.style.transform = "none";
  innerPage.style.transformOrigin = "top left";
  innerPage.style.boxShadow = "none";
  wrapper.style.height = "auto";
  wrapper.style.overflow = "visible";

  const filename = `delle-cv-${data.nomeCompleto?.replace(/\s+/g, "-").toLowerCase() || "curriculo"}.pdf`;

  try {
    await exportHtmlToPdf({
      element: innerPage,
      cloneElement: true,
      filename,
      overlayMessage: "A gerar CV em PDF...",
      containerWidth: 794,
      padding: "0",
      scale: 2,
      margin: [0, 0, 0, 0],
    });
  } finally {
    // Restore preview styling
    innerPage.style.transform = originalInnerTransform;
    innerPage.style.transformOrigin = originalInnerTransformOrigin;
    innerPage.style.boxShadow = originalInnerBoxShadow;
    wrapper.style.height = originalWrapperHeight;
    wrapper.style.overflow = originalWrapperOverflow;
  }
}

/* ── Word Export ── */
export async function exportCVToWord(data: CVData) {
  showExportOverlay("A gerar CV em Word...");

  try {
    const children: any[] = [];

    // Name
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 100 },
        children: [new TextRun({ text: data.nomeCompleto || "Seu Nome", bold: true, size: 48, font: "Arial" })],
      })
    );

    if (data.titulo) {
      children.push(
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: data.titulo, size: 22, color: "666666", font: "Arial" })],
        })
      );
    }

    // Contact
    const contactParts: string[] = [];
    if (data.email) contactParts.push(`Email: ${data.email}`);
    if (data.telefone) contactParts.push(`Tel: ${data.telefone}`);
    if (data.endereco) contactParts.push(data.endereco);
    if (data.linkedin) contactParts.push(`LinkedIn: ${data.linkedin}`);

    if (contactParts.length > 0) {
      children.push(
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: contactParts.join(" | "), size: 18, color: "888888", font: "Arial" })],
        })
      );
    }

    const addSection = (title: string) => {
      children.push(
        new Paragraph({
          spacing: { before: 300, after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
          children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 22, font: "Arial", color: "1E3A5F" })],
        })
      );
    };

    // Summary
    if (data.resumoProfissional) {
      addSection("Perfil Profissional");
      children.push(
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: data.resumoProfissional, size: 20, font: "Arial" })],
        })
      );
    }

    // Experience
    if (data.experiencias.length > 0) {
      addSection("Experiência Profissional");
      data.experiencias.forEach((exp) => {
        children.push(
          new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ text: exp.cargo, bold: true, size: 20, font: "Arial" })],
          })
        );
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${exp.empresa}${exp.local ? `, ${exp.local}` : ""}`, italics: true, size: 18, font: "Arial", color: "666666" }),
              new TextRun({ text: ` | ${exp.dataInicio} - ${exp.dataFim || "Presente"}`, size: 18, font: "Arial", color: "888888" }),
            ],
          })
        );
        if (exp.descricao) {
          exp.descricao.split("\n").filter(Boolean).forEach((line) => {
            children.push(
              new Paragraph({
                bullet: { level: 0 },
                children: [new TextRun({ text: line, size: 18, font: "Arial" })],
              })
            );
          });
        }
      });
    }

    // Education
    if (data.formacoes.length > 0) {
      addSection("Formação Académica");
      data.formacoes.forEach((f) => {
        children.push(
          new Paragraph({
            spacing: { before: 100 },
            children: [new TextRun({ text: f.curso, bold: true, size: 20, font: "Arial" })],
          })
        );
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${f.instituicao}${f.local ? `, ${f.local}` : ""}`, italics: true, size: 18, font: "Arial", color: "666666" }),
              new TextRun({ text: ` | ${f.dataInicio} - ${f.dataFim || "Presente"}`, size: 18, font: "Arial", color: "888888" }),
            ],
          })
        );
        if (f.descricao) {
          children.push(new Paragraph({ children: [new TextRun({ text: f.descricao, size: 18, font: "Arial" })] }));
        }
      });
    }

    // Skills
    if (data.habilidades.length > 0) {
      addSection("Habilidades");
      data.habilidades.filter(Boolean).forEach((h) => {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: h, size: 18, font: "Arial" })],
          })
        );
      });
    }

    // Languages
    if (data.idiomas.length > 0) {
      addSection("Idiomas");
      data.idiomas.filter((i) => i.idioma).forEach((i) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${i.idioma}`, bold: true, size: 18, font: "Arial" }),
              new TextRun({ text: ` — ${i.nivel}`, size: 18, font: "Arial", color: "666666" }),
            ],
          })
        );
      });
    }

    // Certifications
    if (data.certificacoes.length > 0) {
      addSection("Certificações");
      data.certificacoes.filter((c) => c.nome).forEach((c) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: c.nome, bold: true, size: 18, font: "Arial" }),
              new TextRun({ text: ` — ${c.instituicao}, ${c.ano}`, size: 18, font: "Arial", color: "666666" }),
            ],
          })
        );
      });
    }

    // Projects
    if (data.projetos.length > 0) {
      addSection("Projetos");
      data.projetos.filter((p) => p.nome).forEach((p) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: p.nome, bold: true, size: 18, font: "Arial" }),
              ...(p.descricao ? [new TextRun({ text: ` — ${p.descricao}`, size: 18, font: "Arial" })] : []),
            ],
          })
        );
      });
    }

    const doc = new Document({
      sections: [{
        properties: {
          page: { margin: { top: 1000, right: 1200, bottom: 1000, left: 1200 } },
        },
        children,
      }],
    });

    const buffer = await Packer.toBlob(doc);
    const fname = `delle-cv-${data.nomeCompleto?.replace(/\s+/g, "-").toLowerCase() || "curriculo"}.docx`;
    saveAs(buffer, fname);
    toast.success("CV exportado em Word!");
  } catch (err) {
    console.error("CV Word export error:", err);
    toast.error("Erro ao exportar CV em Word");
  } finally {
    hideExportOverlay();
  }
}
