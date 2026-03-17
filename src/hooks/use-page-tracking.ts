import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    const track = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase.from("page_views") as any).insert({
        user_id: user.id,
        page: location.pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
      });
    };

    track();
  }, [location.pathname]);
};
