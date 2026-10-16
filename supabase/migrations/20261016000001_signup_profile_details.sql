-- JOEASSIST signup profile fields and confirmation redirect support.
-- Safe additive migration: existing accounts and profile records are preserved.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

UPDATE public.profiles
SET first_name = COALESCE(NULLIF(first_name, ''), NULLIF(split_part(BTRIM(COALESCE(full_name, '')), ' ', 1), '')),
    last_name = COALESCE(NULLIF(last_name, ''), NULLIF(BTRIM(regexp_replace(BTRIM(COALESCE(full_name, '')), '^\S+\s*', '')), ''))
WHERE first_name IS NULL OR last_name IS NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  meta_first_name TEXT := NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data ->> 'first_name', '')), '');
  meta_last_name TEXT := NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data ->> 'last_name', '')), '');
  meta_full_name TEXT := NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')), '');
  meta_phone TEXT := NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data ->> 'phone', '')), '');
BEGIN
  IF meta_full_name IS NULL THEN
    meta_full_name := NULLIF(BTRIM(CONCAT_WS(' ', meta_first_name, meta_last_name)), '');
  END IF;

  INSERT INTO public.profiles
    (id, email, first_name, last_name, full_name, phone, role, subscription_tier, subscription_status)
  VALUES
    (NEW.id, COALESCE(NEW.email, ''), meta_first_name, meta_last_name, meta_full_name, meta_phone, 'user', 'free', 'active')
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        first_name = COALESCE(public.profiles.first_name, EXCLUDED.first_name),
        last_name = COALESCE(public.profiles.last_name, EXCLUDED.last_name),
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
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
