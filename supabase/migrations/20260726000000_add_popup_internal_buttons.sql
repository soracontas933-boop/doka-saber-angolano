-- Add internal navigation buttons to popups
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS internal_buttons jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS action_button_label text DEFAULT NULL;
ALTER TABLE public.popups ADD COLUMN IF NOT EXISTS action_button_path text DEFAULT NULL;
