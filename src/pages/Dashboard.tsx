import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  FileText,
  Zap,
  Loader2,
  LayoutDashboard,
  CreditCard,
  RefreshCw,
  Search,
  TrendingUp,
  Eye,
  UserCheck,
  Activity,
  Bell,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
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

interface ManagedUser {
  id: string;
  nome: string | null;
  created_at: string;
  plano: string;
  planId: string | null;
  creditos_usados: number;
  creditos_totais: number;
  totalProjects: number;
  totalTokens: number;
  lastActivity: string | null;
}

const PLAN_LABELS: Record<string, string> = {
  gratuito: "Gratuito",
  basico: "Básico",
  intermedio: "Intermédio",
  profissional: "Profissional",
  premium: "Premium",
};

const PLAN_COLORS_MAP: Record<string, string> = {
  gratuito: "bg-muted text-muted-foreground",
  basico: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  intermedio: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  profissional: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  premium: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(220, 70%, 55%)",
  "hsl(45, 80%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(150, 60%, 45%)",
];

const CHART_TYPE_COLORS: Record<string, string> = {
  trabalho: "hsl(var(--primary))",
  resumo: "hsl(220, 70%, 55%)",
  questionario: "hsl(45, 80%, 50%)",
  "plano-aula": "hsl(280, 60%, 55%)",
  correcao: "hsl(150, 60%, 45%)",
};

// Daily free tier token limits per AI service (approximate)
const DAILY_TOKEN_LIMITS: Record<string, number> = {
  cerebras: 1_000_000,
  groq: 500_000,
  together: 500_000,
  openrouter: 200_000,
  gemini: 1_500_000,
  selfhosted: -1, // unlimited
};

