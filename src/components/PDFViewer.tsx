import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Loader2, 
  X, 
  Sun, 
  Moon, 
  Bookmark, 
  BookmarkCheck,
  Tag,
  BookOpen
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

// @ts-ignore - importar worker como URL via Vite (evita falha de CDN)
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Configurar o worker do PDF.js usando bundle local (resolve o erro de CDN bloqueado)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface BookmarkItem {
  page: number;
  label?: string;
}

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
  const [brightness, setBrightness] = useState(100);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);

  // Carregar bookmarks do localStorage (simulação de persistência local)
  useEffect(() => {
    const saved = localStorage.getItem(`pdf_bookmarks_${title}`);
    if (saved) {
      try {
        setBookmarks(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar bookmarks", e);
      }
    }
  }, [title]);

  // Salvar bookmarks
  useEffect(() => {
    if (bookmarks.length > 0) {
      localStorage.setItem(`pdf_bookmarks_${title}`, JSON.stringify(bookmarks));
    }
  }, [bookmarks, title]);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        console.log("Iniciando carregamento do PDF:", url);
        const loadingTask = pdfjsLib.getDocument({
          url,
          withCredentials: false // Importante para evitar erros de CORS em alguns casos
        });
        const pdfDoc = await loadingTask.promise;
        setPdf(pdfDoc);
        setNumPages(pdfDoc.numPages);
        setLoading(false);
      } catch (error: any) {
        console.error("Erro ao carregar PDF:", error);
        toast({
          title: "Erro ao carregar livro",
          description: "Não foi possível carregar o arquivo PDF. Tente novamente mais tarde.",
          variant: "destructive"
        });
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
        const viewport = page.getViewport({ scale: scale * window.devicePixelRatio });
        const canvas = canvasRef.current!;
        const context = canvas.getContext("2d");

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Ajustar o estilo para o tamanho correto na tela
        canvas.style.width = `${viewport.width / window.devicePixelRatio}px`;
        canvas.style.height = `${viewport.height / window.devicePixelRatio}px`;

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

  const toggleBookmark = () => {
    if (bookmarks.some(b => b.page === pageNum)) {
      setBookmarks(bookmarks.filter(b => b.page !== pageNum));
      toast({ title: "Marcador removido" });
    } else {
      const label = prompt("Etiqueta para esta página (opcional):") || `Página ${pageNum}`;
      setBookmarks([...bookmarks, { page: pageNum, label }]);
      toast({ title: "Página marcada!" });
    }
  };

  const isBookmarked = bookmarks.some(b => b.page === pageNum);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col select-none animate-in fade-in duration-300">
      {/* Header */}
      <div className="h-14 sm:h-16 border-b flex items-center justify-between px-2 sm:px-4 bg-card shrink-0 shadow-sm">
        <div className="flex items-center gap-1 sm:gap-3 overflow-hidden">
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 rounded-full hover:bg-muted">
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
          <h2 className="font-bold text-xs sm:text-base truncate max-w-[100px] sm:max-w-xs">{title || "Leitor de PDF"}</h2>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-2">
          {/* Luminosidade - Ocultar em mobile pequeno se necessário, ou manter compacto */}
          <div className="hidden xs:flex items-center mr-1 sm:mr-2 bg-muted/50 rounded-full px-2 py-1">
            <Sun className="h-3 w-3 text-muted-foreground mr-1" />
            <input 
              type="range" 
              min="30" 
              max="100" 
              value={brightness} 
              onChange={(e) => setBrightness(parseInt(e.target.value))}
              className="w-12 sm:w-16 h-1 bg-primary/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="flex items-center bg-muted/30 rounded-full px-1">
            <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="h-7 w-7 sm:h-9 sm:w-9 rounded-full">
              <ZoomOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <span className="text-[9px] sm:text-xs font-bold min-w-[30px] sm:min-w-[40px] text-center">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.min(3, s + 0.2))} className="h-7 w-7 sm:h-9 sm:w-9 rounded-full">
              <ZoomIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
          
          <Button 
            variant={isBookmarked ? "default" : "ghost"} 
            size="icon" 
            onClick={toggleBookmark} 
            className={`h-8 w-8 rounded-full ${isBookmarked ? 'text-primary-foreground' : ''}`}
          >
            {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowBookmarks(!showBookmarks)} 
            className="h-8 w-8 rounded-full relative"
          >
            <Tag className="h-4 w-4" />
            {bookmarks.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-[8px] text-primary-foreground w-4 h-4 rounded-full flex items-center justify-center">
                {bookmarks.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Bookmarks Sidebar */}
        {showBookmarks && (
          <div className="w-64 border-r bg-card overflow-y-auto animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b font-semibold text-sm flex justify-between items-center">
              Marcadores e Etiquetas
              <Button variant="ghost" size="icon" onClick={() => setShowBookmarks(false)} className="h-6 w-6">
                <X className="h-3 w-3" />
              </Button>
            </div>
            {bookmarks.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Nenhuma página marcada.
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {bookmarks.map((b, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPageNum(b.page);
                      if (window.innerWidth < 768) setShowBookmarks(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl text-sm hover:bg-muted transition-colors flex flex-col gap-1 ${pageNum === b.page ? 'bg-primary/10 border-primary/20 border' : ''}`}
                  >
                    <span className="font-medium">Página {b.page}</span>
                    {b.label && <span className="text-xs text-muted-foreground italic truncate">{b.label}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PDF Content */}
        <div 
          className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900/50 p-2 sm:p-8 flex justify-center items-start transition-all duration-300"
          style={{ filter: `brightness(${brightness}%)` }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="relative">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-500 animate-pulse">Preparando sua leitura...</p>
            </div>
          ) : (
            <div className="shadow-2xl bg-white dark:bg-slate-800 rounded-lg overflow-hidden mb-20 sm:mb-12 border border-slate-200 dark:border-slate-700 max-w-full">
              <canvas ref={canvasRef} className="max-w-full h-auto" />
            </div>
          )}
        </div>
      </div>

      {/* Footer / Controls */}
      {!loading && (
        <div className="h-20 sm:h-24 border-t flex items-center justify-between sm:justify-center gap-2 sm:gap-8 px-4 sm:px-8 bg-card/80 backdrop-blur-md shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => changePage(-1)} 
            disabled={pageNum <= 1 || rendering}
            className="rounded-2xl h-12 w-12 sm:w-auto sm:px-6 bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white transition-all"
          >
            <ChevronLeft className="h-5 w-5 sm:mr-2" /> 
            <span className="hidden sm:inline font-bold">Anterior</span>
          </Button>
          
          <div className="flex flex-col items-center flex-1 sm:flex-none max-w-[120px] sm:max-w-none">
            <div className="bg-primary/10 px-3 py-1 rounded-full mb-2">
              <span className="text-xs sm:text-sm font-black text-primary">
                {pageNum} <span className="opacity-40 mx-0.5">/</span> {numPages}
              </span>
            </div>
            <div className="w-full sm:w-48 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
                style={{ width: `${(pageNum / numPages) * 100}%` }}
              />
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => changePage(1)} 
            disabled={pageNum >= numPages || rendering}
            className="rounded-2xl h-12 w-12 sm:w-auto sm:px-6 bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white transition-all"
          >
            <span className="hidden sm:inline font-bold">Próxima</span>
            <ChevronRight className="h-5 w-5 sm:ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
