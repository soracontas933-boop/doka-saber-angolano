import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isCurrentlySubscribed,
} from "@/lib/push-notifications";

interface Props {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}

export function PushNotificationButton({
  variant = "outline",
  size = "default",
  className = "",
  showLabel = true,
}: Props) {
  const { user } = useAuth();
  const [supported, setSupported] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSupported(isPushSupported());
    setPermission(getNotificationPermission());
    isCurrentlySubscribed().then(setSubscribed);
  }, [user?.id]);

  if (!supported) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <BellOff className="h-4 w-4 mr-2" />
        {showLabel && "Não suportado"}
      </Button>
    );
  }

  const handleClick = async () => {
    if (!user) {
      toast.error("Faz login primeiro");
      return;
    }

    setLoading(true);
    try {
      if (subscribed) {
        const ok = await unsubscribeFromPush();
        if (ok) {
          setSubscribed(false);
          toast.success("Notificações desativadas");
        } else {
          toast.error("Não foi possível desativar");
        }
      } else {
        const result = await subscribeToPush(user.id);
        if (result.ok) {
          setSubscribed(true);
          setPermission("granted");
          toast.success("Notificações ativadas! Vais receber alertas no teu dispositivo.");
        } else if (result.error === "denied") {
          toast.error(
            "Permissão negada. Ativa as notificações nas definições do navegador."
          );
        } else if (result.error === "unsupported") {
          toast.error("O teu navegador não suporta notificações push.");
        } else {
          toast.error("Erro ao ativar notificações");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const Icon = subscribed ? BellRing : Bell;
  const label = subscribed ? "Notificações ativas" : "Ativar notificações";

  return (
    <Button
      onClick={handleClick}
      variant={subscribed ? "default" : variant}
      size={size}
      className={className}
      disabled={loading || permission === "unsupported"}
    >
      <Icon className="h-4 w-4 mr-2" />
      {showLabel && label}
    </Button>
  );
}
