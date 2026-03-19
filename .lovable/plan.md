

## Plano: Home do Utilizador + Trabalho em Grupo

### Visão Geral

Criar duas funcionalidades principais:
1. **Página Home** para utilizadores autenticados com ações rápidas e resumo de actividade
2. **Sistema de Trabalho em Grupo** com convites e espaço partilhado

---

### 1. Página Home do Utilizador (`/home`)

Nova página que substitui o redirect actual (hoje, não-admins vão para `/trabalho`).

**Conteúdo da Home:**
- **Saudação personalizada** com nome do perfil e hora do dia
- **Cards de ações rápidas** (6 botões grandes): Criar Trabalho, Criar Resumo, Gerar Questionário, Plano de Aula, Corrigir Trabalho, Meus Projetos
- **Resumo do plano actual** (plano, créditos usados/total, botão para upgrade)
- **Actividade recente** (últimos 5 projectos criados com links directos)
- **Card de Trabalho em Grupo** com acesso rápido aos grupos

**Ficheiros:**
- Criar `src/pages/HomePage_User.tsx` (renomear para evitar conflito com o HomePage público)
- Actualizar `src/App.tsx` para adicionar rota `/home`
- Actualizar `src/pages/Dashboard.tsx` para redirecionar não-admins para `/home` em vez de `/trabalho`
- Actualizar `src/components/AppSidebar.tsx` e `src/components/MobileNav.tsx` para incluir link "Início" para não-admins

---

### 2. Sistema de Trabalho em Grupo

**Modelo de dados (3 tabelas novas via migração):**

- **`workgroups`** — id, nome, criado_por (uuid), criado_em
- **`workgroup_members`** — id, workgroup_id (FK), user_id (uuid), papel (enum: 'dono', 'membro'), convidado_em, aceite (boolean)
- **`workgroup_projects`** — id, workgroup_id (FK), project_id (FK → projects), adicionado_por (uuid), adicionado_em

**RLS:**
- Membros podem ver o grupo e os seus projectos
- Apenas o dono pode convidar/remover membros
- Todos os membros podem adicionar projectos ao grupo

**Fluxo de convite:**
1. Utilizador cria um grupo (dá-lhe um nome)
2. Convida colegas por email
3. O convidado vê uma notificação (tabela `notifications` existente) com botão para aceitar
4. Ao aceitar, o membro vê os projectos do grupo e pode gerar novos trabalhos dentro dele

**Ficheiros:**
- Criar `src/pages/TrabalhoGrupoPage.tsx` — lista de grupos, criar grupo, convidar membros, ver projectos do grupo
- Criar `src/components/grupo/GrupoCard.tsx` — card visual por grupo
- Criar `src/components/grupo/ConvidarMembroDialog.tsx` — dialog para convidar por email
- Actualizar `src/App.tsx` para adicionar rota `/grupo`
- Actualizar sidebar e mobile nav

---

### Detalhes Técnicos

**Migração SQL (resumo):**
```text
workgroups (id, nome, criado_por, criado_em)
workgroup_members (id, workgroup_id FK, user_id, papel, aceite, convidado_em)  
workgroup_projects (id, workgroup_id FK, project_id FK, adicionado_por, adicionado_em)
+ RLS policies para cada tabela
```

**Convite por email:**
- Pesquisa na tabela `profiles` por email (via join com `auth.users` — usar edge function `admin-users` ou criar função SQL `find_user_by_email`)
- Se o utilizador existe, cria entrada em `workgroup_members` com `aceite = false` e insere notificação
- Se não existe, mostra mensagem "Utilizador não encontrado"

**Navegação actualizada:**
- Sidebar: adicionar "Início" (ícone Home) para não-admins como primeiro item, e "Grupos" (ícone Users)
- Mobile nav: adicionar "Início" e "Grupos"

**Ordem de implementação:**
1. Migração de tabelas + RLS
2. Página Home do utilizador
3. Actualizar navegação (sidebar + mobile)
4. Página de Trabalho em Grupo (criar, convidar, listar)
5. Sistema de notificação de convites (usar tabela `notifications` existente)

