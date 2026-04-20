import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import * as mammoth from "mammoth";
import { getReferenciasParaDisciplina, formatarReferenciasParaPrompt } from "@/lib/referencias-reais";
import { validateAndCorrectContent } from "@/lib/ai-validator";

export interface AIResponse {
  content: string;
  service_used: string;
  tokens_used: number;
}

// ─── AI Proxy Call ───────────────────────────────────────────────
async function callAI(
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens?: number; temperature?: number; service?: string } = {}
): Promise<AIResponse> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`;
  const session = (await supabase.auth.getSession()).data.session;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 min timeout

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: options.maxTokens ?? 8000,
        temperature: options.temperature ?? 0.7,
        service: options.service,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Erro IA (${response.status}): ${errBody}`);
    }

    const data = await response.json();
    if (data?.error) throw new Error(data.error);

    const content = data?.choices?.[0]?.message?.content || "";
    const serviceUsed = data?.service_used || "desconhecido";
    const tokensUsed = data?.tokens_used || 0;

    // Log internally only — never show service/token info to users
    if (tokensUsed > 0) {
      console.log(`[AI] ${serviceUsed} — ${tokensUsed.toLocaleString()} tokens`);
    }

    // ─── Camada Anti-Falhas ──────────────────────────────────────────
    // Validação e correção automática de erros (formatação, linguagem, contexto)
    const validation = await validateAndCorrectContent(content, userPrompt, async (prompt: string) => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          max_tokens: options.maxTokens ?? 8000,
          temperature: 0.3,
          service: options.service,
        }),
        signal: controller.signal,
      });
      if (!res.ok) return "";
      const data = await res.json();
      return data?.choices?.[0]?.message?.content || "";
    });
    const finalContent = validation.fixedContent;

    if (validation.errors.length > 0) {
      console.warn(`[AI-Validator] Erros corrigidos: ${validation.errors.join(", ")}`);
    }

    return { content: finalContent, service_used: serviceUsed, tokens_used: tokensUsed };
  } catch (e: any) {
    if (e.name === "AbortError") throw new Error("A geração demorou demais. Tente com menos conteúdo.");
    throw new Error(`Erro ao chamar IA: ${e.message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Geração de Conteúdo Principal ───────────────────────────────
export async function generateWithGroq(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 8000,
  temperature = 0.7
): Promise<string> {
  const result = await callAI(systemPrompt, userPrompt, { maxTokens, temperature });
  return result.content;
}

export async function generateWithAI(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 8000,
  temperature = 0.7
): Promise<AIResponse> {
  return callAI(systemPrompt, userPrompt, { maxTokens, temperature });
}

// ─── Revisão de Conteúdo ─────────────────────────────────────────
export async function reviewWithOpenRouter(
  content: string,
  maxTokens = 4000
): Promise<string> {
  try {
    const result = await callAI(
      "Você é um revisor educacional angolano especializado em trabalhos escolares seguindo as normas do INIDE/MED. Melhora a coerência, corrige erros gramaticais e remove qualquer reflexão ou comentário de IA, mantendo apenas o conteúdo acadêmico limpo.",
      `Revisa este conteúdo educacional angolano. Remova qualquer frase introdutória da IA ou comentários meta. Retorne apenas o texto final revisado:\n\n${content}`,
      { maxTokens, temperature: 0.3, service: "openrouter" }
    );
    return result.content;
  } catch {
    console.warn("Revisão falhou: retornando conteúdo original");
    return content;
  }
}

// ─── Gemini Vision (OCR de fotos) ────────────────────────────────
export async function extractTextFromImage(base64: string, mimeType = "image/jpeg"): Promise<string> {
  const { data, error } = await supabase.functions.invoke("ocr-extract", {
    body: {
      image_base64: base64,
      mime_type: mimeType,
    },
  });

  if (error) throw new Error(`Erro OCR: ${error.message}`);
  if (data?.error) throw new Error(data.error);

  return data?.text || "";
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

// ─── Extract text from PDF/Word documents ────────────────────────
export async function extractTextFromDocument(file: File): Promise<string> {
  const ext = file.name?.split(".").pop()?.toLowerCase();

  // Word files: extract locally with mammoth (no API needed)
  if (ext === "docx" || ext === "doc" || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value?.trim();
      if (text && text.length > 20) {
        console.log(`[DOC] Extracted ${text.length} chars locally via mammoth`);
        return text;
      }
      console.warn("[DOC] mammoth returned very little text, falling back to OCR");
    } catch (e: any) {
      console.warn("[DOC] mammoth extraction failed, falling back to OCR:", e.message);
    }
  }

  // PDF and fallback: use ocr-extract edge function
  const base64 = await fileToBase64(file);
  const mimeType = file.type || "application/pdf";
  
  const { data, error } = await supabase.functions.invoke("ocr-extract", {
    body: {
      image_base64: base64,
      mime_type: mimeType,
      is_document: true,
    },
  });

  if (error) throw new Error(`Erro ao extrair texto: ${error.message}`);
  if (data?.error) throw new Error(data.error);
  return data?.text || "";
}

// ─── Pollinations (Imagens Gratuitas — fallback) ─────────────────
export function generateImageUrl(prompt: string, width = 800, height = 600): string {
  const seed = Math.floor(Math.random() * 99999);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`;
}

// ─── Image Generation via image-proxy (multi-provider) ───────────
export async function generateImageAI(prompt: string, width = 800, height = 600): Promise<{ image_url: string; service_used: string }> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy`;
  const session = (await supabase.auth.getSession()).data.session;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ prompt, width, height }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Erro imagem (${response.status}): ${errBody}`);
    }

    return await response.json();
  } catch {
    // Fallback to Pollinations
    return { image_url: generateImageUrl(prompt, width, height), service_used: "pollinations" };
  }
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

