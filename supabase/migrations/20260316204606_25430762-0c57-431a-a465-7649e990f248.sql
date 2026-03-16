-- User plans table
CREATE TABLE public.user_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plano text NOT NULL DEFAULT 'gratuito',
  limite_trabalhos integer NOT NULL DEFAULT 2,
  limite_resumos integer NOT NULL DEFAULT 3,
  limite_questionarios integer NOT NULL DEFAULT 3,
  limite_planos_aula integer NOT NULL DEFAULT 0,
  limite_tfc integer NOT NULL DEFAULT 0,
  creditos_totais integer NOT NULL DEFAULT 0,
  creditos_usados integer NOT NULL DEFAULT 0,
  suporte_prioritario boolean NOT NULL DEFAULT false,
  pago_em timestamp with time zone,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  atualizado_em timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan"
  ON public.user_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plan"
  ON public.user_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all plans"
  ON public.user_plans FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin can update all plans"
  ON public.user_plans FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_plans (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_plan
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_plan();