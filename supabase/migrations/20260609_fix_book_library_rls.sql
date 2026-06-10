-- Corrigir erro RLS em book_library ao aprovar compras de livros
-- Problema: RPC aprovar_compra_livro tenta inserir em book_library com user_id do comprador,
-- mas a política RLS só permite INSERT se auth.uid() = user_id
-- Solução: Adicionar política de INSERT para admins

-- Remover política antiga que bloqueia admins
DROP POLICY IF EXISTS "library_self_insert" ON public.book_library;

-- Recriar com permissão para admins também
CREATE POLICY "library_self_insert" ON public.book_library FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id OR public.is_admin_or_master(auth.uid()));

-- Adicionar política de UPDATE para admins (caso necessário no futuro)
CREATE POLICY "library_admin_update" ON public.book_library FOR UPDATE 
TO authenticated 
USING (public.is_admin_or_master(auth.uid()))
WITH CHECK (public.is_admin_or_master(auth.uid()));

-- Comentário de auditoria
COMMENT ON TABLE public.book_library IS 'Biblioteca de livros do utilizador. Atualizado em 2026-06-09 para permitir admins inserir registos durante aprovação de compras.';
