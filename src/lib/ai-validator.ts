/**
 * AI Validator & Corrector
 * 
 * Este módulo é responsável por detetar e corrigir erros comuns em conteúdos gerados por IA,
 * como formatação Markdown inválida, alucinações de linguagem ou conteúdo distorcido.
 */

export interface ValidationResult {
  isValid: boolean;
  fixedContent: string;
  errors: string[];
}

/**
 * Remove reflexões da IA e frases de conversação (meta-talk).
 */
export function removeAiReflections(content: string): string {
  let fixed = content;

  // 1. Remover frases comuns de introdução/conclusão da própria IA
  const metaPhrases = [
    /Aqui está o conteúdo solicitado[:.]?/gi,
    /Claro, vou gerar o conteúdo[:.]?/gi,
    /Espero que este trabalho ajude[:.]?/gi,
    /Este conteúdo foi gerado no contexto[:.]?/gi,
    /Como assistente de IA, meu objetivo é[:.]?/gi,
    /Tenha em mente que este é um rascunho[:.]?/gi,
    /Se precisar de mais alguma coisa, estou à disposição[:.]?/gi,
    /Com base nas diretrizes do INIDE[:.]?/gi,
    /Este texto foi elaborado em conformidade com[:.]?/gi,
    /Note que as referências são reais[:.]?/gi,
  ];

  metaPhrases.forEach(phrase => {
    fixed = fixed.replace(phrase, "");
  });

  // 2. Remover blocos que parecem a IA conversando consigo mesma (ex: "Entendido. Vou focar em...")
  fixed = fixed.replace(/^(Entendido|Certo|Compreendo|Perfeito)\..*$/gm, "");

  return fixed.trim();
}

/**
 * Corrigir duplicidade de conteúdo (parágrafos idênticos ou muito similares).
 */
export function removeDuplicateParagraphs(content: string): string {
  const paragraphs = content.split(/\n\s*\n/);
  const uniqueParagraphs: string[] = [];
  const seenNormalized = new Set<string>();

  for (const p of paragraphs) {
    const normalized = p.trim().toLowerCase().replace(/[^\w\s]/g, "").substring(0, 100);
    if (normalized.length > 10 && !seenNormalized.has(normalized)) {
      uniqueParagraphs.push(p);
      seenNormalized.add(normalized);
    } else if (normalized.length <= 10) {
      uniqueParagraphs.push(p);
    }
  }

  return uniqueParagraphs.join("\n\n");
}

/**
 * Corrigir erros comuns de formatação Markdown.
 */
export function fixMarkdownErrors(content: string): string {
  let fixed = content;

  // 1. Corrigir blocos de código malformados como ```markdown --- ou ```markdown ```
  fixed = fixed.replace(/```markdown\s*---/g, "---");
  fixed = fixed.replace(/```markdown\s*```/g, "```");
  
  // 2. Remover repetições estranhas de delimitadores de bloco de código
  fixed = fixed.replace(/```markdown\s*markdown/g, "```markdown");
  
  // 3. Garantir que blocos de código abertos sejam fechados (heurística simples)
  const codeBlockCount = (fixed.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    fixed += "\n```";
  }

  // 4. Corrigir cabeçalhos sem espaço (ex: #Título -> # Título)
  fixed = fixed.replace(/^(#{1,6})([^#\s].*)$/gm, "$1 $2");

  return fixed;
}

/**
 * Deteta se o conteúdo contém "linguagem estranha" ou sem sentido.
 */
export function detectStrangeLanguage(content: string): string[] {
  const errors: string[] = [];
  
  // 1. Detetar repetições excessivas de palavras (ex: "o o o o o")
  const wordRepetitionMatch = content.match(/\b(\w+)\b(?:\s+\1\b){4,}/gi);
  if (wordRepetitionMatch) {
    errors.push("Repetição excessiva de palavras detetada.");
  }

  // 2. Detetar sequências de caracteres sem sentido (ex: "asdfasdfasdf")
  const gibberishMatch = content.match(/[bcdfghjklmnpqrstvwxyz]{12,}/gi);
  if (gibberishMatch) {
    errors.push("Sequência de caracteres sem sentido detetada.");
  }

  // 3. Verificar se o conteúdo é demasiado curto para o esperado
  if (content.length < 100) {
    errors.push("Conteúdo excessivamente curto.");
  }

  return errors;
}

/**
 * Valida se o conteúdo respeita o contexto angolano obrigatório.
 */
export function validateAngolanContext(content: string, prompt: string): string[] {
  const errors: string[] = [];
  
  const isAngolanPrompt = prompt.toLowerCase().includes("angola") || 
                          prompt.toLowerCase().includes("angolano");
  
  if (isAngolanPrompt) {
    const angolanKeywords = ["Angola", "Luanda", "Benguela", "Huambo", "Lubango", "Kwanza", "província", "município"];
    const hasKeywords = angolanKeywords.some(key => content.includes(key));
    
    if (!hasKeywords) {
      errors.push("Contexto angolano parece estar ausente no conteúdo gerado.");
    }
  }

  return errors;
}

/**
 * Função principal de validação e correção.
 */
export async function validateAndCorrectContent(
  content: string, 
  prompt: string,
  reGenerateFn?: (p: string) => Promise<string>
): Promise<ValidationResult> {
  let currentContent = content;
  const errors: string[] = [];

  // Passo 1: Limpeza de reflexões da IA e duplicações
  currentContent = removeAiReflections(currentContent);
  currentContent = removeDuplicateParagraphs(currentContent);

  // Passo 2: Correções rápidas de formatação (Regex)
  currentContent = fixMarkdownErrors(currentContent);

  // Passo 3: Detecção de anomalias de linguagem
  const languageErrors = detectStrangeLanguage(currentContent);
  errors.push(...languageErrors);

  // Passo 4: Validação de contexto
  const contextErrors = validateAngolanContext(currentContent, prompt);
  errors.push(...contextErrors);

  // Se houver erros graves e tivermos uma função de re-geração, tentamos uma vez
  if (errors.length > 0 && reGenerateFn) {
    console.warn("Erros detetados no conteúdo. Tentando re-geração/correção via IA...", errors);
    try {
      const correctionPrompt = `O conteúdo seguinte foi gerado mas contém erros: ${errors.join(", ")}. 
      Por favor, reescreva o conteúdo corrigindo estes problemas, mantendo o formato Markdown e o contexto angolano. 
      NÃO adicione comentários nem reflexões de IA, apenas o conteúdo limpo:
      
      ${currentContent}`;
      
      const fixed = await reGenerateFn(correctionPrompt);
      if (fixed && fixed.length > 100) {
        return {
          isValid: true,
          fixedContent: removeAiReflections(fixMarkdownErrors(fixed)),
          errors: []
        };
      }
    } catch (e) {
      console.error("Falha na tentativa de correção via IA:", e);
    }
  }

  return {
    isValid: errors.length === 0,
    fixedContent: currentContent,
    errors
  };
}
