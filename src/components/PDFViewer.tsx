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
    <div className="fixed inset-0 z-[100] bg-background flex flex-col select-none">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4 bg-card shrink-0 shadow-sm">
        <div className="flex items-center gap-3 overflow-hidden">
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 rounded-full">
            <X className="h-5 w-5" />
          </Button>
          <h2 className="font-semibold text-sm truncate max-w-[150px] md:max-w-xs">{title || "Leitor de PDF"}</h2>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Luminosidade */}
          <div className="flex items-center mr-2 bg-muted/50 rounded-full px-2 py-1">
            <Sun className="h-3 w-3 text-muted-foreground mr-1" />
            <input 
              type="range" 
              min="30" 
              max="100" 
              value={brightness} 
              onChange={(e) => setBrightness(parseInt(e.target.value))}
              className="w-16 h-1 bg-primary/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="h-8 w-8 rounded-full">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-[10px] font-medium min-w-[35px] text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.min(3, s + 0.2))} className="h-8 w-8 rounded-full">
            <ZoomIn className="h-4 w-4" />
          </Button>
          
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
          className="flex-1 overflow-auto bg-muted/30 p-4 md:p-8 flex justify-center items-start transition-all duration-300"
          style={{ filter: `brightness(${brightness}%)` }}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="relative">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <BookOpen className="h-5 w-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Preparando sua leitura...</p>
            </div>
          ) : (
            <div className="shadow-2xl bg-white rounded-sm overflow-hidden mb-12">
              <canvas ref={canvasRef} />
            </div>
          )}
        </div>
      </div>

      {/* Footer / Controls */}
      {!loading && (
        <div className="h-16 border-t flex items-center justify-center gap-4 px-4 bg-card shrink-0 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => changePage(-1)} 
            disabled={pageNum <= 1 || rendering}
            className="rounded-full h-10 px-4 md:px-6"
          >
            <ChevronLeft className="h-4 w-4 md:mr-2" /> 
            <span className="hidden md:inline">Anterior</span>
          </Button>
          
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold">
              {pageNum} <span className="text-muted-foreground font-normal mx-1">/</span> {numPages}
            </span>
            <div className="w-32 md:w-48 h-1 bg-muted rounded-full mt-1 overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300" 
                style={{ width: `${(pageNum / numPages) * 100}%` }}
              />
            </div>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => changePage(1)} 
            disabled={pageNum >= numPages || rendering}
            className="rounded-full h-10 px-4 md:px-6"
          >
            <span className="hidden md:inline">Próxima</span>
            <ChevronRight className="h-4 w-4 md:ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
