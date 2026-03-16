import { supabase } from "@/integrations/supabase/client";

// ─── AI Proxy Call ───────────────────────────────────────────────
async function callAIProxy(servico: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("ai-proxy", {
    body: { servico, payload },
  });

  if (error) throw new Error(`Erro ao chamar ${servico}: ${error.message}`);
  if (data?.error) throw new Error(data.error);
  return data;
}

// ─── Gemini Vision (OCR de fotos) ────────────────────────────────
export async function extractTextFromImage(base64: string, mimeType = "image/jpeg"): Promise<string> {
  const payload = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64,
            },
          },
          {
            text: `Você é um assistente educacional angolano especializado no sistema de ensino de Angola (INIDE). Analise esta imagem de caderno escolar (pode ser manuscrito ou digitalizado). Extraia TODO o conteúdo visível com máxima fidelidade. Retorne em JSON estruturado: { "tema": "string", "subtemas": ["string"], "conceitos_chave": ["string"], "conteudo_completo": "string", "disciplina_detectada": "string", "nivel_detectado": "string" }`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  };

  const result = await callAIProxy("gemini", payload);
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return text;
}

// Batch extract from multiple images
export async function extractTextFromImages(files: File[]): Promise<string[]> {
  const results: string[] = [];

  for (const file of files) {
    const base64 = await fileToBase64(file);
    const mimeType = file.type || "image/jpeg";
    try {
      const text = await extractTextFromImage(base64, mimeType);
      results.push(text);
    } catch (err) {
      console.error("Erro ao extrair texto da imagem:", err);
      results.push("");
    }
  }

  return results;
}

// ─── Groq (Geração de Conteúdo Principal) ────────────────────────
export async function generateWithGroq(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 8000,
  temperature = 0.7
): Promise<string> {
  const payload = {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature,
  };

  const result = await callAIProxy("groq", payload);
  return result?.choices?.[0]?.message?.content || "";
}

// ─── OpenRouter (Fallback / Revisão) ─────────────────────────────
export async function reviewWithOpenRouter(
  content: string,
  maxTokens = 4000
): Promise<string> {
  const payload = {
    messages: [
      {
        role: "system",
        content:
          "Você é um revisor educacional angolano. Recebe conteúdo gerado e melhora a coerência, corrige erros, adapta ao contexto angolano e complementa partes incompletas.",
      },
      {
        role: "user",
        content: `Revisa e complementa este conteúdo educacional angolano, mantendo a estrutura:\n\n${content}`,
      },
    ],
    max_tokens: maxTokens,
    temperature: 0.5,
  };

  try {
    const result = await callAIProxy("openrouter", payload);
    return result?.choices?.[0]?.message?.content || content;
  } catch {
    // Fallback: return original content if OpenRouter fails
    console.warn("OpenRouter fallback: retornando conteúdo original");
    return content;
  }
}

