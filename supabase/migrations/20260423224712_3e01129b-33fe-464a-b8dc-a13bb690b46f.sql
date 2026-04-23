
-- ============ TABELAS ============

CREATE TABLE public.study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tema text NOT NULL,
  disciplina text NOT NULL,
  criado_por uuid NOT NULL,
  estado text NOT NULL DEFAULT 'ativo', -- ativo | dividido | finalizado
  documento_final jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.study_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  nome_exibicao text NOT NULL,
  cor text NOT NULL DEFAULT '#1E9DF1',
  papel text NOT NULL DEFAULT 'membro', -- dono | membro
  aceite boolean NOT NULL DEFAULT false,
  creditos_pagos boolean NOT NULL DEFAULT false,
  entrou_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE public.study_group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  email text NOT NULL,
  convidado_por uuid NOT NULL,
  estado text NOT NULL DEFAULT 'pendente', -- pendente | aceite | recusado
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, email)
);

CREATE TABLE public.study_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  sender_id uuid, -- null = bot @Delle
  sender_nome text NOT NULL,
  sender_cor text NOT NULL DEFAULT '#1E9DF1',
  conteudo text NOT NULL,
  is_bot boolean NOT NULL DEFAULT false,
  mencionados text[] NOT NULL DEFAULT '{}',
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.study_group_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.study_group_members(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  titulo text NOT NULL,
  conteudo text NOT NULL DEFAULT '',
  ordem integer NOT NULL DEFAULT 0,
  defesa jsonb, -- { resumo, pontos_chave[], perguntas[{q,a}] }
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sgm_group ON public.study_group_messages(group_id, criado_em);
CREATE INDEX idx_sgmem_user ON public.study_group_members(user_id);
CREATE INDEX idx_sginv_email ON public.study_group_invites(email, estado);

-- ============ HELPERS (security definer) ============

CREATE OR REPLACE FUNCTION public.is_study_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.study_group_members
    WHERE user_id = _user_id AND group_id = _group_id AND aceite = true)
$$;

CREATE OR REPLACE FUNCTION public.is_study_group_owner(_user_id uuid, _group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.study_groups
    WHERE id = _group_id AND criado_por = _user_id)
$$;

-- Aceitar convite: valida créditos, desconta 20 e marca aceite atomicamente
CREATE OR REPLACE FUNCTION public.aceitar_convite_grupo(
  p_group_id uuid,
  p_nome_exibicao text,
  p_cor text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  v_invite_id uuid;
  v_member_id uuid;
  v_already_paid boolean;
  v_consumed boolean;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'nao_autenticado');
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user;

  -- Verifica convite OU se é o dono
  SELECT id INTO v_invite_id FROM public.study_group_invites
    WHERE group_id = p_group_id AND lower(email) = lower(v_email) AND estado = 'pendente'
    LIMIT 1;

  IF v_invite_id IS NULL AND NOT EXISTS (
    SELECT 1 FROM public.study_groups WHERE id = p_group_id AND criado_por = v_user
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem_convite');
  END IF;

  -- Já é membro?
  SELECT id, creditos_pagos INTO v_member_id, v_already_paid
    FROM public.study_group_members
    WHERE group_id = p_group_id AND user_id = v_user;

  IF v_member_id IS NOT NULL AND v_already_paid THEN
    -- Já aceite e pago, só actualiza dados
    UPDATE public.study_group_members
      SET nome_exibicao = p_nome_exibicao, cor = p_cor, aceite = true
      WHERE id = v_member_id;
    RETURN jsonb_build_object('ok', true, 'member_id', v_member_id);
  END IF;

  -- Cobrar 20 créditos
  SELECT public.consume_credits(v_user, 20) INTO v_consumed;
  IF NOT v_consumed THEN
    RETURN jsonb_build_object('ok', false, 'error', 'creditos_insuficientes');
  END IF;

  IF v_member_id IS NULL THEN
    INSERT INTO public.study_group_members (group_id, user_id, nome_exibicao, cor, papel, aceite, creditos_pagos)
    VALUES (p_group_id, v_user, p_nome_exibicao, p_cor,
      CASE WHEN EXISTS (SELECT 1 FROM public.study_groups WHERE id = p_group_id AND criado_por = v_user) THEN 'dono' ELSE 'membro' END,
      true, true)
    RETURNING id INTO v_member_id;
  ELSE
    UPDATE public.study_group_members
      SET nome_exibicao = p_nome_exibicao, cor = p_cor, aceite = true, creditos_pagos = true
      WHERE id = v_member_id;
  END IF;

  IF v_invite_id IS NOT NULL THEN
    UPDATE public.study_group_invites SET estado = 'aceite' WHERE id = v_invite_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'member_id', v_member_id);
