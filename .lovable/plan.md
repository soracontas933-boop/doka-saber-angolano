
## Problema

O sistema anti-falhas atual:
- Mostra modal ao utilizador (não deve)
- Demora muito (re-gerações via IA)
- Não corrige defeitos reais: incoerência, estrutura partida, elementos parasitas

## Solução: Sanitizador silencioso e instantâneo (<1s, 100% local)

Substituir o fluxo modal + re-geração por uma **única função síncrona** `deepSanitizeTrabalho(markdown)` executada automaticamente após a geração, antes da compilação. Sem UI, sem rede, sem IA.

### O que o novo sanitizador corrige

1. **Meta-texto da IA** (já parcialmente feito, reforçar):
   - "Aqui está...", "Vou gerar...", "Posso reescrever...", "Conforme solicitado...", "Espero que ajude...", "Em resumo, segue..."
   - Linhas de instrução: "Mantendo o formato Markdown", "Com base nos problemas identificados"
   - Despedidas: "Se precisar de mais...", "Estou à disposição..."

2. **Elementos parasitas / estranhos**:
   - Subtítulos fantasma dentro de Introdução/Conclusão (`### Revisão`, `### Nota`, `### Observação`, `### Resumo`)
   - Blocos ` ```markdown ` deixados pela IA — extrair conteúdo, remover cercas
   - Emojis aleatórios em corpo académico (manter só em listas se intencional → remover todos)
   - Tags HTML soltas (`<br>`, `<div>`, `<span>` fora de contexto)
   - Frases em inglês isoladas (heurística já existe, melhorar)
   - Linhas só com símbolos (`%%%%`, `&&&&`, `____`, `~~~~`, `====`, `++++`)
   - Caracteres de controlo invisíveis (zero-width, BOM)

3. **Quebra de estrutura**:
   - Cabeçalhos colados ao texto (`##Introdução` → `## Introdução`)
   - Cabeçalhos duplicados consecutivos (`## Introdução\n## Introdução`) → manter um
   - Numeração quebrada em listas (`1.`, `1.`, `2.` → `1.`, `2.`, `3.`)
   - Parágrafos colados sem espaçamento
   - Linhas em branco excessivas (>2 seguidas)
   - Capítulos vazios → injectar marcador de fallback `[secção a expandir manualmente]` em vez de deixar vazio

4. **Incoerência básica detectável por regex**:
   - Frases truncadas no fim de secção (terminar sem `.`, `!`, `?`, `:`) → adicionar `.`
   - Palavras coladas (camelCase indevido em prosa) — heurística conservadora
   - Repetição imediata de palavras (`o o`, `de de`, `que que`) → colapsar
   - Aspas/parênteses não fechados → equilibrar no fim do parágrafo

5. **Bibliografia**:
   - Remover linhas que não pareçam referência (sem ano `(YYYY)` e sem autor maiúsculo)
   - Ordenar alfabeticamente por sobrenome (já parcialmente feito noutros sítios)

### Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| `src/lib/ai-validator.ts` | Reforçar `sanitizeContent` com todas as regras acima. Exportar nova função `deepSanitizeTrabalho(md)` que devolve só `string` (sem issues, sem UI). |
| `src/pages/TrabalhoPage.tsx` | Remover uso do `PreCompileCheckModal` e de `validateTrabalhoCompleto`. Chamar `deepSanitizeTrabalho` directamente após geração, silenciosamente, antes de guardar/compilar. |
| `src/components/trabalho/PreCompileCheckModal.tsx` | **Eliminar** (já não é usado). |
| `src/lib/trabalho-parser.ts` | Garantir que recebe markdown já sanitizado (defensivo: chamar sanitizador de novo no início). |

### Garantias de performance

- 100% regex / string ops — tipicamente <50ms para 50KB de markdown
- Sem chamadas de rede, sem IA, sem await
- Sem alteração de UI / sem modal / sem toast

### Fluxo final

```text
IA gera markdown
   ↓
deepSanitizeTrabalho(md)   ← <100ms, silencioso
   ↓
parse + compila + mostra trabalho
```

### Notas

- Logs de quantas correcções foram aplicadas vão só para `console.debug` (escondido do utilizador).
- Se uma secção ficar vazia após sanitização, injectar placeholder discreto em vez de re-gerar (re-geração foi removida por ser lenta).
