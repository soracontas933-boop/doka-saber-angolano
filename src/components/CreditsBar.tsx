import { Zap, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserPlan, PLAN_CONFIGS, type PlanKey } from "@/hooks/use-user-plan";

const CreditsBar = () => {
  const { plan, loading } = useUserPlan();
  const navigate = useNavigate();

  if (loading || !plan) return null;

  const planKey = (plan.plano || "gratuito") as PlanKey;
  const cfg = PLAN_CONFIGS[planKey] || PLAN_CONFIGS.gratuito;

  const totalCredits = plan.creditos_totais === -1 ? Infinity : plan.creditos_totais;
  const usedCredits = plan.creditos_usados;
  const remaining = totalCredits === Infinity ? "∞" : Math.max(0, totalCredits - usedCredits);
  const percentage = totalCredits === Infinity || totalCredits === 0 ? 0 : (usedCredits / totalCredits) * 100;

  return (
    <div className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 md:px-6 py-2 max-w-screen-2xl mx-auto">
        <button
          onClick={() => navigate("/planos")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Crown className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Plano <span className="text-primary">{cfg.nome}</span>
          </span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            {totalCredits !== Infinity && totalCredits > 0 && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>
            )}
            <span className="text-xs text-muted-foreground font-medium">
              {typeof remaining === "number" ? (
                <>
                  <span className={remaining <= 3 ? "text-destructive font-bold" : "text-foreground font-semibold"}>
                    {remaining}
                  </span>
                  /{totalCredits} créditos
                </>
              ) : (
                <span className="text-foreground font-semibold">Ilimitado</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditsBar;