const DAILY_LIMIT_LABEL = (limit: number) =>
  limit === -1 ? "Ilimitado" : limit.toLocaleString();

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: isLoadingAdmin, isAuthReady } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [tokensByService, setTokensByService] = useState<Record<string, number>>({});
  const [projectsByType, setProjectsByType] = useState<Record<string, number>>({});
  const [dailyActivity, setDailyActivity] = useState<{ date: string; projetos: number; tokens: number }[]>([]);
  const [dailyTokensByService, setDailyTokensByService] = useState<Record<string, any>[]>([]);
  const [todaySummary, setTodaySummary] = useState<{ servico: string; tokens: number; geracoes: number }[]>([]);
  const [tokensToday, setTokensToday] = useState(0);
  const [allServices, setAllServices] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [pendingPayments, setPendingPayments] = useState(0);
  const prevPendingRef = useRef(0);

  // Dialog state
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPlan, setNewPlan] = useState("");
  const [saving, setSaving] = useState(false);

  // Play alert sound using Web Audio API
  const playAlertSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      playTone(880, 0, 0.15);
      playTone(1100, 0.18, 0.15);
      playTone(880, 0.36, 0.15);
      playTone(1100, 0.54, 0.2);
    } catch {}
  }, []);

  // Fetch pending payments count
  const fetchPendingPayments = useCallback(async () => {
    const { count } = await supabase
      .from("payment_requests")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendente");
    const newCount = count ?? 0;
    if (newCount > prevPendingRef.current && prevPendingRef.current >= 0) {
      playAlertSound();
      toast({
        title: "💰 Nova solicitação de plano!",
        description: `Há ${newCount} pagamento(s) pendente(s) para aprovar.`,
      });
    }
    prevPendingRef.current = newCount;
    setPendingPayments(newCount);
  }, [playAlertSound]);

  // Realtime subscription for payment_requests
  useEffect(() => {
    if (!isAdmin) return;
    fetchPendingPayments();
    const channel = supabase
      .channel("admin-payment-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "payment_requests" },
        () => { fetchPendingPayments(); }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "payment_requests" },
        () => { fetchPendingPayments(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, fetchPendingPayments]);

  useEffect(() => {
    if (isAuthReady && !isLoadingAdmin && !isAdmin) {
      navigate("/home");
    }
  }, [isAdmin, isLoadingAdmin, isAuthReady, navigate]);

  const fetchData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [profilesRes, plansRes, projectsRes, logsRes] = await Promise.all([
        supabase.from("profiles").select("id, nome, created_at"),
        supabase.from("user_plans").select("*"),
        supabase.from("projects").select("user_id, tipo, criado_em"),
        supabase.from("usage_logs").select("user_id, servico_ia, tokens_usados, criado_em"),
      ]);

      const profiles = profilesRes.data ?? [];
      const plans = plansRes.data ?? [];
      const projects = projectsRes.data ?? [];
      const logs = logsRes.data ?? [];

      // Build user map
      const userMap = new Map<string, ManagedUser>();
      profiles.forEach((p) => {
        userMap.set(p.id, {
          id: p.id, nome: p.nome, created_at: p.created_at,
          plano: "gratuito", planId: null,
          creditos_usados: 0, creditos_totais: 0,
          totalProjects: 0, totalTokens: 0, lastActivity: null,
        });
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

      // Projects
      const typeCount: Record<string, number> = {};
      const dailyMap = new Map<string, { projetos: number; tokens: number }>();

      projects.forEach((p) => {
        typeCount[p.tipo] = (typeCount[p.tipo] || 0) + 1;
        const u = userMap.get(p.user_id);
        if (u) {
          u.totalProjects += 1;
          if (!u.lastActivity || new Date(p.criado_em) > new Date(u.lastActivity))
            u.lastActivity = p.criado_em;
        }
        const day = new Date(p.criado_em).toISOString().slice(0, 10);
        const entry = dailyMap.get(day) ?? { projetos: 0, tokens: 0 };
        entry.projetos += 1;
        dailyMap.set(day, entry);
      });

      // Logs
      const svcTokens: Record<string, number> = {};
      logs.forEach((l) => {
        const svc = l.servico_ia || "desconhecido";
        svcTokens[svc] = (svcTokens[svc] || 0) + (l.tokens_usados || 0);
        if (l.user_id) {
          const u = userMap.get(l.user_id);
          if (u) {
            u.totalTokens += l.tokens_usados ?? 0;
            if (!u.lastActivity || new Date(l.criado_em) > new Date(u.lastActivity))
              u.lastActivity = l.criado_em;
          }
        }
        const day = new Date(l.criado_em).toISOString().slice(0, 10);
        const entry = dailyMap.get(day) ?? { projetos: 0, tokens: 0 };
        entry.tokens += l.tokens_usados ?? 0;
        dailyMap.set(day, entry);
      });

      // Daily tokens by service (last 14 days) + today summary
      const todayStr = new Date().toISOString().slice(0, 10);
      const dailyServiceMap = new Map<string, Record<string, { tokens: number; count: number }>>();
      const serviceSet = new Set<string>();

      logs.forEach((l) => {
        const svc = l.servico_ia || "desconhecido";
        serviceSet.add(svc);
        const day = new Date(l.criado_em).toISOString().slice(0, 10);
        if (!dailyServiceMap.has(day)) dailyServiceMap.set(day, {});
        const dayData = dailyServiceMap.get(day)!;
        if (!dayData[svc]) dayData[svc] = { tokens: 0, count: 0 };
        dayData[svc].tokens += l.tokens_usados ?? 0;
        dayData[svc].count += 1;
      });

      const services = Array.from(serviceSet).sort();

      // Build stacked chart data (last 14 days)
      const allDays = Array.from(dailyServiceMap.keys()).sort().slice(-14);
      const stackedData = allDays.map((day) => {
        const entry: Record<string, any> = {
          date: new Date(day).toLocaleDateString("pt-AO", { day: "2-digit", month: "short" }),
        };
        const dayData = dailyServiceMap.get(day) || {};
        services.forEach((svc) => {
          entry[svc] = dayData[svc]?.tokens ?? 0;
        });
        return entry;
      });

      // Today's summary
      const todayData = dailyServiceMap.get(todayStr) || {};
      const todaySummaryArr = services
        .map((svc) => ({
          servico: svc,
          tokens: todayData[svc]?.tokens ?? 0,
          geracoes: todayData[svc]?.count ?? 0,
        }))
        .filter((s) => s.tokens > 0 || s.geracoes > 0);

      const totalTokensToday = todaySummaryArr.reduce((s, r) => s + r.tokens, 0);

      // Sort daily activity
      const sortedDaily = Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
        .map(([date, data]) => ({
          date: new Date(date).toLocaleDateString("pt-AO", { day: "2-digit", month: "short" }),
          ...data,
        }));

      setUsers(
        Array.from(userMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
      setTokensByService(svcTokens);
      setProjectsByType(typeCount);
      setDailyActivity(sortedDaily);
      setDailyTokensByService(stackedData);
      setTodaySummary(todaySummaryArr);
      setTokensToday(totalTokensToday);
      setAllServices(services);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast({ title: "Dados actualizados" });
  };

  const openUserDialog = (user: ManagedUser) => {
    setSelectedUser(user);
    setNewPlan(user.plano);
    setDialogOpen(true);
  };

  const handleUpdatePlan = async () => {
    if (!selectedUser?.planId) return;
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
      fetchData();
    }
  };

  const handleResetCredits = async () => {
    if (!selectedUser?.planId) return;
    setSaving(true);
    const { error } = await (supabase.from("user_plans") as any)
      .update({ creditos_usados: 0, atualizado_em: new Date().toISOString() })
      .eq("id", selectedUser.planId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Créditos reiniciados" });
      fetchData();
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.id.toLowerCase().includes(q) ||
        (u.nome ?? "").toLowerCase().includes(q) ||
        u.plano.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const totals = useMemo(
    () => ({
      totalUsers: users.length,
      totalProjects: users.reduce((sum, r) => sum + r.totalProjects, 0),
      totalTokens: users.reduce((sum, r) => sum + r.totalTokens, 0),
      planDistribution: users.reduce((acc, u) => {
        acc[u.plano] = (acc[u.plano] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    }),
    [users]
  );

  // Chart data
  const pieData = useMemo(
    () =>
      Object.entries(totals.planDistribution).map(([name, value]) => ({
        name: PLAN_LABELS[name] || name,
        value,
      })),
    [totals.planDistribution]
  );

  const projectBarData = useMemo(
    () =>
      Object.entries(projectsByType).map(([name, value]) => ({
        name,
        value,
      })),
    [projectsByType]
  );

  const tokenBarData = useMemo(
    () =>
      Object.entries(tokensByService)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value })),
    [tokensByService]
  );

  const SERVICE_COLORS = [
    "hsl(var(--primary))",
    "hsl(220, 70%, 55%)",
    "hsl(45, 80%, 50%)",
    "hsl(280, 60%, 55%)",
    "hsl(150, 60%, 45%)",
    "hsl(0, 70%, 55%)",
    "hsl(190, 70%, 50%)",
    "hsl(330, 60%, 55%)",
  ];

  if (isLoadingAdmin || !isAdmin || loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Visão geral do sistema</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-5 gap-4"
      >
        {[
          { label: "Utilizadores", value: totals.totalUsers, sub: "registados", icon: Users },
          { label: "Projectos", value: totals.totalProjects, sub: "criados", icon: FileText },
          { label: "Tokens Total", value: totals.totalTokens.toLocaleString(), sub: "consumidos", icon: Zap },
          { label: "Tokens Hoje", value: tokensToday.toLocaleString(), sub: "renovação diária", icon: Activity },
          {
            label: "Planos Pagos",
            value: totals.totalUsers - (totals.planDistribution["gratuito"] || 0),
            sub: "activos",
            icon: TrendingUp,
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
              <kpi.icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Pending Payments Alert Banner */}
      {pendingPayments > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400 animate-bounce" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {pendingPayments} solicitação(ões) de plano pendente(s)
                </p>
                <p className="text-sm text-muted-foreground">
                  Utilizadores aguardam aprovação de pagamento
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate("/admin")}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <CreditCard className="h-4 w-4" />
              Ver Pagamentos
            </Button>
          </div>
        </motion.div>
      )}

      {/* Charts Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        {/* Activity Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Actividade (últimos 14 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados de actividade.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dailyActivity}>
                  <defs>
                    <linearGradient id="colorProjetos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="projetos"
                    name="Projectos"
                    stroke="hsl(var(--primary))"
                    fill="url(#colorProjetos)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Plan Distribution Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Distribuição de Planos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Second Charts Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
      >
        {/* Projects by Type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Projectos por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectBarData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={projectBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="value" name="Projectos" radius={[6, 6, 0, 0]}>
                    {projectBarData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={CHART_TYPE_COLORS[entry.name] || PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tokens by Service */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Consumo por Serviço IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tokenBarData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={tokenBarData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 10 }}
                    width={120}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="value" name="Tokens" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>
      {/* Daily Tokens by Service - Stacked Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.17 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Consumo Diário por IA (últimos 14 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyTokensByService.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Sem dados de consumo.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dailyTokensByService}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend />
                  {allServices.map((svc, i) => (
                    <Bar
                      key={svc}
                      dataKey={svc}
                      name={svc}
                      stackId="tokens"
                      fill={SERVICE_COLORS[i % SERVICE_COLORS.length]}
                      radius={i === allServices.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Today's Summary Table with Daily Limits */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Quotas Diárias por IA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Serviço IA</TableHead>
                  <TableHead className="text-xs text-right">Usados Hoje</TableHead>
                  <TableHead className="text-xs text-right">Limite Diário</TableHead>
                  <TableHead className="text-xs text-right">Gerações</TableHead>
                  <TableHead className="text-xs text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-xs">
                      Nenhum serviço de IA utilizado ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  allServices.map((svc) => {
                    const row = todaySummary.find((r) => r.servico === svc);
                    const used = row?.tokens ?? 0;
                    const gens = row?.geracoes ?? 0;
                    const limit = DAILY_TOKEN_LIMITS[svc] ?? 0;
                    const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                    const isUnlimited = limit === -1;
                    return (
                      <TableRow key={svc}>
                        <TableCell className="text-xs font-medium">{svc}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{used.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{DAILY_LIMIT_LABEL(limit)}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{gens}</TableCell>
                        <TableCell className="text-xs text-right">
                          {isUnlimited ? (
                            <Badge variant="secondary" className="text-[10px] px-1.5">∞</Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 ${
                                pct >= 90
                                  ? "bg-destructive/15 text-destructive"
                                  : pct >= 70
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              }`}
                            >
                              {pct}%
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                {allServices.length > 0 && (
                  <TableRow className="border-t-2">
                    <TableCell className="text-xs font-bold">Total Hoje</TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold">{tokensToday.toLocaleString()}</TableCell>
                    <TableCell />
                    <TableCell className="text-xs text-right font-mono font-bold">
                      {todaySummary.reduce((s, r) => s + r.geracoes, 0)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>



      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Utilizadores
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Trabalhos</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Registado</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum utilizador encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono text-xs">{user.id.slice(0, 8)}…</TableCell>
                        <TableCell className="font-medium">{user.nome || "Sem nome"}</TableCell>
                        <TableCell>
                          <Badge className={PLAN_COLORS_MAP[user.plano] || "bg-muted"} variant="secondary">
                            {PLAN_LABELS[user.plano] || user.plano}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.totalProjects}</TableCell>
                        <TableCell>{user.totalTokens.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(user.created_at).toLocaleDateString("pt-AO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => openUserDialog(user)}>
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
          </CardContent>
        </Card>
      </motion.div>

      {/* User Management Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Gerir Utilizador
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">ID</p>
                  <p className="font-mono text-xs">{selectedUser.id.slice(0, 16)}…</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Nome</p>
                  <p className="font-medium">{selectedUser.nome || "Sem nome"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trabalhos</p>
                  <p className="font-medium">{selectedUser.totalProjects}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tokens</p>
                  <p className="font-medium">{selectedUser.totalTokens.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Créditos</p>
                  <p className="font-medium">{selectedUser.creditos_usados} / {selectedUser.creditos_totais}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Registado</p>
                  <p className="font-medium text-xs">
                    {new Date(selectedUser.created_at).toLocaleDateString("pt-AO")}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Alterar Plano</label>
                <Select value={newPlan} onValueChange={setNewPlan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLAN_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={handleResetCredits} disabled={saving} className="gap-1">
              <RefreshCw className="h-3 w-3" />
              Reiniciar Créditos
            </Button>
            <Button onClick={handleUpdatePlan} disabled={saving} className="gap-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              Guardar Plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
