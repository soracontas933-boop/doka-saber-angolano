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
      console.warn(`[UsageTracker] Créditos insuficientes para ${modulo}: precisa ${cost}, tem ${remaining}`);
      toast.error(
        `Sem créditos suficientes! Esta ação custa ${cost} créditos e só tens ${remaining}. Faz upgrade ou compra extras.`,
        { duration: 6000 }
      );
      // Disparar evento global para abrir popup de "sem créditos"
      window.dispatchEvent(new CustomEvent("delle:no-credits", { detail: { needed: cost, available: remaining } }));
      return false;
    }
    
    console.log(`[UsageTracker] Saldo suficiente para ${modulo}: precisa ${cost}, tem ${remaining}`);
    return true;
  }, [plan, getRemaining]);

  /**
   * Regista o uso e desconta os créditos da BD via RPC consume_credits.
   * Retorna true se a dedução foi bem-sucedida.
   * Dispara evento global para sincronizar créditos em tempo real.
   * 
   * IMPORTANTE: Esta função SEMPRE desconta os créditos, independentemente do resultado.
   * O fluxo esperado é:
   * 1. Chamar checkLimit() ANTES de gerar o conteúdo
   * 2. Gerar o conteúdo
   * 3. Chamar logUsage() APÓS a geração bem-sucedida
   * 4. Se logUsage() falhar, mostrar erro e NÃO salvar o resultado
   */
  const logUsage = useCallback(async (modulo: ModuloType, servicoIa?: string, tokensUsados?: number): Promise<boolean> => {
    if (!user) {
      console.error("[UsageTracker] Utilizador não autenticado");
      return false;
    }
    
    const cost = CREDIT_COSTS[modulo] ?? 1;
    console.log(`[UsageTracker] Iniciando dedução para ${modulo}: ${cost} créditos`);

    // Desconta créditos atomicamente via RPC
    const { data: ok, error: rpcError } = await supabase.rpc("consume_credits" as any, {
      p_user_id: user.id,
      p_amount: cost,
    });

    if (rpcError || ok === false) {
      console.error(`[UsageTracker] Erro ao descontar créditos: ${rpcError?.message || "Saldo insuficiente"}`);
      toast.error("Saldo insuficiente ou erro ao descontar créditos.");
      // Disparar evento para abrir popup de upgrade se for saldo insuficiente
      if (ok === false) {
        console.warn(`[UsageTracker] Saldo insuficiente para ${modulo}`);
        window.dispatchEvent(new CustomEvent("delle:no-credits", { 
          detail: { needed: cost, available: getRemaining() } 
        }));
      }
      return false;
    }

    console.log(`[UsageTracker] Créditos debitados com sucesso: ${cost} para ${modulo}`);

    // Regista log apenas se a dedução funcionou
    const { error: logError } = await supabase.from("usage_logs").insert({
      user_id: user.id,
      modulo,
      servico_ia: servicoIa || null,
      tokens_usados: tokensUsados || 0,
    });

    if (logError) {
      console.error("[UsageTracker] Erro ao registar log de uso:", logError);
    }

    // Refetch do plano para obter os valores mais recentes
    console.log("[UsageTracker] Refazendo fetch do plano...");
    await refetch();
    
    // Disparar evento global para sincronizar créditos em tempo real em todas as instâncias
    console.log("[UsageTracker] Disparando evento global de atualização de créditos");
    window.dispatchEvent(new CustomEvent("credits:updated", { detail: { modulo, cost } }));
    
    return true;
  }, [user, refetch, getRemaining]);

  return { checkLimit, logUsage, getAllUsageCounts, getRemaining };
}
