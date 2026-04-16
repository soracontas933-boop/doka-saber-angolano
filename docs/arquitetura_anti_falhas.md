# Arquitetura Anti-Falhas para Geração de Conteúdo por IA

## 1. Introdução

Este documento detalha a proposta de arquitetura para um sistema anti-falhas, com o objetivo de garantir a qualidade e a correção do conteúdo gerado por inteligência artificial. O sistema será capaz de detetar e corrigir automaticamente erros de formatação, linguagem incoerente ou conteúdo distorcido, assegurando que os trabalhos finais estejam livres de erros.

## 2. Análise do Contexto Atual

O repositório `doka-saber-angolano` utiliza um pipeline de geração de conteúdo que envolve:

*   **`ai-service.ts`**: Responsável por orquestrar as chamadas a diferentes modelos de IA através de um proxy.
*   **`ai-proxy/index.ts`**: Um *edge function* que atua como proxy para diversas APIs de LLMs (Groq, OpenRouter, Gemini, Cerebras, Together, Mistral), gerindo chaves de API e *cooldowns*.
*   **`trabalho-parser.ts`**: Processa o *output* em Markdown da IA, estruturando-o em secções e convertendo-o para HTML para exibição.

Atualmente, a validação do conteúdo gerado pela IA é limitada, dependendo principalmente da função `reviewWithOpenRouter` para melhorias de coerência e correção, mas sem um mecanismo robusto para detetar e corrigir erros estruturais ou de formatação.

## 3. Design da Arquitetura Anti-Falhas

A arquitetura proposta introduz uma camada de **Validação e Correção Pós-Geração** imediatamente após a resposta inicial da IA e antes que o conteúdo seja processado ou exibido ao utilizador. Esta camada será implementada principalmente em `ai-service.ts`.

### 3.1. Componentes Principais

#### 3.1.1. Módulo de Detecção de Erros

Este módulo será responsável por identificar os seguintes tipos de problemas no conteúdo gerado:

*   **Erros de Formatação Markdown**: Detecção de blocos Markdown malformados (ex: `markdown ---`, `---`, blocos de código não fechados, cabeçalhos incorretos, listas desordenadas/ordenadas com sintaxe inválida).
*   **Incoerência Linguística/Anomalias**: Identificação de sequências de caracteres estranhas, repetições excessivas, frases sem sentido ou transições abruptas que indiquem uma falha na geração (ex: 
linguagem estranha sem sentido).
*   **Conteúdo Distorcido por Fadiga/Alucinação**: Detecção de informações factualmente incorretas ou irrelevantes para o prompt original, que podem ser um sinal de "fadiga" ou "alucinação" da IA. Isso pode ser feito através de validação de palavras-chave, análise de tópicos ou até mesmo uma chamada secundária a uma IA para verificar a coerência.

#### 3.1.2. Módulo de Correção de Erros

Uma vez detetado um erro, este módulo tentará corrigi-lo. As estratégias de correção podem incluir:

*   **Normalização de Markdown**: Aplicação de regras para corrigir a sintaxe Markdown (ex: fechar blocos de código, ajustar cabeçalhos).
*   **Reescrita de Secções**: Em casos de incoerência linguística ou conteúdo distorcido, a secção problemática pode ser enviada de volta a um modelo de IA (possivelmente um modelo de revisão mais robusto ou com um prompt específico para correção) para reescrita.
*   **Remoção de Conteúdo Inválido**: Se a correção não for possível, o conteúdo problemático pode ser removido ou substituído por um marcador de posição que indique a falha.

#### 3.1.3. Mecanismo de Feedback e Re-tentativa

Se a correção automática falhar ou se o erro for considerado crítico, o sistema pode:

*   **Registrar o Erro**: Armazenar detalhes do erro para análise posterior e melhoria contínua do sistema.
*   **Re-tentar Geração**: Com base na natureza do erro, o sistema pode tentar gerar o conteúdo novamente, possivelmente com um prompt ajustado ou utilizando um modelo de IA diferente.

