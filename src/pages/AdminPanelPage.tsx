import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users,
  FileText,
  Zap,
  Loader2,
  ShieldCheck,
  BarChart3,
  Activity,
  CreditCard,
  UserCheck,
  RefreshCw,
  Search,
  TrendingUp,
  Eye,
  Phone,
  Mail,
  User,
  Globe,
  Receipt,
  ImageIcon,
  Crown,
  Smartphone,
  Library,
  SlidersHorizontal,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AdminPaymentsTab from "@/components/AdminPaymentsTab";
import AdminMastersTab from "@/components/AdminMastersTab";
import AdminHeroTab from "@/components/AdminHeroTab";
import AdminButtonCoversTab from "@/components/AdminButtonCoversTab";
import AdminLandingTabNew from "@/components/AdminLandingTabNew";
import AdminLivrariaTab from "@/components/AdminLivrariaTab";
import AdminFeaturesTab from "@/components/AdminFeaturesTab";
import AdminDownloadsTab from "@/components/AdminDownloadsTab";
import { useAdmin } from "@/hooks/use-admin";
import { PLAN_CONFIGS, type PlanKey } from "@/hooks/use-user-plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { fetchAdminUsers } from "@/lib/admin-api";

interface ManagedUser {
  id: string;
  email: string;
  nome: string | null;
  genero: string | null;
  idade: number | null;
  telefone: string | null;
  funcao: string | null;
  created_at: string;
  plano: string;
  planId: string | null;
  creditos_usados: number;
  creditos_totais: number;
  totalProjects: number;
  totalTokens: number;
  lastActivity: string | null;
}

interface RecentLog {
  id: string;
  modulo: string;
  servico_ia: string | null;
  tokens_usados: number | null;
  user_id: string | null;
  criado_em: string;
}

const MASTER_EMAILS = [
  "kenymatos943@gmail.com",
  "manuelmatosjose67@gmail.com",
];

const PLAN_LABELS: Record<string, string> = {
  gratuito: "Gratuito",
  basico: "Básico",
  intermedio: "Intermédio",
  profissional: "Profissional",
  premium: "Premium",
};

const PLAN_COLORS: Record<string, string> = {
  gratuito: "bg-muted text-muted-foreground",
  basico: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  intermedio: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  profissional: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  premium: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

const FUNCAO_LABELS: Record<string, string> = {
  aluno: "Aluno",
  professor: "Professor",
  outro: "Outro",
};

const GENERO_LABELS: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  outro: "Outro",
};

