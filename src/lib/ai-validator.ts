/**
 * AI Validator & Corrector — Sistema Anti-Falhas
 *
 * 3 camadas de defesa contra falhas da IA:
 *  1. Sanitização determinística (regex)
 *  2. Validação estrutural por secção
 *  3. Auto-correção / re-geração assistida
 */

export interface ValidationResult {
  isValid: boolean;
  fixedContent: string;
  errors: string[];
}

export interface SectionIssue {
  sectionTitle: string;
  sectionType: "introducao" | "capitulo" | "conclusao" | "bibliografia";
  reasons: string[];
  severity: "low" | "medium" | "high";
}

export interface TrabalhoValidationResult {
  ok: boolean;
  issues: SectionIssue[];
  fixedContent: string;
}

// ─── CAMADA 1: Sanitização determinística ────────────────────────

const META_PHRASES_REGEX =
  /^.*(aqui (está|tem|vai)|conteúdo (reescrito|corrigido|revisto|gerado)|mantendo o formato|problemas identificados|com base no(?:s)? (problema|erro)|segue (abaixo|o conteúdo)|posso (ajudar|reescrever|gerar)|vou (gerar|reescrever|criar)|claro[!,.]|certo[!,.]|sem problemas[!,.]|revisão do conteúdo).*$/gim;

