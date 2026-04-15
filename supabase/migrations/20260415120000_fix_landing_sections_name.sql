
-- Create table for landing page sections (underscore version)
CREATE TABLE IF NOT EXISTS public.landing_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL, -- 'sobre', 'funcionalidades', 'voce-sabia', 'hero', etc.
  titulo TEXT,
  conteudo JSONB NOT NULL DEFAULT '{}'::jsonb,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for landing_sections
ALTER TABLE public.landing_sections ENABLE ROW LEVEL SECURITY;

-- Policies for landing_sections
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'landing_sections' AND policyname = 'Landing sections are publicly readable') THEN
    CREATE POLICY "Landing sections are publicly readable" ON public.landing_sections FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'landing_sections' AND policyname = 'Admins can manage landing sections') THEN
    CREATE POLICY "Admins can manage landing sections" ON public.landing_sections FOR ALL USING (public.is_admin_or_master(auth.uid())) WITH CHECK (public.is_admin_or_master(auth.uid()));
  END IF;
END $$;

-- Create a view with hyphenated name to handle tools/clients that might be looking for 'landing-sections'
-- Note: Hyphenated names in PostgreSQL must be quoted.
CREATE OR REPLACE VIEW public."landing-sections" AS SELECT * FROM public.landing_sections;

-- Also create a view with the schema-prefixed name mentioned in the error if necessary
-- The error said "public-landing-sections", which might be how PostgREST reports the "public"."landing-sections" table.

-- Seed initial data if table is empty
INSERT INTO public.landing_sections (tipo, titulo, conteudo, ordem)
SELECT 'funcionalidades', 'Funcionalidades Principais', '{
  "items": [
    {"icon": "FileText", "title": "Trabalhos Escolares", "desc": "Gere trabalhos completos com capa, índice, introdução e conclusão no formato angolano."},
    {"icon": "BookOpen", "title": "Resumos Inteligentes", "desc": "Transforme fotos do caderno em resumos estruturados e flashcards de estudo."},
    {"icon": "HelpCircle", "title": "Questionários", "desc": "Crie questionários interativos com correção automática e gabaritos."},
    {"icon": "ClipboardList", "title": "Planos de Aula", "desc": "Planos no formato INIDE, prontos para entregar e usar na sala de aula."}
  ],
  "style": {"columns": 2, "textAlign": "center"}
}', 1
WHERE NOT EXISTS (SELECT 1 FROM public.landing_sections WHERE tipo = 'funcionalidades');

INSERT INTO public.landing_sections (tipo, titulo, conteudo, ordem)
SELECT 'voce-sabia', 'Você Sabia?', '{
  "items": [
    {"icon": "Lightbulb", "fact": "Estudantes que usam resumos estruturados memorizam até 40% mais conteúdo.", "highlight": "40% mais"},
    {"icon": "GraduationCap", "fact": "Professores poupam em média 3 horas por semana usando planos de aula automáticos.", "highlight": "3 horas"},
    {"icon": "Users", "fact": "Trabalhos em grupo com ferramentas digitais têm 60% mais chances de ter nota máxima.", "highlight": "60% mais"},
    {"icon": "Star", "fact": "Angola tem mais de 10 milhões de estudantes — a Delle foi feita para cada um deles.", "highlight": "10 milhões"}
  ],
  "style": {"columns": 2}
}', 2
WHERE NOT EXISTS (SELECT 1 FROM public.landing_sections WHERE tipo = 'voce-sabia');

INSERT INTO public.landing_sections (tipo, titulo, conteudo, ordem)
SELECT 'sobre', 'Sobre a Delle', '{
  "rows": [
    {
      "badge": "Sobre a Delle",
      "title": "A primeira plataforma educacional feita em Angola, para Angola",
      "text": "A Delle nasceu da necessidade de modernizar o ensino em Angola, oferecendo ferramentas que respeitam as normas do INIDE e facilitam a vida de estudantes e professores.",
      "image": "/src/assets/sobre-estudantes.jpg",
      "reverse": false
    },
    {
      "badge": "Nossa Missão",
      "title": "Democratizar o acesso à tecnologia educacional",
      "text": "Queremos que cada estudante angolano, do ensino primário ao universitário, tenha um assistente inteligente para potenciar os seus estudos.",
      "image": "/src/assets/sobre-professor.jpg",
      "reverse": true
    }
  ]
}', 3
WHERE NOT EXISTS (SELECT 1 FROM public.landing_sections WHERE tipo = 'sobre');
