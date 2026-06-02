
-- 1. Garantir que as funções básicas de admin existam e sejam case-insensitive
CREATE OR REPLACE FUNCTION public.is_admin_or_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
    AND LOWER(email) IN ('kenymatos943@gmail.com', 'manuelmatosjose67@gmail.com')
  )
  OR EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_or_master(auth.uid())
$$;

-- 2. Limpeza de duplicações que podem causar erro de schema
-- Resolver conflito na tabela landing_sections
DO $$ 
BEGIN
    -- Se houver políticas duplicadas ou conflitos, vamos limpar e padronizar
    DROP POLICY IF EXISTS "Landing sections are publicly readable" ON public.landing_sections;
    DROP POLICY IF EXISTS "Admins can insert landing sections" ON public.landing_sections;
    DROP POLICY IF EXISTS "Admins can update landing sections" ON public.landing_sections;
    DROP POLICY IF EXISTS "Admins can delete landing sections" ON public.landing_sections;
    DROP POLICY IF EXISTS "Admins can manage landing sections" ON public.landing_sections;
END $$;

-- Recriar políticas de forma limpa para landing_sections
CREATE POLICY "Landing sections are publicly readable"
ON public.landing_sections FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can manage landing sections"
ON public.landing_sections FOR ALL
TO authenticated
USING (public.is_admin_or_master(auth.uid()))
WITH CHECK (public.is_admin_or_master(auth.uid()));

-- 3. Garantir que as políticas de api_keys estejam corretas e sem conflitos
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can read api_keys" ON public.api_keys;
    DROP POLICY IF EXISTS "Admins can insert api_keys" ON public.api_keys;
    DROP POLICY IF EXISTS "Admins can update api_keys" ON public.api_keys;
    DROP POLICY IF EXISTS "Admins can delete api_keys" ON public.api_keys;
    DROP POLICY IF EXISTS "No public access to api_keys" ON public.api_keys;
END $$;

CREATE POLICY "Admins can read api_keys"
ON public.api_keys FOR SELECT
TO authenticated
USING (public.is_admin_or_master(auth.uid()));

CREATE POLICY "Admins can insert api_keys"
ON public.api_keys FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_master(auth.uid()));

CREATE POLICY "Admins can update api_keys"
ON public.api_keys FOR UPDATE
TO authenticated
USING (public.is_admin_or_master(auth.uid()))
WITH CHECK (public.is_admin_or_master(auth.uid()));

CREATE POLICY "Admins can delete api_keys"
ON public.api_keys FOR DELETE
TO authenticated
USING (public.is_admin_or_master(auth.uid()));

-- 4. Forçar o recarregamento do schema do PostgREST (opcional, mas ajuda em erros de schema)
NOTIFY pgrst, 'reload schema';
