-- Tabela de feature flags globais (ON/OFF para todos os utilizadores)
CREATE TABLE public.feature_flags_global (
  feature_key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  label text,
  atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_por uuid
);

ALTER TABLE public.feature_flags_global ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags_global_select_all"
  ON public.feature_flags_global FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "feature_flags_global_admin_insert"
  ON public.feature_flags_global FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "feature_flags_global_admin_update"
  ON public.feature_flags_global FOR UPDATE
  TO authenticated USING (public.is_admin());

CREATE POLICY "feature_flags_global_admin_delete"
  ON public.feature_flags_global FOR DELETE
  TO authenticated USING (public.is_admin());

-- Tabela de overrides por utilizador (sobrepõe-se ao global)
CREATE TABLE public.feature_flags_user (
  user_id uuid NOT NULL,
  feature_key text NOT NULL,
  enabled boolean NOT NULL,
  atualizado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_por uuid,
  PRIMARY KEY (user_id, feature_key)
);

ALTER TABLE public.feature_flags_user ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags_user_self_or_admin_select"
  ON public.feature_flags_user FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "feature_flags_user_admin_insert"
  ON public.feature_flags_user FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "feature_flags_user_admin_update"
  ON public.feature_flags_user FOR UPDATE
  TO authenticated USING (public.is_admin());

CREATE POLICY "feature_flags_user_admin_delete"
  ON public.feature_flags_user FOR DELETE
  TO authenticated USING (public.is_admin());

-- Seed com todas as funcionalidades do sidebar (todas activas por defeito)
INSERT INTO public.feature_flags_global (feature_key, enabled, label) VALUES
  ('home', true, 'Início'),
  ('meus-projetos', true, 'Meus Projetos'),
  ('trabalho', true, 'Trabalho Escolar'),
  ('curriculo', true, 'Currículo (CV)'),
  ('resumo', true, 'Resumo'),
  ('questionario', true, 'Questionário'),
  ('plano-aula', true, 'Plano de Aula'),
  ('apresentacao', true, 'Apresentação'),
  ('correcao', true, 'Corrigir Trabalho'),
  ('grupos', true, 'Trabalho em Grupo'),
  ('livraria', true, 'Livraria'),
  ('planos', true, 'Planos'),
  ('creditos', true, 'Créditos Extras'),
  ('suporte', true, 'Suporte & Ajuda');

-- Activar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_flags_global;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_flags_user;