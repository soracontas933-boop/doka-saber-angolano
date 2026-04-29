import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Download, Loader2, Coins, FileText, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const LivroDetalhePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [owned, setOwned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [openManual, setOpenManual] = useState(false);
  const [comprovativo, setComprovativo] = useState<File | null>(null);
  const [emailConf, setEmailConf] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) setEmailConf(user.email || "");

      const { data: b } = await supabase.from("books").select("*, book_categories(nome)").eq("id", id).maybeSingle();
      setBook(b);

      if (user && b) {
        const { data: lib } = await supabase.from("book_library").select("id").eq("user_id", user.id).eq("book_id", b.id).maybeSingle();
        setOwned(!!lib);
        await supabase.from("books").update({ visualizacoes: (b.visualizacoes || 0) + 1 }).eq("id", b.id);
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
    setProcessing(true);
    const { data, error } = await supabase.storage.from("book-files").createSignedUrl(book.ficheiro_path, 300);
    setProcessing(false);
    if (error || !data?.signedUrl) return toast({ title: "Erro ao gerar download", variant: "destructive" });
    window.open(data.signedUrl, "_blank");
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
              <Button onClick={handleDownload} disabled={processing} size="lg" className="rounded-2xl gap-2">
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Baixar PDF
              </Button>
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

      <Dialog open={openManual} onOpenChange={setOpenManual}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar comprovativo de pagamento</DialogTitle>
            <DialogDescription>
              Faça a transferência de <b>{book.preco_kz} Kz</b> e envie aqui o comprovativo. O livro será libertado na sua biblioteca após aprovação.
            </DialogDescription>
          </DialogHeader>
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
    </div>
  );
};

export default LivroDetalhePage;
