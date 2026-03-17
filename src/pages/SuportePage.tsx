import { useEffect, useState, useRef } from "react";
import { Send, Loader2, ArrowLeft, Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface SupportMessage {
  id: string;
  assunto: string;
  mensagem: string;
  resposta: string | null;
  estado: string;
  criado_em: string;
  atualizado_em: string;
}

interface ChatEntry {
  id: string;
  text: string;
  from: "user" | "admin";
  time: string;
  subject?: string;
}

const SuportePage = () => {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [isFirstMessage, setIsFirstMessage] = useState(false);
  const [assunto, setAssunto] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    const { data } = await (supabase.from("support_messages") as any)
      .select("*")
      .order("criado_em", { ascending: true });
    if (data) {
      setMessages(data);
      setIsFirstMessage(data.length === 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel("support-chat-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Convert support messages to chat entries
  const chatEntries: ChatEntry[] = [];
  messages.forEach((m) => {
    chatEntries.push({
      id: m.id + "-user",
      text: m.mensagem,
      from: "user",
      time: m.criado_em,
      subject: m.assunto,
    });
    if (m.resposta) {
      chatEntries.push({
        id: m.id + "-admin",
        text: m.resposta,
        from: "admin",
        time: m.atualizado_em,
      });
    }
  });

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("pt-AO", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Hoje";
    if (date.toDateString() === yesterday.toDateString()) return "Ontem";
    return date.toLocaleDateString("pt-AO", { day: "2-digit", month: "short", year: "numeric" });
  };

  const shouldShowDateSeparator = (index: number) => {
    if (index === 0) return true;
    const current = new Date(chatEntries[index].time).toDateString();
    const prev = new Date(chatEntries[index - 1].time).toDateString();
    return current !== prev;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (isFirstMessage && !assunto.trim()) {
      toast({ title: "Digite um assunto", variant: "destructive" });
      return;
    }

    setSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setSending(false); return; }

    const subject = isFirstMessage ? assunto.trim() : `Mensagem #${messages.length + 1}`;

    const { error } = await (supabase.from("support_messages") as any).insert({
      user_id: session.user.id,
      assunto: subject,
      mensagem: newMessage.trim(),
    });

    if (!error) {
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("nome")
        .eq("id", session.user.id)
        .single();

      const nome = profile?.nome || session.user.email || "Utilizador";

      await (supabase.from("notifications") as any).insert({
        user_id: session.user.id,
        titulo: "Nova mensagem de suporte",
        mensagem: `${nome} enviou: "${subject}"`,
        tipo: "info",
      });
    }

    setSending(false);
    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } else {
      setNewMessage("");
      setAssunto("");
      setIsFirstMessage(false);
      fetchMessages();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-3rem)] max-w-3xl mx-auto">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-primary/10 border-b border-border shrink-0">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
          <Headphones className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-foreground">Suporte Doka</h1>
          <p className="text-xs text-muted-foreground">Normalmente responde em minutos</p>
        </div>
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 bg-[hsl(var(--muted)/0.3)]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : chatEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Headphones className="h-8 w-8 text-primary/60" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Bem-vindo ao suporte!</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Envie sua primeira mensagem e a equipa Doka irá responder o mais rápido possível.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {chatEntries.map((entry, index) => (
              <div key={entry.id}>
                {shouldShowDateSeparator(index) && (
                  <div className="flex justify-center my-3">
                    <span className="text-[10px] bg-card/80 backdrop-blur-sm text-muted-foreground px-3 py-1 rounded-full shadow-sm border border-border/50">
                      {formatDateSeparator(entry.time)}
                    </span>
                  </div>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex mb-1.5 ${entry.from === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`relative max-w-[80%] sm:max-w-[70%] px-3 py-2 rounded-2xl shadow-sm ${
                      entry.from === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card text-card-foreground border border-border/50 rounded-bl-md"
                    }`}
                  >
                    {entry.from === "admin" && (
                      <p className="text-[10px] font-bold text-primary mb-0.5">Equipa Doka</p>
                    )}
                    {entry.subject && entry.from === "user" && (
                      <p className={`text-[10px] font-bold mb-0.5 ${entry.from === "user" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {entry.subject}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{entry.text}</p>
                    <p className={`text-[10px] mt-1 text-right ${
                      entry.from === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                    }`}>
                      {formatTime(entry.time)}
                      {entry.from === "user" && (
                        <span className="ml-1">✓✓</span>
                      )}
                    </p>
                  </div>
                </motion.div>
              </div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Subject input for first message */}
      <AnimatePresence>
        {(isFirstMessage || chatEntries.length === 0) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-card border-t border-border"
          >
            <div className="px-3 py-2">
              <Input
                placeholder="Assunto da conversa..."
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                className="h-8 text-xs bg-muted/50 border-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Input */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-2 px-3 py-2.5 bg-card border-t border-border shrink-0"
      >
        <Input
          placeholder="Digite uma mensagem..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 rounded-full bg-muted/50 border-none text-sm h-10 px-4"
          disabled={sending}
        />
        <Button
          type="submit"
          size="icon"
          disabled={sending || !newMessage.trim()}
          className="rounded-full h-10 w-10 shrink-0"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
};

export default SuportePage;
