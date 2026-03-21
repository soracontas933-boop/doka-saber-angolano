
-- Hero images table
CREATE TABLE public.hero_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_images ENABLE ROW LEVEL SECURITY;

-- Anyone can read (public landing page)
CREATE POLICY "hero_images_select_all" ON public.hero_images
  FOR SELECT USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "hero_images_admin_insert" ON public.hero_images
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "hero_images_admin_update" ON public.hero_images
  FOR UPDATE TO authenticated USING (public.is_admin());

CREATE POLICY "hero_images_admin_delete" ON public.hero_images
  FOR DELETE TO authenticated USING (public.is_admin());

-- Site settings table for carousel toggle etc
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text UNIQUE NOT NULL,
  valor text NOT NULL DEFAULT '',
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_settings_select_all" ON public.site_settings
  FOR SELECT USING (true);

CREATE POLICY "site_settings_admin_insert" ON public.site_settings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "site_settings_admin_update" ON public.site_settings
  FOR UPDATE TO authenticated USING (public.is_admin());

-- Default setting: carousel off
INSERT INTO public.site_settings (chave, valor) VALUES ('hero_carousel', 'false');

-- Storage bucket for hero images
INSERT INTO storage.buckets (id, name, public) VALUES ('hero-images', 'hero-images', true);

-- Storage policies
CREATE POLICY "hero_images_bucket_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'hero-images');

CREATE POLICY "hero_images_bucket_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hero-images' AND public.is_admin());

CREATE POLICY "hero_images_bucket_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'hero-images' AND public.is_admin());
