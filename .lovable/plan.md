

# Plano: Melhorar UX da Página de Chaves API

## Problema
A página `/setup-api-keys` existe e tem o botão "+ Chave", mas a experiência não é intuitiva — o utilizador quer ver imediatamente campos para colar chaves, com um botão claro para adicionar mais do mesmo provedor.

## Mudanças no ficheiro `src/pages/ApiKeysSetup.tsx`

1. **Cada provedor começa sempre com 1 campo vazio visível** — mesmo quando já existem chaves salvas, garantir que há sempre pelo menos um campo input vazio pronto para colar uma nova chave.

2. **Botão "+ Adicionar outra chave Gemini/Groq/etc." mais visível** — texto completo em vez de apenas "+ Chave", com estilo mais destacado (primary variant ou outline com cor).

3. **Input type="text" em vez de "password"** — para que o utilizador veja o que cola (com opção de ocultar depois).

4. **Mostrar contador por provedor** — ex: "Gemini: 3 chaves" para feedback imediato.

5. **Seed inteligente** — Quando carrega dados existentes do banco, adicionar automaticamente 1 campo vazio extra por provedor para facilitar a adição de novas chaves sem precisar clicar em nada.

## Ficheiro afectado
- `src/pages/ApiKeysSetup.tsx` — redesign da interface de gestão de chaves

