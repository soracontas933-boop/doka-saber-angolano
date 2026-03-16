

## Plano: Geração de Trabalhos por Etapas (Subtema a Subtema)

### Conceito
Transformar a geração do trabalho de uma única chamada IA para um fluxo multi-etapas onde o utilizador controla os subtemas/capítulos individualmente — podendo adicionar, editar, reordenar e apagar antes de compilar o trabalho final.

### Fluxo do Utilizador

```text
1. Preencher formulário (como atual)
2. Clicar "Gerar Estrutura" → IA gera apenas a lista de subtemas/capítulos
3. Ver painel de subtemas editável:
   ┌──────────────────────────────────────┐
   │  ☑ Introdução              [Gerar]  │
   │  ☑ 1. Conceito de água     [Gerar]  │
   │  ☑ 2. Ciclo hidrológico    [Gerar]  │
   │  ☑ 3. Água em Angola       [Gerar]  │
   │  ☐ + Adicionar subtema              │
   │  ☑ Conclusão               [Gerar]  │
   │  ☑ Bibliografia            [Gerar]  │
   │                                      │
   │  [Gerar Todos]  [Compilar Trabalho]  │
   └──────────────────────────────────────┘
4. Cada subtema pode ser:
   - Editado (título) ✏️
   - Apagado 🗑️
   - Gerado individualmente → preview A4
   - Regenerado se não gostar
   - Reordenado (mover para cima/baixo)
5. Adicionar novos subtemas a qualquer momento
6. "Compilar Trabalho" junta tudo no TrabalhoCompleto com paginação
```

### Alterações Técnicas

**1. Novo estado multi-etapas em `TrabalhoPage.tsx`**
- Substituir o fluxo de geração única por 3 fases: `formulario` → `estrutura` → `resultado`
- Estado `subtemas`: array de `{ id, titulo, tipo, conteudo, status }` onde status = `pendente | gerando | gerado`
- Fase "estrutura": IA gera JSON com lista de subtemas sugeridos
- Fase "resultado": compila todos os subtemas gerados no `TrabalhoCompleto`

**2. Novo componente `src/components/trabalho/SubtemasEditor.tsx`**
- Lista editável de subtemas com drag-handle visual (setas cima/baixo)
- Cada item tem: input de título editável, botão Gerar/Regenerar, botão Apagar, indicador de status
- Botão "Adicionar Subtema" no final
- Botão "Gerar Todos" que gera sequencialmente os pendentes
- Preview inline colapsável do conteúdo gerado por subtema

**3. Actualizar `src/lib/ai-service.ts`**
- Novo prompt `prompts.estruturaTrabalho()` → retorna JSON com lista de subtemas sugeridos
- Novo prompt `prompts.subtema()` → gera conteúdo detalhado para um subtema específico, recebendo contexto do tema geral e posição no trabalho
- Manter prompts existentes para introdução, conclusão e bibliografia

**4. Actualizar `src/lib/trabalho-parser.ts`**
- Adaptar `parseTrabalhoSections` para aceitar conteúdo já segmentado (array de secções pré-definidas) em vez de depender apenas do parsing de markdown

**5. Actualizar `TrabalhoCompleto.tsx`**
- Aceitar tanto o formato antigo (string markdown) como o novo formato (array de secções com conteúdo)

### Benefícios
- Trabalhos mais robustos com mais páginas (cada subtema gera 1-3 páginas dedicadas)
- Controlo total do utilizador sobre a estrutura
- Possibilidade de regenerar apenas partes insatisfatórias
- Melhor gestão dos limites de tokens da IA (chamadas menores e focadas)

