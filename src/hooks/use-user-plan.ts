import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
    limite_trabalhos: 2,
    limite_resumos: 3,
    limite_questionarios: 3,
    limite_planos_aula: 0,
    limite_tfc: 0,
    creditos_totais: 0,
    suporte_prioritario: false,
  },
  basico: {
    nome: "Básico",
    preco: 546,
    label_preco: "546 Kz",
    limite_trabalhos: 3,
    limite_resumos: 4,
    limite_questionarios: -1,
    limite_planos_aula: 0,
    limite_tfc: 0,
    creditos_totais: 0,
    suporte_prioritario: false,
  },
  intermedio: {
    nome: "Intermédio",
    preco: 1250,
    label_preco: "1.250 Kz",
    limite_trabalhos: 5,
    limite_resumos: 7,
    limite_questionarios: 7,
    limite_planos_aula: 5,
    limite_tfc: 2,
    creditos_totais: 300,
    suporte_prioritario: false,
  },
  profissional: {
    nome: "Profissional",
    preco: 3850,
    label_preco: "3.850 Kz",
    limite_trabalhos: 10,
    limite_resumos: 16,
    limite_questionarios: 16,
    limite_planos_aula: 10,
    limite_tfc: 8,
    creditos_totais: 500,
    suporte_prioritario: false,
  },
  premium: {
    nome: "Premium",
    preco: 7500,
    label_preco: "7.500 Kz",
    limite_trabalhos: -1,
    limite_resumos: -1,
    limite_questionarios: -1,
    limite_planos_aula: -1,
    limite_tfc: -1,
    creditos_totais: -1,
    suporte_prioritario: true,
  },
} as const;

export type PlanKey = keyof typeof PLAN_CONFIGS;

export function useUserPlan() {
  const { user, isLoading: authLoading } = useAuth();
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlan = async () => {
    if (!user) { setLoading(false); return; }

    const { data, error } = await (supabase.from("user_plans") as any)
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code === "PGRST116") {
      console.warn("Plano não encontrado para o utilizador. Aguarde ou contacte o suporte.");
      setPlan(null);
    } else if (data) {
      setPlan(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    fetchPlan();
  }, [user, authLoading]);

  return { plan, loading, refetch: fetchPlan };
}
