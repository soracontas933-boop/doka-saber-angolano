# Sistema de Paginação Inteligente — Guia de Implementação

## Visão Geral

Este documento descreve o novo sistema de paginação inteligente implementado para garantir que **nenhum conteúdo seja cortado entre páginas**, tanto na pré-visualização quanto na exportação em PDF.

## Problema Resolvido

### Antes
- Conteúdo era cortado entre páginas
- Pré-visualização não correspondia ao PDF exportado
- Cards eram divididos entre páginas
- Uso de `overflow: hidden` ocultava conteúdo
- Alturas fixas causavam cortes

### Depois
- Nenhum card é cortado
- Pré-visualização é 1:1 com PDF
- Distribuição inteligente em múltiplas páginas
- Todos os elementos respeitem `break-inside: avoid`
- Layout dinâmico que se adapta ao conteúdo

## Arquivos Criados

### 1. **src/lib/smart-pagination.ts**
Biblioteca principal de paginação inteligente.

**Funções principais:**
- `measureElementHeight(element)` - Mede altura real removendo restrições
- `collectCardMetrics(container)` - Coleta métricas de todos os cards
- `paginateCards(cards, pageHeight, padding)` - Distribui cards em páginas
- `applyPageBreakStyles(element)` - Aplica estilos de paginação
- `detectOverflow(element)` - Detecta overflow em elementos
- `validatePaginationRules(element)` - Valida conformidade com regras

**Uso:**
```typescript
import { paginateCards, measureElementHeight, applyPageBreakStyles } from '@/lib/smart-pagination';

// Medir altura de um card
const height = measureElementHeight(cardElement);

// Aplicar estilos de paginação
applyPageBreakStyles(containerElement);

// Distribuir cards em páginas
const pages = paginateCards(cardMetrics, pageHeight, padding);
```

### 2. **src/components/resumo/A4MultiPageSmart.tsx**
Componente de múltiplas páginas com paginação inteligente.

**Props:**
- `orientation` - "portrait" | "landscape"
- `children` - Conteúdo a renderizar
- `minPages` - Número mínimo de páginas
- `allowAddPage` - Permite adicionar páginas manualmente
- `extraPages` - Páginas extras adicionadas
- `padding` - Padding interno em px

**Uso:**
```typescript
<A4MultiPageSmart
  orientation="portrait"
  minPages={1}
  allowAddPage={true}
  padding={48}
>
  {/* Conteúdo */}
</A4MultiPageSmart>
```

### 3. **src/components/resumo/A4SheetSmart.tsx**
Folha A4 inteligente que se adapta dinamicamente ao conteúdo.

**Props:**
- `orientation` - "portrait" | "landscape"
- `children` - Conteúdo
- `innerRef` - Ref para captura de PDF
- `multiPage` - Permite múltiplas páginas

**Uso:**
```typescript
<A4SheetSmart
  orientation="portrait"
  innerRef={a4InnerRef}
  multiPage={true}
>
  {/* Conteúdo */}
</A4SheetSmart>
```

### 4. **src/lib/pdf-export-helper-smart.ts**
Helper de exportação PDF com paginação inteligente.

**Função principal:**
- `exportHtmlToPdfSmart(options)` - Exporta HTML para PDF com paginação inteligente

**Opções:**
```typescript
interface PdfExportOptions {
  html?: string;
  element?: HTMLElement;
  cloneElement?: boolean;
  filename: string;
  overlayMessage?: string;
  containerWidth?: number;
  padding?: string;
  orientation?: "portrait" | "landscape";
  format?: "a4" | "a3";
  scale?: number;
  margin?: number[];
  maxPages?: number;
}
```

**Uso:**
```typescript
import { exportHtmlToPdfSmart } from '@/lib/pdf-export-helper-smart';

await exportHtmlToPdfSmart({
  element: containerElement,
  filename: 'documento.pdf',
  overlayMessage: 'A gerar PDF...',
  containerWidth: 794,
  padding: '48px 56px',
  orientation: 'portrait',
  scale: 3,
  margin: [10, 10, 10, 10],
  maxPages: 5,
});
```

