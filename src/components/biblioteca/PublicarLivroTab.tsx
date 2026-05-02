import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Loader2, BookOpen, Eye, Download, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as pdfjsLib from "pdfjs-dist";

// Configurar o worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const sanitize = (name: string) =>
  name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").slice(-120);

const PublicarLivroTab = () => {
  const { user } = useAuth();
  const [myBooks, setMyBooks] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    titulo: "", autor: "", descricao: "", category_id: "", classe: "", paginas: 0,
    idioma: "Português", gratuito: true, preco_kz: 0, preco_creditos: 0,
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: bs }, { data: cs }] = await Promise.all([
      supabase.from("books").select("*, book_categories(nome)").eq("criado_por", user.id).order("criado_em", { ascending: false }),
      supabase.from("book_categories").select("*").eq("ativo", true).order("ordem"),
    ]);
    setMyBooks(bs || []);
    setCategories(cs || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const reset = () => {
    setForm({ titulo: "", autor: "", descricao: "", category_id: "", classe: "", paginas: 0, idioma: "Português", gratuito: true, preco_kz: 0, preco_creditos: 0 });
    setCoverFile(null); setPdfFile(null);
  };

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
      
      await page.render({ canvasContext: context, viewport }).promise;
      
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

  const submit = async () => {
    if (!user) return;
    if (!form.titulo || !form.autor || !pdfFile) {
      return toast({ title: "Preencha título, autor e anexe o PDF", variant: "destructive" });
    }
    if (pdfFile.size > 200 * 1024 * 1024) {
      return toast({ title: "PDF muito grande (máx 200MB)", variant: "destructive" });
    }
    setSaving(true);

    // Se não houver capa mas houver PDF novo, gerar capa do PDF
    let finalCoverFile = coverFile;
    if (!finalCoverFile && pdfFile) {
      toast({ title: "Gerando capa a partir do PDF..." });
      finalCoverFile = await generateCoverFromPdf(pdfFile);
    }

    let capaUrl: string | null = null;
    if (finalCoverFile) {
      const path = `${user.id}/cover-${Date.now()}-${sanitize(finalCoverFile.name)}`;
      const { error } = await supabase.storage.from("book-covers").upload(path, finalCoverFile, { upsert: true, contentType: finalCoverFile.type || "image/jpeg" });
      if (error) { setSaving(false); return toast({ title: "Erro ao enviar capa", description: error.message, variant: "destructive" }); }
      capaUrl = supabase.storage.from("book-covers").getPublicUrl(path).data.publicUrl;
    }

    const ficheiroPath = `${user.id}/book-${Date.now()}-${sanitize(pdfFile.name)}`;
    const { error: upErr } = await supabase.storage.from("book-files").upload(ficheiroPath, pdfFile, { upsert: true, contentType: pdfFile.type || "application/pdf" });
    if (upErr) { setSaving(false); return toast({ title: "Erro ao enviar PDF", description: upErr.message, variant: "destructive" }); }

    const { data, error } = await supabase.rpc("submeter_livro", {
      p_titulo: form.titulo,
      p_autor: form.autor,
      p_descricao: form.descricao || null,
      p_categoria_id: form.category_id || null,
      p_classe: form.classe || null,
      p_paginas: form.paginas || null,
      p_idioma: form.idioma,
      p_gratuito: form.gratuito,
      p_preco_kz: form.gratuito ? 0 : form.preco_kz,
      p_preco_creditos: form.gratuito ? 0 : form.preco_creditos,
      p_capa_url: capaUrl,
      p_ficheiro_path: ficheiroPath,
    });
    setSaving(false);
    const res = data as any;
    if (error || !res?.ok) {
      return toast({ title: "Erro ao publicar", description: error?.message || res?.error, variant: "destructive" });
    }
    toast({ title: "Livro submetido!", description: "Aguarde aprovação do admin." });
    setOpen(false); reset(); load();
  };

  const estadoBadge = (b: any) => {
    if (b.estado_aprovacao === "pendente") return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Pendente</Badge>;
    if (b.estado_aprovacao === "rejeitado") return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Rejeitado</Badge>;
    return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">Publicado</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold">Os meus livros publicados</h2>
          <p className="text-xs text-muted-foreground">Publique livros na livraria. Após aprovação, pode receber pagamentos.</p>
        </div>
        <Button onClick={() => { reset(); setOpen(true); }} className="rounded-2xl gap-2">
          <Plus className="h-4 w-4" /> Publicar Livro
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : myBooks.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Ainda não publicou nenhum livro.</p>
          <Button onClick={() => setOpen(true)} className="mt-4 rounded-2xl">Publicar o meu primeiro livro</Button>
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {myBooks.map((b) => (
            <Card key={b.id} className="overflow-hidden">
              <div className="flex gap-3 p-3">
                <div className="w-20 h-28 bg-secondary rounded-xl overflow-hidden flex-shrink-0">
                  {b.capa_url ? <img src={b.capa_url} alt={b.titulo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen className="h-6 w-6 text-muted-foreground" /></div>}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-semibold text-sm line-clamp-2">{b.titulo}</h3>
                  <p className="text-xs text-muted-foreground">{b.gratuito ? "Grátis" : `${b.preco_kz} Kz · ${b.preco_creditos} créd`}</p>
                  {estadoBadge(b)}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {b.visualizacoes}</span>
                    <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {b.downloads}</span>
                  </div>
                  {b.estado_aprovacao === "rejeitado" && b.motivo_rejeicao && (
                    <p className="text-[10px] text-red-600 mt-1 line-clamp-2">{b.motivo_rejeicao}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Publicar novo livro</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Autor *</Label>
              <Input value={form.autor} onChange={(e) => setForm({ ...form, autor: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Descrição</Label>
              <Textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Escolher" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Classe</Label>
              <Input value={form.classe} onChange={(e) => setForm({ ...form, classe: e.target.value })} placeholder="Ex: 10ª" />
            </div>
            <div>
              <Label>Páginas</Label>
              <Input type="number" value={form.paginas} onChange={(e) => setForm({ ...form, paginas: +e.target.value })} />
            </div>
            <div>
              <Label>Idioma</Label>
              <Input value={form.idioma} onChange={(e) => setForm({ ...form, idioma: e.target.value })} />
            </div>
            <div className="col-span-2 flex items-center justify-between p-3 rounded-xl bg-secondary">
              <Label className="cursor-pointer">Livro gratuito</Label>
              <Switch checked={form.gratuito} onCheckedChange={(v) => setForm({ ...form, gratuito: v })} />
            </div>
            {!form.gratuito && (
              <>
                <div>
                  <Label>Preço (Kz)</Label>
                  <Input type="number" value={form.preco_kz} onChange={(e) => setForm({ ...form, preco_kz: +e.target.value })} />
                </div>
                <div>
                  <Label>Preço (créditos)</Label>
                  <Input type="number" value={form.preco_creditos} onChange={(e) => setForm({ ...form, preco_creditos: +e.target.value })} />
                </div>
              </>
            )}
            <div className="col-span-2">
              <Label>Capa (imagem)</Label>
              <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
            </div>
            <div className="col-span-2">
              <Label>Ficheiro PDF * (máx 200MB)</Label>
              <Input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Submeter para aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Métricas */}
      {myBooks.length > 0 && <MetricasAutor books={myBooks} userId={user?.id} />}
    </div>
  );
};

// Sub-componente de métricas
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { pt } from "date-fns/locale";

const MetricasAutor = ({ books, userId }: { books: any[]; userId?: string }) => {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [chart, setChart] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
    if (!userId) return;
    setLoading(true);
    const { data: po } = await supabase
      .from("book_author_payouts")
      .select("*, books(titulo)")
      .eq("author_id", userId)
      .order("criado_em", { ascending: false });
    
    setPayouts(po || []);

    // Dados para o gráfico (últimos 30 dias)
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = startOfDay(subDays(new Date(), i));
      return {
        date: d,
        label: format(d, "dd/MM"),
        vendas: 0,
        valor: 0
      };
    }).reverse();

    po?.forEach(p => {
      const d = startOfDay(new Date(p.criado_em));
      const entry = days.find(day => day.date.getTime() === d.getTime());
      if (entry) {
        entry.vendas += 1;
        entry.valor += Number(p.valor);
      }
    });

    setChart(days);
    setLoading(false);
  };

  useEffect(() => { loadMetrics(); }, [userId]);

  const totalGeral = payouts.reduce((s, p) => s + Number(p.valor), 0);
  const totalPendente = payouts.filter(p => p.estado === "pendente").reduce((s, p) => s + Number(p.valor), 0);
  const totalViews = books.reduce((s, b) => s + (b.visualizacoes || 0), 0);
  const totalDownloads = books.reduce((s, b) => s + (b.downloads || 0), 0);

  return (
    <div className="space-y-6 pt-6 border-t">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Ganho</p>
          <p className="text-xl font-bold">{totalGeral.toLocaleString()} Kz</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Pendente</p>
          <p className="text-xl font-bold text-primary">{totalPendente.toLocaleString()} Kz</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Visualizações</p>
          <p className="text-xl font-bold">{totalViews}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Downloads</p>
          <p className="text-xl font-bold">{totalDownloads}</p>
        </Card>
      </div>

      <Card className="p-4">
        <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Desempenho (30 dias)</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Faturamento por livro */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Faturamento por livro</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {books.map((b) => {
              const ps = payouts.filter((p) => p.book_id === b.id);
              const total = ps.reduce((s, p) => s + Number(p.valor), 0);
              if (total === 0) return null;
              return (
                <div key={b.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-10 bg-secondary rounded overflow-hidden flex-shrink-0">
                      {b.capa_url && <img src={b.capa_url} className="w-full h-full object-cover" />}
                    </div>
                    <p className="text-sm font-medium line-clamp-1">{b.titulo}</p>
                  </div>
                  <p className="text-sm font-bold whitespace-nowrap">{total.toLocaleString()} Kz</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Últimas vendas */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Últimas vendas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {payouts.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{p.books?.titulo || "Livro"}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(p.criado_em), "dd 'de' MMMM, HH:mm", { locale: pt })}</p>
                </div>
                <Badge variant={p.estado === "pago" ? "default" : "secondary"} className="text-[10px]">
                  {p.valor} Kz
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicarLivroTab;
