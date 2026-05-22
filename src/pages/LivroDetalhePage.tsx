import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Download, Loader2, Coins, FileText, Upload, Eye, Share2, Copy, Facebook, Instagram, MessageCircle, Check, Building2, Smartphone } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import PDFViewer from "@/components/PDFViewer";
import AuthRequiredDialog from "@/components/AuthRequiredDialog";

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
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [authDialogMessage, setAuthDialogMessage] = useState("Você precisa criar uma conta ou fazer login para usar esta funcionalidade.");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    if (!user) {
      setAuthDialogMessage("Crie uma conta ou faça login para obter este livro gratuitamente.");
      setShowAuthDialog(true);
      return;
    }
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
    if (!user) {
      setAuthDialogMessage("Crie uma conta ou faça login para comprar este livro com créditos.");
      setShowAuthDialog(true);
      return;
    }
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

  const copyToClipboardPayment = async (text: string, id: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopiedId(id);
      toast({ title: "Copiado!", description: "Dados copiados para a área de transferência." });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Erro ao copiar:", err);
      toast({ title: "Erro ao copiar", description: "Não foi possível copiar automaticamente.", variant: "destructive" });
    }
  };

  const loadAuthorPaymentMethods = async () => {
    setLoadingPaymentMethods(true);
    try {
      // Buscar os métodos de pagamento configurados nas assinaturas (payment_settings)
      const { data: paymentSettings, error } = await (supabase.from("payment_settings") as any)
        .select("chave, valor");
      
      if (error) {
        console.error("Erro ao buscar payment_settings:", error);
        setAuthorPaymentMethods([]);
        return;
      }
      
      if (!paymentSettings || paymentSettings.length === 0) {
        setAuthorPaymentMethods([]);
        return;
      }
      
      // Converter payment_settings para formato de métodos
      const settingsMap: Record<string, string> = {};
      paymentSettings.forEach((s: any) => {
        settingsMap[s.chave] = s.valor;
      });
      
      const methods = [];
      
      // Adicionar IBAN se configurado
      if (settingsMap.iban) {
        methods.push({
          id: "payment-iban",
          tipo: "iban",
          iban: settingsMap.iban,
          banco: settingsMap.iban_banco || "Banco",
          titular: settingsMap.iban_titular || "—",
          preferido: true,
        });
      }
      
      // Adicionar Multicaixa se configurado
      if (settingsMap.multicaixa_numero) {
        methods.push({
          id: "payment-multicaixa",
          tipo: "multicaixa",
          telefone: settingsMap.multicaixa_numero,
          preferido: false,
        });
      }
      
      setAuthorPaymentMethods(methods);
    } catch (err) {
      console.error("Erro ao carregar métodos de pagamento:", err);
      setAuthorPaymentMethods([]);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handleEnviarComprovativo = async () => {
    if (!comprovativo || !emailConf) return toast({ title: "Preencha todos os campos", variant: "destructive" });
    setProcessing(true);
    
    try {
      const fileName = `${id}-${Date.now()}-${comprovativo.name}`;
      const path = user ? `${user.id}/${fileName}` : `guest/${fileName}`;
      
      const { error: upErr } = await supabase.storage.from("book-receipts").upload(path, comprovativo);
      if (upErr) throw upErr;
      
      const { data: { publicUrl } } = supabase.storage.from("book-receipts").getPublicUrl(path);
      
      const { error } = await (supabase.from("book_purchase_requests") as any).insert({
        user_id: user?.id || null, 
        book_id: id, 
        email_confirmacao: emailConf, 
        ficheiro_url: publicUrl, 
        valor: book.preco_kz,
      });
      
      if (error) throw error;
      
      toast({ title: "Pedido enviado", description: "Aguarde a aprovação do admin (até 24h). O link do livro será enviado para o seu email." });
      setOpenManual(false);
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message || "Ocorreu um erro inesperado", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!user) {
      setAuthDialogMessage("Crie uma conta ou faça login para baixar este livro.");
      setShowAuthDialog(true);
      return;
    }
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
    if (!user) {
      setAuthDialogMessage("Crie uma conta ou faça login para ler este livro.");
      setShowAuthDialog(true);
      return;
    }
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

  const shareUrl = `${window.location.origin}/book/${book.id}`;

  const copyToClipboard = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      toast({ title: "Link copiado!", description: "O link do livro foi copiado para a sua área de transferência." });
    } catch (err) {
      console.error("Erro ao copiar link:", err);
      toast({ title: "Erro ao copiar", description: "Não foi possível copiar o link automaticamente.", variant: "destructive" });
    }
  };

  const shareSocial = async (platform: string) => {
    const text = `Confira este livro: ${book.titulo} na Delle Livraria`;
    let url = "";
    
    // Web Share API for mobile/modern browsers
    if (platform === "native" && navigator.share) {
      try {
        await navigator.share({
          title: book.titulo,
          text: text,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Erro ao partilhar:", err);
        }
      }
    }

    switch (platform) {
      case "whatsapp":
        url = `https://wa.me/?text=${encodeURIComponent(text + " " + shareUrl)}`;
        break;
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case "instagram":
        await copyToClipboard();
        toast({ title: "Link copiado!", description: "O Instagram não permite partilha direta via web. O link foi copiado para você colar lá." });
        return;
    }
    
    if (url) {
      const newWindow = window.open(url, "_blank", "noopener,noreferrer");
      if (newWindow) newWindow.opener = null;
    }
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
                  {navigator.share && (
                    <Button variant="outline" size="icon" className="rounded-full" onClick={() => shareSocial("native")}>
                      <Share2 className="h-5 w-5 text-primary" />
                    </Button>
                  )}
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
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            <span className="text-xs font-semibold text-primary">IBAN - {method.banco || "Banco"}</span>
                            {method.preferido && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">Preferido</span>}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboardPayment(method.iban || "", method.id)}
                          >
                            {copiedId === method.id ? (
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                        <div className="bg-muted rounded px-2 py-1.5">
                          <p className="text-sm font-mono text-foreground select-all break-all">{method.iban || "—"}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Titular: {method.titular || "—"}</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-primary" />
                            <span className="text-xs font-semibold text-primary">Multicaixa Express</span>
                            {method.preferido && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">Preferido</span>}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboardPayment(method.telefone || "", method.id)}
                          >
                            {copiedId === method.id ? (
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
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

      <AuthRequiredDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        title="Autenticação Necessária"
        description={authDialogMessage}
      />
    </div>
  );
};

export default LivroDetalhePage;
