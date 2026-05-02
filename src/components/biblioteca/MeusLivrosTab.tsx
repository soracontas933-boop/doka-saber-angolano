import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, BookOpen, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import PDFViewer from "@/components/PDFViewer";

const MeusLivrosTab = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [readingBook, setReadingBook] = useState<{ url: string; title: string } | null>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);
    const { data } = await supabase
      .from("book_library")
      .select("*, books(*)")
      .eq("user_id", user.id)
      .order("obtido_em", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const download = async (book: any) => {
    if (!book.ficheiro_path) return toast({ title: "Erro", description: "Caminho do ficheiro não encontrado", variant: "destructive" });
    
    setDownloadingId(book.id);
    try {
      const { data, error } = await supabase.storage.from("book-files").createSignedUrl(book.ficheiro_path, 300);
      if (error || !data?.signedUrl) throw error || new Error("URL não gerada");
      
      // Forçar download em vez de abrir em nova aba
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
    } catch (err: any) {
      console.error("Erro no download:", err);
      toast({ title: "Erro", description: "Não foi possível baixar o livro. Verifique sua conexão.", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  const openReader = async (book: any) => {
    if (!book.ficheiro_path) return toast({ title: "Erro", description: "Caminho do ficheiro não encontrado", variant: "destructive" });
    
    setDownloadingId(book.id);
    try {
      const { data, error } = await supabase.storage.from("book-files").createSignedUrl(book.ficheiro_path, 3600);
      if (error || !data?.signedUrl) throw error || new Error("URL não gerada");
      
      setReadingBook({ url: data.signedUrl, title: book.titulo });
    } catch (err) {
      toast({ title: "Erro", description: "Não foi possível abrir o leitor", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  
  if (items.length === 0) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">
        <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>Você ainda não tem livros na sua biblioteca.</p>
        <Link to="/livraria"><Button className="mt-4 rounded-2xl">Explorar livraria</Button></Link>
      </CardContent></Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((item) => {
          const b = item.books;
          if (!b) return null;
          return (
            <div key={item.id} className="group">
              <div className="relative bg-secondary rounded-2xl overflow-hidden aspect-[2/3] shadow-apple-card group-hover:shadow-apple-card-hover transition-all">
                {b.capa_url ? (
                  <img src={b.capa_url} alt={b.titulo} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-blue-400/20">
                    <BookOpen className="h-10 w-10 text-primary/60" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="icon" variant="secondary" className="rounded-full" onClick={() => openReader(b)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="secondary" className="rounded-full" onClick={() => download(b)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <h3 className="text-sm font-semibold mt-2 line-clamp-2">{b.titulo}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1">{b.autor}</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button onClick={() => openReader(b)} disabled={downloadingId === b.id} size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-[10px] px-1">
                  <Eye className="h-3 w-3" /> Ler
                </Button>
                <Button onClick={() => download(b)} disabled={downloadingId === b.id} size="sm" className="rounded-xl gap-1 h-8 text-[10px] px-1">
                  {downloadingId === b.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Baixar
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {readingBook && (
        <PDFViewer 
          url={readingBook.url} 
          title={readingBook.title} 
          onClose={() => setReadingBook(null)} 
        />
      )}
    </>
  );
};

export default MeusLivrosTab;
