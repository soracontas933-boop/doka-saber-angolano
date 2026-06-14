/**
 * Utilitário para cálculo de paginação e validação de conteúdo para monografias.
 * Garante que o conteúdo gerado respeita o número de páginas solicitado.
 */

export interface PaginationMetrics {
  totalWords: number;
  estimatedPages: number;
  wordsPerPage: number;
  isValid: boolean;
  message: string;
}

/**
 * Calcula métricas de paginação baseado no conteúdo markdown.
 * Usa ~250 palavras por página A4 com formatação académica.
 */
export function calculatePaginationMetrics(
  markdown: string,
  targetPages: number,
  type: "introducao" | "capitulo" | "conclusao" | "bibliografia" = "capitulo"
): PaginationMetrics {
  // Remove markdown formatting para contar palavras reais
  const cleanText = markdown
    .replace(/[#*`\[\]()]/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleanText.split(" ").filter((w) => w.length > 0).length;

  // Densidade de palavras por página (A4, 12pt, margens 25mm)
  // ~250 palavras por página é o padrão para textos académicos
  const wordsPerPage = 250;
  const estimatedPages = Math.ceil(words / wordsPerPage);

  // Validação baseada no tipo de secção
  const minWords = getMinimumWords(type);
  const isValid = words >= minWords;

  let message = "";
  if (isValid) {
    message = `✓ ${words} palavras (~${estimatedPages} páginas) — Conteúdo adequado`;
  } else {
    message = `✗ ${words} palavras (~${estimatedPages} páginas) — Mínimo esperado: ${minWords} palavras`;
  }

  return {
    totalWords: words,
    estimatedPages,
    wordsPerPage,
    isValid,
    message,
  };
}

/**
 * Retorna o mínimo de palavras esperadas por tipo de secção.
 */
function getMinimumWords(type: "introducao" | "capitulo" | "conclusao" | "bibliografia"): number {
  const minimums: Record<typeof type, number> = {
    introducao: 2500, // ~10 páginas
    capitulo: 2500,   // ~10 páginas por capítulo
    conclusao: 1200,  // ~5 páginas
    bibliografia: 500, // ~2 páginas
  };
  return minimums[type];
}

/**
 * Calcula o número de capítulos necessários para atingir o número de páginas.
 * Usa a heurística: cada capítulo deve ter ~5 páginas.
 */
export function calculateRequiredChapters(totalPages: number): number {
  const pagesPerChapter = 5;
  // Estrutura: Capa (1) + Índice (1) + Introdução (3-4) + Capítulos + Conclusão (2-3) + Bibliografia (1-2)
  // Overhead = ~10 páginas
  const overhead = 10;
  const availableForChapters = Math.max(0, totalPages - overhead);
  const chapters = Math.max(5, Math.ceil(availableForChapters / pagesPerChapter));
  return Math.min(10, chapters); // Máximo 10 capítulos
}

/**
 * Valida se o conteúdo total (todos os subtemas) atinge o número de páginas solicitado.
 */
export function validateTotalContent(
  subtemas: Array<{ conteudo: string; tipo: string }>,
  targetPages: number
): { isValid: boolean; totalPages: number; deficit: number; message: string } {
  let totalWords = 0;

  for (const subtema of subtemas) {
    const cleanText = subtema.conteudo
      .replace(/[#*`\[\]()]/g, " ")
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const words = cleanText.split(" ").filter((w) => w.length > 0).length;
    totalWords += words;
  }

  const wordsPerPage = 250;
  const totalPages = Math.ceil(totalWords / wordsPerPage);
  const deficit = Math.max(0, targetPages - totalPages);
  const isValid = totalPages >= targetPages;

  let message = "";
  if (isValid) {
    message = `✓ Total: ${totalWords} palavras (~${totalPages} páginas) — Meta de ${targetPages} páginas atingida!`;
  } else {
    message = `✗ Total: ${totalWords} palavras (~${totalPages} páginas) — Faltam ~${deficit} páginas para atingir ${targetPages}`;
  }

  return { isValid, totalPages, deficit, message };
}

/**
 * Gera recomendação de conteúdo adicional necessário.
 */
export function getContentRecommendation(
  deficit: number,
  totalSubtemas: number
): string {
  if (deficit <= 0) return "Conteúdo adequado!";

  const wordsNeeded = deficit * 250;
  const wordsPerSubtema = Math.ceil(wordsNeeded / totalSubtemas);

  return `Adicione aproximadamente ${wordsNeeded} palavras no total (${wordsPerSubtema} palavras por subtema em média) para atingir a meta.`;
}
