import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { Deck } from "@/types/presentation";
import { ASPECT } from "@/components/apresentacao/DeckRenderer";
import { createRoot, type Root } from "react-dom/client";
import { SlideRenderer } from "@/components/apresentacao/DeckRenderer";

export async function exportDeckToPDF(deck: Deck, filename = "apresentacao.pdf"): Promise<void> {
  const dim = ASPECT[deck.aspectRatio];
  const isLandscape = dim.w >= dim.h;

  // Staging container (off-screen)
  const stage = document.createElement("div");
  stage.style.position = "fixed";
  stage.style.left = "-99999px";
  stage.style.top = "0";
  stage.style.width = `${dim.w}px`;
  stage.style.height = `${dim.h}px`;
  stage.style.background = deck.theme.palette.bg;
  document.body.appendChild(stage);
  const root: Root = createRoot(stage);

  const pdf = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "px",
    format: [dim.w, dim.h],
    hotfixes: ["px_scaling"],
  });

  try {
    for (let i = 0; i < deck.slides.length; i++) {
      const slide = deck.slides[i];
      await new Promise<void>((res) => {
        root.render(<SlideRenderer slide={slide} theme={deck.theme} />);
        // wait next frame + image load grace
        requestAnimationFrame(() => setTimeout(res, slide.imageUrl ? 500 : 100));
      });
      const canvas = await html2canvas(stage, { useCORS: true, scale: 1, backgroundColor: deck.theme.palette.bg, width: dim.w, height: dim.h });
      const img = canvas.toDataURL("image/jpeg", 0.92);
      if (i > 0) pdf.addPage([dim.w, dim.h], isLandscape ? "landscape" : "portrait");
      pdf.addImage(img, "JPEG", 0, 0, dim.w, dim.h);
    }
    pdf.save(filename);
  } finally {
    root.unmount();
    document.body.removeChild(stage);
  }
}
