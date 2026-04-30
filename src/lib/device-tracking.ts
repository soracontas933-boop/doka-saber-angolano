import { supabase } from "@/integrations/supabase/client";

export interface DeviceInfo {
  device_type: "mobile" | "tablet" | "desktop";
  os: string;
  browser: string;
  user_agent: string;
}

export function detectDevice(): DeviceInfo {
  const ua = navigator.userAgent;
  const uaLower = ua.toLowerCase();

  let device_type: DeviceInfo["device_type"] = "desktop";
  if (/ipad|tablet|playbook|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) {
    device_type = "tablet";
  } else if (/mobi|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) {
    device_type = "mobile";
  }

  let os = "Outro";
  if (/windows nt/i.test(ua)) os = "Windows";
  else if (/mac os x/i.test(ua) && !/mobile/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = "Outro";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/chrome\//i.test(ua) && !/edg/i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/opr\//i.test(ua)) browser = "Opera";

  return { device_type, os, browser, user_agent: ua };
}

interface GeoInfo {
  country?: string;
  city?: string;
  region?: string;
  ip?: string;
}

let geoCache: GeoInfo | null = null;

async function fetchGeo(): Promise<GeoInfo> {
  if (geoCache) return geoCache;
  try {
    const res = await fetch("https://ipapi.co/json/", { cache: "no-store" });
    if (!res.ok) return {};
    const j = await res.json();
    geoCache = {
      country: j.country_name || j.country,
      city: j.city,
      region: j.region,
      ip: j.ip,
    };
    return geoCache;
  } catch {
    return {};
  }
}

export async function trackAppDownload(opts: {
  status: "prompted" | "accepted" | "dismissed" | "manual";
  source?: string;
}) {
  try {
    const device = detectDevice();
    const geo = await fetchGeo();
    const { data: { user } } = await supabase.auth.getUser();

    await (supabase.from("app_downloads") as any).insert({
      user_id: user?.id || null,
      device_type: device.device_type,
      os: device.os,
      browser: device.browser,
      user_agent: device.user_agent,
      country: geo.country || null,
      city: geo.city || null,
      region: geo.region || null,
      ip: geo.ip || null,
      source: opts.source || "landing",
      status: opts.status,
      referrer: document.referrer || null,
    });
  } catch (e) {
    console.error("trackAppDownload error", e);
  }
}

export async function trackPageView(page: string) {
  try {
    const device = detectDevice();
    const geo = await fetchGeo();
    const { data: { user } } = await supabase.auth.getUser();

    await (supabase.from("page_views") as any).insert({
      user_id: user?.id || null,
      page,
      referrer: document.referrer || null,
      user_agent: device.user_agent,
      device_type: device.device_type,
      os: device.os,
      browser: device.browser,
      country: geo.country || null,
      city: geo.city || null,
      region: geo.region || null,
      ip: geo.ip || null,
    });
  } catch (e) {
    console.error("trackPageView error", e);
  }
}