### 5. **src/lib/resumo-export-smart.ts**
Exportação de resumos com paginação inteligente.

**Funções principais:**
- `exportResumoWordSmart(resultado, tipoResumo, disciplina, titleOverride)` - Exporta para Word
- `exportResumoVisualPDFSmart(visualElement, tipoResumo, disciplina, title, numPaginas)` - Exporta visual para PDF
- `exportResumoPDFSmart(resultado, tipoResumo, disciplina, titleOverride, numPaginas)` - Exporta texto para PDF

**Uso:**
```typescript
import { exportResumoPDFSmart, exportResumoVisualPDFSmart } from '@/lib/resumo-export-smart';

// Exportar resumo textual
await exportResumoPDFSmart(
  resultado,
  tipoResumo,
  disciplina,
  titleOverride,
  numPaginas
);

// Exportar resumo visual (mapa mental, flashcards, etc.)
await exportResumoVisualPDFSmart(
  visualElement,
  tipoResumo,
  disciplina,
  title,
  numPaginas
);
```

### 6. **src/lib/multi-page-pdf-smart.ts**
Exportação multipágina com paginação inteligente.

**Função principal:**
- `exportMultiPagePdfSmart(options)` - Exporta múltiplas páginas A4 para PDF

**Opções:**
```typescript
interface MultiPagePdfSmartOptions {
  pages: HTMLElement[];
  filename: string;
  orientation?: "portrait" | "landscape";
  format?: "a4";
  scale?: number;
  overlayMessage?: string;
}
```

**Uso:**
```typescript
import { exportMultiPagePdfSmart } from '@/lib/multi-page-pdf-smart';

const pageElements = Array.from(document.querySelectorAll('[data-a4-page]'));
await exportMultiPagePdfSmart({
  pages: pageElements,
  filename: 'documento.pdf',
  orientation: 'portrait',
  scale: 3,
  overlayMessage: 'A gerar PDF...',
});
```

## Regras de Layout Obrigatórias

### CSS Aplicado Automaticamente

```css
/* Todos os elementos */
break-inside: avoid;
page-break-inside: avoid;
overflow: visible;
height: auto;

/* Containers */
overflow: visible;
height: auto;
```

### Proibições

❌ **NÃO USE:**
- `overflow: hidden` - Oculta conteúdo
- `height: <valor-fixo>` - Corta conteúdo
- `max-height: <valor-fixo>` - Limita crescimento
- `page-break-inside: auto` - Permite cortes

✅ **USE:**
- `overflow: visible` - Mostra todo conteúdo
- `height: auto` - Cresce conforme necessário
- `break-inside: avoid` - Impede cortes
- `page-break-inside: avoid` - Impede cortes

## Integração com Componentes Existentes

### ResumoEditorPage.tsx

Para usar a paginação inteligente no editor de resumos:

```typescript
// Substituir importação
import { exportMultiPagePdfSmart } from '@/lib/multi-page-pdf-smart';

// Na função handleExportPDF
const handleExportPDF = async () => {
  const pageEls = Array.from(
    document.querySelectorAll<HTMLElement>("[data-a4-page]")
  );
  if (!pageEls.length) {
    toast.error("Nada para exportar.");
    return;
  }
  const filename = `resumo-${(disciplina || "geral")
    .toLowerCase()
    .replace(/\s+/g, "-")}-${tipoResumo.toLowerCase().replace(/\s+/g, "-")}.pdf`;
  await exportMultiPagePdfSmart({
    pages: pageEls,
    filename,
    orientation,
    scale: 3,
    overlayMessage: "A gerar PDF...",
  });
};
```

### ResumoPreview.tsx

Para usar a paginação inteligente na pré-visualização:

