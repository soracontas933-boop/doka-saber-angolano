

## Plano: Estatísticas de Uso no Painel Admin

### Objectivo
Criar uma página de estatísticas admin acessível apenas pela conta master, mostrando métricas de uso da plataforma com dados reais das tabelas `usage_logs` e `projects`.

### Alterações

**1. Nova página `src/pages/AdminStatsPage.tsx`**
- Verificação de acesso: apenas `kenymatos943@gmail.com` pode ver
- 3 cards de estatísticas:
  - **Trabalhos gerados**: count da tabela `projects` (total e por tipo)
  - **Utilizadores activos**: count distinct `user_id` da tabela `projects`
  - **Tokens consumidos**: sum `tokens_usados` da tabela `usage_logs`, agrupado por `servico_ia`
- Gráfico simples com barras para consumo por serviço (Groq, Gemini, OpenRouter)
- Tabela com logs recentes (últimos 20 registos de `usage_logs`)

**2. Actualizar RLS na tabela `usage_logs`**
- A política SELECT actual só permite ver os próprios logs (`auth.uid() = user_id`)
- Criar uma função `is_admin()` security definer que verifica se o email é `kenymatos943@gmail.com`
- Adicionar política SELECT para admin ver todos os logs

**3. Actualizar `src/App.tsx`**
- Adicionar rota `/admin/stats` dentro do `AppLayout`

**4. Actualizar `src/components/AppSidebar.tsx`**
- Adicionar link "Admin Stats" (ícone BarChart3) visível apenas para o admin (verificação por email do user autenticado)

**5. Edge function ou query directa**
- Usar queries directas via Supabase client (com a nova política RLS admin) para buscar as contagens e somas — sem necessidade de edge function

### Migração SQL necessária
```sql
-- Função para verificar admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'kenymatos943@gmail.com'
  )
$$;

-- Admin pode ver todos os logs
CREATE POLICY "Admin can view all usage logs"
ON public.usage_logs FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admin pode ver todos os projectos (para stats)
CREATE POLICY "Admin can view all projects"
ON public.projects FOR SELECT
TO authenticated
USING (public.is_admin());
```

