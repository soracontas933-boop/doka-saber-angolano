

## Plano: Citações automáticas por parágrafo nos trabalhos

### Objectivo
Após cada parágrafo do corpo do trabalho (Introdução, Capítulos, Conclusão), inserir automaticamente uma citação em texto pequeno referenciando uma das fontes da Bibliografia, no estilo académico (ex: *(Silva, 2022, p. 15)*).

### O que será feito

**1. Alterar os prompts da IA para incluir citações inline** — `src/lib/ai-service.ts`
- Nos prompts `subtema` (introdução, capítulo, conclusão), adicionar instrução explícita: *"Ao final de cada parágrafo, inclui uma citação no formato (Autor, Ano, p. X) entre parênteses, baseada nas referências bibliográficas que serão geradas. Usa autores fictícios mas realistas e relevantes ao tema."*
- No prompt de `bibliografia`, adicionar: *"As referências devem ser coerentes com os autores citados nos parágrafos dos capítulos anteriores."*
- No prompt `estruturaTrabalho` do modo completo (linha 181), adicionar a mesma instrução de citação por parágrafo.

**2. Estilizar citações no renderizador de markdown** — `src/lib/trabalho-parser.ts`
- Na função `renderMarkdownToHTML`, adicionar regex para detectar citações no formato `(Autor, Ano)` ou `(Autor, Ano, p. X)` ao final de parágrafos e envolvê-las numa `<span class="citacao-inline">`.
- Adicionar CSS para `.citacao-inline`: `font-size: 0.75rem; color: #666; font-style: italic;`

**3. Adicionar estilos CSS** — `src/index.css`
- Classe `.citacao-inline` com tamanho de letra reduzido (0.75em), cor cinza, itálico.

### Detalhes técnicos
- As citações são geradas pela IA como parte do texto markdown — não há pós-processamento complexo.
- O regex no parser detecta padrões como `(Santos, 2021)` ou `(Mendes & Silva, 2020, p. 34)` e aplica a classe de estilo.
- Funciona tanto em trabalhos novos (gerados após a alteração) como visualmente para trabalhos que já contenham citações no texto.

### Ficheiros a alterar
- `src/lib/ai-service.ts` — prompts com instrução de citação
- `src/lib/trabalho-parser.ts` — regex para estilizar citações
- `src/index.css` — classe CSS `.citacao-inline`

