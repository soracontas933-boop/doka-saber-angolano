
-- Create storage bucket for landing page images
INSERT INTO storage.buckets (id, name, public) VALUES ('landing-images', 'landing-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to landing images
CREATE POLICY "Landing images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'landing-images');

-- Allow authenticated admins to upload landing images
CREATE POLICY "Admins can upload landing images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'landing-images' AND public.is_admin_or_master(auth.uid()));

-- Allow authenticated admins to update landing images
CREATE POLICY "Admins can update landing images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'landing-images' AND public.is_admin_or_master(auth.uid()));

-- Allow authenticated admins to delete landing images
CREATE POLICY "Admins can delete landing images"
ON storage.objects FOR DELETE
USING (bucket_id = 'landing-images' AND public.is_admin_or_master(auth.uid()));

-- Create table for landing page sections
CREATE TABLE public.landing_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL, -- 'sobre', 'funcionalidades', 'voce-sabia', 'hero', etc.
  titulo TEXT,
  conteudo JSONB NOT NULL DEFAULT '{}'::jsonb,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landing_sections ENABLE ROW LEVEL SECURITY;

-- Everyone can read landing sections
CREATE POLICY "Landing sections are publicly readable"
ON public.landing_sections FOR SELECT
USING (true);

-- Only admins/masters can manage landing sections
CREATE POLICY "Admins can manage landing sections"
ON public.landing_sections FOR ALL
USING (public.is_admin_or_master(auth.uid()))
WITH CHECK (public.is_admin_or_master(auth.uid()));

-- Seed initial data based on current HomePage.tsx
INSERT INTO public.landing_sections (tipo, titulo, conteudo, ordem) VALUES 
('funcionalidades', 'Funcionalidades Principais', '{
  "items": [
    {"icon": "FileText", "title": "Trabalhos Escolares", "desc": "Gere trabalhos completos com capa, índice, introdução e conclusão no formato angolano."},
    {"icon": "BookOpen", "title": "Resumos Inteligentes", "desc": "Transforme fotos do caderno em resumos estruturados e flashcards de estudo."},
    {"icon": "HelpCircle", "title": "Questionários", "desc": "Crie questionários interativos com correção automática e gabaritos."},
    {"icon": "ClipboardList", "title": "Planos de Aula", "desc": "Planos no formato INIDE, prontos para entregar e usar na sala de aula."}
  ],
  "style": {"columns": 2, "textAlign": "center"}
}', 1),
('voce-sabia', 'Você Sabia?', '{
  "items": [
    {"icon": "Lightbulb", "fact": "Estudantes que usam resumos estruturados memorizam até 40% mais conteúdo.", "highlight": "40% mais"},
    {"icon": "GraduationCap", "fact": "Professores poupam em média 3 horas por semana usando planos de aula automáticos.", "highlight": "3 horas"},
    {"icon": "Users", "fact": "Trabalhos em grupo com ferramentas digitais têm 60% mais chances de ter nota máxima.", "highlight": "60% mais"},
    {"icon": "Star", "fact": "Angola tem mais de 10 milhões de estudantes — a Delle foi feita para cada um deles.", "highlight": "10 milhões"}
  ],
  "style": {"columns": 2}
}', 2),
('sobre', 'Sobre a Delle', '{
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
}', 3);
