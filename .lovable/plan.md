

## Plano: Optimizar IAs Gratuitas para Alto Volume (+1000 trabalhos/dia)

### Problema Actual
- **Groq**: Usa `llama-3.1-8b-instant` — modelo pequeno, fraco para trabalhos longos de 10+ páginas
- **OpenRouter**: Usa `mistral-small-3.1-24b-instruct:free` — limite de 8 req/min, instável
- **Gemini**: Quota esgotada na tua chave actual

### Limites Reais das APIs Gratuitas

| Serviço | Modelo Recomendado | Limite Gratuito | Qualidade |
|---------|-------------------|-----------------|-----------|
| **Groq** | `llama-3.3-70b-versatile` | 30 req/min, 14.400 req/dia, 500K tokens/dia | Excelente |
| **OpenRouter** | `deepseek/deepseek-chat-v3-0324:free` | ~20 req/min, mais estável | Muito boa |
| **Gemini** | `gemini-2.0-flash` | 15 req/min, 1500 req/dia (renova) | Boa (criar nova chave) |

**Capacidade combinada estimada: ~2000-3000 req/dia** — suficiente para 1000+ trabalhos se cada trabalho usar 2-3 chamadas.

### Alterações Técnicas

**1. `supabase/functions/ai-proxy/index.ts`**
- Mudar modelo Groq de `llama-3.1-8b-instant` → `llama-3.3-70b-versatile` (9x maior, muito melhor para textos longos)
- Mudar modelo OpenRouter de `mistral-small-3.1-24b-instruct:free` → `deepseek/deepseek-chat-v3-0324:free` (mais estável, menos rate limits)
- Adicionar sistema de **round-robin** entre serviços para distribuir carga em vez de sempre tentar Groq primeiro
- Adicionar tracking de qual serviço foi usado no último pedido para balancear

**2. Gemini — Nova Chave**
- A tua chave actual está com quota esgotada. Precisas criar uma nova em [ai.google.dev](https://ai.google.dev) — é gratuito e renova mensalmente
- Após criar, actualizo na base de dados

### Recomendação Extra para Escalar
Para centenas de utilizadores simultâneos, considera criar **múltiplas chaves Groq** (com contas diferentes) e o sistema roda entre elas automaticamente — isto multiplica a capacidade sem custos.

