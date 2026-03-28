import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Search, Crown, Loader2, Trash2, UserPlus, ShieldCheck } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserOption {
  id: string;
  nome: string;
  email: string;
}

interface AdminRole {
  id: string;
  user_id: string;
  permissions: string[];
  criado_em: string;
  user_nome?: string;
  user_email?: string;
}

const PERMISSION_OPTIONS = [
  { key: "dashboard", label: "Dashboard", desc: "Ver métricas e KPIs" },
  { key: "faturamento", label: "Faturamento", desc: "Gerir faturamento e receitas" },
  { key: "admin_panel", label: "Painel Admin", desc: "Gerir utilizadores e planos" },
  { key: "mensagens", label: "Mensagens", desc: "Responder a mensagens de suporte" },
  { key: "all", label: "Acesso Total", desc: "Todas as áreas administrativas" },
];

const AdminMastersTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch admin roles
    const { data: roles } = await (supabase.from("admin_roles") as any)
      .select("*")
      .order("criado_em", { ascending: false });

    // Fetch users via edge function
    const { data: { session } } = await supabase.auth.getSession();
    let usersList: UserOption[] = [];
    if (session) {
      try {
        const res = await supabase.functions.invoke("admin-users", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.data?.users) {
          usersList = (res.data.users as any[]).map(u => ({
            id: u.id,
            nome: u.nome || "Sem nome",
            email: u.email || "",
          }));
        }
      } catch {}
    }

    // Enrich roles with user info
    const enrichedRoles = (roles ?? []).map((r: any) => {
      const user = usersList.find(u => u.id === r.user_id);
      return {
        ...r,
        user_nome: user?.nome || "Desconhecido",
        user_email: user?.email || "",
      };
    });

    setUsers(usersList);
    setAdminRoles(enrichedRoles);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filteredUsers = users.filter(u => {
    if (!searchQuery.trim()) return false; // Only show when searching
    const q = searchQuery.toLowerCase();
    // Exclude users that are already masters
    const isAlreadyMaster = adminRoles.some(r => r.user_id === u.id);
    const isMasterEmail = ["kenymatos943@gmail.com", "manuelmatosjose67@gmail.com"].includes(u.email.toLowerCase());
    if (isAlreadyMaster || isMasterEmail) return false;
    return u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const handleTogglePermission = (key: string) => {
    if (key === "all") {
      setSelectedPermissions(prev =>
        prev.includes("all") ? [] : ["all"]
      );
      return;
    }
    setSelectedPermissions(prev => {
      const without = prev.filter(p => p !== "all" && p !== key);
      if (prev.includes(key)) return without;
      return [...without, key];
    });
  };

  const handlePromote = async () => {
    if (!selectedUserId || selectedPermissions.length === 0) {
      toast({ title: "Seleccione permissões", variant: "destructive" });
      return;
    }
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const { error } = await (supabase.from("admin_roles") as any).insert({
      user_id: selectedUserId,
      permissions: selectedPermissions,
      concedido_por: session.user.id,
    });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      // Also upgrade their plan to premium
      await (supabase.from("user_plans") as any)
        .update({
          plano: "premium",
          limite_trabalhos: -1,
          limite_resumos: -1,
          limite_questionarios: -1,
          limite_planos_aula: -1,
          limite_tfc: -1,
          creditos_totais: -1,
          suporte_prioritario: true,
          atualizado_em: new Date().toISOString(),
        })
        .eq("user_id", selectedUserId);

      toast({ title: "Utilizador promovido a Master!" });
      setSelectedUserId(null);
      setSelectedPermissions([]);
      setSearchQuery("");
      fetchData();
    }
    setSaving(false);
  };

  const handleRemove = async (roleId: string) => {
    const { error } = await (supabase.from("admin_roles") as any)
      .delete()
      .eq("id", roleId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Acesso Master removido" });
      fetchData();
    }
  };

  const handleUpdatePermissions = async (roleId: string, newPerms: string[]) => {
    const { error } = await (supabase.from("admin_roles") as any)
      .update({ permissions: newPerms, atualizado_em: new Date().toISOString() })
      .eq("id", roleId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Permissões atualizadas" });
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add new master */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Promover Utilizador a Master
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar utilizador por nome ou email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedUserId(null); }}
              className="pl-10"
            />
          </div>

          {filteredUsers.length > 0 && (
            <ScrollArea className="h-40 border rounded-lg">
              {filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => { setSelectedUserId(u.id); setSearchQuery(u.nome + " (" + u.email + ")"); }}
                  className={`w-full text-left px-3 py-2.5 transition-colors border-b border-border/50 last:border-0 ${
                    selectedUserId === u.id ? "bg-primary/10" : "hover:bg-muted/50"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">{u.nome}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </button>
              ))}
            </ScrollArea>
          )}

          {selectedUserId && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Permissões:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PERMISSION_OPTIONS.map(opt => (
                  <label
                    key={opt.key}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedPermissions.includes(opt.key) 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedPermissions.includes(opt.key)}
                      onCheckedChange={() => handleTogglePermission(opt.key)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <Button onClick={handlePromote} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                Tornar Master
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing masters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Masters Activos ({adminRoles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {adminRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum utilizador promovido ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {adminRoles.map(role => (
                <div key={role.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-foreground">{role.user_nome}</p>
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] px-1.5">
                        <Crown className="h-2.5 w-2.5 mr-0.5" />
                        Master
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{role.user_email}</p>
                    <div className="flex flex-wrap gap-1">
                      {PERMISSION_OPTIONS.filter(o => o.key !== "all").map(opt => {
                        const hasAll = role.permissions.includes("all");
                        const hasPerm = hasAll || role.permissions.includes(opt.key);
                        return (
                          <button
                            key={opt.key}
                            onClick={() => {
                              if (hasAll) {
                                // Switch from 'all' to specific perms minus this one
                                const allPerms = PERMISSION_OPTIONS.filter(o => o.key !== "all").map(o => o.key).filter(k => k !== opt.key);
                                handleUpdatePermissions(role.id, allPerms);
                              } else if (hasPerm) {
                                const newPerms = role.permissions.filter(p => p !== opt.key);
                                if (newPerms.length === 0) {
                                  toast({ title: "Precisa de pelo menos 1 permissão", variant: "destructive" });
                                  return;
                                }
                                handleUpdatePermissions(role.id, newPerms);
                              } else {
                                handleUpdatePermissions(role.id, [...role.permissions, opt.key]);
                              }
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                              hasPerm
                                ? "bg-primary/10 text-primary border-primary/30"
                                : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleRemove(role.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMastersTab;
