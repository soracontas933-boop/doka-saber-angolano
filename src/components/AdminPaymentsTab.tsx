import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CheckoutSession {
  id: string;
  user_id: string;
  status: string;
  criado_em: string;
  [key: string]: any;
}

interface PaymentSettings {
  [key: string]: any;
}

const AdminPaymentsTab = () => {
  const [payments, setPayments] = useState<CheckoutSession[]>([]);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [activeCheckouts, setActiveCheckouts] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);

  const fetchPayments = async () => {
    if (!mountedRef.current) return;

    const { data } = await supabase
      .from("checkout_sessions")
      .select("*")
      .order("criado_em", { ascending: false });

    if (mountedRef.current && data) {
      setPayments(data);
    }
  };

  const fetchSettings = async () => {
    if (!mountedRef.current) return;

    const { data } = await supabase
      .from("payment_settings")
      .select("*")
      .single();

    if (mountedRef.current && data) {
      setSettings(data);
    }
  };

  const fetchActiveCheckouts = async () => {
    if (!mountedRef.current) return;

    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count } = await (supabase.from("checkout_sessions") as any)
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .gte("criado_em", thirtyMinAgo);

    if (mountedRef.current) {
      setActiveCheckouts(count || 0);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchSettings();
    fetchActiveCheckouts();

    // Configurar inscrição realtime com proteção contra duplicação
    let isSubscribed = true;

    const setupChannel = async () => {
      // Aguardar um tick para evitar duplicação
      await new Promise(resolve => setTimeout(resolve, 0));
      
      if (!isSubscribed || !mountedRef.current) return;

      try {
        // Remover canal anterior se existir
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }

        channelRef.current = supabase
          .channel("checkout-sessions-admin")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "checkout_sessions" },
            () => {
              if (isSubscribed && mountedRef.current) {
                fetchActiveCheckouts();
              }
            }
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              console.log("Pagamentos realtime ativo");
            }
          });
      } catch (err) {
        console.error("Erro ao configurar canal de pagamentos:", err);
      }
    };

    setupChannel();

    return () => {
      isSubscribed = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  // Limpar mountedRef ao desmontar
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const viewReceipt = async (filePath: string) => {
    if (!mountedRef.current) return;

    const { data } = await supabase.storage
      .from("comprovativos")
      .createSignedUrl(filePath, 300);

    if (data?.signedUrl && mountedRef.current) {
      setPreviewUrl(data.signedUrl);
      setPreviewOpen(true);
    } else if (mountedRef.current) {
      toast({ title: "Erro ao carregar comprovativo", variant: "destructive" });
    }
  };

  const approvePayment = async (paymentId: string, userId: string) => {
    if (!mountedRef.current) return;

    try {
      await supabase.from("checkout_sessions").update({ status: "completed" }).eq("id", paymentId);
      await supabase.rpc("add_credits", { user_id: userId, amount: 100 });

      if (mountedRef.current) {
        toast({ title: "Pagamento aprovado" });
        fetchPayments();
      }
    } catch (err) {
      console.error("Erro ao aprovar pagamento:", err);
      if (mountedRef.current) {
        toast({ title: "Erro ao aprovar pagamento", variant: "destructive" });
      }
    }
  };

  const rejectPayment = async (paymentId: string) => {
    if (!mountedRef.current) return;

    try {
      await supabase.from("checkout_sessions").update({ status: "rejected" }).eq("id", paymentId);

      if (mountedRef.current) {
        toast({ title: "Pagamento rejeitado" });
        fetchPayments();
      }
    } catch (err) {
      console.error("Erro ao rejeitar pagamento:", err);
      if (mountedRef.current) {
        toast({ title: "Erro ao rejeitar pagamento", variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-lg border">
          <p className="text-sm text-muted-foreground">Pagamentos Ativos (30min)</p>
          <p className="text-2xl font-bold">{activeCheckouts}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left text-sm font-medium">ID</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Utilizador</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Data</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b hover:bg-secondary/50">
                  <td className="px-4 py-2 text-sm">{payment.id.slice(0, 8)}</td>
                  <td className="px-4 py-2 text-sm">{payment.user_id.slice(0, 8)}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      payment.status === "completed" ? "bg-green-100 text-green-800" :
                      payment.status === "active" ? "bg-blue-100 text-blue-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {new Date(payment.criado_em).toLocaleDateString("pt-PT")}
                  </td>
                  <td className="px-4 py-2 text-sm space-x-2">
                    {payment.status === "active" && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => approvePayment(payment.id, payment.user_id)}
                        >
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => rejectPayment(payment.id)}
                        >
                          Rejeitar
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comprovativo</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <iframe src={previewUrl} className="w-full h-96" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPaymentsTab;
