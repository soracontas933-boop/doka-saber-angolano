/**
 * SISTEMA DE PAGINAÇÃO INTELIGENTE
 * 
 * Garante que nenhum conteúdo seja cortado entre páginas, tanto na pré-visualização
 * quanto na exportação em PDF. Implementa medição dinâmica de altura de cards e
 * distribuição inteligente em múltiplas páginas.
 * 
 * REGRAS OBRIGATÓRIAS:
 * - Cada card/bloco é tratado como indivisível
 * - Nunca permitir quebra de página dentro de um card
 * - Aplicar obrigatoriamente break-inside: avoid e page-break-inside: avoid
 * - Nenhum elemento pode ter overflow: hidden ou altura fixa
 * - Todos os containers devem usar height: auto e overflow: visible
 */

export interface CardMetrics {
  element: HTMLElement;
  height: number;
  minHeight: number;
}

export interface PageLayout {
  cards: HTMLElement[];
  totalHeight: number;
  pageNumber: number;
}

/**
 * Mede a altura real de um elemento removendo temporariamente
 * overflow: hidden e alturas fixas para obter a medida verdadeira
 */
export function measureElementHeight(element: HTMLElement): number {
  // Salva estilos originais
  const originalOverflow = element.style.overflow;
  const originalHeight = element.style.height;
  const originalMaxHeight = element.style.maxHeight;
  const originalDisplay = element.style.display;

  try {
    // Remove restrições de tamanho para medir conteúdo real
    element.style.overflow = 'visible';
    element.style.height = 'auto';
    element.style.maxHeight = 'none';
    element.style.display = 'block';

    // Força o browser a recalcular o layout
    const height = element.scrollHeight;
    
    // Garante que temos uma medida válida
    return Math.max(height, element.offsetHeight, element.clientHeight);
  } finally {
    // Restaura estilos originais
    element.style.overflow = originalOverflow;
    element.style.height = originalHeight;
    element.style.maxHeight = originalMaxHeight;
    element.style.display = originalDisplay;
  }
}

/**
 * Coleta todos os cards de um container e retorna suas métricas
 */
export function collectCardMetrics(container: HTMLElement): CardMetrics[] {
  const cards: CardMetrics[] = [];
  
  // Procura por elementos que parecem ser cards/blocos
  const cardSelectors = [
    '[data-card]',
    '[data-block]',
    '[style*="break-inside: avoid"]',
    '[style*="pageBreakInside: avoid"]',
    '.card',
    '.block',
    '[role="article"]',
  ];

  let elements = new Set<HTMLElement>();
  
  for (const selector of cardSelectors) {
    try {
      container.querySelectorAll(selector).forEach((el) => {
        if (el instanceof HTMLElement) {
          elements.add(el);
        }
      });
    } catch (e) {
      // Selector inválido, continua
    }
  }

  // Se não encontrou cards específicos, trata divs diretos como cards
  if (elements.size === 0) {
    container.querySelectorAll('> div').forEach((el) => {
      if (el instanceof HTMLElement) {
        elements.add(el);
      }
    });
  }

  // Converte para array e ordena por posição no DOM
  const sortedElements = Array.from(elements).sort((a, b) => {
    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });

  for (const element of sortedElements) {
    const height = measureElementHeight(element);
    cards.push({
      element,
      height,
      minHeight: height,
    });
  }

  return cards;
}

/**
 * Distribui cards em páginas garantindo que nenhum seja cortado
 * 
 * Algoritmo:
 * 1. Mede altura de cada card
 * 2. Se card cabe na página atual, adiciona
 * 3. Se não cabe, move para próxima página
 * 4. Garante que cada página respeita o limite de altura
 */
