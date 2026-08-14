import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Download, Link as LinkIcon, FileText, Eye, Share2, ChevronDown, ChevronUp } from "lucide-react";
import { DelleLoader } from "@/components/DelleLoader";
import { toast } from "@/hooks/use-toast";

import PDFViewer from "@/components/PDFViewer";
import BookPaymentDialog from "@/components/BookPaymentDialog";
import { getEbookDownloadUrl } from "@/lib/ebook-storage";

const LivroDetalhePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [owned, setOwned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const [readingBook, setReadingBook] = useState<{ url: string; title: string } | null>(null);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser);

        const { data: b, error } = await supabase
          .from("books")
          .select("*, book_categories(nome)")
          .eq("id", id)
          .maybeSingle();
        
        if (error) throw error;
        setBook(b);

        if (b) {
          if (authUser) {
            const { data: lib } = await supabase
              .from("book_library")
              .select("id")
              .eq("user_id", authUser.id)
              .eq("book_id", b.id)
              .maybeSingle();
            setOwned(!!lib);
            
            const searchParams = new URLSearchParams(window.location.search);
            if (searchParams.get("action") === "pay" && !lib) {
              setOpenPaymentDialog(true);
            }
          }
          await supabase.from("books").update({ visualizacoes: (b.visualizacoes || 0) + 1 }).eq("id", b.id);
          await supabase.from("book_views").insert({ book_id: b.id, user_id: authUser?.id || null });
        }
      } catch (err) {
        console.error("Erro ao carregar livro:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (book) {
      document.title = `${book.titulo} | Doka`;
      const updateMeta = (name: string, content: string, attr = "name") => {
        let el = document.querySelector(`meta[${attr}="${name}"]`);
        if (!el) {
          el = document.createElement("meta");
          el.setAttribute(attr, name);
          document.head.appendChild(el);
        }
        el.setAttribute("content", content);
      };
      updateMeta("description", book.descricao || "Descubra este livro na Doka.");
      updateMeta("og:title", `${book.titulo} | Doka`, "property");
      updateMeta("og:description", book.descricao || "Descubra este livro na Doka.", "property");
      updateMeta("og:image", book.capa_url || "", "property");
      updateMeta("og:url", window.location.href, "property");
      updateMeta("og:type", "book", "property");
      updateMeta("twitter:card", "summary_large_image");
      updateMeta("twitter:title", book.titulo);
      updateMeta("twitter:description", book.descricao || "");
      updateMeta("twitter:image", book.capa_url || "");
    }
  }, [book]);

  const handleObterGratis = async () => {
    if (!user) return navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`);
    setProcessing(true);
    const { data, error } = await supabase.rpc("comprar_livro_com_creditos", { p_book_id: id });
    setProcessing(false);
    const res = data as any;
    if (error || !res?.ok) {
      toast({ title: "Erro", description: res?.error || "Não foi possível obter o livro", variant: "destructive" });
      return;
    }
    setOwned(true);
    toast({ title: "Adicionado à sua biblioteca!" });
  };

  const handleComprarCreditos = async () => {
    if (!user) return navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname)}`);
    if (!confirm(`Confirmar compra de "${book.titulo}" por ${book.preco_creditos} créditos?`)) return;
    setProcessing(true);
    const { data, error } = await supabase.rpc("comprar_livro_com_creditos", { p_book_id: id });
    setProcessing(false);
    const res = data as any;
    if (error || !res?.ok) {
      const msg = res?.error === "creditos_insuficientes" ? "Créditos insuficientes" : "Erro ao comprar";
      toast({ title: "Erro", description: msg, variant: "destructive" });
      return;
    }
    setOwned(true);
    toast({ title: "Compra concluída! Livro disponível na sua biblioteca." });
  };

  const handleDownload = async () => {
    if (!book.ficheiro_path) return toast({ title: "Erro", description: "Caminho do ficheiro não encontrado", variant: "destructive" });
    setProcessing(true);
    try {
      const result = await getEbookDownloadUrl(book.ficheiro_path, 300);
      if (!result.success || !result.signedUrl) throw new Error(result.error || "URL não gerada");
      const response = await fetch(result.signedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${book.titulo}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "Download iniciado!" });
    } catch (err) {
      toast({ title: "Erro ao gerar download", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleRead = async () => {
    if (!book.ficheiro_path) return toast({ title: "Erro", description: "Caminho do ficheiro não encontrado", variant: "destructive" });
    setProcessing(true);
    try {
      const result = await getEbookDownloadUrl(book.ficheiro_path, 3600);
      if (!result.success || !result.signedUrl) throw new Error(result.error || "URL não gerada");
      setReadingBook({ url: result.signedUrl, title: book.titulo });
    } catch (err) {
      toast({ title: "Erro ao abrir leitor", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copiado!", description: "Agora pode partilhar este livro." });
  };

  if (loading) return <div className="flex justify-center py-20"><DelleLoader className="h-6 w-6 text-primary" /></div>;
  if (!book) return <div className="text-center py-20">Livro não encontrado.</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header Fixo */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-14 flex justify-between items-center">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-foreground font-medium hover:text-primary transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span>Voltar</span>
          </button>
          <button onClick={handleCopyLink} className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-border text-foreground text-sm font-medium hover:bg-secondary transition-colors button-3d shadow-md">
            <Share2 className="h-4 w-4" />
            <span>Partilhar</span>
          </button>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Seção Superior: Capa e Info Principal */}
        <div className="flex flex-row gap-6 mb-8 items-start">
          {/* Capa do Livro */}
          <div className="w-1/3 min-w-[120px] max-w-[180px]">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-lg bg-secondary border border-border card-3d">
              {book.capa_url ? (
                <OptimizedImage
                  src={book.capa_url}
                  alt={book.titulo}
                  loading="eager"
                  fetchPriority="high"
                  width={400}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Info Básica */}
          <div className="flex-1 flex flex-col gap-2 pt-2">
            {book.book_categories?.nome && (
              <Badge variant="secondary" className="w-fit bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border font-normal px-3 py-1 text-[11px] rounded-full mb-1">
                {book.book_categories.nome}
              </Badge>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">
              {book.titulo}
            </h1>
            <p className="text-sm text-muted-foreground">
              por <span className="font-semibold text-foreground">{book.autor}</span>
            </p>
          </div>
        </div>

        {/* Metadados - Linha Horizontal */}
        <div className="flex items-center gap-4 py-4 border-y border-border text-[13px] text-muted-foreground mb-8 overflow-x-auto no-scrollbar">
          {book.paginas && (
            <div className="flex items-center gap-1.5 shrink-0">
              <FileText className="h-4 w-4" />
              <span>{book.paginas} págs</span>
            </div>
          )}
          <span className="shrink-0">{book.idioma || "Portugués"}</span>
          <span className="text-border shrink-0">•</span>
          <span className="shrink-0">{book.classe || "A&Z"}</span>
          <span className="text-border shrink-0">•</span>
          <span className="shrink-0">{book.downloads || 0} downloads</span>
        </div>

        {/* Sobre o Livro */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-foreground mb-3">Sobre o livro</h2>
          <div className="relative">
            <p className={`text-[15px] leading-relaxed text-foreground/90 ${!showFullDescription ? 'line-clamp-3' : ''}`}>
              {book.descricao || "Sem descrição disponível."}
            </p>
            {book.descricao && book.descricao.length > 150 && (
              <button 
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="mt-2 flex items-center gap-1 text-primary text-sm font-medium hover:text-primary/80 transition-colors"
              >
                {showFullDescription ? (
                  <>Ver menos <ChevronUp className="h-4 w-4" /></>
                ) : (
                  <>Ver mais <ChevronDown className="h-4 w-4" /></>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="space-y-3 mb-10">
          {owned ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button onClick={handleRead} disabled={processing} className="h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-700 hover:from-primary/90 hover:to-blue-700/90 text-white font-semibold text-base gap-2 shadow-lg button-3d">
                {processing ? <DelleLoader className="h-5 w-5 " /> : <Eye className="h-5 w-5" />}
                Ler agora
              </Button>
              <Button onClick={handleDownload} variant="outline" disabled={processing} className="h-14 rounded-2xl border-border text-foreground font-semibold text-base gap-2 hover:bg-secondary button-3d shadow-md">
                {processing ? <DelleLoader className="h-5 w-5 " /> : <Download className="h-5 w-5" />}
                Baixar PDF
              </Button>
            </div>
          ) : book.gratuito ? (
            <Button onClick={handleObterGratis} disabled={processing} className="w-full h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-700 hover:from-primary/90 hover:to-blue-700/90 text-white font-semibold text-base gap-2 shadow-lg button-3d">
              {processing ? <DelleLoader className="h-5 w-5 " /> : <Download className="h-5 w-5" />}
              Obter Grátis
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              {book.preco_creditos > 0 && (
                <Button onClick={handleComprarCreditos} disabled={processing} className="w-full h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-700 hover:from-primary/90 hover:to-blue-700/90 text-white font-semibold text-base gap-2 shadow-lg button-3d">
                  {processing ? <DelleLoader className="h-5 w-5 " /> : <LinkIcon className="h-5 w-5" />}
                  Pagar com {book.preco_creditos} créditos
                </Button>
              )}
              <Button 
                onClick={() => {
                  if (!user) {
                    navigate(`/auth?returnTo=${encodeURIComponent(window.location.pathname + "?action=pay")}`);
                  } else {
                    setOpenPaymentDialog(true);
                  }
                }} 
                variant="outline" 
                className="w-full h-14 rounded-2xl border border-border text-foreground font-semibold text-base gap-2 hover:bg-secondary button-3d shadow-md"
              >
                <FileText className="h-5 w-5" />
                Pagar {book.preco_kz} Kz
              </Button>
            </div>
          )}
        </div>

        {/* Rodapé de Info */}
        <div className="flex justify-between items-center pt-6 border-t border-border text-[13px] text-muted-foreground/60">
          <span>Visualizações: <span className="text-foreground font-medium">{book.visualizacoes || 0}</span></span>
          <span>{book.downloads || 0} downloads</span>
        </div>
      </main>

      {/* Diálogos */}
      <BookPaymentDialog
        open={openPaymentDialog}
        onOpenChange={setOpenPaymentDialog}
        book={book}
        user={user}
      />

      {readingBook && (
        <PDFViewer 
          url={readingBook.url} 
          title={readingBook.title} 
          onClose={() => setReadingBook(null)} 
        />
      )}
    </div>
  );
};

export default LivroDetalhePage;
