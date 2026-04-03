import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Provider URLs ──────────────────────────────────────────────
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const TOGETHER_URL = "https://api.together.xyz/v1/chat/completions";
const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";

const CALL_TIMEOUT_MS = 30_000; // 30s per individual call

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

async function callGroq(messages: any[], apiKey: string, maxTokens: number, temperature: number) {
  const res = await fetchWithTimeout(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages, max_tokens: maxTokens, temperature }),
  });
  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function callOpenRouter(messages: any[], apiKey: string, maxTokens: number, temperature: number) {
  const res = await fetchWithTimeout(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://wame-angola-smart-learn.lovable.app",
      "X-Title": "WAME Angola",
    },
    body: JSON.stringify({ model: "meta-llama/llama-3.3-70b-instruct:free", messages, max_tokens: maxTokens, temperature }),
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function callGemini(messages: any[], apiKey: string, maxTokens: number, temperature: number) {
  const contents = messages
    .filter((m: any) => m.role !== "system")
    .map((m: any) => {
      if (typeof m.content === "string") {
        return { role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] };
      }
      const parts: any[] = [];
      for (const part of m.content) {
        if (part.type === "text") parts.push({ text: part.text });
        else if (part.type === "image_url") {
          const url = part.image_url.url;
          if (url.startsWith("data:")) {
            const [meta, b64] = url.split(",");
            const mime = meta.match(/data:(.*?);/)?.[1] || "image/jpeg";
            parts.push({ inline_data: { mime_type: mime, data: b64 } });
          }
        }
      }
      return { role: "user", parts };
    });

  const systemInstruction = messages.find((m: any) => m.role === "system");
  const body: any = { contents, generationConfig: { maxOutputTokens: maxTokens, temperature } };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction.content }] };

  const res = await fetchWithTimeout(`${GEMINI_URL}/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return { choices: [{ message: { content: text } }] };
}

async function callCerebras(messages: any[], apiKey: string, maxTokens: number, temperature: number) {
  const res = await fetchWithTimeout(CEREBRAS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "llama-3.3-70b", messages, max_tokens: maxTokens, temperature }),
  });
  if (!res.ok) throw new Error(`Cerebras error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function callTogether(messages: any[], apiKey: string, maxTokens: number, temperature: number) {
  const res = await fetchWithTimeout(TOGETHER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free", messages, max_tokens: maxTokens, temperature }),
  });
  if (!res.ok) throw new Error(`Together error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function callMistral(messages: any[], apiKey: string, maxTokens: number, temperature: number) {
  const res = await fetchWithTimeout(MISTRAL_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "mistral-small-latest", messages, max_tokens: maxTokens, temperature }),
  });
  if (!res.ok) throw new Error(`Mistral error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function callSelfHosted(messages: any[], apiKey: string, maxTokens: number, temperature: number) {
  const [url, token] = apiKey.split("|");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetchWithTimeout(url.trim(), {
    method: "POST",
    headers,
    body: JSON.stringify({ model: "default", messages, max_tokens: maxTokens, temperature }),
  });
  if (!res.ok) throw new Error(`Self-hosted error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Key management ─────────────────────────────────────────────

interface KeyEntry { id: string; chave: string; prioridade: number; }

const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

function isDatabaseKeyId(keyId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(keyId);
}

async function getApiKeys(): Promise<Record<string, KeyEntry[]>> {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const cooldownTime = new Date(Date.now() - COOLDOWN_MS).toISOString();

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, servico, chave, prioridade, ultimo_erro")
    .eq("ativo", true)
    .or(`ultimo_erro.is.null,ultimo_erro.lt.${cooldownTime}`)
    .order("prioridade", { ascending: true });

  if (error) console.error("Failed to load API keys:", error.message);

  const keys: Record<string, KeyEntry[]> = {};
  for (const row of data || []) {
    if (!keys[row.servico]) keys[row.servico] = [];
    keys[row.servico].push({ id: row.id, chave: row.chave, prioridade: row.prioridade ?? 0 });
  }
  return keys;
}

async function markKeyExhausted(keyId: string) {
  if (!isDatabaseKeyId(keyId)) return;
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabase.from("api_keys").update({ ultimo_erro: new Date().toISOString() }).eq("id", keyId);
  } catch (e) {
    console.error("Failed to mark key exhausted:", e);
  }
}

// ─── Provider registry ──────────────────────────────────────────

type CallFn = (msgs: any[], key: string, mt: number, t: number) => Promise<any>;

const CALL_FNS: Record<string, CallFn> = {
  selfhosted: callSelfHosted,
  gemini: callGemini,
  groq: callGroq,
  cerebras: callCerebras,
  openrouter: callOpenRouter,
  mistral: callMistral,
  together: callTogether,
};

const IMAGE_SERVICES = new Set(["gemini"]);

// Service priority order
const SERVICE_ORDER = ["gemini", "groq", "cerebras", "openrouter", "mistral", "together"];

// ─── Interleaved round-robin ────────────────────────────────────
// Instead of exhausting all keys of one service before moving to the next,
// interleave: gemini-key1, groq-key1, cerebras-key1, ..., gemini-key2, groq-key2, ...

let globalRoundRobin = 0;

interface KeyAttempt { service: string; keyEntry: KeyEntry; }

function buildInterleavedQueue(
  keys: Record<string, KeyEntry[]>,
  hasImages: boolean,
  preferredService?: string
): KeyAttempt[] {
  const services = hasImages
    ? SERVICE_ORDER.filter(s => IMAGE_SERVICES.has(s))
    : SERVICE_ORDER;

  // Reorder to put preferred service first
  const ordered = preferredService
    ? [preferredService, ...services.filter(s => s !== preferredService)]
    : services;

  // Find max number of keys across all services
  let maxKeys = 0;
  for (const svc of ordered) {
    const count = keys[svc]?.length || 0;
    if (count > maxKeys) maxKeys = count;
  }

  const queue: KeyAttempt[] = [];

  // Interleave: round 0 (key index 0 of each service), round 1 (key index 1), etc.
  for (let round = 0; round < maxKeys; round++) {
    for (const svc of ordered) {
      const svcKeys = keys[svc];
      if (!svcKeys || round >= svcKeys.length) continue;
      queue.push({ service: svc, keyEntry: svcKeys[round] });
    }
  }

  // Rotate start position for load distribution
  if (queue.length > 1) {
    globalRoundRobin = (globalRoundRobin + 1) % queue.length;
    const rotated = [...queue.slice(globalRoundRobin), ...queue.slice(0, globalRoundRobin)];
    return rotated;
  }

  return queue;
}

// ─── Main handler ───────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, max_tokens = 8000, temperature = 0.7, service } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Parâmetro 'messages' é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keys = await getApiKeys();
    const hasImages = messages.some((m: any) =>
      Array.isArray(m.content) && m.content.some((p: any) => p.type === "image_url")
    );

    const queue = buildInterleavedQueue(keys, hasImages, service);

    if (queue.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma API disponível. Configure suas chaves em /setup-api-keys." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let lastError: Error | null = null;

    for (const { service: svc, keyEntry } of queue) {
      if (hasImages && !IMAGE_SERVICES.has(svc)) continue;

      const callFn = CALL_FNS[svc];
      if (!callFn) continue;

      try {
        console.log(`Trying ${svc} (key ${keyEntry.id.substring(0, 8)}...)...`);
        const result = await callFn(messages, keyEntry.chave, max_tokens, temperature);
        console.log(`✓ Success with ${svc} (key ${keyEntry.id.substring(0, 8)}...)`);

        const tokensUsed = result?.usage?.total_tokens || result?.usage?.completion_tokens || 0;
        return new Response(JSON.stringify({ ...result, service_used: svc, tokens_used: tokensUsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (caughtError: any) {
        const error = caughtError instanceof Error ? caughtError : new Error(String(caughtError));
        console.error(`✗ ${svc} key ${keyEntry.id.substring(0, 8)}... failed:`, error.message);
        lastError = error;

        // ALL errors mark key as exhausted and continue to next
        await markKeyExhausted(keyEntry.id);
        continue;
      }
    }

    return new Response(
      JSON.stringify({ error: lastError?.message || "Todas as APIs falharam. Tente novamente em alguns minutos." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ai-proxy error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
