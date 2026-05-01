// Gera sub-itens (sub-ramos) ou ramos completos para um nó de mapa mental.
// Usa Lovable AI Gateway via tool calling para obter saída estruturada.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ExpandRequest {
  central: string;
  nodeLabel: string;
  context?: string[];
  // "subitems" — gera 4-6 itens curtos para um ramo
  // "branches" — gera 4-6 ramos novos para o tema central
  mode: "subitems" | "branches";
  count?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ExpandRequest;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const count = Math.max(2, Math.min(8, body.count || 5));

    const system = `Tu és uma IA pedagógica angolana especializada em mapas mentais.
Geras conteúdo curto, claro e em Português de Angola, alinhado ao currículo INIDE.
Cada item deve ter no máximo 8 palavras. Sem markdown, sem bullets, sem aspas.`;

    const prompt =
      body.mode === "subitems"
        ? `Tema central: "${body.central}"
Ramo a expandir: "${body.nodeLabel}"
${body.context && body.context.length ? `Itens já existentes: ${body.context.join("; ")}` : ""}
Gera ${count} sub-itens NOVOS, complementares, sem repetir os existentes.`
        : `Tema central: "${body.central}"
Gera ${count} ramos principais, cada um com um título curto (máx. 4 palavras) e 4 sub-itens curtos.`;

    const tools =
      body.mode === "subitems"
        ? [
            {
              type: "function",
              function: {
                name: "return_subitems",
                description: "Retorna sub-itens curtos para o ramo.",
                parameters: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: { type: "string" },
                      minItems: 2,
                      maxItems: 8,
                    },
                  },
                  required: ["items"],
                  additionalProperties: false,
                },
              },
            },
          ]
        : [
            {
              type: "function",
              function: {
                name: "return_branches",
                description: "Retorna ramos com sub-itens.",
                parameters: {
                  type: "object",
                  properties: {
                    branches: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          items: {
                            type: "array",
                            items: { type: "string" },
                            minItems: 2,
                            maxItems: 6,
                          },
                        },
                        required: ["label", "items"],
                        additionalProperties: false,
                      },
                      minItems: 2,
                      maxItems: 8,
                    },
                  },
                  required: ["branches"],
                  additionalProperties: false,
                },
              },
            },
          ];

    const toolName =
      body.mode === "subitems" ? "return_subitems" : "return_branches";

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
          tools,
          tool_choice: { type: "function", function: { name: toolName } },
        }),
      },
    );

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiados pedidos, tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Sem créditos disponíveis." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Erro na geração IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await aiResp.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments
      ? JSON.parse(call.function.arguments)
      : {};

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("mind-map-ai error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
