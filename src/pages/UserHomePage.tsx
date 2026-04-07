import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  BookOpen,
  HelpCircle,
  ClipboardList,
  Search,
  FolderOpen,
  Users,
  Zap,
  
  Download,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUsageTracker } from "@/hooks/use-usage-tracker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap } from "lucide-react";

const quickActions = [
  { to: "/trabalho", icon: FileText, label: "Trabalhos\nEscolares" },
  { to: "/resumo", icon: BookOpen, label: "Resumos" },
  { to: "/questionario", icon: HelpCircle, label: "Questionários" },
  { to: "/plano-aula", icon: ClipboardList, label: "Planos\nde Aula" },
  { to: "/curriculo", icon: Search, label: "Currículo" },
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

const UserHomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canInstall, install } = usePwaInstall();
  const [profile, setProfile] = useState<{ nome: string | null }>({ nome: null });
  const [plan, setPlan] = useState<{ plano: string; creditos_usados: number; creditos_totais: number; limite_trabalhos: number; limite_resumos: number; limite_questionarios: number; limite_planos_aula: number; limite_tfc: number } | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [groupCount, setGroupCount] = useState(0);
  const { getAllUsageCounts } = useUsageTracker();
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [profileRes, planRes, projectsRes, groupsRes] = await Promise.all([
          supabase.from("profiles").select("nome").eq("id", user.id).single(),
          supabase.from("user_plans").select("plano, creditos_usados, creditos_totais, limite_trabalhos, limite_resumos, limite_questionarios, limite_planos_aula, limite_tfc").eq("user_id", user.id).single(),
          supabase.from("projects").select("id, titulo, tipo, criado_em").eq("user_id", user.id).order("criado_em", { ascending: false }).limit(5),
          supabase.from("workgroup_members").select("id").eq("user_id", user.id).eq("aceite", true),
        ]);
        
        if (profileRes.data) setProfile(profileRes.data);
        if (planRes.data) setPlan(planRes.data);
        if (projectsRes.data) setRecentProjects(projectsRes.data);
        if (groupsRes.data) setGroupCount(groupsRes.data.length || 0);
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
    { icon: FileText, label: "Trabalhos", remaining: getRemainingCount("trabalho", plan.limite_trabalhos) },
    { icon: BookOpen, label: "Resumos", remaining: getRemainingCount("resumo", plan.limite_resumos) },
    { icon: HelpCircle, label: "Questionários", remaining: getRemainingCount("questionario", plan.limite_questionarios) },
    { icon: ClipboardList, label: "Planos Aula", remaining: getRemainingCount("plano_aula", plan.limite_planos_aula) },
    { icon: GraduationCap, label: "TFC", remaining: getRemainingCount("tfc", plan.limite_tfc) },
  ].filter(i => i.remaining !== null) : [];

  return (
    <div className="min-h-screen bg-[hsl(var(--delle-surface))] md:bg-background">
      {/* Mobile Layout */}
      <div className="md:hidden">

        {/* Hero section with download CTA */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 pt-3 pb-2"
        >
          <h2 className="text-lg font-bold text-foreground">
            Olá, {profile.nome?.split(" ")[0] || "Estudante"} 👋
          </h2>
          <p className="text-xs text-muted-foreground">O que vais criar hoje?</p>
          {canInstall && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
              <Button
                onClick={install}
                size="sm"
                className="mt-2 w-full gap-2 rounded-xl bg-[hsl(var(--delle-icon-bg))] text-primary hover:bg-[hsl(var(--delle-icon-bg))]/80 font-semibold text-xs h-9"
              >
                <Download className="h-4 w-4" /> Baixar o App
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* Usage Counters Row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="px-4 pt-1 pb-3"
        >
          <p className="text-[10px] text-muted-foreground font-medium mb-1.5 uppercase tracking-wider">Gerações restantes</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {usageItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(var(--delle-icon-bg))]/10 border border-border shrink-0">
                <item.icon className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] font-bold text-foreground">{item.remaining}</span>
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Action Icons - Circular dark zinc */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-4 pb-4"
        >
          <div className="flex justify-between gap-2">
            {quickActions.map((action, i) => (
              <motion.button
                key={action.to}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                onClick={() => navigate(action.to)}
                className="flex flex-col items-center gap-2 flex-1"
              >
                <div className="w-14 h-14 rounded-full bg-[hsl(var(--delle-icon-bg))] flex items-center justify-center transition-transform active:scale-95 shadow-md">
                  <action.icon className="h-6 w-6 text-[hsl(var(--delle-icon-fg))]" />
                </div>
                <span className="text-[10px] leading-tight text-center text-muted-foreground font-medium whitespace-pre-line">
                  {action.label}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Group Work Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="px-4 pb-4"
        >
          <button
            onClick={() => navigate("/grupos")}
            className="w-full rounded-2xl bg-[hsl(var(--delle-card))] p-4 flex items-center justify-between transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground text-sm">Group work</p>
                <p className="text-xs text-muted-foreground">
                  {groupCount > 0 ? `${groupCount} grupo${groupCount > 1 ? "s" : ""}` : "Criar ou juntar"}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </motion.div>

        {/* Recent Projects */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="px-4 pb-6"
        >
          <div className="rounded-2xl bg-[hsl(var(--delle-card))] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground text-sm">Recent Projects</h3>
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
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-background/60 hover:bg-background transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold text-xs">D</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.titulo}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {tipoLabel[p.tipo] || p.tipo} · {new Date(p.criado_em).toLocaleDateString("pt-AO")}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge
                        variant="outline"
                        className="text-[10px] border-[hsl(var(--delle-status-success))] text-[hsl(var(--delle-status-success))]"
                      >
                        Completo
                      </Badge>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Install PWA */}
        {canInstall && (
          <div className="fixed bottom-20 left-4 right-4 z-40">
            <Button className="w-full gap-2 shadow-lg rounded-xl" size="lg" onClick={install}>
              <Download className="h-5 w-5" /> Baixar App
            </Button>
          </div>
        )}
      </div>

      {/* Desktop Layout — keep existing style */}
      <div className="hidden md:block p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Olá, {profile.nome || "Estudante"}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">O que vais criar hoje?</p>
        </motion.div>

        {/* Desktop Quick Actions */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { to: "/trabalho", icon: FileText, label: "Criar Trabalho", desc: "Gerar trabalho escolar completo", color: "from-blue-500 to-blue-600" },
            { to: "/resumo", icon: BookOpen, label: "Criar Resumo", desc: "Resumir conteúdos rapidamente", color: "from-emerald-500 to-emerald-600" },
            { to: "/questionario", icon: HelpCircle, label: "Gerar Questionário", desc: "Quiz automático com respostas", color: "from-amber-500 to-amber-600" },
            { to: "/plano-aula", icon: ClipboardList, label: "Plano de Aula", desc: "Planificar aulas facilmente", color: "from-purple-500 to-purple-600" },
            { to: "/correcao", icon: Search, label: "Corrigir Trabalho", desc: "Análise e correcção com IA", color: "from-rose-500 to-rose-600" },
            { to: "/meus-projetos", icon: FolderOpen, label: "Meus Projectos", desc: "Ver todos os projectos salvos", color: "from-cyan-500 to-cyan-600" },
          ].map((action, i) => (
            <motion.button
              key={action.to}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 + i * 0.03 }}
              onClick={() => navigate(action.to)}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 text-left transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5"
            >
              <div className={`inline-flex p-2.5 rounded-lg bg-gradient-to-br ${action.color} text-white mb-3`}>
                <action.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground">{action.label}</h3>
              <p className="text-xs text-muted-foreground mt-1">{action.desc}</p>
            </motion.button>
          ))}
        </div>

        {/* Desktop Plan + Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">Meu Plano</h3>
            </div>
            <div className="flex items-center justify-between mb-4">
              <Badge variant="secondary" className="capitalize">{plan?.plano || "gratuito"}</Badge>
              <Button variant="outline" size="sm" onClick={() => navigate("/planos")}>Upgrade</Button>
            </div>
            {plan && plan.creditos_totais > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Créditos</span>
                  <span className="font-medium">{plan.creditos_usados}/{plan.creditos_totais === -1 ? "∞" : plan.creditos_totais}</span>
                </div>
                <Progress value={plan.creditos_totais === -1 ? 5 : creditPercent} className="h-2" />
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="lg:col-span-2 rounded-xl border border-border bg-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground">Actividade Recente</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/meus-projetos")}>Ver todos</Button>
            </div>
            {recentProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Ainda não criaste nenhum projecto. 🚀</p>
            ) : (
              <div className="space-y-2">
                {recentProjects.map((p) => (
                  <button key={p.id} onClick={() => navigate(`/${p.tipo}`)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.titulo}</p>
                        <p className="text-xs text-muted-foreground">{tipoLabel[p.tipo] || p.tipo}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                      {new Date(p.criado_em).toLocaleDateString("pt-AO", { day: "2-digit", month: "short" })}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Groups Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-xl border border-primary/20 bg-primary/5 p-5 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Trabalho em Grupo</h3>
              <p className="text-sm text-muted-foreground">
                {groupCount > 0 ? `Fazes parte de ${groupCount} grupo${groupCount > 1 ? "s" : ""}` : "Cria ou junta-te a um grupo"}
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/grupos")} className="gap-2">
            <Users className="h-4 w-4" />
            Ver Grupos
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default UserHomePage;
