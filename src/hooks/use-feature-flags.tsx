import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type GlobalMap = Record<string, boolean>;
type UserMap = Record<string, boolean>;

let cachedGlobal: GlobalMap | null = null;
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

async function loadGlobal() {
  const { data } = await supabase
    .from("feature_flags_global")
    .select("feature_key, enabled");
  const map: GlobalMap = {};
  (data || []).forEach((row: any) => {
    map[row.feature_key] = row.enabled;
  });
  cachedGlobal = map;
  notify();
}

export function useFeatureFlags() {
  const { user } = useAuth();
  const [globalFlags, setGlobalFlags] = useState<GlobalMap>(cachedGlobal || {});
  const [userFlags, setUserFlags] = useState<UserMap>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sub = () => setGlobalFlags({ ...(cachedGlobal || {}) });
    subscribers.add(sub);
    if (!cachedGlobal) loadGlobal();
    else sub();

    const channel = supabase
      .channel(`feature-flags-global-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feature_flags_global" },
        () => loadGlobal()
      )
      .subscribe();

    return () => {
      subscribers.delete(sub);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setUserFlags({});
      setLoaded(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("feature_flags_user")
        .select("feature_key, enabled")
        .eq("user_id", user.id);
      if (cancelled) return;
      const map: UserMap = {};
      (data || []).forEach((row: any) => {
        map[row.feature_key] = row.enabled;
      });
      setUserFlags(map);
      setLoaded(true);
    })();

    const channel = supabase
      .channel(`feature-flags-user-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "feature_flags_user",
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          const { data } = await supabase
            .from("feature_flags_user")
            .select("feature_key, enabled")
            .eq("user_id", user.id);
          const map: UserMap = {};
          (data || []).forEach((row: any) => {
            map[row.feature_key] = row.enabled;
          });
          setUserFlags(map);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const isFeatureEnabled = useCallback(
    (key?: string) => {
      if (!key) return true;
      if (key in userFlags) return userFlags[key];
      if (key in globalFlags) return globalFlags[key];
      return true; // default ON
    },
    [globalFlags, userFlags]
  );

  return { isFeatureEnabled, globalFlags, userFlags, loaded };
}
