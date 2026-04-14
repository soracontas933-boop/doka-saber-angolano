import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan, PLAN_CONFIGS, type PlanKey } from "@/hooks/use-user-plan";
import { toast } from "sonner";

export type ModuloType = "trabalho" | "resumo" | "questionario" | "plano_aula" | "tfc" | "correcao" | "apresentacao";

const MODULE_LIMIT_MAP: Record<ModuloType, keyof typeof PLAN_CONFIGS.gratuito> = {
  trabalho: "limite_trabalhos",
  resumo: "limite_resumos",
  questionario: "limite_questionarios",
  plano_aula: "limite_planos_aula",
  tfc: "limite_tfc",
  correcao: "limite_trabalhos",
  apresentacao: "limite_trabalhos",
};

export function useUsageTracker() {
  const { user } = useAuth();
  const { plan, refetch } = useUserPlan();

  const getPeriodoInicio = useCallback((): string | null => {
    if (!plan) return null;
    return (plan as any).periodo_inicio || plan.criado_em || null;
  }, [plan]);

  const getUsageCount = useCallback(async (modulo: ModuloType): Promise<number> => {
    if (!user) return 0;

    const periodoInicio = getPeriodoInicio();

    let query = supabase
      .from("usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("modulo", modulo);

    if (periodoInicio) {
      query = query.gte("criado_em", periodoInicio);
    }

    const { count, error } = await query;
    if (error) {
      console.error("Error counting usage:", error);
      return 0;
    }
    return count || 0;
  }, [user, getPeriodoInicio]);

  const getAllUsageCounts = useCallback(async (): Promise<Record<string, number>> => {
    if (!user) return {};

    const periodoInicio = getPeriodoInicio();

    let query = supabase
      .from("usage_logs")
      .select("modulo")
      .eq("user_id", user.id);

    if (periodoInicio) {
      query = query.gte("criado_em", periodoInicio);
    }

    const { data, error } = await query;
    if (error || !data) return {};

    const counts: Record<string, number> = {};
    for (const row of data) {
      counts[row.modulo] = (counts[row.modulo] || 0) + 1;
    }
    return counts;
  }, [user, getPeriodoInicio]);

  const checkLimit = useCallback(async (modulo: ModuloType): Promise<boolean> => {
    if (!plan) return false;

    const planKey = (plan.plano || "gratuito") as PlanKey;
    const cfg = PLAN_CONFIGS[planKey] || PLAN_CONFIGS.gratuito;
    const limitKey = MODULE_LIMIT_MAP[modulo];
    const limit = cfg[limitKey] as number;

    if (limit === -1) return true;
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

    await supabase.rpc("increment_creditos_usados", { p_user_id: user.id });
    refetch();
  }, [user, refetch]);

  return { checkLimit, logUsage, getUsageCount, getAllUsageCounts };
}
