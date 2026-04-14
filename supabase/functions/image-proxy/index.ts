import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// ─── Key management (same pattern as ai-proxy) ─────────────────

interface KeyEntry { id: string; chave: string; prioridade: number; ultimo_erro: string | null; }

function createSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const IMAGE_SERVICES = ["stability", "huggingface", "replicate", "segmind", "leonardo", "cloudflare_ai"];

async function getImageApiKeys(): Promise<Record<string, KeyEntry[]>> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, servico, chave, prioridade, ultimo_erro")
    .eq("ativo", true)
    .in("servico", IMAGE_SERVICES)
    .order("prioridade", { ascending: true });

  if (error || !data) return {};
  const now = Date.now();
  const keys: Record<string, KeyEntry[]> = {};
  for (const row of data) {
    if (row.ultimo_erro) {
      const cd = new Date(row.ultimo_erro).getTime();
      if (Number.isFinite(cd) && cd > now) continue;
    }
    if (!keys[row.servico]) keys[row.servico] = [];
    keys[row.servico].push({ id: row.id, chave: row.chave, prioridade: row.prioridade ?? 0, ultimo_erro: row.ultimo_erro });
  }
  return keys;
}

async function markKeyExhausted(keyId: string, errorMsg: string) {
  const cooldownMs = 5 * 60 * 1000;
  try {
    const supabase = createSupabaseAdmin();
    await supabase.from("api_keys").update({ ultimo_erro: new Date(Date.now() + cooldownMs).toISOString() }).eq("id", keyId);
    console.log(`⏸ Image key ${keyId.substring(0, 8)}... cooldown: ${errorMsg.substring(0, 80)}`);
  } catch (e) { console.error("Mark key error:", e); }
}

async function clearKeyCooldown(keyId: string) {
  try {
    const supabase = createSupabaseAdmin();
    await supabase.from("api_keys").update({ ultimo_erro: null }).eq("id", keyId);
  } catch (e) { console.error("Clear cooldown error:", e); }
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
    const { prompt, width = 800, height = 600 } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keys = await getImageApiKeys();

    // Build queue: interleaved round-robin
    const queue: { service: string; key: KeyEntry }[] = [];
    let maxLen = 0;
    for (const svc of IMAGE_SERVICES) {
      const c = keys[svc]?.length || 0;
      if (c > maxLen) maxLen = c;
    }
    for (let round = 0; round < maxLen; round++) {
      for (const svc of IMAGE_SERVICES) {
        if (keys[svc] && round < keys[svc].length) {
          queue.push({ service: svc, key: keys[svc][round] });
        }
      }
    }

    // Randomize start
    if (queue.length > 1) {
      const offset = Math.floor(Math.random() * queue.length);
      queue.push(...queue.splice(0, offset));
    }

    console.log(`Image queue (${queue.length} keys): ${queue.map(q => q.service).join(" → ")} + Pollinations fallback`);

    let lastError: Error | null = null;

    for (const { service, key } of queue) {
      const callFn = CALL_FNS[service];
      if (!callFn) continue;
      try {
        console.log(`→ ${service} (${key.id.substring(0, 8)}...)`);
        const imageUrl = await callFn(prompt, key.chave, width, height);
        await clearKeyCooldown(key.id);
        console.log(`✓ ${service} OK`);
        return new Response(JSON.stringify({ image_url: imageUrl, service_used: service }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e: any) {
        lastError = e instanceof Error ? e : new Error(String(e));
        console.error(`✗ ${service}: ${lastError.message.substring(0, 120)}`);
        await markKeyExhausted(key.id, lastError.message);
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
