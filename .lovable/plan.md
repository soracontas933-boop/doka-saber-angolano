# Gestão de Funcionalidades do Sidebar (Painel Admin)

Permitir ao Master ativar/desativar cada item do menu lateral — **globalmente** (para todos) ou **individualmente** (por utilizador específico). Útil para esconder rapidamente uma funcionalidade enquanto se corrigem erros.

## O que vais ter

Nova aba **"Funcionalidades"** no Painel Admin com dois sub-modos:

1. **Global** — lista todos os itens do sidebar (Trabalho Escolar, Resumo, Apresentação, Currículo, Livraria, etc.) com um toggle ON/OFF. Desativar um item esconde-o do sidebar de **todos os utilizadores** (não admins).
2. **Por Utilizador** — pesquisa de utilizador por email/nome, e abaixo a mesma lista de toggles aplicada apenas àquele utilizador (sobrepõe-se ao global, podendo ativar mesmo que esteja desativado globalmente, ou desativar individualmente).

Os Masters/Admins **continuam sempre a ver tudo** (não são afetados pelos toggles), garantindo que podes corrigir os erros mesmo com features escondidas.

## Itens controláveis

Todos os itens do sidebar de utilizador comum:
Início, Meus Projetos, Trabalho Escolar, Currículo, Resumo, Questionário, Plano de Aula, Apresentação, Corrigir Trabalho, Trabalho em Grupo, Livraria, Planos, Créditos Extras, Suporte.

(Itens admin como Dashboard, Painel Admin, Mensagens, Chaves API ficam fora — são geridos pelas permissões existentes.)

## Detalhes técnicos

**Base de dados** (2 tabelas novas):
- `feature_flags_global` — `feature_key` (PK, ex: `trabalho`, `resumo`), `enabled` (bool), `atualizado_em`. RLS: leitura pública autenticada, escrita só admin.
- `feature_flags_user` — `user_id`, `feature_key`, `enabled` (bool/null = herda global). PK composta. RLS: utilizador lê o seu próprio; admin lê/escreve tudo.

**Lógica de resolução** (no cliente):
`final = user_override ?? global_enabled ?? true` — por defeito tudo ativo.

**Hook novo**: `src/hooks/use-feature-flags.tsx` — carrega global + override do user atual, expõe `isFeatureEnabled(key)`. Cache em memória + canal realtime para aplicar mudanças instantaneamente sem refresh.

**`AppSidebar.tsx`**: adiciona campo `featureKey` a cada `NavItem` e filtra com `isFeatureEnabled(item.featureKey)` — exceto se o user for admin (vê sempre tudo).

**Painel Admin** (`AdminPanelPage.tsx`): nova aba `features` com:
- Componente `AdminFeaturesTab.tsx` (novo): toggles globais no topo + caixa de pesquisa de utilizador → toggles individuais com 3 estados (Herdar / Ativo / Desativo).
- Botão "Repor para o global" por utilizador.
- Aviso visual quando uma feature está desativada globalmente.

**Realtime**: `ALTER PUBLICATION supabase_realtime ADD TABLE feature_flags_global, feature_flags_user;` para refletir mudanças em tempo real nos clientes ligados.

## Ficheiros afetados

- **Migração SQL**: criar `feature_flags_global` + `feature_flags_user` + RLS + seed das chaves padrão (todas `enabled = true`).
- **Novos**: `src/hooks/use-feature-flags.tsx`, `src/components/AdminFeaturesTab.tsx`.
- **Editados**: `src/components/AppSidebar.tsx` (adicionar `featureKey` + filtro), `src/pages/AdminPanelPage.tsx` (adicionar aba "Funcionalidades").

## Fora de âmbito

- Não bloqueia rotas diretamente (só esconde do menu). Se quiseres bloqueio total da rota (redirect ao tentar aceder por URL), diz-me e adiciono guarda no `AppLayout`.
- Não afeta permissões de admin existentes (`admin_roles.permissions`).
