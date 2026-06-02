-- Migração de correção final para resolver "Database error querying schema"

-- 1. Remover a VIEW que causa ambiguidade com a tabela real
DROP VIEW IF EXISTS public."landing-sections";

-- 2. Limpar políticas duplicadas na tabela site_settings (usada no login)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Site settings are publicly readable" ON public.site_settings;
    DROP POLICY IF EXISTS "Admins can update site settings" ON public.site_settings;
    DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;
END $$;

-- 3. Recriar políticas limpas para site_settings
CREATE POLICY "Site settings are publicly readable"
ON public.site_settings FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can manage site settings"
ON public.site_settings FOR ALL
TO authenticated
USING (public.is_admin_or_master(auth.uid()))
WITH CHECK (public.is_admin_or_master(auth.uid()));

-- 4. Garantir RLS habilitado para tabelas críticas
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_sections ENABLE ROW LEVEL SECURITY;

-- 5. Forçar o reload do cache do PostgREST
NOTIFY pgrst, 'reload schema';
