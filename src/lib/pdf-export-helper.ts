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

    const totalPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));

    const pdf = new jsPDF({
      orientation: isLandscape ? "landscape" : "portrait",
      unit: "mm",
      format: format,
    });

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      const srcY = page * pageHeightPx;
      const srcH = Math.min(pageHeightPx, canvas.height - srcY);

      // Create a slice canvas for this page
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = srcH;
      const ctx = pageCanvas.getContext("2d");
      if (!ctx) continue;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

      const imgData = pageCanvas.toDataURL("image/png", 1.0); // PNG for maximum quality
      const destH = (srcH / pxPerMm);

      pdf.addImage(imgData, "PNG", mLeft, mTop, usableW, destH, undefined, 'FAST');
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
