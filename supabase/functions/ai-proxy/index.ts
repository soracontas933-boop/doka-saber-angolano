import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { servico, payload } = await req.json();

    if (!servico || !payload) {
      return new Response(
        JSON.stringify({ error: "Parâmetros 'servico' e 'payload' são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get API key from database using service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: keyData, error: keyError } = await supabase
      .from("api_keys")
      .select("chave")
      .eq("servico", servico)
      .eq("ativo", true)
      .single();

    if (keyError || !keyData) {
      console.error("API key not found for service:", servico, keyError);
      return new Response(
        JSON.stringify({ error: `Chave API não encontrada para o serviço: ${servico}. Configure no painel admin.` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = keyData.chave;

    let url: string;
    let headers: Record<string, string>;
    let body: string;

    switch (servico) {
      case "gemini":
        url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        headers = { "Content-Type": "application/json" };
        body = JSON.stringify(payload);
        break;

      case "groq":
        url = "https://api.groq.com/openai/v1/chat/completions";
        headers = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };
        body = JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: payload.temperature ?? 0.7,
          max_tokens: payload.max_tokens ?? 8000,
          messages: payload.messages,
        });
        break;

      case "openrouter":
        url = "https://openrouter.ai/api/v1/chat/completions";
        headers = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://doka.app",
          "X-Title": "DOKA Educational App",
        };
        body = JSON.stringify({
          model: "mistralai/mistral-small-3.1-24b-instruct:free",
          messages: payload.messages,
          max_tokens: payload.max_tokens ?? 4000,
          temperature: payload.temperature ?? 0.5,
        });
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Serviço desconhecido: ${servico}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`Calling ${servico} API...`);
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`${servico} API error [${response.status}]:`, JSON.stringify(result));
      return new Response(
        JSON.stringify({
          error: `Erro na API ${servico}`,
          status: response.status,
          details: result,
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-proxy error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
