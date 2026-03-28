import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
  Filter,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface BillingRecord {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  plano: string | null;
  user_email: string | null;
  categoria: string | null;
  criado_em: string;
}

type FilterPeriod = "hoje" | "semana" | "mes" | "ano" | "todos";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const getStartDate = (period: FilterPeriod): Date | null => {
  const now = new Date();
  switch (period) {
    case "hoje":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "semana": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "mes": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    case "ano": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d;
    }
    default:
      return null;
  }
};

const FaturamentoPage = () => {
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<FilterPeriod>("mes");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state for new expense
  const [newDescricao, setNewDescricao] = useState("");
  const [newValor, setNewValor] = useState("");
  const [newCategoria, setNewCategoria] = useState("operacional");

  const fetchRecords = async () => {
    setLoading(true);
    let query = supabase
      .from("billing_records")
      .select("*")
      .order("criado_em", { ascending: false });

    const startDate = getStartDate(period);
    if (startDate) {
      query = query.gte("criado_em", startDate.toISOString());
    }

    const { data } = await query;
    if (data) setRecords(data as BillingRecord[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecords();
  }, [period]);

  const handleAddExpense = async () => {
    if (!newDescricao || !newValor) {
      toast.error("Preencha todos os campos");
      return;
    }
    const { error } = await supabase.from("billing_records").insert({
      tipo: "saida",
      descricao: newDescricao,
      valor: parseFloat(newValor),
      categoria: newCategoria,
    });
    if (error) {
      toast.error("Erro ao registrar saída");
      return;
    }
    toast.success("Saída registrada!");
    setNewDescricao("");
    setNewValor("");
    setNewCategoria("operacional");
    setDialogOpen(false);
    fetchRecords();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("billing_records").delete().eq("id", id);
    toast.success("Registo eliminado");
    fetchRecords();
  };

  // Computed metrics
  const totalEntradas = useMemo(
    () => records.filter((r) => r.tipo === "entrada").reduce((s, r) => s + Number(r.valor), 0),
    [records]
  );
  const totalSaidas = useMemo(
    () => records.filter((r) => r.tipo === "saida").reduce((s, r) => s + Number(r.valor), 0),
    [records]
  );
  const lucro = totalEntradas - totalSaidas;

  // Chart data: group by day
  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; entradas: number; saidas: number }>();
    records.forEach((r) => {
      const d = new Date(r.criado_em).toLocaleDateString("pt-AO", {
        day: "2-digit",
        month: "short",
      });
      if (!map.has(d)) map.set(d, { date: d, entradas: 0, saidas: 0 });
      const entry = map.get(d)!;
      if (r.tipo === "entrada") entry.entradas += Number(r.valor);
      else entry.saidas += Number(r.valor);
    });
    return Array.from(map.values()).reverse();
  }, [records]);

  // Pie data: group by plan
  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    records
      .filter((r) => r.tipo === "entrada" && r.plano)
      .forEach((r) => {
        const label = r.plano || "Outro";
        map.set(label, (map.get(label) || 0) + Number(r.valor));
      });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [records]);

  const formatKz = (v: number) =>
    v.toLocaleString("pt-AO", { minimumFractionDigits: 0 }) + " Kz";

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" as const },
    }),
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Faturamento</h1>
          <p className="text-sm text-muted-foreground">
            Controle financeiro de receitas e despesas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-muted rounded-lg p-1">
            {(["hoje", "semana", "mes", "ano", "todos"] as FilterPeriod[]).map(
              (p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    period === p
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p === "hoje"
                    ? "Hoje"
                    : p === "semana"
                    ? "Semana"
                    : p === "mes"
                    ? "Mês"
                    : p === "ano"
                    ? "Ano"
                    : "Todos"}
                </button>
              )
            )}
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Registrar Saída
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Saída / Despesa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={newDescricao}
                    onChange={(e) => setNewDescricao(e.target.value)}
                    placeholder="Ex: Servidor, marketing..."
                  />
                </div>
                <div>
                  <Label>Valor (Kz)</Label>
                  <Input
                    type="number"
                    value={newValor}
                    onChange={(e) => setNewValor(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={newCategoria} onValueChange={setNewCategoria}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operacional">Operacional</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="servidor">Servidor / Hosting</SelectItem>
                      <SelectItem value="pessoal">Pessoal</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddExpense} className="w-full">
                  Registrar Saída
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            title: "Receita Total",
            value: totalEntradas,
            icon: TrendingUp,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
          },
          {
            title: "Despesas",
            value: totalSaidas,
            icon: TrendingDown,
            color: "text-red-500",
            bg: "bg-red-500/10",
          },
          {
            title: "Lucro Líquido",
            value: lucro,
            icon: DollarSign,
            color: lucro >= 0 ? "text-emerald-500" : "text-red-500",
            bg: lucro >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
          },
        ].map((card, i) => (
          <motion.div
            key={card.title}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {card.title}
                    </p>
                    <p className="text-2xl font-bold mt-1 text-foreground">
                      {formatKz(card.value)}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${card.bg}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart - Revenue vs Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receitas vs Despesas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gradEntrada" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradSaida" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                    <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatKz(v)}
                    />
                    <Area
                      type="monotone"
                      dataKey="entradas"
                      stroke="hsl(142, 71%, 45%)"
                      fill="url(#gradEntrada)"
                      strokeWidth={2}
                      name="Receita"
                    />
                    <Area
                      type="monotone"
                      dataKey="saidas"
                      stroke="hsl(0, 84%, 60%)"
                      fill="url(#gradSaida)"
                      strokeWidth={2}
                      name="Despesa"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pie Chart - Revenue by Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receita por Plano
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-52">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatKz(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    Sem dados de receita
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-muted-foreground capitalize">{d.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Records Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Últimos Registos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left py-2 font-medium">Tipo</th>
                    <th className="text-left py-2 font-medium">Descrição</th>
                    <th className="text-left py-2 font-medium hidden sm:table-cell">Categoria</th>
                    <th className="text-right py-2 font-medium">Valor</th>
                    <th className="text-right py-2 font-medium hidden sm:table-cell">Data</th>
                    <th className="text-right py-2 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {records.map((r) => (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-2.5">
                          {r.tipo === "entrada" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-500 text-xs font-medium">
                              <ArrowUpRight className="h-3.5 w-3.5" /> Entrada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-500 text-xs font-medium">
                              <ArrowDownRight className="h-3.5 w-3.5" /> Saída
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-foreground">{r.descricao}</td>
                        <td className="py-2.5 text-muted-foreground capitalize hidden sm:table-cell">
                          {r.categoria || "—"}
                        </td>
                        <td
                          className={`py-2.5 text-right font-medium ${
                            r.tipo === "entrada" ? "text-emerald-500" : "text-red-500"
                          }`}
                        >
                          {r.tipo === "entrada" ? "+" : "-"}
                          {formatKz(Number(r.valor))}
                        </td>
                        <td className="py-2.5 text-right text-muted-foreground text-xs hidden sm:table-cell">
                          {new Date(r.criado_em).toLocaleDateString("pt-AO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {records.length === 0 && !loading && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum registo encontrado para este período
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default FaturamentoPage;
