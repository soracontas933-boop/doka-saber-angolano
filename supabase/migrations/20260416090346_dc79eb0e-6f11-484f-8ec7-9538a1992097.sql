
CREATE TABLE public.landing_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  titulo TEXT,
  conteudo JSONB NOT NULL DEFAULT '{}',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.landing_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landing sections are publicly readable"
ON public.landing_sections FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins can insert landing sections"
ON public.landing_sections FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_master(auth.uid()));

CREATE POLICY "Admins can update landing sections"
ON public.landing_sections FOR UPDATE
TO authenticated
USING (is_admin_or_master(auth.uid()));

CREATE POLICY "Admins can delete landing sections"
ON public.landing_sections FOR DELETE
TO authenticated
USING (is_admin_or_master(auth.uid()));
