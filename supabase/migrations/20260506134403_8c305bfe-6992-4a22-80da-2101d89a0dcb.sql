DROP POLICY IF EXISTS "Users can insert own plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can insert their own plan" ON public.user_plans;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_plans_user_id_unique'
  ) THEN
    ALTER TABLE public.user_plans ADD CONSTRAINT user_plans_user_id_unique UNIQUE (user_id);
  END IF;
END $$;