import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Loader2, Trash2, Edit, Check, X, BookOpen } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - importar worker como URL via Vite (evita falha de CDN)
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Configurar o worker do PDF.js usando bundle local (resolve o erro de CDN bloqueado)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const empty = {
  id: "", titulo: "", autor: "", descricao: "", capa_url: "", ficheiro_path: "",
  category_id: "", gratuito: true, preco_kz: 0, preco_creditos: 0,
  paginas: 0, idioma: "Português", classe: "", isbn: "", destaque: false, publicado: true,
  estado_aprovacao: "aprovado"
};

const AdminLivrariaTab = () => {
  const [books, setBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openBook, setOpenBook] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [newCat, setNewCat] = useState("");

  const [pendingBooks, setPendingBooks] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const [{ data: bs }, { data: cs }, { data: rs }, { data: pb }, { data: po }] = await Promise.all([
      supabase.from("books").select("*, book_categories(nome)").order("criado_em", { ascending: false }),
      supabase.from("book_categories").select("*").order("ordem"),
      supabase.from("book_purchase_requests").select("*, books(titulo)").order("criado_em", { ascending: false }),
      supabase.from("books").select("*, book_categories(nome)").eq("estado_aprovacao", "pendente").order("submetido_em", { ascending: false }),
      supabase.from("book_author_payouts").select("*, books(titulo)").order("criado_em", { ascending: false }).limit(100),
    ]);
    setBooks(bs || []); setCategories(cs || []); setRequests(rs || []);
    setPendingBooks(pb || []); setPayouts(po || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setCoverFile(null); setPdfFile(null); setOpenBook(true); };
  const openEdit = (b: any) => { setForm({ ...b, category_id: b.category_id || "" }); setCoverFile(null); setPdfFile(null); setOpenBook(true); };

  const generateCoverFromPdf = async (file: File): Promise<File | null> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return null;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport, canvas }).promise;
      
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], "cover.jpg", { type: "image/jpeg" }));
          } else {
            resolve(null);
          }
        }, "image/jpeg", 0.8);
      });
    } catch (err) {
      console.error("Erro ao gerar capa do PDF:", err);
      return null;
    }
  };

  const saveBook = async () => {
    if (!form.titulo || !form.autor) return toast({ title: "Título e autor obrigatórios", variant: "destructive" });
    if (!form.id && !pdfFile) return toast({ title: "Anexe o PDF do livro", variant: "destructive" });
    setSaving(true);

    let capaUrl = form.capa_url;
    let ficheiroPath = form.ficheiro_path;

    const sanitize = (name: string) =>
      name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_+/g, "_")
        .slice(-120);

    // Se não houver capa mas houver PDF novo, gerar capa do PDF
    let finalCoverFile = coverFile;
    if (!finalCoverFile && pdfFile && !form.capa_url) {
      toast({ title: "Gerando capa a partir do PDF..." });
      finalCoverFile = await generateCoverFromPdf(pdfFile);
    }

    if (finalCoverFile) {
      const path = `cover-${Date.now()}-${sanitize(finalCoverFile.name)}`;
      const { error } = await supabase.storage.from("book-covers").upload(path, finalCoverFile, {
        upsert: true,
        contentType: finalCoverFile.type || "image/jpeg",
      });
      if (error) { setSaving(false); return toast({ title: "Erro ao enviar capa", description: error.message, variant: "destructive" }); }
      capaUrl = supabase.storage.from("book-covers").getPublicUrl(path).data.publicUrl;
    }

    if (pdfFile) {
      const path = `book-${Date.now()}-${sanitize(pdfFile.name)}`;
      const { error } = await supabase.storage.from("book-files").upload(path, pdfFile, {
        upsert: true,
        contentType: pdfFile.type || "application/pdf",
      });
      if (error) { setSaving(false); return toast({ title: "Erro ao enviar PDF", description: `${error.message}${pdfFile.size > 50*1024*1024 ? ' (ficheiro maior que 50MB)' : ''}`, variant: "destructive" }); }
      ficheiroPath = path;
    }

    const payload: any = {
      titulo: form.titulo, autor: form.autor, descricao: form.descricao,
      capa_url: capaUrl, ficheiro_path: ficheiroPath,
      category_id: form.category_id || null,
      gratuito: form.gratuito,
      preco_kz: form.gratuito ? 0 : Number(form.preco_kz) || 0,
      preco_creditos: form.gratuito ? 0 : Number(form.preco_creditos) || 0,
      paginas: Number(form.paginas) || null, idioma: form.idioma, classe: form.classe, isbn: form.isbn,
      destaque: form.destaque, publicado: form.publicado,
      estado_aprovacao: form.estado_aprovacao || 'aprovado'
    };

    let error;
    if (form.id) {
      ({ error } = await supabase.from("books").update(payload).eq("id", form.id));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); return toast({ title: "Sessão expirada", variant: "destructive" }); }
      ({ error } = await supabase.from("books").insert({ ...payload, criado_por: user.id }));
    }
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: form.id ? "Livro atualizado" : "Livro publicado!" });
    setOpenBook(false);
    load();
  };

  const deleteBook = async (id: string) => {
    if (!confirm("Apagar este livro?")) return;
    await supabase.from("books").delete().eq("id", id);
    toast({ title: "Livro removido" });
    load();
  };

  const addCategory = async () => {
    if (!newCat.trim()) return;
    const slug = newCat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
    const { error } = await supabase.from("book_categories").insert({ nome: newCat, slug, ordem: categories.length + 1 });
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setNewCat(""); load();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Apagar categoria?")) return;
    await supabase.from("book_categories").delete().eq("id", id);
    load();
  };

  const aprovar = async (reqId: string) => {
    const { data, error } = await supabase.rpc("aprovar_compra_livro", { p_request_id: reqId });
    if (error || !(data as any)?.ok) return toast({ title: "Erro ao aprovar", variant: "destructive" });
    toast({ title: "Aprovado e libertado ao utilizador!" });
    load();
  };

  const recusar = async (reqId: string) => {
    await supabase.from("book_purchase_requests").update({ estado: "recusado", atualizado_em: new Date().toISOString() }).eq("id", reqId);
    load();
  };

  const aprovarLivro = async (id: string, ok: boolean) => {
    const motivo = ok ? null : prompt("Motivo da rejeição:") || "Não cumpre os requisitos";
    const { data, error } = await supabase.rpc("aprovar_livro", { p_book_id: id, p_aprovar: ok, p_motivo: motivo });
    if (error || !(data as any)?.ok) return toast({ title: "Erro", variant: "destructive" });
    toast({ title: ok ? "Livro aprovado" : "Livro rejeitado" });
    load();
  };

  const marcarPayoutPago = async (id: string) => {
    if (!confirm("Confirmar que o pagamento foi efetuado ao autor?")) return;
    const { data, error } = await supabase.rpc("marcar_payout_pago", { p_payout_id: id });
    if (error || !(data as any)?.ok) return toast({ title: "Erro", variant: "destructive" });
    toast({ title: "Marcado como pago" });
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Tabs defaultValue="books">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="books">Livros ({books.length})</TabsTrigger>
        <TabsTrigger value="pending">Aprovar ({pendingBooks.length})</TabsTrigger>
        <TabsTrigger value="cats">Categorias ({categories.length})</TabsTrigger>
        <TabsTrigger value="reqs">Pedidos ({requests.filter((r) => r.estado === "pendente").length})</TabsTrigger>
        <TabsTrigger value="payouts">Payouts ({payouts.filter((p) => p.estado === "pendente").length})</TabsTrigger>
      </TabsList>

      <TabsContent value="books">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Livros publicados</CardTitle>
            <Button size="sm" onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo livro</Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {books.map((b) => (
                <div key={b.id} className="group">
                  <div className="relative bg-secondary rounded-xl overflow-hidden aspect-[2/3]">
                    {b.capa_url ? (
                      <img src={b.capa_url} alt={b.titulo} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full"><BookOpen className="h-8 w-8 text-muted-foreground/40" /></div>
                    )}
                    <div className="absolute top-1 left-1 flex gap-1">
                      {b.gratuito ? <Badge className="bg-green-500 text-white text-[9px]">Grátis</Badge> : <Badge className="bg-primary text-white text-[9px]">{b.preco_kz}Kz</Badge>}
                      {!b.publicado && <Badge variant="outline" className="bg-yellow-100 text-[9px]">Oculto</Badge>}
                    </div>
                  </div>
                  <p className="text-xs font-medium mt-1 line-clamp-2">{b.titulo}</p>
                  <div className="flex gap-1 mt-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(b)}><Edit className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600" onClick={() => deleteBook(b.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="cats">
        <Card>
          <CardHeader><CardTitle>Categorias</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nova categoria..." />
              <Button onClick={addCategory}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2">
              {categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <span className="text-sm">{c.nome} <span className="text-xs text-muted-foreground">({c.slug})</span></span>
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteCategory(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="reqs">
        <Card>
          <CardHeader><CardTitle>Pedidos de compra (manuais)</CardTitle></CardHeader>
          <CardContent>
            {requests.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">Nenhum pedido.</p> : (
              <div className="space-y-2">
                {requests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{r.books?.titulo}</p>
                      <p className="text-xs text-muted-foreground">{r.email_confirmacao} • {r.valor} Kz • {new Date(r.criado_em).toLocaleString()}</p>
                      {r.ficheiro_url && <a href={r.ficheiro_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Ver comprovativo</a>}
                    </div>
                    <Badge variant={r.estado === "pendente" ? "secondary" : r.estado === "aprovado" ? "default" : "destructive"}>{r.estado}</Badge>
                    {r.estado === "pendente" && (
                      <div className="flex gap-1 ml-2">
                        <Button size="sm" onClick={() => aprovar(r.id)} className="h-8 gap-1"><Check className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => recusar(r.id)} className="h-8 gap-1 text-red-600"><X className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="pending">
        <Card>
          <CardHeader><CardTitle>Livros submetidos por utilizadores</CardTitle></CardHeader>
          <CardContent>
            {pendingBooks.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">Sem livros pendentes.</p> : (
              <div className="space-y-3">
                {pendingBooks.map((b) => (
                  <div key={b.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="w-16 h-22 bg-secondary rounded-lg overflow-hidden flex-shrink-0">
                      {b.capa_url ? <img src={b.capa_url} alt="" className="w-full h-full object-cover" /> : <BookOpen className="h-6 w-6 m-auto mt-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{b.titulo}</p>
                      <p className="text-xs text-muted-foreground">por {b.autor} · {b.gratuito ? "Grátis" : `${b.preco_kz} Kz`} · {b.book_categories?.nome || "—"}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{b.descricao}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Submetido: {new Date(b.submetido_em).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" onClick={() => aprovarLivro(b.id, true)} className="h-8 gap-1"><Check className="h-3 w-3" /> Aprovar</Button>
                      <Button size="sm" variant="outline" onClick={() => aprovarLivro(b.id, false)} className="h-8 gap-1 text-red-600"><X className="h-3 w-3" /> Rejeitar</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="payouts">
        <Card>
          <CardHeader><CardTitle>Pagamentos a autores</CardTitle></CardHeader>
          <CardContent>
            {payouts.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">Sem payouts.</p> : (
              <div className="space-y-2">
                {payouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{p.books?.titulo}</p>
                      <p className="text-xs text-muted-foreground">{p.valor} {p.metodo === "kz" ? "Kz" : "créditos"} · {new Date(p.criado_em).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={p.estado === "pago" ? "default" : "secondary"}>{p.estado}</Badge>
                      {p.estado === "pendente" && p.metodo === "kz" && (
                        <Button size="sm" onClick={() => marcarPayoutPago(p.id)} className="h-8">Marcar pago</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <Dialog open={openBook} onOpenChange={setOpenBook}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar livro" : "Novo livro"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">Título *</label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
              <div><label className="text-xs font-medium">Autor *</label><Input value={form.autor} onChange={(e) => setForm({ ...form, autor: e.target.value })} /></div>
            </div>
            <div><label className="text-xs font-medium">Descrição</label><Textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Categoria</label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs font-medium">Páginas</label><Input type="number" value={form.paginas} onChange={(e) => setForm({ ...form, paginas: e.target.value })} /></div>
              <div><label className="text-xs font-medium">Classe</label><Input value={form.classe} onChange={(e) => setForm({ ...form, classe: e.target.value })} placeholder="Ex: 10ª classe" /></div>
              <div><label className="text-xs font-medium">Idioma</label><Input value={form.idioma} onChange={(e) => setForm({ ...form, idioma: e.target.value })} /></div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm font-medium">Livro grátis</span>
              <Switch checked={form.gratuito} onCheckedChange={(v) => setForm({ ...form, gratuito: v })} />
            </div>

            {!form.gratuito && (
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium">Preço (Kz)</label><Input type="number" value={form.preco_kz} onChange={(e) => setForm({ ...form, preco_kz: e.target.value })} /></div>
                <div><label className="text-xs font-medium">Preço (créditos)</label><Input type="number" value={form.preco_creditos} onChange={(e) => setForm({ ...form, preco_creditos: e.target.value })} placeholder="0 = só Kz" /></div>
              </div>
            )}

            <div><label className="text-xs font-medium">Capa (imagem)</label><Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} /></div>
            <div><label className="text-xs font-medium">PDF do livro {!form.id && "*"}</label><Input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} /></div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.destaque} onCheckedChange={(v) => setForm({ ...form, destaque: v })} /> Destaque</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.publicado} onCheckedChange={(v) => setForm({ ...form, publicado: v })} /> Publicado</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenBook(false)}>Cancelar</Button>
            <Button onClick={saveBook} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
};

export default AdminLivrariaTab;
