
-- 1. payment_settings: hide webhook_secret from non-admins
DROP POLICY IF EXISTS "Anyone can read payment settings" ON public.payment_settings;
CREATE POLICY "Read non-secret payment settings"
  ON public.payment_settings FOR SELECT TO authenticated
  USING (chave <> 'webhook_secret' OR public.is_admin());

-- 2. usage_logs: restrict insert/select to authenticated only (was public)
DROP POLICY IF EXISTS "Users can insert their own usage logs" ON public.usage_logs;
DROP POLICY IF EXISTS "Users can view their own usage logs" ON public.usage_logs;
CREATE POLICY "Users can insert their own usage logs"
  ON public.usage_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own usage logs"
  ON public.usage_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 3. user_plans: ensure no client-side mutations possible (revoke any lingering policies)
DROP POLICY IF EXISTS "Users can insert own plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can insert their own plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can update own plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can update their own plan" ON public.user_plans;

-- 4. Realtime authorization: restrict realtime.messages so only authenticated users can subscribe
--    and rely on postgres_changes RLS-on-source-table for row visibility.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='realtime' AND c.relname='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can read realtime messages" ON realtime.messages';
    EXECUTE 'CREATE POLICY "Authenticated can read realtime messages" ON realtime.messages FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;
