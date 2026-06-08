import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Loader2,
  Mail,
  Check,
  X,
  Sparkles,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useUserPlan } from "@/hooks/use-user-plan";

const COR_OPCOES = [
  "#1E9DF1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

interface Group {
  id: string;
  nome: string;
  tema: string;
  disciplina: string;
  criado_por: string;
  estado: string;
  criado_em: string;
  is_owner: boolean;
  is_member: boolean;
}

interface Invite {
  id: string;
  group_id: string;
  group_nome: string;
  group_tema: string;
}

export default function GruposPage() {
  const { user } = useAuth();
  const { plan } = useUserPlan();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ nome: "", tema: "", disciplina: "" });

  const [acceptOpen, setAcceptOpen] = useState<Invite | null>(null);
  const [acceptingNome, setAcceptingNome] = useState("");
  const [acceptingCor, setAcceptingCor] = useState(COR_OPCOES[0]);
  const [accepting, setAccepting] = useState(false);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);

    // Grupos onde sou dono
    const { data: owned } = await (supabase as any)
      .from("study_groups")
      .select("*")
      .eq("criado_por", user.id);

    // Grupos onde sou membro aceite
    const { data: memberRows } = await (supabase as any)
      .from("study_group_members")
      .select("group_id, study_groups(*)")
      .eq("user_id", user.id)
      .eq("aceite", true);

    const map = new Map<string, Group>();
    (owned || []).forEach((g: any) =>
      map.set(g.id, { ...g, is_owner: true, is_member: true }),
    );
    (memberRows || []).forEach((r: any) => {
      if (r.study_groups && !map.has(r.study_groups.id)) {
        map.set(r.study_groups.id, {
          ...r.study_groups,
          is_owner: r.study_groups.criado_por === user.id,
          is_member: true,
        });
      }
    });

    setGroups(Array.from(map.values()).sort((a, b) => b.criado_em.localeCompare(a.criado_em)));

    // Convites pendentes para o meu email
    const userEmail = user.email?.toLowerCase() || "";
    if (userEmail) {
      const { data: invs } = await (supabase as any)
        .from("study_group_invites")
        .select("id, group_id, study_groups(nome, tema)")
        .ilike("email", userEmail)
        .eq("estado", "pendente");
      setInvites(
        (invs || []).map((i: any) => ({
          id: i.id,
          group_id: i.group_id,
          group_nome: i.study_groups?.nome || "Grupo",
          group_tema: i.study_groups?.tema || "",
        })),
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleCreate = async () => {
    if (!user) return;
    if (!form.nome.trim() || !form.tema.trim() || !form.disciplina.trim()) {
      toast.error("Preenche todos os campos.");
      return;
    }
    setCreating(true);
    try {
      const { data: g, error } = await (supabase as any)
        .from("study_groups")
        .insert({
          nome: form.nome.trim(),
          tema: form.tema.trim(),
          disciplina: form.disciplina.trim(),
          criado_por: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Adiciona dono como membro pendente (vai aceitar e pagar 20 cr ao entrar)
      await (supabase as any).from("study_group_members").insert({
        group_id: g.id,
        user_id: user.id,
        nome_exibicao: user.email?.split("@")[0] || "Dono",
        cor: COR_OPCOES[0],
        papel: "dono",
        aceite: false,
        creditos_pagos: false,
      });

      toast.success("Grupo criado! Confirma a tua entrada (20 créditos).");
      setCreateOpen(false);
      setForm({ nome: "", tema: "", disciplina: "" });
      navigate(`/grupos/${g.id}`);
    } catch (e: any) {
      toast.error(e.message || "Falha ao criar grupo.");
    } finally {
      setCreating(false);
    }
  };

  const openAccept = (inv: Invite | { id: string; group_id: string; group_nome: string; group_tema: string } | Group) => {
    const baseName = user?.email?.split("@")[0] || "";
    setAcceptingNome(baseName);
    setAcceptingCor(COR_OPCOES[Math.floor(Math.random() * COR_OPCOES.length)]);
    setAcceptOpen("group_id" in inv ? (inv as Invite) : { id: "self", group_id: (inv as Group).id, group_nome: (inv as Group).nome, group_tema: (inv as Group).tema });
  };

  const handleAccept = async () => {
    if (!acceptOpen || !acceptingNome.trim()) {
      toast.error("Indica o teu nome de exibição.");
      return;
    }
    setAccepting(true);
    try {
      const { data, error } = await (supabase as any).rpc("aceitar_convite_grupo", {
        p_group_id: acceptOpen.group_id,
        p_nome_exibicao: acceptingNome.trim(),
        p_cor: acceptingCor,
      });
      if (error) throw error;
      if (!data?.ok) {
        if (data?.error === "creditos_insuficientes") {
          toast.error("Precisas de pelo menos 20 créditos para entrar no grupo.");
          
          // Calcula saldo real para o modal não mostrar zero fixo
          const total = plan?.creditos_totais === -1 ? Infinity : (plan?.creditos_totais ?? 0);
          const used = plan?.creditos_usados ?? 0;
          const remaining = total === Infinity ? Infinity : Math.max(0, (total as number) - used);
          
          window.dispatchEvent(new CustomEvent("delle:no-credits", { 
            detail: { needed: 20, available: remaining } 
          }));
        } else {
          toast.error(data?.error || "Falha ao aceitar.");
        }
        return;
      }
      toast.success("Entraste no grupo!");
      const gid = acceptOpen.group_id;
      setAcceptOpen(null);
      navigate(`/grupos/${gid}`);
    } catch (e: any) {
      toast.error(e.message || "Falha ao aceitar.");
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async (inviteId: string) => {
    await (supabase as any).from("study_group_invites").update({ estado: "recusado" }).eq("id", inviteId);
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    toast.success("Convite recusado.");
  };

  const handleDelete = async (g: Group) => {
    if (!confirm(`Eliminar o grupo "${g.nome}"? Esta acção é irreversível.`)) return;
    const { error } = await (supabase as any).from("study_groups").delete().eq("id", g.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setGroups((prev) => prev.filter((x) => x.id !== g.id));
    toast.success("Grupo eliminado.");
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Grupos Inteligentes de Estudo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cria grupos, divide o trabalho com IA e prepara a defesa em conjunto. Cada membro paga 20 créditos ao entrar.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="lg" className="gap-2">
          <Plus className="w-4 h-4" /> Criar grupo
        </Button>
      </div>

      {/* Convites pendentes */}
      {invites.length > 0 && (
        <Card className="mb-6 border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4" /> Convites pendentes ({invites.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invites.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-background border">
                <div className="min-w-0">
                  <div className="font-medium truncate">{i.group_nome}</div>
                  <div className="text-xs text-muted-foreground truncate">Tema: {i.group_tema}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => handleReject(i.id)}>
                    <X className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={() => openAccept(i)} className="gap-1">
                    <Check className="w-4 h-4" /> Aceitar (20 cr)
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Lista de grupos */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : groups.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <Users className="w-16 h-16 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">Ainda não tens nenhum grupo.</p>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Criar o primeiro grupo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow group"
                onClick={() => navigate(`/grupos/${g.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate">{g.nome}</h3>
                      <p className="text-sm text-muted-foreground truncate">{g.tema}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="secondary" className="text-xs">{g.disciplina}</Badge>
                        {g.is_owner && <Badge className="text-xs">Dono</Badge>}
                        <Badge variant="outline" className="text-xs capitalize">{g.estado}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      {g.is_owner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDelete(g); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Dialog: criar grupo */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo grupo de estudo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome do grupo</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Equipa Rocha" />
            </div>
            <div>
              <Label>Tema do trabalho</Label>
              <Input value={form.tema} onChange={(e) => setForm({ ...form, tema: e.target.value })} placeholder="Ex.: Revolução Industrial" />
            </div>
            <div>
              <Label>Disciplina</Label>
              <Input value={form.disciplina} onChange={(e) => setForm({ ...form, disciplina: e.target.value })} placeholder="Ex.: História" />
            </div>
            <p className="text-xs text-muted-foreground">
              Vais ser redirecionado para confirmar a tua entrada no grupo (20 créditos).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: aceitar (escolher nome + cor) */}
      <Dialog open={!!acceptOpen} onOpenChange={(o) => !o && setAcceptOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entrar no grupo: {acceptOpen?.group_nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>O teu nome no grupo</Label>
              <Input value={acceptingNome} onChange={(e) => setAcceptingNome(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">Cor (emblema)</Label>
              <div className="flex flex-wrap gap-2">
                {COR_OPCOES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAcceptingCor(c)}
                    className={`w-9 h-9 rounded-full border-2 transition-transform ${acceptingCor === c ? "scale-110 border-foreground" : "border-transparent"}`}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Confirmar custa <strong>20 créditos</strong>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptOpen(null)}>Cancelar</Button>
            <Button onClick={handleAccept} disabled={accepting}>
              {accepting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Confirmar entrada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
