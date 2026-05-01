import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Wallet, CreditCard } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const FaturamentoAutorTab = () => {
  const { user } = useAuth();
  const [methods, setMethods] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ tipo: "iban", iban: "", banco: "", titular: "", telefone: "", preferido: false });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: ms }, { data: ps }] = await Promise.all([
      supabase.from("book_payout_methods").select("*").eq("user_id", user.id).order("criado_em", { ascending: false }),
      supabase.from("book_author_payouts").select("*, books(titulo)").eq("author_id", user.id).order("criado_em", { ascending: false }),
    ]);
    setMethods(ms || []); setPayouts(ps || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const addMethod = async () => {
    if (!user) return;
    if (form.tipo === "iban" && !form.iban) return toast({ title: "IBAN obrigatório", variant: "destructive" });
    if (form.tipo === "telefone" && !form.telefone) return toast({ title: "Telefone obrigatório", variant: "destructive" });
    setSaving(true);

    if (form.preferido) {
      await supabase.from("book_payout_methods").update({ preferido: false }).eq("user_id", user.id);
    }
    const { error } = await supabase.from("book_payout_methods").insert({ ...form, user_id: user.id });
    setSaving(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Método adicionado" });
    setForm({ tipo: "iban", iban: "", banco: "", titular: "", telefone: "", preferido: false });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este método?")) return;
    await supabase.from("book_payout_methods").delete().eq("id", id);
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const pendenteKz = payouts.filter((p) => p.estado === "pendente" && p.metodo === "kz").reduce((s, p) => s + Number(p.valor || 0), 0);
  const pagoKz = payouts.filter((p) => p.estado === "pago" && p.metodo === "kz").reduce((s, p) => s + Number(p.valor || 0), 0);

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> A receber</p>
          <p className="text-2xl font-bold text-yellow-600">{pendenteKz.toLocaleString()} Kz</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3" /> Já recebido</p>
          <p className="text-2xl font-bold text-green-600">{pagoKz.toLocaleString()} Kz</p>
        </CardContent></Card>
      </div>

      {/* Métodos de pagamento */}
      <Card>
        <CardHeader><CardTitle className="text-base">Os meus métodos de pagamento</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {methods.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum método cadastrado. Adicione um para receber pagamentos pelas vendas.</p>
          ) : (
            <div className="space-y-2">
              {methods.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm capitalize">{m.tipo}</span>
                      {m.preferido && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">Preferido</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.tipo === "iban" ? `${m.banco || ""} · ${m.iban} · ${m.titular || ""}` : m.telefone}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-4 space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2"><Plus className="h-4 w-4" /> Novo método</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iban">IBAN</SelectItem>
                    <SelectItem value="telefone">Telefone (Multicaixa Express)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.tipo === "iban" ? (
                <>
                  <div><Label>Banco</Label><Input value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} placeholder="BAI, BFA..." /></div>
                  <div className="col-span-2"><Label>IBAN</Label><Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} placeholder="AO06..." /></div>
                  <div className="col-span-2"><Label>Titular</Label><Input value={form.titular} onChange={(e) => setForm({ ...form, titular: e.target.value })} /></div>
                </>
              ) : (
                <div><Label>Número</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="9XX XXX XXX" /></div>
              )}
              <div className="col-span-2 flex items-center justify-between p-2 rounded-lg bg-secondary">
                <Label className="cursor-pointer">Definir como preferido</Label>
                <Switch checked={form.preferido} onCheckedChange={(v) => setForm({ ...form, preferido: v })} />
              </div>
            </div>
            <Button onClick={addMethod} disabled={saving} className="w-full rounded-xl">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Adicionar método
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de pagamentos */}
      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de ganhos</CardTitle></CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem ganhos ainda.</p>
          ) : (
            <div className="space-y-2">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{p.books?.titulo || "Livro"}</p>
                    <p className="text-[10px] text-muted-foreground">{format(new Date(p.criado_em), "dd MMM yyyy", { locale: pt })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{p.valor} {p.metodo === "kz" ? "Kz" : "créd"}</p>
                    <Badge variant="outline" className={p.estado === "pago" ? "bg-green-100 text-green-800 text-[9px]" : "bg-yellow-100 text-yellow-800 text-[9px]"}>{p.estado}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FaturamentoAutorTab;
