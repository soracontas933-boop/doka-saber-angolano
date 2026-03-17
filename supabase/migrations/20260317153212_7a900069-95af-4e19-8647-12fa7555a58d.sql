
-- Create page_views table for traffic tracking
CREATE TABLE public.page_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  page text NOT NULL,
  referrer text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert their own views
CREATE POLICY "Users can insert own page views"
  ON public.page_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin can read all
CREATE POLICY "Admin can view all page views"
  ON public.page_views FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Index for fast queries
CREATE INDEX idx_page_views_created_at ON public.page_views (created_at DESC);
CREATE INDEX idx_page_views_page ON public.page_views (page);
