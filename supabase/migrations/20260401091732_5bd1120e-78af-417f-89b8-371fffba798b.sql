
DROP POLICY IF EXISTS "No public access to api_keys" ON public.api_keys;

CREATE POLICY "Admins can read api_keys"
ON public.api_keys FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can insert api_keys"
ON public.api_keys FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update api_keys"
ON public.api_keys FOR UPDATE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can delete api_keys"
ON public.api_keys FOR DELETE
TO authenticated
USING (public.is_admin());
