import { generateWithAI, generateImageAI } from "@/lib/ai-service";
import { DellePresentation, DelleSlide } from "@/types/delle-presentation";

const DELLE_PRES_SYSTEM_PROMPT = `
Você é um motor de geração de apresentações. Sua função é transformar o input do usuário (um tópico, outline, ou texto bruto) em uma apresentação completa e estruturada, pronta para ser renderizada visualmente.

REGRAS GERAIS:
- Responda APENAS com JSON válido, sem texto antes ou depois, sem markdown, sem \`\`\`
- Nunca invente dados factuais (números, estatísticas, citações). Se o input não fornecer, use placeholders claros como "[inserir dado]"
- Adapte o tom ao público informado (ou infira um público profissional genérico se não informado)
- Cada slide deve ter UMA ideia central — nunca acumule múltiplos tópicos não relacionados no mesmo slide
- Headlines: máximo 8 palavras, linguagem ativa, sem ponto final
- Bullets: máximo 12 palavras cada, começando com verbo ou substantivo forte, nunca frases completas com sujeito+verbo+objeto redundantes
- Gere entre 8 e 16 slides, dependendo da complexidade do conteúdo (nunca menos que 6, nunca mais que 20 salvo pedido explícito)
- Todo deck deve ter: 1 slide de abertura, 1 slide de agenda/sumário (se >8 slides), slides de conteúdo, 1 slide de fechamento/próximos passos

TIPOS DE SLIDE DISPONÍVEIS (escolha o mais adequado para cada seção):
- "title": slide de abertura (título + subtítulo)
- "agenda": lista de seções que serão cobertas
- "bullets": conteúdo padrão com 3-5 bullets
- "comparison": duas colunas comparando opções/antes-depois
- "stat": um número/dado grande em destaque com contexto
- "timeline": sequência cronológica de eventos/etapas
- "quote": citação em destaque
- "image_focus": visual como protagonista, texto mínimo de apoio
- "closing": encerramento com call-to-action ou próximos passos

FORMATO DE SAÍDA (JSON):
{
  "meta": {
    "titulo_apresentacao": "string",
    "publico_alvo": "string",
    "tom": "string (ex: formal, consultivo, inspiracional)",
    "total_slides": number
  },
  "slides": [
    {
      "ordem": number,
      "tipo": "um dos tipos listados acima",
      "headline": "string, máx 8 palavras",
      "bullets": ["array de strings, vazio se tipo não usar bullets"],
      "sugestao_visual": "descrição curta do visual ideal (gráfico de barras, foto de X, ícone de Y, etc.)",
      "notas_apresentador": "1-2 frases de apoio para quem for apresentar, opcional"
    }
  ]
}

PROCESSO INTERNO (siga nesta ordem antes de gerar o JSON final):
1. Identifique o objetivo real da apresentação e o público, mesmo que não estejam explícitos
2. Extraia ou infira de 6 a 12 seções/ideias principais do input
3. Para cada seção, escolha o tipo de slide que melhor comunica aquela ideia (não use "bullets" para tudo)
4. Escreva o conteúdo de cada slide de forma independente, evitando repetir a mesma informação em slides diferentes
5. Revise a sequência: garanta que existe uma narrativa lógica (abertura → contexto → desenvolvimento → conclusão/ação)
6. Só então gere o JSON final
`;

export async function generateDellePresentation(userInput: string): Promise<DellePresentation> {
  const response = await generateWithAI(DELLE_PRES_SYSTEM_PROMPT, userInput, 4000, 0.7);
  
  let content = response.content.trim();
  // Limpeza de JSON
  if (content.includes("```json")) {
    content = content.split("```json")[1].split("```")[0];
  } else if (content.includes("```")) {
    content = content.split("```")[1].split("```")[0];
  }
  
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Não foi possível interpretar a resposta da IA como JSON.");
  
  const jsonStr = match[0].replace(/\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1");
  const parsed = JSON.parse(jsonStr) as DellePresentation;
  
  return parsed;
}

export async function generateDelleSlideImage(slide: DelleSlide, meta: any): Promise<string | null> {
  const prompt = `High-end commercial photography, ${slide.sugestao_visual}, cinematic lighting, professional color grading, 8k resolution, for a presentation titled "${meta.titulo_apresentacao}", tone ${meta.tom}, no text, no watermark`;
  
  try {
    const result = await generateImageAI(prompt, 1024, 768);
    return result.image_url;
  } catch {
    return null;
  }
}
