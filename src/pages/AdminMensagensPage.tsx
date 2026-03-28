import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MessageSquare, Send, Loader2, Search, User, ArrowLeft, Plus, Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

interface Conversation {
  id: string;
  user_id: string;
  assunto: string;
  estado: string;
  criado_em: string;
  atualizado_em: string;
  user_nome?: string;
  user_email?: string;
  last_message?: string;
  unread?: boolean;
}

interface UserGroup {
  user_id: string;
  user_nome: string;
  user_email: string;
  conversations: Conversation[];
  latest_update: string;
  has_open: boolean;
}

interface ChatMsg {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface UserOption {
  id: string;
  nome: string;
  email: string;
}

const AdminMensagensPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, isLoading: isLoadingAdmin, isAuthReady } = useAdmin();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [selectedUserGroup, setSelectedUserGroup] = useState<UserGroup | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [newChatSubject, setNewChatSubject] = useState("");
  const [newChatMessage, setNewChatMessage] = useState("");
  const [creatingSending, setCreatingSending] = useState(false);
  const [adminId, setAdminId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  useEffect(() => {
    if (isAuthReady && !isLoadingAdmin && !isAdmin) navigate("/meus-projetos");
  }, [isAdmin, isLoadingAdmin, isAuthReady, navigate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAdminId(session.user.id);
    });
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const fetchConversations = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);

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
        .order("atualizado_em", { ascending: false }),
      (supabase.from("profiles") as any).select("id, nome"),
    ]);

    const profiles = (profilesRes.data ?? []) as { id: string; nome: string | null }[];
    const nameMap: Record<string, string> = {};
    profiles.forEach((p) => { nameMap[p.id] = p.nome || "Sem nome"; });

    const convos: Conversation[] = (msgsRes.data ?? []).map((m: any) => ({
      ...m,
      user_nome: nameMap[m.user_id] || "Desconhecido",
      user_email: emailMap[m.user_id] || "",
    }));

    setConversations(convos);
    setLoading(false);

    // Auto-select from URL param
    const convoId = searchParams.get("conversa");
    if (convoId) {
      const target = convos.find(c => c.id === convoId);
      if (target) {
        // Find or create user group for this conversation
        const userConvos = convos.filter(c => c.user_id === target.user_id);
        const group: UserGroup = {
          user_id: target.user_id,
          user_nome: target.user_nome || "Desconhecido",
          user_email: target.user_email || "",
          conversations: userConvos,
          latest_update: userConvos[0]?.atualizado_em || "",
          has_open: userConvos.some(c => c.estado === "aberto"),
        };
        setSelectedUserGroup(group);
        setSelectedConvo(target);
        setMobileShowChat(true);
      }
    }
  }, [isAdmin, searchParams]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Realtime for new conversations
  useEffect(() => {
    const channel = supabase
      .channel("admin-support-convos")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchConversations]);

  // Fetch all chat messages for a user (across all their conversations)
  const fetchUserMessages = useCallback(async (userGroup: UserGroup) => {
    setChatLoading(true);
    const convoIds = userGroup.conversations.map(c => c.id);
    const { data } = await (supabase.from("chat_messages") as any)
      .select("*")
      .in("conversation_id", convoIds)
      .order("created_at", { ascending: true });
    setChatMessages(data ?? []);
    setChatLoading(false);
    scrollToBottom();
  }, []);

  useEffect(() => {
    if (selectedUserGroup) {
      fetchUserMessages(selectedUserGroup);
    }
  }, [selectedUserGroup, fetchUserMessages]);

  // Realtime for chat messages (listen to all convos of selected user)
  useEffect(() => {
    if (!selectedUserGroup) return;
    const channels = selectedUserGroup.conversations.map(c =>
      supabase
        .channel(`chat-${c.id}`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "chat_messages",
          filter: `conversation_id=eq.${c.id}`
        }, (payload: any) => {
          setChatMessages(prev => [...prev, payload.new as ChatMsg]);
          scrollToBottom();
        })
        .subscribe()
    );
    return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
  }, [selectedUserGroup]);

  const handleSelectUser = (group: UserGroup) => {
    setSelectedUserGroup(group);
    setSelectedConvo(group.conversations[0] || null);
    setMobileShowChat(true);
    setSearchParams({ conversa: group.conversations[0]?.id || "" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConvo || !adminId) return;
    setSending(true);

    const { error } = await (supabase.from("chat_messages") as any).insert({
      conversation_id: selectedConvo.id,
      sender_id: adminId,
      content: newMessage.trim(),
    });

    if (!error) {
      // Update conversation timestamp
      await (supabase.from("support_messages") as any)
        .update({ atualizado_em: new Date().toISOString(), estado: "respondido" })
        .eq("id", selectedConvo.id);

      // Notify user
      await (supabase.from("notifications") as any).insert({
        user_id: selectedConvo.user_id,
        titulo: "Nova mensagem do suporte",
        mensagem: `Resposta em "${selectedConvo.assunto}"`,
        tipo: "sucesso",
      });

      setNewMessage("");
    } else {
      toast({ title: "Erro ao enviar", variant: "destructive" });
    }
    setSending(false);
  };

  // New conversation
  const fetchUsers = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const res = await supabase.functions.invoke("admin-users", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.data?.users) {
        const mapped = (res.data.users as any[]).map(u => ({
          id: u.id,
          nome: u.nome || "Sem nome",
          email: u.email || "",
        }));
        setUsers(mapped);
      }
    } catch {}
  };

  const handleStartConversation = async (userId: string) => {
    if (!newChatSubject.trim() || !newChatMessage.trim() || !adminId) return;
    setCreatingSending(true);

    // Create the conversation
    const { data: convo, error } = await (supabase.from("support_messages") as any)
      .insert({
        user_id: userId,
        assunto: newChatSubject.trim(),
        mensagem: newChatMessage.trim(),
        estado: "aberto",
      })
      .select()
      .single();

    if (!error && convo) {
      // Add admin's first message to chat_messages
      await (supabase.from("chat_messages") as any).insert({
        conversation_id: convo.id,
        sender_id: adminId,
        content: newChatMessage.trim(),
      });

      // Notify user
      await (supabase.from("notifications") as any).insert({
        user_id: userId,
        titulo: "Nova mensagem do suporte",
        mensagem: `Assunto: "${newChatSubject.trim()}"`,
        tipo: "info",
      });

      setShowNewChat(false);
      setNewChatSubject("");
      setNewChatMessage("");
      setUserSearch("");
      fetchConversations();
      toast({ title: "Conversa iniciada" });
    } else {
      toast({ title: "Erro", description: error?.message, variant: "destructive" });
    }
    setCreatingSending(false);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" });
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

  const shouldShowDateSeparator = (msgs: ChatMsg[], index: number) => {
    if (index === 0) return true;
    return new Date(msgs[index].created_at).toDateString() !== new Date(msgs[index - 1].created_at).toDateString();
  };

  const formatConvoTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("pt-AO", { day: "2-digit", month: "short" });
  };

  // Group conversations by user
  const userGroups: UserGroup[] = (() => {
    const grouped: Record<string, Conversation[]> = {};
    const filtered = conversations.filter(c =>
      !searchQuery || 
      c.assunto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.user_nome || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.user_email || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
    filtered.forEach(c => {
      if (!grouped[c.user_id]) grouped[c.user_id] = [];
      grouped[c.user_id].push(c);
    });
    return Object.entries(grouped).map(([uid, convos]) => ({
      user_id: uid,
      user_nome: convos[0].user_nome || "Desconhecido",
      user_email: convos[0].user_email || "",
      conversations: convos,
      latest_update: convos[0].atualizado_em,
      has_open: convos.some(c => c.estado === "aberto"),
    })).sort((a, b) => new Date(b.latest_update).getTime() - new Date(a.latest_update).getTime());
  })();

  const filteredUsers = users.filter(u =>
    !userSearch ||
    u.nome.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (isLoadingAdmin || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-3rem)] overflow-hidden rounded-xl border border-border bg-card">
      {/* Left: Conversation List */}
      <div className={`${mobileShowChat ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 lg:w-96 border-r border-border`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-bold text-foreground">Mensagens</h1>
            {conversations.filter(c => c.estado === "aberto").length > 0 && (
              <Badge className="bg-destructive/15 text-destructive text-[10px] px-1.5">
                {conversations.filter(c => c.estado === "aberto").length}
              </Badge>
            )}
          </div>
          <Dialog open={showNewChat} onOpenChange={(open) => {
            setShowNewChat(open);
            if (open) fetchUsers();
          }}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Conversa</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Pesquisar utilizador..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <ScrollArea className="h-40 border rounded-lg">
                  {filteredUsers.map(u => (
                    <button
                      key={u.id}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                      onClick={() => setUserSearch(u.email)}
                    >
                      <p className="text-sm font-medium text-foreground">{u.nome}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </button>
                  ))}
                </ScrollArea>
                <Input
                  placeholder="Assunto..."
                  value={newChatSubject}
                  onChange={(e) => setNewChatSubject(e.target.value)}
                />
                <Input
                  placeholder="Mensagem inicial..."
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                />
                <Button
                  className="w-full"
                  disabled={creatingSending || !newChatSubject.trim() || !newChatMessage.trim()}
                  onClick={() => {
                    const target = users.find(u => u.email === userSearch);
                    if (target) handleStartConversation(target.id);
                    else toast({ title: "Seleccione um utilizador", variant: "destructive" });
                  }}
                >
                  {creatingSending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Iniciar Conversa
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Pesquisar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs bg-muted/50 border-none"
            />
          </div>
        </div>

        {/* Conversations */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : userGroups.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground">
              Nenhuma conversa encontrada
            </div>
          ) : (
            userGroups.map(group => (
              <button
                key={group.user_id}
                onClick={() => handleSelectUser(group)}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-border/50 transition-colors hover:bg-muted/50 ${
                  selectedUserGroup?.user_id === group.user_id ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 shrink-0 mt-0.5">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-medium text-foreground truncate">{group.user_nome}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatConvoTime(group.latest_update)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {group.conversations.length} conversa{group.conversations.length > 1 ? "s" : ""} · {group.conversations[0]?.assunto}
                  </p>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate">{group.user_email}</p>
                    {group.has_open && (
                      <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1 shrink-0">!</span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Right: Chat Area */}
      <div className={`${!mobileShowChat ? "hidden md:flex" : "flex"} flex-col flex-1`}>
        {selectedConvo ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-primary/5 shrink-0">
              <button
                className="md:hidden p-1 rounded hover:bg-muted"
                onClick={() => { setMobileShowChat(false); setSelectedConvo(null); }}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{selectedConvo.user_nome}</p>
                <p className="text-xs text-muted-foreground truncate">{selectedConvo.assunto}</p>
              </div>
              <Badge className={selectedConvo.estado === "aberto"
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              }>
                {selectedConvo.estado === "aberto" ? "Aberto" : "Respondido"}
              </Badge>
            </div>

            {/* Messages */}
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
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <p className="text-xs text-muted-foreground">Nenhuma mensagem ainda. Envie a primeira!</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {chatMessages.map((msg, index) => {
                    const isAdmin = msg.sender_id === adminId;
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
                          className={`flex ${sameSenderAsPrev ? "mb-0.5" : "mb-1.5"} ${isAdmin ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`relative max-w-[80%] sm:max-w-[70%] px-3 py-2 rounded-2xl shadow-sm ${
                            isAdmin
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-card text-card-foreground border border-border/50 rounded-bl-md"
                          }`}>
                            {!isAdmin && !sameSenderAsPrev && (
                              <p className="text-[10px] font-bold text-primary mb-0.5">{selectedConvo.user_nome}</p>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                            <p className={`text-[10px] mt-1 text-right ${isAdmin ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              {formatTime(msg.created_at)}
                              {isAdmin && <span className="ml-1">✓✓</span>}
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

            {/* Input */}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 px-3 py-2.5 bg-card border-t border-border shrink-0">
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
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Headphones className="h-10 w-10 text-primary/40" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Mensagens de Suporte</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Seleccione uma conversa ou inicie uma nova para comunicar com os utilizadores.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMensagensPage;
