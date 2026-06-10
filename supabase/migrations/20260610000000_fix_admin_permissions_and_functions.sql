-- Migração para corrigir permissões e funções administrativas
-- Data: 2026-06-10

-- 1. Atualizar a função is_admin_or_master para ser mais robusta e usar SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin_or_master(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    is_master boolean;
    has_admin_role boolean;
BEGIN
    -- Verificar se o email está na lista de masters
    SELECT EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = _user_id
        AND LOWER(email) IN ('kenymatos943@gmail.com', 'manuelmatosjose67@gmail.com')
    ) INTO is_master;

    IF is_master THEN
        RETURN true;
    END IF;

    -- Verificar se possui entrada na tabela admin_roles
    SELECT EXISTS (
        SELECT 1 FROM public.admin_roles
        WHERE user_id = _user_id
    ) INTO has_admin_role;

    RETURN has_admin_role;
END;
$$;

-- 2. Garantir que is_admin() utilize a função is_admin_or_master corretamente
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_or_master(auth.uid());
$$;

-- 3. Corrigir políticas RLS para tabelas administrativas
-- Tabela: usage_logs
DROP POLICY IF EXISTS "Admin can view all usage logs" ON public.usage_logs;
CREATE POLICY "Admin can view all usage logs"
ON public.usage_logs FOR SELECT
TO authenticated
USING (public.is_admin());

-- Tabela: page_views
DROP POLICY IF EXISTS "Admin can view all page views" ON public.page_views;
CREATE POLICY "Admin can view all page views"
ON public.page_views FOR SELECT
TO authenticated
USING (public.is_admin());

-- Tabela: profiles
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
CREATE POLICY "Admin can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin());

-- Tabela: user_plans
DROP POLICY IF EXISTS "Admin can view all plans" ON public.user_plans;
CREATE POLICY "Admin can view all plans"
ON public.user_plans FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can update all plans" ON public.user_plans;
CREATE POLICY "Admin can update all plans"
ON public.user_plans FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Tabela: app_downloads
DROP POLICY IF EXISTS "Admins can view app_downloads" ON public.app_downloads;
CREATE POLICY "Admins can view app_downloads"
ON public.app_downloads FOR SELECT
TO authenticated
USING (public.is_admin());

-- 4. Notificar o PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';

COMMENT ON FUNCTION public.is_admin_or_master(uuid) IS 'Verifica se um usuário é administrador master ou possui papel administrativo. Corrigido em 2026-06-10.';