const PARASITE_HEADINGS_REGEX =
  /^(\*\*|#{1,6}\s*)?(Revisão do conteúdo|Conteúdo (reescrito|corrigido|revisto)|Versão (corrigida|melhorada)|Nota[:s]?\b|Observação[:s]?\b).*$/gim;

const REPEATED_SYMBOLS_REGEX = /([%&_~=+@!?])\1{3,}/g;
// Hífenes e asteriscos podem ser markdown válido (---, ***), trata-os com mais cuidado
const REPEATED_HYPHEN_INLINE = /(?<!^)(-){3,}(?!$)/gm;
const REPEATED_ASTERISK_INLINE = /(?<!\*)\*{4,}(?!\*)/g;
const TRIPLE_PUNCT_REGEX = /([.!?]){4,}/g;

const COMMON_ENGLISH_WORDS = new Set([
  "the", "and", "this", "that", "with", "for", "from", "have", "will",
  "are", "was", "were", "been", "being", "here", "there", "content",
  "what", "when", "where", "which", "who", "how", "your", "you", "our",
  "their", "them", "they", "these", "those", "some", "any", "all",
  "would", "could", "should", "about", "into", "than", "then", "such",
  "also", "more", "most", "other", "based", "made", "make", "use",
]);

function looksEnglish(line: string): boolean {
  const words = line.toLowerCase().match(/\b[a-z]+\b/g);
  if (!words || words.length < 6) return false;
  const englishCount = words.filter((w) => COMMON_ENGLISH_WORDS.has(w)).length;
  return englishCount / words.length > 0.55;
}

/**
 * Sanitização agressiva — remove meta-texto, símbolos repetidos, inglês.
 */
export function sanitizeContent(content: string): string {
  let fixed = content;

  // Remover linhas meta
  fixed = fixed.replace(META_PHRASES_REGEX, "");
  // Remover subtítulos parasitas
  fixed = fixed.replace(PARASITE_HEADINGS_REGEX, "");

  // Colapsar símbolos repetidos
  fixed = fixed.replace(REPEATED_SYMBOLS_REGEX, "");
  fixed = fixed.replace(REPEATED_HYPHEN_INLINE, "");
  fixed = fixed.replace(REPEATED_ASTERISK_INLINE, "");
  fixed = fixed.replace(TRIPLE_PUNCT_REGEX, "$1$1$1");

  // Remover linhas inteiras que parecem inglês
  fixed = fixed
    .split("\n")
    .filter((line) => !looksEnglish(line.trim()))
    .join("\n");

  // Markdown errors
  fixed = fixed.replace(/```markdown\s*---/g, "---");
  fixed = fixed.replace(/```markdown\s*```/g, "```");
  fixed = fixed.replace(/```markdown\s*markdown/g, "```markdown");

  // Garantir blocos fechados
  const codeBlocks = (fixed.match(/```/g) || []).length;
  if (codeBlocks % 2 !== 0) fixed += "\n```";

  // Cabeçalhos sem espaço
  fixed = fixed.replace(/^(#{1,6})([^#\s].*)$/gm, "$1 $2");

  // Limpar linhas vazias múltiplas
  fixed = fixed.replace(/\n{4,}/g, "\n\n\n").trim();

  return fixed;
}

/** @deprecated Use sanitizeContent */
export const fixMarkdownErrors = sanitizeContent;

// ─── Detecção de anomalias de linguagem ──────────────────────────

export function detectStrangeLanguage(content: string): string[] {
  const errors: string[] = [];

  if (/\b(\w+)\b(?:\s+\1\b){4,}/gi.test(content)) {
    errors.push("Repetição excessiva de palavras detectada.");
  }
  if (/[bcdfghjklmnpqrstvwxyz]{10,}/gi.test(content)) {
    errors.push("Sequência de caracteres sem sentido detectada.");
  }
  if (content.length < 100) {
    errors.push("Conteúdo excessivamente curto.");
  }
  return errors;
}

export function validateAngolanContext(content: string, prompt: string): string[] {
  const errors: string[] = [];
  const isAngolanPrompt =
    prompt.toLowerCase().includes("angola") ||
    prompt.toLowerCase().includes("angolano");
  if (isAngolanPrompt) {
    const keywords = ["Angola", "Luanda", "Benguela", "Huambo", "Lubango", "Kwanza", "província", "município", "INIDE", "MED"];
    if (!keywords.some((k) => content.includes(k))) {
      errors.push("Contexto angolano parece estar ausente.");
    }
  }
  return errors;
}

// ─── CAMADA 2: Validação estrutural por secção ──────────────────

const META_START_REGEX =
  /^\s*(aqui (está|tem|vai)|segue|vou|posso|claro|certo|com base|conforme|de acordo)/i;
const PLACEHOLDER_REGEX = /\[(inserir|placeholder|preencher|colocar|nome|texto|conteúdo)\b[^\]]*\]|TODO|XXX|\.\.\.continua|continua\.\.\./i;
const H3_REGEX = /^###\s+/m;

export function validateTrabalhoSection(
  titulo: string,
  conteudo: string,
  tipo: "introducao" | "capitulo" | "conclusao" | "bibliografia",
): SectionIssue | null {
  const reasons: string[] = [];
  let severity: SectionIssue["severity"] = "low";

  const trimmed = conteudo.trim();

  // Tamanho mínimo
  if (trimmed.length < 300) {
    reasons.push(`Conteúdo demasiado curto (${trimmed.length} caracteres, mínimo 300).`);
    severity = "high";
  }

  // Meta-frases no início
  if (META_START_REGEX.test(trimmed)) {
    reasons.push("Começa com meta-frase típica de IA (\"Aqui está\", \"Vou\", etc.).");
    severity = "high";
  }

  // Placeholders
  if (PLACEHOLDER_REGEX.test(trimmed)) {
    reasons.push("Contém marcadores de posição não preenchidos.");
    severity = "high";
  }

  // Subtítulos H3 em Introdução/Conclusão
  if ((tipo === "introducao" || tipo === "conclusao") && H3_REGEX.test(trimmed)) {
    reasons.push("Não deve conter subtítulos H3 (### ).");
    severity = severity === "low" ? "medium" : severity;
  }

  // Bibliografia: ≥5 referências
  if (tipo === "bibliografia") {
    const refMatches = trimmed.match(/\(\d{4}\)|,\s*\d{4}[.,)]/g) || [];
    if (refMatches.length < 5) {
      reasons.push(`Bibliografia tem apenas ${refMatches.length} referência(s) detectadas (mínimo 5).`);
      severity = "high";
    }
  }

  // Símbolos repetidos remanescentes
  if (REPEATED_SYMBOLS_REGEX.test(trimmed) || /([_\-*=]){5,}/.test(trimmed)) {
    reasons.push("Contém símbolos repetidos sem sentido.");
    severity = severity === "low" ? "medium" : severity;
  }

  if (reasons.length === 0) return null;

  return {
    sectionTitle: titulo,
    sectionType: tipo,
    reasons,
    severity,
  };
}

/**
 * Valida o trabalho completo (parsea secções a partir de markdown).
 */
export function validateTrabalhoCompleto(markdown: string): TrabalhoValidationResult {
  // Sanitize first
  const fixedContent = sanitizeContent(markdown);

  const issues: SectionIssue[] = [];
  const sections = splitIntoSections(fixedContent);

  for (const sec of sections) {
    if (sec.tipo === "indice") continue; // índice é gerado automaticamente
    const issue = validateTrabalhoSection(sec.titulo, sec.conteudo, sec.tipo);
    if (issue) issues.push(issue);
  }

  return {
    ok: issues.length === 0,
    issues,
    fixedContent,
  };
}

interface ParsedSection {
  titulo: string;
  tipo: "introducao" | "capitulo" | "conclusao" | "bibliografia" | "indice";
  conteudo: string;
}

function splitIntoSections(markdown: string): ParsedSection[] {
  const lines = markdown.split("\n");
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (current) {
      current.conteudo = buffer.join("\n").trim();
      sections.push(current);
    }
    buffer = [];
  };

  for (const line of lines) {
    const t = line.trim();
    const headingMatch = t.match(/^#{1,2}\s+(.+)$/);
    if (headingMatch) {
      flush();
      const titulo = headingMatch[1].replace(/\*\*/g, "").trim();
      let tipo: ParsedSection["tipo"] = "capitulo";
      if (/^[íi]ndice/i.test(titulo)) tipo = "indice";
      else if (/^introdu[çc][ãa]o/i.test(titulo)) tipo = "introducao";
      else if (/^conclus[ãa]o/i.test(titulo)) tipo = "conclusao";
      else if (/^(bibliografia|refer[êe]ncias)/i.test(titulo)) tipo = "bibliografia";
      current = { titulo, tipo, conteudo: "" };
    } else {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

// ─── CAMADA 3: Função principal de validação genérica ────────────

export async function validateAndCorrectContent(
  content: string,
  prompt: string,
  reGenerateFn?: (p: string) => Promise<string>,
): Promise<ValidationResult> {
  let currentContent = sanitizeContent(content);
  const errors: string[] = [];

  errors.push(...detectStrangeLanguage(currentContent));
  errors.push(...validateAngolanContext(currentContent, prompt));

  if (errors.length > 0 && reGenerateFn) {
    console.warn("[AI-Validator] Erros detectados, tentando re-geração:", errors);
    try {
      const correctionPrompt = `O conteúdo seguinte tem erros: ${errors.join(", ")}.
Reescreve EXCLUSIVAMENTE em Português de Angola, mantendo o formato Markdown e SEM meta-texto (não digas "aqui está" ou similar):

${currentContent}`;
      const fixed = await reGenerateFn(correctionPrompt);
      if (fixed && fixed.length > 100) {
        return {
          isValid: true,
          fixedContent: sanitizeContent(fixed),
          errors: [],
        };
      }
    } catch (e) {
      console.error("[AI-Validator] Falha na correção:", e);
    }
  }

  return {
    isValid: errors.length === 0,
    fixedContent: currentContent,
    errors,
  };
}
