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
  const [isOriginalMaster, setIsOriginalMaster] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const checkAdmin = useCallback(async (user: User | null, mounted: { current: boolean }) => {
    if (!mounted.current) return;
    setIsAuthReady(true);
    
    if (!user) {
      setIsAdmin(false);
      setIsOriginalMaster(false);
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    const isOriginal = isMasterEmail(user.email);
    if (mounted.current) setIsOriginalMaster(isOriginal);

    // Set admin immediately if email matches
    if (isOriginal && mounted.current) {
      setIsAdmin(true);
      setPermissions(["all"]);
      setIsLoading(false);
    }

    try {
      const [{ data: isAdminByFunction }, { data: perms }] = await Promise.all([
        supabase.rpc("is_admin"),
        supabase.rpc("get_admin_permissions", { _user_id: user.id }),
      ]);

      if (mounted.current) {
        const adminStatus = Boolean(isAdminByFunction) || isOriginal;
        setIsAdmin(adminStatus);
        if (perms) {
          setPermissions(perms as string[]);
        } else if (isOriginal) {
          setPermissions(["all"]);
        } else {
          setPermissions([]);
        }
        setIsLoading(false);
      }
    } catch {
      if (mounted.current) {
        setIsAdmin(isOriginal);
        setPermissions(isOriginal ? ["all"] : []);
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

  const hasPermission = useCallback((perm: string) => {
    if (permissions.includes("all")) return true;
    return permissions.includes(perm);
  }, [permissions]);

  return { isAdmin, isOriginalMaster, permissions, hasPermission, isLoading, isAuthReady };
};
