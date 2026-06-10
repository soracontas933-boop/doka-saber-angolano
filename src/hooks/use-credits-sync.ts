import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/use-user-plan";

/**
 * Hook para sincronizar créditos em tempo real via Supabase realtime.
 * Garante que todas as instâncias de useUserPlan() recebem atualizações
 * quando os créditos são consumidos ou quando o plano é atualizado.
 * 
 * Fluxo:
 * 1. Backend: consume_credits() atualiza user_plans
 * 2. Realtime: Supabase notifica alterações via postgres_changes
 * 3. Frontend: useCreditsSync() escuta e refaz fetch do plano
 * 4. UI: CreditsBar e outros componentes recebem dados atualizados
 */
export function useCreditsSync() {
  const { user } = useAuth();
  const { refetch } = useUserPlan();

  useEffect(() => {
    if (!user) return;

    console.log(`[CreditsSync] Inicializando para usuário: ${user.id}`);

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
          console.log("[CreditsSync] Créditos atualizados via realtime:", payload);
          // Refetch do plano para sincronizar todas as instâncias
          refetch();
          // Disparar evento global para componentes que escutam
          window.dispatchEvent(new CustomEvent("credits:updated", { detail: payload }));
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[CreditsSync] Realtime subscription ativa");
        } else if (status === "CLOSED") {
          console.warn("[CreditsSync] Realtime subscription fechada");
        }
      });

    // 2. Escuta evento global de atualização de créditos disparado por logUsage()
    const handleCreditsUpdated = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      console.log("[CreditsSync] Evento global de atualização de créditos recebido:", detail);
      // Refetch imediato para garantir sincronização
      refetch();
    };

    window.addEventListener("credits:updated", handleCreditsUpdated);

    return () => {
      console.log(`[CreditsSync] Limpando listeners para usuário: ${user.id}`);
      subscription.unsubscribe();
      window.removeEventListener("credits:updated", handleCreditsUpdated);
    };
  }, [user, refetch]);
}
