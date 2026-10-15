-- Move SECURITY DEFINER helpers out of PostgREST's exposed public schema.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

-- Recreate the profile provisioning trigger helper in the non-exposed schema.
DROP TRIGGER IF EXISTS on_auth_user_created_joeassist ON auth.users;
CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, subscription_tier, subscription_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')), ''),
    'user',
    'free',
    'active'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        updated_at = now();

  INSERT INTO public.user_entitlements
    (user_id, max_cvs, ai_requests_limit, ats_audits_limit, business_docs_limit,
     premium_templates_enabled, watermark_free_export)
  SELECT NEW.id, ul.max_cvs, ul.ai_requests_per_month, ul.ats_audits_per_month,
         ul.business_docs_per_month, ul.premium_templates, ul.watermark_free_export
  FROM public.usage_limits ul
  WHERE ul.tier = 'free'
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created_joeassist
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();

-- Drop the last policy dependency before removing the old public helper.
DROP POLICY IF EXISTS "Users view own support" ON public.support_requests;

-- Remove old public-schema helper endpoints.
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.is_admin();

-- All admin-only policies now explicitly require an authenticated session.
DROP POLICY IF EXISTS "Admins can manage templates" ON public.cv_templates;
CREATE POLICY "Admins can manage templates" ON public.cv_templates
  FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Anyone can view active templates" ON public.cv_templates;
CREATE POLICY "Anyone can view active templates" ON public.cv_templates
  FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id OR private.is_admin());

DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.subscriptions;
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions
  FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins manage payments" ON public.payments;
CREATE POLICY "Admins manage payments" ON public.payments
  FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admin webhook view" ON public.payment_webhook_events;
CREATE POLICY "Admin webhook view" ON public.payment_webhook_events
  FOR SELECT TO authenticated USING (private.is_admin());

DROP POLICY IF EXISTS "Admins manage entitlements" ON public.user_entitlements;
CREATE POLICY "Admins manage entitlements" ON public.user_entitlements
  FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins view all AI usage" ON public.ai_usage;
CREATE POLICY "Admins view all AI usage" ON public.ai_usage
  FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins manage usage limits" ON public.usage_limits;
CREATE POLICY "Admins manage usage limits" ON public.usage_limits
  FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins manage all settings" ON public.admin_settings;
CREATE POLICY "Admins manage all settings" ON public.admin_settings
  FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE POLICY "Users view own support" ON public.support_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.is_admin());

DROP POLICY IF EXISTS "Admins manage support" ON public.support_requests;
CREATE POLICY "Admins manage support" ON public.support_requests
  FOR ALL TO authenticated USING (private.is_admin()) WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Admins view audit logs" ON public.audit_logs;
CREATE POLICY "Admins view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (private.is_admin());

-- Public callers must not execute either legacy SECURITY DEFINER helper.
