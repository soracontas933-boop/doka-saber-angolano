

## Diagnóstico dos Problemas

Após análise completa do código, identifiquei **3 problemas graves** que causam todos os erros reportados:

### Problema 1: Autenticação é falsa
O `AuthPage.tsx` **não usa autenticação real**. É apenas um `setTimeout` que faz `navigate("/dashboard")` sem nunca chamar `supabase.auth.signInWithPassword()` ou `supabase.auth.signUp()`. Resultado: nenhum utilizador é criado no banco de dados (confirmado: 0 utilizadores na base de dados).

### Problema 2: Rotas internas sem proteção
Todas as rotas internas (`/dashboard`, `/trabalho`, `/planos`, etc.) estão acessíveis sem login. Não existe nenhum componente de proteção de rotas.

### Problema 3: AdminPanelPage não espera pela autenticação
O `AdminPanelPage.tsx` não usa `isAuthReady` (ao contrário do Dashboard que já foi corrigido), causando redirecionamento prematuro antes da sessão ser validada.

---

## Plano de Correção

### 1. Reescrever AuthPage com autenticação real
- Implementar `supabase.auth.signInWithPassword()` para login
- Implementar `supabase.auth.signUp()` para registo
- Mostrar erros de validação adequados
- Redirecionar para `/dashboard` após login bem-sucedido

### 2. Criar componente ProtectedRoute
- Novo componente que verifica se o utilizador tem sessão activa
- Se não tiver sessão, redireciona para `/auth`
- Mostra loading enquanto verifica a sessão
- Envolver o `AppLayout` com este componente no `App.tsx`

### 3. Corrigir AdminPanelPage
- Adicionar `isAuthReady` ao `useAdmin()` destruturado (já existe no hook, mas não é usado na página)
- Condicionar o redirecionamento a `isAuthReady && !isLoadingAdmin && !isAdmin`

### 4. Criar hook useAuth centralizado
- Novo hook `useAuth` que expõe `user`, `session`, `isLoading`
- Usa `getSession()` seguido de `onAuthStateChange`
- Reutilizável em todo o app

---

## Ficheiros a criar/editar

| Ficheiro | Acção |
|---|---|
| `src/hooks/use-auth.ts` | Criar - hook centralizado de autenticação |
| `src/components/ProtectedRoute.tsx` | Criar - guarda de rotas |
| `src/pages/AuthPage.tsx` | Reescrever - login/registo real com Supabase |
| `src/pages/AdminPanelPage.tsx` | Editar - adicionar `isAuthReady` |
| `src/App.tsx` | Editar - envolver rotas internas com ProtectedRoute |

