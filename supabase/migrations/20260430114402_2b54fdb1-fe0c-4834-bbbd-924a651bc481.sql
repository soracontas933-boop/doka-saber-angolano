
-- App downloads tracking
CREATE TABLE public.app_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  device_type TEXT NOT NULL DEFAULT 'unknown',
  os TEXT,
  browser TEXT,
  country TEXT,
  city TEXT,
  region TEXT,
  ip TEXT,
  source TEXT NOT NULL DEFAULT 'landing',
  status TEXT NOT NULL DEFAULT 'prompted',
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert app_downloads"
ON public.app_downloads FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view app_downloads"
ON public.app_downloads FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can delete app_downloads"
ON public.app_downloads FOR DELETE
TO authenticated
USING (is_admin());

CREATE INDEX idx_app_downloads_created_at ON public.app_downloads (created_at DESC);
CREATE INDEX idx_app_downloads_status ON public.app_downloads (status);
CREATE INDEX idx_app_downloads_device ON public.app_downloads (device_type);

-- Enrich page_views
ALTER TABLE public.page_views
  ADD COLUMN IF NOT EXISTS device_type TEXT,
  ADD COLUMN IF NOT EXISTS os TEXT,
  ADD COLUMN IF NOT EXISTS browser TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS ip TEXT;

-- Allow anonymous landing page visits to be tracked
DROP POLICY IF EXISTS "Anyone can insert page_views" ON public.page_views;
CREATE POLICY "Anyone can insert page_views"
ON public.page_views FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_downloads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.page_views;