END;
$$;

-- ============ RLS ============

ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_parts ENABLE ROW LEVEL SECURITY;

-- study_groups
CREATE POLICY "view groups as member or owner" ON public.study_groups
  FOR SELECT TO authenticated
  USING (criado_por = auth.uid() OR public.is_study_group_member(auth.uid(), id) OR EXISTS (
    SELECT 1 FROM public.study_group_invites i
    JOIN auth.users u ON lower(u.email) = lower(i.email)
    WHERE i.group_id = study_groups.id AND u.id = auth.uid() AND i.estado = 'pendente'
  ));
CREATE POLICY "create own groups" ON public.study_groups
  FOR INSERT TO authenticated WITH CHECK (criado_por = auth.uid());
CREATE POLICY "owner updates group" ON public.study_groups
  FOR UPDATE TO authenticated USING (criado_por = auth.uid());
CREATE POLICY "owner deletes group" ON public.study_groups
  FOR DELETE TO authenticated USING (criado_por = auth.uid());

-- study_group_members
CREATE POLICY "view members of own groups" ON public.study_group_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_study_group_member(auth.uid(), group_id) OR public.is_study_group_owner(auth.uid(), group_id));
CREATE POLICY "owner manages members insert" ON public.study_group_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_study_group_owner(auth.uid(), group_id) OR user_id = auth.uid());
CREATE POLICY "self or owner updates member" ON public.study_group_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_study_group_owner(auth.uid(), group_id));
CREATE POLICY "owner removes members" ON public.study_group_members
  FOR DELETE TO authenticated
  USING (public.is_study_group_owner(auth.uid(), group_id) OR user_id = auth.uid());

-- study_group_invites
CREATE POLICY "view invites for own email or as owner" ON public.study_group_invites
  FOR SELECT TO authenticated
  USING (
    public.is_study_group_owner(auth.uid(), group_id)
    OR EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND lower(u.email) = lower(study_group_invites.email))
  );
CREATE POLICY "owner creates invites" ON public.study_group_invites
  FOR INSERT TO authenticated
  WITH CHECK (public.is_study_group_owner(auth.uid(), group_id));
CREATE POLICY "owner deletes invites" ON public.study_group_invites
  FOR DELETE TO authenticated
  USING (public.is_study_group_owner(auth.uid(), group_id));
CREATE POLICY "invitee or owner updates invite" ON public.study_group_invites
  FOR UPDATE TO authenticated
  USING (public.is_study_group_owner(auth.uid(), group_id) OR EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND lower(u.email) = lower(study_group_invites.email)));

-- study_group_messages
CREATE POLICY "members view messages" ON public.study_group_messages
  FOR SELECT TO authenticated
  USING (public.is_study_group_member(auth.uid(), group_id) OR public.is_study_group_owner(auth.uid(), group_id));
CREATE POLICY "members send messages" ON public.study_group_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (public.is_study_group_member(auth.uid(), group_id) OR public.is_study_group_owner(auth.uid(), group_id))
  );

-- study_group_parts
CREATE POLICY "members view parts" ON public.study_group_parts
  FOR SELECT TO authenticated
  USING (public.is_study_group_member(auth.uid(), group_id) OR public.is_study_group_owner(auth.uid(), group_id));
CREATE POLICY "owner inserts parts" ON public.study_group_parts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_study_group_owner(auth.uid(), group_id));
CREATE POLICY "owner or self updates parts" ON public.study_group_parts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_study_group_owner(auth.uid(), group_id));
CREATE POLICY "owner deletes parts" ON public.study_group_parts
  FOR DELETE TO authenticated
  USING (public.is_study_group_owner(auth.uid(), group_id));

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_group_parts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_groups;

ALTER TABLE public.study_group_messages REPLICA IDENTITY FULL;
ALTER TABLE public.study_group_members REPLICA IDENTITY FULL;
ALTER TABLE public.study_group_parts REPLICA IDENTITY FULL;
ALTER TABLE public.study_groups REPLICA IDENTITY FULL;