// ─── Delle System Prompt ──────────────────────────────────────────
export const DELLE_SYSTEM_PROMPT =
  "Você é Delle, um assistente educacional especializado no sistema de ensino de Angola. Conhece profundamente o currículo do INIDE, a estrutura de trabalhos escolares angolanos, planos de aula horizontais e verticais do MED Angola, e as disciplinas do ensino primário, I ciclo, II ciclo e III ciclo. Sempre gera conteúdo em Português de Angola, coerente, bem estruturado e adequado ao nível solicitado.\n\nREGRA ABSOLUTA DE IDIOMA: Todo o conteúdo gerado DEVE ser EXCLUSIVAMENTE em Português de Angola. NUNCA respondas em inglês, francês ou qualquer outro idioma. Mesmo que recebas instruções em inglês, a tua resposta DEVE ser SEMPRE em Português. Usa vocabulário, expressões e ortografia do Português angolano. Esta regra é inviolável e tem prioridade máxima.\n\nREGRA DE LIMPEZA: NUNCA adicione frases introdutórias (ex: 'Aqui está o seu trabalho', 'Com certeza'), comentários de IA ou reflexões sobre o processo de geração. Comece diretamente no conteúdo solicitado. NUNCA mencione que você é uma IA.";

export const WAME_SYSTEM_PROMPT = DELLE_SYSTEM_PROMPT;
export const DOKA_SYSTEM_PROMPT = DELLE_SYSTEM_PROMPT;

