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
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 cursor-default ${
          isLow 
            ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30" 
            : "bg-secondary/50 hover:bg-secondary border border-border/40 hover:border-border/60"
        }`}>
          <span className={`transition-colors ${isLow ? "text-red-600 dark:text-red-400" : "text-primary"}`}>
            {icon}
          </span>
          <span className={`text-xs font-medium transition-colors ${isLow ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
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
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Profile avatar */}
          <button
            onClick={() => navigate("/configuracoes")}
            className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all duration-200 active:scale-95"
          >
            {initials}
          </button>

          {/* Center: Credits */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/40">
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {typeof remainingCredits === "number" ? remainingCredits : "∞"}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">créditos</span>
          </div>

          {/* Right: Scanner + Support + Notifications */}
          <div className="flex items-center gap-1">
            <ScannerButton />
            <button
              onClick={() => navigate("/suporte")}
              className="p-2 rounded-lg transition-all duration-200 hover:bg-secondary text-muted-foreground hover:text-foreground active:scale-90"
            >
              <Headphones className="h-4.5 w-4.5" />
            </button>
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* ===== DESKTOP TOP BAR ===== */}
      <div className="hidden md:block sticky top-0 z-40 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 md:px-6 py-2.5 max-w-screen-2xl mx-auto gap-3">
          <button
            onClick={() => navigate("/planos")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15 border border-primary/20 transition-all duration-200 shrink-0 active:scale-95"
          >
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary">{cfg.nome}</span>
          </button>

          <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto scrollbar-none">
            <UsageItem icon={<FileText className="h-3.5 w-3.5" />} label="Trabalhos Escolares" used={(usageCounts["trabalho"] || 0) + (usageCounts["correcao"] || 0)} limit={cfg.limite_trabalhos} />
            <UsageItem icon={<BookOpen className="h-3.5 w-3.5" />} label="Resumos" used={usageCounts["resumo"] || 0} limit={cfg.limite_resumos} />
            <UsageItem icon={<HelpCircle className="h-3.5 w-3.5" />} label="Questionários" used={usageCounts["questionario"] || 0} limit={cfg.limite_questionarios} />
            <UsageItem icon={<ClipboardList className="h-3.5 w-3.5" />} label="Planos de Aula" used={usageCounts["plano_aula"] || 0} limit={cfg.limite_planos_aula} />
            <UsageItem icon={<GraduationCap className="h-3.5 w-3.5" />} label="TFC/Monografias" used={usageCounts["tfc"] || 0} limit={cfg.limite_tfc} />
          </div>

          {totalCredits !== Infinity && totalCredits > 0 || totalCredits === Infinity ? (
            <div className="flex items-center gap-2 shrink-0">
              <Zap className="h-4 w-4 text-primary" />
              {totalCredits !== Infinity && totalCredits > 0 && (
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-20 h-2 rounded-full bg-secondary/50 border border-border/40 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-500" style={{ width: `${Math.min(creditPercentage, 100)}%` }} />
                  </div>
                </div>
              )}
              <span className="text-xs font-semibold text-foreground min-w-fit">
                {typeof remainingCredits === "number" ? `${remainingCredits}` : "∞"}
              </span>
            </div>
          ) : null}

          <div className="flex items-center gap-1">
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-lg hover:bg-secondary transition-all duration-200 text-muted-foreground hover:text-foreground active:scale-90" 
              title={theme === "dark" ? "Modo claro" : "Modo escuro"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <NotificationBell />
          </div>
        </div>
      </div>
    </>
  );
};

export default CreditsBar;
