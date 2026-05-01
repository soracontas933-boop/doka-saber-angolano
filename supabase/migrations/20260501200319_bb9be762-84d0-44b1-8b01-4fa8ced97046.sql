
-- 1. Adicionar campos à tabela books
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS estado_aprovacao text NOT NULL DEFAULT 'aprovado',
  ADD COLUMN IF NOT EXISTS motivo_rejeicao text,
  ADD COLUMN IF NOT EXISTS submetido_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS aprovado_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS aprovado_por uuid;

-- Livros existentes ficam aprovados; novos livros de utilizadores ficam pendentes (definido pelo cliente)
CREATE INDEX IF NOT EXISTS idx_books_criado_por ON public.books(criado_por);
CREATE INDEX IF NOT EXISTS idx_books_estado_aprovacao ON public.books(estado_aprovacao);

-- Atualiza policy pública para só mostrar aprovados
DROP POLICY IF EXISTS books_public_read ON public.books;
CREATE POLICY books_public_read ON public.books
  FOR SELECT TO public
  USING (
    (publicado = true AND estado_aprovacao = 'aprovado')
    OR is_admin()
    OR auth.uid() = criado_por
  );

-- Permitir utilizadores autenticados criarem livros (substitui só-admin)
DROP POLICY IF EXISTS books_admin_insert ON public.books;
CREATE POLICY books_user_insert ON public.books
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = criado_por);

-- Permitir autor atualizar o seu próprio livro (campos de conteúdo); admin pode tudo
DROP POLICY IF EXISTS books_admin_update ON public.books;
CREATE POLICY books_owner_or_admin_update ON public.books
  FOR UPDATE TO authenticated
  USING (auth.uid() = criado_por OR is_admin());

-- Apenas admin (ou autor) pode apagar
DROP POLICY IF EXISTS books_admin_delete ON public.books;
CREATE POLICY books_owner_or_admin_delete ON public.books
  FOR DELETE TO authenticated
  USING (auth.uid() = criado_por OR is_admin());

-- 2. Métodos de pagamento dos autores
CREATE TABLE IF NOT EXISTS public.book_payout_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'iban', -- 'iban' | 'telefone' | 'multicaixa'
  iban text,
  banco text,
  titular text,
  telefone text,
  preferido boolean NOT NULL DEFAULT false,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.book_payout_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY payout_self_all ON public.book_payout_methods
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

-- 3. Visualizações de livros (para métricas)
CREATE TABLE IF NOT EXISTS public.book_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL,
  user_id uuid,
  visto_em timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_book_views_book ON public.book_views(book_id);
CREATE INDEX IF NOT EXISTS idx_book_views_data ON public.book_views(visto_em);
ALTER TABLE public.book_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY book_views_insert_any ON public.book_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY book_views_select_owner_or_admin ON public.book_views
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM public.books b WHERE b.id = book_views.book_id AND b.criado_por = auth.uid())
  );

-- 4. Payouts (histórico de pagamentos plataforma → autor)
CREATE TABLE IF NOT EXISTS public.book_author_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL,
  author_id uuid NOT NULL,
  buyer_id uuid,
  purchase_request_id uuid,
  valor numeric NOT NULL DEFAULT 0,
  metodo text NOT NULL DEFAULT 'kz', -- 'kz' | 'creditos'
  estado text NOT NULL DEFAULT 'pendente', -- 'pendente' | 'pago'
  pago_em timestamp with time zone,
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payouts_author ON public.book_author_payouts(author_id);
CREATE INDEX IF NOT EXISTS idx_payouts_book ON public.book_author_payouts(book_id);
ALTER TABLE public.book_author_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY payouts_author_or_admin_select ON public.book_author_payouts
  FOR SELECT TO authenticated
  USING (auth.uid() = author_id OR is_admin());
CREATE POLICY payouts_admin_insert ON public.book_author_payouts
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());
CREATE POLICY payouts_admin_update ON public.book_author_payouts
  FOR UPDATE TO authenticated
  USING (is_admin());

-- 5. Trigger para criar payout automaticamente quando admin aprova compra
-- (re-escreve aprovar_compra_livro para também criar payout pendente)
CREATE OR REPLACE FUNCTION public.aprovar_compra_livro(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req record;
  v_book record;
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'nao_autorizado');
  END IF;

  SELECT * INTO v_req FROM public.book_purchase_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'pedido_nao_encontrado'); END IF;

  SELECT * INTO v_book FROM public.books WHERE id = v_req.book_id;

  INSERT INTO public.book_library (user_id, book_id, metodo)
    VALUES (v_req.user_id, v_req.book_id, 'pago')
    ON CONFLICT (user_id, book_id) DO NOTHING;

  UPDATE public.book_purchase_requests SET estado = 'aprovado', atualizado_em = now() WHERE id = p_request_id;
  UPDATE public.books SET downloads = downloads + 1 WHERE id = v_req.book_id;

  -- Criar payout pendente se livro tem autor (utilizador, não admin)
  IF v_book.criado_por IS NOT NULL AND NOT public.is_admin_or_master(v_book.criado_por) THEN
    INSERT INTO public.book_author_payouts (book_id, author_id, buyer_id, purchase_request_id, valor, metodo, estado)
    VALUES (v_book.id, v_book.criado_por, v_req.user_id, v_req.id, v_req.valor, 'kz', 'pendente');

    -- Notificar autor
    INSERT INTO public.notifications (user_id, titulo, mensagem, tipo)
    VALUES (v_book.criado_por,
      'Nova venda do seu livro!',
      'O livro "' || v_book.titulo || '" foi comprado. Pagamento pendente.',
      'sucesso');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 6. Atualizar comprar_livro_com_creditos para criar payout em créditos