// ─── Module-Specific Prompts ───────────────────
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
    `Gera um trabalho escolar completo sobre '${dados.titulo}' para a disciplina de ${dados.disciplina}, ${dados.classe}, com ${dados.paginas} páginas. Tipo: ${dados.tipo}. Estrutura obrigatória angolana: Capa, Índice numerado, Introdução (contextualização + objectivos + justificativa), Desenvolvimento em capítulos, Conclusão, Bibliografia em normas APA. Conteúdo deve ser rico, educativo e adequado ao nível ${dados.classe} de Angola. Use referências reais. Comece direto no conteúdo, sem introduções de IA.`,

  resumo: (conteudo: string, classe: string, tipo: string) =>
    `Com base neste conteúdo: ${conteudo}. Tipo de resumo: ${tipo}. Gera um resumo educativo para estudante angolano da ${classe} com tópicos, conceitos-chave, técnicas de memorização e flashcards JSON.`,

  questionario: (conteudo: string, numPerguntas: number, classe: string, dificuldade: string, tipos: string) =>
    `Com base neste conteúdo: ${conteudo}. Gera ${numPerguntas} perguntas para ${classe}, nível ${dificuldade}. Tipos: ${tipos}. Retorna JSON: { "perguntas": [...] }.`,

  planoVertical: (disciplina: string, classe: string, tema: string) =>
    `Gera um Plano de Aula Vertical seguindo o modelo INIDE/MED Angola para: Disciplina: ${disciplina}, Classe: ${classe}, Tema: ${tema}.`,

  planoHorizontal: (dados: {
    disciplina: string;
    classe: string;
    unidade: string;
    sumario: string;
    perfilEntrada: string;
    perfilSaida: string;
    objectivoGeral: string;
    objectivosEspecificos: string;
    tempo: string;
  }) =>
    `Gera conteúdo das 3 fases didácticas de um Plano de Aula Horizontal INIDE/MED Angola. Disciplina: ${dados.disciplina}, Classe: ${dados.classe}, Unidade: ${dados.unidade}, Sumário: ${dados.sumario}. Retorna APENAS JSON.`,

  correcaoExtrair: (conteudo: string) =>
    `Analisa este trabalho escolar e extrai conteúdo em JSON estruturado: { "capa": {}, "introducao": "", "capitulos": [], "conclusao": "", "bibliografia": [] }\n\nConteúdo:\n${conteudo}`,

  correcaoAnalisar: (conteudo: string) =>
    `Analisa este trabalho e identifica problemas em JSON: { "problemas": [...] }. Verifica CAPA, ÍNDICE, ESTRUTURA, INTRODUÇÃO, DESENVOLVIMENTO, CONCLUSÃO e BIBLIOGRAFIA.`,

  correcaoGerar: (original: string, problemas: string, dadosCapa: string) =>
    `Corrige e melhora este trabalho seguindo normas INIDE/MED Angola. Trabalho original: ${original}. Problemas: ${problemas}. Retorna JSON estruturado.`,

  estruturaTrabalho: (dados: {
    titulo: string;
    disciplina: string;
    classe: string;
    paginas: number;
    tipo: string;
  }) =>
    `Para o tema "${dados.titulo}", disciplina ${dados.disciplina}, ${dados.classe}, sugere uma estrutura de subtemas para o desenvolvimento. Retorna APENAS JSON: { "subtemas": [ { "titulo": "string", "tipo": "introducao|capitulo|conclusao|bibliografia", "descricao": "..." } ] }. A estrutura deve ser rigorosa: Introdução, Capítulos, Conclusão e Bibliografia.`,

  subtema: (dados: {
    temaGeral: string;
    tituloSubtema: string;
    tipoSubtema: string;
    disciplina: string;
    classe: string;
    posicao: number;
    totalSubtemas: number;
    contexto?: string;
    bibliografia?: string;
  }) => {
    const refsReais = getReferenciasParaDisciplina(dados.disciplina);
    const refsTexto = formatarReferenciasParaPrompt(refsReais);

    const bibRef = dados.bibliografia
      ? `\n\nREFERÊNCIAS BIBLIOGRÁFICAS DISPONÍVEIS (usa APENAS estas para citações):\n${dados.bibliografia}`
      : `\n\nREFERÊNCIAS REAIS DISPONÍVEIS (usa APENAS estas para citações — NÃO inventes outras):\n${refsTexto}`;
    
    const instrucoes: Record<string, string> = {
      introducao: `Gera a Introdução do trabalho sobre "${dados.temaGeral}". EXIGÊNCIA DE TAMANHO: O conteúdo deve ter NO MÍNIMO 1500 caracteres. Inclui: contextualização profunda do tema, objectivos detalhados (geral e específicos), justificativa robusta e metodologia. Ao final de cada parágrafo, inclui uma citação académica (Apelido, Ano, p. X) usando APENAS autores da lista fornecida.${bibRef}`,
      capitulo: `Gera o conteúdo detalhado do capítulo "${dados.tituloSubtema}" do trabalho sobre "${dados.temaGeral}". Conteúdo denso, rico, educativo, com subcapítulos e contextualizado a Angola. Ao final de cada parágrafo, inclui uma citação académica (Apelido, Ano, p. X) usando APENAS autores da lista fornecida.${bibRef}`,
      conclusao: `Gera a Conclusão do trabalho sobre "${dados.temaGeral}". REGRA CRUCIAL: A conclusão deve conter APENAS as considerações finais, síntese das constatações, conselhos práticos e perspectivas futuras para melhorar a área em Angola. NUNCA repita a introdução nem adicione novos temas de desenvolvimento. Ao final de cada parágrafo, inclui uma citação académica (Apelido, Ano, p. X) usando APENAS autores da lista fornecida.${bibRef}`,
      bibliografia: `Selecciona 5-8 referências da lista abaixo e formata em APA.\n\nREFERÊNCIAS DISPONÍVEIS:\n${refsTexto}`,
    };
    const tipo = dados.tipoSubtema as keyof typeof instrucoes;
    return `${instrucoes[tipo] || instrucoes.capitulo} Retorna APENAS o conteúdo em markdown (sem títulos # ou ##). NÃO adicione comentários de IA. RESPONDE EXCLUSIVAMENTE EM PORTUGUÊS DE ANGOLA.`;
  },
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
