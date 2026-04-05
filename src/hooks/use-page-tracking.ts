import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const usePageTracking = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    (supabase.from("page_views") as any).insert({
      user_id: user.id,
      page: location.pathname,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
    });
  }, [location.pathname, user]);
};
