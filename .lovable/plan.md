
Plano de correção (PDF em branco ~3.58KB e 1 página)

Diagnóstico confirmado
- O problema afeta todos os módulos (Trabalho, Resumo, Questionário, Plano de Aula) em navegador e app instalado.
- Como todos usam o mesmo helper (`src/lib/pdf-export-helper.ts`), a falha está centralizada na pipeline de captura/renderização PDF (não em cada página individual).

Implementação proposta

1) Reescrever a pipeline de PDF no helper (núcleo da correção)
- Arquivo: `src/lib/pdf-export-helper.ts`
- Substituir o fluxo atual baseado em `html2pdf().from(...).save()` por pipeline explícita:
  1. montar conteúdo em “staging container” visível para render (não usar `left:-10000px`);
  2. capturar com `html2canvas` com dimensões explícitas (`width/height/windowWidth/windowHeight`);
  3. gerar PDF com `jsPDF` via paginação manual por slices.
- Manter `useCORS: true` e delay adicional antes da captura.
- Validar canvas: se dimensões 0 ou captura “vazia”, fazer retry automático com config alternativa (escala menor / foreignObject).

2) Corrigir paginação multi-página de forma determinística
- Arquivo: `src/lib/pdf-export-helper.ts`
- Implementar corte por altura de página (A4 em px proporcional), adicionando páginas com `addPage`.
- Isso elimina o problema de sair sempre 1 página quando o conteúdo é longo.

3) Tornar o helper configurável por módulo
- Arquivo: `src/lib/pdf-export-helper.ts`
- Adicionar opções: `orientation`, `format`, `margin`, `scale`, `pagebreakMode`.
- Permitir `portrait` e `landscape` sem hacks por largura.

4) Ajustar chamadas dos exportadores para usar as novas opções
- Arquivos:
  - `src/lib/export-utils.ts` (Trabalho)
  - `src/lib/resumo-export.ts`
  - `src/lib/questionario-export.ts`
  - `src/lib/plano-aula-export.ts`
- Aplicar parâmetros corretos:
  - Trabalho/Resumo/Questionário: A4 portrait.
  - Plano de Aula horizontal: A4 landscape (preservar tabela de 9 colunas).
- Garantir wrapper raiz de export com largura consistente e `overflow: visible`.

5) Endurecer robustez do DOM antes da captura
- Arquivo: `src/lib/pdf-export-helper.ts`
- Antes do capture:
  - aguardar `document.fonts.ready`;
  - aguardar `img.decode()/load`;
  - bloquear transições/animações temporariamente no container de export;
  - verificar `scrollWidth/scrollHeight` reais (abort com erro amigável se 0).

6) Observabilidade para evitar regressão silenciosa
- Arquivo: `src/lib/pdf-export-helper.ts`
- Adicionar logs de diagnóstico úteis:
  - dimensões finais capturadas,
  - número de páginas geradas,
  - fallback acionado ou não.
- Toast de erro específico quando detectar captura vazia.

Validação (QA) após implementação
- Testar os 4 fluxos com conteúdo curto e longo:
  - Trabalho: gerar documento multi-seção (esperado >1 página).
  - Resumo: texto extenso (esperado >1 página).
  - Questionário: 30+ perguntas (esperado >1 página).
  - Plano de Aula: tabela completa em landscape legível.
- Critérios de sucesso:
  - PDF não vazio visualmente;
  - tamanho de arquivo acima do mínimo esperado (não ~3.58KB em casos com conteúdo);
  - paginação correta;
  - funciona em navegador e app instalado.

Arquivos a alterar
- `src/lib/pdf-export-helper.ts` (principal)
- `src/lib/export-utils.ts`
- `src/lib/resumo-export.ts`
- `src/lib/questionario-export.ts`
- `src/lib/plano-aula-export.ts`
