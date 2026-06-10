import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_CONFIGS, type PlanKey } from "@/hooks/use-user-plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, Loader2, Download, ExternalLink, Save, Building2, Smartphone, Pencil, Link2, Webhook, Copy, Shield, ShoppingCart } from "lucide-react";
import { fetchAdminUsers } from "@/lib/admin-api";

interface PaymentRequest {
  id: string;
  user_id: string;
  plano: string;
  valor: number;
  email_confirmacao: string;
  ficheiro_url: string | null;
  estado: string;
  criado_em: string;
  // joined
  user_nome?: string;
  user_email?: string;
}

const ESTADO_COLORS: Record<string, string> = {
  pendente: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  aprovado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rejeitado: "bg-destructive/15 text-destructive",
};

const PLAN_LABELS: Record<string, string> = {
  gratuito: "Gratuito",
  basico: "Básico",
  intermedio: "Intermédio",
  profissional: "Profissional",
  premium: "Premium",
};

const AdminPaymentsTab = () => {
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "aprovar" | "rejeitar";
    payment: PaymentRequest | null;
  }>({ open: false, action: "aprovar", payment: null });

  // Payment settings state
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);
  const [iban, setIban] = useState("");
  const [ibanBanco, setIbanBanco] = useState("");
  const [ibanTitular, setIbanTitular] = useState("");
  const [multicaixaNumero, setMulticaixaNumero] = useState("");

  // Payment links state (automatic payments)
  const [editingLinks, setEditingLinks] = useState(false);
  const [savingLinks, setSavingLinks] = useState(false);
  const [paymentLinks, setPaymentLinks] = useState<Record<string, string>>({
    link_basico: "",
    link_intermedio: "",
    link_profissional: "",
    link_premium: "",
  });

  // Webhook settings state
  const [webhookSecret, setWebhookSecret] = useState("");
  const [editingWebhook, setEditingWebhook] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);

  // Checkout sessions counter (realtime)
  const [activeCheckouts, setActiveCheckouts] = useState(0);

  const fetchPayments = useCallback(async () => {
    setLoading(true);

    const { data: paymentsData } = await (supabase.from("payment_requests") as any)
      .select("*")
      .order("criado_em", { ascending: false });

    if (!paymentsData) {
      setLoading(false);
      return;
    }

    const userIds = [...new Set(paymentsData.map((p: any) => p.user_id))];
    
    // Fetch profiles and emails for these specific users
    let emailMap: Record<string, string> = {};
    let nameMap: Record<string, string> = {};
    
    try {
      if (userIds.length > 0) {
        const res = await fetchAdminUsers(1, 100, "", userIds.join(","));
        if (res && res.users) {
          res.users.forEach(u => {
            emailMap[u.id] = u.email;
            nameMap[u.id] = u.nome;
          });
        }
      }
    } catch (err) {
      console.error(err);
      // Fallback to profiles table if function fails
      const { data: profiles } = await (supabase.from("profiles") as any)
        .select("id, nome")
        .in("id", userIds);
      profiles?.forEach((p: any) => { nameMap[p.id] = p.nome; });
    }

    const enriched: PaymentRequest[] = paymentsData.map((p: any) => ({
      ...p,
      user_nome: nameMap[p.user_id] || "Sem nome",
      user_email: emailMap[p.user_id] || p.email_confirmacao,
    }));

    setPayments(enriched);
    setLoading(false);
  }, []);

  const fetchActiveCheckouts = useCallback(async () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count } = await (supabase.from("checkout_sessions") as any)
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .gte("criado_em", thirtyMinAgo);
    setActiveCheckouts(count || 0);
  }, []);

  useEffect(() => {
    fetchPayments();
    fetchSettings();
    fetchActiveCheckouts();

    const channel = supabase
      .channel("checkout-sessions-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checkout_sessions" },
        () => {
          fetchActiveCheckouts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPayments, fetchActiveCheckouts]);

  const viewReceipt = async (filePath: string) => {
    const { data } = await supabase.storage
      .from("comprovativos")
      .createSignedUrl(filePath, 300);
    if (data?.signedUrl) {
      setPreviewUrl(data.signedUrl);
      setPreviewOpen(true);
    } else {
      toast({ title: "Erro ao carregar comprovativo", variant: "destructive" });
    }
  };

  const handleAction = async (action: "aprovar" | "rejeitar") => {
    const payment = confirmDialog.payment;
    if (!payment) return;

    setProcessing(payment.id);
    try {
      if (action === "aprovar") {
        await (supabase.from("payment_requests") as any)
          .update({
            estado: "aprovado",
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", payment.id);

        const planKey = payment.plano as PlanKey;
        const config = PLAN_CONFIGS[planKey];
        if (config) {
          await (supabase.from("user_plans") as any)
            .update({
              plano: planKey,
              limite_trabalhos: config.limite_trabalhos,
              limite_resumos: config.limite_resumos,
              limite_questionarios: config.limite_questionarios,
              limite_planos_aula: config.limite_planos_aula,
              limite_tfc: config.limite_tfc,
              creditos_totais: config.creditos_totais,
              creditos_usados: 0,
              suporte_prioritario: config.suporte_prioritario,
              pago_em: new Date().toISOString(),
              atualizado_em: new Date().toISOString(),
              periodo_inicio: new Date().toISOString(),
            })
            .eq("user_id", payment.user_id);
        }

        await (supabase.from("notifications") as any).insert({
          user_id: payment.user_id,
          titulo: "Plano Activado! 🎉",
          mensagem: `O seu plano ${PLAN_LABELS[planKey] || planKey} foi activado com sucesso. Os seus créditos e limites foram actualizados. Aproveite!`,
          tipo: "sucesso",
        });

        const planPrice = config ? config.preco : payment.valor;
        await (supabase.from("billing_records") as any).insert({
          tipo: "entrada",
          descricao: `Assinatura ${PLAN_LABELS[planKey] || planKey} - ${payment.email_confirmacao}`,
          valor: planPrice || payment.valor,
          plano: planKey,
          user_email: payment.email_confirmacao,
          categoria: "assinatura",
        });

        toast({ title: "Pagamento aprovado e plano actualizado!" });
      } else {
        await (supabase.from("payment_requests") as any)
          .update({
            estado: "rejeitado",
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", payment.id);

        await (supabase.from("notifications") as any).insert({
          user_id: payment.user_id,
          titulo: "Pagamento não aprovado",
          mensagem: `O comprovativo enviado para o plano ${PLAN_LABELS[payment.plano] || payment.plano} não foi aprovado. Verifique os dados e tente novamente, ou contacte o suporte.`,
          tipo: "aviso",
        });

        toast({ title: "Pagamento rejeitado e utilizador notificado." });
      }

      setConfirmDialog({ open: false, action: "aprovar", payment: null });
      fetchPayments();
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao processar", variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const fetchSettings = async () => {
    setSettingsLoading(true);
    const { data } = await (supabase.from("payment_settings") as any).select("chave, valor");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((d: any) => { map[d.chave] = d.valor; });
      setIban(map["iban"] || "");
      setIbanBanco(map["iban_banco"] || "");
      setIbanTitular(map["iban_titular"] || "");
      setMulticaixaNumero(map["multicaixa_numero"] || "");
      setPaymentLinks({
        link_basico: map["link_basico"] || "",
        link_intermedio: map["link_intermedio"] || "",
        link_profissional: map["link_profissional"] || "",
        link_premium: map["link_premium"] || "",
      });
      setWebhookSecret(map["webhook_secret"] || "");
    }
    setSettingsLoading(false);
  };

  const handleSaveWebhookSecret = async () => {
    setSavingWebhook(true);
    const { data } = await (supabase.from("payment_settings") as any)
      .update({ valor: webhookSecret, atualizado_em: new Date().toISOString() })
      .eq("chave", "webhook_secret")
      .select();
    if (!data || data.length === 0) {
      await (supabase.from("payment_settings") as any)
        .insert({ chave: "webhook_secret", valor: webhookSecret });
    }
    setSavingWebhook(false);
    setEditingWebhook(false);
    toast({ title: "Webhook secret actualizado!" });
  };

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL || ""}/functions/v1/payment-webhook`;

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    const updates = [
      { chave: "iban", valor: iban },
      { chave: "iban_banco", valor: ibanBanco },
      { chave: "iban_titular", valor: ibanTitular },
      { chave: "multicaixa_numero", valor: multicaixaNumero },
    ];
    for (const u of updates) {
      await (supabase.from("payment_settings") as any)
        .update({ valor: u.valor, atualizado_em: new Date().toISOString() })
        .eq("chave", u.chave);
    }
    setSavingSettings(false);
    setEditingSettings(false);
    toast({ title: "Dados de pagamento actualizados!" });
  };

  const handleSaveLinks = async () => {
    setSavingLinks(true);
    const linkKeys = ["link_basico", "link_intermedio", "link_profissional", "link_premium"];
    for (const key of linkKeys) {
      const { data } = await (supabase.from("payment_settings") as any)
        .update({ valor: paymentLinks[key] || "", atualizado_em: new Date().toISOString() })
        .eq("chave", key)
        .select();
      if (!data || data.length === 0) {
        await (supabase.from("payment_settings") as any)
          .insert({ chave: key, valor: paymentLinks[key] || "" });
      }
    }
    setSavingLinks(false);
    setEditingLinks(false);
    toast({ title: "Links de pagamento automático actualizados!" });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = payments.filter((p) => p.estado === "pendente").length;

  return (
    <div className="space-y-4">
      {/* Payment Settings Card */}
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Dados de Pagamento
          </CardTitle>
          {!editingSettings ? (
            <Button variant="outline" size="sm" onClick={() => setEditingSettings(true)} className="gap-1">
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditingSettings(false); fetchSettings(); }}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveSettings} disabled={savingSettings} className="gap-1">
                <Save className="h-3.5 w-3.5" />
                {savingSettings ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {settingsLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : editingSettings ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">IBAN</Label>
                <Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="AO06 ..." />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Banco</Label>
                <Input value={ibanBanco} onChange={(e) => setIbanBanco(e.target.value)} placeholder="Nome do Banco" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Titular</Label>
                <Input value={ibanTitular} onChange={(e) => setIbanTitular(e.target.value)} placeholder="Nome do titular" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1"><Smartphone className="h-3 w-3" /> Multicaixa Express</Label>
                <Input value={multicaixaNumero} onChange={(e) => setMulticaixaNumero(e.target.value)} placeholder="9..." />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">IBAN</p>
                <p className="text-sm font-medium truncate">{iban || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Banco</p>
                <p className="text-sm font-medium">{ibanBanco || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Titular</p>
                <p className="text-sm font-medium truncate">{ibanTitular || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Express</p>
                <p className="text-sm font-medium">{multicaixaNumero || "—"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Automatic Payment Links Card */}
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Links de Pagamento Automático
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider">{activeCheckouts} Activos</span>
            </div>
            {!editingLinks ? (
              <Button variant="outline" size="sm" onClick={() => setEditingLinks(true)} className="gap-1">
                <Pencil className="h-3.5 w-3.5" />
                Editar Links
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setEditingLinks(false); fetchSettings(); }}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleSaveLinks} disabled={savingLinks} className="gap-1">
                  <Save className="h-3.5 w-3.5" />
                  {savingLinks ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.keys(paymentLinks).map((key) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                  {key.replace("link_", "Plano ")}
                </Label>
                {editingLinks ? (
                  <Input 
                    value={paymentLinks[key]} 
                    onChange={(e) => setPaymentLinks({...paymentLinks, [key]: e.target.value})}
                    placeholder="https://pay.example.com/..."
                    className="h-8 text-xs"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted/30 rounded px-2 py-1.5 text-xs truncate font-mono">
                      {paymentLinks[key] || "Link não configurado"}
                    </div>
                    {paymentLinks[key] && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        navigator.clipboard.writeText(paymentLinks[key]);
                        toast({ title: "Link copiado!" });
                      }}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold flex items-center gap-2 uppercase tracking-wider">
                <Webhook className="h-3.5 w-3.5 text-primary" />
                Configuração do Webhook
              </h4>
              {!editingWebhook ? (
                <Button variant="ghost" size="sm" onClick={() => setEditingWebhook(true)} className="h-7 text-[10px]">
                  Editar Secret
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingWebhook(false)} className="h-7 text-[10px]">Cancelar</Button>
                  <Button size="sm" onClick={handleSaveWebhookSecret} disabled={savingWebhook} className="h-7 text-[10px]">Salvar</Button>
                </div>
              )}
            </div>
            
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground">URL do Webhook (Copie para o seu provedor de pagamentos)</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-primary/5 border border-primary/10 rounded px-3 py-2 text-xs font-mono break-all text-primary">
                    {webhookUrl}
                  </div>
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    toast({ title: "URL copiada!" });
                  }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Secret do Webhook (Para validação de assinatura)
                </Label>
                {editingWebhook ? (
                  <Input 
                    type="password"
                    value={webhookSecret} 
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder="whsec_..."
                    className="h-9 text-xs"
                  />
                ) : (
                  <div className="bg-muted/30 rounded px-3 py-2 text-xs font-mono">
                    {webhookSecret ? "••••••••••••••••" : "Não configurado"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments List Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Pedidos de Pagamento Manual
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2 animate-pulse">
                {pendingCount} Pendentes
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchPayments}>Actualizar Lista</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum pedido de pagamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{p.user_nome}</span>
                          <span className="text-[10px] text-muted-foreground">{p.user_email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                          {PLAN_LABELS[p.plano] || p.plano}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {p.valor.toLocaleString()} Kz
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.criado_em).toLocaleDateString("pt-AO")}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${ESTADO_COLORS[p.estado] || "bg-muted"} border-none text-[10px] uppercase font-bold`}>
                          {p.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {p.ficheiro_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => viewReceipt(p.ficheiro_url!)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {p.estado === "pendente" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => setConfirmDialog({ open: true, action: "aprovar", payment: p })}
                                disabled={processing === p.id}
                              >
                                {processing === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => setConfirmDialog({ open: true, action: "rejeitar", payment: p })}
                                disabled={processing === p.id}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Confirm Action Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(o) => !o && setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === "aprovar" ? "Aprovar Pagamento" : "Rejeitar Pagamento"}
            </DialogTitle>
            <DialogDescription>
              Tem a certeza que deseja {confirmDialog.action} o pagamento de{" "}
              <strong>{confirmDialog.payment?.valor.toLocaleString()} Kz</strong> de{" "}
              <strong>{confirmDialog.payment?.user_nome}</strong>?
              {confirmDialog.action === "aprovar" && (
                <p className="mt-2 text-emerald-600 font-medium">
                  Isto irá activar o plano {PLAN_LABELS[confirmDialog.payment?.plano || ""] || confirmDialog.payment?.plano} e notificar o utilizador.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
              Cancelar
            </Button>
            <Button
              variant={confirmDialog.action === "aprovar" ? "default" : "destructive"}
              onClick={() => handleAction(confirmDialog.action)}
              disabled={!!processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar {confirmDialog.action === "aprovar" ? "Aprovação" : "Rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Comprovativo de Pagamento</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/30 rounded-lg flex items-center justify-center p-4">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Comprovativo"
                className="max-w-full max-h-full object-contain shadow-lg"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="gap-2" asChild>
              <a href={previewUrl || "#"} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Ver em nova aba
              </a>
            </Button>
            <Button onClick={() => setPreviewOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPaymentsTab;
