CREATE TABLE IF NOT EXISTS public.checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  plano text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  sale_id text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view checkout sessions"
  ON public.checkout_sessions FOR SELECT
  TO authenticated
  USING (is_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE public.checkout_sessions;