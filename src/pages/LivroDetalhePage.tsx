import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Download, Loader2, Coins, FileText, Eye, Share2, Copy } from "lucide-react";
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

  const [readingBook, setReadingBook] = useState<{ url: string; title: string } | null>(null);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const { data: b } = await supabase.from("books").select("*, book_categories(nome)").eq("id", id).maybeSingle();
      setBook(b);

      if (b) {
        if (user) {
          const { data: lib } = await supabase.from("book_library").select("id").eq("user_id", user.id).eq("book_id", b.id).maybeSingle();
          setOwned(!!lib);
          
          // Se o usuário acabou de logar vindo de uma intenção de compra
          const searchParams = new URLSearchParams(window.location.search);
          if (searchParams.get("action") === "pay" && !lib) {
            setOpenPaymentDialog(true);
          }
        }
        await supabase.from("books").update({ visualizacoes: (b.visualizacoes || 0) + 1 }).eq("id", b.id);
        await supabase.from("book_views").insert({ book_id: b.id, user_id: user?.id || null });
      }
      setLoading(false);
    };
    load();
  }, [id]);

  // SEO/Social Meta Tags Dinâmicas
  useEffect(() => {
    if (book) {
      // Título da Aba
      document.title = `${book.titulo} | Doka`;

      // Função auxiliar para atualizar ou criar meta tags
      const updateMeta = (name: string, content: string, attr = "name") => {
        let el = document.querySelector(`meta[${attr}="${name}"]`);
        if (!el) {
          el = document.createElement("meta");
          el.setAttribute(attr, name);
          document.head.appendChild(el);
        }
        el.setAttribute("content", content);
      };

      // Tags padrão e OpenGraph (Social)
      updateMeta("description", book.descricao || "Descubra este livro na Doka.");
      updateMeta("og:title", `${book.titulo} | Doka`, "property");
      updateMeta("og:description", book.descricao || "Descubra este livro na Doka.", "property");
      updateMeta("og:image", book.capa_url || "", "property");
      updateMeta("og:url", window.location.href, "property");
      updateMeta("og:type", "book", "property");
      
      // Twitter
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
      if (!result.success || !result.signedUrl) {
        throw new Error(result.error || "URL não gerada");
      }
      
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
      if (!result.success || !result.signedUrl) {
        throw new Error(result.error || "URL não gerada");
      }
      
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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!book) return <div className="text-center py-20">Livro não encontrado.</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header com botões de navegação */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-2 rounded-full">
            <Share2 className="h-4 w-4" /> Partilhar
          </Button>
        </div>
      </div>

      {/* Conteúdo Principal - Layout Responsivo */}
      <div className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        {/* Layout para Desktop: 2 colunas (capa à esquerda, info à direita) */}
        <div className="grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] md:grid-cols-[280px_1fr] gap-4 sm:gap-5 md:gap-6 lg:gap-8">
          
          {/* Coluna 1: Capa do Livro */}
          <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
            {/* Capa - Responsiva */}
            <div className="bg-secondary rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden aspect-[2/3] shadow-md md:shadow-lg sticky top-20 md:top-0">
              {book.capa_url ? (
                <img 
                  src={book.capa_url} 
                  alt={book.titulo} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-blue-400/20">
                  <BookOpen className="h-8 sm:h-12 md:h-16 w-8 sm:w-12 md:w-16 text-primary/60" />
                </div>
              )}
            </div>
          </div>

          {/* Coluna 2: Informações e Ações */}
          <div className="space-y-6">
            
            {/* Categoria */}
            {book.book_categories?.nome && (
              <div>
                <Badge variant="outline" className="text-xs">{book.book_categories.nome}</Badge>
              </div>
            )}

            {/* Título */}
            <div>
              <h1 className="text-lg sm:text-xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
                {book.titulo}
              </h1>
            </div>

            {/* Autor */}
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">por <span className="font-semibold text-foreground">{book.autor}</span></p>
            </div>

            {/* Metadados do Livro */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground py-2 sm:py-3 border-y border-border">
              {book.paginas && (
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4" /> 
                  <span>{book.paginas} págs</span>
                </span>
              )}
              {book.idioma && <span>{book.idioma}</span>}
              {book.classe && <span>• {book.classe}</span>}
              <span>• {book.downloads} downloads</span>
            </div>

            {/* Descrição */}
            <div>
              <Card className="border-dashed">
                <CardContent className="p-2 sm:p-3 md:p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {book.descricao || "Sem descrição disponível."}
                </CardContent>
              </Card>
            </div>

            {/* Botões de Ação - Responsivos */}
            <div className="space-y-2 sm:space-y-3">
              {owned ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <Button 
                    onClick={handleRead} 
                    disabled={processing} 
                    size="sm" 
                    className="rounded-lg sm:rounded-xl gap-1 sm:gap-2 w-full text-xs sm:text-sm"
                  >
                    {processing ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Eye className="h-3 w-3 sm:h-4 sm:w-4" />}
                    <span className="hidden sm:inline">Ler agora</span>
                    <span className="sm:hidden">Ler</span>
                  </Button>
                  <Button 
                    onClick={handleDownload} 
                    variant="outline" 
                    disabled={processing} 
                    size="sm" 
                    className="rounded-lg sm:rounded-xl gap-1 sm:gap-2 w-full text-xs sm:text-sm"
                  >
                    {processing ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Download className="h-3 w-3 sm:h-4 sm:w-4" />}
                    <span className="hidden sm:inline">Baixar PDF</span>
                    <span className="sm:hidden">Baixar</span>
                  </Button>
                </div>
              ) : book.gratuito ? (
                <Button 
                  onClick={handleObterGratis} 
                  disabled={processing} 
                  size="sm" 
                  className="rounded-lg sm:rounded-xl gap-1 sm:gap-2 w-full text-xs sm:text-sm"
                >
                  {processing ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Download className="h-3 w-3 sm:h-4 sm:w-4" />}
                  <span className="hidden sm:inline">Obter Grátis</span>
                  <span className="sm:hidden">Grátis</span>
                </Button>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {book.preco_creditos > 0 && (
                    <Button 
                      onClick={handleComprarCreditos} 
                      disabled={processing} 
                      size="sm" 
                      className="rounded-lg sm:rounded-xl gap-1 sm:gap-2 w-full text-xs sm:text-sm"
                    >
                      {processing ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Coins className="h-3 w-3 sm:h-4 sm:w-4" />}
                      <span className="hidden sm:inline">Pagar com {book.preco_creditos} créditos</span>
                      <span className="sm:hidden">{book.preco_creditos} créditos</span>
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
                    size="sm" 
                    className="rounded-lg sm:rounded-xl gap-1 sm:gap-2 w-full text-xs sm:text-sm"
                  >
                    {processing ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <FileText className="h-3 w-3 sm:h-4 sm:w-4" />}
                    <span className="hidden sm:inline">Pagar {book.preco_kz} Kz</span>
                    <span className="sm:hidden">Pagar</span>
                  </Button>
                </div>
              )
            </div>

            {/* Info Adicional */}
            <div className="pt-4 border-t border-border text-xs text-muted-foreground">
              <p>Visualizações: <span className="font-semibold text-foreground">{book.visualizacoes || 0}</span></p>
            </div>
          </div>
        </div>
      </div>

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
