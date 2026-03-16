
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
