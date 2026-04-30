import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Smartphone, Tablet, Monitor, MapPin, Globe, Eye, Loader2, RefreshCw, TrendingUp, CheckCircle2, Activity } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

type Period = "24h" | "7d" | "30d" | "all";

interface DownloadRow {
  id: string;
  device_type: string;
  os: string | null;
  browser: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  ip: string | null;
  source: string;
  status: string;
  referrer: string | null;
  created_at: string;
}

const periodMs: Record<Period, number | null> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "all": null,
};

const DeviceIcon = ({ type }: { type: string }) => {
  if (type === "mobile") return <Smartphone className="h-4 w-4" />;
  if (type === "tablet") return <Tablet className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
};

export const AdminDownloadsTab = () => {
  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [pageViews, setPageViews] = useState<{ created_at: string; device_type: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("7d");
  const [liveCounter, setLiveCounter] = useState(0);

  const sinceIso = useMemo(() => {
    const ms = periodMs[period];
    if (!ms) return null;
    return new Date(Date.now() - ms).toISOString();
  }, [period]);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("app_downloads").select("*").order("created_at", { ascending: false }).limit(2000);
    if (sinceIso) q = q.gte("created_at", sinceIso);
    const { data } = await q;
    setDownloads((data as DownloadRow[]) || []);

    let pv = supabase.from("page_views").select("created_at, device_type").order("created_at", { ascending: false }).limit(5000);
    if (sinceIso) pv = pv.gte("created_at", sinceIso);
    const { data: pvData } = await pv;
    setPageViews((pvData as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [period]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("admin-downloads-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "app_downloads" }, (payload) => {
        setDownloads((prev) => [payload.new as DownloadRow, ...prev].slice(0, 2000));
        setLiveCounter((n) => n + 1);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "page_views" }, (payload) => {
        setPageViews((prev) => [payload.new as any, ...prev].slice(0, 5000));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const pageViewsCount = pageViews.length;

  const stats = useMemo(() => {
    const total = downloads.length;
    const accepted = downloads.filter((d) => d.status === "accepted").length;
    const dismissed = downloads.filter((d) => d.status === "dismissed").length;
    const byDevice: Record<string, number> = { mobile: 0, tablet: 0, desktop: 0 };
    const byCountry: Record<string, number> = {};
    const byOs: Record<string, number> = {};
    const byBrowser: Record<string, number> = {};
    downloads.forEach((d) => {
      byDevice[d.device_type] = (byDevice[d.device_type] || 0) + 1;
      if (d.country) byCountry[d.country] = (byCountry[d.country] || 0) + 1;
      if (d.os) byOs[d.os] = (byOs[d.os] || 0) + 1;
      if (d.browser) byBrowser[d.browser] = (byBrowser[d.browser] || 0) + 1;
    });
    const topCountries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topOs = Object.entries(byOs).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topBrowsers = Object.entries(byBrowser).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const conversion = pageViews.length ? Math.round((accepted / pageViews.length) * 100) : 0;
    return { total, accepted, dismissed, byDevice, topCountries, topOs, topBrowsers, conversion };
  }, [downloads, pageViews]);

  // Time series buckets aligned to selected period
  const timeseries = useMemo(() => {
    const now = Date.now();
    const ms = periodMs[period];
    const range = ms ?? (downloads.length || pageViews.length
      ? now - new Date([...downloads, ...pageViews].reduce((min, r) => r.created_at < min ? r.created_at : min, new Date().toISOString())).getTime()
      : 24 * 60 * 60 * 1000);
    // Bucket: 24h -> hourly (24), 7d -> daily (7), 30d -> daily (30), all -> daily
    const useHourly = period === "24h";
    const bucketMs = useHourly ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const bucketCount = Math.max(1, Math.ceil(range / bucketMs));
    const buckets: { label: string; ts: number; downloads: number; installed: number; visits: number }[] = [];
    for (let i = bucketCount - 1; i >= 0; i--) {
      const ts = now - i * bucketMs;
      const d = new Date(ts);
      const label = useHourly ? format(d, "HH:00") : format(d, "dd/MM");
      buckets.push({ label, ts, downloads: 0, installed: 0, visits: 0 });
    }
    const start = buckets[0].ts - bucketMs;
    const idxOf = (iso: string) => {
      const t = new Date(iso).getTime();
      const i = Math.floor((t - start) / bucketMs);
      return i >= 0 && i < buckets.length ? i : -1;
    };
    downloads.forEach((d) => {
      const i = idxOf(d.created_at);
      if (i < 0) return;
      buckets[i].downloads++;
      if (d.status === "accepted") buckets[i].installed++;
    });
    pageViews.forEach((p) => {
      const i = idxOf(p.created_at);
      if (i >= 0) buckets[i].visits++;
    });
    return buckets;
  }, [downloads, pageViews, period]);

  const deviceChartData = useMemo(() => (
    [
      { name: "Mobile", value: stats.byDevice.mobile || 0, color: "hsl(var(--primary))" },
      { name: "Desktop", value: stats.byDevice.desktop || 0, color: "hsl(217 91% 60%)" },
      { name: "Tablet", value: stats.byDevice.tablet || 0, color: "hsl(280 80% 60%)" },
    ].filter((d) => d.value > 0)
  ), [stats]);

  const countryChartData = useMemo(() => stats.topCountries.map(([name, value]) => ({ name, value })), [stats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" /> Downloads do App
          </h2>
          <p className="text-sm text-muted-foreground">
            Métricas em tempo real da landing page
            {liveCounter > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> {liveCounter} novo(s)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-32 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="all">Tudo</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="rounded-xl" onClick={load}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Total Downloads</p>
            <Download className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Instalados</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-emerald-500">{stats.accepted}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Conversão</p>
            <Activity className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-amber-500">{stats.conversion}%</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">instalações / visitas</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Visitas (page views)</p>
            <Eye className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-1">{pageViewsCount}</p>
        </CardContent></Card>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Evolução temporal
          </CardTitle>
          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> ao vivo
          </span>
        </CardHeader>
        <CardContent>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gVisits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDownloads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gInstalled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="visits" name="Visitas" stroke="hsl(217 91% 60%)" fill="url(#gVisits)" strokeWidth={2} />
                <Area type="monotone" dataKey="downloads" name="Cliques download" stroke="hsl(var(--primary))" fill="url(#gDownloads)" strokeWidth={2} />
                <Area type="monotone" dataKey="installed" name="Instalações" stroke="hsl(142 71% 45%)" fill="url(#gInstalled)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição por dispositivo</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {deviceChartData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-12">Sem dados ainda.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={deviceChartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={3}>
                      {deviceChartData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top países (downloads)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {countryChartData.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-12">Sem geolocalização registada ainda.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={countryChartData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={90} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Por Dispositivo</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(["mobile", "tablet", "desktop"] as const).map((d) => {
              const count = stats.byDevice[d] || 0;
              const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={d}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 capitalize"><DeviceIcon type={d} /> {d}</span>
                    <span className="text-muted-foreground">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Países</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats.topCountries.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem dados</p>
            ) : stats.topCountries.map(([c, n]) => (
              <div key={c} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5 text-muted-foreground" /> {c}</span>
                <Badge variant="secondary" className="rounded-full">{n}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top Sistemas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats.topOs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem dados</p>
            ) : stats.topOs.map(([o, n]) => (
              <div key={o} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5 text-muted-foreground" /> {o}</span>
                <Badge variant="secondary" className="rounded-full">{n}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent list */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Eventos recentes</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : downloads.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sem downloads no período seleccionado.</p>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              {downloads.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/40 hover:bg-secondary/50 transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <DeviceIcon type={d.device_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium capitalize">{d.device_type}</span>
                      {d.os && <span className="text-xs text-muted-foreground">· {d.os}</span>}
                      {d.browser && <span className="text-xs text-muted-foreground">· {d.browser}</span>}
                      <Badge variant={d.status === "accepted" ? "default" : d.status === "dismissed" ? "destructive" : "secondary"} className="text-[10px] rounded-full h-5">
                        {d.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <MapPin className="h-3 w-3" />
                      <span>{[d.city, d.region, d.country].filter(Boolean).join(", ") || "Localização desconhecida"}</span>
                      {d.ip && <span className="font-mono">· {d.ip}</span>}
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {format(new Date(d.created_at), "dd/MM HH:mm", { locale: pt })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDownloadsTab;
