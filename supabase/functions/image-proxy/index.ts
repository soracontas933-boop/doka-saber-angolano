import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  KeyEntry,
  getCooldownMs,
  formatCooldown,
  getHealthyKeysByService,
  buildOptimizedQueue,
  getKeyHealthStats,
} from "../api-key-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CALL_TIMEOUT_MS = 60_000;
const POLLINATIONS_URL = "https://image.pollinations.ai/prompt";

// ─── Provider call functions ────────────────────────────────────

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = CALL_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callStability(prompt: string, apiKey: string, width: number, height: number): Promise<string> {
  const formData = new FormData();
  formData.append("prompt", prompt);
  formData.append("output_format", "png");
  formData.append("width", String(Math.min(1536, Math.max(512, Math.round(width / 64) * 64))));
  formData.append("height", String(Math.min(1536, Math.max(512, Math.round(height / 64) * 64))));

  const res = await fetchWithTimeout("https://api.stability.ai/v2beta/stable-image/generate/sd3", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "image/*" },
    body: formData,
  });
  if (!res.ok) throw new Error(`Stability error ${res.status}: ${await res.text()}`);
  const buf = await res.arrayBuffer();
  return `data:image/png;base64,${btoa(String.fromCharCode(...new Uint8Array(buf)))}`;
}

async function callHuggingFace(prompt: string, apiKey: string): Promise<string> {
  const res = await fetchWithTimeout(
    "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: prompt }),
    },
    90_000,
  );
  if (!res.ok) throw new Error(`HuggingFace error ${res.status}: ${await res.text()}`);
  const buf = await res.arrayBuffer();
  return `data:image/png;base64,${btoa(String.fromCharCode(...new Uint8Array(buf)))}`;
}

async function callReplicate(prompt: string, apiKey: string, width: number, height: number): Promise<string> {
  const createRes = await fetchWithTimeout("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Prefer: "wait" },
    body: JSON.stringify({
      version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      input: { prompt, width, height, num_outputs: 1 },
    }),
  }, 120_000);
  if (!createRes.ok) throw new Error(`Replicate error ${createRes.status}: ${await createRes.text()}`);
  const prediction = await createRes.json();

  if (prediction.status === "succeeded" && prediction.output?.[0]) {
    return prediction.output[0];
  }

  // Poll if not done
  const getUrl = prediction.urls?.get;
  if (!getUrl) throw new Error("Replicate: no get URL");
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const pollRes = await fetch(getUrl, { headers: { Authorization: `Bearer ${apiKey}` } });
    const data = await pollRes.json();
    if (data.status === "succeeded" && data.output?.[0]) return data.output[0];
    if (data.status === "failed") throw new Error(`Replicate failed: ${data.error}`);
  }
  throw new Error("Replicate: timeout polling");
}

async function callCloudflareAI(prompt: string, apiKey: string): Promise<string> {
  // apiKey format: "ACCOUNT_ID:API_TOKEN"
  const [accountId, token] = apiKey.includes(":") ? apiKey.split(":", 2) : ["", apiKey];
  if (!accountId) throw new Error("Cloudflare AI key must be ACCOUNT_ID:API_TOKEN");

  const res = await fetchWithTimeout(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    },
  );
  if (!res.ok) throw new Error(`Cloudflare AI error ${res.status}: ${await res.text()}`);
  const buf = await res.arrayBuffer();
  return `data:image/png;base64,${btoa(String.fromCharCode(...new Uint8Array(buf)))}`;
}

