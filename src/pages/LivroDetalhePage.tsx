import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Download, Loader2, Coins, FileText, Eye, Share2, ChevronDown } from "lucide-react";
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
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [bookHovered, setBookHovered] = useState(false);

  const [readingBook, setReadingBook] = useState<{ url: string; title: string } | null>(null);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);

  // Limite de caracteres para descrição truncada
  const DESCRIPTION_LIMIT = 200;

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
        let el = document.querySelector(`meta[\${attr}="\${name}"]`);
        if (!el) {
          el = document.createElement("meta");
          el.setAttribute(attr, name);
          document.head.appendChild(el);
        }
        el.setAttribute("content", content);
      };

      // Tags padrão e OpenGraph (Social)
      updateMeta("description", book.descricao || "Descubra este livro na Doka.");
      updateMeta("og:title", `\${book.titulo} | Doka`, "property");
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
    if (!user) return navigate(`/auth?returnTo=\${encodeURIComponent(window.location.pathname)}`);
    setProcessing(true);
    const { data, error } = await supabase.rpc("comprar_livro_com_creditos", { p_book_id: id });
    setProcessing(true); // Mantém carregando para evitar cliques múltiplos
    const res = data as any;
    if (error || !res?.ok) {
      toast({ title: "Erro", description: res?.error || "Não foi possível obter o livro", variant: "destructive" });
      setProcessing(false);
      return;
    }
    setOwned(true);
    setProcessing(false);
    toast({ title: "Adicionado à sua biblioteca!" });
  };

  const handleComprarCreditos = async () => {
    if (!user) return navigate(`/auth?returnTo=\${encodeURIComponent(window.location.pathname)}`);
    if (!confirm(`Confirmar compra de "\${book.titulo}" por \${book.preco_creditos} créditos?`)) return;
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
      link.setAttribute("download", `\${book.titulo}.pdf`);
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

  // Verifica se a descrição é longa
  const isDescriptionLong = book?.descricao && book.descricao.length > DESCRIPTION_LIMIT;
  const displayedDescription = expandedDescription || !isDescriptionLong 
    ? book?.descricao 
    : book?.descricao?.substring(0, DESCRIPTION_LIMIT) + "...";

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!book) return <div className="text-center py-20">Livro não encontrado.</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header com botão de voltar e partilhar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopyLink} 
            className="gap-2 rounded-full hover:bg-primary/10 hover:text-primary transition-colors duration-200"
          >
            <Share2 className="h-4 w-4" /> Partilhar
          </Button>
        </div>
      </div>

      {/* Conteúdo Principal - Layout Responsivo Melhorado */}
      <div className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        {/* Mobile Layout: Capa à esquerda, Informações à direita */}
        <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
          
          {/* Seção da Capa - Mobile: à esquerda com efeito, Desktop: acima */}
          <div className="md:w-[280px] lg:w-[320px] flex-shrink-0">
            <div className="relative">
              {/* Capa do Livro com Efeito ao Pressionar */}
              <div 
                className="bg-secondary rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden aspect-[2/3] shadow-md md:shadow-lg transition-all duration-300 ease-out cursor-pointer"
                style={{
                  transform: bookHovered ? "scale(1.05) translateY(-4px)" : "scale(1)",
                  boxShadow: bookHovered 
                    ? "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)"
                    : "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                }}
                onMouseEnter={() => setBookHovered(true)}
                onMouseLeave={() => setBookHovered(false)}
                onTouchStart={() => setBookHovered(true)}
                onTouchEnd={() => setBookHovered(false)}
              >
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
          </div>

          {/* Seção de Informações e Ações */}
          <div className="flex-1 space-y-5">
            
            {/* Info Básica */}
            <div className="space-y-3">
              {book.book_categories?.nome && (
                <Badge variant="outline" className="text-[10px] sm:text-xs w-fit">
                  {book.book_categories.nome}
                </Badge>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-tight mb-2">
                  {book.titulo}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground">
                  por <span className="font-semibold text-foreground">{book.autor}</span>
                </p>
              </div>
              
              {/* Metadados do Livro */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground pt-2 border-t border-border">
                {book.paginas && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> 
                    <span>{book.paginas} págs</span>
                  </span>
                )}
                {book.idioma && <span>{book.idioma}</span>}
                {book.classe && <span>• {book.classe}</span>}
                <span>• {book.downloads} downloads</span>
              </div>
            </div>

            {/* Descrição com "Ver Mais" */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Sobre o livro</h3>
              <Card className="border-dashed">
                <CardContent className="p-3 sm:p-4 text-xs sm:text-sm leading-relaxed text-foreground/90">
                  <p className="whitespace-pre-wrap">
                    {displayedDescription}
                  </p>
                </CardContent>
              </Card>
              
              {/* Botão "Ver Mais" se a descrição for longa */}
              {isDescriptionLong && (
                <button
                  onClick={() => setExpandedDescription(!expandedDescription)}
                  className="flex items-center gap-2 text-xs sm:text-sm text-primary hover:text-primary/80 font-medium transition-colors duration-200 mt-2"
                >
                  {expandedDescription ? "Ver menos" : "Ver mais"}
                  <ChevronDown 
                    className={`h-3.5 w-3.5 transition-transform duration-300 ${expandedDescription ? "rotate-180" : ""}`}
                  />
                </button>
              )}
            </div>

            {/* Botões de Ação - Sempre abaixo das informações */}
            <div className="space-y-3 pt-2">
              {owned ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button 
                    onClick={handleRead} 
                    disabled={processing} 
                    className="rounded-xl gap-2 w-full h-11 font-medium transition-all duration-200 hover:shadow-md"
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    <span>Ler agora</span>
                  </Button>
                  <Button 
                    onClick={handleDownload} 
                    variant="outline" 
                    disabled={processing} 
                    className="rounded-xl gap-2 w-full h-11 font-medium transition-all duration-200 hover:shadow-md"
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    <span>Baixar PDF</span>
                  </Button>
                </div>
              ) : book.gratuito ? (
                <Button 
                  onClick={handleObterGratis} 
                  disabled={processing} 
                  className="rounded-xl gap-2 w-full h-11 font-medium transition-all duration-200 hover:shadow-md"
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  <span>Obter Grátis</span>
                </Button>
              ) : (
                <div className="flex flex-col gap-3">
                  {book.preco_creditos > 0 && (
                    <Button 
                      onClick={handleComprarCreditos} 
                      disabled={processing} 
                      className="rounded-xl gap-2 w-full h-11 font-medium transition-all duration-200 hover:shadow-md"
                    >
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
                      <span>Pagar com {book.preco_creditos} créditos</span>
                    </Button>
                  )}
                  <Button 
                    onClick={() => {
                      if (!user) {
                        navigate(`/auth?returnTo=\${encodeURIComponent(window.location.pathname + "?action=pay")}`);
                      } else {
                        setOpenPaymentDialog(true);
                      }
                    }} 
                    variant="outline" 
                    className="rounded-xl gap-2 w-full h-11 font-medium transition-all duration-200 hover:shadow-md"
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    <span>Pagar {book.preco_kz} Kz</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Info Adicional */}
            <div className="pt-4 border-t border-border flex justify-between text-[10px] sm:text-xs text-muted-foreground">
              <span>Visualizações: <span className="font-semibold text-foreground">{book.visualizacoes || 0}</span></span>
              <span>{book.downloads} downloads</span>
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
