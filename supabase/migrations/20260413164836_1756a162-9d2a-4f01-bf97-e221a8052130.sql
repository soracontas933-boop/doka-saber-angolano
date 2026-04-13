
-- Create storage bucket for button cover images
INSERT INTO storage.buckets (id, name, public) VALUES ('button-covers', 'button-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to button cover images
CREATE POLICY "Button cover images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'button-covers');

-- Allow authenticated admins to upload button cover images
CREATE POLICY "Admins can upload button covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'button-covers' AND public.is_admin_or_master(auth.uid()));

-- Allow authenticated admins to update button cover images
CREATE POLICY "Admins can update button covers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'button-covers' AND public.is_admin_or_master(auth.uid()));

-- Allow authenticated admins to delete button cover images
CREATE POLICY "Admins can delete button covers"
ON storage.objects FOR DELETE
USING (bucket_id = 'button-covers' AND public.is_admin_or_master(auth.uid()));

-- Create table to map buttons to their cover images
CREATE TABLE public.button_covers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  button_key TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  label TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.button_covers ENABLE ROW LEVEL SECURITY;

-- Everyone can read button covers (they're displayed on the UI)
CREATE POLICY "Button covers are publicly readable"
ON public.button_covers FOR SELECT
USING (true);

-- Only admins/masters can insert
CREATE POLICY "Admins can insert button covers"
ON public.button_covers FOR INSERT
WITH CHECK (public.is_admin_or_master(auth.uid()));

-- Only admins/masters can update
CREATE POLICY "Admins can update button covers"
ON public.button_covers FOR UPDATE
USING (public.is_admin_or_master(auth.uid()));

-- Only admins/masters can delete
CREATE POLICY "Admins can delete button covers"
ON public.button_covers FOR DELETE
USING (public.is_admin_or_master(auth.uid()));
