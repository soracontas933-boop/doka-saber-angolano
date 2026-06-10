import { useEffect, useState } from "react";
import { Crown, Zap, Sun, Moon, Headphones, Plus, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserPlan, PLAN_CONFIGS, type PlanKey } from "@/hooks/use-user-plan";
import { useCreditsSync } from "@/hooks/use-credits-sync";
import NotificationBell from "@/components/NotificationBell";
import ScannerButton from "@/components/ScannerButton";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CreditsBar = () => {
  const { plan, loading } = useUserPlan();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [initials, setInitials] = useState("U");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [warned, setWarned] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Sincronizar créditos em tempo real
  useCreditsSync();

  // Hide mobile top bar on scroll down, show on scroll up
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const scrollEl = document.querySelector("main") as HTMLElement | null;
    const target: HTMLElement | Window = scrollEl ?? window;

    const getY = () =>
      scrollEl ? scrollEl.scrollTop : window.scrollY;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = getY();
        const delta = y - lastY;
        if (y < 10) {
          setHidden(false);
        } else if (delta > 6) {
          setHidden(true);
        } else if (delta < -6) {
          setHidden(false);
        }
        lastY = y;
        ticking = false;
      });
    };

    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = () => {
      supabase.from("profiles").select("nome, avatar_url").eq("id", user.id).single().then(({ data }) => {
        if (data?.nome) {
          setInitials(data.nome.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase());
        }
        setAvatarUrl((data as any)?.avatar_url ?? null);
      });
    };
    load();
    const onUpdate = () => load();
    window.addEventListener("profile:updated", onUpdate);
    return () => window.removeEventListener("profile:updated", onUpdate);
  }, [user]);

  const totalCredits = plan?.creditos_totais === -1 ? Infinity : (plan?.creditos_totais ?? 0);
  const usedCredits = plan?.creditos_usados ?? 0;
  const remaining = totalCredits === Infinity ? Infinity : Math.max(0, (totalCredits as number) - usedCredits);
  const percentageUsed = totalCredits === Infinity || totalCredits === 0 ? 0 : (usedCredits / (totalCredits as number)) * 100;
  const percentageRemaining = 100 - percentageUsed;
  const isLow = totalCredits !== Infinity && percentageRemaining <= 20 && percentageRemaining > 0;
  const isEmpty = totalCredits !== Infinity && remaining === 0;

  // Aviso quando ≤20%
  useEffect(() => {
    if (isLow && !warned) {
      toast.warning(`Atenção: só te restam ${remaining} créditos. Considera fazer upgrade.`, {
        duration: 5000,
        action: { label: "Comprar", onClick: () => navigate("/creditos") },
      });
      setWarned(true);
    }
  }, [isLow, warned, remaining, navigate]);

  // Resetar aviso quando créditos são recarregados
  useEffect(() => {
    if (!isLow) {
      setWarned(false);
    }
  }, [isLow]);

  // Forçar re-render quando créditos são atualizados via evento global
  useEffect(() => {
    const handleCreditsUpdated = () => {
      // Força refetch do plano para sincronizar com o backend
      // Isso garante que o saldo exibido seja sempre o mais recente
      refetch();
    };
    window.addEventListener("credits:updated", handleCreditsUpdated);
    return () => window.removeEventListener("credits:updated", handleCreditsUpdated);
  }, [refetch]);

  if (loading || !plan) return null;
  
  // Debug: Log para verificar se os valores estão sendo atualizados
  if (plan && typeof window !== 'undefined' && (window as any).__DEBUG_CREDITS__) {
    console.log(`[CreditsBar] Créditos: ${plan.creditos_usados}/${plan.creditos_totais}, Remaining: ${remaining}`);
  }

  const planKey = (plan.plano || "gratuito") as PlanKey;
  const cfg = PLAN_CONFIGS[planKey] || PLAN_CONFIGS.gratuito;
  const displayRemaining = totalCredits === Infinity ? "∞" : remaining;

  const colorClass = isEmpty
    ? "text-red-500"
    : isLow
    ? "text-amber-500"
    : "text-primary";
  const bgClass = isEmpty
    ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40"
    : isLow
    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40"
    : "bg-primary/10 border-primary/20";

  return (
    <>
      {/* ===== MOBILE TOP BAR ===== */}
      <div className={`md:hidden fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40 transition-transform duration-300 ${hidden ? "-translate-y-full" : "translate-y-0"}`}>
        <div className="flex items-center justify-between px-4 py-3 gap-2 shadow-glass">
          <button
            onClick={() => navigate("/configuracoes")}
            className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-xs font-semibold shrink-0 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all duration-200 active:scale-95"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={initials} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </button>

          {/* Centro: Créditos com barra de progresso */}
          <button
            onClick={() => navigate("/creditos")}
            className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all active:scale-[0.98] ${bgClass}`}
          >
            {isLow || isEmpty ? (
              <AlertTriangle className={`h-4 w-4 ${colorClass}`} />
            ) : (
              <Zap className={`h-4 w-4 ${colorClass}`} />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-sm font-bold ${colorClass}`}>{displayRemaining}</span>
                <span className="text-[10px] text-muted-foreground">créditos</span>
              </div>
              {totalCredits !== Infinity && (
                <div className="w-full h-1 rounded-full bg-secondary/60 overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isEmpty ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-gradient-to-r from-primary to-blue-400"
                    }`}
                    style={{ width: `${Math.max(2, percentageRemaining)}%` }}
                  />
                </div>
              )}
            </div>
            <Plus className="h-3.5 w-3.5 text-black" />
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <ScannerButton />
            <button onClick={() => navigate("/suporte")} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground active:scale-90">
              <Headphones className="h-4 w-4 text-black" />
            </button>
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* ===== DESKTOP TOP BAR ===== */}
      <div className="hidden md:block sticky top-0 z-40 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 md:px-6 py-2.5 max-w-screen-2xl mx-auto gap-3 shadow-glass">
          <button
            onClick={() => navigate("/planos")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15 border border-primary/20 transition-all active:scale-95"
          >
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary">{cfg.nome}</span>
          </button>

          {/* Créditos: contador + barra + botão "+" */}
          <div className="flex-1 flex items-center justify-center gap-3">
            <button
              onClick={() => navigate("/creditos")}
              className={`gap-3 px-4 py-2 rounded-xl border transition-all active:scale-[0.98] ${bgClass} shadow-2xl items-center justify-end flex flex-row`}
            >
              {isLow || isEmpty ? (
                <AlertTriangle className={`h-4 w-4 ${colorClass}`} />
              ) : (
                <Zap className={`h-4 w-4 ${colorClass}`} />
              )}
              <div className="flex flex-col items-start min-w-[140px]">
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-sm font-bold ${colorClass}`}>{displayRemaining}</span>
                  {totalCredits !== Infinity && (
                    <span className="text-[10px] text-muted-foreground">/ {totalCredits} créditos</span>
                  )}
                  {totalCredits === Infinity && (
                    <span className="text-[10px] text-muted-foreground">créditos ilimitados</span>
                  )}
                </div>
                {totalCredits !== Infinity && (
                  <div className="w-full h-1.5 rounded-full bg-secondary/60 overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isEmpty ? "bg-red-500" : isLow ? "bg-amber-500" : "bg-gradient-to-r from-primary to-blue-400"
                      }`}
                      style={{ width: `${Math.max(2, percentageRemaining)}%` }}
                    />
                  </div>
                )}
              </div>
              <span className="flex items-center gap-1 text-[11px] font-medium text-primary">
                <Plus className="h-3 w-3" /> Comprar
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground active:scale-90" title={theme === "dark" ? "Modo claro" : "Modo escuro"}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4 text-zinc-600" />}
            </button>
            <NotificationBell />
          </div>
        </div>
      </div>
    </>
  );
};

export default CreditsBar;
