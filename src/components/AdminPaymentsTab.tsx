import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { realtimeManager } from "@/integrations/supabase/realtime-manager";
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

const AdminPaymentsTab = () => {
  const [payments, setPayments] = useState<CheckoutSession[]>([]);
  const [activeCheckouts, setActiveCheckouts] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const mountedRef = useRef(true);

  const fetchPayments = useCallback(async () => {
    if (!mountedRef.current) return;
    const { data } = await supabase
      .from("checkout_sessions")
      .select("*")
      .order("criado_em", { ascending: false });
    if (mountedRef.current && data) setPayments(data);
  }, []);

  const fetchActiveCheckouts = useCallback(async () => {
    if (!mountedRef.current) return;
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count } = await (supabase.from("checkout_sessions") as any)
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .gte("criado_em", thirtyMinAgo);
    if (mountedRef.current) setActiveCheckouts(count || 0);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchPayments();
    fetchActiveCheckouts();

    const channelName = "checkout-sessions-admin";
    
    // Usar o realtimeManager para evitar duplicação
    realtimeManager.subscribe(
      channelName,
      { event: "*", schema: "public", table: "checkout_sessions" },
      () => {
        if (mountedRef.current) fetchActiveCheckouts();
      }
    );

    return () => {
      mountedRef.current = false;
    };
  }, [fetchPayments, fetchActiveCheckouts]);

  const approvePayment = async (paymentId: string, userId: string) => {
    try {
      await supabase.from("checkout_sessions").update({ status: "completed" }).eq("id", paymentId);
      await supabase.rpc("add_credits", { user_id: userId, amount: 100 });
      if (mountedRef.current) {
        toast.success("Pagamento aprovado");
        fetchPayments();
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao aprovar pagamento");
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
      <div className="bg-card rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="px-4 py-3 font-mono">{p.id.slice(0, 8)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    p.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3">{new Date(p.criado_em).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  {p.status === 'active' && (
                    <Button size="sm" onClick={() => approvePayment(p.id, p.user_id)}>Aprovar</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPaymentsTab;
