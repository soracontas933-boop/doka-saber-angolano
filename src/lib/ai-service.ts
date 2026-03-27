import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";

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
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout

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

    return { content, service_used: serviceUsed, tokens_used: tokensUsed };
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
  const result = await callAI(systemPrompt, userPrompt, { maxTokens, temperature, service: "groq" });
  return result.content;
}

// Returns full AI response with service/token info
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
      "Você é um revisor educacional angolano. Recebe conteúdo gerado e melhora a coerência, corrige erros, adapta ao contexto angolano e complementa partes incompletas.",
      `Revisa e complementa este conteúdo educacional angolano, mantendo a estrutura:\n\n${content}`,
      { maxTokens, temperature: 0.5, service: "openrouter" }
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

// ─── Delle System Prompt ──────────────────────────────────────────
export const DELLE_SYSTEM_PROMPT =
  "Você é Delle, um assistente educacional especializado no sistema de ensino de Angola. Conhece profundamente o currículo do INIDE, a estrutura de trabalhos escolares angolanos, planos de aula horizontais e verticais do MED Angola, e as disciplinas do ensino primário, I ciclo, II ciclo e III ciclo. Sempre gera conteúdo em Português de Angola, coerente, bem estruturado e adequado ao nível solicitado.";

/** @deprecated Use DELLE_SYSTEM_PROMPT instead */
export const WAME_SYSTEM_PROMPT = DELLE_SYSTEM_PROMPT;
/** @deprecated Use DELLE_SYSTEM_PROMPT instead */
export const DOKA_SYSTEM_PROMPT = DELLE_SYSTEM_PROMPT;

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
    `Gera um trabalho escolar completo sobre '${dados.titulo}' para a disciplina de ${dados.disciplina}, ${dados.classe}, com ${dados.paginas} páginas. Tipo: ${dados.tipo}. Estrutura obrigatória angolana: Capa (com espaço para: ${dados.nomeAluno || "nome do aluno"}, ${dados.nomeEscola || "escola"}, disciplina: ${dados.disciplina}, professor: ${dados.nomeDocente || ""}, ano letivo ${dados.anoLectivo || "2025-2026"}, ${dados.localidade || "Luanda-Angola"}), Índice numerado, Introdução (contextualização + objectivos + justificativa), Desenvolvimento em ${Math.max(2, Math.floor(dados.paginas / 3))} capítulos com subcapítulos detalhados, Conclusão, Bibliografia em normas APA. Conteúdo deve ser rico, educativo e adequado ao nível ${dados.classe} de Angola. IMPORTANTE: Ao final de cada parágrafo da Introdução, Capítulos e Conclusão, inclui obrigatoriamente uma citação académica entre parênteses no formato (Apelido, Ano, p. X), por exemplo (Santos, 2021, p. 45) ou (Mendes & Silva, 2020, p. 12). Os autores devem ser realistas, relevantes ao tema e coerentes com a Bibliografia final.`,

  resumo: (conteudo: string, classe: string, tipo: string) =>
    `Com base neste conteúdo extraído do caderno: ${conteudo}. Tipo de resumo solicitado: ${tipo}. Gera um resumo educativo para estudante angolano da ${classe} com: 1) Resumo principal em tópicos visuais com emojis educativos, 2) 5 conceitos-chave destacados, 3) 3 técnicas de memorização específicas para este conteúdo (mnemônicos, acrônimos ou histórias), 4) 10 flashcards no formato JSON: [{"frente": "pergunta", "verso": "resposta"}], 5) Mapa mental em texto estruturado com hierarquia.`,

  questionario: (conteudo: string, numPerguntas: number, classe: string, dificuldade: string, tipos: string) =>
    `Com base neste conteúdo: ${conteudo}. Gera ${numPerguntas} perguntas para ${classe}, nível ${dificuldade}. Tipos solicitados: ${tipos}. Retorna JSON: { "perguntas": [{ "id": number, "tipo": "string", "enunciado": "string", "opcoes": ["string"] ou null, "resposta_correta": "string", "explicacao": "string", "pontos": number }] }. Tipos disponíveis: multipla_escolha, verdadeiro_falso, resposta_curta, completar_espacos, correspondencia, dissertativa, ordenacao.`,

  planoVertical: (disciplina: string, classe: string, tema: string) =>
    `Gera um Plano de Aula Vertical completo seguindo o modelo INIDE/MED Angola para: Disciplina: ${disciplina}, Classe: ${classe}, Tema: ${tema}. Estrutura obrigatória: Dados de identificação, Tema e subtema, Objectivos específicos (3 a 5), Competências a desenvolver, Pré-requisitos, Conteúdos (conceptuais, procedimentais, atitudinais), Estratégias e metodologias, Recursos didácticos, Desenvolvimento da aula em fases (motivação + desenvolvimento + consolidação + avaliação) com tempo por fase, Avaliação formativa, Referências bibliográficas.`,

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
    `Gera o conteúdo das 3 fases didácticas de um Plano de Aula Horizontal no modelo INIDE/MED Angola.
Disciplina: ${dados.disciplina}, Classe: ${dados.classe}, Unidade: ${dados.unidade}, Sumário: ${dados.sumario}.
Perfil de entrada: ${dados.perfilEntrada}. Perfil de saída: ${dados.perfilSaida}.
Objectivo geral: ${dados.objectivoGeral}. Objectivos específicos: ${dados.objectivosEspecificos}.
Tempo total: ${dados.tempo || "45 min"}.

Retorna APENAS JSON válido no seguinte formato (sem markdown, sem backticks):
{
  "fases": [
    {
      "tempo": "5min",
      "fase": "Introdução",
      "conteudo": "...",
      "metodos": "- Diálogo",
      "actividades": "...",
      "estrategia": "...",
      "meios": "- Quadro\\n- Giz",
      "avaliacao": "Diagnostica",
      "obs": ""
    },
    {
      "tempo": "30min",
      "fase": "Desenvolvimento",
      "conteudo": "...",
      "metodos": "- Expositivo\\n- Explicativo\\n- Elaboração conjunta",
      "actividades": "...",
      "estrategia": "...",
      "meios": "...",
      "avaliacao": "Formativa",
      "obs": ""
    },
    {
      "tempo": "10min",
      "fase": "Conclusão",
      "conteudo": "...",
      "metodos": "Trabalho independente",
      "actividades": "...",
      "estrategia": "...",
      "meios": "...",
      "avaliacao": "Formativa",
      "obs": ""
    }
  ]
}
O conteúdo deve ser detalhado, rico e contextualizado à realidade angolana. Cada campo deve ter conteúdo substancial.`,

  correcaoExtrair: (conteudo: string) =>
    `És um assistente educacional especializado no sistema de ensino de Angola (INIDE/MED). Analisa este trabalho escolar e extrai TODO o conteúdo em JSON estruturado: { "capa": { "titulo": "", "nome_aluno": "", "escola": "", "disciplina": "", "classe": "", "turma": "", "numero": "", "orientador": "", "ano_letivo": "", "local": "" }, "indice": null, "introducao": "", "capitulos": [{ "numero": 1, "titulo": "", "subcapitulos": [{ "numero": "1.1", "titulo": "", "conteudo": "" }] }], "conclusao": "", "bibliografia": [""], "problemas_estruturais": [""], "paginas_total": 0 }\n\nConteúdo do trabalho:\n${conteudo}`,

  correcaoAnalisar: (conteudo: string) =>
    `Analisa este trabalho escolar extraído e identifica TODOS os problemas.
Conteúdo do trabalho: ${conteudo}

Verifica obrigatoriamente e retorna em JSON:
{
  "problemas": [
    {
      "id": 1,
      "categoria": "grave|moderado|conteudo|formatacao",
      "titulo": "",
      "descricao": "",
      "localizacao": "",
      "sugestao_correcao": "",
      "prioridade": 1
    }
  ],
  "pontuacao_actual": 0,
  "pontuacao_estimada_apos_correcao": 0,
  "resumo_geral": "",
  "nivel_trabalho": "fraco|suficiente|bom|muito_bom|excelente"
}

Verifica: CAPA (campos completos), ÍNDICE (existência e numeração), ESTRUTURA (paginação, numeração de capítulos/subcapítulos), INTRODUÇÃO (contextualização, objectivos geral e específicos, justificativa, metodologia, estrutura do trabalho, 1-2 páginas), DESENVOLVIMENTO (mín 2 capítulos, profundidade, sem repetição, exemplos), CONCLUSÃO (retoma objectivos, síntese crítica, perspectivas futuras), BIBLIOGRAFIA (mín 5 referências APA, fontes angolanas), FORMATAÇÃO (fonte, espaçamento, margens, linguagem académica).`,

  correcaoGerar: (original: string, problemas: string, dadosCapa: string) =>
    `Com base neste trabalho original e nos problemas identificados, gera uma versão COMPLETAMENTE CORRIGIDA E MELHORADA.

Trabalho original: ${original}
Problemas identificados: ${problemas}
Dados do aluno: ${dadosCapa}

Corrige e melhora TUDO seguindo normas INIDE/MED Angola.
Retorna em JSON:
{
  "capa": { "titulo": "", "nome_aluno": "", "escola": "", "numero": "", "sala": "", "turma": "", "curso": "", "disciplina": "", "classe": "", "orientador": "", "ano_letivo": "", "local": "", "data": "" },
  "indice": [{ "secao": "", "pagina": 1 }],
  "introducao": { "contextualizacao": "", "objetivo_geral": "", "objetivos_especificos": [""], "justificativa": "", "metodologia": "", "estrutura_trabalho": "" },
  "capitulos": [{ "numero": 1, "titulo": "", "subcapitulos": [{ "numero": "1.1", "titulo": "", "conteudo": "" }] }],
  "conclusao": { "sintese": "", "reflexao_critica": "", "perspectivas_futuras": "" },
  "bibliografia": [{ "referencia": "" }]
}`,

  estruturaTrabalho: (dados: {
    titulo: string;
    disciplina: string;
    classe: string;
    paginas: number;
    tipo: string;
  }) =>
    `Para o tema "${dados.titulo}", disciplina ${dados.disciplina}, ${dados.classe}, tipo ${dados.tipo}, com aproximadamente ${dados.paginas} páginas, sugere uma estrutura de subtemas/capítulos para o desenvolvimento do trabalho. Retorna APENAS um JSON válido no formato: { "subtemas": [ { "titulo": "string", "tipo": "introducao|capitulo|conclusao|bibliografia", "descricao": "breve descrição do conteúdo esperado" } ] }. A estrutura deve incluir: Introdução, ${Math.max(2, Math.floor(dados.paginas / 2))} capítulos de desenvolvimento relevantes ao tema no contexto angolano, Conclusão e Bibliografia. Não incluas Capa nem Índice.`,

  subtema: (dados: {
    temaGeral: string;
    tituloSubtema: string;
    tipoSubtema: string;
    disciplina: string;
    classe: string;
    posicao: number;
    totalSubtemas: number;
    contexto?: string;
  }) => {
    const instrucoes: Record<string, string> = {
      introducao: `Gera a Introdução do trabalho sobre "${dados.temaGeral}". Inclui: contextualização do tema, objectivos do trabalho (geral e específicos), justificativa/importância do tema, e metodologia utilizada. Deve ter pelo menos 2-3 parágrafos bem desenvolvidos. IMPORTANTE: Ao final de cada parágrafo, inclui uma citação académica entre parênteses no formato (Apelido, Ano, p. X), ex: (Santos, 2021, p. 45). Usa autores realistas e relevantes ao tema.`,
      capitulo: `Gera o conteúdo detalhado do capítulo "${dados.tituloSubtema}" do trabalho sobre "${dados.temaGeral}". Este é o capítulo ${dados.posicao} de ${dados.totalSubtemas} do desenvolvimento. O conteúdo deve ser rico, educativo, com subcapítulos, exemplos práticos e contextualizado à realidade angolana. Mínimo 3-4 parágrafos densos. IMPORTANTE: Ao final de cada parágrafo, inclui uma citação académica entre parênteses no formato (Apelido, Ano, p. X), ex: (Mendes & Silva, 2020, p. 12). Usa autores realistas e relevantes.`,
      conclusao: `Gera a Conclusão do trabalho sobre "${dados.temaGeral}". Resume os pontos principais abordados nos capítulos, apresenta as principais constatações, e sugere recomendações ou perspectivas futuras. Deve ter 2-3 parágrafos. IMPORTANTE: Ao final de cada parágrafo, inclui uma citação académica entre parênteses no formato (Apelido, Ano, p. X).`,
      bibliografia: `Gera a Bibliografia/Referências do trabalho sobre "${dados.temaGeral}" para ${dados.disciplina}, ${dados.classe}. Inclui pelo menos 5-8 referências em formato APA, com livros, artigos e fontes online relevantes ao tema no contexto angolano e africano. As referências devem ser coerentes com os autores citados nos parágrafos dos capítulos anteriores.`,
    };
    const tipo = dados.tipoSubtema as keyof typeof instrucoes;
    return `${instrucoes[tipo] || instrucoes.capitulo} Disciplina: ${dados.disciplina}, Nível: ${dados.classe}. ${dados.contexto ? `Contexto dos capítulos anteriores: ${dados.contexto}` : ""} Retorna APENAS o conteúdo em markdown (sem título de nível 1 ou 2, começa directo no texto).`;
  },
};

// ─── Helpers ─────────────────────────────────────────────────────
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
