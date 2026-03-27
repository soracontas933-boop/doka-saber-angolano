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
  filename: string;
  overlayMessage?: string;
  containerWidth?: number;
  padding?: string;
  orientation?: "portrait" | "landscape";
  scale?: number;
  margin?: number[];
}

// A4 dimensions in mm
const A4_W_MM = 210;
const A4_H_MM = 297;

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
  filename,
  overlayMessage = "A gerar ficheiro PDF...",
  containerWidth = 794,
  padding = "48px 56px",
  orientation = "portrait",
  scale = 2,
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

    // Create staging container — positioned off-screen but VISIBLE (not display:none)
    container = document.createElement("div");
    container.style.cssText = [
      "font-family: 'Times New Roman', serif",
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
      container.appendChild(element);
    } else if (html && html.trim().length >= 10) {
      container.innerHTML = html;
    } else {
      const { toast } = await import("sonner");
      toast.error("Sem conteúdo para exportar.");
      return;
    }

    document.body.appendChild(container);

    // Force overflow visible on all children & disable animations
    const allChildren = container.querySelectorAll("*");
    allChildren.forEach((child) => {
      const el = child as HTMLElement;
      el.style.overflow = "visible";
      el.style.transition = "none";
      el.style.animation = "none";
    });

    // Wait for fonts and images
    await document.fonts.ready;
    await waitForImages(container);

    // Multiple rAF + delay to ensure browser has painted
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    await new Promise<void>((r) => setTimeout(r, 800));

    const contentWidth = container.scrollWidth;
    const contentHeight = container.scrollHeight;

    console.log("[PDF Helper] container size:", contentWidth, "x", contentHeight, "children:", container.childElementCount);

    if (contentHeight < 5 || contentWidth < 5) {
      const { toast } = await import("sonner");
      toast.error("Sem conteúdo visível para exportar.");
      return;
    }

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

    console.log("[PDF Helper] canvas size:", canvas.width, "x", canvas.height);

    if (canvas.width < 10 || canvas.height < 10) {
      const { toast } = await import("sonner");
      toast.error("Captura vazia — tente novamente.");
      return;
    }

    // Build PDF with jsPDF — manual multi-page slicing
    const { jsPDF } = await import("jspdf");

    const isLandscape = orientation === "landscape";
    const pageW = isLandscape ? A4_H_MM : A4_W_MM;
    const pageH = isLandscape ? A4_W_MM : A4_H_MM;

    const [mTop, mRight, mBottom, mLeft] = margin;
    const usableW = pageW - mLeft - mRight;
    const usableH = pageH - mTop - mBottom;

    // Calculate how many pixels of the canvas fit per page
    const pxPerMm = canvas.width / usableW;
    const pageHeightPx = usableH * pxPerMm;

    const totalPages = Math.max(1, Math.ceil(canvas.height / pageHeightPx));
    console.log("[PDF Helper] pages:", totalPages, "pageHeightPx:", pageHeightPx);

    const pdf = new jsPDF({
      orientation: isLandscape ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
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

      const imgData = pageCanvas.toDataURL("image/jpeg", 0.95);
      const imgH = (srcH / pxPerMm);

      pdf.addImage(imgData, "JPEG", mLeft, mTop, usableW, imgH);
    }

    pdf.save(filename);

    const { toast } = await import("sonner");
    toast.success("Exportado com sucesso!");
  } catch (err) {
    console.error("PDF export error:", err);
    const { toast } = await import("sonner");
    toast.error("Erro ao exportar PDF");
  } finally {
    if (container?.parentNode) container.parentNode.removeChild(container);
    hideExportOverlay();
  }
}
