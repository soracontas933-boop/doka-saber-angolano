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
import { CheckCircle, XCircle, Eye, Loader2, Download, ExternalLink, Save, Building2, Smartphone, Pencil, Link2, Webhook, Copy, Shield } from "lucide-react";

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

  const fetchPayments = useCallback(async () => {
    setLoading(true);

    // Fetch payments
    const { data: paymentsData } = await (supabase.from("payment_requests") as any)
      .select("*")
      .order("criado_em", { ascending: false });

    if (!paymentsData) {
      setLoading(false);
      return;
    }

    // Fetch user names from profiles
    const userIds = [...new Set(paymentsData.map((p: any) => p.user_id))];
    const { data: profiles } = await (supabase.from("profiles") as any)
      .select("id, nome")
      .in("id", userIds);

    // Fetch emails via edge function
    let emailMap: Record<string, string> = {};
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const res = await supabase.functions.invoke("admin-users", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.data?.emailMap) emailMap = res.data.emailMap;
      }
    } catch {}

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.nome]));

    const enriched: PaymentRequest[] = paymentsData.map((p: any) => ({
      ...p,
      user_nome: profileMap.get(p.user_id) || "Sem nome",
      user_email: emailMap[p.user_id] || p.email_confirmacao,
    }));

    setPayments(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPayments();
    fetchSettings();
  }, [fetchPayments]);

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
        // 1. Update payment status
        await (supabase.from("payment_requests") as any)
          .update({
            estado: "aprovado",
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", payment.id);

        // 2. Update user plan with new limits
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
              periodo_inicio: new Date().toISOString(), // Reset billing period
            })
            .eq("user_id", payment.user_id);
        }

        // 3. Send notification to user
        await (supabase.from("notifications") as any).insert({
          user_id: payment.user_id,
          titulo: "Plano Activado! 🎉",
          mensagem: `O seu plano ${PLAN_LABELS[planKey] || planKey} foi activado com sucesso. Os seus créditos e limites foram actualizados. Aproveite!`,
          tipo: "sucesso",
        });

        toast({ title: "Pagamento aprovado e plano actualizado!" });
      } else {
        // Reject
        await (supabase.from("payment_requests") as any)
          .update({
            estado: "rejeitado",
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", payment.id);

        // Notify user
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
    }
    setSettingsLoading(false);
  };

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
      // Try update first, if no row exists, insert
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
                <Input value={multicaixaNumero} onChange={(e) => setMulticaixaNumero(e.target.value)} placeholder="923 ..." />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">IBAN - {ibanBanco}</p>
                <p className="font-mono font-medium text-foreground">{iban}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Titular: {ibanTitular}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1"><Smartphone className="h-3 w-3" /> Multicaixa Express</p>
                <p className="font-mono font-medium text-foreground">{multicaixaNumero}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Links Card (Automatic Payments) */}
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            Links de Pagamento Automático
          </CardTitle>
          {!editingLinks ? (
            <Button variant="outline" size="sm" onClick={() => setEditingLinks(true)} className="gap-1">
              <Pencil className="h-3.5 w-3.5" />
              Editar
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
        </CardHeader>
        <CardContent>
          {settingsLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : editingLinks ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(["basico", "intermedio", "profissional", "premium"] as const).map((plan) => (
                <div key={plan} className="space-y-2">
                  <Label className="text-xs">{PLAN_LABELS[plan]}</Label>
                  <Input
                    value={paymentLinks[`link_${plan}`] || ""}
                    onChange={(e) => setPaymentLinks(prev => ({ ...prev, [`link_${plan}`]: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {(["basico", "intermedio", "profissional", "premium"] as const).map((plan) => (
                <div key={plan}>
                  <p className="text-xs text-muted-foreground mb-0.5">{PLAN_LABELS[plan]}</p>
                  {paymentLinks[`link_${plan}`] ? (
                    <a href={paymentLinks[`link_${plan}`]} target="_blank" rel="noopener noreferrer" className="text-primary text-xs font-medium truncate block hover:underline">
                      {paymentLinks[`link_${plan}`]}
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 italic">Não configurado</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


      <div className="grid grid-cols-3 gap-4">
        <Card className="border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Aprovados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">
              {payments.filter((p) => p.estado === "aprovado").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Rejeitados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">
              {payments.filter((p) => p.estado === "rejeitado").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum pedido de pagamento.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{p.user_nome}</p>
                          <p className="text-xs text-muted-foreground">{p.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{PLAN_LABELS[p.plano] || p.plano}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{p.valor} Kz</TableCell>
                      <TableCell>
                        <Badge className={ESTADO_COLORS[p.estado] || ""} variant="secondary">
                          {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.criado_em).toLocaleDateString("pt-AO", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {p.ficheiro_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => viewReceipt(p.ficheiro_url!)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {p.estado === "pendente" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700"
                                onClick={() =>
                                  setConfirmDialog({ open: true, action: "aprovar", payment: p })
                                }
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() =>
                                  setConfirmDialog({ open: true, action: "rejeitar", payment: p })
                                }
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

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(o) => setConfirmDialog((prev) => ({ ...prev, open: o }))}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.action === "aprovar"
                ? "Aprovar Pagamento?"
                : "Rejeitar Pagamento?"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action === "aprovar"
                ? `O plano ${PLAN_LABELS[confirmDialog.payment?.plano || ""] || ""} será activado e o utilizador será notificado.`
                : "O utilizador será notificado que o pagamento não foi aprovado."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ open: false, action: "aprovar", payment: null })}
            >
              Cancelar
            </Button>
            <Button
              variant={confirmDialog.action === "aprovar" ? "default" : "destructive"}
              onClick={() => handleAction(confirmDialog.action)}
              disabled={!!processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              {confirmDialog.action === "aprovar" ? "Aprovar" : "Rejeitar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Comprovativo</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="space-y-3">
              {previewUrl.match(/\.(jpg|jpeg|png)/) ? (
                <img src={previewUrl} alt="Comprovativo" className="w-full rounded-lg" />
              ) : (
                <div className="flex flex-col items-center gap-3 py-6">
                  <p className="text-sm text-muted-foreground">
                    Ficheiro não pode ser pré-visualizado aqui.
                  </p>
                  <Button asChild variant="outline">
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir ficheiro
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPaymentsTab;
