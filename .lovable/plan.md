

## Plano: Corrigir exportação PDF que gera página em branco

### Diagnóstico

Após análise do código, o `pdf-export-helper.ts` já tem a configuração correcta (`useCORS: true`, container off-screen com `opacity: 1`, `position: absolute; left: -10000px`). O `@media print` no CSS não afecta html2canvas (que usa canvas rendering, não print). Não há `overflow: hidden` problemático.

O problema provável é **timing**: o `requestAnimationFrame` duplo não é suficiente para html2canvas processar conteúdo complexo (especialmente com flex layouts e imagens). A exportação do CV captura `el.innerHTML` mas perde os estilos computados do template.

### Alterações

**Ficheiro: `src/lib/pdf-export-helper.ts`**

1. Adicionar delay explícito de 500ms após os rAFs e antes da captura html2canvas
2. Adicionar `allowTaint: true` ao html2canvas config
3. Forçar `overflow: visible` no container e filhos directos
4. Aumentar `windowHeight` para garantir render completo
5. Adicionar log de debug com dimensões do container antes da captura

**Ficheiro: `src/lib/cv-export.ts`**

6. Em vez de capturar apenas `innerHTML` (que perde estilos do template), clonar o elemento completo com `cloneNode(true)` e copiar estilos computados inline para garantir fidelidade visual
7. Passar o clone directamente ao helper em vez de HTML string

**Ficheiro: `src/lib/pdf-export-helper.ts` (extensão)**

8. Adicionar overload que aceita `HTMLElement` directamente (além de `html: string`), para o caso do CV e outros componentes React renderizados

### Detalhes técnicos

```text
Fluxo actual (falha):
  innerHTML → container off-screen → html2canvas → canvas vazio (estilos perdidos)

Fluxo corrigido:
  cloneNode(true) → copiar computed styles → container off-screen 
  → delay 500ms → forçar overflow:visible → html2canvas → PDF com conteúdo
```

Alterações no helper:
- Nova interface `PdfExportOptions` com campo opcional `element: HTMLElement`
- Se `element` fornecido, usar directamente em vez de `container.innerHTML = html`
- Delay: `await new Promise(r => setTimeout(r, 500))` após rAFs
- Estilos do container: adicionar `overflow: visible !important` recursivamente

Ficheiros a alterar:
- `src/lib/pdf-export-helper.ts`
- `src/lib/cv-export.ts`

