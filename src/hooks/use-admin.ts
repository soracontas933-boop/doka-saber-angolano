import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ADMIN_EMAILS = [
  "kenymatos943@gmail.com",
  "manuelmatosjose67@gmail.com",
];

const isMasterEmail = (email?: string | null) =>
  ADMIN_EMAILS.some(
    (admin) => (email ?? "").trim().toLowerCase() === admin.toLowerCase()
  );

export const useAdmin = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOriginalMaster, setIsOriginalMaster] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    setIsAuthReady(true);

    if (!user) {
      setIsAdmin(false);
      setIsOriginalMaster(false);
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    const isOriginal = isMasterEmail(user.email);
    setIsOriginalMaster(isOriginal);

    if (isOriginal) {
      setIsAdmin(true);
      setPermissions(["all"]);
      setIsLoading(false);
    }

    Promise.all([
      supabase.rpc("is_admin"),
      supabase.rpc("get_admin_permissions", { _user_id: user.id }),
    ]).then(([{ data: isAdminByFunction }, { data: perms }]) => {
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
    }).catch(() => {
      setIsAdmin(isOriginal);
      setPermissions(isOriginal ? ["all"] : []);
      setIsLoading(false);
    });
  }, [user, authLoading]);

  const hasPermission = useCallback((perm: string) => {
    if (permissions.includes("all")) return true;
    return permissions.includes(perm);
  }, [permissions]);

  return { isAdmin, isOriginalMaster, permissions, hasPermission, isLoading, isAuthReady };
};
