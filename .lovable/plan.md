
Objetivo: corrigir o chat para que cada nova mensagem apareça como nova bolha (append), sem “substituir” a anterior.

1) Diagnóstico confirmado
- O banco está a guardar corretamente várias mensagens em `chat_messages` (cada envio cria novo `id` e novo `created_at`).
- O problema é de renderização/fallback no frontend:
  - `support_messages.resposta` guarda só a última resposta.
  - Em `SuportePage.tsx`, essa `resposta` é injetada como fallback com `id` fixo `resposta-${convo.id}`.
  - Resultado: quando chega nova resposta, o mesmo item visual é “atualizado” e parece substituição.

2) Ajuste da fonte de verdade do chat
- Definir `chat_messages` como timeline principal (fonte oficial do histórico).
- Manter `support_messages` apenas para metadados da conversa (`estado`, `atualizado_em`, assunto inicial), não para histórico contínuo.

3) Alterações de código (sem mudar arquitetura)
- `src/pages/AdminMensagensPage.tsx` (handleSendMessage):
  - Continuar a inserir em `chat_messages`.
  - Atualizar `support_messages` apenas com `estado` e `atualizado_em`.
  - Remover escrita contínua de `resposta: newMessage.trim()` (isso é o que gera efeito de substituição no fallback).
- `src/pages/SuportePage.tsx` (fetchChatMessages):
  - Remover fallback de `resposta` da timeline, ou deixar só para legado estrito (apenas se não existir nenhuma mensagem admin em `chat_messages`).
  - Se fallback legado for mantido, usar chave única por versão (ex.: incluir timestamp) e deduplicação mais robusta (não só por `content`).

4) Compatibilidade com conversas antigas
- Preservar fallback apenas para conversas antigas onde a resposta existe em `support_messages.resposta` mas não existe linha correspondente em `chat_messages`.
- Assim evitamos “sumir” histórico antigo e eliminamos substituição nas novas mensagens.

5) Validação ponta a ponta (obrigatória)
- Cenário A: enviar 3 mensagens seguidas com textos diferentes → devem aparecer 3 bolhas.
- Cenário B: enviar 2 mensagens com texto igual → devem aparecer 2 bolhas distintas.
- Cenário C: atualizar página do utilizador → histórico mantém ordem e quantidade.
- Cenário D: trocar entre conversas e voltar → nenhuma bolha anterior é sobrescrita.
- Cenário E (mobile): repetir testes para garantir mesmo comportamento.

Detalhes técnicos
- Ficheiros a ajustar:
  - `src/pages/AdminMensagensPage.tsx`
  - `src/pages/SuportePage.tsx`
- Banco:
  - Sem nova tabela obrigatória.
  - Migração opcional de backfill (se necessário) apenas para converter respostas legadas em linhas de `chat_messages` e reduzir dependência de fallback.
- Segurança/RLS:
  - Políticas atuais de `chat_messages` já permitem leitura da conversa pelo dono e admin; não requer alteração para este bug específico.
