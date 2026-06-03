-- Add read status to chat_messages to track notifications
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Function to send welcome message to new users
CREATE OR REPLACE FUNCTION public.handle_new_user_welcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    support_conv_id UUID;
    user_name TEXT;
BEGIN
    -- Get user name if available
    SELECT nome INTO user_name FROM public.profiles WHERE id = NEW.id;
    IF user_name IS NULL THEN
        user_name := 'Usuário';
    END IF;

    -- Create a support conversation for the new user
    INSERT INTO public.support_messages (user_id, assunto, mensagem, estado)
    VALUES (NEW.id, 'Bem-vindo à Delle!', 'Mensagem de boas-vindas automática', 'aberto')
    RETURNING id INTO support_conv_id;

    -- Insert the welcome message into chat_messages
    -- sender_id will be the user's ID for now as a placeholder for "Support", 
    -- but we should ideally have a dedicated Support Admin ID. 
    -- For simplicity, we'll use a null or specific UUID if we had one.
    -- Let's assume the first admin found or a system ID.
    INSERT INTO public.chat_messages (conversation_id, sender_id, content)
    VALUES (
        support_conv_id, 
        '00000000-0000-0000-0000-000000000000', -- System/Support ID
        '👋 Olá! Bem-vindo à Delle! ' || user_name || '

Eu sou o assistente da plataforma e vou te ajudar a criar trabalhos escolares, resumos, questionários, planos de aula, currículos e muito mais em poucos segundos.

💡 Tudo funciona com créditos — cada geração usa uma pequena parte do seu saldo.

💳 Se os créditos acabarem, é só ir em **Saldo** e escolher um plano para continuar usando normalmente.

🚀 Sempre que precisar, estou aqui para te ajudar!'
    );

    RETURN NEW;
END;
$$;

-- Trigger to send welcome message after profile is created
-- We use AFTER INSERT ON public.profiles because handle_new_user already creates the profile
CREATE OR REPLACE TRIGGER on_profile_created_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_welcome();
