
Objetivo
- Garantir exportação funcional em PDF e Word para Resumos.
- Corrigir definitivamente o bug de Questionário em PDF que gera folha em branco.

Diagnóstico (com base no código atual + PDF enviado)
- O PDF exportado do questionário está efetivamente vazio.
- Em `src/lib/questionario-export.ts` (e também `src/lib/resumo-export.ts`) o container de captura para PDF está com `opacity: 0` + `position: fixed`, o que pode fazer o html2canvas/html2pdf capturar conteúdo transparente (resultado: página “em branco”).
- A exportação Word já está implementada para ambos (resumo e questionário), mas vamos validar fluxo e robustez.

Plano de implementação
1) Criar utilitário único e robusto para exportação PDF
- Novo helper em `src/lib` para:
  - montar container off-screen (fora do viewport, sem `opacity: 0`);
  - aguardar render (`document.fonts.ready` + 2 frames);
  - executar html2pdf com config estável;
  - limpar container sempre no `finally`.
- Manter `ExportOverlay` (spinner global) exatamente como padrão do projeto.

2) Refatorar PDF de Questionário para usar o helper
- Arquivo: `src/lib/questionario-export.ts`.
- Trocar estilo do container invisível para estratégia off-screen segura (ex.: `left:-10000px; top:0; position:absolute; opacity:1`).
- Marcar cada bloco de pergunta com `data-pdf-section`/`break-inside: avoid` para reduzir risco de cortes.
- Preservar fallback quando parser não encontra questões (texto bruto), mas garantir que nunca gere canvas vazio.

3) Refatorar PDF de Resumo para o mesmo pipeline
- Arquivo: `src/lib/resumo-export.ts`.
- Aplicar a mesma estratégia de captura e paginação (mesmo helper).
- Confirmar que o layout “organizado” já solicitado continua fiel no PDF.
- Garantir que os dois botões (PDF e Word) continuam ativos no `ResumoPreview`.

4) Hardening de exportação (ambos)
- Validar conteúdo antes de exportar:
  - se HTML final estiver vazio → abortar com toast de erro claro;
  - se parser falhar → usar fallback textual explícito (nunca exportar branco silenciosamente).
- Melhorar logs de debug (apenas em console) com tamanho do conteúdo e nº de blocos renderizados.

5) Validação funcional fim-a-fim
- Testar Questionário:
  - gerar com fotos;
  - exportar PDF (confirmar texto visível e sem folha branca);
  - exportar Word.
- Testar Resumo:
  - exportar PDF e Word;
  - confirmar estrutura e organização visual.
- Repetir em conteúdo curto e longo (1 página e múltiplas páginas).

Detalhes técnicos (secção dedicada)
- Ficheiros a alterar:
  - `src/lib/questionario-export.ts`
  - `src/lib/resumo-export.ts`
  - (novo) `src/lib/pdf-export-helper.ts` (ou nome equivalente)
- Regras técnicas:
  - Não usar `opacity: 0` no elemento alvo de captura.
  - Evitar mistura de paginação conflitante; usar uma abordagem consistente.
  - Preservar `showExportOverlay`/`hideExportOverlay` no início/fim da exportação.
- Fluxo proposto:
```text
Botão PDF -> build HTML -> mount off-screen (visível para canvas) -> wait render/fonts
-> html2pdf -> save -> cleanup + toast
```

Critério de pronto
- Questionário deixa de exportar folha branca.
- Resumo exporta em PDF e Word com conteúdo e formatação.
- Sem regressão no overlay e sem erro silencioso de exportação.
