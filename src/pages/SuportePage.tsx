import { useEffect, useState } from "react";
import { LifeBuoy, Send, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface SupportMessage {
  id: string;
  assunto: string;
  mensagem: string;
  resposta: string | null;
  estado: string;
  criado_em: string;
}

const SuportePage = () => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");

  const fetchMessages = async () => {
    const { data } = await (supabase.from("support_messages") as any)
      .select("*")
      .order("criado_em", { ascending: false });
    if (data) setMessages(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel("support-updates")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "support_messages" }, (payload: any) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === payload.new.id ? (payload.new as SupportMessage) : m))
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assunto.trim() || !mensagem.trim()) return;

    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }

    const { error } = await (supabase.from("support_messages") as any).insert({
      user_id: user.id,
      assunto: assunto.trim(),
      mensagem: mensagem.trim(),
    });

    // Also create a notification for admin
    if (!error) {
      // Get user profile name
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("nome")
        .eq("id", user.id)
        .single();

      const nome = profile?.nome || user.email || "Utilizador";

      // Insert notification for admin visibility (admin can see all notifications)
      await (supabase.from("notifications") as any).insert({
        user_id: user.id, // stored as user's but admin can see all
        titulo: "Nova mensagem de suporte",
        mensagem: `${nome} enviou: "${assunto.trim()}"`,
        tipo: "info",
      });
    }

    setSending(false);
    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Mensagem enviada com sucesso!" });
      setAssunto("");
      setMensagem("");
      fetchMessages();
    }
  };

  const estadoBadge = (estado: string) => {
    if (estado === "respondido") return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Respondido</Badge>;
    return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">Aberto</Badge>;
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <LifeBuoy className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Suporte & Ajuda</h1>
      </div>

      {/* New message form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4" />
            Enviar Mensagem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Assunto da mensagem"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              required
            />
            <Textarea
              placeholder="Descreva o seu problema ou dúvida..."
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={4}
              required
            />
            <Button type="submit" disabled={sending} className="gap-2">
              <Send className="h-4 w-4" />
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Previous messages */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">As Minhas Mensagens</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : messages.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Ainda não enviou nenhuma mensagem.</p>
            </CardContent>
          </Card>
        ) : (
          messages.map((m) => (
            <Card key={m.id}>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{m.assunto}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(m.criado_em).toLocaleDateString("pt-AO", {
                        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {estadoBadge(m.estado)}
                </div>
                <p className="text-sm text-muted-foreground">{m.mensagem}</p>
                {m.resposta && (
                  <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                    <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Resposta da equipa
                    </p>
                    <p className="text-sm text-foreground">{m.resposta}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default SuportePage;
