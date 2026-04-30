import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Smartphone, Tablet, Monitor, MapPin, Globe, Eye, Loader2, RefreshCw, TrendingUp, CheckCircle2, XCircle, Activity } from "lucide-react";
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
    downloads.forEach((d) => {
      byDevice[d.device_type] = (byDevice[d.device_type] || 0) + 1;
      if (d.country) byCountry[d.country] = (byCountry[d.country] || 0) + 1;
      if (d.os) byOs[d.os] = (byOs[d.os] || 0) + 1;
    });
    const topCountries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topOs = Object.entries(byOs).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { total, accepted, dismissed, byDevice, topCountries, topOs };
  }, [downloads]);

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
            <p className="text-xs text-muted-foreground">Recusados</p>
            <XCircle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold mt-1 text-rose-500">{stats.dismissed}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Visitas (page views)</p>
            <Eye className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-1">{pageViewsCount}</p>
        </CardContent></Card>
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
