import { useEffect, useState, lazy, Suspense } from "react";
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
  ArrowRight,
  Sparkles,
  Globe,
  Download,
} from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";

const InteractiveGlobe = lazy(() => import("@/components/home/InteractiveGlobe"));
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const quickActions = [
  { to: "/trabalho", icon: FileText, label: "Criar Trabalho", color: "from-blue-500 to-blue-600", desc: "Gerar trabalho escolar completo" },
  { to: "/resumo", icon: BookOpen, label: "Criar Resumo", color: "from-emerald-500 to-emerald-600", desc: "Resumir conteúdos rapidamente" },
  { to: "/questionario", icon: HelpCircle, label: "Gerar Questionário", color: "from-amber-500 to-amber-600", desc: "Quiz automático com respostas" },
  { to: "/plano-aula", icon: ClipboardList, label: "Plano de Aula", color: "from-purple-500 to-purple-600", desc: "Planificar aulas facilmente" },
  { to: "/correcao", icon: Search, label: "Corrigir Trabalho", color: "from-rose-500 to-rose-600", desc: "Análise e correcção com IA" },
  { to: "/meus-projetos", icon: FolderOpen, label: "Meus Projectos", color: "from-cyan-500 to-cyan-600", desc: "Ver todos os projectos salvos" },
];

interface RecentProject {
  id: string;
  titulo: string;
  tipo: string;
  criado_em: string;
}

const UserHomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const tipoLabel: Record<string, string> = {
    trabalho: "Trabalho",
    resumo: "Resumo",
    questionario: "Questionário",
    "plano-aula": "Plano de Aula",
    correcao: "Correcção",
  };

  const creditPercent = plan && plan.creditos_totais > 0
    ? Math.min(100, Math.round((plan.creditos_usados / plan.creditos_totais) * 100))
    : 0;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {getGreeting()}, {profile.nome || "Estudante"}! 👋
          </h1>
        </div>
        <p className="text-muted-foreground mt-1">O que vais criar hoje?</p>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {quickActions.map((action, i) => (
            <motion.button
              key={action.to}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 + i * 0.03 }}
              onClick={() => navigate(action.to)}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 md:p-5 text-left transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5"
            >
              <div className={`inline-flex p-2.5 rounded-lg bg-gradient-to-br ${action.color} text-white mb-3`}>
                <action.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground text-sm md:text-base">{action.label}</h3>
              <p className="text-xs text-muted-foreground mt-1 hidden md:block">{action.desc}</p>
              <ArrowRight className="absolute top-4 right-4 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Plan Summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Meu Plano
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="capitalize text-sm">
                  {plan?.plano || "gratuito"}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => navigate("/planos")}>
                  Upgrade
                </Button>
              </div>
              {plan && plan.creditos_totais > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Créditos</span>
                    <span className="font-medium text-foreground">
                      {plan.creditos_usados}/{plan.creditos_totais === -1 ? "∞" : plan.creditos_totais}
                    </span>
                  </div>
                  <Progress value={plan.creditos_totais === -1 ? 5 : creditPercent} className="h-2" />
                </div>
              )}
              {plan && plan.creditos_totais === 0 && (
                <p className="text-sm text-muted-foreground">
                  Faz upgrade para desbloquear mais créditos e funcionalidades.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  Actividade Recente
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate("/meus-projetos")}>
                  Ver todos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Ainda não criaste nenhum projecto. Começa agora! 🚀
                </p>
              ) : (
                <div className="space-y-2">
                  {recentProjects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/${p.tipo}`)}
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
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 3D Globe Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 items-center">
              <div className="p-6 md:p-8 space-y-4">
                <div className="inline-flex p-2.5 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                  <Globe className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Aprendizagem Global</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  A Delle conecta estudantes angolanos ao conhecimento global. Usa inteligência artificial para criar conteúdos académicos de qualidade, adaptados ao teu contexto.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {["IA Avançada", "Conteúdo Local", "Sempre Disponível"].map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
              <Suspense fallback={<div className="h-[350px] md:h-[420px] flex items-center justify-center text-muted-foreground">A carregar 3D...</div>}>
                <InteractiveGlobe />
              </Suspense>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Groups Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Trabalho em Grupo</h3>
                <p className="text-sm text-muted-foreground">
                  {groupCount > 0
                    ? `Fazes parte de ${groupCount} grupo${groupCount > 1 ? "s" : ""}`
                    : "Cria ou junta-te a um grupo para trabalhar com colegas"}
                </p>
              </div>
            </div>
            <Button onClick={() => navigate("/grupos")} className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Ver Grupos</span>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
      {/* Fixed Mobile Download Button */}
      {canInstall && (
        <div className="md:hidden fixed bottom-20 left-4 right-4 z-40">
          <Button className="w-full gap-2 shadow-lg" size="lg" onClick={install}>
            <Download className="h-5 w-5" /> Baixar App
          </Button>
        </div>
      )}
    </div>
  );
};

export default UserHomePage;
