ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS prioridade integer NOT NULL DEFAULT 0;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS ultimo_erro timestamptz;