import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUserPlan, PLAN_CONFIGS, type PlanKey } from "@/hooks/use-user-plan";
import NotificationBell from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";

const MobileTopBar = () => {
  const { user } = useAuth();
  const { plan, loading } = useUserPlan();
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("nome")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setNome(data.nome);
      });
  }, [user]);

  const planKey = (plan?.plano || "gratuito") as PlanKey;
  const cfg = PLAN_CONFIGS[planKey] || PLAN_CONFIGS.gratuito;

  const totalCredits = plan?.creditos_totais === -1 ? Infinity : (plan?.creditos_totais || 0);
  const usedCredits = plan?.creditos_usados || 0;
  const remaining = totalCredits === Infinity ? "∞" : Math.max(0, (totalCredits as number) - usedCredits);

  const firstName = nome ? nome.split(" ")[0] : "Estudante";

  return (
    <div className="md:hidden sticky top-0 z-50 bg-[hsl(var(--delle-surface))]/95 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Credits left */}
        <div className="flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">
            {loading ? "…" : remaining}
          </span>
        </div>

        {/* Name centered */}
        <h1 className="text-base font-display font-bold text-foreground truncate max-w-[160px]">
          {firstName}
        </h1>

        {/* Notification */}
        <NotificationBell />
      </div>
    </div>
  );
};

export default MobileTopBar;
