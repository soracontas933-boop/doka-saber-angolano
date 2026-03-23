/**
 * Shared PDF export helper — mounts HTML off-screen (visible to html2canvas)
 * and generates a multi-page A4 PDF reliably.
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

interface PdfExportOptions {
  html?: string;
  element?: HTMLElement;
  filename: string;
  overlayMessage?: string;
  containerWidth?: number;
  padding?: string;
}

async function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  if (images.length === 0) return;

  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
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
}: PdfExportOptions) {
  showExportOverlay(overlayMessage);
  let container: HTMLDivElement | null = null;

  try {
    if (!html && !element) {
      const { toast } = await import("sonner");
      toast.error("Sem conteúdo para exportar.");
      return;
    }

    container = document.createElement("div");
    container.style.cssText = [
      "font-family: 'Times New Roman', serif",
      "font-size: 11pt",
      "line-height: 1.6",
      "color: #000",
      "background: #fff",
      `width: ${containerWidth}px`,
      `padding: ${padding}`,
      "position: absolute",
      "left: -10000px",
      "top: 0",
      "opacity: 1",
      "z-index: 0",
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

    // Force overflow visible on all children
    const allChildren = container.querySelectorAll("*");
    allChildren.forEach((child) => {
      (child as HTMLElement).style.overflow = "visible";
    });

    await document.fonts.ready;
    await waitForImages(container);
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    // Extra delay for complex layouts (flex, grid, images)
    await new Promise<void>((r) => setTimeout(r, 500));

    const hasText = (container.textContent || "").trim().length > 0;
    const hasRenderableElement = !!container.querySelector("img, table, h1, h2, h3, p, li, div, section, span");
    if (!hasText && !hasRenderableElement) {
      const { toast } = await import("sonner");
      toast.error("Sem conteúdo visível para exportar.");
      return;
    }

    console.log("[PDF Helper] container size:", container.scrollWidth, "x", container.scrollHeight, "children:", container.childElementCount);

    const html2pdf = (await import("html2pdf.js")).default;
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename,
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          windowWidth: containerWidth,
          windowHeight: Math.max(container.scrollHeight + 100, 1123),
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      } as any)
      .from(container)
      .save();

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
