import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Users, Zap, Loader2, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Stats {
  totalProjects: number;
  projectsByType: Record<string, number>;
  activeUsers: number;
  tokensByService: Record<string, number>;
  recentLogs: Array<{
    id: string;
    modulo: string;
    servico_ia: string | null;
    tokens_usados: number | null;
    user_id: string | null;
    criado_em: string;
  }>;
}

const ADMIN_EMAIL = "kenymatos943@gmail.com";

const AdminStatsPage = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== ADMIN_EMAIL) {
        navigate("/dashboard");
        return;
      }
      setAuthorized(true);
      await fetchStats();
    };
    checkAuth();
  }, [navigate]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [projectsRes, logsRes, recentLogsRes] = await Promise.all([
        supabase.from("projects").select("tipo, user_id"),
        supabase.from("usage_logs").select("servico_ia, tokens_usados"),
        supabase.from("usage_logs").select("*").order("criado_em", { ascending: false }).limit(20),
      ]);

      const projects = projectsRes.data || [];
      const logs = logsRes.data || [];
      const recentLogs = recentLogsRes.data || [];

      const projectsByType: Record<string, number> = {};
      const uniqueUsers = new Set<string>();
      projects.forEach((p) => {
        projectsByType[p.tipo] = (projectsByType[p.tipo] || 0) + 1;
        uniqueUsers.add(p.user_id);
      });

      const tokensByService: Record<string, number> = {};
      logs.forEach((l) => {
        const svc = l.servico_ia || "desconhecido";
        tokensByService[svc] = (tokensByService[svc] || 0) + (l.tokens_usados || 0);
      });

      setStats({
        totalProjects: projects.length,
        projectsByType,
        activeUsers: uniqueUsers.size,
        tokensByService,
        recentLogs,
      });
    } catch (err) {
      console.error("Erro ao buscar estatísticas:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!authorized) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  const maxTokens = Math.max(...Object.values(stats.tokensByService), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Estatísticas Admin</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Trabalhos Gerados</CardTitle>
            <FileText className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{stats.totalProjects}</p>
            <div className="mt-2 space-y-1">
              {Object.entries(stats.projectsByType).map(([tipo, count]) => (
                <p key={tipo} className="text-xs text-muted-foreground">
                  {tipo}: <span className="font-medium text-foreground">{count}</span>
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utilizadores Activos</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{stats.activeUsers}</p>
            <p className="text-xs text-muted-foreground mt-1">com projectos criados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tokens Consumidos</CardTitle>
            <Zap className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {Object.values(stats.tokensByService).reduce((a, b) => a + b, 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">total de tokens</p>
          </CardContent>
        </Card>
      </div>

      {/* Token bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consumo por Serviço de IA</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(stats.tokensByService).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados de consumo ainda.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.tokensByService)
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

      {/* Recent logs table */}
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
              {stats.recentLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Sem registos ainda.
                  </TableCell>
                </TableRow>
              ) : (
                stats.recentLogs.map((log) => (
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
    </div>
  );
};

export default AdminStatsPage;