// ─── Pollinations (Imagens Gratuitas) ────────────────────────────
export function generateImageUrl(prompt: string, width = 800, height = 600): string {
  const seed = Math.floor(Math.random() * 99999);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`;
}

export const imagePrompts = {
  capaTrabaho: (titulo: string, disciplina: string) =>
    `Educational cover page illustration for school assignment about ${titulo}, subject ${disciplina}, Angola education system, minimalist design, blue and white colors, clean academic style, no text`,
  resumo: (tema: string) =>
    `Simple educational illustration representing ${tema}, colorful diagram style, memory aid visual, Angola school context, flat design, bright colors`,
  flashcard: (conceito: string) =>
    `Simple iconic illustration for memorization of concept '${conceito}', flat design, minimal, educational, blue tones, clear and clean`,
  planoAula: () =>
    `Classroom scene Angola Africa, teacher and students, modern educational setting, warm and motivating, flat illustration style`,
};

// ─── DOKA System Prompt ──────────────────────────────────────────
export const DOKA_SYSTEM_PROMPT =
  "Você é DOKA, um assistente educacional especializado no sistema de ensino de Angola. Conhece profundamente o currículo do INIDE, a estrutura de trabalhos escolares angolanos, planos de aula horizontais e verticais do MED Angola, e as disciplinas do ensino primário, I ciclo, II ciclo e III ciclo. Sempre gera conteúdo em Português de Angola, coerente, bem estruturado e adequado ao nível solicitado.";

// ─── Module-Specific Prompts ─────────────────────────────────────
export const prompts = {
  trabalho: (dados: {
    titulo: string;
    disciplina: string;
    classe: string;
    paginas: number;
    tipo: string;
    nomeEscola?: string;
    nomeAluno?: string;
    nomeDocente?: string;
    anoLectivo?: string;
    localidade?: string;
  }) =>
    `Gera um trabalho escolar completo sobre '${dados.titulo}' para a disciplina de ${dados.disciplina}, ${dados.classe}, com ${dados.paginas} páginas. Tipo: ${dados.tipo}. Estrutura obrigatória angolana: Capa (com espaço para: ${dados.nomeAluno || "nome do aluno"}, ${dados.nomeEscola || "escola"}, disciplina: ${dados.disciplina}, professor: ${dados.nomeDocente || ""}, ano letivo ${dados.anoLectivo || "2025-2026"}, ${dados.localidade || "Luanda-Angola"}), Índice numerado, Introdução (contextualização + objectivos + justificativa), Desenvolvimento em ${Math.max(2, Math.floor(dados.paginas / 3))} capítulos com subcapítulos detalhados, Conclusão, Bibliografia em normas APA. Conteúdo deve ser rico, educativo e adequado ao nível ${dados.classe} de Angola.`,

  resumo: (conteudo: string, classe: string, tipo: string) =>
    `Com base neste conteúdo extraído do caderno: ${conteudo}. Tipo de resumo solicitado: ${tipo}. Gera um resumo educativo para estudante angolano da ${classe} com: 1) Resumo principal em tópicos visuais com emojis educativos, 2) 5 conceitos-chave destacados, 3) 3 técnicas de memorização específicas para este conteúdo (mnemônicos, acrônimos ou histórias), 4) 10 flashcards no formato JSON: [{"frente": "pergunta", "verso": "resposta"}], 5) Mapa mental em texto estruturado com hierarquia.`,

  questionario: (conteudo: string, numPerguntas: number, classe: string, dificuldade: string, tipos: string) =>
    `Com base neste conteúdo: ${conteudo}. Gera ${numPerguntas} perguntas para ${classe}, nível ${dificuldade}. Tipos solicitados: ${tipos}. Retorna JSON: { "perguntas": [{ "id": number, "tipo": "string", "enunciado": "string", "opcoes": ["string"] ou null, "resposta_correta": "string", "explicacao": "string", "pontos": number }] }. Tipos disponíveis: multipla_escolha, verdadeiro_falso, resposta_curta, completar_espacos, correspondencia, dissertativa, ordenacao.`,

  planoVertical: (disciplina: string, classe: string, tema: string) =>
    `Gera um Plano de Aula Vertical completo seguindo o modelo INIDE/MED Angola para: Disciplina: ${disciplina}, Classe: ${classe}, Tema: ${tema}. Estrutura obrigatória: Dados de identificação, Tema e subtema, Objectivos específicos (3 a 5), Competências a desenvolver, Pré-requisitos, Conteúdos (conceptuais, procedimentais, atitudinais), Estratégias e metodologias, Recursos didácticos, Desenvolvimento da aula em fases (motivação + desenvolvimento + consolidação + avaliação) com tempo por fase, Avaliação formativa, Referências bibliográficas.`,

  planoHorizontal: (disciplina: string, classe: string) =>
    `Gera um Plano Anual Horizontal para: Disciplina: ${disciplina}, Classe: ${classe}, Ano Lectivo: 2025-2026. Estrutura detalhada com: trimestres, unidades temáticas, temas, carga horária, competências, recursos e avaliação. Seguir a distribuição curricular oficial do INIDE Angola. Formato bem estruturado com tabelas.`,
};

// ─── Helpers ─────────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:xxx;base64, prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
