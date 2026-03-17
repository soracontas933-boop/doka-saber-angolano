
-- Add genero and funcao columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS genero text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS funcao text;

-- Update handle_new_user to save metadata from signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nome, genero, funcao, idade, telefone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NULL),
    COALESCE(NEW.raw_user_meta_data->>'genero', NULL),
    COALESCE(NEW.raw_user_meta_data->>'funcao', NULL),
    CASE WHEN NEW.raw_user_meta_data->>'idade' IS NOT NULL 
         THEN (NEW.raw_user_meta_data->>'idade')::integer 
         ELSE NULL END,
    COALESCE(NEW.raw_user_meta_data->>'telefone', NULL)
  );
  RETURN NEW;
END;
$function$;
