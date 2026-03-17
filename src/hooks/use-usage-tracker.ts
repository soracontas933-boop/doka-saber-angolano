import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserPlan, PLAN_CONFIGS, type PlanKey } from "@/hooks/use-user-plan";
import { toast } from "sonner";

export type ModuloType = "trabalho" | "resumo" | "questionario" | "plano_aula" | "tfc" | "correcao";

const MODULE_LIMIT_MAP: Record<ModuloType, keyof typeof PLAN_CONFIGS.gratuito> = {
  trabalho: "limite_trabalhos",
  resumo: "limite_resumos",
  questionario: "limite_questionarios",
  plano_aula: "limite_planos_aula",
  tfc: "limite_tfc",
  correcao: "limite_trabalhos", // correcao shares trabalho limits
};

export function useUsageTracker() {
  const { plan, refetch } = useUserPlan();

  const getUsageCount = useCallback(async (modulo: ModuloType): Promise<number> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return 0;
    const user = session.user;

    const { count, error } = await supabase
      .from("usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("modulo", modulo);

    if (error) {
      console.error("Error counting usage:", error);
      return 0;
    }
    return count || 0;
  }, []);

  const getAllUsageCounts = useCallback(async (): Promise<Record<string, number>> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase
      .from("usage_logs")
      .select("modulo")
      .eq("user_id", user.id);

    if (error || !data) return {};

    const counts: Record<string, number> = {};
    for (const row of data) {
      counts[row.modulo] = (counts[row.modulo] || 0) + 1;
    }
    return counts;
  }, []);

  const checkLimit = useCallback(async (modulo: ModuloType): Promise<boolean> => {
    if (!plan) return false;

    const planKey = (plan.plano || "gratuito") as PlanKey;
    const cfg = PLAN_CONFIGS[planKey] || PLAN_CONFIGS.gratuito;
    const limitKey = MODULE_LIMIT_MAP[modulo];
    const limit = cfg[limitKey] as number;

    // -1 = unlimited
    if (limit === -1) return true;
    // 0 = not available
    if (limit === 0) {
      toast.error(`O módulo não está disponível no plano ${cfg.nome}. Faça upgrade!`);
      return false;
    }

    const used = await getUsageCount(modulo);
    if (used >= limit) {
      toast.error(`Limite atingido! Já usou ${used}/${limit} no plano ${cfg.nome}. Faça upgrade para continuar.`);
      return false;
    }

    return true;
  }, [plan, getUsageCount]);

  const logUsage = useCallback(async (modulo: ModuloType, servicoIa?: string, tokensUsados?: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("usage_logs")
      .insert({
        user_id: user.id,
        modulo,
        servico_ia: servicoIa || null,
        tokens_usados: tokensUsados || 0,
      });

    if (error) {
      console.error("Error logging usage:", error);
    }

    // Update creditos_usados via secure RPC function
    await supabase.rpc("increment_creditos_usados", { p_user_id: user.id });

    // Refresh plan data
    refetch();
  }, [plan, refetch]);

  return { checkLimit, logUsage, getUsageCount, getAllUsageCounts };
}
