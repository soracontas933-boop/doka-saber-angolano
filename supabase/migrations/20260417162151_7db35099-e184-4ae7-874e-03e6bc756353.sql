
-- 1. Atualizar planos existentes com novos totais de créditos
UPDATE public.user_plans SET creditos_totais = 50 WHERE plano = 'gratuito';
UPDATE public.user_plans SET creditos_totais = 120 WHERE plano = 'basico';
UPDATE public.user_plans SET creditos_totais = 300 WHERE plano = 'intermedio';
UPDATE public.user_plans SET creditos_totais = 500 WHERE plano = 'profissional';
UPDATE public.user_plans SET creditos_totais = -1 WHERE plano = 'premium';

-- 2. Atualizar default da coluna creditos_totais para 50 (novo gratuito)
ALTER TABLE public.user_plans ALTER COLUMN creditos_totais SET DEFAULT 50;

-- 3. Atualizar trigger handle_new_user_plan para gratuito = 50 créditos
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
      plano = 'premium', creditos_totais = -1, suporte_prioritario = true;
  ELSE
    INSERT INTO public.user_plans (user_id, plano, creditos_totais, creditos_usados)
    VALUES (NEW.id, 'gratuito', 50, 0)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Função consume_credits: desconta N créditos atomicamente, retorna boolean
CREATE OR REPLACE FUNCTION public.consume_credits(p_user_id uuid, p_amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total integer;
  v_used integer;
BEGIN
  SELECT creditos_totais, creditos_usados INTO v_total, v_used
  FROM public.user_plans WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN RETURN false; END IF;
  IF v_total = -1 THEN
    UPDATE public.user_plans SET creditos_usados = creditos_usados + p_amount, atualizado_em = now() WHERE user_id = p_user_id;
    RETURN true;
  END IF;
  IF (v_total - v_used) < p_amount THEN RETURN false; END IF;

  UPDATE public.user_plans SET creditos_usados = creditos_usados + p_amount, atualizado_em = now() WHERE user_id = p_user_id;
  RETURN true;
END;
$$;

-- 5. Função add_credits: aumenta o total de créditos (compra de pacotes extras)
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_plans
  SET creditos_totais = CASE WHEN creditos_totais = -1 THEN -1 ELSE creditos_totais + p_amount END,
      atualizado_em = now()
  WHERE user_id = p_user_id;
END;
$$;

-- 6. Tabela credit_packs (pacotes extras configuráveis)
CREATE TABLE IF NOT EXISTS public.credit_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  creditos integer NOT NULL,
  preco numeric NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Credit packs publicly readable" ON public.credit_packs FOR SELECT USING (true);
CREATE POLICY "Admin manages credit packs insert" ON public.credit_packs FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Admin manages credit packs update" ON public.credit_packs FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Admin manages credit packs delete" ON public.credit_packs FOR DELETE TO authenticated USING (is_admin());

INSERT INTO public.credit_packs (nome, creditos, preco, ordem) VALUES
  ('Pacote Pequeno', 100, 500, 1),
  ('Pacote Médio', 300, 1200, 2),
  ('Pacote Grande', 1000, 3500, 3)
ON CONFLICT DO NOTHING;
