import { createRoot } from "react-dom/client";
import { Loader2, FileDown } from "lucide-react";

let overlayContainer: HTMLDivElement | null = null;
let overlayRoot: ReturnType<typeof createRoot> | null = null;

function ExportOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-xs w-full mx-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="h-7 w-7 text-primary animate-spin" />
        </div>
        <div className="text-center">
          <p className="font-display font-semibold text-foreground text-base">A exportar...</p>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "70%" }} />
        </div>
      </div>
    </div>
  );
}

export function showExportOverlay(message = "A preparar o ficheiro...") {
  if (overlayContainer) return;
  overlayContainer = document.createElement("div");
  document.body.appendChild(overlayContainer);
  overlayRoot = createRoot(overlayContainer);
  overlayRoot.render(<ExportOverlay message={message} />);
}

export function hideExportOverlay() {
  if (overlayRoot) {
    overlayRoot.unmount();
    overlayRoot = null;
  }
  if (overlayContainer) {
    document.body.removeChild(overlayContainer);
    overlayContainer = null;
  }
}
