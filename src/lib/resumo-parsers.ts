/**
 * Sanitiza saída de IA: remove blocos JSON, marcadores estranhos como "•[", "•{",
 * e limpa "code fences" remanescentes.
 */
export function sanitizeResumo(raw: string): string {
  let text = raw || "";

  // remove cercas de código ```...```
  text = text.replace(/```[a-zA-Z]*\n?/g, "").replace(/```/g, "");

  // remove linhas que sejam puro "•[" ou "•]" ou "•{...}" (artefacto comum)
  text = text
    .split("\n")
    .filter((l) => {
      const t = l.trim();
      if (!t) return true;
      if (/^[•\-*]\s*[\[\]{}]+\s*$/.test(t)) return false;
      if (/^[•\-*]\s*\{.*"frente".*"verso".*\}\s*,?\s*$/.test(t)) return false;
      return true;
    })
    .join("\n");

  // remove blocos JSON óbvios [{...}, {...}]
  text = text.replace(/\[\s*\{[\s\S]*?\}\s*\](?=\s|$)/g, "");

  // remove linhas que começam com "•" duplicado ("•• ")
  text = text.replace(/^•\s*/gm, "- ");

  // colapsa múltiplas linhas em branco
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

export interface MapaBranch { label: string; items: string[] }
export interface MapaMental { central: string; branches: MapaBranch[] }

/** Parseia # central + ## ramo \n - itens */
export function parseMapaMental(raw: string): MapaMental {
  const text = sanitizeResumo(raw);
  const lines = text.split("\n");
  let central = "";
  const branches: MapaBranch[] = [];
  let current: MapaBranch | null = null;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith("# ") && !central) {
      central = t.replace(/^#\s*/, "").replace(/\*\*/g, "");
      continue;
    }
    if (t.startsWith("## ")) {
      if (current) branches.push(current);
      current = { label: t.replace(/^##\s*/, "").replace(/\*\*/g, ""), items: [] };
      continue;
    }
    if (/^[-*•]\s/.test(t) && current) {
      current.items.push(t.replace(/^[-*•]\s*/, "").replace(/\*\*/g, ""));
    }
  }
  if (current) branches.push(current);
  if (!central) central = "Mapa Mental";
  return { central, branches };
}

export interface Flashcard { frente: string; verso: string }

/** Parseia flashcards no formato Markdown ## N \n **Frente:** ... \n **Verso:** ... */
export function parseFlashcards(raw: string): Flashcard[] {
  const text = sanitizeResumo(raw);
  const cards: Flashcard[] = [];

  // formato preferido: **Frente:** ... **Verso:** ...
  const blocks = text.split(/\n##\s+/).slice(1);
  for (const b of blocks) {
    const frenteMatch = b.match(/\*\*Frente:?\*\*\s*([\s\S]*?)(?=\*\*Verso:?\*\*|$)/i);
    const versoMatch = b.match(/\*\*Verso:?\*\*\s*([\s\S]*?)(?=\n##\s|\n#\s|$)/i);
    if (frenteMatch && versoMatch) {
      cards.push({
        frente: frenteMatch[1].trim().replace(/\*\*/g, ""),
        verso: versoMatch[1].trim().replace(/\*\*/g, ""),
      });
    }
  }

  if (cards.length > 0) return cards;

  // fallback: tenta JSON ainda presente
  const jsonMatch = raw.match(/\[\s*\{[\s\S]*?\}\s*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((p: any) => p && (p.frente || p.pergunta) && (p.verso || p.resposta))
          .map((p: any) => ({
            frente: String(p.frente || p.pergunta),
            verso: String(p.verso || p.resposta),
          }));
      }
    } catch {}
  }
  return cards;
}

export interface TimelineEvent { data: string; titulo: string; descricao: string }

export function parseLinhaTempo(raw: string): TimelineEvent[] {
  const text = sanitizeResumo(raw);
  const events: TimelineEvent[] = [];
  const blocks = text.split(/\n##\s+/).slice(1);
  for (const b of blocks) {
    const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
    const data = lines[0]?.replace(/\*\*/g, "") || "";
    const rest = lines.slice(1).join(" ").replace(/^[-*•]\s*/, "");
    const m = rest.match(/\*\*([^*]+):\*\*\s*(.*)/);
    if (m) {
      events.push({ data, titulo: m[1].trim(), descricao: m[2].trim() });
    } else if (rest) {
      events.push({ data, titulo: rest.replace(/\*\*/g, ""), descricao: "" });
    }
  }
  return events;
}

export interface Comparativo { headers: string[]; rows: string[][] }

export function parseQuadroComparativo(raw: string): Comparativo | null {
  const text = sanitizeResumo(raw);
  const lines = text.split("\n").map((l) => l.trim());
  const tableLines = lines.filter((l) => l.startsWith("|") && l.endsWith("|"));
  if (tableLines.length < 2) return null;

  const parseRow = (l: string) =>
    l.slice(1, -1).split("|").map((c) => c.trim().replace(/\*\*/g, ""));

  const headers = parseRow(tableLines[0]);
  // segunda linha é separador "|---|"
  const rows: string[][] = [];
  for (let i = 1; i < tableLines.length; i++) {
    if (/^\|[\s\-:|]+\|$/.test(tableLines[i])) continue;
    rows.push(parseRow(tableLines[i]));
  }
  return { headers, rows };
}
