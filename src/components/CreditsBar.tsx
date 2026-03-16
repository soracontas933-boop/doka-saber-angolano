import { useEffect, useState } from "react";
import { Zap, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DAILY_LIMIT = 20;

const CreditsBar = () => {
  const [usageToday, setUsageToday] = useState(0);
  const [plan] = useState("Gratuito");

  useEffect(() => {
    const fetchUsage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("criado_em", today.toISOString());

      setUsageToday(count || 0);
    };

    fetchUsage();

    const interval = setInterval(fetchUsage, 30000);
    return () => clearInterval(interval);
  }, []);

  const remaining = Math.max(0, DAILY_LIMIT - usageToday);
  const percentage = (usageToday / DAILY_LIMIT) * 100;

  return (
    <div className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 md:px-6 py-2 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Plano <span className="text-primary">{plan}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              <span className={remaining <= 3 ? "text-destructive font-bold" : "text-foreground font-semibold"}>
                {remaining}
              </span>
              /{DAILY_LIMIT} hoje
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditsBar;
