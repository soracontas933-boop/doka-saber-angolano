import { useEffect, useState } from "react";
import { Crown, FileText, BookOpen, HelpCircle, ClipboardList, GraduationCap, Zap, Sun, Moon, Headphones, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserPlan, PLAN_CONFIGS, type PlanKey } from "@/hooks/use-user-plan";
import { useUsageTracker } from "@/hooks/use-usage-tracker";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import NotificationBell from "@/components/NotificationBell";
import ScannerButton from "@/components/ScannerButton";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [initials, setInitials] = useState("U");

  useEffect(() => {
    if (!loading && plan) {
      getAllUsageCounts().then(setUsageCounts);
    }
  }, [loading, plan, getAllUsageCounts]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("nome").eq("id", user.id).single().then(({ data }) => {
      if (data?.nome) {
        setInitials(data.nome.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase());
      }
    });
  }, [user]);

  if (loading || !plan) return null;

  const planKey = (plan.plano || "gratuito") as PlanKey;
  const cfg = PLAN_CONFIGS[planKey] || PLAN_CONFIGS.gratuito;

  const totalCredits = plan.creditos_totais === -1 ? Infinity : plan.creditos_totais;
  const usedCredits = plan.creditos_usados;
  const remainingCredits = totalCredits === Infinity ? "∞" : Math.max(0, totalCredits - usedCredits);
  const creditPercentage = totalCredits === Infinity || totalCredits === 0 ? 0 : usedCredits / (totalCredits as number) * 100;

  return (
    <>
      {/* ===== MOBILE TOP BAR ===== */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-2.5 shadow-xl">
          {/* Left: Profile avatar */}
          <button
            onClick={() => navigate("/configuracoes")}
            className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold shrink-0 text-primary"
          >
            {initials}
          </button>

          {/* Center: Credits */}
          <div className="flex items-center gap-1.5">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">
              {typeof remainingCredits === "number" ? remainingCredits : "∞"}
            </span>
            <span className="text-[10px] text-muted-foreground">créditos</span>
          </div>

          {/* Right: Scanner + Support + Notifications */}
          <div className="flex items-center gap-0.5">
            <ScannerButton />
            <button
              onClick={() => navigate("/suporte")}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <Headphones className="lucide lucide-headphones h-4.5 w-4.5 text-secondary-foreground" />
            </button>
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* ===== DESKTOP TOP BAR ===== */}
      <div className="hidden md:block sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-3 md:px-6 py-1.5 max-w-screen-2xl mx-auto gap-2">
          <button
            onClick={() => navigate("/planos")}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
          >
            <Crown className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">{cfg.nome}</span>
          </button>

          <div className="flex items-center gap-1 md:gap-2 overflow-x-auto scrollbar-none">
            <UsageItem icon={<FileText className="h-3.5 w-3.5" />} label="Trabalhos Escolares" used={(usageCounts["trabalho"] || 0) + (usageCounts["correcao"] || 0)} limit={cfg.limite_trabalhos} />
            <UsageItem icon={<BookOpen className="h-3.5 w-3.5" />} label="Resumos" used={usageCounts["resumo"] || 0} limit={cfg.limite_resumos} />
            <UsageItem icon={<HelpCircle className="h-3.5 w-3.5" />} label="Questionários" used={usageCounts["questionario"] || 0} limit={cfg.limite_questionarios} />
            <UsageItem icon={<ClipboardList className="h-3.5 w-3.5" />} label="Planos de Aula" used={usageCounts["plano_aula"] || 0} limit={cfg.limite_planos_aula} />
            <UsageItem icon={<GraduationCap className="h-3.5 w-3.5" />} label="TFC/Monografias" used={usageCounts["tfc"] || 0} limit={cfg.limite_tfc} />
          </div>

          {totalCredits !== Infinity && totalCredits > 0 || totalCredits === Infinity ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <Zap className="h-3.5 w-3.5 text-primary" />
              {totalCredits !== Infinity && totalCredits > 0 && (
                <div className="hidden sm:block w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min(creditPercentage, 100)}%` }} />
                </div>
              )}
              <span className="text-xs font-semibold text-foreground">
                {typeof remainingCredits === "number" ? `${remainingCredits}` : "∞"}
              </span>
            </div>
          ) : null}

          <button onClick={toggleTheme} className="p-1.5 rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground" title={theme === "dark" ? "Modo claro" : "Modo escuro"}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <NotificationBell />
        </div>
      </div>
    </>
  );
};

export default CreditsBar;
