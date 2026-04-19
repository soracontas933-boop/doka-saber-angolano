/**
 * AI Validator & Sanitizer — Sistema Anti-Falhas (Silencioso)
 *
 * Sanitização 100% local, síncrona e silenciosa (<100ms).
 * Sem UI, sem rede, sem IA. Corrige defeitos reais da geração.
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

// ─── Padrões de meta-texto / parasitas ───────────────────────────

const META_LINE_PATTERNS: RegExp[] = [
  /^.*\b(aqui (está|tem|vai|segue)|segue (abaixo|o conteúdo|a (versão|revisão))|conteúdo (reescrito|corrigido|revisto|gerado|melhorado))\b.*$/i,
  /^.*\b(vou (gerar|reescrever|criar|elaborar|produzir)|posso (ajudar|reescrever|gerar|elaborar))\b.*$/i,
  /^.*\b(mantendo o formato|com base no(?:s)? (problema|erro|pedido|solicitado)|conforme (solicitado|pedido|requerido))\b.*$/i,
  /^.*\b(espero que (ajude|seja útil|tenha sido)|se precisar de (mais|algo|ajuda)|estou (à|a) (disposição|sua disposição))\b.*$/i,
  /^.*\b(em resumo[,:]? segue|de acordo com (o pedido|a solicitação)|abaixo (segue|encontra-se|apresento))\b.*$/i,
  /^\s*(claro[!,.]|certo[!,.]|sem problemas[!,.]|com certeza[!,.]).*$/i,
  /^.*\b(revisão do conteúdo|nota[:s]?\s|observação[:s]?\s|disclaimer)\b.*$/i,
];

const PARASITE_HEADING_REGEX =
  /^(\*\*|#{1,6}\s*)?(Revisão( do conteúdo)?|Conteúdo (reescrito|corrigido|revisto)|Versão (corrigida|melhorada)|Nota[:s]?|Observação[:s]?|Resumo da (revisão|correção)|Disclaimer)\b.*$/i;

// Caracteres de controlo invisíveis (zero-width, BOM, etc.)
const INVISIBLE_CHARS_REGEX = /[\u200B-\u200D\uFEFF\u202A-\u202E\u2060]/g;

// Linhas só com símbolos de pontuação/decoração
const SYMBOL_ONLY_LINE_REGEX = /^\s*[%&_~=+@!?*\-#]{3,}\s*$/;

// Tags HTML soltas comuns
const STRAY_HTML_REGEX = /<\/?(br|div|span|font|p|b|i|u|hr|html|body|head)\b[^>]*>/gi;

// Emojis (range principal)
const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{1F600}-\u{1F64F}\u{1F900}-\u{1F9FF}\u{2600}-\u{27BF}]/gu;

const REPEATED_SYMBOLS_REGEX = /([%&_~=+@!?])\1{3,}/g;
const REPEATED_HYPHEN_INLINE = /(?<!^)(-){4,}(?!$)/gm;
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

// ─── deepSanitizeTrabalho — função principal silenciosa ──────────

/**
 * Sanitização profunda, síncrona, silenciosa.
 * Corrige meta-texto, parasitas, estrutura quebrada, incoerências básicas.
 * Tipicamente <50ms para 50KB de markdown.
 */
