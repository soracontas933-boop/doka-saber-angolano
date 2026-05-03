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

const CALL_TIMEOUT_MS = 30_000;
const DEFAULT_COOLDOWN_MS = 60 * 1000;
const SHORT_COOLDOWN_MS = 30 * 1000;
const LONG_COOLDOWN_MS = 60 * 60 * 1000;
const VERY_LONG_COOLDOWN_MS = 12 * 60 * 60 * 1000;

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

const OPENROUTER_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
  "deepseek/deepseek-chat-v3.1:free",
  "qwen/qwen-2.5-72b-instruct:free",
];

const CEREBRAS_MODELS = [
  "llama-4-scout-17b-16e-instruct",
  "llama3.1-8b",
];

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

async function callWithModelFallback(
  provider: string,
  url: string,
  apiKey: string,
  models: string[],
  messages: any[],
  maxTokens: number,
  temperature: number,
  extraHeaders: Record<string, string> = {},
) {
  let lastErr: Error | null = null;

  for (const model of models) {
    try {
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...extraHeaders,
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
      });

      if (!res.ok) {
        lastErr = new Error(`${provider} error ${res.status} (${model}): ${await res.text()}`);
        continue;
      }

      return res.json();
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastErr || new Error(`${provider}: all models failed`);
}

async function callGroq(messages: any[], apiKey: string, maxTokens: number, temperature: number) {
  return callWithModelFallback("Groq", GROQ_URL, apiKey, GROQ_MODELS, messages, maxTokens, temperature);
}

