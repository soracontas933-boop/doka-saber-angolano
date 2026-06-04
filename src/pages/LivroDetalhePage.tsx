import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Download, Loader2, Coins, FileText, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";

import PDFViewer from "@/components/PDFViewer";
import BookPaymentDialog from "@/components/BookPaymentDialog";

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
        }
        await supabase.from("books").update({ visualizacoes: (b.visualizacoes || 0) + 1 }).eq("id", b.id);
        await supabase.from("book_views").insert({ book_id: b.id, user_id: user?.id || null });
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleObterGratis = async () => {
    if (!user) return navigate("/auth");
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
    if (!user) return navigate("/auth");
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
      // Tenta primeiro o novo bucket 'ebooks', se falhar ou se o path não começar com 'files/', tenta o antigo
      const bucket = book.ficheiro_path.startsWith('files/') ? 'ebooks' : 'book-files';
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(book.ficheiro_path, 300);
      if (error || !data?.signedUrl) throw error || new Error("URL não gerada");
      
      const response = await fetch(data.signedUrl);
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
      // Tenta primeiro o novo bucket 'ebooks', se falhar ou se o path não começar com 'files/', tenta o antigo
      const bucket = book.ficheiro_path.startsWith('files/') ? 'ebooks' : 'book-files';
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(book.ficheiro_path, 3600);
      if (error || !data?.signedUrl) throw error || new Error("URL não gerada");
      
      setReadingBook({ url: data.signedUrl, title: book.titulo });
    } catch (err) {
      toast({ title: "Erro ao abrir leitor", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!book) return <div className="text-center py-20">Livro não encontrado.</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl pb-24 md:pb-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-2">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Button>

      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        <div className="bg-secondary rounded-2xl overflow-hidden aspect-[2/3] shadow-apple-card">
          {book.capa_url ? (
            <img src={book.capa_url} alt={book.titulo} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-blue-400/20">
              <BookOpen className="h-16 w-16 text-primary/60" />
            </div>
          )}
        </div>

        <div className="space-y-4">
          {book.book_categories?.nome && <Badge variant="outline">{book.book_categories.nome}</Badge>}
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{book.titulo}</h1>
          <p className="text-muted-foreground">por <span className="font-medium text-foreground">{book.autor}</span></p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {book.paginas && <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {book.paginas} págs</span>}
            <span>{book.idioma}</span>
            {book.classe && <span>• {book.classe}</span>}
            <span>• {book.downloads} downloads</span>
          </div>

          <Card><CardContent className="p-4 text-sm whitespace-pre-wrap">{book.descricao || "Sem descrição."}</CardContent></Card>

          <div className="flex flex-wrap gap-2">
            {owned ? (
              <>
                <Button onClick={handleRead} disabled={processing} size="lg" className="rounded-2xl gap-2">
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                  Ler agora
                </Button>
                <Button onClick={handleDownload} variant="outline" disabled={processing} size="lg" className="rounded-2xl gap-2">
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Baixar PDF
                </Button>
              </>
            ) : book.gratuito ? (
              <Button onClick={handleObterGratis} disabled={processing} size="lg" className="rounded-2xl gap-2">
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Obter Grátis
              </Button>
            ) : (
              <>
                {book.preco_creditos > 0 && (
                  <Button onClick={handleComprarCreditos} disabled={processing} size="lg" className="rounded-2xl gap-2">
                    <Coins className="h-4 w-4" /> Pagar com {book.preco_creditos} créditos
                  </Button>
                )}
                <Button onClick={() => setOpenPaymentDialog(true)} variant="outline" size="lg" className="rounded-2xl gap-2">
                  <FileText className="h-4 w-4" /> Pagar {book.preco_kz} Kz (comprovativo)
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

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
