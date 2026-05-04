/**
 * Exporta múltiplos elementos DOM (cada um representando 1 página A4) para um único PDF.
 * Garante fidelidade 1:1 com a pré-visualização do editor.
 */
import { showExportOverlay, hideExportOverlay } from "@/components/ExportOverlay";

export interface MultiPagePdfOptions {
  pages: HTMLElement[];
  filename: string;
  orientation?: "portrait" | "landscape";
  format?: "a4";
  scale?: number;
  overlayMessage?: string;
}

const A4 = { w: 210, h: 297 };

async function captureToCanvas(el: HTMLElement, scale: number) {
  const html2canvas = (await import("html2canvas")).default;
  return html2canvas(el, {
    scale,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: el.offsetWidth,
    height: el.offsetHeight,
    windowWidth: el.offsetWidth,
    windowHeight: el.offsetHeight,
  });
}

export async function exportMultiPagePdf({
  pages,
  filename,
  orientation = "portrait",
  scale = 3,
  overlayMessage = "A gerar PDF...",
}: MultiPagePdfOptions) {
  if (!pages.length) return;
  showExportOverlay(overlayMessage);

  try {
    await document.fonts.ready;
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r()))
    );

    const { jsPDF } = await import("jspdf");
    const isLandscape = orientation === "landscape";
    const pageW = isLandscape ? A4.h : A4.w;
    const pageH = isLandscape ? A4.w : A4.h;

    const pdf = new jsPDF({
      orientation: isLandscape ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();
      
      // Força overflow visible antes da captura para garantir que nada seja cortado
      const originalOverflow = pages[i].style.overflow;
      pages[i].style.overflow = 'visible';
      
      try {
        const canvas = await captureToCanvas(pages[i], scale);
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(imgData, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
      } finally {
        pages[i].style.overflow = originalOverflow;
      }
    }

    pdf.save(filename);
    const { toast } = await import("sonner");
    toast.success("PDF gerado com sucesso!");
  } catch (err) {
    console.error("Multi-page PDF export error:", err);
    const { toast } = await import("sonner");
    toast.error("Erro ao exportar PDF");
  } finally {
    hideExportOverlay();
  }
}
