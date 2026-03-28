
-- Create admin_roles table for managing master users with granular permissions
CREATE TABLE public.admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  permissions text[] NOT NULL DEFAULT '{}',
  concedido_por uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user has admin role (original masters or promoted)
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
    AND email IN ('kenymatos943@gmail.com', 'manuelmatosjose67@gmail.com')
  )
  OR EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = _user_id
  )
$$;

-- Function to get user permissions (returns all permissions or NULL if not admin)
CREATE OR REPLACE FUNCTION public.get_admin_permissions(_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = _user_id
      AND email IN ('kenymatos943@gmail.com', 'manuelmatosjose67@gmail.com')
    ) THEN ARRAY['all']::text[]
    ELSE (SELECT permissions FROM public.admin_roles WHERE user_id = _user_id)
  END
$$;

-- Update is_admin to also check admin_roles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_or_master(auth.uid())
$$;

-- RLS policies: only original masters can manage admin_roles
CREATE POLICY "Original masters can view all admin_roles"
  ON public.admin_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email IN ('kenymatos943@gmail.com', 'manuelmatosjose67@gmail.com')
    )
  );

CREATE POLICY "Original masters can insert admin_roles"
  ON public.admin_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email IN ('kenymatos943@gmail.com', 'manuelmatosjose67@gmail.com')
    )
  );

CREATE POLICY "Original masters can update admin_roles"
  ON public.admin_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email IN ('kenymatos943@gmail.com', 'manuelmatosjose67@gmail.com')
    )
  );

CREATE POLICY "Original masters can delete admin_roles"
  ON public.admin_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email IN ('kenymatos943@gmail.com', 'manuelmatosjose67@gmail.com')
    )
  );

-- Users can view their own role
CREATE POLICY "Users can view own admin_role"
  ON public.admin_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
