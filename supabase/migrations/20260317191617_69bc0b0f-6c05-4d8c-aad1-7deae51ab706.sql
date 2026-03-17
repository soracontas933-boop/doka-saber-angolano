
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  assunto TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  resposta TEXT,
  estado TEXT NOT NULL DEFAULT 'aberto',
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Users can insert their own messages
CREATE POLICY "Users can insert own support messages"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own messages
CREATE POLICY "Users can view own support messages"
  ON public.support_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admin can view all
CREATE POLICY "Admin can view all support messages"
  ON public.support_messages FOR SELECT TO authenticated
  USING (is_admin());

-- Admin can update all (to reply)
CREATE POLICY "Admin can update all support messages"
  ON public.support_messages FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
