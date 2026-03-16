import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  FileText,
  Zap,
  Loader2,
  ShieldCheck,
  BarChart3,
  Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";
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

interface UserUsageRow {
  userId: string;
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

const getLatestDate = (a: string | null, b: string | null) => {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
};

const AdminPanelPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: isLoadingAdmin } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [userRows, setUserRows] = useState<UserUsageRow[]>([]);
  const [tokensByService, setTokensByService] = useState<Record<string, number>>({});
  const [projectsByType, setProjectsByType] = useState<Record<string, number>>({});
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);

  useEffect(() => {
    if (!isLoadingAdmin && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, isLoadingAdmin, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAdmin) return;
      setLoading(true);
      try {
        const [projectsRes, logsRes, recentLogsRes] = await Promise.all([
          supabase.from("projects").select("user_id, tipo, criado_em"),
          supabase.from("usage_logs").select("user_id, servico_ia, tokens_usados, criado_em"),
          supabase
            .from("usage_logs")
            .select("*")
            .order("criado_em", { ascending: false })
            .limit(20),
        ]);

        const projects = projectsRes.data ?? [];
        const logs = logsRes.data ?? [];

        // Users metrics
        const metrics = new Map<string, UserUsageRow>();
        const typeCount: Record<string, number> = {};

        projects.forEach((p) => {
          typeCount[p.tipo] = (typeCount[p.tipo] || 0) + 1;
          const existing = metrics.get(p.user_id) ?? {
            userId: p.user_id,
            totalProjects: 0,
            totalTokens: 0,
            lastActivity: null,
          };
          existing.totalProjects += 1;
          existing.lastActivity = getLatestDate(existing.lastActivity, p.criado_em);
          metrics.set(p.user_id, existing);
        });

        const svcTokens: Record<string, number> = {};
        logs.forEach((l) => {
          const svc = l.servico_ia || "desconhecido";
          svcTokens[svc] = (svcTokens[svc] || 0) + (l.tokens_usados || 0);

          if (l.user_id) {
            const existing = metrics.get(l.user_id) ?? {
              userId: l.user_id,
              totalProjects: 0,
              totalTokens: 0,
              lastActivity: null,
            };
            existing.totalTokens += l.tokens_usados ?? 0;
            existing.lastActivity = getLatestDate(existing.lastActivity, l.criado_em);
            metrics.set(l.user_id, existing);
          }
        });

        setUserRows(
          Array.from(metrics.values()).sort(
            (a, b) => b.totalProjects - a.totalProjects || b.totalTokens - a.totalTokens
          )
        );
        setTokensByService(svcTokens);
        setProjectsByType(typeCount);
        setRecentLogs(recentLogsRes.data ?? []);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAdmin]);

  const totals = useMemo(
    () => ({
      totalUsers: userRows.length,
      totalProjects: userRows.reduce((sum, r) => sum + r.totalProjects, 0),
      totalTokens: userRows.reduce((sum, r) => sum + r.totalTokens, 0),
    }),
    [userRows]
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
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Painel Master</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Utilizadores
            </CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{totals.totalUsers}</p>
            <p className="text-xs text-muted-foreground mt-1">com actividade registada</p>
          </CardContent>
        </Card>

        <Card className="border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Trabalhos
            </CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tokens Consumidos
            </CardTitle>
            <Zap className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {totals.totalTokens.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">total acumulado</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Utilizadores
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Estatísticas
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Activity className="h-4 w-4" />
            Logs Recentes
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gestão de Utilizadores</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilizador</TableHead>
                    <TableHead>Trabalhos</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Última Actividade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Sem utilizadores com actividade ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    userRows.map((row) => (
                      <TableRow key={row.userId}>
                        <TableCell className="font-medium font-mono text-xs">
                          {row.userId.slice(0, 8)}…{row.userId.slice(-6)}
                        </TableCell>
                        <TableCell>{row.totalProjects}</TableCell>
                        <TableCell>{row.totalTokens.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.lastActivity
                            ? new Date(row.lastActivity).toLocaleDateString("pt-AO", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
                          <span className="text-muted-foreground">
                            {tokens.toLocaleString()}
                          </span>
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
    </div>
  );
};

export default AdminPanelPage;
