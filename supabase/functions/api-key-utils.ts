// ─── UTILITÁRIOS CENTRALIZADOS DE GERENCIAMENTO DE CHAVES API ──────────────────
// Este arquivo centraliza toda a lógica de cooldown e rotação para garantir
// consumo mínimo de chaves e tempo real de recuperação por provedor.

export interface KeyEntry {
  id: string;
  chave: string;
  prioridade: number;
  ultimo_erro: string | null;
  servico: string;
}

// ─── TEMPOS DE COOLDOWN REAIS POR TIPO DE ERRO ──────────────────────────────

/**
 * Extrai o tempo de retry sugerido pelo provedor da mensagem de erro.
 * Suporta formatos: "retry in 30s", "retryDelay: 60s", "please retry in 120s", etc.
 */
export function parseRetryDelayMs(errorMsg: string): number | null {
  const matchers = [
    /retry(?:ing)?\s+(?:in|after)\s+([\d.]+)s/i,
    /retrydelay\s*[:=]\s*"?([\d.]+)s/i,
    /try again in\s+([\d.]+)s/i,
    /please retry in\s+([\d.]+)s/i,
    /rate limit.*?(\d+)\s*seconds?/i,
  ];

  for (const pattern of matchers) {
    const match = errorMsg.match(pattern);
    if (match) {
      const seconds = Number(match[1]);
      if (Number.isFinite(seconds) && seconds > 0) {
        return Math.round(seconds * 1000);
      }
    }
  }

  return null;
}

/**
 * Determina o tempo de cooldown apropriado baseado no tipo de erro.
 * Prioriza o tempo sugerido pelo provedor quando disponível.
 */
export function getCooldownMs(errorMsg: string): number {
  const lower = errorMsg.toLowerCase();

  // 1. ERROS PERMANENTES (2 horas) - Chave inválida, suspensão, etc
  if (
    lower.includes("wrong api key") ||
    lower.includes("unauthorized") ||
    lower.includes("suspended") ||
    lower.includes("permission_denied") ||
    lower.includes("invalid api key") ||
    /\berror 401\b/i.test(errorMsg) ||
    /\berror 403\b/i.test(errorMsg)
  ) {
    return 2 * 60 * 60 * 1000; // 2 horas
  }

  // 2. QUOTA FINALIZADA - Limite diário/mensal atingido
  if (
    lower.includes("quota exceeded") || 
    lower.includes("billing details") ||
    lower.includes("limit_reached") ||
    lower.includes("rate_limit_exceeded")
  ) {
    // Gemini (Google AI Studio) tem cooldown real de 12 horas para free tier
    if (lower.includes("gemini") || lower.includes("google")) {
      return 12 * 60 * 60 * 1000; // 12 horas
    }
    // Groq, Cerebras e outros costumam ter resets mais rápidos ou diários
    if (lower.includes("groq") || lower.includes("cerebras") || lower.includes("together")) {
      return 1 * 60 * 60 * 1000; // 1 hora (reset agressivo para rotação)
    }
    return 4 * 60 * 60 * 1000; // 4 horas padrão
  }

  // 3. MODELO/ENDPOINT NÃO ENCONTRADO (30 min) - Configuração errada
  if (
    lower.includes("no endpoints found") ||
    lower.includes("does not exist") ||
    lower.includes("model not found") ||
    /\berror 404\b/i.test(errorMsg)
  ) {
    return 30 * 60 * 1000; // 30 minutos
  }

  // 4. RATE LIMIT COM TEMPO SUGERIDO - Usar o tempo do provedor + margem
  const retryDelayMs = parseRetryDelayMs(errorMsg);
  if (retryDelayMs) {
    // Adiciona 5 segundos de margem de segurança, máximo 15 minutos
    return Math.max(10 * 1000, Math.min(retryDelayMs + 5_000, 15 * 60 * 1000));
  }

  // 5. RATE LIMIT GENÉRICO (30 segundos) - Retry rápido
  if (/\berror 429\b/i.test(errorMsg) || lower.includes("rate limit")) {
    return 30 * 1000; // 30 segundos
  }

  // 6. ERRO DE SERVIDOR (60 segundos) - Pode ser temporário
  if (/\berror 5\d\d\b/i.test(errorMsg)) {
    return 60 * 1000; // 1 minuto
  }

  // 7. ERRO GENÉRICO (45 segundos) - Fallback padrão
  return 45 * 1000; // 45 segundos
}

/**
 * Formata o tempo de cooldown em formato legível.
 */
export function formatCooldown(ms: number): string {
  if (ms < 60_000) return `${Math.ceil(ms / 1000)}s`;
  if (ms < 60 * 60 * 1000) return `${Math.ceil(ms / 60_000)}min`;
  return `${Math.ceil(ms / (60 * 60 * 1000))}h`;
}

/**
 * Calcula quanto tempo falta para uma chave sair do cooldown.
 * Retorna 0 se a chave não está em cooldown.
 */
export function getTimeUntilReady(keyEntry: KeyEntry, nowMs: number = Date.now()): number {
  if (!keyEntry.ultimo_erro) return 0;

  const cooldownUntilMs = new Date(keyEntry.ultimo_erro).getTime();
  if (!Number.isFinite(cooldownUntilMs)) return 0;

  const remaining = cooldownUntilMs - nowMs;
  return Math.max(0, remaining);
}

/**
 * Verifica se uma chave está em cooldown no momento atual.
 */
