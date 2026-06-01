import DOMPurify from "dompurify";

export interface TrabalhoSection {
  tipo: "indice" | "introducao" | "capitulo" | "conclusao" | "bibliografia";
  titulo: string;
  conteudo: string;
  numero?: number;
  ordemOriginal?: number;
}

/**
 * Parses AI-generated markdown into structured sections for paginated display.
 * Aplica reordenação canónica: índice → introdução → capítulos → conclusão → bibliografia.
 */
export function parseTrabalhoSections(markdown: string): TrabalhoSection[] {
  const sections: TrabalhoSection[] = [];
  const lines = markdown.split("\n");

  let currentSection: TrabalhoSection | null = null;
  let currentLines: string[] = [];
  let ordemCounter = 0;

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

    // Skip capa-related lines (capa is rendered separately)
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
          ordemOriginal: ordemCounter++,
        };
        matched = true;
        break;
      }
    }

    if (!matched) {
      if (!currentSection && trimmed) {
        currentSection = {
          tipo: "introducao",
          titulo: "Introdução",
          conteudo: "",
          ordemOriginal: ordemCounter++,
        };
      }
      currentLines.push(line);
    }
  }

  flushSection();

  // ─── Reordenação canónica ─────────────────────────────────────
  // Ordem oficial: índice → introdução → capítulos (pela ordem original) → conclusão → bibliografia
  const tipoOrder: Record<TrabalhoSection["tipo"], number> = {
    indice: 0,
    introducao: 1,
    capitulo: 2,
    conclusao: 3,
    bibliografia: 4,
  };

  // Deduplicar (manter última ocorrência de cada tipo único exceto capítulos)
  const dedupMap = new Map<string, TrabalhoSection>();
  const capitulos: TrabalhoSection[] = [];
  for (const s of sections) {
    if (s.tipo === "capitulo") {
      capitulos.push(s);
    } else {
      // mantém o mais longo se houver duplicado
      const existing = dedupMap.get(s.tipo);
      if (!existing || s.conteudo.length > existing.conteudo.length) {
        dedupMap.set(s.tipo, s);
      }
    }
  }

  const ordered: TrabalhoSection[] = [];
  if (dedupMap.has("indice")) ordered.push(dedupMap.get("indice")!);
  if (dedupMap.has("introducao")) ordered.push(dedupMap.get("introducao")!);
  // Capítulos: ordenar por número detectado no título, fallback para ordem original
  capitulos.sort((a, b) => {
    const numA = parseInt(a.titulo.match(/^(\d+)/)?.[1] || "", 10);
    const numB = parseInt(b.titulo.match(/^(\d+)/)?.[1] || "", 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return (a.ordemOriginal ?? 0) - (b.ordemOriginal ?? 0);
  });
  ordered.push(...capitulos);
  if (dedupMap.has("conclusao")) ordered.push(dedupMap.get("conclusao")!);
  if (dedupMap.has("bibliografia")) ordered.push(dedupMap.get("bibliografia")!);

  // Atribuir números de página DEPOIS da reordenação
  let pageNum = 3;
  for (const section of ordered) {
    if (section.tipo === "indice") {
      section.numero = 2;
    } else {
      section.numero = pageNum++;
    }
  }

  return ordered;
}

/**
 * Renders markdown content to HTML for display inside A4 pages.
 */
export function renderMarkdownToHTML(content: string): string {
  // Escape any raw HTML in the AI-generated content first so that markup such as
  // <script> or <img onerror=...> from prompt injection cannot be rendered.
  const escaped = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  let html = escaped
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

  // Wrap inline academic citations in styled span
  html = html.replace(
    /\(([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+(?:\s*(?:&|e)\s*[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ][a-záàâãéèêíïóôõöúçñ]+)*(?:\s+et\s+al\.?)?,\s*\d{4}(?:,\s*p+\.\s*\d+(?:-\d+)?)?)\)/g,
    '<span class="citacao-inline">($1)</span>'
  );

  return html;
}
