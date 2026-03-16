
-- Create api_keys table for storing AI service credentials (admin only)
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servico TEXT NOT NULL,
  chave TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Only authenticated users with admin role can access api_keys
-- For now, no public access at all (edge functions use service role)
CREATE POLICY "No public access to api_keys"
  ON public.api_keys
  FOR ALL
  USING (false);

-- Create usage_logs table
CREATE TABLE public.usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  modulo TEXT NOT NULL,
  servico_ia TEXT,
  tokens_usados INTEGER DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage logs"
  ON public.usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage logs"
  ON public.usage_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
