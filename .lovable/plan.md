

# Correcção: Tela Branca Após Login (Link Publicado)

## Causa Raiz

O app tem **5+ hooks independentes** que chamam `supabase.auth.getSession()` ou `supabase.auth.getUser()` em simultâneo ao carregar a página:
- `useAuth` (ProtectedRoute) → `getSession()`
- `useAdmin` (AppSidebar) → `getSession()`
- `useUserPlan` (CreditsBar) → `getSession()`
- `usePageTracking` (AppLayout) → `getUser()`
- `useUsageTracker` (CreditsBar) → provavelmente `getSession()`

Cada chamada tenta adquirir o mesmo lock do navegador (`lock:sb-...-auth-token`). Quando várias competem, umas "roubam" o lock das outras, causando o erro nos logs: *"Lock was released because another request stole it"*. Isto resulta em sessões que retornam `null` intermitentemente, fazendo o `ProtectedRoute` redirigir para `/auth` ou os componentes renderizarem sem dados — **tela branca**.

## Solução

Centralizar TODA a lógica de autenticação num único `AuthProvider` (React Context) que chama `getSession()` **uma única vez**. Todos os outros hooks passam a consumir o contexto em vez de chamar o Supabase Auth directamente.

### 1. Criar `src/contexts/AuthContext.tsx`
- Um único `useEffect` que:
  1. Regista `onAuthStateChange` primeiro
  2. Chama `getSession()` uma vez para restaurar a sessão
  3. Expõe `user`, `session`, `isLoading`, `signOut`
- Exporta `AuthProvider` e `useAuth`

### 2. Actualizar `src/hooks/use-auth.ts`
- Re-exportar o `useAuth` do novo contexto (manter compatibilidade de imports)

### 3. Actualizar `src/App.tsx`
- Envolver as `Routes` com `<AuthProvider>`

### 4. Actualizar `src/hooks/use-admin.ts`
- Remover `supabase.auth.getSession()` e `onAuthStateChange` internos
- Importar `useAuth()` do contexto e usar `user` directamente

### 5. Actualizar `src/hooks/use-user-plan.ts`
- Remover `supabase.auth.getSession()`
- Usar `useAuth()` para obter o `user`
- Usar `enabled` flag do React Query ou useEffect condicionado a `!isLoading`

### 6. Actualizar `src/hooks/use-page-tracking.ts`
- Remover `supabase.auth.getUser()`
- Usar `useAuth()` para obter o `user`

### 7. Actualizar `src/hooks/use-usage-tracker.ts`
- Remover qualquer chamada directa ao auth
- Usar `useAuth()` do contexto

## Resultado
- Uma única chamada `getSession()` em toda a app
- Zero contenção de locks
- Fim da tela branca após login
- Carregamento mais rápido (menos chamadas de rede paralelas ao auth)

## Ficheiros afectados
1. `src/contexts/AuthContext.tsx` — **novo**
2. `src/hooks/use-auth.ts` — re-exportar do contexto
3. `src/App.tsx` — adicionar `AuthProvider`
4. `src/hooks/use-admin.ts` — usar contexto
5. `src/hooks/use-user-plan.ts` — usar contexto
6. `src/hooks/use-page-tracking.ts` — usar contexto
7. `src/hooks/use-usage-tracker.ts` — usar contexto (se aplicável)

