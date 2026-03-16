export interface TrabalhoSection {
  tipo: "indice" | "introducao" | "capitulo" | "conclusao" | "bibliografia";
  titulo: string;
  conteudo: string;
  numero?: number;
}

/**
 * Parses AI-generated markdown into structured sections for paginated display.
 */
export function parseTrabalhoSections(markdown: string): TrabalhoSection[] {
  const sections: TrabalhoSection[] = [];
  const lines = markdown.split("\n");

  let currentSection: TrabalhoSection | null = null;
  let currentLines: string[] = [];

  const flushSection = () => {
    if (currentSection) {
      currentSection.conteudo = currentLines.join("\n").trim();
      if (currentSection.conteudo || currentSection.tipo === "indice") {
        sections.push(currentSection);
      }
    }
    currentLines = [];
  };

  const sectionPatterns = [
    { regex: /^#{1,2}\s*[ÍI]ndice/i, tipo: "indice" as const },
    { regex: /^#{1,2}\s*Introdu[çc][ãa]o/i, tipo: "introducao" as const },
    { regex: /^#{1,2}\s*Conclus[ãa]o/i, tipo: "conclusao" as const },
    { regex: /^#{1,2}\s*Bibliografia/i, tipo: "bibliografia" as const },
    { regex: /^#{1,2}\s*Refer[êe]ncias/i, tipo: "bibliografia" as const },
    { regex: /^#{1,2}\s*(?:Cap[ií]tulo\s*)?(\d+)[.\s—–-]+(.+)/i, tipo: "capitulo" as const },
    { regex: /^#{1,2}\s+(.+)/i, tipo: "capitulo" as const },
  ];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip capa-related lines (the capa is rendered separately)
    if (/^#{1,2}\s*Capa/i.test(trimmed)) continue;

    let matched = false;
    for (const pattern of sectionPatterns) {
      const match = trimmed.match(pattern.regex);
      if (match) {
        flushSection();
        const titulo = pattern.tipo === "capitulo"
          ? (match[2] || match[1] || trimmed.replace(/^#{1,2}\s*/, "")).trim()
          : pattern.tipo.charAt(0).toUpperCase() + pattern.tipo.slice(1);
        
        currentSection = {
          tipo: pattern.tipo,
          titulo: titulo.replace(/\*\*/g, ""),
          conteudo: "",
        };
        matched = true;
        break;
      }
    }

    if (!matched) {
      // If no current section, create an implicit one
      if (!currentSection && trimmed) {
        currentSection = {
          tipo: "introducao",
          titulo: "Introdução",
          conteudo: "",
        };
      }
      currentLines.push(line);
    }
  }

  flushSection();

  // Assign page numbers (capa=1, índice=2, then 3+)
  let pageNum = 3;
  for (const section of sections) {
    if (section.tipo === "indice") {
      section.numero = 2;
    } else {
      section.numero = pageNum++;
    }
  }

  return sections;
}

/**
 * Renders markdown content to HTML for display inside A4 pages.
 */
export function renderMarkdownToHTML(content: string): string {
  return content
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/^####\s+(.+)$/gm, '<h4 class="secao-subtitulo-4">$1</h4>')
    .replace(/^###\s+(.+)$/gm, '<h3 class="secao-subtitulo">$1</h3>')
    .replace(/^##\s+(.+)$/gm, '<h2 class="secao-titulo">$1</h2>')
    .replace(/^#\s+(.+)$/gm, '<h1 class="secao-titulo-principal">$1</h1>')
    .replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul class="secao-lista">${match}</ul>`)
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="secao-lista-num">$1</li>')
    .replace(/\n{2,}/g, '</p><p class="secao-paragrafo">')
    .replace(/\n/g, "<br/>")
    .replace(/^/, '<p class="secao-paragrafo">')
    .replace(/$/, "</p>");
}
