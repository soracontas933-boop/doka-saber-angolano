-- ============================================================
-- Migration: Criar tabela popups, popup_views e bucket marketing
-- Data: 2026-07-31
-- Motivo: Corrigir erro "could not find the 'internal_route' column of 'popups'"
-- ============================================================

-- 1. Criar tabela popups (se não existir)
CREATE TABLE IF NOT EXISTS public.popups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  image_url text,
  link_url text,
  internal_route text,
  is_active boolean NOT NULL DEFAULT false,
  target_plan text NOT NULL DEFAULT 'all',
  media_type text NOT NULL DEFAULT 'image',
  max_views_per_day integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Garantir que internal_route existe (backward compatible)
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS internal_route text;

-- 2. Criar tabela popup_views (se não existir)
CREATE TABLE IF NOT EXISTS public.popup_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  popup_id uuid NOT NULL REFERENCES public.popups(id) ON DELETE CASCADE,
  viewed_at date NOT NULL,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, popup_id, viewed_at)
);

-- 3. Habilitar RLS nas tabelas
ALTER TABLE public.popups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.popup_views ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para popups
-- Qualquer pessoa autenticada pode ler popups ativos
CREATE POLICY IF NOT EXISTS "popups_select_active"
ON public.popups FOR SELECT
TO authenticated
USING (is_active = true OR public.is_admin());

-- Admin pode ler todos os popups
CREATE POLICY IF NOT EXISTS "popups_admin_select_all"
ON public.popups FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admin pode inserir popups
CREATE POLICY IF NOT EXISTS "popups_admin_insert"
ON public.popups FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Admin pode atualizar popups
CREATE POLICY IF NOT EXISTS "popups_admin_update"
ON public.popups FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Admin pode deletar popups
CREATE POLICY IF NOT EXISTS "popups_admin_delete"
ON public.popups FOR DELETE
TO authenticated
USING (public.is_admin());

-- 5. Políticas RLS para popup_views
-- Usuários podem ler seus próprios registros de visualização
CREATE POLICY IF NOT EXISTS "popup_views_select_own"
ON public.popup_views FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Usuários autenticados podem inserir seus próprios registros
CREATE POLICY IF NOT EXISTS "popup_views_insert_own"
ON public.popup_views FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seus próprios registros
CREATE POLICY IF NOT EXISTS "popup_views_update_own"
ON public.popup_views FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Criar bucket de storage para marketing (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing', 'marketing', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para o bucket marketing
-- Criar políticas de storage para bucket marketing
INSERT INTO storage.policies (name, definition, bucket_id, operation)
VALUES 
  ('Anyone can view marketing media', 'true', 'marketing', 'SELECT'),
  ('Admins can upload marketing media', 'auth.uid() IS NOT NULL AND public.is_admin()', 'marketing', 'INSERT'),
  ('Admins can update marketing media', 'auth.uid() IS NOT NULL AND public.is_admin()', 'marketing', 'UPDATE'),
  ('Admins can delete marketing media', 'auth.uid() IS NOT NULL AND public.is_admin()', 'marketing', 'DELETE')
ON CONFLICT DO NOTHING;

-- 7. Triggger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS popups_updated_at ON public.popups;
CREATE TRIGGER popups_updated_at
BEFORE UPDATE ON public.popups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Forçar reload do schema do PostgREST
NOTIFY pgrst, 'reload schema';