```typescript
// Substituir importação
import { exportResumoVisualPDFSmart } from '@/lib/resumo-export-smart';

// Na função handleExportPDF
const handleExportPDF = () => {
  if (a4InnerRef.current) {
    return exportResumoVisualPDFSmart(
      a4InnerRef.current,
      tipoResumo,
      disciplina,
      title || tipoResumo
    );
  }
  return exportResumoPDFSmart(cleaned, tipoResumo, disciplina, title);
};
```

## Correções Aplicadas

### TopicosVisual.tsx

| Estilo | Problema | Solução |
|--------|----------|---------|
| `infographic-panels` | `overflow: hidden` | Mudado para `overflow: visible` |
| `dashboard-widgets` | `overflow: hidden` | Mudado para `overflow: visible` |
| `interactive-nodes` | `overflow: hidden` | Mudado para `overflow: visible` |
| `bento-grid` | `height: 100%` | Mudado para `height: auto` |
| Containers principais | `minHeight: 100%` | Mudado para `minHeight: auto` |

## Algoritmo de Paginação

```
1. Medir altura real de cada card
2. Para cada card:
   a. Se card cabe na página atual → adicionar à página
   b. Se card não cabe → mover para próxima página
   c. Se card é maior que página → colocar sozinho em página
3. Distribuir cards em páginas respeitando limite de altura
4. Garantir que nenhum card é cortado
```

## Detecção de Quebras de Página

O sistema detecta automaticamente os melhores pontos para quebra de página:

1. Procura por espaços em branco (linhas brancas no canvas)
2. Respeita limites de cards (não corta no meio)
3. Recua até encontrar espaço em branco adequado
4. Garante que cada página tem conteúdo válido

## Validação de Conformidade

Use a função `validatePaginationRules()` para verificar se um elemento respeita as regras:

```typescript
import { validatePaginationRules } from '@/lib/smart-pagination';

const { isValid, violations } = validatePaginationRules(element);
if (!isValid) {
  console.warn('Violações encontradas:', violations);
}
```

## Testes Recomendados

1. **Teste de Pré-visualização**
   - Abrir editor de resumo
   - Verificar que conteúdo não é cortado
   - Comparar com PDF exportado

2. **Teste de Múltiplas Páginas**
   - Criar resumo com muito conteúdo
   - Verificar distribuição em múltiplas páginas
   - Confirmar que nenhum card é cortado

3. **Teste de Diferentes Estilos**
   - Testar cada estilo de TopicosVisual
   - Verificar que nenhum é cortado
   - Confirmar que PDF corresponde à pré-visualização

4. **Teste de Responsividade**
   - Redimensionar janela
   - Verificar que paginação se adapta
   - Confirmar que conteúdo permanece inteiro

## Performance

- Medição de altura é otimizada com `ResizeObserver`
- Captura de PDF usa escala 3 para qualidade (4 para mapas mentais)
- Formato PNG para mapas mentais, JPEG para outros (melhor compressão)
- Processamento assíncrono com `requestAnimationFrame`

## Troubleshooting

### Conteúdo ainda está sendo cortado

1. Verificar se elemento tem `overflow: hidden` → remover
2. Verificar se elemento tem `height: <valor-fixo>` → mudar para `auto`
3. Verificar se `break-inside: avoid` está definido
4. Chamar `applyPageBreakStyles()` no elemento

### PDF não corresponde à pré-visualização

1. Verificar se ambos usam mesma largura de container (794px para portrait)
2. Verificar se ambos usam mesma escala
3. Verificar se estilos CSS são idênticos
4. Usar `exportMultiPagePdfSmart` que garante fidelidade 1:1

### Páginas vazias aparecem

1. Verificar se há conteúdo suficiente
2. Verificar se `minPages` está definido corretamente
3. Verificar se `extraPages` não está muito alto

## Suporte

Para problemas ou dúvidas sobre o sistema de paginação inteligente, consulte:
- `src/lib/smart-pagination.ts` - Documentação das funções
- `SMART_PAGINATION_GUIDE.md` - Este guia
- Exemplos de uso nos componentes atualizados
