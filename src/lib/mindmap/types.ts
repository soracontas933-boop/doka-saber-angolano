/**
 * Modelo de dados do editor de Mapa Mental.
 * Estrutura simples baseada em nós (com posição absoluta) e arestas (parent → child).
 */

export interface MindNode {
  id: string;
  label: string;
  /** Conteúdo detalhado para expansão (opcional) */
  description?: string;
  /** Metadados para o sistema "Ver mais" */
  metadata?: {
    exemplo?: string;
    definicao?: string;
    importancia?: string;
    aplicacao?: string;
    fonte?: string;
  };
  x: number;
  y: number;
  /** Cor principal do nó (hex). Quando undefined, herda da paleta. */
  color?: string;
  /** Tamanho do nó: small | medium | large */
  size: "small" | "medium" | "large";
  /** parent === null → nó central */
  parentId: string | null;
}

export interface MindMapData {
  central: string; // mantido para retrocompat com export/import
  nodes: MindNode[];
  palette: string[];
  fontFamily: string;
  background: "blueprint" | "white" | "dark" | "paper";
  fontLevel?: number;
}

export const DEFAULT_PALETTE = [
  "#1E9DF1",
  "#A855F7",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#14B8A6",
  "#6366F1",
];

export const PALETTE_PRESETS: { name: string; colors: string[] }[] = [
  { name: "Delle", colors: DEFAULT_PALETTE },
  { name: "Pastel", colors: ["#7DD3FC", "#C4B5FD", "#86EFAC", "#FCD34D", "#FCA5A5", "#F9A8D4", "#5EEAD4", "#A5B4FC"] },
  { name: "Sóbrio", colors: ["#0F172A", "#334155", "#475569", "#64748B", "#94A3B8", "#1E293B", "#0C4A6E", "#365314"] },
  { name: "Vibrante", colors: ["#FF006E", "#FB5607", "#FFBE0B", "#8338EC", "#3A86FF", "#06FFA5", "#FF4081", "#7C3AED"] },
  { name: "Educacional", colors: ["#1E9DF1", "#10B981", "#F59E0B", "#EF4444", "#A855F7", "#0EA5E9", "#84CC16", "#F97316"] },
];

export function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Converte os parsers existentes para o modelo do editor com layout radial inicial. */
export function fromParsedMap(
  central: string,
  branches: { label: string; items: string[] }[],
): MindMapData {
  const W = 1123;
  const H = 794;
  const cx = W / 2;
  const cy = H / 2;

  const nodes: MindNode[] = [];
  const centralId = makeId();
  nodes.push({
    id: centralId,
    label: central || "Tema Central",
    x: cx,
    y: cy,
    parentId: null,
    size: "large",
  });

  const total = Math.max(branches.length, 1);
  const radiusX = 360;
  const radiusY = 230;

  branches.forEach((b, i) => {
    const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
    const bx = cx + Math.cos(angle) * radiusX;
    const by = cy + Math.sin(angle) * radiusY;
    const branchId = makeId();
    const cleanLabel = (text: string) => text.replace(/^\d+(\.\d+)*\s*[-.:]?\s*/, "").trim();
    nodes.push({
      id: branchId,
      label: `${i + 1}. ${cleanLabel(b.label)}`,
      description: b.description,
      metadata: b.metadata,
      x: bx,
      y: by,
      parentId: centralId,
      size: "medium",
      color: DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
    });

    // sub-itens distribuídos numa pequena coluna ao lado do ramo
    const isLeft = bx < cx;
    const branchNumber = i + 1;

    b.items.slice(0, 12).forEach((item, j) => {
      const subNumber = j + 1;
      const offsetX = isLeft ? -200 : 200;
      const offsetY = (j - (b.items.length - 1) / 2) * 55; // Mais espaço vertical
      nodes.push({
        id: makeId(),
        label: `${branchNumber}.${subNumber} ${cleanLabel(item)}`,
        x: bx + offsetX,
        y: by + offsetY,
        parentId: branchId,
        size: "small",
        color: DEFAULT_PALETTE[i % DEFAULT_PALETTE.length],
      });
    });
  });

  return {
    central: central || "Tema Central",
    nodes,
    palette: DEFAULT_PALETTE,
    fontFamily: "'SF Pro Display', 'Open Sans', system-ui, sans-serif",
    background: "blueprint",
  };
}

export function nodeRadius(size: MindNode["size"]): { w: number; h: number } {
  switch (size) {
    case "large":
      return { w: 220, h: 80 };
    case "medium":
      return { w: 170, h: 56 };
    case "small":
    default:
      return { w: 150, h: 44 };
  }
}

export function getColorForNode(
  data: MindMapData,
  node: MindNode,
): string {
  if (node.color) return node.color;
  if (node.parentId === null) return "#1E9DF1";
  // herda do ancestral mais próximo
  const map = new Map(data.nodes.map((n) => [n.id, n]));
  let cur: MindNode | undefined = node;
  while (cur && !cur.color && cur.parentId) {
    cur = map.get(cur.parentId!);
  }
  return cur?.color || "#1E9DF1";
}