### 3.2. Fluxo de Processamento Proposto

```mermaid
graph TD
    A[Pedido de Geração de Conteúdo] --> B(ai-service.ts: callAI)
    B --> C{AI Proxy / LLM}
    C --> D[Resposta Bruta da IA (Markdown)]
    D --> E{Módulo de Detecção de Erros}
    E -- Erros Detetados --> F{Módulo de Correção de Erros}
    F -- Conteúdo Corrigido --> G[Conteúdo Validado e Corrigido]
    E -- Sem Erros --> G
    G --> H(trabalho-parser.ts: parseTrabalhoSections)
    H --> I[Conteúdo Estruturado]
    I --> J[Exibição ao Utilizador]
    F -- Falha na Correção / Erro Crítico --> K[Mecanismo de Feedback e Re-tentativa]
    K --> B
```

## 4. Implementação

### 4.1. Modificações em `ai-service.ts`

Será introduzida uma nova função, `validateAndCorrectAIOutput`, que será chamada imediatamente após `callAI` e antes do retorno do `result.content`.

```typescript
// ai-service.ts

// ... (código existente)

async function validateAndCorrectAIOutput(content: string, originalPrompt: string): Promise<string> {
  // 1. Detecção de Erros
  if (content.includes("```markdown ---") || content.includes("linguagem estranha sem sentido")) {
    console.warn("Erro de formatação ou linguagem estranha detetado. Tentando corrigir...");
    // Lógica de correção: pode ser uma reescrita com IA ou regex
    const correctedContent = await callAI(
      "Você é um corretor de texto. Corrija erros de formatação markdown, remova blocos de código incompletos e normalize a linguagem. Mantenha o significado original.",
      `Corrija o seguinte texto:
${content}`,
      { temperature: 0.3 } // Menor temperatura para correção mais conservadora
    );
    return correctedContent.content;
  }

  // Exemplo de detecção de alucinação/fadiga (simplificado)
  // Pode-se usar um modelo menor para validar palavras-chave ou tópicos
  if (!content.includes("Angola") && originalPrompt.includes("Angola")) {
    console.warn("Conteúdo parece ter ignorado o contexto angolano. Tentando re-gerar...");
    throw new Error("Re-gerar: contexto angolano perdido."); // Força uma re-tentativa
  }

  return content;
}

export async function generateWithAI(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 8000,
  temperature = 0.7
): Promise<AIResponse> {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const result = await callAI(systemPrompt, userPrompt, { maxTokens, temperature });
      const validatedContent = await validateAndCorrectAIOutput(result.content, userPrompt); // Passar userPrompt para validação de contexto
      return { ...result, content: validatedContent };
    } catch (e: any) {
      console.error(`Tentativa ${attempts + 1} falhou: ${e.message}`);
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error(`Falha após ${maxAttempts} tentativas: ${e.message}`);
      }
      // Pequeno delay antes de re-tentar
      await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
    }
  }
  throw new Error("Erro inesperado na geração de conteúdo.");
}

// ... (restante do código)
```

### 4.2. Modificações em `trabalho-parser.ts`

O `trabalho-parser.ts` pode ser aprimorado para ser mais resiliente a pequenas variações de Markdown, mas a principal correção de erros estruturais será feita antes de chegar a este módulo.

## 5. Testes e Validação

Serão criados testes unitários e de integração para:

*   Verificar a detecção de diferentes tipos de erros (formatação, incoerência).
*   Validar a eficácia das correções automáticas.
*   Assegurar que o mecanismo de re-tentativa funciona conforme o esperado.

## 6. Conclusão

Esta arquitetura anti-falhas visa aumentar significativamente a robustez e a qualidade do conteúdo gerado pela IA, minimizando a ocorrência de erros e garantindo uma experiência mais consistente e fiável para o utilizador. A implementação será iterativa, com monitorização contínua e refinamento dos módulos de detecção e correção.
