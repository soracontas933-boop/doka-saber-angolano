
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============ CATEGORIES ============
CREATE TABLE public.book_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  icone text DEFAULT 'BookOpen',
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.book_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_public_read" ON public.book_categories FOR SELECT USING (true);
CREATE POLICY "categories_admin_insert" ON public.book_categories FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "categories_admin_update" ON public.book_categories FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "categories_admin_delete" ON public.book_categories FOR DELETE TO authenticated USING (is_admin());

INSERT INTO public.book_categories (nome, slug, icone, ordem) VALUES
  ('Matemática', 'matematica', 'Calculator', 1),
  ('Português', 'portugues', 'BookOpen', 2),
  ('Física', 'fisica', 'Atom', 3),
  ('Química', 'quimica', 'FlaskConical', 4),
  ('Biologia', 'biologia', 'Leaf', 5),
  ('História', 'historia', 'Landmark', 6),
  ('Romance', 'romance', 'Heart', 7),
  ('Técnico', 'tecnico', 'Wrench', 8);

-- ============ BOOKS ============
CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  autor text NOT NULL,
  descricao text,
  capa_url text,
  ficheiro_path text NOT NULL,
  category_id uuid REFERENCES public.book_categories(id) ON DELETE SET NULL,
  gratuito boolean NOT NULL DEFAULT true,
  preco_kz numeric NOT NULL DEFAULT 0,
  preco_creditos integer NOT NULL DEFAULT 0,
  paginas integer,
  idioma text DEFAULT 'Português',
  classe text,
  isbn text,
  destaque boolean NOT NULL DEFAULT false,
  publicado boolean NOT NULL DEFAULT true,
  downloads integer NOT NULL DEFAULT 0,
  visualizacoes integer NOT NULL DEFAULT 0,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_books_category ON public.books(category_id);
CREATE INDEX idx_books_publicado ON public.books(publicado);
CREATE INDEX idx_books_titulo_trgm ON public.books USING gin (titulo gin_trgm_ops);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "books_public_read" ON public.books FOR SELECT USING (publicado = true OR is_admin());
CREATE POLICY "books_admin_insert" ON public.books FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "books_admin_update" ON public.books FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "books_admin_delete" ON public.books FOR DELETE TO authenticated USING (is_admin());

-- ============ LIBRARY ============
CREATE TABLE public.book_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  obtido_em timestamptz NOT NULL DEFAULT now(),
  metodo text NOT NULL DEFAULT 'gratis',
  UNIQUE (user_id, book_id)
);

ALTER TABLE public.book_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "library_self_read" ON public.book_library FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "library_self_insert" ON public.book_library FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "library_self_delete" ON public.book_library FOR DELETE TO authenticated USING (auth.uid() = user_id OR is_admin());

-- ============ PURCHASE REQUESTS ============
CREATE TABLE public.book_purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  email_confirmacao text NOT NULL,
  ficheiro_url text,
  valor numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'pendente',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.book_purchase_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_self_read" ON public.book_purchase_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "purchase_self_insert" ON public.book_purchase_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "purchase_admin_update" ON public.book_purchase_requests FOR UPDATE TO authenticated USING (is_admin());

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES ('book-covers', 'book-covers', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('book-files', 'book-files', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('book-receipts', 'book-receipts', false) ON CONFLICT DO NOTHING;

CREATE POLICY "book_covers_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'book-covers');
CREATE POLICY "book_covers_admin_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'book-covers' AND is_admin());
CREATE POLICY "book_covers_admin_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'book-covers' AND is_admin());
CREATE POLICY "book_covers_admin_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'book-covers' AND is_admin());

CREATE POLICY "book_files_admin_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'book-files' AND is_admin());
CREATE POLICY "book_files_admin_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'book-files' AND is_admin());
CREATE POLICY "book_files_admin_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'book-files' AND is_admin());
CREATE POLICY "book_files_owners_read" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'book-files' AND (
    is_admin() OR EXISTS (
      SELECT 1 FROM public.book_library bl
      JOIN public.books b ON b.id = bl.book_id
      WHERE bl.user_id = auth.uid() AND b.ficheiro_path = storage.objects.name
    )
  )
);

CREATE POLICY "book_receipts_self_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'book-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "book_receipts_self_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'book-receipts' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin()));

-- ============ RPC: comprar com créditos ============
CREATE OR REPLACE FUNCTION public.comprar_livro_com_creditos(p_book_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_book record;
  v_consumed boolean;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'nao_autenticado'); END IF;

  SELECT * INTO v_book FROM public.books WHERE id = p_book_id AND publicado = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'livro_nao_encontrado'); END IF;

  IF EXISTS (SELECT 1 FROM public.book_library WHERE user_id = v_user AND book_id = p_book_id) THEN
    RETURN jsonb_build_object('ok', true, 'ja_possui', true);
  END IF;

  IF v_book.gratuito THEN
    INSERT INTO public.book_library (user_id, book_id, metodo) VALUES (v_user, p_book_id, 'gratis');
    UPDATE public.books SET downloads = downloads + 1 WHERE id = p_book_id;
    RETURN jsonb_build_object('ok', true, 'metodo', 'gratis');
  END IF;

  IF v_book.preco_creditos <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_opcao_creditos');
  END IF;

  SELECT public.consume_credits(v_user, v_book.preco_creditos) INTO v_consumed;
  IF NOT v_consumed THEN RETURN jsonb_build_object('ok', false, 'error', 'creditos_insuficientes'); END IF;

  INSERT INTO public.book_library (user_id, book_id, metodo) VALUES (v_user, p_book_id, 'creditos');
  UPDATE public.books SET downloads = downloads + 1 WHERE id = p_book_id;

  RETURN jsonb_build_object('ok', true, 'metodo', 'creditos');
END;
$$;

CREATE OR REPLACE FUNCTION public.aprovar_compra_livro(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req record;
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'nao_autorizado');
  END IF;

  SELECT * INTO v_req FROM public.book_purchase_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'pedido_nao_encontrado'); END IF;

  INSERT INTO public.book_library (user_id, book_id, metodo)
    VALUES (v_req.user_id, v_req.book_id, 'pago')
    ON CONFLICT (user_id, book_id) DO NOTHING;

  UPDATE public.book_purchase_requests SET estado = 'aprovado', atualizado_em = now() WHERE id = p_request_id;
  UPDATE public.books SET downloads = downloads + 1 WHERE id = v_req.book_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;