CREATE OR REPLACE FUNCTION public.comprar_livro_com_creditos(p_book_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_book record;
  v_consumed boolean;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'nao_autenticado'); END IF;

  SELECT * INTO v_book FROM public.books WHERE id = p_book_id AND publicado = true AND estado_aprovacao = 'aprovado';
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

  -- Payout em créditos para o autor (se não for admin)
  IF v_book.criado_por IS NOT NULL AND NOT public.is_admin_or_master(v_book.criado_por) THEN
    INSERT INTO public.book_author_payouts (book_id, author_id, buyer_id, valor, metodo, estado)
    VALUES (v_book.id, v_book.criado_por, v_user, v_book.preco_creditos, 'creditos', 'pendente');

    INSERT INTO public.notifications (user_id, titulo, mensagem, tipo)
    VALUES (v_book.criado_por,
      'Novo download do seu livro!',
      'O livro "' || v_book.titulo || '" foi obtido por um utilizador.',
      'sucesso');
  END IF;

  RETURN jsonb_build_object('ok', true, 'metodo', 'creditos');
END;
$$;

-- 7. RPC para autor publicar livro (estado pendente)
CREATE OR REPLACE FUNCTION public.submeter_livro(
  p_titulo text,
  p_autor text,
  p_descricao text,
  p_categoria_id uuid,
  p_classe text,
  p_paginas integer,
  p_idioma text,
  p_gratuito boolean,
  p_preco_kz numeric,
  p_preco_creditos integer,
  p_capa_url text,
  p_ficheiro_path text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'nao_autenticado'); END IF;
  IF p_titulo IS NULL OR p_ficheiro_path IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'dados_invalidos');
  END IF;

  INSERT INTO public.books (
    titulo, autor, descricao, category_id, classe, paginas, idioma,
    gratuito, preco_kz, preco_creditos, capa_url, ficheiro_path,
    criado_por, publicado, estado_aprovacao, submetido_em
  ) VALUES (
    p_titulo, COALESCE(p_autor, 'Autor'), p_descricao, p_categoria_id, p_classe, p_paginas, COALESCE(p_idioma, 'Português'),
    COALESCE(p_gratuito, true), COALESCE(p_preco_kz, 0), COALESCE(p_preco_creditos, 0), p_capa_url, p_ficheiro_path,
    v_user, false, 'pendente', now()
  ) RETURNING id INTO v_id;

  -- Notificar admins
  INSERT INTO public.notifications (user_id, titulo, mensagem, tipo)
  SELECT ar.user_id, 'Novo livro para aprovar', 'O livro "' || p_titulo || '" aguarda aprovação.', 'info'
  FROM public.admin_roles ar;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

-- 8. RPC admin: aprovar/rejeitar livro
CREATE OR REPLACE FUNCTION public.aprovar_livro(p_book_id uuid, p_aprovar boolean, p_motivo text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_book record;
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'nao_autorizado');
  END IF;

  SELECT * INTO v_book FROM public.books WHERE id = p_book_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'nao_encontrado'); END IF;

  IF p_aprovar THEN
    UPDATE public.books SET
      estado_aprovacao = 'aprovado',
      publicado = true,
      aprovado_em = now(),
      aprovado_por = auth.uid(),
      motivo_rejeicao = NULL
    WHERE id = p_book_id;

    IF v_book.criado_por IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, titulo, mensagem, tipo)
      VALUES (v_book.criado_por, 'Livro aprovado!', 'O seu livro "' || v_book.titulo || '" foi aprovado e está agora na livraria.', 'sucesso');
    END IF;
  ELSE
    UPDATE public.books SET
      estado_aprovacao = 'rejeitado',
      publicado = false,
      motivo_rejeicao = p_motivo
    WHERE id = p_book_id;

    IF v_book.criado_por IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, titulo, mensagem, tipo)
      VALUES (v_book.criado_por, 'Livro rejeitado', 'O seu livro "' || v_book.titulo || '" foi rejeitado. Motivo: ' || COALESCE(p_motivo, 'não especificado'), 'aviso');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 9. RPC admin: marcar payout como pago
CREATE OR REPLACE FUNCTION public.marcar_payout_pago(p_payout_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payout record;
BEGIN
  IF NOT public.is_admin_or_master(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'nao_autorizado');
  END IF;
  SELECT * INTO v_payout FROM public.book_author_payouts WHERE id = p_payout_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'nao_encontrado'); END IF;

  UPDATE public.book_author_payouts SET estado = 'pago', pago_em = now() WHERE id = p_payout_id;

  INSERT INTO public.notifications (user_id, titulo, mensagem, tipo)
  VALUES (v_payout.author_id, 'Pagamento efetuado', 'Recebeu ' || v_payout.valor || ' (' || v_payout.metodo || ') pelas vendas do seu livro.', 'sucesso');

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 10. Storage: permitir utilizadores autenticados fazerem upload em book-files e book-covers
DROP POLICY IF EXISTS "book_files_user_upload" ON storage.objects;
CREATE POLICY "book_files_user_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'book-files' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "book_files_user_read_own" ON storage.objects;
CREATE POLICY "book_files_user_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'book-files' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin_or_master(auth.uid())));

DROP POLICY IF EXISTS "book_covers_user_upload" ON storage.objects;
CREATE POLICY "book_covers_user_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'book-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
