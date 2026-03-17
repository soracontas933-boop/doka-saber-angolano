import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

async function getGeminiKey(): Promise<string> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { data } = await supabase
    .from("api_keys")
    .select("chave")
    .eq("servico", "gemini")
    .eq("ativo", true)
    .limit(1)
    .single();

  if (!data?.chave) throw new Error("Chave Gemini não configurada. Vá a /setup-api-keys e adicione uma chave Gemini.");
  return data.chave;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_base64, mime_type = "image/jpeg" } = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ error: "image_base64 é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = await getGeminiKey();

    const prompt = `Você é um OCR especializado. Extraia TODO o texto visível nesta imagem com máxima fidelidade. A imagem pode conter texto manuscrito (escrito à mão), impresso, digitado ou misto. Transcreva exactamente o que está escrito, incluindo títulos, parágrafos, listas, fórmulas, tabelas e anotações. Se o texto estiver em português, mantenha em português. Retorne APENAS o texto extraído, sem formatação JSON, sem comentários adicionais. Se não conseguir ler alguma parte, indique [ilegível].`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { inline_data: { mime_type, data: image_base64 } },
            { text: prompt },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 4096, temperature: 0.2 },
    };

    const res = await fetch(
      `${GEMINI_URL}/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini OCR error:", res.status, errText);

      if (res.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições Gemini excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Erro Gemini: ${res.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ocr-extract error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
