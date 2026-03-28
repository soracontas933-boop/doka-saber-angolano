import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Send, Loader2, Headphones, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface SupportConvo {
  id: string;
  assunto: string;
  estado: string;
  criado_em: string;
  atualizado_em: string;
}

interface ChatMsg {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const SuportePage = () => {
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<SupportConvo[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<SupportConvo | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newFirstMsg, setNewFirstMsg] = useState("");
  const [userId, setUserId] = useState("");
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id);
    });
  }, []);

  const fetchConversations = useCallback(async () => {
    const { data } = await (supabase.from("support_messages") as any)
      .select("*")
      .order("atualizado_em", { ascending: false });
    if (data) {
      setConversations(data);
      // Auto-select from URL
      const convoId = searchParams.get("conversa");
      if (convoId) {
        const target = data.find((c: any) => c.id === convoId);
        if (target) {
          setSelectedConvo(target);
          setMobileShowChat(true);
        }
      }
    }
    setLoading(false);
  }, [searchParams]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Realtime for conversations
  useEffect(() => {
    const ch = supabase
      .channel("user-support-convos")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchConversations]);

  // Fetch chat messages
  const fetchChatMessages = useCallback(async (convoId: string) => {
    setChatLoading(true);
    const { data } = await (supabase.from("chat_messages") as any)
      .select("*")
      .eq("conversation_id", convoId)
      .order("created_at", { ascending: true });
    setChatMessages(data ?? []);
    setChatLoading(false);
    scrollToBottom();
  }, []);

  useEffect(() => {
    if (selectedConvo) fetchChatMessages(selectedConvo.id);
  }, [selectedConvo, fetchChatMessages]);

  // Realtime for messages
  useEffect(() => {
    if (!selectedConvo) return;
    const ch = supabase
      .channel(`user-chat-${selectedConvo.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "chat_messages",
        filter: `conversation_id=eq.${selectedConvo.id}`
      }, (payload: any) => {
        setChatMessages(prev => [...prev, payload.new as ChatMsg]);
        scrollToBottom();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedConvo]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConvo || !userId) return;
    setSending(true);

    const { error } = await (supabase.from("chat_messages") as any).insert({
      conversation_id: selectedConvo.id,
      sender_id: userId,
      content: newMessage.trim(),
    });

    if (!error) {
      await (supabase.from("support_messages") as any)
        .update({ atualizado_em: new Date().toISOString(), estado: "aberto" })
        .eq("id", selectedConvo.id);

      // Notify admin
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("nome")
        .eq("id", userId)
        .single();
      const nome = profile?.nome || "Utilizador";
      await (supabase.from("notifications") as any).insert({
        user_id: userId,
        titulo: "Nova mensagem de suporte",
        mensagem: `${nome} enviou mensagem em "${selectedConvo.assunto}"`,
        tipo: "info",
      });

      setNewMessage("");
    } else {
      toast({ title: "Erro ao enviar", variant: "destructive" });
    }
    setSending(false);
  };

  const handleCreateConversation = async () => {
    if (!newSubject.trim() || !newFirstMsg.trim() || !userId) return;
    setSending(true);

    const { data: convo, error } = await (supabase.from("support_messages") as any)
      .insert({
        user_id: userId,
        assunto: newSubject.trim(),
        mensagem: newFirstMsg.trim(),
      })
      .select()
      .single();

    if (!error && convo) {
      await (supabase.from("chat_messages") as any).insert({
        conversation_id: convo.id,
        sender_id: userId,
        content: newFirstMsg.trim(),
      });

      // Notify admin
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("nome")
        .eq("id", userId)
        .single();
      const nome = profile?.nome || "Utilizador";
      await (supabase.from("notifications") as any).insert({
        user_id: userId,
        titulo: "Nova mensagem de suporte",
        mensagem: `${nome} enviou: "${newSubject.trim()}"`,
        tipo: "info",
      });

      setNewSubject("");
      setNewFirstMsg("");
      setShowNewForm(false);
      setSelectedConvo(convo);
      setMobileShowChat(true);
      fetchConversations();
    } else {
      toast({ title: "Erro", variant: "destructive" });
    }
    setSending(false);
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" });

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Hoje";
    if (date.toDateString() === yesterday.toDateString()) return "Ontem";
    return date.toLocaleDateString("pt-AO", { day: "2-digit", month: "short", year: "numeric" });
  };

  const shouldShowDateSeparator = (msgs: ChatMsg[], index: number) => {
    if (index === 0) return true;
    return new Date(msgs[index].created_at).toDateString() !== new Date(msgs[index - 1].created_at).toDateString();
  };

  const formatConvoTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString())
      return date.toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString("pt-AO", { day: "2-digit", month: "short" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-3rem)] max-w-4xl mx-auto overflow-hidden rounded-xl border border-border bg-card">
      {/* Left: Conversations */}
      <div className={`${mobileShowChat ? "hidden md:flex" : "flex"} flex-col w-full md:w-72 lg:w-80 border-r border-border`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-bold text-foreground">Suporte</h1>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowNewForm(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* New conversation form */}
        <AnimatePresence>
          {showNewForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-border"
            >
              <div className="p-3 space-y-2">
                <Input
                  placeholder="Assunto..."
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Primeira mensagem..."
                  value={newFirstMsg}
                  onChange={(e) => setNewFirstMsg(e.target.value)}
                  className="h-8 text-xs"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleCreateConversation} disabled={sending}>
                    <Send className="h-3 w-3 mr-1" /> Enviar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNewForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground">
              <Headphones className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Nenhuma conversa. Inicie uma!</p>
            </div>
          ) : (
            conversations.map(c => (
              <button
                key={c.id}
                onClick={() => { setSelectedConvo(c); setMobileShowChat(true); }}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-border/50 transition-colors hover:bg-muted/50 ${
                  selectedConvo?.id === c.id ? "bg-primary/5" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Headphones className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground truncate">{c.assunto}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatConvoTime(c.atualizado_em)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.estado === "respondido" ? "✓ Respondido" : "Aguardando..."}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Chat */}
      <div className={`${!mobileShowChat ? "hidden md:flex" : "flex"} flex-col flex-1`}>
        {selectedConvo ? (
          <>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-primary/5 shrink-0">
              <button className="md:hidden p-1" onClick={() => { setMobileShowChat(false); setSelectedConvo(null); }}>
                <Send className="h-5 w-5 rotate-180" />
              </button>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Headphones className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">Equipa Delle</p>
                <p className="text-xs text-muted-foreground truncate">{selectedConvo.assunto}</p>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
            </div>

            <div
              className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              }}
            >
              {chatLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-xs text-muted-foreground">Envie a sua primeira mensagem!</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {chatMessages.map((msg, index) => {
                    const isMine = msg.sender_id === userId;
                    const prevMsg = index > 0 ? chatMessages[index - 1] : null;
                    const sameSenderAsPrev = prevMsg && prevMsg.sender_id === msg.sender_id && !shouldShowDateSeparator(chatMessages, index);
                    return (
                      <div key={msg.id}>
                        {shouldShowDateSeparator(chatMessages, index) && (
                          <div className="flex justify-center my-3">
                            <span className="text-[10px] bg-card/80 backdrop-blur-sm text-muted-foreground px-3 py-1 rounded-full shadow-sm border border-border/50">
                              {formatDateSeparator(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.2 }}
                          className={`flex ${sameSenderAsPrev ? "mb-0.5" : "mb-1.5"} ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`relative max-w-[80%] sm:max-w-[70%] px-3 py-2 rounded-2xl shadow-sm ${
                            isMine
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-card text-card-foreground border border-border/50 rounded-bl-md"
                          }`}>
                            {!isMine && !sameSenderAsPrev && (
                              <p className="text-[10px] font-bold text-primary mb-0.5">Equipa Delle</p>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                            <p className={`text-[10px] mt-1 text-right ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              {formatTime(msg.created_at)}
                              {isMine && <span className="ml-1">✓✓</span>}
                            </p>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </AnimatePresence>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-2.5 bg-card border-t border-border shrink-0">
              <Input
                placeholder="Digite uma mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 rounded-full bg-muted/50 border-none text-sm h-10 px-4"
                disabled={sending}
              />
              <Button type="submit" size="icon" disabled={sending || !newMessage.trim()} className="rounded-full h-10 w-10 shrink-0">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Headphones className="h-8 w-8 text-primary/60" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Bem-vindo ao suporte!</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Seleccione uma conversa ou crie uma nova para falar com a equipa.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuportePage;
