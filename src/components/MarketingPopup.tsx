import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserPlan } from "@/hooks/use-user-plan";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ExternalLink, ArrowRight } from "lucide-react";

interface InternalButton {
  path: string;
  label: string;
}

interface Popup {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  link_url: string | null;
  target_plan: string;
  media_type: 'image' | 'video';
  max_views_per_day: number;
  internal_buttons: InternalButton[] | null;
  action_button_label: string | null;
  action_button_path: string | null;
}

const MarketingPopup = () => {
  const [popup, setPopup] = useState<Popup | null>(null);
  const [open, setOpen] = useState(false);
  const { plan } = useUserPlan();
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAndFetchPopup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch active popup
      const { data: popups, error: popupError } = await (supabase.from("popups") as any)
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (popupError || !popups || popups.length === 0) return;
      const activePopup = popups[0];

      // Check plan target
      if (activePopup.target_plan !== "all" && activePopup.target_plan !== plan) return;

      // Check frequency limit
      const today = new Date().toISOString().split('T')[0];
      const { data: viewData, error: viewError } = await (supabase.from("popup_views") as any)
        .select("view_count")
        .eq("user_id", user.id)
        .eq("popup_id", activePopup.id)
        .eq("viewed_at", today)
        .maybeSingle();

      const currentViews = viewData?.view_count || 0;
      if (currentViews < (activePopup.max_views_per_day || 1)) {
        setPopup(activePopup);
        // Show popup after a short delay
        setTimeout(() => setOpen(true), 2000);
        
        // Register the view
        if (viewData) {
          await (supabase.from("popup_views") as any)
            .update({ view_count: currentViews + 1 })
            .eq("user_id", user.id)
            .eq("popup_id", activePopup.id)
            .eq("viewed_at", today);
        } else {
          await (supabase.from("popup_views") as any)
            .insert({
              user_id: user.id,
              popup_id: activePopup.id,
              viewed_at: today,
              view_count: 1
            });
        }
      }
    };

    if (plan) {
      checkAndFetchPopup();
    }
  }, [plan]);

  const handleClose = () => {
    setOpen(false);
  };

  const handleExternalLink = () => {
    if (popup?.link_url) {
      window.open(popup.link_url, "_blank");
    }
    handleClose();
  };

  const handleInternalNavigation = (path: string) => {
    handleClose();
    // Small delay to let dialog close animation finish
    setTimeout(() => {
      navigate(path);
    }, 200);
  };

  const handleActionButton = () => {
    if (popup?.action_button_path) {
      handleInternalNavigation(popup.action_button_path);
    } else if (popup?.link_url) {
      handleExternalLink();
    } else {
      handleClose();
    }
  };

  if (!popup) return null;

  const hasInternalButtons = popup.internal_buttons && popup.internal_buttons.length > 0;
  const hasExternalLink = !!popup.link_url;
  const hasActionButton = !!popup.action_button_path;
  const hasAnyAction = hasInternalButtons || hasExternalLink || hasActionButton;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[95vw] sm:max-w-[550px] md:max-w-[650px] p-0 overflow-hidden border-none bg-transparent shadow-none">
        <div className="relative bg-card rounded-xl overflow-hidden border shadow-2xl max-h-[90vh] flex flex-col">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-2 top-2 z-10 rounded-full bg-background/50 backdrop-blur-sm hover:bg-background/80"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>

          {popup.image_url && (
            <div className="w-full bg-black flex items-center justify-center overflow-hidden">
              {popup.media_type === 'video' ? (
                <video 
                  ref={videoRef}
                  src={popup.image_url} 
                  className="w-full h-auto max-h-[60vh] object-contain" 
                  controls 
                  autoPlay 
                  loop
                  playsInline
                  onLoadedMetadata={() => {
                    if (videoRef.current) {
                      const playPromise = videoRef.current.play();
                      if (playPromise !== undefined) {
                        playPromise.catch(() => {
                          if (videoRef.current) {
                            videoRef.current.muted = true;
                            videoRef.current.play();
                          }
                        });
                      }
                    }
                  }}
                />
              ) : (
                <img 
                  src={popup.image_url} 
                  alt={popup.title} 
                  className="w-full h-auto max-h-[60vh] object-contain"
                />
              )}
            </div>
          )}

          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-center">{popup.title}</DialogTitle>
            </DialogHeader>
            
            <div 
              className="text-muted-foreground text-center prose prose-sm dark:prose-invert max-w-none text-sm sm:text-base"
              dangerouslySetInnerHTML={{ __html: popup.content }}
            />

            <DialogFooter className="sm:justify-center pt-2 sticky bottom-0 bg-card flex flex-col gap-2">
              {/* Primary action button (external link or internal action button) */}
              {hasActionButton && (
                <Button 
                  onClick={handleActionButton}
                  className="w-full px-6 py-4 text-base font-semibold rounded-full shadow-lg hover:scale-105 transition-transform bg-primary"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  {popup.action_button_label || "Acessar"}
                </Button>
              )}
              
              {!hasActionButton && hasExternalLink && (
                <Button 
                  onClick={handleExternalLink} 
                  className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg font-semibold rounded-full shadow-lg hover:scale-105 transition-transform"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Detalhes
                </Button>
              )}

              {!hasActionButton && !hasExternalLink && !hasInternalButtons && (
                <Button 
                  onClick={handleClose} 
                  className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg font-semibold rounded-full shadow-lg hover:scale-105 transition-transform"
                >
                  Entendido
                </Button>
              )}

              {/* Internal navigation buttons */}
              {hasInternalButtons && (
                <div className="w-full flex flex-col gap-2 pt-1">
                  {(popup.internal_buttons as InternalButton[]).map((btn, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      onClick={() => handleInternalNavigation(btn.path)}
                      className="w-full justify-start px-4 py-3 text-sm font-medium rounded-lg border border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      <ArrowRight className="h-4 w-4 mr-2 text-primary" />
                      {btn.label}
                    </Button>
                  ))}
                </div>
              )}
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MarketingPopup;