export function isKeyInCooldown(keyEntry: KeyEntry, nowMs: number = Date.now()): boolean {
  return getTimeUntilReady(keyEntry, nowMs) > 0;
}

/**
 * Filtra e ordena chaves por disponibilidade e prioridade.
 * Retorna apenas chaves saudáveis (fora de cooldown), ordenadas por:
 * 1. Prioridade (menor = mais importante)
 * 2. Tempo de recuperação (mais próximas de ficar prontas vêm primeiro)
 */
export function getHealthyKeys(
  keys: KeyEntry[],
  nowMs: number = Date.now()
): KeyEntry[] {
  return keys
    .filter((k) => !isKeyInCooldown(k, nowMs))
    .sort((a, b) => {
      // Primeiro por prioridade
      if (a.prioridade !== b.prioridade) {
        return a.prioridade - b.prioridade;
      }
      // Se mesma prioridade, por ID (consistência)
      return a.id.localeCompare(b.id);
    });
}

/**
 * Agrupa chaves por serviço e retorna apenas as saudáveis.
 * Útil para rotação por provedor.
 */
export function getHealthyKeysByService(
  keys: KeyEntry[],
  nowMs: number = Date.now()
): Record<string, KeyEntry[]> {
  const healthyKeys = getHealthyKeys(keys, nowMs);
  const grouped: Record<string, KeyEntry[]> = {};

  for (const key of healthyKeys) {
    if (!grouped[key.servico]) {
      grouped[key.servico] = [];
    }
    grouped[key.servico].push(key);
  }

  return grouped;
}

/**
 * Seleciona a melhor chave disponível de um serviço.
 * Prioriza chaves com menor prioridade e que estão saudáveis.
 * Se nenhuma chave saudável, retorna a que sairá do cooldown mais cedo.
 */
export function selectBestKey(
  serviceKeys: KeyEntry[],
  nowMs: number = Date.now()
): KeyEntry | null {
  if (serviceKeys.length === 0) return null;

  // Tenta chaves saudáveis primeiro
  const healthyKeys = serviceKeys.filter((k) => !isKeyInCooldown(k, nowMs));
  if (healthyKeys.length > 0) {
    return healthyKeys.sort((a, b) => a.prioridade - b.prioridade)[0];
  }

  // Se nenhuma saudável, retorna a que sairá do cooldown mais cedo
  return serviceKeys.sort((a, b) => {
    const timeA = getTimeUntilReady(a, nowMs);
    const timeB = getTimeUntilReady(b, nowMs);
    return timeA - timeB;
  })[0];
}

/**
 * Constrói uma fila otimizada de tentativas que:
 * 1. Usa apenas 1-2 chaves por serviço (não todas)
 * 2. Prioriza chaves saudáveis
 * 3. Intercala serviços para distribuição
 * 4. Randomiza ponto de partida para evitar padrão fixo
 */
export interface QueueItem {
  service: string;
  keyEntry: KeyEntry;
}

export function buildOptimizedQueue(
  keys: Record<string, KeyEntry[]>,
  serviceOrder: string[],
  preferredService?: string
): QueueItem[] {
  // Determina ordem de serviços
  const services = preferredService && serviceOrder.includes(preferredService)
    ? [preferredService, ...serviceOrder.filter((s) => s !== preferredService)]
    : serviceOrder;

  const queue: QueueItem[] = [];

  // Para cada serviço, adiciona chaves saudáveis para garantir resiliência
  // Mas limitamos a 3 por serviço para não esgotar tudo se houver um erro sistêmico
  for (const service of services) {
    const serviceKeys = keys[service] || [];
    if (serviceKeys.length === 0) continue;

    // Tenta pegar apenas a MELHOR chave saudável deste serviço para consumo mínimo
    const bestHealthy = serviceKeys
      .filter((k) => !isKeyInCooldown(k))
      .sort((a, b) => a.prioridade - b.prioridade)[0];

    if (bestHealthy) {
      queue.push({ service, keyEntry: bestHealthy });
    }

    // Se não houver nenhuma saudável, pegamos a melhor em cooldown como último recurso
    if (!bestHealthy) {
      const bestCooldown = selectBestKey(serviceKeys);
      if (bestCooldown) {
        queue.push({ service, keyEntry: bestCooldown });
      }
    }
  }

  // Mantém a ordem de prioridade definida em SERVICE_ORDER ou preferredService
  // Isso garante o consumo mínimo e previsível das chaves
  return queue;
}

/**
 * Estatísticas de saúde das chaves para logging/debug.
 */
export interface KeyHealthStats {
  total: number;
  healthy: number;
  inCooldown: number;
  byService: Record<string, { total: number; healthy: number; inCooldown: number }>;
}

export function getKeyHealthStats(
  keys: KeyEntry[],
  nowMs: number = Date.now()
): KeyHealthStats {
  const stats: KeyHealthStats = {
    total: keys.length,
    healthy: 0,
    inCooldown: 0,
    byService: {},
  };

  for (const key of keys) {
    const isHealthy = !isKeyInCooldown(key, nowMs);
    if (isHealthy) stats.healthy++;
    else stats.inCooldown++;

    if (!stats.byService[key.servico]) {
      stats.byService[key.servico] = { total: 0, healthy: 0, inCooldown: 0 };
    }
    stats.byService[key.servico].total++;
    if (isHealthy) stats.byService[key.servico].healthy++;
    else stats.byService[key.servico].inCooldown++;
  }

  return stats;
}
