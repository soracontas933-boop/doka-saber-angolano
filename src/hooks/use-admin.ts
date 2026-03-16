import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const ADMIN_EMAIL = "kenymatos943@gmail.com";

const isMasterEmail = (email?: string | null) =>
  (email ?? "").trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdmin = useCallback(async (user: User | null, mounted: { current: boolean }) => {
    if (!user) {
      if (mounted.current) {
        setIsAdmin(false);
        setIsLoading(false);
      }
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

    // Use onAuthStateChange as the single source of truth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      checkAdmin(session?.user ?? null, mounted);
    });

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [checkAdmin]);

  return { isAdmin, isLoading };
};
