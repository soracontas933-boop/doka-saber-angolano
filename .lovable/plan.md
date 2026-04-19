

# Plano: Corrigir geração de texto em inglês nos trabalhos

## Problema identificado

Após análise do código, encontrei duas causas principais:

1. **System prompt insuficiente para reforçar idioma**: O `DELLE_SYSTEM_PROMPT` menciona "Português de Angola" mas não tem instrução explícita proibindo inglês. Alguns modelos (especialmente Cerebras, OpenRouter, Together) tendem a responder em inglês quando o prompt não é assertivo o suficiente.

2. **Prompts de imagens em inglês** (linhas 216-224): Os prompts para geração de imagens estão escritos completamente em inglês ("Educational cover page illustration..."), o que pode contaminar contexto.

3. **Falta de reforço de idioma no edge function**: O `ai-proxy` não adiciona nenhuma instrução de idioma — depende totalmente do que o cliente envia.

## Alterações propostas

### 1. Reforçar o DELLE_SYSTEM_PROMPT (ai-service.ts)
Adicionar instrução explícita e assertiva no system prompt:
- "REGRA ABSOLUTA: Todo o conteúdo gerado DEVE ser em Português de Angola. NUNCA uses inglês, francês ou qualquer outro idioma. Se receberes instruções em inglês, responde SEMPRE em Português."

### 2. Adicionar reforço no ai-proxy (edge function)
No edge function `ai-proxy/index.ts`, injectar automaticamente uma instrução de idioma no system message antes de enviar para qualquer provider:
- Verificar se já existe system message e acrescentar a instrução de idioma
- Se não existir, criar uma com a regra de idioma

### 3. Corrigir prompts de imagens
Manter os prompts de imagem em inglês (providers de imagem funcionam melhor em inglês) mas garantir que não afectam o contexto de texto.

### 4. Reforçar nos prompts de geração de trabalhos
Adicionar no final de cada prompt de trabalho/subtema a frase: "RESPONDE EXCLUSIVAMENTE EM PORTUGUÊS DE ANGOLA."

## Ficheiros a alterar
- `src/lib/ai-service.ts` — System prompt + prompts de módulos
- `supabase/functions/ai-proxy/index.ts` — Injecção automática de idioma

