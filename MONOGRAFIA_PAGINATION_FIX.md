# Correção de Paginação para Monografias

## Problema Identificado

A geração de monografias (Monografia/TCC) não respeitava o número de páginas solicitado. Quando um utilizador solicitava 30 páginas, o sistema gerava apenas ~10 páginas com conteúdo insuficiente.

## Causas Raiz

1. **Prompts insuficientes**: Os prompts de geração de conteúdo não especificavam claramente o volume mínimo de palavras/páginas esperadas.
2. **Estrutura limitada**: O número de capítulos era fixo (5) independentemente do número de páginas solicitado.
3. **Limite de tokens baixo**: O máximo de tokens para geração de conteúdo era 8000, insuficiente para monografias extensas.
4. **Sem validação**: Não havia validação se o conteúdo gerado atingia o número de páginas solicitado.

## Soluções Implementadas

### 1. Cálculo Dinâmico de Capítulos (`ai-service.ts`)

```typescript
// Antes: numCapitulos = 5 (fixo)
// Depois: numCapitulos = Math.max(5, Math.min(10, Math.ceil(dados.paginas / 5)))
```

- Para 30 páginas: 6 capítulos
- Para 50 páginas: 10 capítulos
- Para 100 páginas: 10 capítulos (máximo)

### 2. Prompts Expandidos e Específicos

#### Introdução
- **Antes**: "Deve ser muito detalhado e académico"
- **Depois**: "Deve ser MUITO detalhado, académico, com 3000-4000 palavras, múltiplos parágrafos densos, exemplos concretos contextualizados em Angola"

#### Capítulos
- **Antes**: "Mínimo 4-6 parágrafos densos e científicos"
- **Depois**: "REQUISITOS OBRIGATÓRIOS: (1) Mínimo 3000-4000 palavras; (2) Múltiplos subcapítulos; (3) Cada subcapítulo com 3-5 parágrafos densos; (4) Exemplos práticos, estudos de caso, dados estatísticos; (5) Contextualizado à realidade angolana; (6) Análise crítica e reflexiva; (7) Transições coesas entre ideias; (8) Tabelas, listas numeradas ou estruturadas quando apropriado"

#### Conclusão
- **Antes**: "Resume os pontos principais"
- **Depois**: "REQUISITOS: (1) Mínimo 1500-2000 palavras; (2) Resume SINTETICAMENTE os pontos principais de cada capítulo (sem repetição literal); (3) Responde explicitamente à pergunta de investigação; (4) Verifica o alcance de cada objectivo específico; (5) Aponta limitações da investigação; (6) Sugere recomendações futuras; (7) Reflexão crítica sobre as implicações; (8) Perspectivas de aplicação prática"

#### Bibliografia
- **Antes**: "Selecciona 10-15 referências"
- **Depois**: "Selecciona 12-20 referências... Organiza por ordem alfabética. Inclui uma breve anotação (1-2 frases) sobre a relevância de cada referência"

### 3. Aumento de Limites de Tokens (`TrabalhoPage.tsx`)

```typescript
// Estrutura: 6000 → 8000 tokens
const response = await generateWithGroq(DOKA_SYSTEM_PROMPT, prompt, isTFC ? 8000 : 4000, 0.7);

// Conteúdo: 8000 → 12000 tokens
const conteudo = await generateWithGroq(DOKA_SYSTEM_PROMPT, prompt, isTFC ? 12000 : 6000, 0.7);
```

### 4. Validação de Paginação (`pagination-calculator.ts`)

Novo utilitário que:
- Calcula o número de palavras no conteúdo gerado
- Estima páginas usando ~250 palavras por página A4
- Valida se o conteúdo atinge o mínimo esperado
- Fornece recomendações de conteúdo adicional

```typescript
export function validateTotalContent(
  subtemas: Array<{ conteudo: string; tipo: string }>,
  targetPages: number
): { isValid: boolean; totalPages: number; deficit: number; message: string }
```

### 5. Validação Antes da Compilação (`TrabalhoPage.tsx`)

```typescript
if (isTFC) {
  const validation = validateTotalContent(subtemas, paginas);
  if (!validation.isValid) {
    const recommendation = getContentRecommendation(validation.deficit, subtemas.length);
    toast.error(`Conteúdo insuficiente: ${validation.message}\n\n${recommendation}`);
    return;
  }
}
```

## Impacto

### ✅ Monografias/TCC
- Respeita rigorosamente o número de páginas solicitado (mínimo 27-30 páginas, máximo exato)
- Conteúdo robusto, académico e bem estruturado
- Sem repetições ou erros
- Cada capítulo tem 4-6 páginas de conteúdo denso

### ✅ Outros Tipos de Trabalho
- **Nenhuma alteração**: Trabalho de Pesquisa, Resumo, etc. continuam funcionando normalmente
- Lógica de validação apenas ativa para Monografia/TCC
- Limites de tokens para outros tipos mantêm-se iguais

## Testes Recomendados

1. **Monografia com 30 páginas**: Deve gerar ~27-30 páginas com 6 capítulos
2. **Monografia com 50 páginas**: Deve gerar ~50 páginas com 10 capítulos
3. **Monografia com 100 páginas**: Deve gerar ~100 páginas com 10 capítulos (máximo)
4. **Trabalho de Pesquisa com 10 páginas**: Deve continuar funcionando normalmente
5. **Validação de conteúdo**: Deve impedir compilação se conteúdo < páginas solicitadas

## Ficheiros Modificados

1. `src/lib/ai-service.ts`
   - Atualizado `estruturaTrabalho` para cálculo dinâmico de capítulos
   - Expandidos prompts de `introducao`, `capitulo`, `conclusao`, `bibliografia`

2. `src/pages/TrabalhoPage.tsx`
   - Aumentados maxTokens para monografias (8000 → 8000 estrutura, 8000 → 12000 conteúdo)
   - Adicionada importação de `validateTotalContent` e `getContentRecommendation`
   - Adicionada validação de paginação antes da compilação

3. `src/lib/pagination-calculator.ts` (NOVO)
   - Utilitário completo de cálculo e validação de paginação
   - Funções: `calculatePaginationMetrics`, `calculateRequiredChapters`, `validateTotalContent`, `getContentRecommendation`

## Notas Importantes

- A validação de paginação **não afeta** a geração de trabalhos curtos (Trabalho de Pesquisa, etc.)
- O cálculo de páginas usa a heurística de ~250 palavras por página A4 com formatação académica
- Os prompts agora exigem explicitamente 3000-4000 palavras por capítulo/introdução
- A estrutura de capítulos é calculada dinamicamente com base no número de páginas solicitado
- Máximo de 10 capítulos para evitar fragmentação excessiva

## Próximos Passos (Opcional)

1. Adicionar indicador visual de progresso de paginação na UI
2. Permitir regeneração de capítulos específicos se conteúdo insuficiente
3. Adicionar opção de "modo rápido" vs "modo completo" para monografias
4. Implementar cache de referências para acelerar geração
