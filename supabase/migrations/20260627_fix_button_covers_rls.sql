-- Corrigir políticas de RLS para button_covers
-- Problema: Erro "new row violates row-level security policy" ao inserir/atualizar capas

-- 1. Garantir que o bucket button-covers existe e é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('button-covers', 'button-covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Remover políticas antigas que podem estar conflitando
DROP POLICY IF EXISTS "Button cover images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload button covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update button covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete button covers" ON storage.objects;

-- 3. Recriar políticas de storage para button-covers com nomes únicos
CREATE POLICY "button_covers_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'button-covers');

CREATE POLICY "button_covers_admin_insert" ON storage.objects
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'button-covers' AND (SELECT public.is_admin()));

CREATE POLICY "button_covers_admin_update" ON storage.objects
  FOR UPDATE TO authenticated 
  USING (bucket_id = 'button-covers' AND (SELECT public.is_admin()));

CREATE POLICY "button_covers_admin_delete" ON storage.objects
  FOR DELETE TO authenticated 
  USING (bucket_id = 'button-covers' AND (SELECT public.is_admin()));

-- 4. Remover políticas antigas da tabela button_covers
DROP POLICY IF EXISTS "Button covers are publicly readable" ON public.button_covers;
DROP POLICY IF EXISTS "Admins can insert button covers" ON public.button_covers;
DROP POLICY IF EXISTS "Admins can update button covers" ON public.button_covers;
DROP POLICY IF EXISTS "Admins can delete button covers" ON public.button_covers;

-- 5. Recriar políticas da tabela button_covers com nomes únicos
CREATE POLICY "button_covers_table_public_read" ON public.button_covers
  FOR SELECT USING (true);

CREATE POLICY "button_covers_table_admin_insert" ON public.button_covers
  FOR INSERT TO authenticated 
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "button_covers_table_admin_update" ON public.button_covers
  FOR UPDATE TO authenticated 
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "button_covers_table_admin_delete" ON public.button_covers
  FOR DELETE TO authenticated 
  USING ((SELECT public.is_admin()));

-- 6. Notificar PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';
