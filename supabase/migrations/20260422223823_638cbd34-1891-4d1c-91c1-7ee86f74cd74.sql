ALTER TABLE public.hero_images ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.hero_images ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'image';

INSERT INTO public.site_settings (chave, valor) VALUES ('hero_text_align', 'center') ON CONFLICT (chave) DO NOTHING;
INSERT INTO public.site_settings (chave, valor) VALUES ('section_about_title', 'Sobre Nós') ON CONFLICT (chave) DO NOTHING;
INSERT INTO public.site_settings (chave, valor) VALUES ('section_about_text', 'A Delle nasceu da paixão por transformar a educação em Angola. Combinamos tecnologia de ponta com profundo conhecimento do currículo INIDE/MED para entregar ferramentas que realmente ajudam estudantes e professores a alcançar o seu máximo potencial.') ON CONFLICT (chave) DO NOTHING;
INSERT INTO public.site_settings (chave, valor) VALUES ('section_about_image', '') ON CONFLICT (chave) DO NOTHING;
INSERT INTO public.site_settings (chave, valor) VALUES ('section_about_position', 'left') ON CONFLICT (chave) DO NOTHING;
INSERT INTO public.site_settings (chave, valor) VALUES ('section_about_enabled', 'true') ON CONFLICT (chave) DO NOTHING;