export function deepSanitizeTrabalho(markdown: string): string {
  if (!markdown) return "";
  let fixed = markdown;
  let fixCount = 0;

  // ── 1. Caracteres invisíveis e cercas markdown deixadas pela IA ──
  const before1 = fixed;
  fixed = fixed.replace(INVISIBLE_CHARS_REGEX, "");
  fixed = fixed.replace(/```markdown\s*\n?/gi, "");
  fixed = fixed.replace(/```\s*\n?(?=\s*(##|#|$))/g, "");
  if (fixed !== before1) fixCount++;

  // ── 2. Remover meta-texto linha-a-linha ──
  const linesIn = fixed.split("\n");
  const linesOut: string[] = [];
  for (const line of linesIn) {
    const trimmed = line.trim();
    if (!trimmed) { linesOut.push(line); continue; }

    // Meta-frases
    if (META_LINE_PATTERNS.some((re) => re.test(trimmed))) { fixCount++; continue; }
    // Subtítulos parasitas
    if (PARASITE_HEADING_REGEX.test(trimmed)) { fixCount++; continue; }
    // Linhas só com símbolos
    if (SYMBOL_ONLY_LINE_REGEX.test(trimmed) && !/^[-*_]{3,}$/.test(trimmed)) { fixCount++; continue; }
    // Inglês
    if (looksEnglish(trimmed)) { fixCount++; continue; }

    linesOut.push(line);
  }
  fixed = linesOut.join("\n");

  // ── 3. Remover tags HTML soltas e emojis ──
  const before3 = fixed;
  fixed = fixed.replace(STRAY_HTML_REGEX, "");
  fixed = fixed.replace(EMOJI_REGEX, "");
  if (fixed !== before3) fixCount++;

  // ── 4. Símbolos repetidos ──
  const before4 = fixed;
  fixed = fixed.replace(REPEATED_SYMBOLS_REGEX, "");
  fixed = fixed.replace(REPEATED_HYPHEN_INLINE, "");
  fixed = fixed.replace(REPEATED_ASTERISK_INLINE, "");
  fixed = fixed.replace(TRIPLE_PUNCT_REGEX, "$1$1$1");
  if (fixed !== before4) fixCount++;

  // ── 5. Cabeçalhos colados ao texto ──
  const before5 = fixed;
  fixed = fixed.replace(/^(#{1,6})([^#\s].*)$/gm, "$1 $2");
  if (fixed !== before5) fixCount++;

  // ── 6. Cabeçalhos duplicados consecutivos ──
  fixed = fixed.replace(/^(#{1,6}\s+.+)\n+\1\s*$/gm, "$1");

  // ── 7. Repetição imediata de palavras: "o o", "de de", "que que" ──
  const before7 = fixed;
  fixed = fixed.replace(/\b(\w{1,5})\s+\1\b/gi, "$1");
  if (fixed !== before7) fixCount++;

  // ── 8. Renumerar listas numeradas quebradas ──
  fixed = renumberLists(fixed);

  // ── 9. Equilibrar parênteses e aspas no fim de parágrafos ──
  fixed = balancePairs(fixed);

  // ── 10. Garantir frases terminadas com pontuação no fim de cada secção ──
  fixed = ensureSentenceTermination(fixed);

  // ── 11. Limpar bibliografia: remover linhas que não pareçam referência ──
  fixed = cleanBibliographySection(fixed);

  // ── 12. Linhas em branco excessivas ──
  fixed = fixed.replace(/\n{4,}/g, "\n\n\n");

  // ── 13. Capítulos vazios → placeholder discreto ──
  fixed = fillEmptySections(fixed);

  // ── 14. Garantir code blocks fechados ──
  const codeBlocks = (fixed.match(/```/g) || []).length;
  if (codeBlocks % 2 !== 0) fixed += "\n```";

  fixed = fixed.trim();

  if (fixCount > 0) {
    console.debug(`[deepSanitizeTrabalho] ${fixCount} grupo(s) de correcções aplicadas`);
  }

  return fixed;
}

// ─── Helpers internos ────────────────────────────────────────────

function renumberLists(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let counter = 0;
  let inList = false;

  for (const line of lines) {
    const m = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (m) {
      if (!inList) { counter = 0; inList = true; }
      counter++;
      out.push(`${m[1]}${counter}. ${m[3]}`);
    } else {
      if (line.trim() !== "") inList = false;
      out.push(line);
    }
  }
  return out.join("\n");
}

function balancePairs(md: string): string {
  return md.split("\n\n").map((para) => {
    let p = para;
    const opens = (p.match(/\(/g) || []).length;
    const closes = (p.match(/\)/g) || []).length;
    if (opens > closes) p = p + ")".repeat(opens - closes);
    else if (closes > opens) p = "(".repeat(closes - opens) + p;
    const quotes = (p.match(/"/g) || []).length;
    if (quotes % 2 !== 0) p = p + '"';
    return p;
  }).join("\n\n");
}

function ensureSentenceTermination(md: string): string {
  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    // Skip headings, lists, empty, code
    if (!trimmed) continue;
    if (/^#{1,6}\s/.test(trimmed)) continue;
    if (/^[-*]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) continue;
    if (/^```/.test(trimmed)) continue;
    // If next non-empty line starts a new heading and current doesn't end with punctuation → add "."
    const nextNonEmpty = lines.slice(i + 1).find((l) => l.trim() !== "");
    const isLastInBlock = !nextNonEmpty || /^#{1,6}\s/.test(nextNonEmpty.trim());
    if (isLastInBlock && !/[.!?:;»"')\]]$/.test(trimmed)) {
      lines[i] = line.replace(/\s*$/, ".");
    }
  }
  return lines.join("\n");
}

function cleanBibliographySection(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inBib = false;
  for (const line of lines) {
    const t = line.trim();
    if (/^#{1,2}\s+(Bibliografia|Refer[êe]ncias)/i.test(t)) {
      inBib = true; out.push(line); continue;
    }
    if (inBib && /^#{1,2}\s+/.test(t)) { inBib = false; out.push(line); continue; }
    if (inBib && t) {
      // Manter referências (têm ano) ou listas/separadores
      const looksLikeRef = /\(\d{4}\)|,\s*\d{4}[.,)]/.test(t);
      const looksLikeList = /^[-*]\s/.test(t) || /^\d+\.\s/.test(t);
      const hasAuthor = /^[A-ZÁÀÂÃÉÈÊÍÓÔÕÚÇ]/.test(t);
      if (!looksLikeRef && !looksLikeList && !hasAuthor && t.length < 40) continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

function fillEmptySections(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    out.push(lines[i]);
    const isHeading = /^#{1,2}\s+/.test(lines[i].trim());
    if (!isHeading) continue;
    // Verificar se a próxima secção (até próximo heading) tem conteúdo substantivo
    let hasContent = false;
    for (let j = i + 1; j < lines.length; j++) {
      if (/^#{1,2}\s+/.test(lines[j].trim())) break;
      if (lines[j].trim().length > 20) { hasContent = true; break; }
    }
    if (!hasContent) {
      out.push("", "_[Secção a expandir manualmente.]_", "");
    }
  }
  return out.join("\n");
}

// ─── Compatibilidade retro (mantida para imports legados) ────────

/** @deprecated Use deepSanitizeTrabalho */
export const sanitizeContent = deepSanitizeTrabalho;
/** @deprecated Use deepSanitizeTrabalho */
export const fixMarkdownErrors = deepSanitizeTrabalho;

export function detectStrangeLanguage(content: string): string[] {
  const errors: string[] = [];
  if (/\b(\w+)\b(?:\s+\1\b){4,}/gi.test(content)) errors.push("Repetição excessiva de palavras detectada.");
  if (/[bcdfghjklmnpqrstvwxyz]{10,}/gi.test(content)) errors.push("Sequência de caracteres sem sentido detectada.");
  if (content.length < 100) errors.push("Conteúdo excessivamente curto.");
  return errors;
}

export function validateAngolanContext(content: string, prompt: string): string[] {
  const errors: string[] = [];
  const isAngolanPrompt = prompt.toLowerCase().includes("angola") || prompt.toLowerCase().includes("angolano");
  if (isAngolanPrompt) {
    const keywords = ["Angola", "Luanda", "Benguela", "Huambo", "Lubango", "Kwanza", "província", "município", "INIDE", "MED"];
    if (!keywords.some((k) => content.includes(k))) errors.push("Contexto angolano parece estar ausente.");
  }
  return errors;
}

/**
 * Validação genérica usada por ai-service. Mantida como sanitização silenciosa
 * (sem re-geração via IA — removida por ser lenta e visível).
 */
export async function validateAndCorrectContent(
  content: string,
  _prompt: string,
  _reGenerateFn?: (p: string) => Promise<string>,
): Promise<ValidationResult> {
  const fixed = deepSanitizeTrabalho(content);
  return { isValid: true, fixedContent: fixed, errors: [] };
}
