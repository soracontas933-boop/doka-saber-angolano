
CREATE TABLE IF NOT EXISTS public.billing_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'entrada',
  descricao text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  plano text,
  user_email text,
  categoria text DEFAULT 'assinatura',
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view billing records"
  ON public.billing_records FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin can insert billing records"
  ON public.billing_records FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin can delete billing records"
  ON public.billing_records FOR DELETE
  TO authenticated
  USING (is_admin());
