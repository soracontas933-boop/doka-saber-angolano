import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const TOGETHER_URL = "https://api.together.xyz/v1/chat/completions";

async function callSelfHosted(messages: any[], apiKey: string, maxTokens: number, temperature: number) {
  const [url, token] = apiKey.split("|");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url.trim(), {
    method: "POST",
    headers,
    body: JSON.stringify({ model: "default", messages, max_tokens: maxTokens, temperature }),
  });

  if (!res.ok) throw new Error(`Self-hosted error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function callGroq(messages: any[], apiKey: string, maxTokens: number, temperature: number) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages, max_tokens: maxTokens, temperature }),
  });

  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function callOpenRouter(messages: any[], apiKey: string, maxTokens: number, temperature: number) {
  const res = await fetch(OPENROUTER_URL, {
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
    .filter((message: any) => message.role !== "system")
    .map((message: any) => {
      if (typeof message.content === "string") {
        return { role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] };
      }

      const parts: any[] = [];
      for (const part of message.content) {
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

  const systemInstruction = messages.find((message: any) => message.role === "system");
  const body: any = { contents, generationConfig: { maxOutputTokens: maxTokens, temperature } };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction.content }] };

  const res = await fetch(`${GEMINI_URL}/gemini-2.0-flash:generateContent?key=${apiKey}`, {
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
  const res = await fetch(CEREBRAS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "llama-3.3-70b", messages, max_tokens: maxTokens, temperature }),
  });

  if (!res.ok) throw new Error(`Cerebras error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function callTogether(messages: any[], apiKey: string, maxTokens: number, temperature: number) {
  const res = await fetch(TOGETHER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free", messages, max_tokens: maxTokens, temperature }),
  });

  if (!res.ok) throw new Error(`Together error ${res.status}: ${await res.text()}`);
  return res.json();
}

function isRetryableError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return msg.includes("429") || msg.includes("401") || msg.includes("403")
    || msg.includes("400") || msg.includes("rate limit") || msg.includes("quota")
    || msg.includes("exceeded") || msg.includes("too many")
    || msg.includes("wrong_api_key") || msg.includes("invalid");
}

let roundRobinIndex = 0;

interface KeyEntry {
  id: string;
  chave: string;
  prioridade: number;
}

const ENV_FALLBACKS: Array<{ service: string; envName: string }> = [
  { service: "groq", envName: "groq" },
  { service: "gemini", envName: "googleiaestudio" },
  { service: "cerebras", envName: "Cerebras" },
  { service: "openrouter", envName: "OpenRouter" },
];

function isDatabaseKeyId(keyId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(keyId);
}

async function getApiKeys(): Promise<Record<string, KeyEntry[]>> {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, servico, chave, prioridade, ultimo_erro")
    .eq("ativo", true)
    .or(`ultimo_erro.is.null,ultimo_erro.lt.${sixHoursAgo}`)
    .order("prioridade", { ascending: true });

  if (error) {
    console.error("Failed to load database API keys:", error.message);
  }

  const keys: Record<string, KeyEntry[]> = {};

  for (const row of data || []) {
    if (!keys[row.servico]) keys[row.servico] = [];
    keys[row.servico].push({
      id: row.id,
      chave: row.chave,
      prioridade: row.prioridade ?? 0,
    });
  }

  for (const { service, envName } of ENV_FALLBACKS) {
    const envKey = Deno.env.get(envName)?.trim();
    if (!envKey) continue;

    if (!keys[service]) keys[service] = [];

    const alreadyExists = keys[service].some((entry) => entry.chave === envKey);
    if (!alreadyExists) {
      keys[service].push({
        id: `env-${service}-${keys[service].length}`,
        chave: envKey,
        prioridade: 999,
      });
    }

    keys[service].sort((a, b) => a.prioridade - b.prioridade);
  }

  return keys;
}

async function markKeyExhausted(keyId: string) {
  if (!isDatabaseKeyId(keyId)) return;

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabase.from("api_keys").update({ ultimo_erro: new Date().toISOString() }).eq("id", keyId);
  } catch (error) {
    console.error("Failed to mark key exhausted:", error);
  }
}

function getCallFn(svc: string): ((msgs: any[], key: string, mt: number, t: number) => Promise<any>) | null {
  switch (svc) {
    case "selfhosted":
      return callSelfHosted;
    case "groq":
      return callGroq;
    case "openrouter":
      return callOpenRouter;
    case "gemini":
      return callGemini;
    case "cerebras":
      return callCerebras;
    case "together":
      return callTogether;
    default:
      return null;
  }
}

function supportsImages(svc: string): boolean {
  return svc === "gemini";
}

function getServiceOrder(keys: Record<string, KeyEntry[]>, hasImages: boolean, preferredService?: string): string[] {
  const textServices = ["selfhosted", "cerebras", "groq", "together", "openrouter", "gemini"];
  const imageServices = ["gemini"];

  if (preferredService) {
    const base = hasImages ? imageServices : textServices;
    return [preferredService, ...base.filter((svc) => svc !== preferredService)];
  }

  if (hasImages) return imageServices;

  const available = textServices.filter((svc) => keys[svc]?.length > 0);
  if (available.length === 0) return textServices;

  roundRobinIndex = (roundRobinIndex + 1) % available.length;
  return [...available.slice(roundRobinIndex), ...available.slice(0, roundRobinIndex)];
}

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
    const hasImages = messages.some((message: any) =>
      Array.isArray(message.content) && message.content.some((part: any) => part.type === "image_url")
    );

    const servicePriority = getServiceOrder(keys, hasImages, service);
    let lastError: Error | null = null;

    for (const svc of servicePriority) {
      const svcKeys = keys[svc];
      if (!svcKeys || svcKeys.length === 0) continue;
      if (hasImages && !supportsImages(svc)) continue;

      const callFn = getCallFn(svc);
      if (!callFn) continue;

      for (const keyEntry of svcKeys) {
        try {
          console.log(`Trying ${svc} (key ${keyEntry.id.substring(0, 8)}...)...`);
          const result = await callFn(messages, keyEntry.chave, max_tokens, temperature);
          console.log(`Success with ${svc} (key ${keyEntry.id.substring(0, 8)}...)`);

          const tokensUsed = result?.usage?.total_tokens || result?.usage?.completion_tokens || 0;
          return new Response(JSON.stringify({ ...result, service_used: svc, tokens_used: tokensUsed }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (caughtError: any) {
          const error = caughtError instanceof Error ? caughtError : new Error(String(caughtError));
          console.error(`${svc} key ${keyEntry.id.substring(0, 8)}... failed:`, error.message);
          lastError = error;

          if (isRetryableError(error)) {
            await markKeyExhausted(keyEntry.id);
            console.log(`Key ${keyEntry.id.substring(0, 8)}... marked as exhausted, trying next...`);
          } else {
            console.log(`Skipping failed ${svc} key ${keyEntry.id.substring(0, 8)}... and trying next option...`);
          }

          continue;
        }
      }
    }

    return new Response(
      JSON.stringify({ error: lastError?.message || "Nenhuma API disponível. Configure suas chaves em /setup-api-keys." }),
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
