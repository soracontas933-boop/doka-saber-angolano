-- Create storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovativos', 'comprovativos', false);

-- RLS for comprovativos bucket: users can upload their own files
CREATE POLICY "Users can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comprovativos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can view their own receipts
CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'comprovativos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admin can view all receipts
CREATE POLICY "Admin can view all receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'comprovativos' AND public.is_admin());

-- Create payment_requests table
CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plano text NOT NULL,
  valor numeric NOT NULL,
  email_confirmacao text NOT NULL,
  ficheiro_url text,
  estado text NOT NULL DEFAULT 'pendente',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own payment requests"
ON public.payment_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own payment requests"
ON public.payment_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all payment requests"
ON public.payment_requests FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admin can update all payment requests"
ON public.payment_requests FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());