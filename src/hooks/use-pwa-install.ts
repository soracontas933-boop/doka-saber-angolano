import { useState, useEffect } from "react";
import { trackAppDownload } from "@/lib/device-tracking";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "desktop" | "unknown";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>("unknown");

  useEffect(() => {
    setPlatform(detectPlatform());

    const checkInstalled = async () => {
      // 1. Standalone display mode (PWA aberto como app)
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches ||
        window.matchMedia("(display-mode: minimal-ui)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.startsWith("android-app://");

      if (isStandalone) {
        setIsInstalled(true);
        return true;
      }

      // 2. getInstalledRelatedApps (Chrome Android) — detecta PWA instalado mesmo no browser
      try {
        const nav = navigator as any;
        if (typeof nav.getInstalledRelatedApps === "function") {
          const related = await nav.getInstalledRelatedApps();
          if (Array.isArray(related) && related.length > 0) {
            setIsInstalled(true);
            return true;
          }
        }
      } catch {
        // ignore
      }
      return false;
    };

    checkInstalled();

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      trackAppDownload({ status: "accepted", source: "pwa" });
    };

    // Listener para mudanças no display-mode (ex: utilizador instala e abre como app)
    const mql = window.matchMedia("(display-mode: standalone)");
    const displayModeHandler = (e: MediaQueryListEvent) => {
      if (e.matches) setIsInstalled(true);
    };
    mql.addEventListener?.("change", displayModeHandler);

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
      mql.removeEventListener?.("change", displayModeHandler);
    };
  }, []);


  const install = async () => {
    // Native prompt available → use it
    if (deferredPrompt) {
      trackAppDownload({ status: "prompted", source: "landing" });
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
      } else {
        trackAppDownload({ status: "dismissed", source: "landing" });
      }
      return outcome === "accepted";
    }

    // Fallback: show platform-specific instructions
    trackAppDownload({ status: "manual", source: "landing" });
    return false;
  };

  // Always show button unless already installed
  const canInstall = !isInstalled;
  const hasNativePrompt = !!deferredPrompt;

  return { canInstall, isInstalled, install, platform, hasNativePrompt };
}
