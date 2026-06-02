
-- Garantir que a função is_admin_or_master seja case-insensitive (reforço)
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

-- Garantir que a função is_admin use a lógica correta
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_or_master(auth.uid())
$$;

-- Atualizar as políticas da tabela api_keys para serem mais robustas
-- Primeiro removemos as existentes
DROP POLICY IF EXISTS "Admins can read api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admins can insert api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admins can update api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admins can delete api_keys" ON public.api_keys;

-- Recriar com lógica explícita
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
