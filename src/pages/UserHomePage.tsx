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
  TrendingUp,
  Download,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import DelleLogo from "@/components/DelleLogo";
import NotificationBell from "@/components/NotificationBell";

const quickActions = [
  { to: "/trabalho", icon: FileText, label: "Criar Tarefas\nEscolares" },
  { to: "/curriculo", icon: ClipboardList, label: "Elaborar CVs\nPlanos de Aula" },
  { to: "/resumo", icon: BookOpen, label: "Fazer Resumos\nPlanos de Aula" },
  { to: "/questionario", icon: Search, label: "Criar Resumos" },
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
  const [plan, setPlan] = useState<{ plano: string; creditos_usados: number; creditos_totais: number } | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [groupCount, setGroupCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [profileRes, planRes, projectsRes, groupsRes] = await Promise.all([
        supabase.from("profiles").select("nome").eq("id", user.id).single(),
        supabase.from("user_plans").select("plano, creditos_usados, creditos_totais").eq("user_id", user.id).single(),
        supabase.from("projects").select("id, titulo, tipo, criado_em").eq("user_id", user.id).order("criado_em", { ascending: false }).limit(5),
        supabase.from("workgroup_members").select("id").eq("user_id", user.id).eq("aceite", true),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (planRes.data) setPlan(planRes.data);
      if (projectsRes.data) setRecentProjects(projectsRes.data);
      if (groupsRes.data) setGroupCount(groupsRes.data.length);
    };
    fetchData();
  }, [user]);

  const creditPercent = plan && plan.creditos_totais > 0
    ? Math.min(100, Math.round((plan.creditos_usados / plan.creditos_totais) * 100))
    : 0;

  const initials = profile.nome
    ? profile.nome.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <div className="min-h-screen bg-[hsl(var(--delle-surface))] md:bg-background">
      {/* Mobile Header */}
      <div className="md:hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-10 h-10 rounded-full bg-[hsl(var(--delle-card))] flex items-center justify-center text-sm font-bold text-foreground"
          >
            {initials}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xl font-display font-bold text-foreground"
          >
            Delle
          </motion.h1>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </div>

        {/* Productivity Score */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="px-4 pt-2 pb-4"
        >
          <p className="text-sm text-muted-foreground font-medium">Productivity Score</p>
          <div className="flex items-center justify-between">
            <p className="text-4xl font-bold text-foreground tracking-tight">
              {plan ? `${Math.max(0, 100 - creditPercent)}%` : "—"}
            </p>
            <TrendingUp className="h-6 w-6 text-muted-foreground" />
          </div>
        </motion.div>

        {/* Quick Action Icons - Circular */}
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
                <div className="w-14 h-14 rounded-full bg-[hsl(var(--delle-icon-bg))] flex items-center justify-center transition-transform active:scale-95">
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
