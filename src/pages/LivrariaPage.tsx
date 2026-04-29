import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, BookOpen, Download, Sparkles, Library as LibraryIcon, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Category {
  id: string;
  nome: string;
  slug: string;
  icone: string | null;
}

interface Book {
  id: string;
  titulo: string;
  autor: string;
  descricao: string | null;
  capa_url: string | null;
  category_id: string | null;
  gratuito: boolean;
  preco_kz: number;
  preco_creditos: number;
  paginas: number | null;
  destaque: boolean;
  downloads: number;
}

const LivrariaPage = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string>("todas");
  const [filter, setFilter] = useState<"todos" | "gratis" | "pago">("todos");
  const [myLibrary, setMyLibrary] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: bs }, { data: cs }, { data: { user } }] = await Promise.all([
        supabase.from("books").select("*").eq("publicado", true).order("destaque", { ascending: false }).order("criado_em", { ascending: false }),
        supabase.from("book_categories").select("*").eq("ativo", true).order("ordem"),
        supabase.auth.getUser(),
      ]);
      setBooks((bs as Book[]) || []);
      setCategories((cs as Category[]) || []);
      if (user) {
        const { data: lib } = await supabase.from("book_library").select("book_id").eq("user_id", user.id);
        setMyLibrary(new Set((lib || []).map((r: any) => r.book_id)));
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return books.filter((b) => {
      if (activeCat !== "todas" && b.category_id !== activeCat) return false;
      if (filter === "gratis" && !b.gratuito) return false;
      if (filter === "pago" && b.gratuito) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        if (!b.titulo.toLowerCase().includes(s) && !b.autor.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [books, activeCat, filter, search]);

  const destaques = books.filter((b) => b.destaque).slice(0, 6);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl pb-24 md:pb-6">
      {/* SEO Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Livraria Delle</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Descubra centenas de livros — gratuitos ou pagos — organizados por categoria.
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por título ou autor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-11 rounded-2xl"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {(["todos", "gratis", "pago"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="rounded-full"
          >
            {f === "todos" ? "Todos" : f === "gratis" ? "Grátis" : "Pago"}
          </Button>
        ))}
        <Link to="/minha-biblioteca" className="ml-auto">
          <Button size="sm" variant="ghost" className="rounded-full gap-1.5">
            <LibraryIcon className="h-4 w-4" /> Minha Biblioteca
          </Button>
        </Link>
      </div>

      {/* Categories pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        <button
          onClick={() => setActiveCat("todas")}
          className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition ${activeCat === "todas" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
        >
          Todas
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCat(c.id)}
            className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition ${activeCat === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
          >
            {c.nome}
          </button>
        ))}
      </div>

      {/* Featured */}
      {destaques.length > 0 && activeCat === "todas" && !search && filter === "todos" && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Destaques</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {destaques.map((b) => (
              <BookCard key={b.id} book={b} owned={myLibrary.has(b.id)} compact />
            ))}
          </div>
        </section>
      )}

      {/* All books */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          {activeCat === "todas" ? "Todos os livros" : categories.find((c) => c.id === activeCat)?.nome}
          <span className="text-sm font-normal text-muted-foreground ml-2">({filtered.length})</span>
        </h2>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
            Nenhum livro encontrado.
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {filtered.map((b) => (
              <BookCard key={b.id} book={b} owned={myLibrary.has(b.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const BookCard = ({ book, owned, compact }: { book: Book; owned: boolean; compact?: boolean }) => {
  return (
    <Link to={`/livraria/${book.id}`} className="group">
      <div className="relative bg-secondary rounded-2xl overflow-hidden aspect-[2/3] shadow-apple-card group-hover:shadow-apple-card-hover transition-all">
        {book.capa_url ? (
          <img src={book.capa_url} alt={book.titulo} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-blue-400/20">
            <BookOpen className="h-10 w-10 text-primary/60" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          {book.gratuito ? (
            <Badge className="bg-green-500 text-white border-0 text-[10px]">Grátis</Badge>
          ) : (
            <Badge className="bg-primary text-white border-0 text-[10px]">{book.preco_kz} Kz</Badge>
          )}
          {owned && <Badge className="bg-black text-white border-0 text-[10px] gap-1"><Download className="h-2.5 w-2.5" /></Badge>}
        </div>
      </div>
      <div className="mt-2">
        <h3 className={`font-semibold text-foreground line-clamp-2 ${compact ? "text-xs" : "text-sm"}`}>{book.titulo}</h3>
        <p className="text-xs text-muted-foreground line-clamp-1">{book.autor}</p>
      </div>
    </Link>
  );
};

export default LivrariaPage;
