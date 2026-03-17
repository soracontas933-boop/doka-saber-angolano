import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const ADMIN_EMAILS = [
  "kenymatos943@gmail.com",
  "manuelmatosjose67@gmail.com",
];

const isMasterEmail = (email?: string | null) =>
  ADMIN_EMAILS.some(
    (admin) => (email ?? "").trim().toLowerCase() === admin.toLowerCase()
  );

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const checkAdmin = useCallback(async (user: User | null, mounted: { current: boolean }) => {
    if (!mounted.current) return;
    setIsAuthReady(true);
    
    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    const fallbackByEmail = isMasterEmail(user.email);

    // Set admin immediately if email matches, then confirm with RPC
    if (fallbackByEmail && mounted.current) {
      setIsAdmin(true);
      setIsLoading(false);
    }

    try {
      const { data: isAdminByFunction } = await supabase.rpc("is_admin");
      if (mounted.current) {
        setIsAdmin(Boolean(isAdminByFunction) || fallbackByEmail);
        setIsLoading(false);
      }
    } catch {
      // RPC failed, rely on email fallback
      if (mounted.current) {
        setIsAdmin(fallbackByEmail);
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const mounted = { current: true };

    const syncAdmin = async (user: User | null) => {
      await checkAdmin(user, mounted);
    };

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await syncAdmin(session?.user ?? null);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncAdmin(session?.user ?? null);
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [checkAdmin]);

  return { isAdmin, isLoading, isAuthReady };
};
