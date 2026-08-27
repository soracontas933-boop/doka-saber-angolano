import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const HIGGSFIELD_BASE_URL = "https://platform.higgsfield.ai";
const MODELS: Record<string, { type: "image" | "video"; endpoint: string }> = {
  "qwen-image-3": { type: "image", endpoint: "/alibaba/qwen-image-3/text-to-image" },
  "nano-banana-2-lite": { type: "image", endpoint: "/nano-banana-2/lite/text-to-image" },
  "gpt-image-2": { type: "image", endpoint: "/openai/gpt-image-2" },
  "minimax-h3": { type: "video", endpoint: "/minimax/h3/text-to-video" },
  "ltx-2.5-pro": { type: "video", endpoint: "/lightricks/ltx-2.5/text-to-video/pro" },
  "kling-3.0": { type: "video", endpoint: "/kling-video/v3.0/std/text-to-video" },
  "veo-3.1-fast": { type: "video", endpoint: "/veo3.1/fast/text-to-video" },
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getCredentials() {
  const keyPool = Deno.env.get("HF_API_KEYS") || Deno.env.get("HIGGSFIELD_API_KEYS");
  if (keyPool) {
    try {
      const parsed = JSON.parse(keyPool) as Array<{ id?: unknown; secret?: unknown }>;
      const validKeys = parsed.filter((item) => typeof item.id === "string" && typeof item.secret === "string");
      if (validKeys.length > 0) {
        const selected = validKeys[Math.floor(Math.random() * validKeys.length)];
        return `Key ${selected.id}:${selected.secret}`;
      }
    } catch {
      throw new Error("HF_API_KEYS deve ser um JSON válido com pares id/secret.");
    }
  }

  const keyId = Deno.env.get("HF_API_KEY_ID") || Deno.env.get("HIGGSFIELD_API_KEY_ID");
  const keySecret = Deno.env.get("HF_API_KEY_SECRET") || Deno.env.get("HIGGSFIELD_API_KEY_SECRET");
  if (!keyId || !keySecret) throw new Error("Higgsfield API não configurada no servidor.");
  return `Key ${keyId}:${keySecret}`;
}

function safeError(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail.slice(0, 300);
  }
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string") return error.slice(0, 300);
  }
  return fallback;
}

async function higgsfieldFetch(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: getCredentials(),
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return json({ error: safeError(payload, `Higgsfield respondeu com HTTP ${response.status}.`), provider_status: response.status }, response.status);
  }
  return json(payload, response.status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authorization = req.headers.get("Authorization");
    if (!supabaseUrl || !anonKey || !authorization) return json({ error: "Sessão não autenticada." }, 401);

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) return json({ error: "Sessão não autenticada." }, 401);

    const body = await req.json();
    const action = body?.action || "submit";

    if (action === "submit") {
      const model = MODELS[body?.model];
      const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
      if (!model) return json({ error: "Modelo Higgsfield não permitido." }, 400);
      if (body?.type !== model.type) return json({ error: "O modelo não corresponde ao tipo de mídia." }, 400);
      if (!prompt || prompt.length > 4000) return json({ error: "O prompt deve ter entre 1 e 4000 caracteres." }, 400);

      // Mantemos o payload mínimo e compatível com os schemas dos modelos.
      return await higgsfieldFetch(`${HIGGSFIELD_BASE_URL}${model.endpoint}`, {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });
    }

    if (action === "status") {
      if (typeof body?.status_url !== "string" || !body.status_url.startsWith(`${HIGGSFIELD_BASE_URL}/requests/`)) {
        return json({ error: "URL de estado inválida." }, 400);
      }
      return await higgsfieldFetch(body.status_url, { method: "GET" });
    }

    if (action === "cancel") {
      if (typeof body?.cancel_url !== "string" || !body.cancel_url.startsWith(`${HIGGSFIELD_BASE_URL}/requests/`)) {
        return json({ error: "URL de cancelamento inválida." }, 400);
      }
      return await higgsfieldFetch(body.cancel_url, { method: "POST", body: JSON.stringify({}) });
    }

    return json({ error: "Ação desconhecida." }, 400);
  } catch (error) {
    console.error("higgsfield-media", error);
    return json({ error: error instanceof Error ? error.message : "Erro inesperado na integração Higgsfield." }, 500);
  }
});
