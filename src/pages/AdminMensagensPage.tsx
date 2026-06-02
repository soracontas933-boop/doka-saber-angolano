import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MessageSquare, Send, Loader2, Search, User, ArrowLeft, Plus, Headphones, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { fetchAdminUsers } from "@/lib/admin-api";

interface Conversation {
  id: string;
  user_id: string;
  assunto: string;
  mensagem: string;
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
  telefone: string;
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userSearching, setUserSearching] = useState(false);
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
    }));

    setConversations(convos);
    setLoading(false);

    setSelectedUserGroup(prev => {
      if (!prev) {
        const convoId = searchParams.get("conversa");
        if (convoId) {
          const target = convos.find(c => c.id === convoId);
          if (target) {
            const userConvos = convos.filter(c => c.user_id === target.user_id);
            setSelectedConvo(target);
            setMobileShowChat(true);
            return {
              user_id: target.user_id,
              user_nome: target.user_nome || "Desconhecido",
              user_email: target.user_email || "",
              conversations: userConvos,
              latest_update: userConvos[0]?.atualizado_em || "",
              has_open: userConvos.some(c => c.estado === "aberto"),
            };
          }
        }
        return null;
      }
      const userConvos = convos.filter(c => c.user_id === prev.user_id);
      if (userConvos.length === 0) return prev;
      return {
        ...prev,
        conversations: userConvos,
        user_nome: userConvos[0].user_nome || prev.user_nome,
        user_email: userConvos[0].user_email || prev.user_email,
        latest_update: userConvos[0]?.atualizado_em || prev.latest_update,
        has_open: userConvos.some(c => c.estado === "aberto"),
      };
    });
  }, [isAdmin, searchParams]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-support-convos")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, () => {
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchConversations]);

  const fetchUserMessages = useCallback(async (userGroup: UserGroup) => {
    setChatLoading(true);
    const convoIds = userGroup.conversations.map(c => c.id);
    const { data } = await (supabase.from("chat_messages") as any)
      .select("*")
      .in("conversation_id", convoIds)
      .order("created_at", { ascending: true });

    const dbMessages = (data ?? []) as ChatMsg[];

    const initialMessages: ChatMsg[] = userGroup.conversations
      .filter((convo) => {
        const initialContent = (convo.mensagem || "").trim();
        if (!initialContent) return false;
        return !dbMessages.some(
          (msg) =>
            msg.conversation_id === convo.id &&
            msg.sender_id === convo.user_id &&
            msg.content.trim() === initialContent,
        );
      })
      .map((convo) => ({
        id: `initial-${convo.id}`,
        conversation_id: convo.id,
        sender_id: convo.user_id,
        content: convo.mensagem,
        created_at: convo.criado_em,
      }));

    const mergedMessages = [...dbMessages, ...initialMessages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    setChatMessages(mergedMessages);
    setChatLoading(false);
    scrollToBottom();
  }, []);

  useEffect(() => {
    if (selectedUserGroup) {
      fetchUserMessages(selectedUserGroup);
    }
  }, [selectedUserGroup, fetchUserMessages]);

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
    if (!newMessage.trim() || !selectedUserGroup || !adminId) return;
    setSending(true);

    const targetConvo =
      (selectedConvo && selectedUserGroup.conversations.some((c) => c.id === selectedConvo.id)
        ? selectedConvo
        : null) ||
      selectedUserGroup.conversations.find((c) => c.estado === "aberto") ||
      selectedUserGroup.conversations[0];

    if (!targetConvo) {
      setSending(false);
      return;
    }

    const { error } = await (supabase.from("chat_messages") as any).insert({
      conversation_id: targetConvo.id,
      sender_id: adminId,
      content: newMessage.trim(),
    });

    if (!error) {
      await (supabase.from("support_messages") as any)
        .update({
          atualizado_em: new Date().toISOString(),
          estado: "respondido",
        })
        .eq("id", targetConvo.id);

      await (supabase.from("notifications") as any).insert({
        user_id: selectedUserGroup.user_id,
        titulo: "Nova mensagem do suporte",
        mensagem: `Resposta em "${targetConvo.assunto}"`,
        tipo: "sucesso",
      });

      setNewMessage("");
    } else {
      toast({ title: "Erro ao enviar", variant: "destructive" });
    }
    setSending(false);
  };

  const handleUserSearch = async (query: string) => {
    setUserSearch(query);
    if (query.length < 3) {
      setUsers([]);
      return;
    }
    setUserSearching(true);
    try {
      const res = await fetchAdminUsers(1, 10, query);
      setUsers(res.users.map(u => ({
        id: u.id,
        nome: u.nome || "Sem nome",
        email: u.email,
        telefone: u.telefone
      })));
    } catch (err) {
      console.error(err);
    } finally {
      setUserSearching(false);
    }
  };

  const handleStartConversation = async (userId: string) => {
    if (!newChatSubject.trim() || !newChatMessage.trim() || !adminId) return;
    setCreatingSending(true);

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
      await (supabase.from("chat_messages") as any).insert({
        conversation_id: convo.id,
        sender_id: adminId,
        content: newChatMessage.trim(),
      });

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
      setSelectedUserId(null);
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

  const userGroups: UserGroup[] = (() => {
    const grouped: Record<string, Conversation[]> = {};
    const filtered = conversations.filter(c =>
      !searchQuery || 
      c.assunto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.user_nome || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
    filtered.forEach(c => {
      if (!grouped[c.user_id]) grouped[c.user_id] = [];
      grouped[c.user_id].push(c);
    });
    return Object.entries(grouped).map(([uid, convos]) => ({
      user_id: uid,
      user_nome: convos[0].user_nome || "Desconhecido",
      user_email: "", // Not available in the simple group
      conversations: convos,
      latest_update: convos[0].atualizado_em,
      has_open: convos.some(c => c.estado === "aberto"),
    })).sort((a, b) => new Date(b.latest_update).getTime() - new Date(a.latest_update).getTime());
  })();

  if (isLoadingAdmin || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Sidebar - User Groups List */}
      <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-border bg-card ${mobileShowChat ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Headphones className="h-5 w-5 text-primary" />
              Suporte
            </h1>
            <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="rounded-full" onClick={() => { setUsers([]); setUserSearch(""); setSelectedUserId(null); }}>
                  <Plus className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Nova Conversa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Procurar utilizador..."
                      value={userSearch}
                      onChange={(e) => handleUserSearch(e.target.value)}
                      className="pl-9"
                    />
                    {userSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                  </div>

                  {users.length > 0 && (
                    <ScrollArea className="h-40 border rounded-md">
                      {users.map(u => (
                        <button
                          key={u.id}
                          onClick={() => { 
                            setUserSearch(u.nome + " (" + u.email + ")"); 
                            setSelectedUserId(u.id);
                            setUsers([]); 
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-0"
                        >
                          <p className="font-medium">{u.nome}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </button>
                      ))}
                    </ScrollArea>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Assunto</label>
                    <Input
                      placeholder="Ex: Atualização de Plano"
                      value={newChatSubject}
                      onChange={(e) => setNewChatSubject(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mensagem Inicial</label>
                    <Input
                      placeholder="Escreva a sua mensagem..."
                      value={newChatMessage}
                      onChange={(e) => setNewChatMessage(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    className="w-full" 
                    disabled={creatingSending || !newChatSubject.trim() || !newChatMessage.trim() || !selectedUserId}
                    onClick={() => selectedUserId && handleStartConversation(selectedUserId)}
                  >
                    {creatingSending ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Enviando...</>
                    ) : (
                      <><Send className="h-4 w-4 mr-2" /> Enviar Mensagem</>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Procurar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-none h-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : userGroups.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhuma conversa encontrada.</div>
          ) : (
            <div className="divide-y divide-border/50">
              {userGroups.map((group) => (
                <button
                  key={group.user_id}
                  onClick={() => handleSelectUser(group)}
                  className={`w-full text-left p-4 transition-colors hover:bg-muted/50 relative ${
                    selectedUserGroup?.user_id === group.user_id ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className="font-semibold text-sm truncate">{group.user_nome}</h3>
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(group.latest_update)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mb-1">
                        {group.conversations[0].assunto}
                      </p>
                      <div className="flex items-center gap-2">
                        {group.has_open && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] h-4 px-1.5">Aberto</Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">{group.conversations.length} {group.conversations.length === 1 ? "conversa" : "conversas"}</Badge>
                      </div>
                    </div>
                  </div>
                  {selectedUserGroup?.user_id === group.user_id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-muted/20 ${!mobileShowChat ? "hidden md:flex" : "flex"}`}>
        {selectedUserGroup ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-card border-b border-border flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileShowChat(false)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-sm">{selectedUserGroup.user_nome}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{selectedUserGroup.user_id}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedConvo?.id}
                  onValueChange={(id) => {
                    const c = selectedUserGroup.conversations.find(x => x.id === id);
                    if (c) setSelectedConvo(c);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs min-w-[150px] bg-muted/50 border-none">
                    <SelectValue placeholder="Escolher conversa" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedUserGroup.conversations.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.assunto} ({c.estado})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6 max-w-4xl mx-auto">
                {chatLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : chatMessages.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">Nenhuma mensagem nesta conversa.</div>
                ) : (
                  chatMessages.map((msg, i) => {
                    const isAdminMsg = msg.sender_id === adminId;
                    return (
                      <div key={msg.id}>
                        {shouldShowDateSeparator(chatMessages, i) && (
                          <div className="flex justify-center my-4">
                            <span className="text-[10px] bg-muted px-2 py-1 rounded-full text-muted-foreground uppercase tracking-wider font-medium">
                              {formatDateSeparator(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isAdminMsg ? "justify-end" : "justify-start"} group`}>
                          <div className={`max-w-[85%] md:max-w-[70%] space-y-1`}>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                              isAdminMsg 
                                ? "bg-primary text-primary-foreground rounded-tr-none" 
                                : "bg-card border border-border rounded-tl-none"
                            }`}>
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            </div>
                            <div className={`flex items-center gap-2 px-1 ${isAdminMsg ? "justify-end" : "justify-start"}`}>
                              <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                {formatTime(msg.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-card border-t border-border shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
              <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-end gap-2">
                <div className="flex-1 bg-muted/50 rounded-2xl px-4 py-2 flex items-end min-h-[44px]">
                  <textarea
                    className="w-full bg-transparent border-none focus:ring-0 text-sm py-1.5 resize-none max-h-32"
                    placeholder="Escreva a sua resposta..."
                    rows={1}
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = e.target.scrollHeight + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                </div>
                <Button 
                  type="submit" 
                  size="icon" 
                  className="rounded-full h-11 w-11 shrink-0 shadow-md"
                  disabled={!newMessage.trim() || sending}
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Seleccione uma conversa</h2>
              <p className="text-sm max-w-xs mx-auto">Escolha um utilizador na lista lateral para ver o histórico de mensagens e responder ao suporte.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMensagensPage;
