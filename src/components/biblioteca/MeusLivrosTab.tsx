import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, BookOpen } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const MeusLivrosTab = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
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
    load();
  }, []);

  const download = async (book: any) => {
    setDownloadingId(book.id);
    const { data, error } = await supabase.storage.from("book-files").createSignedUrl(book.ficheiro_path, 300);
    setDownloadingId(null);
    if (error || !data?.signedUrl) return toast({ title: "Erro", description: "Não foi possível gerar o download", variant: "destructive" });
    window.open(data.signedUrl, "_blank");
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
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item) => {
        const b = item.books;
        if (!b) return null;
        return (
          <div key={item.id} className="group">
            <Link to={`/livraria/${b.id}`}>
              <div className="bg-secondary rounded-2xl overflow-hidden aspect-[2/3] shadow-apple-card group-hover:shadow-apple-card-hover transition-all">
                {b.capa_url ? (
                  <img src={b.capa_url} alt={b.titulo} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-blue-400/20">
                    <BookOpen className="h-10 w-10 text-primary/60" />
                  </div>
                )}
              </div>
            </Link>
            <h3 className="text-sm font-semibold mt-2 line-clamp-2">{b.titulo}</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{b.autor}</p>
            <Button onClick={() => download(b)} disabled={downloadingId === b.id} size="sm" className="w-full mt-2 rounded-xl gap-1.5 h-8 text-xs">
              {downloadingId === b.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />} Baixar
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export default MeusLivrosTab;
