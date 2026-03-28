import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, X, Users } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  criado_em: string;
}

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.lida).length;

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  };

  // Persistent AudioContext to avoid browser autoplay blocking
  const audioCtxRef = useState<AudioContext | null>(null);

  const ensureAudioContext = () => {
    if (!audioCtxRef[0]) {
      audioCtxRef[1](new AudioContext());
    }
    const ctx = audioCtxRef[0];
    if (ctx && ctx.state === "suspended") {
      ctx.resume();
    }
    return ctx;
  };

  // Resume audio context on any user interaction
  useEffect(() => {
    const handler = () => ensureAudioContext();
    document.addEventListener("click", handler, { once: true });
    document.addEventListener("keydown", handler, { once: true });
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("keydown", handler);
    };
  }, []);

  const playNotificationSound = () => {
    try {
      let ctx = audioCtxRef[0];
      if (!ctx) {
        ctx = new AudioContext();
        audioCtxRef[1](ctx);
      }
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.value = 0.3;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);

      // Second tone for attention
      setTimeout(() => {
        const osc2 = ctx!.createOscillator();
        const gain2 = ctx!.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx!.destination);
        osc2.frequency.value = 1100;
        osc2.type = "sine";
        gain2.gain.value = 0.25;
        osc2.start();
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx!.currentTime + 0.4);
        osc2.stop(ctx!.currentTime + 0.4);
      }, 200);
    } catch (e) {
      console.warn("Could not play notification sound:", e);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload: any) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          playNotificationSound();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ lida: true })
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    );
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.lida).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from("notifications")
      .update({ lida: true })
      .in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })));
  };

  // Extract workgroup_id from the notification message pattern
  const extractGroupInfo = (n: Notification) => {
    if (n.tipo !== "convite_grupo") return null;
    // We need to find the pending invite for this user
    return true;
  };

  const handleAcceptInvite = async (notificationId: string) => {
    if (!user) return;
    setProcessingInvite(notificationId);

    try {
      // Find pending invites for this user
      const { data: pending } = await supabase
        .from("workgroup_members")
        .select("workgroup_id")
        .eq("user_id", user.id)
        .eq("aceite", false);

      if (!pending || pending.length === 0) {
        toast({ title: "Convite já processado", variant: "destructive" });
        await markAsRead(notificationId);
        setProcessingInvite(null);
        return;
      }

      // Accept all pending (or match by notification message if multiple)
      // For simplicity, find the notification text to match the group
      const notification = notifications.find(n => n.id === notificationId);
      let targetWgId: string | null = null;

      if (notification) {
        // Try to match group name from message: "grupo "X""
        const match = notification.mensagem.match(/grupo "([^"]+)"/);
        if (match) {
          const groupName = match[1];
          const { data: wgs } = await supabase
            .from("workgroups")
            .select("id, nome")
            .eq("nome", groupName);
          
          if (wgs && wgs.length > 0) {
            const matchedWg = pending.find(p => wgs.some(w => w.id === p.workgroup_id));
            if (matchedWg) targetWgId = matchedWg.workgroup_id;
          }
        }
      }

      // Fallback: accept the first pending invite
      if (!targetWgId && pending.length > 0) {
        targetWgId = pending[0].workgroup_id;
      }

      if (targetWgId) {
        await supabase
          .from("workgroup_members")
          .update({ aceite: true })
          .eq("workgroup_id", targetWgId)
          .eq("user_id", user.id);

        await markAsRead(notificationId);
        toast({ title: "Convite aceite! Já tens acesso ao grupo." });
      }
    } catch (err) {
      toast({ title: "Erro ao aceitar convite", variant: "destructive" });
    }
    setProcessingInvite(null);
  };

  const handleRejectInvite = async (notificationId: string) => {
    if (!user) return;
    setProcessingInvite(notificationId);

    try {
      const notification = notifications.find(n => n.id === notificationId);
      let targetWgId: string | null = null;

      if (notification) {
        const match = notification.mensagem.match(/grupo "([^"]+)"/);
        if (match) {
          const groupName = match[1];
          const { data: wgs } = await supabase
            .from("workgroups")
            .select("id, nome")
            .eq("nome", groupName);

          if (wgs && wgs.length > 0) {
            const { data: pending } = await supabase
              .from("workgroup_members")
              .select("workgroup_id")
              .eq("user_id", user.id)
              .eq("aceite", false);

            if (pending) {
              const matchedWg = pending.find(p => wgs.some(w => w.id === p.workgroup_id));
              if (matchedWg) targetWgId = matchedWg.workgroup_id;
            }
          }
        }
      }

      if (!targetWgId) {
        const { data: pending } = await supabase
          .from("workgroup_members")
          .select("workgroup_id")
          .eq("user_id", user.id)
          .eq("aceite", false);
        if (pending && pending.length > 0) targetWgId = pending[0].workgroup_id;
      }

      if (targetWgId) {
        await supabase
          .from("workgroup_members")
          .delete()
          .eq("workgroup_id", targetWgId)
          .eq("user_id", user.id);
      }

      await markAsRead(notificationId);
      toast({ title: "Convite recusado" });
    } catch (err) {
      toast({ title: "Erro ao recusar convite", variant: "destructive" });
    }
    setProcessingInvite(null);
  };

  const tipoColors: Record<string, string> = {
    sucesso: "bg-emerald-500",
    info: "bg-blue-500",
    aviso: "bg-amber-500",
    erro: "bg-destructive",
    convite_grupo: "bg-violet-500",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-md hover:bg-muted transition-colors">
          <Bell className="h-4.5 w-4.5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-4.5 min-w-[18px] rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="text-sm font-semibold text-foreground">Notificações</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllAsRead}>
              <Check className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Sem notificações
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => {
                const isGroupInvite = n.tipo === "convite_grupo" && !n.lida;
                const isProcessing = processingInvite === n.id;

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (isGroupInvite) return;
                      const isSupportNotif = n.titulo.toLowerCase().includes("suporte") || n.titulo.toLowerCase().includes("mensagem");
                      if (isSupportNotif) {
                        markAsRead(n.id);
                        setOpen(false);
                        // Check if admin or user
                        const isAdminUser = user?.email === "kenymatos943@gmail.com" || user?.email === "manuelmatosjose67@gmail.com";
                        navigate(isAdminUser ? "/mensagens" : "/suporte");
                      } else {
                        markAsRead(n.id);
                      }
                    }}
                    className={`w-full text-left px-4 py-3 transition-colors cursor-pointer hover:bg-muted/50 ${
                      !n.lida ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                          n.lida ? "bg-transparent" : tipoColors[n.tipo] || "bg-primary"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {isGroupInvite && <Users className="h-3.5 w-3.5 text-violet-500 shrink-0" />}
                          <p className={`text-sm ${n.lida ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                            {n.titulo}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.mensagem}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {new Date(n.criado_em).toLocaleDateString("pt-AO", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>

                        {/* Accept / Reject buttons for group invites */}
                        {isGroupInvite && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              disabled={isProcessing}
                              onClick={() => handleRejectInvite(n.id)}
                            >
                              <X className="h-3 w-3" />
                              Recusar
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1"
                              disabled={isProcessing}
                              onClick={() => handleAcceptInvite(n.id)}
                            >
                              <Check className="h-3 w-3" />
                              Aceitar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
