import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { realtimeManager } from "@/integrations/supabase/realtime-manager";

export interface UserPlan {
  id: string;
  user_id: string;
  plano: string;
  limite_trabalhos: number;
  limite_resumos: number;
  limite_questionarios: number;
  limite_planos_aula: number;
  limite_tfc: number;
  creditos_totais: number;
  creditos_usados: number;
  suporte_prioritario: boolean;
  periodo_inicio: string;
  criado_em?: string;
}

export const PLAN_CONFIGS = {
  gratuito: {
    nome: "Gratuito",
    preco: 0,
    label_preco: "Grátis",
    creditos_totais: 50,
    suporte_prioritario: false,
    limite_trabalhos: -1,
    limite_resumos: -1,
    limite_questionarios: -1,
    limite_planos_aula: -1,
    limite_tfc: -1,
  },
  basico: {
    nome: "Básico",
    preco: 546,
    label_preco: "546 Kz",
    creditos_totais: 120,
    suporte_prioritario: false,
    limite_trabalhos: -1,
    limite_resumos: -1,
    limite_questionarios: -1,
    limite_planos_aula: -1,
    limite_tfc: -1,
  },
  intermedio: {
    nome: "Intermédio",
    preco: 1250,
    label_preco: "1.250 Kz",
    creditos_totais: 300,
    suporte_prioritario: false,
    limite_trabalhos: -1,
    limite_resumos: -1,
    limite_questionarios: -1,
    limite_planos_aula: -1,
    limite_tfc: -1,
  },
  profissional: {
    nome: "Profissional",
    preco: 3850,
    label_preco: "3.850 Kz",
    creditos_totais: 500,
    suporte_prioritario: false,
    limite_trabalhos: -1,
    limite_resumos: -1,
    limite_questionarios: -1,
    limite_planos_aula: -1,
    limite_tfc: -1,
  },
  premium: {
    nome: "Premium",
    preco: 7500,
    label_preco: "7.500 Kz",
    creditos_totais: -1,
    suporte_prioritario: true,
    limite_trabalhos: -1,
    limite_resumos: -1,
    limite_questionarios: -1,
    limite_planos_aula: -1,
    limite_tfc: -1,
  },
} as const;

export type PlanKey = keyof typeof PLAN_CONFIGS;

export function useUserPlan() {
  const { user, isLoading: authLoading } = useAuth();
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlan = async () => {
    if (!user) { setLoading(false); return; }

    try {
      const { data, error } = await (supabase.from("user_plans") as any)
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code === "PGRST116") {
        setPlan(null);
      } else if (data) {
        setPlan(data);
      }
    } catch (err) {
      console.error("Erro ao buscar plano:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    fetchPlan();

    if (!user) return;

    const channelName = `user_plan_${user.id}`;
    
    // Usar o realtimeManager para evitar duplicação
    realtimeManager.subscribe(
      channelName,
      { event: "*", schema: "public", table: "user_plans", filter: `user_id=eq.${user.id}` },
      (payload) => {
        if (payload.new) setPlan(payload.new as UserPlan);
      }
    );

    // Refetch quando a aba volta ao foco
    const onFocus = () => fetchPlan();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      // Não removemos o canal imediatamente para permitir que outras instâncias do hook continuem ouvindo
      // O realtimeManager cuida da limpeza se necessário, ou podemos deixar o canal vivo
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [user?.id, authLoading]);

  return { plan, loading, refetch: fetchPlan };
}
