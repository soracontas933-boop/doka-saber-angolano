import { useEffect, useState } from "react";
import { Crown, FileText, BookOpen, HelpCircle, ClipboardList, GraduationCap, Zap, Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserPlan, PLAN_CONFIGS, type PlanKey } from "@/hooks/use-user-plan";
import { useUsageTracker } from "@/hooks/use-usage-tracker";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import NotificationBell from "@/components/NotificationBell";
import { useTheme } from "@/hooks/use-theme";

interface UsageItemProps {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number;
}

const UsageItem = ({ icon, label, used, limit }: UsageItemProps) => {
  if (limit === 0) return null;

  const isUnlimited = limit === -1;
  const remaining = isUnlimited ? Infinity : Math.max(0, limit - used);
  const isLow = !isUnlimited && remaining <= 1;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-default">
          <span className={isLow ? "text-destructive" : "text-muted-foreground"}>{icon}</span>
          <span className={`text-xs font-semibold ${isLow ? "text-destructive" : "text-foreground"}`}>
            {isUnlimited ? "∞" : `${used}/${limit}`}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">
          {isUnlimited ? "Uso ilimitado" : `${remaining} restante${remaining !== 1 ? "s" : ""}`}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};

const CreditsBar = () => {
  const { plan, loading } = useUserPlan();
  const { getAllUsageCounts } = useUsageTracker();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!loading && plan) {
      getAllUsageCounts().then(setUsageCounts);
    }
  }, [loading, plan, getAllUsageCounts]);

  if (loading || !plan) return null;

  const planKey = (plan.plano || "gratuito") as PlanKey;
  const cfg = PLAN_CONFIGS[planKey] || PLAN_CONFIGS.gratuito;

  const totalCredits = plan.creditos_totais === -1 ? Infinity : plan.creditos_totais;
  const usedCredits = plan.creditos_usados;
  const remainingCredits = totalCredits === Infinity ? "∞" : Math.max(0, totalCredits - usedCredits);
  const creditPercentage = totalCredits === Infinity || totalCredits === 0 ? 0 : (usedCredits / (totalCredits as number)) * 100;

  return (
    <div className="sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur-md">
      <div className="flex items-center justify-between px-3 md:px-6 py-1.5 max-w-screen-2xl mx-auto gap-2 bg-destructive-foreground">
        {/* Plano */}
        <button
          onClick={() => navigate("/planos")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
        >
          <Crown className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold text-primary">{cfg.nome}</span>
        </button>

        {/* Contadores de uso */}
        <div className="flex items-center gap-1 md:gap-2 overflow-x-auto scrollbar-none">
          <UsageItem
            icon={<FileText className="h-3.5 w-3.5" />}
            label="Trabalhos Escolares"
            used={(usageCounts["trabalho"] || 0) + (usageCounts["correcao"] || 0)}
            limit={cfg.limite_trabalhos}
          />
          <UsageItem
            icon={<BookOpen className="h-3.5 w-3.5" />}
            label="Resumos"
            used={usageCounts["resumo"] || 0}
            limit={cfg.limite_resumos}
          />
          <UsageItem
            icon={<HelpCircle className="h-3.5 w-3.5" />}
            label="Questionários"
            used={usageCounts["questionario"] || 0}
            limit={cfg.limite_questionarios}
          />
          <UsageItem
            icon={<ClipboardList className="h-3.5 w-3.5" />}
            label="Planos de Aula"
            used={usageCounts["plano_aula"] || 0}
            limit={cfg.limite_planos_aula}
          />
          <UsageItem
            icon={<GraduationCap className="h-3.5 w-3.5" />}
            label="TFC/Monografias"
            used={usageCounts["tfc"] || 0}
            limit={cfg.limite_tfc}
          />
        </div>

        {/* Créditos totais */}
        {(totalCredits !== Infinity && totalCredits > 0) || totalCredits === Infinity ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <Zap className="h-3.5 w-3.5 text-primary" />
            {totalCredits !== Infinity && totalCredits > 0 && (
              <div className="hidden sm:block w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(creditPercentage, 100)}%` }}
                />
              </div>
            )}
            <span className="text-xs font-semibold text-foreground">
              {typeof remainingCredits === "number" ? `${remainingCredits}` : "∞"}
            </span>
          </div>
        ) : null}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notification Bell */}
        <NotificationBell />
      </div>
    </div>
  );
};

export default CreditsBar;
