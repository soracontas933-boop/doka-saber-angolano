import { supabase } from "@/integrations/supabase/client";

// Chave VAPID pública (segura para expor)
export const VAPID_PUBLIC_KEY =
  "BKl-dZyCc9H52QjVuHbnvprMRtaUHmaDquWORGmLeQQSN-D_RqZWb--HBxJpRBMBjgee44Sb9nay6e3jsNd_mok";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

async function registerPushSW(): Promise<ServiceWorkerRegistration> {
  // Service Worker dedicado, com scope próprio para não conflitar com o PWA
  const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/push-sw/" });
  await navigator.serviceWorker.ready;
  return reg;
}

export async function subscribeToPush(userId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: "unsupported" };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, error: "denied" };

    const reg = await registerPushSW();

    // Reaproveita subscrição existente, se houver
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const json = subscription.toJSON();
    const endpoint = subscription.endpoint;
    const p256dh = json.keys?.p256dh || arrayBufferToBase64(subscription.getKey("p256dh")!);
    const auth = json.keys?.auth || arrayBufferToBase64(subscription.getKey("auth")!);

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
          ultimo_uso: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      console.error("[push] erro ao guardar subscrição:", error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err: any) {
    console.error("[push] subscribe falhou:", err);
    return { ok: false, error: err?.message || "erro" };
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/push-sw/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    return true;
  } catch (e) {
    return false;
  }
}

export async function isCurrentlySubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/push-sw/");
    const sub = await reg?.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}
