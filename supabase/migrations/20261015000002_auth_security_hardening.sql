-- JOEASSIST post-migration hardening: auth provisioning, profile protection, function search path.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- Create a normal user profile and default entitlements for every confirmed or
-- unconfirmed Supabase Auth account. Role and tier are never taken from metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
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

DROP TRIGGER IF EXISTS on_auth_user_created_joeassist ON auth.users;
CREATE TRIGGER on_auth_user_created_joeassist
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Keep account owners from changing privileged role/tier fields through profile updates.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id AND role = 'user')
  WITH CHECK (auth.uid() = id AND role = 'user');

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- User-owned profile/preferences policies must not accidentally grant anonymous access.
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can access own preferences" ON public.user_preferences;
CREATE POLICY "Users can access own preferences"
  ON public.user_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Support submissions are public by design, but reads and changes remain admin/user restricted.
DROP POLICY IF EXISTS "Anyone can submit support" ON public.support_requests;
CREATE POLICY "Anyone can submit support"
  ON public.support_requests FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