export function paginateCards(
  cards: CardMetrics[],
  pageHeight: number,
  padding: number = 48
): PageLayout[] {
  const pages: PageLayout[] = [];
  const usableHeight = pageHeight - padding * 2;
  
  let currentPage: HTMLElement[] = [];
  let currentHeight = 0;
  let pageNumber = 1;

  for (const card of cards) {
    const cardHeight = card.height;
    
    // Se o card sozinho é maior que a página, ainda assim o coloca na página
    // (não pode ser dividido)
    if (cardHeight > usableHeight && currentPage.length === 0) {
      currentPage.push(card.element);
      currentHeight = cardHeight;
      pages.push({
        cards: currentPage,
        totalHeight: currentHeight,
        pageNumber,
      });
      currentPage = [];
      currentHeight = 0;
      pageNumber++;
      continue;
    }

    // Se o card não cabe na página atual, move para próxima
    if (currentHeight + cardHeight > usableHeight && currentPage.length > 0) {
      pages.push({
        cards: currentPage,
        totalHeight: currentHeight,
        pageNumber,
      });
      currentPage = [];
      currentHeight = 0;
      pageNumber++;
    }

    // Adiciona o card à página atual
    currentPage.push(card.element);
    currentHeight += cardHeight;
  }

  // Adiciona última página se houver conteúdo
  if (currentPage.length > 0) {
    pages.push({
      cards: currentPage,
      totalHeight: currentHeight,
      pageNumber,
    });
  }

  return pages;
}

/**
 * Aplica estilos de paginação a um elemento para garantir
 * que ele nunca seja cortado entre páginas
 */
export function applyPageBreakStyles(element: HTMLElement): void {
  // Estilos obrigatórios para impedir corte
  element.style.breakInside = 'avoid';
  element.style.pageBreakInside = 'avoid';
  element.style.overflow = 'visible';
  element.style.height = 'auto';
  
  // Aplica também a todos os filhos diretos
  element.querySelectorAll('*').forEach((child) => {
    if (child instanceof HTMLElement) {
      const computedStyle = window.getComputedStyle(child);
      
      // Só aplica se não tiver já definido
      if (!child.style.breakInside) {
        child.style.breakInside = 'avoid';
      }
      if (!child.style.pageBreakInside) {
        child.style.pageBreakInside = 'avoid';
      }
      
      // Remove overflow: hidden se estiver definido
      if (computedStyle.overflow === 'hidden') {
        child.style.overflow = 'visible';
      }
      
      // Remove altura fixa em elementos que parecem ser containers
      if (child.tagName === 'DIV' || child.tagName === 'SECTION' || child.tagName === 'ARTICLE') {
        if (child.style.height && child.style.height !== 'auto') {
          // Verifica se é uma altura fixa (não porcentagem)
          if (!child.style.height.includes('%')) {
            child.style.height = 'auto';
          }
        }
      }
    }
  });
}

/**
 * Detecta quando o conteúdo interno de um card ultrapassa seu tamanho
 * e retorna informações sobre o overflow
 */
export function detectOverflow(element: HTMLElement): {
  hasOverflow: boolean;
  scrollHeight: number;
  clientHeight: number;
  difference: number;
} {
  return {
    hasOverflow: element.scrollHeight > element.clientHeight,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    difference: element.scrollHeight - element.clientHeight,
  };
}

/**
 * Valida que um elemento respeita as regras de paginação
 */
export function validatePaginationRules(element: HTMLElement): {
  isValid: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  const style = window.getComputedStyle(element);

  // Verifica overflow: hidden
  if (style.overflow === 'hidden') {
    violations.push('overflow: hidden detectado');
  }

  // Verifica altura fixa (não auto)
  if (element.style.height && element.style.height !== 'auto' && !element.style.height.includes('%')) {
    violations.push(`altura fixa detectada: ${element.style.height}`);
  }

  // Verifica se break-inside: avoid está definido
  if (style.breakInside !== 'avoid' && style.pageBreakInside !== 'avoid') {
    violations.push('break-inside: avoid não definido');
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Cria um wrapper de página A4 com as dimensões corretas
 */
export function createPageWrapper(
  orientation: 'portrait' | 'landscape' = 'portrait',
  padding: number = 48
): HTMLDivElement {
  const wrapper = document.createElement('div');
  
  // Dimensões A4 em pixels (96 DPI)
  const W = orientation === 'landscape' ? 1123 : 794;
  const H = orientation === 'landscape' ? 794 : 1123;
  
  wrapper.style.cssText = `
    width: ${W}px;
    height: ${H}px;
    padding: ${padding}px;
    background: white;
    box-sizing: border-box;
    overflow: visible;
    page-break-inside: avoid;
    break-inside: avoid;
    position: relative;
  `;
  
  wrapper.setAttribute('data-a4-page', '1');
  
  return wrapper;
}
