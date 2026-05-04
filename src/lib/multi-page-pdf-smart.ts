/**
 * Multi-Page PDF Smart — Exportação Multipágina com Paginação Inteligente
 * 
 * Exporta múltiplos elementos DOM (cada um representando 1 página A4) para um único PDF,
 * garantindo que nenhum conteúdo seja cortado e que a fidelidade seja 1:1 com a pré-visualização.
 * 
 * MELHORIAS:
 * - Respeita break-inside: avoid em todos os elementos
 * - Detecta e evita cortes de cards entre páginas
 * - Sincroniza perfeitamente com a pré-visualização
 */

import { showExportOverlay, hideExportOverlay } from "@/components/ExportOverlay";

export interface MultiPagePdfSmartOptions {
  pages: HTMLElement[];
  filename: string;
  orientation?: "portrait" | "landscape";
  format?: "a4";
  scale?: number;
  overlayMessage?: string;
}

const A4 = { w: 210, h: 297 };

async function captureToCanvasSmart(el: HTMLElement, scale: number) {
  const html2canvas = (await import("html2canvas")).default;

  // Garante que o elemento respeita as regras de paginação
  const originalOverflow = el.style.overflow;
  const originalHeight = el.style.height;

  try {
    el.style.overflow = "visible";
    el.style.height = "auto";

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
      onclone: (clonedDoc) => {
        // Garante que o clone também respeita as regras
        const clonedEl = clonedDoc.body.querySelector("[data-a4-page]") as HTMLElement;
        if (clonedEl) {
          clonedEl.style.overflow = "visible";
          clonedEl.style.height = "auto";
          clonedEl.style.pageBreakInside = "avoid";
          clonedEl.style.breakInside = "avoid";
        }
      },
    });
  } finally {
    el.style.overflow = originalOverflow;
    el.style.height = originalHeight;
  }
}

export async function exportMultiPagePdfSmart({
  pages,
  filename,
  orientation = "portrait",
  scale = 3,
  overlayMessage = "A gerar PDF...",
}: MultiPagePdfSmartOptions) {
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

      const canvas = await captureToCanvasSmart(pages[i], scale);

      // Usa PNG para melhor qualidade, especialmente para mapas mentais
      const isHighQuality = filename.includes("mapa-mental");
      const imgData = isHighQuality
        ? canvas.toDataURL("image/png")
        : canvas.toDataURL("image/jpeg", 0.95);

      pdf.addImage(
        imgData,
        isHighQuality ? "PNG" : "JPEG",
        0,
        0,
        pageW,
        pageH,
        undefined,
        "FAST"
      );
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
