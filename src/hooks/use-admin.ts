import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = "kenymatos943@gmail.com";

const isMasterEmail = (email?: string | null) =>
  (email ?? "").trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const resolveAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      const fallbackByEmail = isMasterEmail(user.email);
      const { data: isAdminByFunction } = await supabase.rpc("is_admin");

      if (!mounted) return;

      setIsAdmin(Boolean(isAdminByFunction) || fallbackByEmail);
      setIsLoading(false);
    };

    resolveAdmin();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        if (!mounted) return;
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      const fallbackByEmail = isMasterEmail(session.user.email);
      const { data: isAdminByFunction } = await supabase.rpc("is_admin");

      if (!mounted) return;

      setIsAdmin(Boolean(isAdminByFunction) || fallbackByEmail);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { isAdmin, isLoading };
};
