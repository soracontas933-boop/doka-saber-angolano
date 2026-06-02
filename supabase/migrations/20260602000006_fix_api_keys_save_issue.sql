-- Migração para corrigir definitivamente o problema de salvamento de chaves API
-- Problema: Contas admin não conseguiam salvar chaves API devido a conflitos nas políticas RLS

-- 1. Garantir que a tabela api_keys existe e tem RLS habilitado
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas antigas que possam estar em conflito
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can read api_keys" ON public.api_keys;
    DROP POLICY IF EXISTS "Admins can insert api_keys" ON public.api_keys;
    DROP POLICY IF EXISTS "Admins can update api_keys" ON public.api_keys;
    DROP POLICY IF EXISTS "Admins can delete api_keys" ON public.api_keys;
    DROP POLICY IF EXISTS "No public access to api_keys" ON public.api_keys;
    DROP POLICY IF EXISTS "Only admins can manage api keys" ON public.api_keys;
END $$;

-- 3. Recriar as funções de verificação de admin com SECURITY DEFINER
-- para garantir que funcionem corretamente mesmo com RLS
CREATE OR REPLACE FUNCTION public.is_admin_or_master(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
    AND LOWER(email) IN ('kenymatos943@gmail.com', 'manuelmatosjose67@gmail.com')
  )
  OR EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_or_master(auth.uid())
$$;

-- 4. Recriar as políticas RLS com permissões explícitas para todas as operações
-- Política de LEITURA
CREATE POLICY "api_keys_admin_select"
ON public.api_keys FOR SELECT
TO authenticated
USING (public.is_admin_or_master(auth.uid()));

-- Política de INSERÇÃO
CREATE POLICY "api_keys_admin_insert"
ON public.api_keys FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_master(auth.uid()));

-- Política de ATUALIZAÇÃO
CREATE POLICY "api_keys_admin_update"
ON public.api_keys FOR UPDATE
TO authenticated
USING (public.is_admin_or_master(auth.uid()))
WITH CHECK (public.is_admin_or_master(auth.uid()));

-- Política de DELEÇÃO
CREATE POLICY "api_keys_admin_delete"
ON public.api_keys FOR DELETE
TO authenticated
USING (public.is_admin_or_master(auth.uid()));

-- 5. Forçar o reload do schema do PostgREST para aplicar as mudanças
NOTIFY pgrst, 'reload schema';

-- 6. Comentário de auditoria
COMMENT ON TABLE public.api_keys IS 'Tabela de chaves API para provedores de IA. Acesso restrito a administradores via RLS. Última correção: 2026-06-02 - Corrigido problema de salvamento de chaves por contas admin.';
