import { useEffect, useState } from "react";
import { Loader2, Search, RotateCcw, ToggleLeft, ToggleRight, AlertTriangle, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface GlobalFlag {
  feature_key: string;
  enabled: boolean;
  label: string | null;
}

interface UserRow {
  id: string;
  email?: string;
  nome?: string | null;
}

interface UserOverride {
  feature_key: string;
  enabled: boolean;
}

const AdminFeaturesTab = () => {
  const [globalFlags, setGlobalFlags] = useState<GlobalFlag[]>([]);
  const [loading, setLoading] = useState(true);

  // Por utilizador
  const [searchQ, setSearchQ] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({});
  const [loadingUser, setLoadingUser] = useState(false);

  const loadGlobal = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("feature_flags_global")
      .select("feature_key, enabled, label")
      .order("label", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar funcionalidades");
    } else {
      setGlobalFlags((data as GlobalFlag[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadGlobal();
  }, []);

  const toggleGlobal = async (key: string, value: boolean) => {
    setGlobalFlags((prev) =>
      prev.map((f) => (f.feature_key === key ? { ...f, enabled: value } : f))
    );
    const { error } = await supabase
      .from("feature_flags_global")
      .update({ enabled: value, atualizado_em: new Date().toISOString() })
      .eq("feature_key", key);
    if (error) {
      toast.error("Falha ao actualizar. A reverter.");
      loadGlobal();
    } else {
      toast.success(value ? "Funcionalidade activada" : "Funcionalidade desactivada");
    }
  };

  const searchUsers = async () => {
    const q = searchQ.trim();
    if (!q) return;
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "search", query: q },
      });
      if (error) throw error;
      const list: UserRow[] = (data?.users || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        nome: u.nome,
      }));
      setUsers(list);
      if (list.length === 0) toast.info("Nenhum utilizador encontrado");
    } catch (e: any) {
      // Fallback: pesquisa por nome em profiles
      const { data } = await supabase
        .from("profiles")
        .select("id, nome")
        .ilike("nome", `%${q}%`)
        .limit(20);
      const list: UserRow[] = (data || []).map((p: any) => ({
        id: p.id,
        nome: p.nome,
      }));
      setUsers(list);
      if (list.length === 0) toast.error("Não foi possível pesquisar utilizadores");
    } finally {
      setSearching(false);
    }
  };

  const selectUser = async (u: UserRow) => {
    setSelectedUser(u);
    setLoadingUser(true);
    const { data } = await supabase
      .from("feature_flags_user")
      .select("feature_key, enabled")
      .eq("user_id", u.id);
    const map: Record<string, boolean> = {};
    (data as UserOverride[] | null)?.forEach((row) => {
      map[row.feature_key] = row.enabled;
    });
    setUserOverrides(map);
    setLoadingUser(false);
  };

  const setUserOverride = async (
    key: string,
    value: "inherit" | "on" | "off"
  ) => {
    if (!selectedUser) return;
    if (value === "inherit") {
      const next = { ...userOverrides };
      delete next[key];
      setUserOverrides(next);
      const { error } = await supabase
        .from("feature_flags_user")
        .delete()
        .eq("user_id", selectedUser.id)
        .eq("feature_key", key);
      if (error) toast.error("Falha ao repor");
      else toast.success("Reposto para o global");
    } else {
      const enabled = value === "on";
      setUserOverrides((prev) => ({ ...prev, [key]: enabled }));
      const { error } = await supabase
        .from("feature_flags_user")
        .upsert(
          {
            user_id: selectedUser.id,
            feature_key: key,
            enabled,
            atualizado_em: new Date().toISOString(),
          },
          { onConflict: "user_id,feature_key" }
        );
      if (error) {
        toast.error("Falha ao actualizar");
        selectUser(selectedUser);
      } else {
        toast.success(enabled ? "Activado para este utilizador" : "Desactivado para este utilizador");
      }
    }
  };

  const resetAllForUser = async () => {
    if (!selectedUser) return;
    const { error } = await supabase
      .from("feature_flags_user")
      .delete()
      .eq("user_id", selectedUser.id);
    if (error) toast.error("Falha ao repor");
    else {
      toast.success("Todas as sobreposições removidas");
      setUserOverrides({});
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Funcionalidades do Sidebar
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Activa ou desactiva itens do menu globalmente ou por utilizador. Admins/Masters vêem sempre tudo.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="global" className="space-y-4">
          <TabsList>
            <TabsTrigger value="global">Global (todos)</TabsTrigger>
            <TabsTrigger value="user">Por utilizador</TabsTrigger>
          </TabsList>

          {/* GLOBAL */}
          <TabsContent value="global">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {globalFlags.map((f) => (
                  <div
                    key={f.feature_key}
                    className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{f.label || f.feature_key}</p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">{f.feature_key}</p>
                    </div>
                    <Switch
                      checked={f.enabled}
                      onCheckedChange={(v) => toggleGlobal(f.feature_key, v)}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* POR UTILIZADOR */}
          <TabsContent value="user" className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por email ou nome..."
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                  className="pl-9"
                />
              </div>
              <Button onClick={searchUsers} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Procurar"}
              </Button>
            </div>

            {users.length > 0 && !selectedUser && (
              <div className="rounded-lg border border-border/60 divide-y">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => selectUser(u)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{u.nome || "(sem nome)"}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email || u.id}</p>
                      </div>
                    </div>
                    <Badge variant="outline">Selecionar</Badge>
                  </button>
                ))}
              </div>
            )}

            {selectedUser && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-primary/10 text-primary border-none">
                      {selectedUser.nome || selectedUser.email || selectedUser.id}
                    </Badge>
                    {selectedUser.email && (
                      <span className="text-xs text-muted-foreground">{selectedUser.email}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={resetAllForUser}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Repor todas
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                      Voltar
                    </Button>
                  </div>
                </div>

                {loadingUser ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {globalFlags.map((f) => {
                      const hasOverride = f.feature_key in userOverrides;
                      const userVal = userOverrides[f.feature_key];
                      const effective = hasOverride ? userVal : f.enabled;
                      return (
                        <div
                          key={f.feature_key}
                          className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <div>
                              <p className="text-sm font-medium truncate flex items-center gap-2">
                                {f.label || f.feature_key}
                                {!f.enabled && (
                                  <Badge variant="outline" className="text-[10px] gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Off global
                                  </Badge>
                                )}
                                {hasOverride && (
                                  <Badge className="text-[10px] bg-primary/10 text-primary border-none">
                                    Override
                                  </Badge>
                                )}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Efectivo: {effective ? "Activo" : "Desactivado"}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant={!hasOverride ? "default" : "outline"}
                              onClick={() => setUserOverride(f.feature_key, "inherit")}
                            >
                              Herdar
                            </Button>
                            <Button
                              size="sm"
                              variant={hasOverride && userVal ? "default" : "outline"}
                              onClick={() => setUserOverride(f.feature_key, "on")}
                              className="gap-1"
                            >
                              <ToggleRight className="h-3.5 w-3.5" />
                              Activo
                            </Button>
                            <Button
                              size="sm"
                              variant={hasOverride && !userVal ? "destructive" : "outline"}
                              onClick={() => setUserOverride(f.feature_key, "off")}
                              className="gap-1"
                            >
                              <ToggleLeft className="h-3.5 w-3.5" />
                              Off
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdminFeaturesTab;
