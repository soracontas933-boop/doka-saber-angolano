import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  BookOpen,
  Download,
  Sparkles,
  Library as LibraryIcon,
  Loader2,
  Flame,
  Star,
  TrendingUp,
  ShoppingBag,
  Zap,
  ArrowRight,
} from "lucide-react";

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
  criado_em?: string;
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
        supabase
          .from("books")
          .select("*")
          .eq("publicado", true)
          .order("destaque", { ascending: false })
          .order("criado_em", { ascending: false }),
        supabase.from("book_categories").select("*").eq("ativo", true).order("ordem"),
        supabase.auth.getUser(),
      ]);
      setBooks((bs as Book[]) || []);
      setCategories((cs as Category[]) || []);
      if (user) {
        const { data: lib } = await supabase
          .from("book_library")
          .select("book_id")
          .eq("user_id", user.id);
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
        if (
          !b.titulo.toLowerCase().includes(s) &&
          !b.autor.toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [books, activeCat, filter, search]);

  const destaques = books.filter((b) => b.destaque).slice(0, 8);
  const maisVendidos = [...books].sort((a, b) => b.downloads - a.downloads).slice(0, 8);
  const novidades = [...books].slice(0, 8);
  const isClean = activeCat === "todas" && !search && filter === "todos";

  const countByCategory = (catId: string) =>
    books.filter((b) => b.category_id === catId).length;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-blue-600 to-indigo-700 text-white">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-yellow-300/30 rounded-full blur-3xl" />
        </div>
        <div className="relative container mx-auto px-4 py-10 md:py-16 max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-2xl">
              <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm mb-3 gap-1">
                <ShoppingBag className="h-3 w-3" /> Vitrine de Infoprodutos
              </Badge>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
                Aprenda com os melhores <br className="hidden md:block" />
                <span className="bg-gradient-to-r from-yellow-200 to-white bg-clip-text text-transparent">
                  livros e materiais digitais
                </span>
              </h1>
              <p className="text-white/90 text-sm md:text-base mt-3 max-w-lg">
                Centenas de eBooks, manuais e cursos em PDF — gratuitos ou pagos.
                Compre com créditos da conta ou comprovativo.
              </p>
            </div>
            <Link to="/minha-biblioteca">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 rounded-full font-semibold shadow-xl gap-2"
              >
                <LibraryIcon className="h-4 w-4" /> Minha Biblioteca
              </Button>
            </Link>
          </div>

          {/* Search */}
          <div className="mt-8 relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="O que você quer aprender hoje?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 rounded-2xl text-foreground bg-white border-0 shadow-2xl text-base"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-6 max-w-2xl">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/20">
              <div className="text-xl md:text-2xl font-bold">{books.length}+</div>
              <div className="text-xs text-white/80">Produtos</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/20">
              <div className="text-xl md:text-2xl font-bold">{categories.length}</div>
              <div className="text-xs text-white/80">Categorias</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/20">
              <div className="text-xl md:text-2xl font-bold">
                {books.filter((b) => b.gratuito).length}
              </div>
              <div className="text-xs text-white/80">Grátis</div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 max-w-7xl">
        {/* Filters bar */}
        <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-md border-b">
          <div className="flex items-center gap-2 flex-wrap">
            {(["todos", "gratis", "pago"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                onClick={() => setFilter(f)}
                className="rounded-full"
              >
                {f === "todos" && <Sparkles className="h-3 w-3 mr-1" />}
                {f === "gratis" && <Zap className="h-3 w-3 mr-1" />}
                {f === "pago" && <Flame className="h-3 w-3 mr-1" />}
                {f === "todos" ? "Todos" : f === "gratis" ? "Grátis" : "Pagos"}
              </Button>
            ))}
            <div className="hidden md:flex gap-1 overflow-x-auto ml-2">
              <Button
                size="sm"
                variant={activeCat === "todas" ? "secondary" : "ghost"}
                onClick={() => setActiveCat("todas")}
                className="rounded-full"
              >
                Todas categorias
              </Button>
              {categories.slice(0, 6).map((c) => (
                <Button
                  key={c.id}
                  size="sm"
                  variant={activeCat === c.id ? "secondary" : "ghost"}
                  onClick={() => setActiveCat(c.id)}
                  className="rounded-full whitespace-nowrap"
                >
                  {c.nome}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile categories pills */}
        <div className="flex md:hidden gap-2 overflow-x-auto py-4 -mx-4 px-4 scrollbar-none">
          <button
            onClick={() => setActiveCat("todas")}
            className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition ${
              activeCat === "todas"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground"
            }`}
          >
            Todas
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition ${
                activeCat === c.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}
            >
              {c.nome}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* DESTAQUES */}
            {isClean && destaques.length > 0 && (
              <section className="py-6">
                <SectionHeader
                  icon={<Sparkles className="h-5 w-5 text-yellow-500" />}
                  title="Em destaque"
                  subtitle="Selecionados pela equipa Delle"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {destaques.slice(0, 4).map((b) => (
                    <BookCardLarge key={b.id} book={b} owned={myLibrary.has(b.id)} />
                  ))}
                </div>
              </section>
            )}

            {/* MAIS VENDIDOS */}
            {isClean && maisVendidos.length > 0 && (
              <section className="py-6">
                <SectionHeader
                  icon={<TrendingUp className="h-5 w-5 text-orange-500" />}
                  title="Mais baixados"
                  subtitle="Os preferidos dos estudantes"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                  {maisVendidos.map((b, i) => (
                    <BookCard
                      key={b.id}
                      book={b}
                      owned={myLibrary.has(b.id)}
                      rank={i + 1}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* NOVIDADES */}
            {isClean && novidades.length > 0 && (
              <section className="py-6">
                <SectionHeader
                  icon={<Zap className="h-5 w-5 text-primary" />}
                  title="Novidades"
                  subtitle="Recém-adicionados à vitrine"
                />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                  {novidades.map((b) => (
                    <BookCard key={b.id} book={b} owned={myLibrary.has(b.id)} />
                  ))}
                </div>
              </section>
            )}

            {/* CATALOG / FILTER RESULTS */}
            <section className="py-6">
              <SectionHeader
                icon={<BookOpen className="h-5 w-5 text-primary" />}
                title={
                  activeCat === "todas"
                    ? "Todo o catálogo"
                    : categories.find((c) => c.id === activeCat)?.nome || "Resultados"
                }
                subtitle={`${filtered.length} ${filtered.length === 1 ? "produto" : "produtos"}`}
              />
              {filtered.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
                    Nenhum produto encontrado.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                  {filtered.map((b) => (
                    <BookCard key={b.id} book={b} owned={myLibrary.has(b.id)} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

const SectionHeader = ({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) => (
  <div className="flex items-end justify-between mb-4">
    <div>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
      </div>
      {subtitle && (
        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  </div>
);

const BookCardLarge = ({ book, owned }: { book: Book; owned: boolean }) => (
  <Link to={`/livraria/${book.id}`} className="group block">
    <Card className="overflow-hidden border-0 shadow-apple-card hover:shadow-apple-card-hover transition-all hover:-translate-y-1 rounded-2xl">
      <div className="relative aspect-[16/10] bg-gradient-to-br from-primary/20 to-blue-400/20 overflow-hidden">
        {book.capa_url ? (
          <img
            src={book.capa_url}
            alt={book.titulo}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-12 w-12 text-primary/60" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {book.gratuito ? (
            <Badge className="bg-green-500 text-white border-0 shadow-md">Grátis</Badge>
          ) : (
            <Badge className="bg-primary text-white border-0 shadow-md">
              {book.preco_kz.toLocaleString()} Kz
            </Badge>
          )}
          {book.destaque && (
            <Badge className="bg-yellow-500 text-white border-0 gap-1 shadow-md">
              <Sparkles className="h-3 w-3" /> Top
            </Badge>
          )}
        </div>
        {owned && (
          <Badge className="absolute top-3 right-3 bg-black/80 text-white border-0 gap-1 backdrop-blur-sm">
            <Download className="h-3 w-3" /> Adquirido
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-bold text-base line-clamp-2 mb-1">{book.titulo}</h3>
        <p className="text-xs text-muted-foreground mb-2">por {book.autor}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">4.8</span>
            <span className="text-muted-foreground">
              · {book.downloads} downloads
            </span>
          </div>
          <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition" />
        </div>
      </CardContent>
    </Card>
  </Link>
);

const BookCard = ({
  book,
  owned,
  rank,
}: {
  book: Book;
  owned: boolean;
  rank?: number;
}) => {
  return (
    <Link to={`/livraria/${book.id}`} className="group block">
      <div className="relative bg-secondary rounded-2xl overflow-hidden aspect-[2/3] shadow-apple-card group-hover:shadow-apple-card-hover transition-all group-hover:-translate-y-1">
        {book.capa_url ? (
          <img
            src={book.capa_url}
            alt={book.titulo}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-blue-400/20">
            <BookOpen className="h-10 w-10 text-primary/60" />
          </div>
        )}

        {/* Rank badge */}
        {rank && rank <= 3 && (
          <div className="absolute -top-1 -left-1 w-9 h-9 flex items-center justify-center rounded-br-2xl bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold text-sm shadow-lg">
            #{rank}
          </div>
        )}

        {/* Bottom gradient + price */}
        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <div className="flex items-center justify-between gap-1">
            {book.gratuito ? (
              <Badge className="bg-green-500 text-white border-0 text-[10px] font-bold">
                GRÁTIS
              </Badge>
            ) : (
              <Badge className="bg-white text-primary border-0 text-[10px] font-bold">
                {book.preco_kz.toLocaleString()} Kz
              </Badge>
            )}
            {owned && (
              <Badge className="bg-black/70 text-white border-0 text-[10px] gap-0.5 backdrop-blur-sm">
                <Download className="h-2.5 w-2.5" />
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2 px-0.5">
        <h3 className="font-semibold text-foreground line-clamp-2 text-sm leading-tight">
          {book.titulo}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
          {book.autor}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span className="text-[11px] font-medium">4.8</span>
          <span className="text-[11px] text-muted-foreground">
            · {book.downloads}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default LivrariaPage;
