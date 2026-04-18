## Plano: Sistema Anti-Falhas para Geração de Trabalhos

### Problema (visto nas imagens)

1. IA escreve meta-texto: "Aqui está o conteúdo reescrito com contexto angolano, mantendo o formato Markdown e corrigindo os problemas identificados:" — isto é a IA a "planear" em vez de gerar.
2. Subtítulos parasitas como "Revisão do conteúdo com contexto angolano" aparecem dentro de secções (ex: Conclusão).
3. Símbolos repetidos sem sentido: `%%%%`, `&&&&`, `____`, `----`, `~~~~`.
4. Capítulos por vezes vazios ou truncados.
5. Já existe `src/lib/ai-validator.ts` mas é fraco e não está integrado no fluxo do trabalho.

### Solução: 3 camadas de defesa

**Camada 1 — Sanitização determinística (regex)**
Reforçar `src/lib/ai-validator.ts` com novas regras:

- Remover linhas meta: `/aqui (está|tem|vai)|conteúdo (reescrito|corrigido|revisto)|mantendo o formato|problemas identificados|com base no|segue abaixo|posso (ajudar|reescrever)/i`
- Remover subtítulos parasitas dentro de Conclusão/Introdução/desenvolvimento: `/^(\*\*)?Revisão do conteúdo.*$/im`
- Colapsar símbolos repetidos: `/([%&_\-~=*+#@!?])\1{3,}/g` → remover ou normalizar (ex: `---` markdown válido fica preservado se isolado em linha)
- Detectar blocos de código incompletos / Markdown malformado.
- Remover frases em inglês isoladas (heurística: linha com >60% palavras inglesas comuns: "the", "and", "this", "is", "of", "with", "here", "content").

**Camada 2 — Validação estrutural por secção**
Nova função `validateTrabalhoSection(titulo, conteudo, tipo)` em `ai-validator.ts`:

- Conteúdo mínimo: ≥300 caracteres por secção (excepto índice).
- Não pode começar com meta-frases ("Aqui está", "Segue", "Vou", "Posso").
- Não pode conter `[placeholder]`, `[inserir]`, `TODO`, `XXX`, `...continua`.
- Bibliografia: deve ter ≥5 referências no formato Autor (ano).
- Conclusão/Introdução/desenvolvimento/: não pode ter subtítulos H3 (`###`).

**Camada 3 — Auto-correcção via IA + UI de pré-compilação**

- Antes da compilação final em `TrabalhoPage.tsx`, correr `validateTrabalhoCompleto(conteudo)` que devolve `{ ok, issues, fixedContent }`.
- Se houver problemas auto-corrigíveis (regex) → corrigir silenciosamente.
- Se houver secções inválidas → re-gerar APENAS essa secção via `regenerateSection(titulo, contexto)` (1 tentativa, custo: 0 créditos extra).
- Se ainda falhar → mostrar **modal de pré-compilação** listando os problemas com botões: "Re-gerar secção" / "Editar manualmente" / "Compilar mesmo assim".

### Ficheiros a alterar/criar


| Ficheiro                                                  | Acção                                                                                                                                        |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/ai-validator.ts`                                 | Reforçar com novas regex + `validateTrabalhoSection` + `validateTrabalhoCompleto`                                                            |
| `src/lib/ai-service.ts`                                   | Reforçar `DELLE_SYSTEM_PROMPT`: proibir meta-texto, símbolos repetidos, subtítulos em Conclusão/Introdução. Adicionar `regenerateSection()`. |
| `src/lib/trabalho-parser.ts`                              | Sanitizar antes de fazer parse das secções                                                                                                   |
| `src/components/trabalho/PreCompileCheckModal.tsx` (NOVO) | Modal com lista de problemas detectados + acções                                                                                             |
| `src/pages/TrabalhoPage.tsx`                              | Chamar validação antes da compilação final, mostrar modal se houver issues                                                                   |


### Fluxo final

```text
Geração → Sanitização regex → Validação estrutural
   ↓
[OK?] ─sim→ Compila e mostra trabalho
   ↓ não
Auto-correcção (regex)
   ↓
Re-geração silenciosa de secções inválidas (1x)
   ↓
[OK?] ─sim→ Compila
   ↓ não
Modal pré-compilação → utilizador decide
```

### Notas técnicas

- Build errors actuais (`landing_sections`, `Select size`, `DelleLogo className`) são pré-existentes e não relacionados — proponho corrigir em paralelo (ajustar tipos JSON cast, remover prop `size` inválida do `SelectTrigger`, aceitar `className` em `DelleLogo`).
- Re-geração de secção NÃO consome créditos extra (já pago no trabalho original) — controlado por flag `isRetry: true`.
- Logs de issues vão para console (escondidos do utilizador) para análise futura.