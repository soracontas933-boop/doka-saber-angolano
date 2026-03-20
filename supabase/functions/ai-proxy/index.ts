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

// Self-hosted endpoint (OpenAI-compatible API format)
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
      "HTTP-Referer": "https://doka-angola-smart-learn.lovable.app",
      "X-Title": "DOKA Angola",
    },
    body: JSON.stringify({ model: "deepseek/deepseek-chat-v3-0324:free", messages, max_tokens: maxTokens, temperature }),
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

async function callWithRetry(fn: () => Promise<any>, retries = 2, delay = 2000): Promise<any> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (i === retries || !e.message?.includes("429")) throw e;
      console.log(`Rate limited, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

// Round-robin state
let lastServiceIndex = 0;

async function getApiKeys() {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await supabase.from("api_keys").select("servico, chave").eq("ativo", true);
  const keys: Record<string, string> = {};
  for (const row of data || []) keys[row.servico] = row.chave;
  return keys;
}

function getServiceOrder(keys: Record<string, string>, hasImages: boolean, preferredService?: string): string[] {
  const textServices = ["selfhosted", "cerebras", "groq", "together", "openrouter", "gemini"];
  const imageServices = ["gemini"];

  if (preferredService) {
    const base = hasImages ? imageServices : textServices;
    return [preferredService, ...base.filter((s) => s !== preferredService)];
  }

  if (hasImages) return imageServices;

  const available = textServices.filter((s) => keys[s]);
  if (available.length === 0) return textServices;

  lastServiceIndex = (lastServiceIndex + 1) % available.length;
  return [...available.slice(lastServiceIndex), ...available.slice(0, lastServiceIndex)];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, max_tokens = 8000, temperature = 0.7, service } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Parâmetro 'messages' é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const keys = await getApiKeys();
    const hasImages = messages.some((m: any) =>
      Array.isArray(m.content) && m.content.some((p: any) => p.type === "image_url")
    );

    const servicePriority = getServiceOrder(keys, hasImages, service);
    let lastError: Error | null = null;

    for (const svc of servicePriority) {
      const key = keys[svc];
      if (!key) continue;

      try {
        console.log(`Trying ${svc}...`);
        let result;
        switch (svc) {
          case "selfhosted":
            if (hasImages) continue;
            result = await callWithRetry(() => callSelfHosted(messages, key, max_tokens, temperature));
            break;
          case "groq":
            if (hasImages) continue;
            result = await callWithRetry(() => callGroq(messages, key, max_tokens, temperature));
            break;
          case "openrouter":
            if (hasImages) continue;
            result = await callWithRetry(() => callOpenRouter(messages, key, max_tokens, temperature));
            break;
          case "gemini":
            result = await callWithRetry(() => callGemini(messages, key, max_tokens, temperature));
            break;
          case "cerebras":
            if (hasImages) continue;
            result = await callWithRetry(() => callCerebras(messages, key, max_tokens, temperature));
            break;
          case "together":
            if (hasImages) continue;
            result = await callWithRetry(() => callTogether(messages, key, max_tokens, temperature));
            break;
          default:
            continue;
        }
        console.log(`Success with ${svc}`);
        // Inject service info into response
        const tokensUsed = result?.usage?.total_tokens || result?.usage?.completion_tokens || 0;
        const enriched = { ...result, service_used: svc, tokens_used: tokensUsed };
        return new Response(JSON.stringify(enriched), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e: any) {
        console.error(`${svc} failed:`, e.message);
        lastError = e;
      }
    }

    return new Response(
      JSON.stringify({ error: lastError?.message || "Nenhuma API disponível. Configure suas chaves em /setup-api-keys." }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-proxy error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
