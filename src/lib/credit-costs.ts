// Custo em créditos por ação (modelo unificado)
export const CREDIT_COSTS = {
  trabalho: 10,
  resumo: 5,
  questionario: 3,
  plano_aula: 15,
  tfc: 50,
  correcao: 8,
  apresentacao: 12,
  cv: 14,
} as const;

export type ModuloType = keyof typeof CREDIT_COSTS;

export const MODULE_LABELS: Record<ModuloType, string> = {
  trabalho: "Trabalho Escolar",
  resumo: "Resumo de Fotos",
  questionario: "Questionário",
  plano_aula: "Plano de Aula",
  tfc: "TFC/Monografia",
  correcao: "Correção",
  apresentacao: "Apresentação",
  cv: "Currículo",
};

// Limite "fair use" diário no plano Premium para evitar abuso
export const PREMIUM_DAILY_FAIR_USE = 200;
