

# Análise: anomalias na geração de Trabalhos

## Diagnóstico (causa raiz provável)

Não houve mudança "mágica" na IA — o que mudou foi o **comportamento do orquestrador** e o reaparecimento de modelos instáveis na fila. Após adicionares chaves novas, várias rotas voltaram ao pool e algumas estão a devolver lixo. Encontrei 4 causas concretas no código que, combinadas, explicam exactamente os sintomas que descreves (ordem errada, traços `---`, símbolos `&&`, `///`, "Aqui está o resumo…", reflexões a vazar).

### 1. Modelos free do OpenRouter inexistentes / instáveis
Em `supabase/functions/ai-proxy/index.ts` a lista é:
```
qwen/qwen3.6-plus:free
nvidia/nemotron-3-super-120b-a12b:free
minimax/minimax-m2.5:free
stepfun/step-3.5-flash:free
```
Vários destes IDs **não existem** ou são modelos de "raciocínio" que vazam o pensamento (ex: `<think>…</think>`, "Here is the summary…", "E-este foi o resumo…"). O orquestrador apanha o erro 404 ou um output corrompido e devolve-o ao utilizador sem o filtrar.

### 2. Modelo de Gemini desactualizado
`gemini-2.0-flash` está fixo. Quando a chave entra em quota mode devolve respostas curtas/ruidosas em vez de erro limpo, e o validador deixa passar.

### 3. Validação anti-falhas é **demasiado permissiva**
`src/lib/ai-validator.ts` só apanha:
- `o o o o o` (5+ repetições)
- 10+ consoantes seguidas
- texto < 100 chars

Não apanha: `---`, `&&&`, `///`, blocos ` ```markdown `, frases de meta-comentário ("Aqui está…", "Este foi o resumo…"), tags `<think>`, secções fora de ordem.

### 4. Parser aceita qualquer `##` como capítulo
`parseTrabalhoSections` em `src/lib/trabalho-parser.ts` ordena as secções **pela ordem que vêm do modelo**. Se o modelo devolve `## Conclusão` antes de `## Capítulo 2`, o trabalho fica fora de ordem. Não há reordenação canónica (Introdução → Capítulos → Conclusão → Bibliografia).

Conclusão: **as chaves não estão exaustas**. O problema é qualidade variável dos modelos do pool + filtros fracos + parser sem reordenação.

## O que vou implementar (abordagem equilibrada)

### A. Limpar a fila de modelos no `ai-proxy`
- Substituir os 4 IDs OpenRouter por modelos free **reais e estáveis**: `meta-llama/llama-3.3-70b-instruct:free`, `google/gemini-2.0-flash-exp:free`, `deepseek/deepseek-chat-v3.1:free`, `qwen/qwen-2.5-72b-instruct:free`.
- Actualizar Gemini para `gemini-2.0-flash` → `gemini-2.5-flash` (mais estável e maior contexto).
- Filtrar resposta vazia ou < 200 chars como falha → próximo provedor.

### B. Reforçar `ai-validator.ts` (camada anti-lixo)
Detectar e remover automaticamente:
- Tags de raciocínio: `<think>…</think>`, `<thought>…</thought>`, `[REASONING]…[/REASONING]`
- Frases de meta-comentário no início/fim: "Aqui está…", "Este foi o resumo…", "Here is…", "Sure, here…", "Claro, aqui…", "Espero que ajude…"
- Sequências de símbolos: `---{4,}`, `&{3,}`, `/{3,}`, `\*{4,}`, `={4,}` (preservando `---` e `***` legítimos do markdown)
- Blocos ` ```markdown ` envolvendo todo o conteúdo
- Linhas que começam com "Reflexão:", "Pensamento:", "Nota da IA:"
- Re-tentar geração (até 2x) se depois da limpeza o conteúdo ficar < 300 chars ou perder estrutura mínima.

### C. Reordenação canónica no parser
`parseTrabalhoSections` passa a:
1. Identificar todas as secções
2. Ordenar pela ordem oficial: `indice → introducao → capitulo[1..n] → conclusao → bibliografia`
3. Os capítulos mantêm a ordem entre si (ou usam o número detectado)
4. Renumerar páginas só **depois** da ordenação

### D. Endurecer prompts em `prompts.subtema`
Adicionar instruções negativas explícitas no system prompt:
- "NÃO escrevas frases como 'Aqui está', 'Este é o resumo'"
- "NÃO mostres o teu raciocínio nem uses tags `<think>`"
- "NÃO uses `---`, `===`, `///` como separadores — usa apenas markdown padrão"
- "Começa **directamente** pelo conteúdo académico"

### E. Logging admin
Adicionar log na `usage_logs` quando o validador remove conteúdo (campo `service_used` + flag `corrigido`), para tu veres no painel admin que provedor está a poluir.

## Ficheiros alterados

- `supabase/functions/ai-proxy/index.ts` — modelos OpenRouter + Gemini, filtro de resposta vazia
- `src/lib/ai-validator.ts` — novos detectores e limpadores
- `src/lib/trabalho-parser.ts` — reordenação canónica
- `src/lib/ai-service.ts` — prompt anti-meta-comentário no `DELLE_SYSTEM_PROMPT`
- `src/test/ai-validator.test.ts` — novos casos (think tags, meta-frases, símbolos)

## Resultado esperado

- Trabalhos voltam à ordem correcta (Índice → Introdução → Capítulos → Conclusão → Bibliografia) **mesmo se o modelo devolver fora de ordem**.
- Sem `&&&`, `///`, `---` espúrios nem reflexões da IA a vazar para o documento final.
- Modelos do OpenRouter que devolvem 404 ou lixo são automaticamente postos em cooldown e a fila salta para Groq/Cerebras/Mistral.
- Sem perda de variedade: os 6 provedores continuam activos, só com a saúde de cada modelo melhor controlada.