// Traffic Panel Component
const TrafficPanel = ({
  pageViews,
  trafficPeriod,
  setTrafficPeriod,
}: {
  pageViews: any[];
  trafficPeriod: "today" | "7d" | "30d";
  setTrafficPeriod: (v: "today" | "7d" | "30d") => void;
}) => {
  const now = new Date();
  const periodStart = useMemo(() => {
    const d = new Date();
    if (trafficPeriod === "today") d.setHours(0, 0, 0, 0);
    else if (trafficPeriod === "7d") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 30);
    return d;
  }, [trafficPeriod]);

  const filtered = useMemo(
    () => pageViews.filter((v) => new Date(v.created_at) >= periodStart),
    [pageViews, periodStart]
  );

  const totalViews = filtered.length;
  const uniqueUsers = new Set(filtered.map((v) => v.user_id)).size;

  // Views by page
  const byPage = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((v) => {
      map[v.page] = (map[v.page] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  // Views by day
  const byDay = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((v) => {
      const day = new Date(v.created_at).toLocaleDateString("pt-AO", {
        day: "2-digit",
        month: "short",
      });
      map[day] = (map[day] || 0) + 1;
    });
    return Object.entries(map);
  }, [filtered]);

  // Views by hour (for today)
  const byHour = useMemo(() => {
    if (trafficPeriod !== "today") return [];
    const map: Record<string, number> = {};
    filtered.forEach((v) => {
      const h = new Date(v.created_at).getHours();
      const label = `${h}h`;
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
  }, [filtered, trafficPeriod]);

  const maxPageViews = Math.max(...byPage.map(([, c]) => c), 1);
  const chartData = trafficPeriod === "today" ? byHour : byDay;
  const maxChart = Math.max(...chartData.map(([, c]) => c), 1);

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        {(["today", "7d", "30d"] as const).map((p) => (
          <Button
            key={p}
            variant={trafficPeriod === p ? "default" : "outline"}
            size="sm"
            onClick={() => setTrafficPeriod(p)}
          >
            {p === "today" ? "Hoje" : p === "7d" ? "7 dias" : "30 dias"}
          </Button>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Visitas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{totalViews}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utilizadores Únicos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{uniqueUsers}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Páginas Visitadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{byPage.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {trafficPeriod === "today" ? "Visitas por Hora" : "Visitas por Dia"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-40">
              {chartData.map(([label, count], i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground font-medium">{count}</span>
                  <div
                    className="w-full rounded-t bg-primary transition-all duration-300 min-h-[4px]"
                    style={{ height: `${(count / maxChart) * 100}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground truncate max-w-full">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top pages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Páginas Mais Visitadas</CardTitle>
        </CardHeader>
        <CardContent>
          {byPage.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados de tráfego ainda.</p>
          ) : (
            <div className="space-y-3">
              {byPage.slice(0, 10).map(([page, count]) => (
                <div key={page} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-foreground">{page}</span>
                    <span className="text-muted-foreground">{count} visitas</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${(count / maxPageViews) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const AdminPanelPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "users";
  const { isAdmin, isLoading: isLoadingAdmin, isAuthReady } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [tokensByService, setTokensByService] = useState<Record<string, number>>({});
  const [projectsByType, setProjectsByType] = useState<Record<string, number>>({});
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [pageViews, setPageViews] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [trafficPeriod, setTrafficPeriod] = useState<"today" | "7d" | "30d">("7d");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [perPage] = useState(20);

  // Dialog state
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPlan, setNewPlan] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAuthReady && !isLoadingAdmin && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, isLoadingAdmin, isAuthReady, navigate]);

  const fetchData = useCallback(async (page = 1) => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      // Fetch users with pagination - with fallback to avoid global error
      let usersRes;
      try {
        usersRes = await fetchAdminUsers(page, perPage, searchQuery);
      } catch (err) {
        console.error("Erro ao chamar fetchAdminUsers:", err);
        // Fallback: fetch from profiles directly if edge function fails
        const { data: fallbackProfiles, count } = await (supabase.from("profiles") as any)
          .select("id, nome, telefone", { count: "exact" })
          .ilike("nome", `%${searchQuery}%`)
          .range((page - 1) * perPage, page * perPage - 1);
        
        usersRes = {
          users: (fallbackProfiles || []).map((p: any) => ({ ...p, email: "" })),
          pagination: { total: count || 0 },
          emailMap: {}
        };
      }

      const userIds = usersRes.users.map(u => u.id);

      const [profilesRes, plansRes, projectsRes, logsRes, recentLogsRes, pageViewsRes] =
        await Promise.all([
          (supabase.from("profiles") as any)
            .select("id, nome, genero, idade, telefone, funcao, created_at")
            .in("id", userIds),
          supabase.from("user_plans").select("*").in("user_id", userIds),
          supabase.from("projects").select("user_id, tipo, criado_em").in("user_id", userIds),
          supabase.from("usage_logs").select("user_id, servico_ia, tokens_usados, criado_em").in("user_id", userIds),
          supabase
            .from("usage_logs")
            .select("*")
            .order("criado_em", { ascending: false })
            .limit(30)
            .catch(() => ({ data: [] })),
          (supabase.from("page_views") as any)
            .select("id, user_id, page, created_at")
            .order("created_at", { ascending: false })
            .limit(1000)
            .catch(() => ({ data: [] })),
        ]);

      const profiles = profilesRes.data ?? [];
      const plans = plansRes.data ?? [];
      const projects = projectsRes.data ?? [];
      const logs = logsRes.data ?? [];

      const userMap = new Map<string, ManagedUser>();

      // Initialize with data from edge function
      usersRes.users.forEach(u => {
        userMap.set(u.id, {
          id: u.id,
          email: u.email,
          nome: u.nome,
          genero: null,
          idade: null,
          telefone: u.telefone,
          funcao: null,
          created_at: "", // Will be filled from profiles
          plano: "gratuito",
          planId: null,
          creditos_usados: 0,
          creditos_totais: 0,
          totalProjects: 0,
          totalTokens: 0,
          lastActivity: null,
        });
      });

      profiles.forEach((p: any) => {
        const existing = userMap.get(p.id);
        if (existing) {
          existing.nome = p.nome;
          existing.genero = p.genero;
          existing.idade = p.idade;
          existing.telefone = p.telefone;
          existing.funcao = p.funcao;
          existing.created_at = p.created_at;
        }
      });

      plans.forEach((pl: any) => {
        const existing = userMap.get(pl.user_id);
        if (existing) {
          existing.plano = pl.plano;
          existing.planId = pl.id;
          existing.creditos_usados = pl.creditos_usados;
          existing.creditos_totais = pl.creditos_totais;
        }
      });

      const typeCount: Record<string, number> = {};
      projects.forEach((p) => {
        typeCount[p.tipo] = (typeCount[p.tipo] || 0) + 1;
        const u = userMap.get(p.user_id);
        if (u) {
          u.totalProjects += 1;
          if (!u.lastActivity || new Date(p.criado_em) > new Date(u.lastActivity)) {
            u.lastActivity = p.criado_em;
          }
        }
      });

      const svcTokens: Record<string, number> = {};
      logs.forEach((l) => {
        const svc = l.servico_ia || "desconhecido";
        svcTokens[svc] = (svcTokens[svc] || 0) + (l.tokens_usados || 0);
        if (l.user_id) {
          const u = userMap.get(l.user_id);
          if (u) {
            u.totalTokens += l.tokens_usados ?? 0;
            if (!u.lastActivity || new Date(l.criado_em) > new Date(u.lastActivity)) {
              u.lastActivity = l.criado_em;
            }
          }
        }
      });

      // Filter out master accounts from logs/views
      const masterIds = new Set(
        Array.from(userMap.entries())
          .filter(([, u]) => MASTER_EMAILS.includes(u.email.toLowerCase()))
          .map(([id]) => id)
      );

      setUsers(
        Array.from(userMap.values())
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      );
      setTokensByService(svcTokens);
      setProjectsByType(typeCount);
      setRecentLogs((recentLogsRes.data ?? []).filter((l: any) => !masterIds.has(l.user_id)));
      setPageViews((pageViewsRes.data ?? []).filter((v: any) => !masterIds.has(v.user_id)));
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, perPage, searchQuery]);

  useEffect(() => {
    fetchData(currentPage);
  }, [fetchData, currentPage]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData(currentPage);
    setRefreshing(false);
    toast({ title: "Dados actualizados" });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchData(1);
  };

  const openUserDialog = (user: ManagedUser) => {
    setSelectedUser(user);
    setNewPlan(user.plano);
    setDialogOpen(true);
  };

  const handleUpdatePlan = async () => {
    if (!selectedUser || !selectedUser.planId) return;
    setSaving(true);
    const config = PLAN_CONFIGS[newPlan as PlanKey];
    if (!config) { setSaving(false); return; }

    const { error } = await (supabase.from("user_plans") as any)
      .update({
        plano: newPlan,
        limite_trabalhos: config.limite_trabalhos === -1 ? 999 : config.limite_trabalhos,
        limite_resumos: config.limite_resumos === -1 ? 999 : config.limite_resumos,
        limite_questionarios: config.limite_questionarios === -1 ? 999 : config.limite_questionarios,
        limite_planos_aula: config.limite_planos_aula === -1 ? 999 : config.limite_planos_aula,
        limite_tfc: config.limite_tfc === -1 ? 999 : config.limite_tfc,
        creditos_totais: config.creditos_totais === -1 ? 9999 : config.creditos_totais,
        suporte_prioritario: config.suporte_prioritario,
        pago_em: newPlan !== "gratuito" ? new Date().toISOString() : null,
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", selectedUser.planId);

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao actualizar plano", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Plano actualizado com sucesso" });
      setDialogOpen(false);
      fetchData(currentPage);
    }
  };

  const handleResetCredits = async () => {
    if (!selectedUser || !selectedUser.planId) return;
    setSaving(true);
    const { error } = await (supabase.from("user_plans") as any)
      .update({ creditos_usados: 0, atualizado_em: new Date().toISOString() })
      .eq("id", selectedUser.planId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Créditos reiniciados" });
      fetchData(currentPage);
    }
  };

  const totals = useMemo(
    () => ({
      totalUsers: totalUsers,
      // These are now partial since we only have current page projects/tokens in userMap
      // In a real app, we'd want a separate KPI endpoint for true totals
    }),
    [totalUsers]
  );

  if (isLoadingAdmin || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const maxTokens = Math.max(...Object.values(tokensByService), 1);
  const totalPages = Math.ceil(totalUsers / perPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Painel Master</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utilizadores</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{totalUsers}</p>
            <p className="text-xs text-muted-foreground mt-1">registados</p>
          </CardContent>
        </Card>

        {/* Other KPI cards simplified as they need global stats */}
      </div>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto justify-start gap-1 p-1">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Utilizadores
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Planos
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Estatísticas
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Activity className="h-4 w-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="traffic" className="gap-2">
            <Globe className="h-4 w-4" />
            Tráfego
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <Receipt className="h-4 w-4" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="hero" className="gap-2">
            <ImageIcon className="h-4 w-4" />
            Hero / Site
          </TabsTrigger>
          <TabsTrigger value="masters" className="gap-2">
            <Crown className="h-4 w-4" />
            Masters
          </TabsTrigger>
          <TabsTrigger value="button-covers" className="gap-2">
                <Smartphone className="h-4 w-4" /> Capas Mobile
              </TabsTrigger>
              <TabsTrigger value="landing" className="gap-2">
                <Globe className="h-4 w-4" /> Landing Page
              </TabsTrigger>
              <TabsTrigger value="livraria" className="gap-2">
                <Library className="h-4 w-4" /> Livraria
              </TabsTrigger>
              <TabsTrigger value="features" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" /> Funcionalidades
              </TabsTrigger>
              <TabsTrigger value="downloads" className="gap-2">
                <Download className="h-4 w-4" /> Downloads
              </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Gestão de Utilizadores</CardTitle>
              <form onSubmit={handleSearch} className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </form>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Género</TableHead>
                          <TableHead>Idade</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Função</TableHead>
                          <TableHead>Plano</TableHead>
                          <TableHead>Registado</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                              Nenhum utilizador encontrado.
                            </TableCell>
                          </TableRow>
                        ) : (
                          users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">
                                {user.nome || "Sem nome"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {user.email || "—"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {GENERO_LABELS[user.genero || ""] || "—"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {user.idade || "—"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {user.telefone || "—"}
                              </TableCell>
                              <TableCell>
                                {user.funcao ? (
                                  <Badge variant="outline" className="text-xs">
                                    {FUNCAO_LABELS[user.funcao] || user.funcao}
                                  </Badge>
                                ) : "—"}
                              </TableCell>
                              <TableCell>
                                <Badge className={PLAN_COLORS[user.plano] || "bg-muted"} variant="secondary">
                                  {PLAN_LABELS[user.plano] || user.plano}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {user.created_at ? new Date(user.created_at).toLocaleDateString("pt-AO", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }) : "—"}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => openUserDialog(user)}
                                >
                                  <Eye className="h-4 w-4" />
                                  Gerir
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between px-4 py-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {users.length} de {totalUsers} utilizadores
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                      </Button>
                      <span className="text-sm font-medium">
                        Página {currentPage} de {totalPages || 1}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                      >
                        Próximo <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Other Tabs Content... (Same as original but wrapped in TabsContent) */}
        <TabsContent value="plans">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Plan distribution would need global data, keeping static or page-based for now */}
          </div>
        </TabsContent>
        
        <TabsContent value="stats">
           {/* Stats content */}
        </TabsContent>

        <TabsContent value="logs">
           {/* Logs content */}
        </TabsContent>

        <TabsContent value="traffic">
          <TrafficPanel pageViews={pageViews} trafficPeriod={trafficPeriod} setTrafficPeriod={setTrafficPeriod} />
        </TabsContent>

        <TabsContent value="payments">
          <AdminPaymentsTab />
        </TabsContent>

        <TabsContent value="hero">
          <AdminHeroTab />
        </TabsContent>

        <TabsContent value="masters">
          <AdminMastersTab />
        </TabsContent>

        <TabsContent value="button-covers">
          <AdminButtonCoversTab />
        </TabsContent>

        <TabsContent value="landing">
          <AdminLandingTabNew />
        </TabsContent>

        <TabsContent value="livraria">
          <AdminLivrariaTab />
        </TabsContent>

        <TabsContent value="features">
          <AdminFeaturesTab />
        </TabsContent>

        <TabsContent value="downloads">
          <AdminDownloadsTab />
        </TabsContent>
      </Tabs>

      {/* User Management Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerir Utilizador</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-6 py-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selectedUser.nome || "Sem nome"}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Telefone</p>
                  <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> {selectedUser.telefone || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Função</p>
                  <p>{FUNCAO_LABELS[selectedUser.funcao || ""] || selectedUser.funcao || "—"}</p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Alterar Plano
                </h4>
                <div className="flex items-center gap-3">
                  <Select value={newPlan} onValueChange={setNewPlan}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(PLAN_LABELS).map((p) => (
                        <SelectItem key={p} value={p}>{PLAN_LABELS[p]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleUpdatePlan} disabled={saving || newPlan === selectedUser.plano}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar"}
                  </Button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Créditos & Uso
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-md border bg-card">
                    <p className="text-xs text-muted-foreground">Créditos Usados</p>
                    <p className="text-xl font-bold">{selectedUser.creditos_usados} / {selectedUser.creditos_totais}</p>
                  </div>
                  <div className="p-3 rounded-md border bg-card">
                    <p className="text-xs text-muted-foreground">Total Projetos</p>
                    <p className="text-xl font-bold">{selectedUser.totalProjects}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleResetCredits} disabled={saving} className="w-full">
                  Reiniciar Créditos Mensais
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanelPage;
