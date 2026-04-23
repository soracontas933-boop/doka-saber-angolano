import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  UserPlus,
  Sparkles,
  Loader2,
  FileText,
  Download,
  RefreshCcw,
  Mic,
  Users,
  Layers,
  CheckCircle2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { exportPartToWord, exportPartToPDF } from "@/lib/study-group-export";

interface Group {
  id: string;
  nome: string;
  tema: string;
  disciplina: string;
  criado_por: string;
  estado: string;
}
interface Member {
  id: string;
  user_id: string;
  nome_exibicao: string;
  cor: string;
  papel: string;
  aceite: boolean;
}
interface Message {
  id: string;
  sender_id: string | null;
  sender_nome: string;
  sender_cor: string;
  conteudo: string;
  is_bot: boolean;
  criado_em: string;
}
interface Part {
  id: string;
  member_id: string;
  user_id: string;
  titulo: string;
  conteudo: string;
  ordem: number;
  defesa: any;
}

export default function GrupoDetalhePage() {
  const { id: groupId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("chat");

  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingPart, setSavingPart] = useState(false);
  const [defesaOpen, setDefesaOpen] = useState<Part | null>(null);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  const me = useMemo(() => members.find((m) => m.user_id === user?.id), [members, user]);
  const isOwner = group?.criado_por === user?.id;
  const myPart = useMemo(() => parts.find((p) => p.user_id === user?.id), [parts, user]);

  // ─── Carregar dados ────────────────────────────────────
  const loadAll = async () => {
    if (!groupId || !user) return;
    setLoading(true);
    try {
      const [{ data: g }, { data: m }, { data: msgs }, { data: ps }] = await Promise.all([
        (supabase as any).from("study_groups").select("*").eq("id", groupId).single(),
        (supabase as any).from("study_group_members").select("*").eq("group_id", groupId).order("entrou_em"),
        (supabase as any).from("study_group_messages").select("*").eq("group_id", groupId).order("criado_em"),
        (supabase as any).from("study_group_parts").select("*").eq("group_id", groupId).order("ordem"),
      ]);
      if (!g) {
        toast.error("Grupo não encontrado.");
        navigate("/grupos");
        return;
      }
      setGroup(g);
      setMembers(m || []);
      setMessages(msgs || []);
      setParts(ps || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, user?.id]);

  // ─── Realtime ─────────────────────────────────────────
  useEffect(() => {
    if (!groupId) return;
    const ch = supabase
      .channel(`grupo-${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "study_group_messages", filter: `group_id=eq.${groupId}` }, (p) => {
        if (p.eventType === "INSERT") setMessages((prev) => [...prev, p.new as Message]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "study_group_members", filter: `group_id=eq.${groupId}` }, () => {
        (supabase as any).from("study_group_members").select("*").eq("group_id", groupId).order("entrou_em").then(({ data }: any) => setMembers(data || []));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "study_group_parts", filter: `group_id=eq.${groupId}` }, () => {
        (supabase as any).from("study_group_parts").select("*").eq("group_id", groupId).order("ordem").then(({ data }: any) => setParts(data || []));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "study_groups", filter: `id=eq.${groupId}` }, (p) => {
        setGroup((prev) => prev ? { ...prev, ...(p.new as any) } : prev);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [groupId]);

  // Auto-scroll do chat
  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // ─── Acções ────────────────────────────────────────────
  const sendMessage = async () => {
    if (!newMsg.trim() || !me || !group) return;
    setSending(true);
    const conteudo = newMsg.trim();
    setNewMsg("");
    const mencionados = Array.from(conteudo.matchAll(/@(\w+)/g)).map((m) => m[1]);
    try {
      await (supabase as any).from("study_group_messages").insert({
        group_id: group.id,
        sender_id: user!.id,
        sender_nome: me.nome_exibicao,
        sender_cor: me.cor,
        conteudo,
        mencionados,
      });

      // Comando @Delle
      if (/@delle/i.test(conteudo)) {
        await callAI("bot", { comando: conteudo });
      }
    } catch (e: any) {
      toast.error(e.message || "Falha a enviar.");
    } finally {
      setSending(false);
    }
  };

  const callAI = async (action: string, extra: Record<string, any> = {}) => {
    if (!group) return;
    setAiBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const r = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-group-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sess.session?.access_token}`,
          },
          body: JSON.stringify({ action, group_id: group.id, ...extra }),
        },
      );
      const j = await r.json();
      if (!r.ok || j.error) {
        if (j.error === "creditos_insuficientes") {
          toast.error("Sem créditos suficientes.");
          window.dispatchEvent(new CustomEvent("delle:no-credits", { detail: { needed: 10, available: 0 } }));
        } else {
          toast.error(j.error || `Erro ${r.status}`);
        }
        return null;
      }
      return j;
    } catch (e: any) {
      toast.error(e.message || "Falha na IA.");
      return null;
    } finally {
      setAiBusy(false);
    }
  };

  const handleDividir = async () => {
    if (!isOwner) return;
    if (members.filter((m) => m.aceite).length < 1) {
      toast.error("Precisas de pelo menos 1 membro aceite.");
      return;
    }
    if (!confirm("A IA vai dividir o trabalho entre os membros. Continuar?")) return;
    const r = await callAI("dividir");
    if (r?.ok) toast.success(`Trabalho dividido em ${r.partes} partes!`);
  };

  const handleRegenerar = async (part: Part) => {
    if (!confirm("Regenerar esta parte custa 10 créditos. Continuar?")) return;
    const r = await callAI("regenerar", { part_id: part.id });
    if (r?.ok) {
      toast.success("Parte regenerada!");
      setEditContent(r.conteudo);
    }
  };

  const handleDefesa = async (part: Part) => {
    const r = await callAI("defesa", { part_id: part.id });
    if (r?.ok) {
      toast.success("Defesa gerada!");
      setDefesaOpen({ ...part, defesa: r.defesa });
    }
  };

  const saveEdit = async () => {
    if (!editingPart) return;
    setSavingPart(true);
    const { error } = await (supabase as any)
      .from("study_group_parts")
      .update({ conteudo: editContent, atualizado_em: new Date().toISOString() })
      .eq("id", editingPart.id);
    setSavingPart(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Guardado!");
    setEditingPart(null);
  };

  const handleInvite = async () => {
    if (!group || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      const { error } = await (supabase as any).from("study_group_invites").insert({
        group_id: group.id,
        email: inviteEmail.trim().toLowerCase(),
        convidado_por: user!.id,
      });
      if (error) throw error;
      toast.success("Convite enviado! O utilizador verá o convite ao entrar na app.");
      setInviteEmail("");
      setInviteOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Falha ao convidar.");
    } finally {
      setInviting(false);
    }
  };

  const exportPart = async (part: Part, format: "word" | "pdf") => {
    if (!group) return;
    const member = members.find((m) => m.id === part.member_id);
    const data = {
      grupoNome: group.nome,
      tema: group.tema,
      disciplina: group.disciplina,
      membroNome: member?.nome_exibicao || "Membro",
      titulo: part.titulo,
      conteudo: part.conteudo,
      defesa: part.defesa,
    };
    try {
      if (format === "word") await exportPartToWord(data);
      else await exportPartToPDF(data);
    } catch (e: any) {
      toast.error(e.message || "Falha na exportação.");
    }
  };

  const exportFullDoc = async (format: "word" | "pdf") => {
    if (!group || parts.length === 0) {
      toast.error("Sem partes para juntar.");
      return;
    }
    const merged = parts
      .sort((a, b) => a.ordem - b.ordem)
      .map((p) => `${p.titulo}\n\n${p.conteudo}`)
      .join("\n\n");
    const data = {
      grupoNome: group.nome,
      tema: group.tema,
      disciplina: group.disciplina,
      membroNome: "Trabalho Completo",
      titulo: group.tema,
      conteudo: merged,
      defesa: null,
    };
    if (format === "word") await exportPartToWord(data);
    else await exportPartToPDF(data);
  };

  // ─── UI ───────────────────────────────────────────────
  if (loading || !group) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Não-membro a aguardar aceitar (caso aceda ao detalhe directamente)
  if (!me?.aceite && !isOwner) {
    return (
      <div className="container mx-auto p-6 max-w-md">
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <p>Ainda não confirmaste a tua entrada neste grupo.</p>
            <Button onClick={() => navigate("/grupos")}>Voltar e confirmar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dono ainda não confirmou? Mostrar aviso curto
  if (isOwner && !me?.aceite) {
    return (
      <div className="container mx-auto p-6 max-w-md">
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <p>Confirma a tua entrada neste grupo (20 créditos) na lista de Grupos.</p>
            <Button onClick={() => navigate("/grupos")}>Ir para Grupos</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 md:p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/grupos")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg md:text-2xl font-bold truncate">{group.nome}</h1>
          <p className="text-xs md:text-sm text-muted-foreground truncate">
            {group.tema} • {group.disciplina}
          </p>
        </div>
        {isOwner && (
          <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)} className="gap-1">
            <UserPlus className="w-4 h-4" /> <span className="hidden md:inline">Convidar</span>
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="chat" className="gap-1"><Sparkles className="w-3.5 h-3.5" /> Chat</TabsTrigger>
          <TabsTrigger value="membros" className="gap-1"><Users className="w-3.5 h-3.5" /> Membros</TabsTrigger>
          <TabsTrigger value="partes" className="gap-1"><Layers className="w-3.5 h-3.5" /> Partes</TabsTrigger>
          <TabsTrigger value="final" className="gap-1"><FileText className="w-3.5 h-3.5" /> Final</TabsTrigger>
        </TabsList>

        {/* ─── CHAT ─── */}
        <TabsContent value="chat">
          <Card className="overflow-hidden">
            <div ref={chatScrollRef} className="h-[55vh] overflow-y-auto p-3 space-y-2 bg-muted/30">
              {messages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Sem mensagens. Diz olá! Podes usar <strong>@Delle</strong> para falar com a IA.
                </div>
              )}
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${mine ? "rounded-br-sm" : "rounded-bl-sm"}`}
                      style={{
                        background: mine ? m.sender_cor : "hsl(var(--background))",
                        color: mine ? "#fff" : undefined,
                        borderLeft: mine ? "none" : `3px solid ${m.sender_cor}`,
                      }}
                    >
                      {!mine && (
                        <div className="text-xs font-semibold mb-0.5" style={{ color: m.sender_cor }}>
                          {m.is_bot ? "🤖 Delle" : m.sender_nome}
                        </div>
                      )}
                      <div className="whitespace-pre-wrap text-sm break-words">{m.conteudo}</div>
                      <div className={`text-[10px] mt-0.5 ${mine ? "text-white/70" : "text-muted-foreground"}`}>
                        {new Date(m.criado_em).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-2 border-t bg-background flex gap-2">
              <Input
                placeholder="Mensagem... usa @Delle para a IA"
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                disabled={sending}
              />
              <Button onClick={sendMessage} disabled={sending || !newMsg.trim()}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ─── MEMBROS ─── */}
        <TabsContent value="membros">
          <Card>
            <CardContent className="p-4 space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg border">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                    style={{ background: m.cor }}
                  >
                    {m.nome_exibicao.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{m.nome_exibicao}</div>
                    <div className="flex gap-1 mt-0.5">
                      {m.papel === "dono" && <Badge className="text-[10px]">Dono</Badge>}
                      {m.aceite ? (
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Aceite
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Pendente</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── PARTES ─── */}
        <TabsContent value="partes">
          <div className="space-y-3">
            {isOwner && (
              <Button onClick={handleDividir} disabled={aiBusy} className="w-full gap-2" size="lg">
                {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {parts.length > 0 ? "Re-dividir trabalho com IA" : "Dividir trabalho com IA"}
              </Button>
            )}

            {parts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  {isOwner
                    ? "Carrega em \"Dividir trabalho com IA\" para a Delle distribuir as partes."
                    : "À espera que o dono divida o trabalho."}
                </CardContent>
              </Card>
            ) : (
              parts.map((p) => {
                const mem = members.find((m) => m.id === p.member_id);
                const minha = p.user_id === user?.id;
                return (
                  <Card key={p.id} className={minha ? "border-primary" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold">{p.titulo}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-3 h-3 rounded-full" style={{ background: mem?.cor }} />
                            <span className="text-xs text-muted-foreground">{mem?.nome_exibicao}</span>
                            {minha && <Badge className="text-[10px]">A tua parte</Badge>}
                          </div>
                        </div>
                      </div>

                      {minha ? (
                        <>
                          <p className="text-sm whitespace-pre-wrap line-clamp-4 mb-3">{p.conteudo}</p>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => { setEditingPart(p); setEditContent(p.conteudo); }}>
                              Editar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleRegenerar(p)} disabled={aiBusy} className="gap-1">
                              <RefreshCcw className="w-3.5 h-3.5" /> Regenerar (10 cr)
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDefesa(p)} disabled={aiBusy} className="gap-1">
                              <Mic className="w-3.5 h-3.5" /> {p.defesa ? "Ver defesa" : "Gerar defesa"}
                            </Button>
                            {p.defesa && (
                              <Button size="sm" variant="ghost" onClick={() => setDefesaOpen(p)}>
                                Abrir defesa
                              </Button>
                            )}
                            <Button size="sm" onClick={() => exportPart(p, "word")} className="gap-1">
                              <Download className="w-3.5 h-3.5" /> Word
                            </Button>
                            <Button size="sm" onClick={() => exportPart(p, "pdf")} className="gap-1">
                              <Download className="w-3.5 h-3.5" /> PDF
                            </Button>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          🔒 Apenas {mem?.nome_exibicao} pode ver o conteúdo desta parte.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ─── DOCUMENTO FINAL ─── */}
        <TabsContent value="final">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-lg">Juntar todas as partes</h3>
                <p className="text-sm text-muted-foreground">
                  Cria o documento final unificado, sem cores, formatado e pronto a entregar.
                </p>
              </div>
              {parts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda não há partes para juntar.</p>
              ) : (
                <>
                  <div className="space-y-1 max-h-60 overflow-y-auto border rounded-lg p-3 bg-muted/30">
                    {parts.sort((a, b) => a.ordem - b.ordem).map((p, i) => (
                      <div key={p.id} className="text-sm">
                        <span className="font-mono text-muted-foreground">{i + 1}.</span> {p.titulo}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => exportFullDoc("word")} className="gap-2">
                      <Download className="w-4 h-4" /> Exportar Word
                    </Button>
                    <Button onClick={() => exportFullDoc("pdf")} className="gap-2" variant="outline">
                      <Download className="w-4 h-4" /> Exportar PDF
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Convidar */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar membro</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Email do utilizador (deve ter conta Delle)</Label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
            <p className="text-xs text-muted-foreground">
              O utilizador verá o convite na página /grupos. Vai pagar 20 créditos ao aceitar.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Enviar convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar parte */}
      <Dialog open={!!editingPart} onOpenChange={(o) => !o && setEditingPart(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar: {editingPart?.titulo}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={18}
            className="font-mono text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPart(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={savingPart}>
              {savingPart && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Defesa */}
      <Dialog open={!!defesaOpen} onOpenChange={(o) => !o && setDefesaOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Defesa: {defesaOpen?.titulo}</DialogTitle>
          </DialogHeader>
          {defesaOpen?.defesa ? (
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-1">Resumo</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{defesaOpen.defesa.resumo}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Pontos-chave</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {(defesaOpen.defesa.pontos_chave || []).map((p: string, i: number) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Possíveis perguntas</h4>
                <div className="space-y-2">
                  {(defesaOpen.defesa.perguntas || []).map((q: any, i: number) => (
                    <div key={i} className="border-l-2 border-primary pl-3">
                      <p className="font-medium">P: {q.q}</p>
                      <p className="text-muted-foreground">R: {q.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem defesa gerada ainda.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
