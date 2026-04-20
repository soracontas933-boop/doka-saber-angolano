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
 * Corrige erros comuns de formatação Markdown.
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
 * Baseia-se em padrões de repetição excessiva ou caracteres não esperados.
 */
export function detectStrangeLanguage(content: string): string[] {
  const errors: string[] = [];
  
  // 1. Detetar repetições excessivas de palavras (ex: "o o o o o")
  const wordRepetitionMatch = content.match(/\b(\w+)\b(?:\s+\1\b){4,}/gi);
  if (wordRepetitionMatch) {
    errors.push("Repetição excessiva de palavras detetada.");
  }

  // 2. Detetar sequências de caracteres sem sentido (ex: "asdfasdfasdf")
  const gibberishMatch = content.match(/[bcdfghjklmnpqrstvwxyz]{10,}/gi);
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

  // Passo 1: Correções rápidas de formatação (Regex)
  currentContent = fixMarkdownErrors(currentContent);

  // Passo 2: Detecção de anomalias de linguagem
  const languageErrors = detectStrangeLanguage(currentContent);
  errors.push(...languageErrors);

  // Passo 3: Validação de contexto
  const contextErrors = validateAngolanContext(currentContent, prompt);
  errors.push(...contextErrors);

  // Se houver erros graves e tivermos uma função de re-geração, tentamos uma vez
  if (errors.length > 0 && reGenerateFn) {
    console.warn("Erros detetados no conteúdo. Tentando re-geração/correção via IA...", errors);
    try {
      // Podemos pedir à IA para especificamente corrigir os erros detetados
      const correctionPrompt = `O conteúdo seguinte foi gerado mas contém erros: ${errors.join(", ")}. 
      Por favor, reescreva o conteúdo corrigindo estes problemas, mantendo o formato Markdown e o contexto angolano:
      
      ${currentContent}`;
      
      const fixed = await reGenerateFn(correctionPrompt);
      if (fixed && fixed.length > 100) {
        return {
          isValid: true,
          fixedContent: fixMarkdownErrors(fixed),
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
