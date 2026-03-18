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
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface PdfExportOptions {
  html: string;
  filename: string;
  overlayMessage?: string;
  containerWidth?: number;
  padding?: string;
}

export async function exportHtmlToPdf({
  html,
  filename,
  overlayMessage = "A gerar ficheiro PDF...",
  containerWidth = 794,
  padding = "48px 56px",
}: PdfExportOptions) {
  showExportOverlay(overlayMessage);
  let container: HTMLDivElement | null = null;

  try {
    if (!html || html.trim().length < 10) {
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
      "z-index: -1",
      "box-sizing: border-box",
    ].join(";");

    container.innerHTML = html;
    document.body.appendChild(container);

    // Wait for fonts + 2 animation frames for stable rendering
    await document.fonts.ready;
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

    console.log("[PDF Helper] container size:", container.scrollWidth, "x", container.scrollHeight, "html length:", html.length);

    const html2pdf = (await import("html2pdf.js")).default;
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename,
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: 0,
          windowWidth: containerWidth,
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