async function callOpenRouter(messages: any[], apiKey: string, maxTokens: number, temperature: number) {
  return callWithModelFallback(
    "OpenRouter",
    OPENROUTER_URL,
    apiKey,
    OPENROUTER_MODELS,
    messages,
    maxTokens,
    temperature,
    {
      "HTTP-Referer": "https://wame-angola-smart-learn.lovable.app",
      "X-Title": "DELLE Angola",
    },
  );
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

  const res = await fetchWithTimeout(`${GEMINI_URL}/gemini-2.5-flash:generateContent?key=${apiKey}`, {
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
  return callWithModelFallback("Cerebras", CEREBRAS_URL, apiKey, CEREBRAS_MODELS, messages, maxTokens, temperature);
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

// ─── Key management ─────────────────────────────────────────────

interface KeyEntry { id: string; chave: string; prioridade: number; ultimo_erro: string | null; }

function createSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getApiKeys(): Promise<Record<string, KeyEntry[]>> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, servico, chave, prioridade, ultimo_erro")
    .eq("ativo", true)
    .order("prioridade", { ascending: true });

  if (error) {
    console.error("Erro ao carregar chaves API:", error.message);
    return {};
  }

  if (!data || data.length === 0) {
    console.warn("Nenhuma chave API ativa encontrada.");
    return {};
  }

  const now = Date.now();
  const keys: Record<string, KeyEntry[]> = {};
  let skipped = 0;

  for (const row of data) {
    if (row.ultimo_erro) {
      const cooldownUntil = new Date(row.ultimo_erro).getTime();
      if (Number.isFinite(cooldownUntil) && cooldownUntil > now) {
        skipped++;
        continue;
      }
    }

    if (!keys[row.servico]) keys[row.servico] = [];
    keys[row.servico].push({
      id: row.id,
      chave: row.chave,
      prioridade: row.prioridade ?? 0,
      ultimo_erro: row.ultimo_erro,
    });
  }

  const total = data.length;
  const healthy = total - skipped;
  console.log(`Chaves: ${healthy}/${total} saudáveis (${skipped} em cooldown)`);
  return keys;
}

function parseRetryDelayMs(errorMsg: string) {
  const matchers = [
    /retry(?:ing)?\s+(?:in|after)\s+([\d.]+)s/i,
    /retrydelay\s*[:=]\s*"?([\d.]+)s/i,
    /try again in\s+([\d.]+)s/i,
    /please retry in\s+([\d.]+)s/i,
  ];

  for (const pattern of matchers) {
    const match = errorMsg.match(pattern);
    if (match) {
      const seconds = Number(match[1]);
      if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
    }
  }

  return null;
}

function getCooldownMs(errorMsg: string) {
  const lower = errorMsg.toLowerCase();

  if (
    (lower.includes("quota exceeded") || lower.includes("billing details")) &&
    (lower.includes("limit: 0") || lower.includes("perday") || lower.includes("free tier"))
  ) {
    return VERY_LONG_COOLDOWN_MS;
  }

  if (lower.includes("wrong api key") || lower.includes("unauthorized") || /\berror 401\b/i.test(errorMsg)) {
    return VERY_LONG_COOLDOWN_MS;
  }

  if (lower.includes("no endpoints found") || lower.includes("does not exist") || /\berror 404\b/i.test(errorMsg)) {
    return LONG_COOLDOWN_MS;
  }

  const retryDelayMs = parseRetryDelayMs(errorMsg);
  if (retryDelayMs) {
    return Math.max(SHORT_COOLDOWN_MS, Math.min(retryDelayMs + 5_000, 15 * 60 * 1000));
  }

  if (/\berror 429\b/i.test(errorMsg) || lower.includes("rate limit")) {
    return DEFAULT_COOLDOWN_MS;
  }

  if (/\berror 5\d\d\b/i.test(errorMsg)) {
    return 2 * 60 * 1000;
  }

  return 5 * 60 * 1000;
}

function formatCooldown(ms: number) {
  if (ms < 60_000) return `${Math.ceil(ms / 1000)}s`;
  if (ms < 60 * 60 * 1000) return `${Math.ceil(ms / 60_000)}min`;
  return `${Math.ceil(ms / (60 * 60 * 1000))}h`;
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
    console.log(`⏸ Key ${keyId.substring(0, 8)}... em cooldown (${formatCooldown(cooldownMs)}): ${errorMsg.substring(0, 80)}`);
  } catch (e) {
    console.error("Falha ao marcar chave:", e);
  }
}

async function clearKeyCooldown(keyId: string) {
  try {
    const supabase = createSupabaseAdmin();
    await supabase
      .from("api_keys")
      .update({ ultimo_erro: null })
      .eq("id", keyId);
  } catch (e) {
    console.error("Falha ao limpar cooldown da chave:", e);
  }
}

// ─── Provider registry ──────────────────────────────────────────

type CallFn = (msgs: any[], key: string, mt: number, t: number) => Promise<any>;

const CALL_FNS: Record<string, CallFn> = {
  gemini: callGemini,
  groq: callGroq,
  cerebras: callCerebras,
  openrouter: callOpenRouter,
  mistral: callMistral,
  together: callTogether,
};

const IMAGE_SERVICES = new Set(["gemini"]);
const SERVICE_ORDER = ["cerebras", "openrouter", "groq", "gemini", "mistral", "together"];

// ─── Interleaved round-robin ────────────────────────────────────

interface KeyAttempt { service: string; keyEntry: KeyEntry; }

function buildInterleavedQueue(
  keys: Record<string, KeyEntry[]>,
  hasImages: boolean,
  preferredService?: string,
): KeyAttempt[] {
  const baseServices = hasImages
    ? SERVICE_ORDER.filter(s => IMAGE_SERVICES.has(s))
    : [...SERVICE_ORDER];

  const services = preferredService && baseServices.includes(preferredService)
    ? [preferredService, ...baseServices.filter((service) => service !== preferredService)]
    : baseServices;

  let maxKeys = 0;
  for (const svc of services) {
    const count = keys[svc]?.length || 0;
    if (count > maxKeys) maxKeys = count;
  }

  const queue: KeyAttempt[] = [];
  for (let round = 0; round < maxKeys; round++) {
    for (const svc of services) {
      const svcKeys = keys[svc];
      if (!svcKeys || round >= svcKeys.length) continue;
      queue.push({ service: svc, keyEntry: svcKeys[round] });
    }
  }

  if (queue.length > 1) {
    const offset = Math.floor(Math.random() * queue.length);
    return [...queue.slice(offset), ...queue.slice(0, offset)];
  }

  return queue;
}

// ─── Language enforcement ────────────────────────────────────────

function enforceLanguage(messages: any[]): any[] {
  // We no longer globally enforce Angola variant here. 
  // Language/Context is now managed by the specific module prompts.
  return messages;
}

// ─── Main handler ───────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages: rawMessages, max_tokens = 8000, temperature = 0.7, service } = await req.json();

    if (!rawMessages || !Array.isArray(rawMessages)) {
      return new Response(JSON.stringify({ error: "Parâmetro 'messages' é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages = enforceLanguage(rawMessages);

    const keys = await getApiKeys();
    const hasImages = messages.some((m: any) =>
      Array.isArray(m.content) && m.content.some((p: any) => p.type === "image_url")
    );
    const preferredService = typeof service === "string" && service.trim() ? service.trim().toLowerCase() : undefined;

    const queue = buildInterleavedQueue(keys, hasImages, preferredService);

    if (queue.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma API disponível. Todas as chaves podem estar em cooldown ou sem quota neste momento. Tente novamente em instantes ou adicione novas chaves em /setup-api-keys." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fila${preferredService ? ` (${preferredService} preferido)` : ""}: ${queue.map(q => `${q.service}[${q.keyEntry.id.substring(0,4)}]`).join(" → ")}`);

    let lastError: Error | null = null;

    for (const { service: svc, keyEntry } of queue) {
      if (hasImages && !IMAGE_SERVICES.has(svc)) continue;

      const callFn = CALL_FNS[svc];
      if (!callFn) continue;

      try {
        console.log(`→ ${svc} (${keyEntry.id.substring(0, 8)}...)`);
        const result = await callFn(messages, keyEntry.chave, max_tokens, temperature);

        // Validate non-empty / non-trivial response
        const respText = result?.choices?.[0]?.message?.content || "";
        if (!respText || respText.trim().length < 50) {
          throw new Error(`${svc} returned empty/short response (${respText.length} chars)`);
        }

        await clearKeyCooldown(keyEntry.id);
        console.log(`✓ ${svc} OK (${respText.length} chars)`);

        const tokensUsed = result?.usage?.total_tokens || result?.usage?.completion_tokens || result?.usage?.totalTokens || 0;
        return new Response(JSON.stringify({ ...result, service_used: svc, tokens_used: tokensUsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (caughtError: any) {
        const error = caughtError instanceof Error ? caughtError : new Error(String(caughtError));
        console.error(`✗ ${svc} ${keyEntry.id.substring(0, 8)}...: ${error.message.substring(0, 120)}`);
        lastError = error;

        // Mark key as exhausted — cooldown for 15 min
        await markKeyExhausted(keyEntry.id, error.message);
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
