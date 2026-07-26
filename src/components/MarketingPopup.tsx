import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserPlan } from "@/hooks/use-user-plan";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Popup {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  link_url: string | null;
  target_plan: string;
}

const MarketingPopup = () => {
  const [popup, setPopup] = useState<Popup | null>(null);
  const [open, setOpen] = useState(false);
  const { plan } = useUserPlan();

  useEffect(() => {
    const fetchActivePopup = async () => {
      // Check if user has already seen a popup in this session
      const seenPopup = sessionStorage.getItem("doka_marketing_popup_seen");
      if (seenPopup) return;

      const { data, error } = await (supabase.from("popups") as any)
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const activePopup = data[0];
        
        // Check if popup targets this user's plan
        if (activePopup.target_plan === "all" || activePopup.target_plan === plan) {
          setPopup(activePopup);
          // Show popup after a short delay
          setTimeout(() => setOpen(true), 2000);
        }
      }
    };

    if (plan) {
      fetchActivePopup();
    }
  }, [plan]);

  const handleClose = () => {
    setOpen(false);
    sessionStorage.setItem("doka_marketing_popup_seen", "true");
  };

  const handleAction = () => {
    if (popup?.link_url) {
      window.open(popup.link_url, "_blank");
    }
    handleClose();
  };

  if (!popup) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-none bg-transparent shadow-none">
        <div className="relative bg-card rounded-xl overflow-hidden border shadow-2xl">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-2 top-2 z-10 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>

          {popup.image_url && (
            <div className="w-full h-48 overflow-hidden">
              <img 
                src={popup.image_url} 
                alt={popup.title} 
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center">{popup.title}</DialogTitle>
            </DialogHeader>
            
            <div 
              className="text-muted-foreground text-center prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: popup.content }}
            />

            <DialogFooter className="sm:justify-center pt-2">
              <Button 
                onClick={handleAction} 
                className="w-full sm:w-auto px-8 py-6 text-lg font-semibold rounded-full shadow-lg hover:scale-105 transition-transform"
              >
                {popup.link_url ? "Ver Detalhes" : "Entendido"}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MarketingPopup;
