import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Send, Loader2, RefreshCw, User, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface SupportMsg {
  id: string;
  user_id: string;
  assunto: string;
  mensagem: string;
  resposta: string | null;
  estado: string;
  criado_em: string;
  // joined
  user_nome?: string;
  user_email?: string;
}

const AdminMensagensPage = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: isLoadingAdmin, isAuthReady } = useAdmin();
  const [messages, setMessages] = useState<SupportMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isAuthReady && !isLoadingAdmin && !isAdmin) navigate("/meus-projetos");
  }, [isAdmin, isLoadingAdmin, isAuthReady, navigate]);

  const fetchMessages = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);

    // Get emails
    const { data: { session } } = await supabase.auth.getSession();
    let emailMap: Record<string, string> = {};
    if (session) {
      try {
        const res = await supabase.functions.invoke("admin-users", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.data?.emailMap) emailMap = res.data.emailMap;
      } catch {}
    }

    const [msgsRes, profilesRes] = await Promise.all([
      (supabase.from("support_messages") as any)
        .select("*")
        .order("criado_em", { ascending: false }),
      (supabase.from("profiles") as any).select("id, nome"),
    ]);

    const profiles = (profilesRes.data ?? []) as { id: string; nome: string | null }[];
    const nameMap: Record<string, string> = {};
    profiles.forEach((p) => { nameMap[p.id] = p.nome || "Sem nome"; });

    const msgs: SupportMsg[] = (msgsRes.data ?? []).map((m: any) => ({
      ...m,
      user_nome: nameMap[m.user_id] || "Desconhecido",
      user_email: emailMap[m.user_id] || "",
    }));

    setMessages(msgs);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin-support")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, () => {
        fetchMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMessages]);

  const handleReply = async (msg: SupportMsg) => {
    if (!replyText.trim()) return;
    setSending(true);

    const { error } = await (supabase.from("support_messages") as any)
      .update({
        resposta: replyText.trim(),
        estado: "respondido",
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", msg.id);

    if (!error) {
      // Notify user
      await (supabase.from("notifications") as any).insert({
        user_id: msg.user_id,
        titulo: "Resposta do suporte",
        mensagem: `A sua mensagem "${msg.assunto}" foi respondida.`,
        tipo: "sucesso",
      });
    }

    setSending(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Resposta enviada" });
      setReplyingId(null);
      setReplyText("");
      fetchMessages();
    }
  };

  if (isLoadingAdmin || !isAdmin || loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const openMessages = messages.filter((m) => m.estado === "aberto");
  const answeredMessages = messages.filter((m) => m.estado === "respondido");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Mensagens de Suporte</h1>
          {openMessages.length > 0 && (
            <Badge className="bg-destructive/15 text-destructive">{openMessages.length} pendente{openMessages.length > 1 ? "s" : ""}</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchMessages} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Nenhuma mensagem de suporte recebida.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Open first */}
          {openMessages.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pendentes</h2>
              {openMessages.map((m) => (
                <Card key={m.id} className="border-amber-500/30">
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">{m.assunto}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <User className="h-3 w-3" /> {m.user_nome} {m.user_email && `(${m.user_email})`}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(m.criado_em).toLocaleDateString("pt-AO", {
                            day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">Aberto</Badge>
                    </div>
                    <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">{m.mensagem}</p>

                    {replyingId === m.id ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Escreva a sua resposta..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleReply(m)} disabled={sending} className="gap-1">
                            <Send className="h-3 w-3" />
                            {sending ? "Enviando..." : "Enviar Resposta"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setReplyingId(null); setReplyText(""); }}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { setReplyingId(m.id); setReplyText(""); }} className="gap-1">
                        <Send className="h-3 w-3" />
                        Responder
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Answered */}
          {answeredMessages.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Respondidas</h2>
              {answeredMessages.map((m) => (
                <Card key={m.id} className="opacity-80">
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">{m.assunto}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <User className="h-3 w-3" /> {m.user_nome}
                        </p>
                      </div>
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Respondido
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{m.mensagem}</p>
                    {m.resposta && (
                      <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                        <p className="text-xs font-medium text-primary mb-1">Resposta:</p>
                        <p className="text-sm text-foreground">{m.resposta}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminMensagensPage;
