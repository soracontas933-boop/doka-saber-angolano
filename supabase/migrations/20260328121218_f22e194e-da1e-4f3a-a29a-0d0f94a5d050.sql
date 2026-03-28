
-- Chat messages table for threaded conversations
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_messages(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in their own conversations
CREATE POLICY "Users can view own chat messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_messages sm 
      WHERE sm.id = conversation_id AND sm.user_id = auth.uid()
    )
    OR is_admin()
  );

-- Users can insert messages in their own conversations
CREATE POLICY "Users can insert own chat messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND (
      EXISTS (
        SELECT 1 FROM public.support_messages sm 
        WHERE sm.id = conversation_id AND sm.user_id = auth.uid()
      )
      OR is_admin()
    )
  );

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Allow admin to create support_messages (start conversations)
CREATE POLICY "Admin can insert support messages" ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());