async function callSegmind(prompt: string, apiKey: string, width: number, height: number): Promise<string> {
  const res = await fetchWithTimeout("https://api.segmind.com/v1/sdxl1.0-txt2img", {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, samples: 1, width, height, num_inference_steps: 25 }),
  });
  if (!res.ok) throw new Error(`Segmind error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.image) return `data:image/png;base64,${data.image}`;
  throw new Error("Segmind: no image in response");
}

async function callLeonardo(prompt: string, apiKey: string, width: number, height: number): Promise<string> {
  const createRes = await fetchWithTimeout("https://cloud.leonardo.ai/api/rest/v1/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, width, height, num_images: 1 }),
  });
  if (!createRes.ok) throw new Error(`Leonardo error ${createRes.status}: ${await createRes.text()}`);
  const { sdGenerationJob } = await createRes.json();
  const genId = sdGenerationJob?.generationId;
  if (!genId) throw new Error("Leonardo: no generation ID");

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const pollRes = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${genId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await pollRes.json();
    const imgs = data?.generations_by_pk?.generated_images;
    if (imgs?.[0]?.url) return imgs[0].url;
    if (data?.generations_by_pk?.status === "FAILED") throw new Error("Leonardo: generation failed");
  }
  throw new Error("Leonardo: timeout polling");
}

function getPollinationsUrl(prompt: string, width: number, height: number): string {
  const seed = Math.floor(Math.random() * 99999);
  return `${POLLINATIONS_URL}/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`;
}

// ─── Key management (using centralized utils) ──────────────────

function createSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const IMAGE_SERVICES = ["stability", "huggingface", "replicate", "segmind", "leonardo", "cloudflare_ai"];
const SERVICE_ORDER = ["stability", "huggingface", "replicate", "segmind", "leonardo", "cloudflare_ai"];

async function getImageApiKeys(): Promise<KeyEntry[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, servico, chave, prioridade, ultimo_erro")
    .eq("ativo", true)
    .in("servico", IMAGE_SERVICES)
    .order("prioridade", { ascending: true });

  if (error || !data) return [];
  
  return data.map((row) => ({
    id: row.id,
    chave: row.chave,
    prioridade: row.prioridade ?? 0,
    ultimo_erro: row.ultimo_erro,
    servico: row.servico,
  }));
}

async function markKeyExhausted(keyId: string, errorMsg: string) {
  const cooldownMs = getCooldownMs(errorMsg);
  const cooldownUntil = new Date(Date.now() + cooldownMs).toISOString();

  try {
    const supabase = createSupabaseAdmin();
    await supabase
      .from("api_keys")
      .update({ ultimo_erro: cooldownUntil })
      .eq("id", keyId);
    console.log(`⏸ Image key ${keyId.substring(0, 8)}... em cooldown (${formatCooldown(cooldownMs)}): ${errorMsg.substring(0, 80)}`);
  } catch (e) {
    console.error("Mark key error:", e);
  }
}

async function clearKeyCooldown(keyId: string) {
  try {
    const supabase = createSupabaseAdmin();
    await supabase.from("api_keys").update({ ultimo_erro: null }).eq("id", keyId);
  } catch (e) {
    console.error("Clear cooldown error:", e);
  }
}

type ImageCallFn = (prompt: string, key: string, w: number, h: number) => Promise<string>;

const CALL_FNS: Record<string, ImageCallFn> = {
  stability: callStability,
  huggingface: (p, k) => callHuggingFace(p, k),
  replicate: callReplicate,
  cloudflare_ai: (p, k) => callCloudflareAI(p, k),
  segmind: callSegmind,
  leonardo: callLeonardo,
};

// ─── Main handler ───────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: claimsErr } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt, width = 800, height = 600 } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allKeys = await getImageApiKeys();
    const now = Date.now();
    const stats = getKeyHealthStats(allKeys, now);

    console.log(`📊 Saúde das chaves de imagem: ${stats.healthy}/${stats.total} saudáveis`);
    for (const [svc, svcStats] of Object.entries(stats.byService)) {
      console.log(`  ${svc}: ${svcStats.healthy}/${svcStats.total} saudáveis`);
    }

    // Agrupa chaves por serviço (apenas saudáveis)
    const healthyKeysByService = getHealthyKeysByService(allKeys, now);

    // Constrói fila otimizada: máximo 2 chaves por serviço
    const queue = buildOptimizedQueue(healthyKeysByService, SERVICE_ORDER);

    if (queue.length === 0) {
      // Se nenhuma chave saudável, tenta apenas a melhor em cooldown se estiver perto de expirar
      const bestCooldownKey = allKeys
        .sort((a, b) => {
          const timeA = getTimeUntilReady(a, now);
          const timeB = getTimeUntilReady(b, now);
          return timeA - timeB;
        })[0];

      const remainingMs = bestCooldownKey ? getTimeUntilReady(bestCooldownKey, now) : Infinity;

      if (bestCooldownKey && remainingMs < 60_000) { // 1 minuto de tolerância para imagem
        console.warn(`⚠️ Nenhuma chave de imagem saudável. Tentando ${bestCooldownKey.servico} (pronta em ${Math.ceil(remainingMs/1000)}s)...`);
        queue.push({ service: bestCooldownKey.servico, keyEntry: bestCooldownKey });
      } else {
        console.log("→ Pollinations fallback (todas as chaves em cooldown)");
        const pollinationsUrl = getPollinationsUrl(prompt, width, height);
        return new Response(JSON.stringify({ image_url: pollinationsUrl, service_used: "pollinations" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`🔄 Fila de imagens: ${queue.slice(0, 3).map(q => `${q.service}[${q.keyEntry.id.substring(0,4)}]`).join(" → ")}${queue.length > 3 ? "..." : ""}`);

    let lastError: Error | null = null;

    for (const { service, keyEntry } of queue) {
      const callFn = CALL_FNS[service];
      if (!callFn) continue;

      try {
        console.log(`→ ${service} (${keyEntry.id.substring(0, 8)}...)`);
        const imageUrl = await callFn(prompt, keyEntry.chave, width, height);
        await clearKeyCooldown(keyEntry.id);
        console.log(`✓ ${service} OK`);
        return new Response(JSON.stringify({ image_url: imageUrl, service_used: service }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (caughtError: any) {
        const error = caughtError instanceof Error ? caughtError : new Error(String(caughtError));
        console.error(`✗ ${service} ${keyEntry.id.substring(0, 8)}...: ${error.message.substring(0, 120)}`);
        lastError = error;
        await markKeyExhausted(keyEntry.id, error.message);
      }
    }

    // Fallback: Pollinations (free, no key)
    console.log("→ Pollinations fallback");
    const pollinationsUrl = getPollinationsUrl(prompt, width, height);
    return new Response(JSON.stringify({ image_url: pollinationsUrl, service_used: "pollinations" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("image-proxy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
