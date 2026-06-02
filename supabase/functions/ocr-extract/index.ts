import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  KeyEntry,
  getCooldownMs,
  formatCooldown,
  getHealthyKeys,
  getKeyHealthStats,
} from "../api-key-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const OCR_PROMPT = `Você é um OCR especializado. Extraia TODO o texto visível nesta imagem com máxima fidelidade. A imagem pode conter texto manuscrito (escrito à mão), impresso, digitado ou misto. Transcreva exactamente o que está escrito, incluindo títulos, parágrafos, listas, fórmulas, tabelas e anotações. Se o texto estiver em português, mantenha em português. Retorne APENAS o texto extraído, sem formatação JSON, sem comentários adicionais. Se não conseguir ler alguma parte, indique [ilegível].`;

const DOC_PROMPT = `Extraia TODO o texto deste documento com máxima fidelidade. Mantenha a estrutura original: títulos, parágrafos, listas, tabelas, notas de rodapé. Se o texto estiver em português, mantenha em português. Retorne APENAS o texto extraído, sem comentários adicionais. Preserve a formatação e hierarquia do conteúdo.`;

// ─── Key management ────────────────────────────────────────────

function createSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getOcrApiKeys(): Promise<KeyEntry[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, servico, chave, prioridade, ultimo_erro")
    .eq("ativo", true)
    .in("servico", ["gemini", "groq"])
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
    console.log(`⏸ OCR key ${keyId.substring(0, 8)}... em cooldown (${formatCooldown(cooldownMs)}): ${errorMsg.substring(0, 80)}`);
  } catch (e) {
    console.error("Falha ao marcar chave OCR:", e);
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
    console.error("Falha ao limpar cooldown da chave OCR:", e);
  }
}

// ─── OCR providers ─────────────────────────────────────────────

async function ocrWithGemini(image_base64: string, mime_type: string, apiKey: string, prompt: string): Promise<string> {
  const isPdf = mime_type === "application/pdf" || mime_type.includes("pdf");
  const model = isPdf ? "gemini-2.5-flash" : "gemini-2.0-flash";
  const body = {
    contents: [{
      role: "user",
      parts: [
        { inline_data: { mime_type, data: image_base64 } },
        { text: prompt },
      ],
    }],
    generationConfig: { maxOutputTokens: 8192, temperature: 0.2 },
  };

  const res = await fetch(`${GEMINI_URL}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini OCR error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function ocrWithGroq(image_base64: string, mime_type: string, apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${mime_type};base64,${image_base64}` } },
          { type: "text", text: prompt },
        ],
      }],
      max_tokens: 8192,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq Vision error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

// ─── Main handler ──────────────────────────────────────────────

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

    const { image_base64, mime_type = "image/jpeg", is_document = false } = await req.json();

    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Limita tamanho do payload para evitar WORKER_RESOURCE_LIMIT (memória)
    const MAX_BASE64_LEN = 14 * 1024 * 1024;
    if (image_base64.length > MAX_BASE64_LEN) {
      return new Response(JSON.stringify({
        error: `Ficheiro muito grande (${(image_base64.length * 0.75 / 1024 / 1024).toFixed(1)}MB). Máximo 10MB. Reduz a resolução ou divide o documento.`
      }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const allKeys = await getOcrApiKeys();
    const now = Date.now();
    const stats = getKeyHealthStats(allKeys, now);

    console.log(`📊 Saúde das chaves OCR: ${stats.healthy}/${stats.total} saudáveis`);
    for (const [svc, svcStats] of Object.entries(stats.byService)) {
      console.log(`  ${svc}: ${svcStats.healthy}/${svcStats.total} saudáveis`);
    }

    const promptToUse = is_document ? DOC_PROMPT : OCR_PROMPT;
    const isPdf = mime_type === "application/pdf" || mime_type.includes("pdf");

    // Seleciona chaves saudáveis, priorizando Gemini para PDFs
    const healthyKeys = getHealthyKeys(allKeys, now);
    const geminiKeys = healthyKeys.filter(k => k.servico === "gemini");
    const groqKeys = healthyKeys.filter(k => k.servico === "groq");

    // Consumo mínimo: apenas 1 chave por provedor disponível
    const selectedGemini = geminiKeys.slice(0, 1);
    const selectedGroq = isPdf ? [] : groqKeys.slice(0, 1);

    const providers: Array<{ name: string; keyId: string; fn: () => Promise<string> }> = [];

    for (const key of selectedGemini) {
      providers.push({
        name: "gemini",
        keyId: key.id,
        fn: () => ocrWithGemini(image_base64, mime_type, key.chave, promptToUse)
      });
    }

    for (const key of selectedGroq) {
      providers.push({
        name: "groq-vision",
        keyId: key.id,
        fn: () => ocrWithGroq(image_base64, mime_type, key.chave, promptToUse)
      });
    }

    if (providers.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma chave de OCR disponível. Todas podem estar em cooldown. Tente novamente em alguns minutos ou adicione novas chaves em /setup-api-keys." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`🔄 Fila OCR: ${providers.slice(0, 3).map(p => `${p.name}[${p.keyId.substring(0,4)}]`).join(" → ")}${providers.length > 3 ? "..." : ""}`);

    let lastError: Error | null = null;

    for (const provider of providers) {
      try {
        console.log(`→ ${provider.name} (${provider.keyId.substring(0, 8)}...)`);
        const text = await provider.fn();

        if (text && text.trim().length > 0) {
          await clearKeyCooldown(provider.keyId);
          console.log(`✓ ${provider.name} OK (${text.length} chars)`);
          return new Response(JSON.stringify({ text }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        console.warn(`⚠️ ${provider.name} retornou texto vazio, tentando próxima...`);
        lastError = new Error(`${provider.name} returned empty text`);
      } catch (e: any) {
        const error = e instanceof Error ? e : new Error(String(e));
        console.error(`✗ ${provider.name} ${provider.keyId.substring(0, 8)}...: ${error.message.substring(0, 120)}`);
        lastError = error;
        await markKeyExhausted(provider.keyId, error.message);
      }
    }

    const is429 = lastError?.message?.includes("429");
    return new Response(
      JSON.stringify({ error: is429 ? "Limite de requisições excedido. Tente novamente em alguns segundos." : lastError?.message || "Erro OCR" }),
      { status: is429 ? 429 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ocr-extract error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
