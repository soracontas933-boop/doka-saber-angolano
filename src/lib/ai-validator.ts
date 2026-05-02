/**
 * AI Validator & Corrector
 *
 * Detecta e corrige erros comuns em conteúdos gerados por IA:
 * - Tags de raciocínio (<think>, etc.)
 * - Frases de meta-comentário ("Aqui está...", "Here is...")
 * - Sequências de símbolos espúrias (&&&, ///, ----)
 * - Markdown malformado
 * - Linguagem estranha / repetições
 */

export interface ValidationResult {
  isValid: boolean;
  fixedContent: string;
  errors: string[];
}

/**
 * Remove tags de raciocínio e blocos de pensamento que alguns modelos vazam.
 */
export function stripReasoningTags(content: string): string {
  let fixed = content;
  // Remove <think>...</think>, <thought>...</thought>, <reasoning>...</reasoning>
  fixed = fixed.replace(/<\s*(think|thought|reasoning|reflection)\s*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  // Remove tags abertas órfãs (think sem fecho)
  fixed = fixed.replace(/<\s*(think|thought|reasoning|reflection)\s*>[\s\S]*$/gi, "");
  // Remove blocos [REASONING]...[/REASONING]
  fixed = fixed.replace(/\[\s*(REASONING|THINKING|THOUGHT)\s*\][\s\S]*?\[\s*\/\s*\1\s*\]/gi, "");
  // Remove linhas que começam com marcadores de raciocínio
  fixed = fixed.replace(/^\s*(Reflexão|Pensamento|Nota da IA|Reasoning|Thinking)\s*:.*$/gim, "");
  return fixed;
}

/**
 * Remove frases de meta-comentário no início e fim do conteúdo.
 */
export function stripMetaPhrases(content: string): string {
  let fixed = content.trim();

  const leadingPatterns = [
    /^(Claro|Certo|Sim|Ok|Okay)[,!.]?\s*(aqui|segue)[^\n]*\n+/i,
    /^Aqui (está|tens|vai|segue|encontras)[^\n]*\n+/i,
    /^Eis (o|a|um|uma)[^\n]*\n+/i,
    /^(Este|Esta|Isto) (é|foi) (o|a|um|uma)?\s*(resumo|trabalho|texto|conteúdo)[^\n]*\n+/i,
    /^Segue[- ](se)?[^\n]*\n+/i,
    /^Sure[,!.]?\s*here[^\n]*\n+/i,
    /^Here (is|are|you go|'s)[^\n]*\n+/i,
    /^Of course[,!.]?[^\n]*\n+/i,
    /^Certainly[,!.]?[^\n]*\n+/i,
    /^I'll[^\n]*\n+/i,
    /^Vou (criar|gerar|elaborar|escrever)[^\n]*\n+/i,
  ];

  for (const pat of leadingPatterns) {
    fixed = fixed.replace(pat, "");
  }

  const trailingPatterns = [
    /\n+\s*Espero que (ajude|seja útil|tenha gostado)[^\n]*$/i,
    /\n+\s*Se (precisar|tiver|quiser)[^\n]*$/i,
    /\n+\s*(Hope this helps|Let me know|Feel free)[^\n]*$/i,
    /\n+\s*Este foi o (resumo|trabalho|texto)[^\n]*$/i,
  ];

  for (const pat of trailingPatterns) {
    fixed = fixed.replace(pat, "");
  }

  return fixed.trim();
}

/**
 * Remove sequências espúrias de símbolos (&&&, ///, ----)
 * preservando markdown legítimo (--- como hr, *** como ênfase).
 */
export function stripSymbolNoise(content: string): string {
  let fixed = content;
  // 4+ ampersands
  fixed = fixed.replace(/&{3,}/g, "");
  // 4+ barras (mas preservar URLs http(s)://). Sem lookbehind para compatibilidade com Safari iOS < 16.4.
  fixed = fixed.replace(/(https?:)?\/{4,}/g, (_m, proto) => (proto ? proto + "//" : ""));
  // 5+ traços (markdown hr é ---, então só removemos 5+)
  fixed = fixed.replace(/^-{5,}$/gm, "---");
  // 5+ iguais
  fixed = fixed.replace(/^={5,}$/gm, "");
  // 5+ asteriscos numa linha
  fixed = fixed.replace(/^\*{5,}$/gm, "---");
  // 3+ percentagens
  fixed = fixed.replace(/%{3,}/g, "");
  // Caracteres aleatórios repetidos numa linha (10+ do mesmo símbolo não-alfanumérico)
  fixed = fixed.replace(/([^\w\s])\1{9,}/g, "");
  // Remove sequências de símbolos comuns que a IA usa como separadores
  fixed = fixed.replace(/[#%*]{3,}/g, "");
  return fixed;
}

/**
 * Corrige erros comuns de formatação Markdown.
 */
export function fixMarkdownErrors(content: string): string {
  let fixed = content;

  // Remove blocos ```markdown ... ``` que envolvem todo o conteúdo
  fixed = fixed.replace(/^\s*```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/i, "$1");
  fixed = fixed.replace(/```markdown\s*---/g, "---");
  fixed = fixed.replace(/```markdown\s*```/g, "");
  fixed = fixed.replace(/```markdown\s*markdown/g, "```markdown");

  // Garantir blocos de código fechados
  const codeBlockCount = (fixed.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    fixed += "\n```";
  }

  // Cabeçalhos sem espaço
  fixed = fixed.replace(/^(#{1,6})([^#\s].*)$/gm, "$1 $2");

  return fixed;
}

/**
 * Deteta linguagem estranha / repetições.
 */
export function detectStrangeLanguage(content: string): string[] {
  const errors: string[] = [];

  const wordRepetitionMatch = content.match(/\b(\w+)\b(?:\s+\1\b){4,}/gi);
  if (wordRepetitionMatch) {
    errors.push("Repetição excessiva de palavras detetada.");
  }

  const gibberishMatch = content.match(/[bcdfghjklmnpqrstvwxyz]{10,}/gi);
  if (gibberishMatch) {
    errors.push("Sequência de caracteres sem sentido detetada.");
  }

  if (content.length < 100) {
    errors.push("Conteúdo excessivamente curto.");
  }

  return errors;
}

/**
 * Deteta resíduos de raciocínio / meta-comentário no conteúdo final.
 */
export function detectArtifacts(content: string): string[] {
  const errors: string[] = [];

  if (/<\s*(think|thought|reasoning)\s*>/i.test(content)) {
    errors.push("Tag de raciocínio detetada.");
  }
  if (/^(aqui está|here is|sure,?\s*here|claro[,!.]?\s*aqui)/im.test(content.trim())) {
    errors.push("Frase de meta-comentário no início detetada.");
  }
  if (/&{3,}|\/{4,}|^={5,}$|^\*{5,}$/m.test(content)) {
    errors.push("Sequência de símbolos espúria detetada.");
  }

  return errors;
}

/**
 * Validação de contexto angolano.
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

  // Passo 1: Limpeza determinística (regex)
  const before = currentContent;
  currentContent = stripReasoningTags(currentContent);
  currentContent = stripMetaPhrases(currentContent);
  currentContent = stripSymbolNoise(currentContent);
  currentContent = fixMarkdownErrors(currentContent);

  if (currentContent !== before) {
    const removedChars = before.length - currentContent.length;
    if (removedChars > 0) {
      console.log(`[AI-Validator] Limpeza removeu ${removedChars} chars de lixo`);
    }
  }

  // Passo 2: Detecção
  errors.push(...detectStrangeLanguage(currentContent));
  errors.push(...detectArtifacts(currentContent));
  errors.push(...validateAngolanContext(currentContent, prompt));

  // Passo 3: Re-geração se ficou demasiado curto após limpeza
  const tooShort = currentContent.trim().length < 300;
  const hasSeriousErrors = errors.some(e =>
    e.includes("excessivamente curto") || e.includes("sem sentido")
  );

  if ((tooShort || hasSeriousErrors) && reGenerateFn) {
    console.warn("[AI-Validator] Conteúdo problemático, tentando re-geração...", errors);
    try {
      const correctionPrompt = `Reescreve o conteúdo abaixo de forma limpa e directa, em Português de Angola.
NÃO uses frases como "Aqui está", "Este é o resumo".
NÃO uses tags <think> nem mostres o teu raciocínio.
NÃO uses sequências como ---- ou &&& como separadores.
Começa directamente pelo conteúdo académico:

${currentContent || prompt}`;

      const fixed = await reGenerateFn(correctionPrompt);
      if (fixed && fixed.length > 300) {
        let cleaned = stripReasoningTags(fixed);
        cleaned = stripMetaPhrases(cleaned);
        cleaned = stripSymbolNoise(cleaned);
        cleaned = fixMarkdownErrors(cleaned);
        return {
          isValid: true,
          fixedContent: cleaned,
          errors: [],
        };
      }
    } catch (e) {
      console.error("[AI-Validator] Falha na re-geração:", e);
    }
  }

  return {
    isValid: errors.length === 0,
    fixedContent: currentContent,
    errors,
  };
}
