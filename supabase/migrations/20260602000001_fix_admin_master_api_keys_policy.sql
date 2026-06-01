
-- Corrigir a função is_admin_or_master para ser case-insensitive nos emails
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

-- Corrigir a função get_admin_permissions para ser case-insensitive nos emails
CREATE OR REPLACE FUNCTION public.get_admin_permissions(_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = _user_id
      AND LOWER(email) IN ('kenymatos943@gmail.com', 'manuelmatosjose67@gmail.com')
    ) THEN ARRAY['all']::text[]
    ELSE (SELECT permissions FROM public.admin_roles WHERE user_id = _user_id)
  END
$$;

-- Corrigir o trigger handle_new_user_plan para ser case-insensitive nos emails
CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF LOWER(NEW.email) IN ('kenymatos943@gmail.com', 'manuelmatosjose67@gmail.com') THEN
    INSERT INTO public.user_plans (user_id, plano, limite_trabalhos, limite_resumos, limite_questionarios, limite_planos_aula, limite_tfc, creditos_totais, creditos_usados, suporte_prioritario)
    VALUES (NEW.id, 'premium', -1, -1, -1, -1, -1, -1, 0, true)
    ON CONFLICT (user_id) DO UPDATE SET
      plano = 'premium', creditos_totais = -1, suporte_prioritario = true;
  ELSE
    INSERT INTO public.user_plans (user_id, plano, creditos_totais, creditos_usados)
    VALUES (NEW.id, 'gratuito', 50, 0)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Atualizar as políticas da tabela api_keys para usar is_admin_or_master(auth.uid()) explicitamente
-- e garantir que todas as operações (SELECT, INSERT, UPDATE, DELETE) funcionem para masters.

DROP POLICY IF EXISTS "Admins can read api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admins can insert api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admins can update api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admins can delete api_keys" ON public.api_keys;

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
