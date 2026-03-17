import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  UserX,
  RefreshCw,
  Search,
  TrendingUp,
  Eye,
} from "lucide-react";
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

interface ManagedUser {
  id: string;
  email: string;
  nome: string | null;
  created_at: string;
  plano: string;
  planId: string | null;
  creditos_usados: number;
  creditos_totais: number;
  totalProjects: number;
  totalTokens: number;
  lastActivity: string | null;
  disabled: boolean;
}

interface RecentLog {
  id: string;
  modulo: string;
  servico_ia: string | null;
  tokens_usados: number | null;
  user_id: string | null;
  criado_em: string;
}

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

const AdminPanelPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: isLoadingAdmin, isAuthReady } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [tokensByService, setTokensByService] = useState<Record<string, number>>({});
  const [projectsByType, setProjectsByType] = useState<Record<string, number>>({});
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

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

  const fetchData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [profilesRes, plansRes, projectsRes, logsRes, recentLogsRes] =
        await Promise.all([
          supabase.from("profiles").select("id, nome, created_at"),
          supabase.from("user_plans").select("*"),
          supabase.from("projects").select("user_id, tipo, criado_em"),
          supabase.from("usage_logs").select("user_id, servico_ia, tokens_usados, criado_em"),
          supabase
            .from("usage_logs")
            .select("*")
            .order("criado_em", { ascending: false })
            .limit(30),
        ]);

      const profiles = profilesRes.data ?? [];
      const plans = plansRes.data ?? [];
      const projects = projectsRes.data ?? [];
      const logs = logsRes.data ?? [];

      // Build user map
      const userMap = new Map<string, ManagedUser>();

      profiles.forEach((p) => {
        userMap.set(p.id, {
          id: p.id,
          email: "",
          nome: p.nome,
          created_at: p.created_at,
          plano: "gratuito",
          planId: null,
          creditos_usados: 0,
          creditos_totais: 0,
          totalProjects: 0,
          totalTokens: 0,
          lastActivity: null,
          disabled: false,
        });
      });

      plans.forEach((pl: any) => {
        const existing = userMap.get(pl.user_id);
        if (existing) {
          existing.plano = pl.plano;
          existing.planId = pl.id;
          existing.creditos_usados = pl.creditos_usados;
          existing.creditos_totais = pl.creditos_totais;
        } else {
          userMap.set(pl.user_id, {
            id: pl.user_id,
            email: "",
            nome: null,
            created_at: pl.criado_em,
            plano: pl.plano,
            planId: pl.id,
            creditos_usados: pl.creditos_usados,
            creditos_totais: pl.creditos_totais,
            totalProjects: 0,
            totalTokens: 0,
            lastActivity: null,
            disabled: false,
          });
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

      setUsers(
        Array.from(userMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
      setTokensByService(svcTokens);
      setProjectsByType(typeCount);
      setRecentLogs(recentLogsRes.data ?? []);
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
      fetchData();
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

  if (isLoadingAdmin || !isAdmin || loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const maxTokens = Math.max(...Object.values(tokensByService), 1);

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
            <p className="text-3xl font-bold text-foreground">{totals.totalUsers}</p>
            <p className="text-xs text-muted-foreground mt-1">registados</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Trabalhos</CardTitle>
            <FileText className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{totals.totalProjects}</p>
            <div className="mt-1 space-y-0.5">
              {Object.entries(projectsByType).map(([tipo, count]) => (
                <p key={tipo} className="text-xs text-muted-foreground">
                  {tipo}: <span className="font-medium text-foreground">{count}</span>
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tokens</CardTitle>
            <Zap className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {totals.totalTokens.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">consumidos</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Planos Pagos</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {totals.totalUsers - (totals.planDistribution["gratuito"] || 0)}
            </p>
            <div className="mt-1 space-y-0.5">
              {Object.entries(totals.planDistribution).map(([plano, count]) => (
                <p key={plano} className="text-xs text-muted-foreground">
                  {PLAN_LABELS[plano] || plano}: <span className="font-medium text-foreground">{count}</span>
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="flex-wrap">
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
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Gestão de Utilizadores</CardTitle>
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
                          <TableCell className="font-mono text-xs">
                            {user.id.slice(0, 8)}…
                          </TableCell>
                          <TableCell className="font-medium">
                            {user.nome || "Sem nome"}
                          </TableCell>
                          <TableCell>
                            <Badge className={PLAN_COLORS[user.plano] || "bg-muted"} variant="secondary">
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(totals.planDistribution).map(([plano, count]) => {
              const config = PLAN_CONFIGS[plano as PlanKey];
              return (
                <Card key={plano} className="border-primary/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <Badge className={PLAN_COLORS[plano] || "bg-muted"} variant="secondary">
                        {PLAN_LABELS[plano] || plano}
                      </Badge>
                      <span className="text-2xl font-bold text-foreground">{count}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {count === 1 ? "utilizador" : "utilizadores"} neste plano
                    </p>
                    {config && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {config.label_preco}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Consumo por Serviço de IA</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(tokensByService).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados de consumo ainda.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(tokensByService)
                    .sort((a, b) => b[1] - a[1])
                    .map(([svc, tokens]) => (
                      <div key={svc} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-foreground">{svc}</span>
                          <span className="text-muted-foreground">{tokens.toLocaleString()}</span>
                        </div>
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${(tokens / maxTokens) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logs Recentes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Serviço IA</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Sem registos ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.modulo}</TableCell>
                        <TableCell>{log.servico_ia || "—"}</TableCell>
                        <TableCell>{log.tokens_usados?.toLocaleString() || "0"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(log.criado_em).toLocaleDateString("pt-AO", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                  <p className="font-medium">
                    {selectedUser.creditos_usados} / {selectedUser.creditos_totais}
                  </p>
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
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetCredits}
              disabled={saving}
              className="gap-1"
            >
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

export default AdminPanelPage;
