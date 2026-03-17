
-- Secure function to increment creditos_usados (bypasses RLS)
CREATE OR REPLACE FUNCTION public.increment_creditos_usados(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_plans
  SET creditos_usados = creditos_usados + 1,
      atualizado_em = now()
  WHERE user_id = p_user_id;
END;
$$;
