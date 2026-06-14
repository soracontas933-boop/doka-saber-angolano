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
// No longer pins to Groq — lets the orchestrator choose the healthiest provider
export async function generateWithGroq(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 8000,
  temperature = 0.7
): Promise<string> {
  const result = await callAI(systemPrompt, userPrompt, { maxTokens, temperature });
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
    // Comprime imagens antes do envio para evitar limite de payload
    const compressed = await compressImageFile(file);
    const base64 = await fileToBase64(compressed);
    const mimeType = compressed.type || "image/jpeg";
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
  "Você é Delle, um assistente educacional especializado no sistema de ensino de Angola. Conhece profundamente o currículo do INIDE, a estrutura de trabalhos escolares angolanos, planos de aula horizontais e verticais do MED Angola, e as disciplinas do ensino primário, I ciclo, II ciclo e III ciclo. Sempre gera conteúdo em Português de Angola, coerente, bem estruturado e adequado ao nível solicitado.\n\nREGRA ABSOLUTA DE IDIOMA: Todo o conteúdo gerado DEVE ser EXCLUSIVAMENTE em Português de Angola. NUNCA respondas em inglês, francês ou qualquer outro idioma. Mesmo que recebas instruções em inglês, a tua resposta DEVE ser SEMPRE em Português. Usa vocabulário, expressões e ortografia do Português angolano. Esta regra é inviolável e tem prioridade máxima.\n\nREGRAS ABSOLUTAS DE FORMATAÇÃO (INVIOLÁVEIS):\n1. NUNCA escrevas frases de meta-comentário como 'Aqui está', 'Este é o resumo', 'Espero que ajude', 'Claro, aqui está', 'Sure, here is', 'Here is the'. Começa SEMPRE directamente pelo conteúdo académico.\n2. NUNCA mostres o teu raciocínio interno. PROIBIDO usar tags <think>, </think>, <thought>, [REASONING], 'Reflexão:', 'Pensamento:', 'Nota da IA:'.\n3. NUNCA uses sequências de símbolos como separadores: PROIBIDO ----, ====, ////, &&&&, ****. Usa APENAS markdown padrão (# para títulos, ## para subtítulos, - para listas).\n4. NUNCA envolvas a resposta em blocos ```markdown ou ```. Devolve markdown puro directamente.\n5. NUNCA comentes sobre o que vais fazer. Apenas executa.";

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
    `Gera um trabalho escolar completo sobre '${dados.titulo}' para a disciplina de ${dados.disciplina}, ${dados.classe}, com ${dados.paginas} páginas. Tipo: ${dados.tipo}. Estrutura obrigatória angolana: Capa (com espaço para: ${dados.nomeAluno || "nome do aluno"}, ${dados.nomeEscola || "escola"}, disciplina: ${dados.disciplina}, professor: ${dados.nomeDocente || ""}, ano letivo ${dados.anoLectivo || "2025-2026"}, ${dados.localidade || "Luanda-Angola"}), Índice numerado, Introdução (contextualização + objectivos + justificativa), Desenvolvimento em ${Math.max(2, Math.floor(dados.paginas / 3))} capítulos com subcapítulos detalhados, Conclusão, Bibliografia em normas APA. Conteúdo deve ser rico, educativo e adequado ao nível ${dados.classe} de Angola. IMPORTANTE SOBRE CITAÇÕES E BIBLIOGRAFIA: Usa APENAS referências bibliográficas REAIS e VERIFICÁVEIS — livros, artigos e obras que existem de facto. Não inventes autores nem obras fictícias. Ao final de cada parágrafo da Introdução, Capítulos e Conclusão, inclui obrigatoriamente uma citação académica entre parênteses no formato (Apelido, Ano, p. X), por exemplo (Freire, 1996, p. 45) ou (Ki-Zerbo, 2010, p. 12). Os autores e obras DEVEM ser reais, publicados e relevantes ao tema. Prioriza autores africanos e lusófonos quando possível. RESPONDE EXCLUSIVAMENTE EM PORTUGUÊS DE ANGOLA — nunca em inglês.`,

  resumo: (conteudo: string, classe: string, tipo: string, paginas = 1, contexto?: string) => {
    const contextInfo = contexto 
      ? `O resumo deve ser contextualizado na realidade de: ${contexto}.` 
      : "O resumo deve ser genérico e sem um contexto geográfico específico.";

    // Métricas de densidade calibradas para A4 com layout em cards
    // (~ 260 palavras úteis por página A4 quando há cards/secções com cabeçalhos)
    const palavrasAlvo = paginas * 260;
    const palavrasMin = Math.round(palavrasAlvo * 0.9);
    const palavrasMax = Math.round(palavrasAlvo * 1.1);
    // Secções e tópicos por página (regra de densidade)
    const seccoesPorPagina = 4; // sweet spot visual
    const seccoesTotal = Math.max(3, paginas * seccoesPorPagina);
    const topicosPorSeccao = paginas <= 1 ? 3 : paginas <= 3 ? 4 : 5;

    const base = `Conteúdo de origem (do caderno do estudante):\n"""\n${conteudo}\n"""\n\nDisciplina/nível: ${classe}.\n\nREQUISITOS DE EXTENSÃO E DENSIDADE (CRÍTICOS — afectam directamente o layout das ${paginas} página(s) A4):\n- Total de palavras úteis: entre ${palavrasMin} e ${palavrasMax} (alvo ${palavrasAlvo}).\n- Densidade recomendada: ${seccoesTotal} secções no total (~${seccoesPorPagina} por página), com ${topicosPorSeccao} tópicos por secção.\n- ${contextInfo}\n- Mais páginas = mais profundidade e mais factos NOVOS, NUNCA repetição nem enchimento.\n- Se o conteúdo original for longo (ex: um livro de 1000 páginas), sintetiza os pontos mais críticos mantendo fidelidade adequada ao número de páginas solicitado.\n\nREGRAS ABSOLUTAS DE FORMATO:\n- NUNCA escrevas blocos JSON, código, chaves { } ou colchetes [ ] na resposta.\n- NUNCA uses os símbolos: • em sequência, "•[", "•{", aspas curvas estranhas.\n- USA EXCLUSIVAMENTE Markdown limpo (# título, ## secção, - item, **negrito**).\n- Cada item de lista DEVE ser uma frase autocontida de no máximo 22 palavras (para caber numa linha de card).\n- Não inventes nem repitas instruções; entrega só o conteúdo final.\n`;
    switch (tipo) {
         case "Mapa Mental":
        return base + `\nGera um MAPA MENTAL ULTRA-CONCISO, ramificado e fácil de MEMORIZAR num relance.

OBJETIVO PEDAGÓGICO:
O aluno deve, ao olhar para o mapa, captar instantaneamente: TEMA → SUBTEMAS → DEFINIÇÕES MUITO CURTAS → ELEMENTOS-CHAVE para fixar. Tudo cabe num cartão de memória.

REGRAS DE CONTEÚDO (CRÍTICAS — SEM EXCEÇÕES):
1. TÍTULO CENTRAL (#): nome do tema em **2 a 4 palavras**.
2. SUBTEMAS (##): **EXATAMENTE 4 a 5 ramos**. Cada ## = subtema **MÁX. 3 palavras**, numerado (1., 2., 3.…). Exemplo: "## 1. Causas internas".
3. SUB-RAMIFICAÇÕES (- itens): cada subtema tem **3 a 4 itens**, NUNCA mais. Cada item é UMA IDEIA-CHAVE no formato:
   "<Conceito>: <definição em 3 a 7 palavras>"
   ou
   "<Conceito> — <elem1, elem2, elem3>"
4. LIMITE RÍGIDO: cada linha de item tem **NO MÁXIMO 10 palavras** (incluindo o conceito). Se ultrapassares, cortas — não há exceção.
5. PROIBIDO: frases longas, parágrafos, "Detalhes:", explicações académicas, exemplos extensos, vírgulas a mais, JSON, código.
6. LÓGICA: ordem dos itens segue progressão simples→complexo, ou cronológica, ou causa→efeito.
7. MEMORIZAÇÃO: usa termos concretos, palavras-gatilho, e quando útil exemplos angolanos curtíssimos.
8. SEM linha "Definição:" extra — a definição vai no próprio item.

FORMATO OBRIGATÓRIO (Markdown puro, NADA além disto):

# <Tema Central>

## 1. <Subtema curto>
- <Conceito A>: <def 3-7 palavras>
- <Conceito B>: <def 3-7 palavras>
- <Conceito C> — <elem1, elem2, elem3>

## 2. <Próximo Subtema>
- ...
- ...
- ...

Entrega APENAS este formato. Sem introdução, sem conclusão, sem texto extra.`;
      case "Flashcards":
        return base + `\nGera 12 FLASHCARDS de estudo. Formato OBRIGATÓRIO em Markdown (sem JSON):\n\n# Flashcards — <Tema>\n\n## 1\n**Frente:** <pergunta clara e curta>\n**Verso:** <resposta precisa, 1-3 frases>\n\n## 2\n**Frente:** ...\n**Verso:** ...\n\n(continua até 12). Não escrevas mais nada além disso.`;
      case "Linha do Tempo":
        return base + `\nGera uma LINHA DO TEMPO com 6 a 10 eventos relevantes. Formato OBRIGATÓRIO:\n\n# <Tema> — Linha do Tempo\n\n## <Ano ou Data 1>\n- **<Evento>:** <descrição curta>\n\n## <Ano 2>\n- ...\n\nOrdem cronológica. Sem introdução longa, sem JSON.`;
      case "Quadro Comparativo":
        return base + `\nGera um QUADRO COMPARATIVO entre 2 a 4 conceitos/elementos do conteúdo. Formato OBRIGATÓRIO em tabela Markdown:\n\n# <Tema> — Comparação\n\n| Critério | <Item A> | <Item B> | <Item C> |\n|---|---|---|---|\n| <critério 1> | ... | ... | ... |\n| <critério 2> | ... | ... | ... |\n\nMínimo 6 critérios. Sem JSON, sem flashcards.`;
      case "Resumo Esquemático":
        return base + `\nGera um RESUMO ESQUEMÁTICO em tópicos hierárquicos. Formato:\n\n# <Tema>\n\n## <Bloco 1>\n- <ideia chave>\n- <ideia chave>\n\n## <Bloco 2>\n- ...\n\n4 a 6 blocos, 3 a 6 itens cada. Direto, sem texto corrido longo.`;
      case "Resumo Narrativo":
        return base + `\nGera um RESUMO NARRATIVO contínuo, didáctico, em 4 a 6 parágrafos coesos. Formato:\n\n# <Tema>\n\n## Introdução\n<parágrafo>\n\n## Desenvolvimento\n<2 a 3 parágrafos>\n\n## Síntese final\n<parágrafo>\n\nSem listas longas, sem JSON.`;
      case "Resumo com Mnemônicos":
        return base + `\nGera um RESUMO com TÉCNICAS DE MEMORIZAÇÃO. Formato:\n\n# <Tema>\n\n## Síntese\n- <ideia 1>\n- <ideia 2>\n- <ideia 3>\n\n## Mnemónicos\n- **<Acrónimo ou frase>:** <o que ajuda a lembrar>\n- ...\n\n## Truques de memorização\n- <história curta ou associação>\n- ...\n\nMínimo 5 mnemónicos. Sem JSON.`;
      default: // Resumo por Tópicos
        return base + `\nGera um RESUMO POR TÓPICOS claro, didáctico e ZERO REPETIÇÕES.

REGRAS DE QUALIDADE (CRÍTICAS):
- PROIBIDO repetir a mesma ideia em secções diferentes (mesmo com palavras trocadas).
- PROIBIDO recapitular no fim o que já foi dito (sem "Em suma", "Concluindo" repetindo tudo).
- Cada tópico deve trazer informação NOVA e específica, com termos técnicos corretos.
- Cada item começa com **palavra-chave em negrito**, seguida de explicação curta (máx. 22 palavras).
- Estrutura obrigatória: ${seccoesTotal} secções, cada uma com ${topicosPorSeccao} tópicos (total ≈ ${seccoesTotal * topicosPorSeccao} tópicos).
- Total de palavras entre ${palavrasMin} e ${palavrasMax} (alvo ${palavrasAlvo}) — distribui equilibradamente.

FORMATO OBRIGATÓRIO (Markdown puro):

# <Tema>

## <Secção 1 — título curto e específico>
- **<conceito>**: <explicação concreta com factos/dados>
- **<conceito>**: <explicação>

## <Secção 2>
- ...

Sem JSON, sem introdução fora do conteúdo, sem repetições.`;
    }
  },

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

Corrige e melhora TUDO seguindo normas INIDE/MED Angola. Usa APENAS referências bibliográficas REAIS e VERIFICÁVEIS.
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
  }) => {
    const isTFC = dados.tipo === "Monografia" || dados.tipo === "TCC";
    // Para monografias/TCC: calcula capítulos com base em páginas (mín 5, máx 10)
    // Cada capítulo deve ter ~4-6 páginas
    let numCapitulos = 5;
    if (isTFC) {
      numCapitulos = Math.max(5, Math.min(10, Math.ceil(dados.paginas / 5)));
    } else {
      numCapitulos = Math.max(2, Math.floor(dados.paginas / 2));
    }
    
    const extraInfo = isTFC 
      ? `Como é uma Monografia/TCC com ${dados.paginas} páginas, a estrutura deve ser rigorosa e académica, seguindo os padrões universitários angolanos. Cada capítulo deve ter profundidade e extensão suficientes (4-6 páginas cada). Inclui obrigatoriamente capítulos para: Introdução (com problema, objectivos, justificativa, 3-4 páginas), Fundamentação Teórica (5-6 páginas), Metodologia (3-4 páginas), Apresentação e Discussão de Resultados (5-6 páginas), e Conclusões (2-3 páginas). Total de ${numCapitulos} capítulos de desenvolvimento.`
      : "";
    
    return `Para o tema "${dados.titulo}", disciplina ${dados.disciplina}, ${dados.classe}, tipo ${dados.tipo}, com aproximadamente ${dados.paginas} páginas, sugere uma estrutura de subtemas/capítulos para o desenvolvimento do trabalho. ${extraInfo} Retorna APENAS um JSON válido no formato: { "subtemas": [ { "titulo": "string", "tipo": "introducao|capitulo|conclusao|bibliografia", "descricao": "breve descrição do conteúdo esperado" } ] }. A estrutura deve incluir: Introdução, ${numCapitulos} capítulos de desenvolvimento relevantes ao tema no contexto angolano, Conclusão e Bibliografia. Não incluas Capa nem Índice.`;
  },

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
    incluirCitacoes?: boolean;
  }) => {
    const refsReais = getReferenciasParaDisciplina(dados.disciplina);
    const refsTexto = formatarReferenciasParaPrompt(refsReais);
    const incluirCitacoes = dados.incluirCitacoes !== false; // default true

    const bibRef = !incluirCitacoes
      ? ""
      : dados.bibliografia
      ? `\n\nREFERÊNCIAS BIBLIOGRÁFICAS DISPONÍVEIS (usa APENAS estas para citações):\n${dados.bibliografia}`
      : `\n\nREFERÊNCIAS REAIS DISPONÍVEIS (usa APENAS estas para citações — NÃO inventes outras):\n${refsTexto}`;

    const citacaoNota = incluirCitacoes
      ? " Ao final de cada parágrafo, inclui uma citação académica entre parênteses no formato (Apelido, Ano, p. X) usando APENAS autores da lista fornecida."
      : " NÃO incluas citações entre parênteses (ex.: (Apelido, Ano, p. X)) no corpo do texto. Escreve um texto corrido, académico, sem referências inline.";

    const isTFC = dados.tipoSubtema === "Monografia" || dados.tipoSubtema === "TCC"; // Note: this logic might need the type from parent
    const instrucoes: Record<string, string> = {
      introducao: `Gera a Introdução do trabalho sobre "${dados.temaGeral}". Inclui OBRIGATORIAMENTE: contextualização abrangente do tema (2-3 parágrafos), problema de investigação claramente definido, pergunta de investigação, hipóteses (se aplicável), objectivos do trabalho (geral e 3-5 específicos), justificativa/importância do tema com argumentação sólida, metodologia utilizada e estrutura do trabalho. Deve ser MUITO detalhado, académico, com 3000-4000 palavras, múltiplos parágrafos densos, exemplos concretos contextualizados em Angola.${citacaoNota}${bibRef}`,
      capitulo: `Gera o conteúdo EXTREMAMENTE DETALHADO do capítulo "${dados.tituloSubtema}" do trabalho sobre "${dados.temaGeral}". Este é o capítulo ${dados.posicao} de ${dados.totalSubtemas} do desenvolvimento. REQUISITOS OBRIGATÓRIOS: (1) Mínimo 3000-4000 palavras; (2) Múltiplos subcapítulos (##) com títulos descritivos; (3) Cada subcapítulo com 3-5 parágrafos densos; (4) Exemplos práticos, estudos de caso, dados estatísticos; (5) Contextualizado à realidade angolana com referências específicas; (6) Análise crítica e reflexiva; (7) Transições coesas entre ideias; (8) Tabelas, listas numeradas ou estruturadas quando apropriado. O conteúdo deve ser académico, rigoroso, sem repetições, bem organizado e substancial.${citacaoNota}${bibRef}`,
      conclusao: `Gera a Conclusão do trabalho sobre "${dados.temaGeral}". REQUISITOS: (1) Mínimo 1500-2000 palavras; (2) Resume SINTETICAMENTE os pontos principais de cada capítulo (sem repetição literal); (3) Responde explicitamente à pergunta de investigação; (4) Verifica o alcance de cada objectivo específico; (5) Aponta limitações da investigação; (6) Sugere recomendações futuras e desdobramentos possíveis; (7) Reflexão crítica sobre as implicações dos resultados; (8) Perspectivas de aplicação prática. Deve ser uma síntese crítica, profunda e bem argumentada.${citacaoNota}${bibRef}`,
      bibliografia: `Selecciona 12-20 referências da lista abaixo que sejam mais relevantes para o trabalho sobre "${dados.temaGeral}" na disciplina ${dados.disciplina}, ${dados.classe}. NÃO INVENTES nenhuma referência — usa APENAS as que estão nesta lista. Formata cada uma rigorosamente em APA. Organiza por ordem alfabética. Inclui uma breve anotação (1-2 frases) sobre a relevância de cada referência para o trabalho.\n\nREFERÊNCIAS DISPONÍVEIS (escolhe apenas destas):\n${refsTexto}`,
    };
    const tipo = dados.tipoSubtema as keyof typeof instrucoes;
    return `${instrucoes[tipo] || instrucoes.capitulo} Disciplina: ${dados.disciplina}, Nível: ${dados.classe}. ${dados.contexto ? `Contexto dos capítulos anteriores: ${dados.contexto}` : ""} Retorna APENAS o conteúdo em markdown (sem título de nível 1 ou 2, começa directo no texto). RESPONDE EXCLUSIVAMENTE EM PORTUGUÊS DE ANGOLA — nunca em inglês.`;
  },
};

// ─── Helpers ─────────────────────────────────────────────────────
function fileToBase64(file: File | Blob): Promise<string> {
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

/**
 * Comprime uma imagem no browser via canvas para reduzir o payload do OCR.
 * Mantém qualidade legível para texto, com no máximo 2000px no maior lado.
 */
async function compressImageFile(file: File, maxDim = 2000, quality = 0.82): Promise<File | Blob> {
  if (!file.type.startsWith("image/")) return file;
  // Se já é pequena (<1.5MB), envia directamente
  if (file.size < 1.5 * 1024 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b as Blob), "image/jpeg", quality)
    );
    if (!blob || blob.size >= file.size) return file;
    console.log(`[OCR] Imagem comprimida: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
  } catch (e) {
    console.warn("[OCR] Compressão falhou, enviando original:", e);
    return file;
  }
}
