
CREATE OR REPLACE FUNCTION public.handle_new_user_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IN ('kenymatos943@gmail.com', 'manuelmatosjose67@gmail.com') THEN
    INSERT INTO public.user_plans (user_id, plano, limite_trabalhos, limite_resumos, limite_questionarios, limite_planos_aula, limite_tfc, creditos_totais, creditos_usados, suporte_prioritario)
    VALUES (NEW.id, 'premium', -1, -1, -1, -1, -1, -1, 0, true)
    ON CONFLICT (user_id) DO UPDATE SET
      plano = 'premium',
      limite_trabalhos = -1,
      limite_resumos = -1,
      limite_questionarios = -1,
      limite_planos_aula = -1,
      limite_tfc = -1,
      creditos_totais = -1,
      suporte_prioritario = true;
  ELSE
    INSERT INTO public.user_plans (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
