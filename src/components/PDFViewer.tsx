import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, X } from "lucide-react";

// @ts-ignore
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Configurar o worker do PDF.js usando bundle local (evita bloqueios de CDN e melhora compatibilidade)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PDFViewerProps {
  url: string;
  onClose: () => void;
  title?: string;
}

const PDFViewer = ({ url, onClose, title }: PDFViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        const loadingTask = pdfjsLib.getDocument(url);
        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        setLoading(false);
      } catch (error) {
        console.error("Erro ao carregar PDF:", error);
        setLoading(false);
      }
    };
    loadPdf();
  }, [url]);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    const renderPage = async () => {
      if (rendering) return;
      setRendering(true);
      
      try {
        const page = await pdf.getPage(pageNum);
        
        // Ajustar escala para dispositivos móveis
        const isMobile = window.innerWidth < 768;
        const currentScale = isMobile ? (window.innerWidth - 40) / page.getViewport({ scale: 1 }).width : scale;
        
        const viewport = page.getViewport({ scale: currentScale });
        const canvas = canvasRef.current!;
        const context = canvas.getContext("2d");

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context!,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (error) {
        console.error("Erro ao renderizar página:", error);
      } finally {
        setRendering(false);
      }
    };

    renderPage();
  }, [pdf, pageNum, scale]);

  const changePage = (offset: number) => {
    setPageNum((prev) => Math.min(Math.max(1, prev + offset), numPages));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-card shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <X className="h-5 w-5" />
          </Button>
          <h2 className="font-semibold text-sm truncate">{title || "Leitor de PDF"}</h2>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="h-8 w-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.min(3, s + 0.2))} className="h-8 w-8">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-muted/30 p-4 flex justify-center items-start">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando livro...</p>
          </div>
        ) : (
          <div className="shadow-2xl bg-white">
            <canvas ref={canvasRef} />
          </div>
        )}
      </div>

      {/* Footer / Controls */}
      {!loading && (
        <div className="h-14 border-t flex items-center justify-center gap-4 px-4 bg-card shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => changePage(-1)} 
            disabled={pageNum <= 1 || rendering}
            className="rounded-xl"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          
          <span className="text-sm font-medium">
            Página {pageNum} de {numPages}
          </span>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => changePage(1)} 
            disabled={pageNum >= numPages || rendering}
            className="rounded-xl"
          >
            Próxima <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
