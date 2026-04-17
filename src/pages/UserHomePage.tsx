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
  GraduationCap,
  Plus
} from "lucide-react";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUsageTracker } from "@/hooks/use-usage-tracker";
import { Button } from "@/components/ui/button";

const quickActions = [
  { to: "/trabalho", icon: WrapText, label: "Trabalhos", color: "bg-blue-500" },
  { to: "/resumo", icon: BookOpen, label: "Resumos", color: "bg-orange-500" },
  { to: "/questionario", icon: HelpCircle, label: "Questionários", color: "bg-purple-500" },
  { to: "/plano-aula", icon: ClipboardList, label: "Planos", color: "bg-green-500" },
  { to: "/apresentacao", icon: Presentation, label: "Apresentações", color: "bg-pink-500" },
  { to: "/curriculo", icon: Search, label: "Currículo", color: "bg-indigo-500" },
  { to: "/meus-projetos", icon: FolderOpen, label: "Projetos", color: "bg-gray-500" },
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
    <div className="min-h-screen bg-[#F5F5F7] text-foreground font-apple">
      {/* Mobile Layout */}
      <div className="md:hidden pb-24">
        
        {/* Apple Style Header */}
        <header className="px-6 pt-12 pb-6 bg-white/70 backdrop-blur-xl sticky top-0 z-40 border-b border-border/20">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Hoje</p>
              <h1 className="text-3xl font-bold tracking-tight">
                Olá, {profile.nome?.split(" ")[0] || "Estudante"}
              </h1>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
              {profile.nome?.[0] || "U"}
            </div>
          </div>
        </header>

        {/* PWA Install Prompt */}
        {canInstall && (
          <div className="px-6 pt-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-2xl bg-primary text-primary-foreground shadow-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Delle no teu ecrã</p>
                  <p className="text-xs opacity-80">Instala para acesso rápido</p>
                </div>
              </div>
              <Button onClick={install} variant="secondary" size="sm" className="rounded-full px-4 h-8 text-xs font-bold">
                Instalar
              </Button>
            </motion.div>
          </div>
        )}

        {/* Quick Actions Grid - iOS Style */}
        <section className="px-6 pt-8">
          <h2 className="text-lg font-bold mb-4 px-1">Atalhos Rápidos</h2>
          <div className="grid grid-cols-4 gap-4">
            {quickActions.map((action, i) => {
              const coverKey = action.to.replace("/", "");
              const coverUrl = buttonCovers[coverKey];
              return (
                <motion.button
                  key={action.to}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(action.to)}
                  className="flex flex-col items-center gap-2 active:scale-90 transition-transform"
                >
                  <div className={`w-14 h-14 rounded-[1.25rem] shadow-sm flex items-center justify-center relative overflow-hidden ${coverUrl ? 'bg-black' : action.color}`}>
                    {coverUrl ? (
                      <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                    ) : (
                      <action.icon className="h-7 w-7 text-white" />
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-center leading-tight line-clamp-1 opacity-80">
                    {action.label}
                  </span>
                </motion.button>
              );
            })}
            <button className="flex flex-col items-center gap-2 active:scale-90 transition-transform">
              <div className="w-14 h-14 rounded-[1.25rem] bg-white border-2 border-dashed border-border flex items-center justify-center">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <span className="text-[10px] font-medium text-center opacity-80">Mais</span>
            </button>
          </div>
        </section>

        {/* Remaining Credits - iOS Card */}
        <section className="px-6 pt-10">
          <div className="p-5 rounded-[2rem] bg-white shadow-sm border border-border/40">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Créditos Restantes</h2>
              <Zap className="h-4 w-4 text-orange-500 fill-orange-500" />
            </div>
            <div className="space-y-4">
              {usageItems.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary">
                      <item.icon className="h-4 w-4 text-foreground/70" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className="text-sm font-bold bg-secondary px-3 py-1 rounded-full">{item.remaining}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Projects - iOS List */}
        <section className="px-6 pt-10">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-lg font-bold">Projectos Recentes</h2>
            <button onClick={() => navigate("/meus-projetos")} className="text-primary text-sm font-medium">Ver todos</button>
          </div>
          <div className="bg-white rounded-[2rem] shadow-sm border border-border/40 overflow-hidden">
            {recentProjects.length === 0 ? (
              <div className="py-12 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum projecto ainda.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {recentProjects.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/trabalho?id=${p.id}`)}
                    className="w-full flex items-center justify-between p-4 active:bg-secondary transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold line-clamp-1">{p.titulo}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                          {tipoLabel[p.tipo] || p.tipo}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Community Card */}
        <section className="px-6 pt-8">
          <button
            onClick={() => navigate("/grupos")}
            className="w-full p-6 rounded-[2.5rem] bg-foreground text-background shadow-xl flex items-center justify-between overflow-hidden relative"
          >
            <div className="absolute right-0 top-0 opacity-10">
              <UsersRound className="h-32 w-32 -mr-8 -mt-8" />
            </div>
            <div className="relative z-10 text-left">
              <h3 className="text-xl font-bold mb-1">Comunidade</h3>
              <p className="text-sm opacity-70">
                {groupCount > 0 ? `${groupCount} grupo${groupCount > 1 ? "s" : ""} activos` : "Cria ou junta-te a um grupo"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center relative z-10">
              <ChevronRight className="h-6 w-6" />
            </div>
          </button>
        </section>
      </div>

      {/* Desktop Layout - Minimalist Apple Dashboard */}
      <div className="hidden md:flex min-h-screen">
        <aside className="w-64 border-r border-border/40 bg-white p-8 flex flex-col">
          <div className="mb-12">
            <h1 className="text-2xl font-bold tracking-tight">Delle</h1>
          </div>
          <nav className="space-y-2 flex-grow">
            {quickActions.map(action => (
              <button
                key={action.to}
                onClick={() => navigate(action.to)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              >
                <action.icon className="h-5 w-5" />
                {action.label}
              </button>
            ))}
          </nav>
          <div className="pt-8 border-t border-border/40">
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                {profile.nome?.[0]}
              </div>
              <div className="text-xs">
                <p className="font-bold">{profile.nome}</p>
                <p className="text-muted-foreground">{plan?.plano}</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-12 max-w-6xl mx-auto w-full">
          <header className="mb-12 flex justify-between items-center">
            <h2 className="text-4xl font-bold tracking-tight">Painel de Controlo</h2>
            <Button className="apple-button-primary" onClick={() => navigate("/trabalho")}>
              Novo Projecto
            </Button>
          </header>

          <div className="grid grid-cols-3 gap-8 mb-12">
            <div className="col-span-2 p-8 rounded-[2.5rem] bg-white shadow-sm border border-border/40">
              <h3 className="text-lg font-bold mb-6">Projectos Recentes</h3>
              <div className="space-y-4">
                {recentProjects.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer" onClick={() => navigate(`/trabalho?id=${p.id}`)}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold">{p.titulo}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest">{tipoLabel[p.tipo] || p.tipo}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <div className="p-8 rounded-[2.5rem] bg-primary text-primary-foreground shadow-xl">
                <h3 className="text-lg font-bold mb-4">Uso do Plano</h3>
                <div className="space-y-4">
                  {usageItems.map(item => (
                    <div key={item.label} className="flex justify-between items-center text-sm">
                      <span>{item.label}</span>
                      <span className="font-bold">{item.remaining}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 rounded-[2.5rem] bg-white border border-border/40 shadow-sm">
                <h3 className="text-lg font-bold mb-2">Comunidade</h3>
                <p className="text-sm text-muted-foreground mb-6">Colabora com outros estudantes em tempo real.</p>
                <Button variant="outline" className="w-full rounded-2xl" onClick={() => navigate("/grupos")}>
                  Explorar Grupos
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserHomePage;
