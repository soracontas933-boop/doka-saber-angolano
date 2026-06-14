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
  const { getAllUsageCounts } = useUsageTracker();
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [profileRes, planRes, projectsRes, groupsRes, coversRes] = await Promise.all([
          supabase.from("profiles").select("nome").eq("id", user.id).single(),
          supabase.from("user_plans").select("plano, creditos_usados, creditos_totais, limite_trabalhos, limite_resumos, limite_questionarios, limite_planos_aula, limite_tfc").eq("user_id", user.id).single(),
          supabase.from("projects").select("id, titulo, tipo, criado_em").eq("user_id", user.id).order("criado_em", { ascending: false }).limit(5),
          supabase.from("workgroup_members").select("id").eq("user_id", user.id).eq("aceite", true),
          (supabase.from("button_covers") as any).select("button_key, image_url"),
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
    <div className="min-h-screen bg-[#0B0B0F] text-white overflow-x-hidden">
      {/* Mobile Layout Imersivo */}
      <div className="md:hidden pb-24">
        
        {/* Background Glows */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
          <div className="absolute top-[20%] -right-[10%] w-[50%] h-[30%] bg-purple-600/20 blur-[100px] rounded-full" />
        </div>

        {/* Hero Section Imersiva */}
        <div className="relative z-10 px-6 pt-20 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-[2px]">
                <div className="w-full h-full rounded-full bg-[#0B0B0F] flex items-center justify-center overflow-hidden">
                   <img src="/doka-logo.png" alt="Doka" className="w-6 h-6 object-contain" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-medium text-white/90">
                  Olá, {profile.nome?.split(" ")[0] || "Lucas"}! 👋
                </h2>
                <p className="text-xs text-white/50">Pronto para aprender hoje?</p>
              </div>
            </div>

            <div className="relative mb-10">
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight mb-4">
                Aprenda <br />
                <span className="text-gradient-blue-purple">mais, estude <br />melhor</span>
              </h1>
              <p className="text-sm text-white/40 max-w-[240px] leading-relaxed">
                Seu assistente inteligente para conquistar seus objetivos.
              </p>
              
              {/* Brain Illustration Placeholder / Decoration */}
              <div className="absolute -top-10 -right-4 w-48 h-48 pointer-events-none">
                <div className="absolute inset-0 bg-glow-blue blur-3xl opacity-50" />
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="w-32 h-32 rounded-full border border-blue-500/20 animate-pulse" />
                   <div className="absolute w-24 h-24 rounded-full border border-purple-500/10" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions Grid Imersiva */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {quickActions.slice(0, 4).map((action, i) => (
              <motion.button
                key={action.to}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                onClick={() => navigate(action.to)}
                className="immersive-card p-5 flex flex-col items-start gap-4 active:scale-95 transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                  <action.icon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-white/90 mb-1">{action.label}</h3>
                  <p className="text-[10px] text-white/40 leading-tight">
                    {action.featureKey === "trabalho" ? "Crie e organize seus trabalhos" : 
                     action.featureKey === "resumo" ? "Resuma conteúdos de forma rápida" :
                     action.featureKey === "questionario" ? "Pratique e teste seus conhecimentos" :
                     "Planeje seus estudos"}
                  </p>
                </div>
                <div className="absolute bottom-4 right-4 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                   <ChevronRight className="h-3 w-3 text-white/40" />
                </div>
              </motion.button>
            ))}
          </div>

          {/* AI Assistant Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="immersive-card p-6 mb-8 relative overflow-hidden group"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center border border-white/10">
                <Zap className="h-8 w-8 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                  <span className="text-[10px] uppercase tracking-widest text-purple-400 font-bold">Assistente IA</span>
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Tire dúvidas, aprenda mais rápido.</h3>
                <p className="text-[11px] text-white/40 leading-snug">Pergunte qualquer coisa sobre seus estudos e receba respostas inteligentes.</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                <ChevronRight className="h-5 w-5 text-white" />
              </div>
            </div>
          </motion.div>

          {/* Continue de onde parou */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white/90">Continue de onde parou</h3>
              <button onClick={() => navigate("/meus-projetos")} className="text-[11px] text-white/40 flex items-center gap-1">
                Ver todos <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            
            <div className="space-y-3">
              {recentProjects.length === 0 ? (
                <div className="immersive-card p-6 text-center">
                   <p className="text-xs text-white/30">Nenhum projeto recente.</p>
                </div>
              ) : (
                recentProjects.slice(0, 2).map((p) => (
                  <div key={p.id} onClick={() => navigate(`/${p.tipo}`)} className="immersive-card p-4 flex items-center gap-4 active:scale-[0.98] transition-all">
                    <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center border border-purple-500/20">
                      <BookOpen className="h-6 w-6 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white/90 truncate">{p.titulo}</h4>
                      <p className="text-[10px] text-white/40">{tipoLabel[p.tipo] || p.tipo}</p>
                      <div className="mt-2 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 w-[64%]" />
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                       <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-white/60 border-b-[5px] border-b-transparent ml-1" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
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
            { to: "/questionario", icon: HelpCircle, label: "Gerar Questionário", desc: "Quiz automático com respostas" },
            { to: "/plano-aula", icon: ClipboardList, label: "Plano de Aula", desc: "Planificar aulas facilmente" },
            { to: "/correcao", icon: Search, label: "Corrigir Trabalho", desc: "Análise e correcção com IA" },
            { to: "/meus-projetos", icon: FolderOpen, label: "Meus Projectos", desc: "Ver todos os projectos salvos" },
          ].map((action, i) => (
            <motion.button
              key={action.to}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 + i * 0.03 }}
              onClick={() => navigate(action.to)}
              className="group relative overflow-hidden rounded-lg border border-border bg-card p-5 text-left transition-all duration-150 hover:border-primary shadow-2xl"
            >
              <div className="inline-flex p-2.5 rounded-md bg-muted text-primary mb-3">
                <action.icon className="h-5 w-5" />
              </div>
              <h3 className="font-normal text-foreground">{action.label}</h3>
              <p className="text-xs text-muted-foreground mt-1">{action.desc}</p>
            </motion.button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-lg border border-border bg-card p-6 shadow-apple-card"
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-primary" />
              <h3 className="font-normal text-foreground">Meu Plano</h3>
            </div>
            <div className="flex items-center justify-between mb-4">
              <Badge variant="secondary" className="capitalize">{plan?.plano || "gratuito"}</Badge>
              <span className="text-sm text-foreground">{plan ? `${plan.creditos_usados}/${plan.creditos_totais === -1 ? "∞" : plan.creditos_totais}` : "..."}</span>
            </div>
            <Progress value={creditPercent} className="h-1.5 mb-4" />
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/planos")}>
              Ver Planos
            </Button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-lg border border-border bg-card p-6 shadow-apple-card"
          >
            <div className="flex items-center gap-2 mb-4">
              <UsersRound className="h-4 w-4 text-primary" />
              <h3 className="font-normal text-foreground">Comunidade</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {groupCount > 0 ? `Participa em ${groupCount} grupo${groupCount > 1 ? "s" : ""}` : "Ainda não fazes parte de nenhum grupo"}
            </p>
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate("/grupos")}>
              Ver Grupos
            </Button>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="rounded-lg border border-border bg-card p-6 shadow-apple-card"
          >
            <div className="flex items-center gap-2 mb-4">
              <FolderOpen className="h-4 w-4 text-primary" />
              <h3 className="font-normal text-foreground">Projectos Recentes</h3>
            </div>
            {recentProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum projecto ainda.</p>
            ) : (
              <div className="space-y-2">
                {recentProjects.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/${p.tipo}`)}
                    className="w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-all duration-150"
                  >
                    <WrapText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground truncate">{p.titulo}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default UserHomePage;
