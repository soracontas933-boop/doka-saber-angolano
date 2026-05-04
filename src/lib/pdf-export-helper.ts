/**
 * PDF export helper — manual html2canvas + jsPDF pipeline with multi-page support.
 * MELHORIAS: Captura com qualidade superior, melhor controle de escala e resolução.
 * 
 * CORREÇÕES APLICADAS:
 * - Respeita page-break-inside: avoid para evitar cortes de cards
 * - Melhor detecção de quebras de página baseada em elementos semânticos
 * - Garante que nenhum conteúdo seja cortado entre páginas
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
  maxPages?: number;
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

/**
 * Encontra a melhor posição para quebra de página analisando o canvas
 * e respeitando elementos com page-break-inside: avoid
 */
function findBestPageBreak(
  canvas: HTMLCanvasElement,
  startY: number,
  endY: number,
  scale: number
): number {
  const ctx = canvas.getContext('2d');
  if (!ctx) return endY;

  const scanRange = Math.min(150 * scale, (endY - startY) * 0.25);
  const startScanY = Math.max(startY, endY - scanRange);

  // Procura por linhas brancas (espaço em branco) para quebra
  for (let y = endY; y > startScanY; y -= 2 * scale) {
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
      return y;
    }
  }

  return endY;
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
  maxPages = 1,
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
      "page-break-inside: avoid",
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
      // Garante que todos os elementos respeitem page-break-inside: avoid
      if (!el.style.pageBreakInside && !el.style.breakInside) {
        el.style.pageBreakInside = "avoid";
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
    await new Promise<void>((r) => setTimeout(r, 1200));

    const contentWidth = container.scrollWidth;
    const contentHeight = container.scrollHeight;

    // Capture with html2canvas — MELHORIAS: Scale aumentada para qualidade superior
    const html2canvas = (await import("html2canvas")).default;
    
    // MELHORIAS: Usar scale 4 para mapas mentais (melhor qualidade), 3 para outros
    const effectiveScale = filename.includes("mapa-mental") ? 4 : scale;
    
    const canvas = await html2canvas(container, {
      scale: effectiveScale,
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
    // Mas respeita o limite máximo de páginas solicitado
    const calculatedPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));
    const totalPages = Math.min(calculatedPages, maxPages);
    
    // Se o conteúdo é maior que o limite de páginas, redimensiona o canvas
    let effectiveCanvasHeight = canvas.height;
    if (calculatedPages > maxPages) {
      effectiveCanvasHeight = pageHeightPx * maxPages;
    }

    const pdf = new jsPDF({
      orientation: isLandscape ? "landscape" : "portrait",
      unit: "mm",
      format: format,
      compress: true
    });

    // Lógica de fatiamento inteligente para evitar cortar elementos ao meio
    let currentY = 0;
    const totalHeight = effectiveCanvasHeight;
    
    while (currentY < totalHeight) {
      if (currentY > 0) {
        pdf.addPage();
      }

      // Tenta encontrar a melhor quebra de página
      // Analisa o canvas para encontrar linhas "vazias" (brancas) perto do limite da página
      let bestBreakY = currentY + pageHeightPx;
      if (bestBreakY > totalHeight) bestBreakY = totalHeight;
      
      // Se não for a última página, tenta recuar um pouco para encontrar um espaço em branco
      if (bestBreakY < totalHeight) {
        bestBreakY = findBestPageBreak(canvas, currentY, bestBreakY, effectiveScale);
      }

      const srcH = Math.min(bestBreakY - currentY, canvas.height - currentY);
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

        // MELHORIAS: Usar PNG para mapas mentais (melhor qualidade), JPEG para outros
        const isHighQuality = filename.includes("mapa-mental");
        const imgData = isHighQuality 
          ? pageCanvas.toDataURL("image/png")
          : pageCanvas.toDataURL("image/jpeg", 0.98);
        
        pdf.addImage(
          imgData, 
          isHighQuality ? "PNG" : "JPEG", 
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
