/**
 * PDF export helper — manual html2canvas + jsPDF pipeline with multi-page support.
 */
import { showExportOverlay, hideExportOverlay } from "@/components/ExportOverlay";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface PdfExportOptions {
  html?: string;
  element?: HTMLElement;
  /** When true and `element` is provided, deep-clone it (preserving inline styles) before staging. */
  cloneElement?: boolean;
  filename: string;
  overlayMessage?: string;
  containerWidth?: number;
  padding?: string;
  orientation?: "portrait" | "landscape";
  format?: "a4" | "a3";
  scale?: number;
  margin?: number[];
}

// Dimensions in mm
const DIMENSIONS = {
  a4: { w: 210, h: 297 },
  a3: { w: 297, h: 420 },
};

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalHeight > 0) return resolve();
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
}

export async function exportHtmlToPdf({
  html,
  element,
  cloneElement = false,
  filename,
  overlayMessage = "A gerar ficheiro PDF...",
  containerWidth = 794,
  padding = "48px 56px",
  orientation = "portrait",
  format = "a4",
  scale = 3, // Increased for higher resolution
  margin = [10, 10, 10, 10],
}: PdfExportOptions) {
  showExportOverlay(overlayMessage);
  let container: HTMLDivElement | null = null;

  try {
    if (!html && !element) {
      const { toast } = await import("sonner");
      toast.error("Sem conteúdo para exportar.");
      return;
    }

    // Create staging container — positioned off-screen but VISIBLE
    container = document.createElement("div");
    container.style.cssText = [
      "font-family: 'SF Pro Display', 'Open Sans', system-ui, sans-serif",
      "font-size: 12pt",
      "line-height: 1.6",
      "color: #000",
      "background: #fff",
      `width: ${containerWidth}px`,
      `padding: ${padding}`,
      "position: fixed",
      "top: 0",
      "left: -9999px",
      "z-index: -1",
      "opacity: 1",
      "pointer-events: none",
      "box-sizing: border-box",
      "overflow: visible",
    ].join(";");

    if (element) {
      const node = cloneElement ? (element.cloneNode(true) as HTMLElement) : element;
      container.appendChild(node);
    } else if (html && html.trim().length >= 10) {
      container.innerHTML = html;
    }

    document.body.appendChild(container);

    // Force styles for high-fidelity capture
    const allElements = container.querySelectorAll("*");
    allElements.forEach((child) => {
      const el = child as HTMLElement;
      el.style.transition = "none";
      el.style.animation = "none";
      // Ensure text doesn't overflow
      if (el.tagName === "SPAN" || el.tagName === "P" || el.tagName === "DIV") {
        el.style.maxWidth = "100%";
      }
    });
    
    // Ocultar elementos de guia de página (linhas de quebra de página) durante a exportação
    const pageGuides = container.querySelectorAll('[data-page-guide="true"]');
    pageGuides.forEach((guide) => {
      (guide as HTMLElement).style.display = 'none';
    });
    
    // Remover elementos duplicados de cabeçalho (Header) e outras duplicações
    // Procura por divs com estilos de cabeçalho (text-align:center com border-bottom)
    const allDivs = container.querySelectorAll('div');
    const headerDivs: HTMLElement[] = [];
    
    allDivs.forEach((div) => {
      const style = (div as HTMLElement).getAttribute('style') || '';
      // Identifica divs que parecem ser cabeçalhos (text-align:center com border-bottom)
      if (style.includes('text-align:center') && style.includes('border-bottom') && style.includes('margin-bottom:18px')) {
        headerDivs.push(div as HTMLElement);
      }
    });
    
    // Se houver múltiplos cabeçalhos, oculta todos exceto o primeiro
    if (headerDivs.length > 1) {
      for (let i = 1; i < headerDivs.length; i++) {
        headerDivs[i].style.display = 'none';
      }
    }

    // Wait for fonts and images
    await document.fonts.ready;
    await waitForImages(container);

    // Multiple rAF + delay to ensure browser has painted
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    await new Promise<void>((r) => setTimeout(r, 1000));

    const contentWidth = container.scrollWidth;
    const contentHeight = container.scrollHeight;

    // Capture with html2canvas
    const html2canvas = (await import("html2canvas")).default;
    
    // Para garantir que o break-inside: avoid funcione, precisamos capturar o elemento de forma que o navegador respeite as quebras.
    // No entanto, o html2canvas captura um snapshot estático. 
    // A melhor abordagem para múltiplas páginas com html2canvas é capturar página por página se possível, 
    // ou capturar o todo e fatiar inteligentemente.
    
    const canvas = await html2canvas(container, {
      scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: contentWidth,
      height: contentHeight,
      scrollX: 0,
      scrollY: 0,
      windowWidth: contentWidth,
      windowHeight: contentHeight,
      onclone: (clonedDoc) => {
        // Garante que o elemento clonado tenha os estilos de quebra de página
        const clonedContainer = clonedDoc.body.querySelector('[style*="left: -9999px"]') as HTMLElement;
        if (clonedContainer) {
          clonedContainer.style.position = "relative";
          clonedContainer.style.left = "0";
        }
      }
    });

    if (canvas.width < 10 || canvas.height < 10) {
      const { toast } = await import("sonner");
      toast.error("Captura vazia — tente novamente.");
      return;
    }

    // Build PDF with jsPDF
    const { jsPDF } = await import("jspdf");

    const isLandscape = orientation === "landscape";
    const dims = DIMENSIONS[format];
    const pageW = isLandscape ? dims.h : dims.w;
    const pageH = isLandscape ? dims.w : dims.h;

    const [mTop, mRight, mBottom, mLeft] = margin;
    const usableW = pageW - mLeft - mRight;
    const usableH = pageH - mTop - mBottom;

    const pxPerMm = canvas.width / usableW;
    const pageHeightPx = usableH * pxPerMm;

    // Calcula o número total de páginas com base na altura real do conteúdo
    const totalPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));

    const pdf = new jsPDF({
      orientation: isLandscape ? "landscape" : "portrait",
      unit: "mm",
      format: format,
      compress: true
    });

    // Lógica de fatiamento inteligente para evitar cortar elementos ao meio
    let currentY = 0;
    const totalHeight = canvas.height;
    
    while (currentY < totalHeight) {
      if (currentY > 0) {
        pdf.addPage();
      }

      // Tenta encontrar a melhor quebra de página
      // Como estamos usando um canvas, não temos acesso direto aos elementos DOM aqui.
      // No entanto, podemos analisar o canvas para encontrar linhas "vazias" (brancas) perto do limite da página.
      
      let bestBreakY = currentY + pageHeightPx;
      if (bestBreakY > totalHeight) bestBreakY = totalHeight;
      
      // Se não for a última página, tenta recuar um pouco para encontrar um espaço em branco
      if (bestBreakY < totalHeight) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const scanRange = Math.min(100 * scale, pageHeightPx * 0.2); // Procura nos últimos 20% da página
          const startScanY = bestBreakY - scanRange;
          
          for (let y = bestBreakY; y > startScanY; y -= 2 * scale) {
            const imageData = ctx.getImageData(0, y, canvas.width, 1).data;
            let isWhiteLine = true;
            for (let i = 0; i < imageData.length; i += 4) {
              // Se não for branco (ou quase branco)
              if (imageData[i] < 250 || imageData[i+1] < 250 || imageData[i+2] < 250) {
                isWhiteLine = false;
                break;
              }
            }
            if (isWhiteLine) {
              bestBreakY = y;
              break;
            }
          }
        }
      }

      const srcH = bestBreakY - currentY;
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = pageHeightPx;
      const pctx = pageCanvas.getContext("2d");
      
      if (pctx) {
        pctx.fillStyle = "#ffffff";
        pctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pctx.drawImage(
          canvas, 
          0, currentY, 
          canvas.width, srcH, 
          0, 0, 
          canvas.width, srcH
        );

        const imgData = pageCanvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(
          imgData, 
          "JPEG", 
          mLeft, 
          mTop, 
          usableW, 
          usableH, 
          undefined, 
          'FAST'
        );
      }

      currentY = bestBreakY;
    }

    pdf.save(filename);

    const { toast } = await import("sonner");
    toast.success("PDF gerado com sucesso!");
  } catch (err) {
    console.error("PDF export error:", err);
    const { toast } = await import("sonner");
    toast.error("Erro ao exportar PDF");
  } finally {
    if (container?.parentNode) container.parentNode.removeChild(container);
    hideExportOverlay();
  }
}
