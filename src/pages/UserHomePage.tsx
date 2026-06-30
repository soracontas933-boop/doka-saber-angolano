import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  WrapText,
  BookOpen,
  HelpCircle,
  ClipboardList,
  Presentation,
  Search,
  FolderOpen,
  UsersRound,
  Zap,
  Download,
  MoreHorizontal,
  ChevronRight,
  Play,
} from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUsageTracker } from "@/hooks/use-usage-tracker";
import { useFeatureFlags } from "@/hooks/use-feature-flags";
import { useAdmin } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap } from "lucide-react";
import { BackgroundMediaCarousel } from "@/components/BackgroundMediaCarousel";
import { useState, useEffect } from "react";

const quickActionsAll = [
  { to: "/trabalho", icon: WrapText, label: "Trabalhos", featureKey: "trabalho" },
  { to: "/resumo", icon: BookOpen, label: "Resumos", featureKey: "resumo" },
  { to: "/questionario", icon: HelpCircle, label: "Questionários", featureKey: "questionario" },
  { to: "/plano-aula", icon: ClipboardList, label: "Planos", featureKey: "plano-aula" },
  { to: "/apresentacao", icon: Presentation, label: "Apresentações", featureKey: "apresentacao" },
  { to: "/curriculo", icon: Search, label: "Currículo", featureKey: "curriculo" },
  { to: "/meus-projetos", icon: FolderOpen, label: "Projetos", featureKey: "meus-projetos" },
];

interface RecentProject {
  id: string;
  titulo: string;
  tipo: string;
  criado_em: string;
}

const tipoLabel: Record<string, string> = {
  trabalho: "Trabalho",
  resumo: "Resumo",
  questionario: "Questionário",
  "plano-aula": "Plano de Aula",
  correcao: "Correcção",
  curriculo: "Currículo",
};

const isVideoFile = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
};

const UserHomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const { isAdmin } = useAdmin();
  const quickActions = quickActionsAll.filter((a) => isAdmin || isFeatureEnabled(a.featureKey));
  const { canInstall, install } = usePwaInstall();
  const [profile, setProfile] = useState<{ nome: string | null }>({ nome: null });
  const [plan, setPlan] = useState<{ plano: string; creditos_usados: number; creditos_totais: number; limite_trabalhos: number; limite_resumos: number; limite_questionarios: number; limite_planos_aula: number; limite_tfc: number } | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [groupCount, setGroupCount] = useState(0);
  const [buttonCovers, setButtonCovers] = useState<Record<string, string>>({});
  const [heroBackgroundMedia, setHeroBackgroundMedia] = useState<any>(null);
  const { getAllUsageCounts } = useUsageTracker();
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [profileRes, planRes, projectsRes, groupsRes, coversRes, heroRes] = await Promise.all([
          supabase.from("profiles").select("nome").eq("id", user.id).single(),
          supabase.from("user_plans").select("plano, creditos_usados, creditos_totais, limite_trabalhos, limite_resumos, limite_questionarios, limite_planos_aula, limite_tfc").eq("user_id", user.id).single(),
          supabase.from("projects").select("id, titulo, tipo, criado_em").eq("user_id", user.id).order("criado_em", { ascending: false }).limit(5),
          supabase.from("workgroup_members").select("id").eq("user_id", user.id).eq("aceite", true),
          (supabase.from("button_covers") as any).select("button_key, image_url"),
          (supabase.from("hero_background_media") as any).select("*").eq("ativo", true).single(),
        ]);
        if (profileRes.data) setProfile(profileRes.data);
        if (planRes.data) setPlan(planRes.data);
        if (projectsRes.data) setRecentProjects(projectsRes.data);
        if (groupsRes.data) setGroupCount(groupsRes.data.length || 0);
        if (coversRes.data) {
          const map: Record<string, string> = {};
          (coversRes.data as any[]).forEach((c: any) => { map[c.button_key] = c.image_url; });
          setButtonCovers(map);
        }
        if (heroRes.data) {
          setHeroBackgroundMedia(heroRes.data);
        }
      } catch (error) {
        console.error("Erro ao carregar dados da home:", error);
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (plan) {
      getAllUsageCounts().then(setUsageCounts);
    }
  }, [plan, getAllUsageCounts]);

  const creditPercent = plan && plan.creditos_totais > 0
    ? Math.min(100, Math.round((plan.creditos_usados / plan.creditos_totais) * 100))
    : 0;

  const initials = profile.nome
    ? profile.nome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const getRemainingCount = (module: string, limit: number) => {
    if (limit === -1) return "∞";
    if (limit === 0) return null;
    const used = module === "trabalho" ? (usageCounts["trabalho"] || 0) + (usageCounts["correcao"] || 0) : (usageCounts[module] || 0);
    return Math.max(0, limit - used);
  };

  const usageItems = plan ? [
    { icon: WrapText, label: "Trabalhos", remaining: getRemainingCount("trabalho", plan.limite_trabalhos) },
    { icon: BookOpen, label: "Resumos", remaining: getRemainingCount("resumo", plan.limite_resumos) },
    { icon: HelpCircle, label: "Questionários", remaining: getRemainingCount("questionario", plan.limite_questionarios) },
    { icon: ClipboardList, label: "Planos Aula", remaining: getRemainingCount("plano_aula", plan.limite_planos_aula) },
    { icon: GraduationCap, label: "TFC", remaining: getRemainingCount("tfc", plan.limite_tfc) },
  ].filter(i => i.remaining !== null) : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Layout */}
      <div className="md:hidden">

        {/* Hero section with Background Media */}
        <div className="relative w-screen -mx-[calc((100vw-100%)/2)] overflow-hidden">
          {/* Background Media */}
          {heroBackgroundMedia && (
            <BackgroundMediaCarousel
              mediaUrl={heroBackgroundMedia.media_url}
              mediaType={heroBackgroundMedia.media_type}
              carouselItems={heroBackgroundMedia.carousel_items || []}
              autoPlayInterval={heroBackgroundMedia.auto_play_interval || 5000}
            />
          )}

          {/* Content Container */}
          <div className="relative z-20 px-4 pt-3 pb-2">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-xl font-normal text-foreground">
                Olá, {profile.nome?.split(" ")[0] || "Estudante"} 👋
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">O que vais criar hoje?</p>
              {canInstall && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                  <Button
                    onClick={install}
                    size="sm"
                    className="mt-2 w-full gap-2 rounded-md font-normal text-xs h-10"
                  >
                    <Download className="h-4 w-4" /> Baixar o App
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Usage Counters Row */}
          <div className="relative z-20 px-4 pt-1 pb-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <p className="text-[10px] font-normal mb-1.5 uppercase tracking-wider text-muted-foreground">Gerações restantes</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {usageItems.map((item) => (
                  <div key={item.label} className="gap-1.5 px-3 py-1.5 rounded-md border border-border shrink-0 bg-card items-center justify-center flex flex-row shadow-glass">
                    <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-normal text-foreground">{item.remaining}</span>
                    <span className="text-[10px] text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-4 pb-4 relative z-10"
        >
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action, i) => {
              const coverKey = action.to.replace("/", "");
              const coverUrl = buttonCovers[coverKey];
              return (
                <motion.button
                  key={action.to}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  onClick={() => navigate(action.to)}
                  className="group relative flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-card border border-border active:scale-[0.97] transition-all duration-150 overflow-hidden hover:border-primary shadow-xl"
                >
                  {coverUrl && (
                    isVideoFile(coverUrl) ? (
                      <video
                        src={coverUrl}
                        className="absolute inset-0 w-full h-full object-cover rounded-lg z-0"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <img
                        src={coverUrl}
                        alt={action.label}
                        className="absolute inset-0 w-full h-full object-cover rounded-lg z-0"
                      />
                    )
                  )}
                  {coverUrl && (
                    <span className="absolute inset-0 bg-foreground/40 rounded-lg z-[1]" />
                  )}
                  <div className={`relative z-10 w-11 h-11 rounded-md flex items-center justify-center transition-all duration-150 ${coverUrl ? "bg-background/20" : "bg-muted"}`}>
                    <action.icon className={`h-5 w-5 transition-colors duration-150 ${coverUrl ? "text-background" : "text-primary"}`} />
                  </div>
                  <span className={`relative z-10 text-[11px] font-normal text-center leading-tight transition-colors duration-150 ${coverUrl ? "text-background" : "text-foreground"}`}>
                    {action.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Community Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="px-4 pb-4"
        >
          <button
            onClick={() => navigate("/grupos")}
            className="group relative w-full rounded-lg border border-border bg-card p-4 transition-all duration-150 active:scale-[0.97] flex items-center justify-between hover:border-primary shadow-xl overflow-hidden"
          >
            {buttonCovers["comunidade"] && (
              isVideoFile(buttonCovers["comunidade"]) ? (
                <video
                  src={buttonCovers["comunidade"]}
                  className="absolute inset-0 w-full h-full object-cover z-0"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={buttonCovers["comunidade"]}
                  alt="Comunidade"
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />
              )
            )}
            {buttonCovers["comunidade"] && (
              <span className="absolute inset-0 bg-foreground/40 z-[1]" />
            )}
            <div className="relative z-10 flex items-center gap-3">
              <div className={`p-2.5 rounded-md ${buttonCovers["comunidade"] ? "bg-background/20" : "bg-muted"}`}>
                <UsersRound className={`h-5 w-5 ${buttonCovers["comunidade"] ? "text-background" : "text-primary"}`} />
              </div>
              <div className="text-left">
                <p className={`font-normal text-sm ${buttonCovers["comunidade"] ? "text-background" : "text-foreground"}`}>Comunidade</p>
                <p className={`text-xs ${buttonCovers["comunidade"] ? "text-background/80" : "text-muted-foreground"}`}>
                  {groupCount > 0 ? `${groupCount} grupo${groupCount > 1 ? "s" : ""}` : "Criar ou juntar"}
                </p>
              </div>
            </div>
            <ChevronRight className={`relative z-10 h-5 w-5 ${buttonCovers["comunidade"] ? "text-background" : "text-muted-foreground"}`} />
          </button>
        </motion.div>

        {/* Recent Projects */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="px-4 pb-6"
        >
          <div className="border border-border bg-card p-4 rounded-lg shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-normal text-sm text-foreground">Projetos Recentes</h3>
              <button onClick={() => navigate("/meus-projetos")}>
                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {recentProjects.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Nenhum projecto ainda. Começa agora! 🚀
              </p>
            ) : (
              <div className="space-y-2">
                {recentProjects.map((p, i) => (
                  <motion.button
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.04 }}
                    onClick={() => navigate(`/${p.tipo}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-md transition-all duration-150 text-left border border-border bg-background hover:border-primary shadow-xl"
                  >
                    <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                      <WrapText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-normal truncate text-foreground">{p.titulo}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {tipoLabel[p.tipo] || p.tipo} · {new Date(p.criado_em).toLocaleDateString("pt-AO")}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge
                        variant="outline"
                        className="text-[10px] border-border text-muted-foreground"
                      >
                        Completo
                      </Badge>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Aumentar Saldo */}
          <Button
            onClick={() => navigate("/planos")}
            className="group relative w-full mt-3 h-11 rounded-md font-normal text-sm bg-black shadow-2xl overflow-hidden"
          >
            {buttonCovers["aumentar-saldo"] && (
              isVideoFile(buttonCovers["aumentar-saldo"]) ? (
                <video
                  src={buttonCovers["aumentar-saldo"]}
                  className="absolute inset-0 w-full h-full object-cover z-0"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={buttonCovers["aumentar-saldo"]}
                  alt="Aumentar Saldo"
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />
              )
            )}
            {buttonCovers["aumentar-saldo"] && (
              <span className="absolute inset-0 bg-foreground/40 z-[1]" />
            )}
            <span className="relative z-10">Aumentar Saldo</span>
          </Button>
        </motion.div>

      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-normal text-foreground">
            Olá, {profile.nome || "Estudante"}! 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-base">O que vais criar hoje?</p>
        </motion.div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { to: "/trabalho", icon: WrapText, label: "Criar Trabalho", desc: "Gerar trabalho escolar completo" },
            { to: "/resumo", icon: BookOpen, label: "Criar Resumo", desc: "Resumir conteúdos rapidamente" },
            { to: "/questionario", icon: HelpCircle, label: "Gerar Questionário", desc: "Criar perguntas e respostas" },
            { to: "/plano-aula", icon: ClipboardList, label: "Plano de Aula", desc: "Estruturar aulas profissionais" },
            { to: "/apresentacao", icon: Presentation, label: "Apresentação", desc: "Gerar slides inteligentes" },
            { to: "/curriculo", icon: Search, label: "Currículo Profissional", desc: "Criar CV de destaque" },
          ].map((action, i) => (
            <motion.button
              key={action.to}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(action.to)}
              className="flex items-start gap-4 p-6 rounded-xl bg-card border border-border hover:border-primary hover:shadow-lg transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <action.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-lg text-foreground">{action.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{action.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserHomePage;
