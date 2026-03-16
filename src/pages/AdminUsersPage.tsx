import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, FileText, Zap, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface UserUsageRow {
  userId: string;
  totalProjects: number;
  totalTokens: number;
  lastActivity: string | null;
}

const getLatestDate = (a: string | null, b: string | null) => {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
};

const AdminUsersPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: isLoadingAdmin } = useAdmin();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<UserUsageRow[]>([]);

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
        const [projectsRes, logsRes] = await Promise.all([
          supabase.from("projects").select("user_id, criado_em"),
          supabase.from("usage_logs").select("user_id, tokens_usados, criado_em"),
        ]);

        const metrics = new Map<string, UserUsageRow>();

        (projectsRes.data ?? []).forEach((project) => {
          const existing =
            metrics.get(project.user_id) ??
            ({
              userId: project.user_id,
              totalProjects: 0,
              totalTokens: 0,
              lastActivity: null,
            } satisfies UserUsageRow);

          existing.totalProjects += 1;
          existing.lastActivity = getLatestDate(existing.lastActivity, project.criado_em);
          metrics.set(project.user_id, existing);
        });

        (logsRes.data ?? []).forEach((log) => {
          if (!log.user_id) return;

          const existing =
            metrics.get(log.user_id) ??
            ({
              userId: log.user_id,
              totalProjects: 0,
              totalTokens: 0,
              lastActivity: null,
            } satisfies UserUsageRow);

          existing.totalTokens += log.tokens_usados ?? 0;
          existing.lastActivity = getLatestDate(existing.lastActivity, log.criado_em);
          metrics.set(log.user_id, existing);
        });

        const data = Array.from(metrics.values()).sort(
          (a, b) => b.totalProjects - a.totalProjects || b.totalTokens - a.totalTokens
        );

        setRows(data);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  const totals = useMemo(
    () => ({
      totalUsers: rows.length,
      totalProjects: rows.reduce((sum, row) => sum + row.totalProjects, 0),
      totalTokens: rows.reduce((sum, row) => sum + row.totalTokens, 0),
    }),
    [rows]
  );

  if (isLoadingAdmin || !isAdmin || loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Painel Master</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utilizadores Activos</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{totals.totalUsers}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Trabalhos</CardTitle>
            <FileText className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{totals.totalProjects}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tokens Consumidos</CardTitle>
            <Zap className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{totals.totalTokens.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

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
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Sem utilizadores com actividade ainda.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.userId}>
                    <TableCell className="font-medium">
                      {row.userId.slice(0, 8)}...{row.userId.slice(-6)}
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
    </div>
  );
};

export default AdminUsersPage;
