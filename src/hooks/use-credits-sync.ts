import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/use-user-plan";

/**
 * Hook para sincronizar créditos em tempo real via Supabase realtime.
 * Garante que todas as instâncias de useUserPlan() recebem atualizações
 * quando os créditos são consumidos ou quando o plano é atualizado.
 */
export function useCreditsSync() {
  const { user } = useAuth();
  const { refetch } = useUserPlan();

  useEffect(() => {
    if (!user) return;

    // 1. Escuta eventos de atualização de user_plans via realtime
    const subscription = supabase
      .channel(`user_plans:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_plans",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Créditos atualizados via realtime:", payload);
          // Refetch do plano para sincronizar todas as instâncias
          refetch();
          // Disparar evento global para componentes que escutam
          window.dispatchEvent(new CustomEvent("credits:updated", { detail: payload }));
        }
      )
      .subscribe();

    // 2. Escuta evento global de atualização de créditos disparado por logUsage()
    const handleCreditsUpdated = () => {
      console.log("Evento global de atualização de créditos recebido");
      refetch();
    };

    window.addEventListener("credits:updated", handleCreditsUpdated);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("credits:updated", handleCreditsUpdated);
    };
  }, [user, refetch]);
}
