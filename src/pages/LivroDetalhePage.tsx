import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Download, Loader2, Coins, FileText, Upload, Eye, Share2, Copy, Facebook, Instagram, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import PDFViewer from "@/components/PDFViewer";

const LivroDetalhePage = () => {
  const { id, slug } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [owned, setOwned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [openManual, setOpenManual] = useState(false);
  const [comprovativo, setComprovativo] = useState<File | null>(null);
  const [emailConf, setEmailConf] = useState("");
  const [authorPaymentMethods, setAuthorPaymentMethods] = useState<any[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [readingBook, setReadingBook] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) setEmailConf(user.email || "");

      let query = supabase.from("books").select("*, book_categories(nome)");
      
      if (id) {
        query = query.eq("id", id);
      } else if (slug) {
        query = query.eq("slug", slug);
      }

      const { data: b } = await query.maybeSingle();
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
  }, [id, slug]);

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

  const loadAuthorPaymentMethods = async () => {
    if (!book?.criado_por) return;
    setLoadingPaymentMethods(true);

    try {
      // Verificar se o livro foi criado pelo admin usando RPC
      const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin_or_master", { _user_id: book.criado_por });
      
      if (isAdmin) {
        // Se o autor é admin, buscar as configurações de pagamento globais
        const { data, error } = await supabase
          .from("payment_settings")
          .select("chave, valor");
        
        if (error) {
          console.error("Erro ao carregar configurações de pagamento:", error);
          setLoadingPaymentMethods(false);
          return;
        }
        
        // Converter as configurações em formato compatível com book_payout_methods
        const settingsMap: Record<string, string> = {};
        (data || []).forEach((d: any) => { settingsMap[d.chave] = d.valor; });
        
        const adminMethods = [];
        
        // Sempre adicionar IBAN se a chave existir (mesmo que vazio)
        if (settingsMap.hasOwnProperty("iban")) {
          adminMethods.push({
            id: "admin-iban",
            tipo: "iban",
            iban: settingsMap["iban"] || "",
            banco: settingsMap["iban_banco"] || "",
            titular: settingsMap["iban_titular"] || "",
            preferido: true,
          });
        }
        
        // Sempre adicionar Multicaixa se a chave existir (mesmo que vazio)
        if (settingsMap.hasOwnProperty("multicaixa_numero")) {
          adminMethods.push({
            id: "admin-multicaixa",
            tipo: "multicaixa",
            telefone: settingsMap["multicaixa_numero"] || "",
            preferido: !settingsMap["iban"],
          });
        }
        
        setAuthorPaymentMethods(adminMethods);
      } else {
        // Se o autor não é admin, buscar os métodos de pagamento do autor
        const { data, error } = await supabase
          .from("book_payout_methods")
          .select("*")
          .eq("user_id", book.criado_por)
          .order("preferido", { ascending: false })
          .order("criado_em", { ascending: false });
        
        if (error) {
          console.error("Erro ao carregar métodos de pagamento:", error);
          setLoadingPaymentMethods(false);
          return;
        }
        setAuthorPaymentMethods(data || []);
      }
    } catch (err) {
      console.error("Erro ao carregar métodos de pagamento:", err);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handleEnviarComprovativo = async () => {
    if (!comprovativo || !emailConf) return toast({ title: "Preencha todos os campos", variant: "destructive" });
    setProcessing(true);
    const path = `${user.id}/${id}-${Date.now()}-${comprovativo.name}`;
    const { error: upErr } = await supabase.storage.from("book-receipts").upload(path, comprovativo);
    if (upErr) { setProcessing(false); return toast({ title: "Erro ao enviar", description: upErr.message, variant: "destructive" }); }
    const { data: { publicUrl } } = supabase.storage.from("book-receipts").getPublicUrl(path);
    const { error } = await supabase.from("book_purchase_requests").insert({
      user_id: user.id, book_id: id, email_confirmacao: emailConf, ficheiro_url: publicUrl, valor: book.preco_kz,
    });
    setProcessing(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Pedido enviado", description: "Aguarde a aprovação do admin (até 24h)." });
    setOpenManual(false);
  };

  const handleDownload = async () => {
    if (!book.ficheiro_path) return toast({ title: "Erro", description: "Caminho do ficheiro não encontrado", variant: "destructive" });
    
    setProcessing(true);
    try {
      const { data, error } = await supabase.storage.from("book-files").createSignedUrl(book.ficheiro_path, 300);
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
      const { data, error } = await supabase.storage.from("book-files").createSignedUrl(book.ficheiro_path, 3600);
      if (error || !data?.signedUrl) throw error || new Error("URL não gerada");
      
      setReadingBook({ url: data.signedUrl, title: book.titulo });
    } catch (err) {
      toast({ title: "Erro ao abrir leitor", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!book) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="bg-secondary p-6 rounded-full mb-4">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Livro não encontrado</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        O link que você acessou pode estar incorreto ou o livro foi removido da nossa livraria.
      </p>
      <Button asChild>
        <Link to="/livraria">Ir para a Livraria</Link>
      </Button>
    </div>
  );

  const shareUrl = `${window.location.origin}/book/${book.slug || book.id}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({ title: "Link copiado!", description: "O link do livro foi copiado para a sua área de transferência." });
  };

  const shareSocial = (platform: string) => {
    const text = `Confira este livro: ${book.titulo} na Delle Livraria`;
    let url = "";
    
    switch (platform) {
      case "whatsapp":
        url = `https://wa.me/?text=${encodeURIComponent(text + " " + shareUrl)}`;
        break;
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case "instagram":
        // Instagram doesn't have a direct share URL for web, so we copy and inform
        copyToClipboard();
        toast({ title: "Link copiado!", description: "O Instagram não permite partilha direta via web. O link foi copiado para você colar lá." });
        return;
    }
    
    if (url) window.open(url, "_blank");
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl pb-24 md:pb-6">
      <Helmet>
        <title>{book.titulo} | Delle Livraria</title>
        <meta name="description" content={book.descricao || `Livro ${book.titulo} por ${book.autor}`} />
        <meta property="og:title" content={book.titulo} />
        <meta property="og:description" content={book.descricao || `Livro ${book.titulo} por ${book.autor}`} />
        <meta property="og:image" content={book.capa_url || "/placeholder.svg"} />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:type" content="book" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={book.titulo} />
        <meta name="twitter:description" content={book.descricao || `Livro ${book.titulo} por ${book.autor}`} />
        <meta name="twitter:image" content={book.capa_url || "/placeholder.svg"} />
      </Helmet>
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
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="rounded-2xl gap-2">
                  <Share2 className="h-4 w-4" /> Gerar Link / Partilhar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Partilhar Livro</DialogTitle>
                  <DialogDescription>
                    Qualquer pessoa com este link poderá ver os detalhes do livro e comprá-lo.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center space-x-2">
                  <div className="grid flex-1 gap-2">
                    <Input
                      defaultValue={shareUrl}
                      readOnly
                      className="h-9"
                    />
                  </div>
                  <Button type="submit" size="sm" className="px-3" onClick={copyToClipboard}>
                    <span className="sr-only">Copiar</span>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex justify-center gap-4 py-4">
                  <Button variant="outline" size="icon" className="rounded-full" onClick={() => shareSocial("whatsapp")}>
                    <MessageCircle className="h-5 w-5 text-green-500" />
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-full" onClick={() => shareSocial("facebook")}>
                    <Facebook className="h-5 w-5 text-blue-600" />
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-full" onClick={() => shareSocial("instagram")}>
                    <Instagram className="h-5 w-5 text-pink-600" />
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

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
                <Button onClick={() => setOpenManual(true)} variant="outline" size="lg" className="rounded-2xl gap-2">
                  <Upload className="h-4 w-4" /> Pagar {book.preco_kz} Kz (comprovativo)
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={openManual} onOpenChange={(open) => {
        setOpenManual(open);
        if (open) loadAuthorPaymentMethods();
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enviar comprovativo de pagamento</DialogTitle>
            <DialogDescription>
              Faça a transferência de <b>{book.preco_kz} Kz</b> para uma das contas abaixo e envie o comprovativo. O livro será libertado na sua biblioteca após aprovação.
            </DialogDescription>
          </DialogHeader>
          
          {/* Coordenadas bancárias do autor */}
          <div className="space-y-4">
            {loadingPaymentMethods ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : authorPaymentMethods.length === 0 ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <p className="text-sm text-yellow-800">Nenhum método de pagamento configurado pelo autor.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Coordenadas para transferência:</p>
                {authorPaymentMethods.map((method) => (
                  <div key={method.id} className="rounded-lg border p-3 space-y-2">
                    {method.tipo === "iban" ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-primary">IBAN - {method.banco || "Banco"}</span>
                          {method.preferido && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">Preferido</span>}
                        </div>
                        <div className="bg-muted rounded px-2 py-1.5">
                          <p className="text-sm font-mono text-foreground select-all break-all">{method.iban || "—"}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Titular: {method.titular || "—"}</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-primary">Multicaixa Express</span>
                          {method.preferido && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">Preferido</span>}
                        </div>
                        <div className="bg-muted rounded px-2 py-1.5">
                          <p className="text-sm font-mono text-foreground select-all">{method.telefone || "—"}</p>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Email para confirmação</label>
              <Input value={emailConf} onChange={(e) => setEmailConf(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium">Comprovativo (imagem ou PDF)</label>
              <Input type="file" accept="image/*,application/pdf" onChange={(e) => setComprovativo(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenManual(false)}>Cancelar</Button>
            <Button onClick={handleEnviarComprovativo} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
