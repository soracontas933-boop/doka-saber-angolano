import { useEffect, useState, useRef } from "react";
import { Bell, Trash2, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  user_id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  criado_em: string;
  dados?: Record<string, any>;
}

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);

  const fetchNotifications = async () => {
    if (!user || !mountedRef.current) return;

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("criado_em", { ascending: false })
      .limit(20);

    if (mountedRef.current && data) {
      setNotifications(data);
    }
  };

  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = 800;
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc1.start(now);
      osc1.stop(now + 0.2);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.value = 1000;
        gain2.gain.setValueAtTime(0.3, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.4);
      }, 200);
    } catch (e) {
      console.warn("Could not play notification sound:", e);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Configurar inscrição realtime com proteção contra duplicação
    let isSubscribed = true;
    const channelName = `user-notifications-${user.id}`;

    const setupChannel = async () => {
      // Aguardar um tick para evitar duplicação
      await new Promise(resolve => setTimeout(resolve, 0));
      
      if (!isSubscribed || !mountedRef.current) return;

      try {
        // Remover canal anterior se existir
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }

        channelRef.current = supabase
          .channel(channelName)
          .on(
            "postgres_changes",
            { 
              event: "INSERT", 
              schema: "public", 
              table: "notifications",
              filter: `user_id=eq.${user.id}`
            },
            (payload: any) => {
              if (isSubscribed && mountedRef.current) {
                const newNotif = payload.new as Notification;
                setNotifications((prev) => [newNotif, ...prev]);
                playNotificationSound();
              }
            }
          )
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              console.log("Notificações realtime ativas");
            }
          });
      } catch (err) {
        console.error("Erro ao configurar canal de notificações:", err);
      }
    };

    setupChannel();

    return () => {
      isSubscribed = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  // Limpar mountedRef ao desmontar
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const markAsRead = async (id: string) => {
    if (!mountedRef.current) return;
    
    await supabase
      .from("notifications")
      .update({ lida: true })
      .eq("id", id);
    
    if (mountedRef.current) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
      );
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.lida).map((n) => n.id);
    if (unreadIds.length === 0) return;

    if (!mountedRef.current) return;

    await supabase
      .from("notifications")
      .update({ lida: true })
      .in("id", unreadIds);

    if (mountedRef.current) {
      setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })));
    }
  };

  const deleteNotification = async (id: string) => {
    if (!mountedRef.current) return;

    await supabase.from("notifications").delete().eq("id", id);

    if (mountedRef.current) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleAcceptGroupInvite = async (notifId: string, groupId: string) => {
    if (!user || !mountedRef.current) return;

    try {
      await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: user.id,
        role: "member",
      });

      await deleteNotification(notifId);
    } catch (err) {
      console.error("Erro ao aceitar convite:", err);
    }
  };

  const handleRejectGroupInvite = async (notifId: string) => {
    if (!mountedRef.current) return;
    await deleteNotification(notifId);
  };

  const unreadCount = notifications.filter((n) => !n.lida).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground active:scale-90 transition-all">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar tudo como lido
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Sem notificações
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 hover:bg-secondary/50 transition-colors ${
                    !notif.lida ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {notif.titulo}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {notif.mensagem}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notif.criado_em).toLocaleDateString("pt-PT")}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="p-1 hover:bg-destructive/10 rounded text-destructive/60 hover:text-destructive transition-colors flex-shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {notif.tipo === "group_invite" && notif.dados?.group_id && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="text-xs h-7"
                        onClick={() =>
                          handleAcceptGroupInvite(
                            notif.id,
                            notif.dados.group_id
                          )
                        }
                      >
                        Aceitar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => handleRejectGroupInvite(notif.id)}
                      >
                        Rejeitar
                      </Button>
                    </div>
                  )}

                  {!notif.lida && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-6 mt-2 w-full"
                      onClick={() => markAsRead(notif.id)}
                    >
                      Marcar como lido
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
