import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Loader2,
  UserPlus,
  Trash2,
  Check,
  X,
  FolderOpen,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface Workgroup {
  id: string;
  nome: string;
  criado_por: string;
  criado_em: string;
  members: { user_id: string; papel: string; aceite: boolean; nome: string | null }[];
  projectCount: number;
}

interface PendingInvite {
  id: string;
  workgroup_id: string;
  grupo_nome: string;
}

const GruposPage = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Workgroup[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteOpen, setInviteOpen] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get groups where user is member
    const { data: memberships } = await supabase
      .from("workgroup_members")
      .select("workgroup_id, papel, aceite")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      // Check for pending invites
      const { data: pending } = await supabase
        .from("workgroup_members")
        .select("id, workgroup_id")
        .eq("user_id", user.id)
        .eq("aceite", false);

      if (pending && pending.length > 0) {
        const wgIds = pending.map(p => p.workgroup_id);
        const { data: wgs } = await supabase
          .from("workgroups")
          .select("id, nome")
          .in("id", wgIds);

        setPendingInvites(pending.map(p => ({
          id: p.id,
          workgroup_id: p.workgroup_id,
          grupo_nome: wgs?.find(w => w.id === p.workgroup_id)?.nome || "Grupo",
        })));
      }
      setGroups([]);
      setLoading(false);
      return;
    }

    const acceptedIds = memberships.filter(m => m.aceite).map(m => m.workgroup_id);
    const pendingIds = memberships.filter(m => !m.aceite).map(m => m.workgroup_id);

    // Fetch pending invites
    if (pendingIds.length > 0) {
      const { data: wgs } = await supabase.from("workgroups").select("id, nome").in("id", pendingIds);
      setPendingInvites(
        memberships
          .filter(m => !m.aceite)
          .map(m => ({
            id: m.workgroup_id, // use workgroup_id for now
            workgroup_id: m.workgroup_id,
            grupo_nome: wgs?.find(w => w.id === m.workgroup_id)?.nome || "Grupo",
          }))
      );
    } else {
      setPendingInvites([]);
    }

    if (acceptedIds.length === 0) {
      setGroups([]);
      setLoading(false);
      return;
    }

    // Fetch workgroup details
    const { data: wgData } = await supabase
      .from("workgroups")
      .select("*")
      .in("id", acceptedIds);

    // Fetch all members
    const { data: allMembers } = await supabase
      .from("workgroup_members")
      .select("workgroup_id, user_id, papel, aceite")
      .in("workgroup_id", acceptedIds);

    // Fetch member profiles
    const memberIds = [...new Set((allMembers || []).map(m => m.user_id))];
    const { data: profiles } = memberIds.length > 0
      ? await supabase.from("profiles").select("id, nome").in("id", memberIds)
      : { data: [] };

    // Fetch project counts
    const { data: wpData } = await supabase
      .from("workgroup_projects")
      .select("workgroup_id")
      .in("workgroup_id", acceptedIds);

    const projectCounts: Record<string, number> = {};
    (wpData || []).forEach(wp => {
      projectCounts[wp.workgroup_id] = (projectCounts[wp.workgroup_id] || 0) + 1;
    });

    const profileMap = new Map((profiles || []).map(p => [p.id, p.nome]));

    const mapped: Workgroup[] = (wgData || []).map(wg => ({
      ...wg,
      members: (allMembers || [])
        .filter(m => m.workgroup_id === wg.id)
        .map(m => ({ ...m, nome: profileMap.get(m.user_id) || null })),
      projectCount: projectCounts[wg.id] || 0,
    }));

    setGroups(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim()) return;
    setCreating(true);

    const { data: wg, error } = await supabase
      .from("workgroups")
      .insert({ nome: newGroupName.trim(), criado_por: user.id })
      .select()
      .single();

    if (error || !wg) {
      toast({ title: "Erro ao criar grupo", description: error?.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    // Add creator as owner member
    await supabase.from("workgroup_members").insert({
      workgroup_id: wg.id,
      user_id: user.id,
      papel: "dono",
      aceite: true,
    });

    toast({ title: "Grupo criado com sucesso!" });
    setCreateOpen(false);
    setNewGroupName("");
    setCreating(false);
    fetchGroups();
  };

  const handleInvite = async (workgroupId: string) => {
    if (!user || !inviteEmail.trim()) return;
    setInviting(true);

    // Find user by email
    const { data: found, error: findErr } = await supabase
      .rpc("find_user_by_email", { _email: inviteEmail.trim().toLowerCase() });

    if (findErr || !found || found.length === 0) {
      toast({ title: "Utilizador não encontrado", description: "Verifica o email e tenta novamente.", variant: "destructive" });
      setInviting(false);
      return;
    }

    const targetUserId = found[0].user_id;
    if (targetUserId === user.id) {
      toast({ title: "Não podes convidar-te a ti mesmo", variant: "destructive" });
      setInviting(false);
      return;
    }

    // Insert member
    const { error: insertErr } = await supabase.from("workgroup_members").insert({
      workgroup_id: workgroupId,
      user_id: targetUserId,
      papel: "membro",
      aceite: false,
    });

    if (insertErr) {
      if (insertErr.message.includes("duplicate")) {
        toast({ title: "Este utilizador já foi convidado", variant: "destructive" });
      } else {
        toast({ title: "Erro ao convidar", description: insertErr.message, variant: "destructive" });
      }
      setInviting(false);
      return;
    }

    // Send notification
    await supabase.from("notifications").insert({
      user_id: targetUserId,
      titulo: "Convite para grupo",
      mensagem: `Foste convidado para o grupo "${groups.find(g => g.id === workgroupId)?.nome}". Aceita o convite na página de Grupos.`,
      tipo: "convite_grupo",
    });

    toast({ title: "Convite enviado com sucesso!" });
    setInviteOpen(null);
    setInviteEmail("");
    setInviting(false);
    fetchGroups();
  };

  const handleAcceptInvite = async (workgroupId: string) => {
    if (!user) return;
    await supabase
      .from("workgroup_members")
      .update({ aceite: true })
      .eq("workgroup_id", workgroupId)
      .eq("user_id", user.id);

    toast({ title: "Convite aceite!" });
    fetchGroups();
  };

  const handleRejectInvite = async (workgroupId: string) => {
    if (!user) return;
    await supabase
      .from("workgroup_members")
      .delete()
      .eq("workgroup_id", workgroupId)
      .eq("user_id", user.id);

    toast({ title: "Convite recusado" });
    fetchGroups();
  };

  const handleDeleteGroup = async (groupId: string) => {
    await supabase.from("workgroups").delete().eq("id", groupId);
    toast({ title: "Grupo eliminado" });
    fetchGroups();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Trabalho em Grupo</h1>
            <p className="text-sm text-muted-foreground">Colabora com os teus colegas</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Criar Grupo</span>
        </Button>
      </motion.div>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Convites Pendentes</h2>
          {pendingInvites.map((inv) => (
            <Card key={inv.workgroup_id} className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-amber-500" />
                  <span className="font-medium text-foreground">{inv.grupo_nome}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleRejectInvite(inv.workgroup_id)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={() => handleAcceptInvite(inv.workgroup_id)}>
                    <Check className="h-4 w-4 mr-1" />
                    Aceitar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Groups List */}
      {groups.length === 0 && pendingInvites.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Sem grupos ainda</h2>
          <p className="text-muted-foreground mb-6">Cria um grupo e convida os teus colegas para trabalharem juntos.</p>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar primeiro grupo
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group, i) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="h-full hover:border-primary/30 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{group.nome}</CardTitle>
                    {group.criado_por === user?.id && (
                      <Badge variant="outline" className="text-xs">Dono</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Members */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      {group.members.filter(m => m.aceite).length} membro{group.members.filter(m => m.aceite).length !== 1 ? "s" : ""}
                    </span>
                    {group.members.filter(m => !m.aceite).length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {group.members.filter(m => !m.aceite).length} pendente{group.members.filter(m => !m.aceite).length !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>

                  {/* Member names */}
                  <div className="flex flex-wrap gap-1">
                    {group.members.filter(m => m.aceite).map(m => (
                      <Badge key={m.user_id} variant="secondary" className="text-xs">
                        {m.nome || "Sem nome"}
                        {m.papel === "dono" && " 👑"}
                      </Badge>
                    ))}
                  </div>

                  {/* Project count */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FolderOpen className="h-4 w-4" />
                    <span>{group.projectCount} projecto{group.projectCount !== 1 ? "s" : ""}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {group.criado_por === user?.id && (
                      <>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => { setInviteOpen(group.id); setInviteEmail(""); }}>
                          <UserPlus className="h-3.5 w-3.5" />
                          Convidar
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive gap-1" onClick={() => handleDeleteGroup(group.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Group Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="Nome do grupo (ex: Grupo de Biologia)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateGroup} disabled={creating || !newGroupName.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={!!inviteOpen} onOpenChange={() => setInviteOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Introduz o email do colega que queres convidar. Ele precisa ter conta na plataforma.
            </p>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && inviteOpen && handleInvite(inviteOpen)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(null)}>Cancelar</Button>
            <Button onClick={() => inviteOpen && handleInvite(inviteOpen)} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GruposPage;
