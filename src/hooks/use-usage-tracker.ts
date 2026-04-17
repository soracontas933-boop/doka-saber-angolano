import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/use-user-plan";
import { CREDIT_COSTS, MODULE_LABELS, type ModuloType } from "@/lib/credit-costs";
import { toast } from "sonner";

export type { ModuloType };
export { CREDIT_COSTS, MODULE_LABELS };

export function useUsageTracker() {
  const { user } = useAuth();
  const { plan, refetch } = useUserPlan();

  const getRemaining = useCallback((): number => {
    if (!plan) return 0;
    if (plan.creditos_totais === -1) return Infinity as any;
    return Math.max(0, plan.creditos_totais - plan.creditos_usados);
  }, [plan]);

  const getAllUsageCounts = useCallback(async (): Promise<Record<string, number>> => {
    if (!user) return {};
    const { data } = await supabase
      .from("usage_logs")
      .select("modulo")
      .eq("user_id", user.id);
    if (!data) return {};
    const counts: Record<string, number> = {};
    for (const row of data) counts[row.modulo] = (counts[row.modulo] || 0) + 1;
    return counts;
  }, [user]);

  /**
   * Verifica se o utilizador tem créditos suficientes para a ação.
   * Retorna true se pode prosseguir; mostra toast e retorna false se não.
   */
  const checkLimit = useCallback(async (modulo: ModuloType): Promise<boolean> => {
    if (!plan) {
      toast.error("Plano não carregado. Tenta novamente.");
      return false;
    }
    const cost = CREDIT_COSTS[modulo] ?? 1;
    const remaining = getRemaining();
    if (remaining === Infinity as any) return true;

    if ((remaining as number) < cost) {
      toast.error(
        `Sem créditos suficientes! Esta ação custa ${cost} créditos e só tens ${remaining}. Faz upgrade ou compra extras.`,
        { duration: 6000 }
      );
      // Disparar evento global para abrir popup de "sem créditos"
      window.dispatchEvent(new CustomEvent("delle:no-credits", { detail: { needed: cost, available: remaining } }));
      return false;
    }
    return true;
  }, [plan, getRemaining]);

  /**
   * Regista o uso e desconta os créditos da BD via RPC consume_credits.
   */
  const logUsage = useCallback(async (modulo: ModuloType, servicoIa?: string, tokensUsados?: number) => {
    if (!user) return;
    const cost = CREDIT_COSTS[modulo] ?? 1;

    // Desconta créditos atomicamente
    const { data: ok } = await supabase.rpc("consume_credits" as any, {
      p_user_id: user.id,
      p_amount: cost,
    });

    if (ok === false) {
      toast.error("Não foi possível descontar créditos (saldo insuficiente).");
    }

    // Regista log
    await supabase.from("usage_logs").insert({
      user_id: user.id,
      modulo,
      servico_ia: servicoIa || null,
      tokens_usados: tokensUsados || 0,
    });

    refetch();
  }, [user, refetch]);

  return { checkLimit, logUsage, getAllUsageCounts, getRemaining };
}
