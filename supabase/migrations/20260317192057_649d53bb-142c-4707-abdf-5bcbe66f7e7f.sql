
CREATE TABLE public.payment_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read payment settings
CREATE POLICY "Anyone can read payment settings"
  ON public.payment_settings FOR SELECT TO authenticated
  USING (true);

-- Only admin can update
CREATE POLICY "Admin can update payment settings"
  ON public.payment_settings FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- Only admin can insert
CREATE POLICY "Admin can insert payment settings"
  ON public.payment_settings FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Seed defaults
INSERT INTO public.payment_settings (chave, valor) VALUES
  ('iban', '005500008915805510176'),
  ('iban_banco', 'Banco X Angola'),
  ('iban_titular', 'Doka Educação Lda'),
  ('multicaixa_numero', '926143927');
