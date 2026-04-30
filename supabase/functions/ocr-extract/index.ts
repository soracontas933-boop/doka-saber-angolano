import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

interface ApiKey { servico: string; chave: string; }

async function getAllApiKeys(): Promise<ApiKey[]> {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await supabase.from("api_keys").select("servico, chave").eq("ativo", true);
  return data || [];
}

const OCR_PROMPT = `Você é um OCR especializado. Extraia TODO o texto visível nesta imagem com máxima fidelidade. A imagem pode conter texto manuscrito (escrito à mão), impresso, digitado ou misto. Transcreva exactamente o que está escrito, incluindo títulos, parágrafos, listas, fórmulas, tabelas e anotações. Se o texto estiver em português, mantenha em português. Retorne APENAS o texto extraído, sem formatação JSON, sem comentários adicionais. Se não conseguir ler alguma parte, indique [ilegível].`;

const DOC_PROMPT = `Extraia TODO o texto deste documento com máxima fidelidade. Mantenha a estrutura original: títulos, parágrafos, listas, tabelas, notas de rodapé. Se o texto estiver em português, mantenha em português. Retorne APENAS o texto extraído, sem comentários adicionais. Preserve a formatação e hierarquia do conteúdo.`;

async function ocrWithGemini(image_base64: string, mime_type: string, apiKey: string, prompt: string): Promise<string> {
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

  const res = await fetch(`${GEMINI_URL}/gemini-2.0-flash:generateContent?key=${apiKey}`, {
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image_base64, mime_type = "image/jpeg", is_document = false } = await req.json();

    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Limita tamanho do payload para evitar WORKER_RESOURCE_LIMIT (memória)
    // ~6MB de base64 ≈ 4.5MB de ficheiro original
    const MAX_BASE64_LEN = 6 * 1024 * 1024;
    if (image_base64.length > MAX_BASE64_LEN) {
      return new Response(JSON.stringify({
        error: `Ficheiro muito grande (${(image_base64.length / 1024 / 1024).toFixed(1)}MB). Máximo ~4.5MB. Comprime ou reduz a resolução.`
      }), { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const allKeys = await getAllApiKeys();
    const promptToUse = is_document ? DOC_PROMPT : OCR_PROMPT;

    // Limita a 2 chaves por provider para não estourar CPU/memória da edge function
    const MAX_KEYS_PER_PROVIDER = 2;
    const geminiKeys = allKeys.filter(k => k.servico === "gemini").map(k => k.chave).slice(0, MAX_KEYS_PER_PROVIDER);
    const groqKeys = allKeys.filter(k => k.servico === "groq").map(k => k.chave).slice(0, MAX_KEYS_PER_PROVIDER);

    const providers: Array<{ name: string; fn: () => Promise<string> }> = [];
    for (const key of geminiKeys) {
      providers.push({ name: `gemini`, fn: () => ocrWithGemini(image_base64, mime_type, key, promptToUse) });
    }
    for (const key of groqKeys) {
      providers.push({ name: `groq-vision`, fn: () => ocrWithGroq(image_base64, mime_type, key, promptToUse) });
    }

    if (providers.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma chave de OCR configurada. Adicione Gemini ou Groq em /setup-api-keys." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let lastError: Error | null = null;
    for (const provider of providers) {
      try {
        console.log(`OCR: trying ${provider.name}...`);
        const text = await provider.fn();
        if (text && text.trim().length > 0) {
          console.log(`OCR: success with ${provider.name} (${text.length} chars)`);
          return new Response(JSON.stringify({ text }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        console.warn(`OCR: ${provider.name} returned empty text, trying next...`);
      } catch (e: any) {
        console.error(`OCR ${provider.name} failed:`, e.message);
        lastError = e;
      }
    }

    const is429 = lastError?.message?.includes("429");
    return new Response(
      JSON.stringify({ error: is429 ? "Limite de requisições excedido. Tente novamente em alguns segundos." : lastError?.message || "Erro OCR" }),
      { status: is429 ? 429 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ocr-extract error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
