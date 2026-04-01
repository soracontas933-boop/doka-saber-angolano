import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const MODELS = [
  "google/gemini-3.1-flash-image-preview",
  "google/gemini-2.5-flash-image",
  "google/gemini-3-pro-image-preview",
];

function pollinationsUrl(prompt: string, width: number, height: number): string {
  const seed = Math.floor(Math.random() * 99999);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, style = "realista", width = 800, height = 600 } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback to Pollinations if no API key
      return new Response(JSON.stringify({ url: pollinationsUrl(prompt, width, height), provider: "pollinations" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const styleMap: Record<string, string> = {
      realista: "photorealistic, high quality, detailed",
      ilustracao: "educational illustration, colorful, flat design, infographic style",
      diagrama: "scientific diagram, labeled, clean lines, technical illustration",
      minimalista: "minimalist, simple shapes, clean design, modern",
    };
    const styleDesc = styleMap[style] || styleMap.realista;

    const fullPrompt = `Generate an educational image: ${prompt}. Style: ${styleDesc}. The image should be suitable for a school academic paper. No text or watermarks in the image.`;

    // Try each Lovable AI model
    for (const model of MODELS) {
      try {
        console.log(`Trying image generation with ${model}...`);
        const response = await fetch(GATEWAY_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: fullPrompt }],
            modalities: ["image", "text"],
          }),
        });

        if (response.status === 429 || response.status === 402) {
          console.warn(`${model} rate limited (${response.status}), trying next...`);
          continue;
        }

        if (!response.ok) {
          console.warn(`${model} failed (${response.status}), trying next...`);
          continue;
        }

        const data = await response.json();
        const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (imageUrl) {
          console.log(`Image generated successfully with ${model}`);
          return new Response(JSON.stringify({ url: imageUrl, provider: model }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        console.warn(`${model} returned no image, trying next...`);
      } catch (e) {
        console.error(`${model} error:`, e);
        continue;
      }
    }

    // Fallback: Pollinations
    console.log("All AI models failed, falling back to Pollinations");
    return new Response(JSON.stringify({ url: pollinationsUrl(prompt, width, height), provider: "pollinations" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("image-proxy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
