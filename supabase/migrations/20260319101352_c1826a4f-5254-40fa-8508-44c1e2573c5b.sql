
-- Workgroups table
CREATE TABLE public.workgroups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  criado_por uuid NOT NULL,
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.workgroups ENABLE ROW LEVEL SECURITY;

-- Workgroup members table
CREATE TABLE public.workgroup_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workgroup_id uuid NOT NULL REFERENCES public.workgroups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  papel text NOT NULL DEFAULT 'membro',
  aceite boolean NOT NULL DEFAULT false,
  convidado_em timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(workgroup_id, user_id)
);

ALTER TABLE public.workgroup_members ENABLE ROW LEVEL SECURITY;

-- Workgroup projects table
CREATE TABLE public.workgroup_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workgroup_id uuid NOT NULL REFERENCES public.workgroups(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  adicionado_por uuid NOT NULL,
  adicionado_em timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(workgroup_id, project_id)
);

ALTER TABLE public.workgroup_projects ENABLE ROW LEVEL SECURITY;

-- Security definer function to check workgroup membership
CREATE OR REPLACE FUNCTION public.is_workgroup_member(_user_id uuid, _workgroup_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workgroup_members
    WHERE user_id = _user_id
      AND workgroup_id = _workgroup_id
      AND aceite = true
  )
$$;

-- Security definer function to check workgroup ownership
CREATE OR REPLACE FUNCTION public.is_workgroup_owner(_user_id uuid, _workgroup_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workgroup_members
    WHERE user_id = _user_id
      AND workgroup_id = _workgroup_id
      AND papel = 'dono'
      AND aceite = true
  )
$$;

-- Function to find user by email (uses auth.users securely)
CREATE OR REPLACE FUNCTION public.find_user_by_email(_email text)
RETURNS TABLE(user_id uuid, nome text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.nome
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE u.email = _email
  LIMIT 1
$$;

-- RLS for workgroups
CREATE POLICY "Members can view their workgroups"
  ON public.workgroups FOR SELECT TO authenticated
  USING (public.is_workgroup_member(auth.uid(), id) OR criado_por = auth.uid());

CREATE POLICY "Authenticated users can create workgroups"
  ON public.workgroups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = criado_por);

CREATE POLICY "Owner can update workgroup"
  ON public.workgroups FOR UPDATE TO authenticated
  USING (public.is_workgroup_owner(auth.uid(), id));

CREATE POLICY "Owner can delete workgroup"
  ON public.workgroups FOR DELETE TO authenticated
  USING (criado_por = auth.uid());

-- RLS for workgroup_members
CREATE POLICY "Members can view group members"
  ON public.workgroup_members FOR SELECT TO authenticated
  USING (public.is_workgroup_member(auth.uid(), workgroup_id) OR user_id = auth.uid());

CREATE POLICY "Owner can insert members"
  ON public.workgroup_members FOR INSERT TO authenticated
  WITH CHECK (public.is_workgroup_owner(auth.uid(), workgroup_id) OR user_id = auth.uid());

CREATE POLICY "Owner can delete members"
  ON public.workgroup_members FOR DELETE TO authenticated
  USING (public.is_workgroup_owner(auth.uid(), workgroup_id));

CREATE POLICY "Members can update own membership"
  ON public.workgroup_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS for workgroup_projects
CREATE POLICY "Members can view group projects"
  ON public.workgroup_projects FOR SELECT TO authenticated
  USING (public.is_workgroup_member(auth.uid(), workgroup_id));

CREATE POLICY "Members can add projects"
  ON public.workgroup_projects FOR INSERT TO authenticated
  WITH CHECK (public.is_workgroup_member(auth.uid(), workgroup_id));

CREATE POLICY "Owner can remove projects"
  ON public.workgroup_projects FOR DELETE TO authenticated
  USING (public.is_workgroup_owner(auth.uid(), workgroup_id));

-- Allow members to view projects shared in their groups
CREATE POLICY "Members can view shared group projects"
  ON public.projects FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workgroup_projects wp
      JOIN public.workgroup_members wm ON wm.workgroup_id = wp.workgroup_id
      WHERE wp.project_id = projects.id
        AND wm.user_id = auth.uid()
        AND wm.aceite = true
    )
  );
