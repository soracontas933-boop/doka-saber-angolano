import type { SlideKind, SlideSection } from "@/types/presentation";

// Estrutura narrativa Gamma — 10 seções obrigatórias
export interface SectionSpec {
  section: SlideSection;
  label: string;
  // Tipos de slide permitidos para esta seção (a IA escolhe)
  allowedKinds: SlideKind[];
  // Quantidade típica de slides para esta seção
  defaultCount: number;
}

export const NARRATIVE_BLUEPRINT: SectionSpec[] = [
  { section: "hero",             label: "Capa",             allowedKinds: ["hero"],                                                              defaultCount: 1 },
  { section: "agenda",           label: "Agenda",           allowedKinds: ["agenda"],                                                            defaultCount: 1 },
  { section: "context",          label: "Contexto",         allowedKinds: ["context", "split", "quote"],                                          defaultCount: 1 },
  { section: "insights",         label: "Insights",         allowedKinds: ["insight", "stats", "bento"],                                          defaultCount: 2 },
  { section: "deep-dive",        label: "Desenvolvimento",  allowedKinds: ["bento", "split", "comparison", "timeline", "process", "case-study"], defaultCount: 4 },
  { section: "visual-expansion", label: "Visualização",     allowedKinds: ["dashboard", "gallery", "stats", "bento"],                             defaultCount: 1 },
  { section: "synthesis",        label: "Síntese",          allowedKinds: ["summary", "bento"],                                                   defaultCount: 1 },
  { section: "conclusion",       label: "Conclusão",        allowedKinds: ["conclusion", "quote", "cta"],                                         defaultCount: 1 },
  { section: "references",       label: "Fontes",           allowedKinds: ["references"],                                                         defaultCount: 1 },
  { section: "closing",          label: "Encerramento",     allowedKinds: ["closing"],                                                            defaultCount: 1 },
];

// Adapta o blueprint ao número-alvo de slides escolhido pelo utilizador.
// Mantém sempre as seções obrigatórias e ajusta deep-dive/insights.
export function buildBlueprint(targetCount: number): SectionSpec[] {
  const baseTotal = NARRATIVE_BLUEPRINT.reduce((s, sec) => s + sec.defaultCount, 0);
  if (targetCount === baseTotal) return NARRATIVE_BLUEPRINT;

  const blueprint = NARRATIVE_BLUEPRINT.map(s => ({ ...s }));
  let diff = targetCount - baseTotal;

  // Distribui o diff em deep-dive primeiro, depois insights
  const expandable: SlideSection[] = ["deep-dive", "insights", "visual-expansion"];
  let i = 0;
  while (diff !== 0 && i < 200) {
    const target = expandable[i % expandable.length];
    const sec = blueprint.find(s => s.section === target)!;
    if (diff > 0) {
      sec.defaultCount += 1;
      diff -= 1;
    } else if (sec.defaultCount > 1) {
      sec.defaultCount -= 1;
      diff += 1;
    }
    i++;
  }
  return blueprint;
}

// Variantes de layout por kind — o variator escolhe procedurally
export const LAYOUT_VARIANTS: Record<SlideKind, string[]> = {
  hero:        ["hero-overlay", "hero-split", "hero-center", "hero-magazine"],
  agenda:      ["agenda-list", "agenda-grid", "agenda-numbered"],
  context:     ["split-50", "split-60-40", "split-image-right"],
  insight:     ["insight-card", "insight-bento-3", "insight-quote"],
  stats:       ["stats-row-3", "stats-grid-4", "stats-hero"],
  bento:       ["bento-3x2", "bento-2x3", "bento-mosaic", "bento-asymm"],
  split:       ["split-50", "split-60-40", "split-image-right", "split-diagonal"],
  timeline:    ["timeline-horizontal", "timeline-vertical", "timeline-zigzag"],
  process:     ["process-arrows", "process-numbered", "process-circular"],
  comparison:  ["compare-2col", "compare-table", "compare-vs"],
  quote:       ["quote-cinematic", "quote-overlay", "quote-minimal"],
  gallery:     ["gallery-3", "gallery-4-mosaic", "gallery-strip"],
  dashboard:   ["dashboard-cards", "dashboard-mixed"],
  "case-study":["case-split", "case-timeline"],
  summary:     ["summary-cards", "summary-checklist"],
  conclusion:  ["conclusion-center", "conclusion-split"],
  references:  ["refs-list", "refs-2col"],
  closing:     ["closing-thanks", "closing-qa", "closing-cinematic"],
  cta:         ["cta-center", "cta-banner"],
};
