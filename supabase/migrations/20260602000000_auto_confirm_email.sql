-- Função para auto-confirmar e-mail de novos usuários
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS trigger AS $$
BEGIN
  NEW.email_confirmed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para executar a função antes de inserir um novo usuário
DROP TRIGGER IF EXISTS tr_auto_confirm_email ON auth.users;
CREATE TRIGGER tr_auto_confirm_email
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_email();

-- Confirmar e-mails de usuários existentes que ainda não foram confirmados
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;
