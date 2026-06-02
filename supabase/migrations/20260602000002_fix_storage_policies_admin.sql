
-- Garantir que os buckets existem
INSERT INTO storage.buckets (id, name, public)
VALUES ('hero-images', 'hero-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('book-files', 'book-files', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "hero_images_bucket_insert" ON storage.objects;
DROP POLICY IF EXISTS "hero_images_bucket_update" ON storage.objects;
DROP POLICY IF EXISTS "hero_images_bucket_delete" ON storage.objects;
DROP POLICY IF EXISTS "hero_images_bucket_select" ON storage.objects;

DROP POLICY IF EXISTS "book_covers_admin_write" ON storage.objects;
DROP POLICY IF EXISTS "book_covers_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "book_covers_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "book_covers_public_read" ON storage.objects;

DROP POLICY IF EXISTS "book_files_admin_write" ON storage.objects;
DROP POLICY IF EXISTS "book_files_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "book_files_admin_delete" ON storage.objects;

-- Políticas para hero-images (Acesso público para leitura, Admin para escrita)
CREATE POLICY "hero_images_read_policy" ON storage.objects
  FOR SELECT USING (bucket_id = 'hero-images');

CREATE POLICY "hero_images_admin_insert_policy" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hero-images' AND public.is_admin_or_master(auth.uid()));

CREATE POLICY "hero_images_admin_update_policy" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'hero-images' AND public.is_admin_or_master(auth.uid()));

CREATE POLICY "hero_images_admin_delete_policy" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'hero-images' AND public.is_admin_or_master(auth.uid()));

-- Políticas para book-covers (Acesso público para leitura, Admin para escrita)
CREATE POLICY "book_covers_read_policy" ON storage.objects
  FOR SELECT USING (bucket_id = 'book-covers');

CREATE POLICY "book_covers_admin_insert_policy" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'book-covers' AND public.is_admin_or_master(auth.uid()));

CREATE POLICY "book_covers_admin_update_policy" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'book-covers' AND public.is_admin_or_master(auth.uid()));

CREATE POLICY "book_covers_admin_delete_policy" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'book-covers' AND public.is_admin_or_master(auth.uid()));

-- Políticas para book-files (Admin para tudo, Leitura restrita para usuários que compraram - já existe outra política para isso)
CREATE POLICY "book_files_admin_insert_policy" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'book-files' AND public.is_admin_or_master(auth.uid()));

CREATE POLICY "book_files_admin_update_policy" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'book-files' AND public.is_admin_or_master(auth.uid()));

CREATE POLICY "book_files_admin_delete_policy" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'book-files' AND public.is_admin_or_master(auth.uid()));

CREATE POLICY "book_files_admin_select_policy" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'book-files' AND public.is_admin_or_master(auth.uid()));
