-- Admin-managed uploaded HTML CV templates.
-- This migration is idempotent so it can also be replayed safely in a fresh environment.
CREATE TABLE IF NOT EXISTS public.custom_html_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  category text NOT NULL DEFAULT 'Professional' CHECK (char_length(category) BETWEEN 2 AND 60),
  description text NOT NULL DEFAULT '',
  html_content text NOT NULL CHECK (char_length(html_content) BETWEEN 20 AND 500000),
  is_premium boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_html_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active custom HTML templates are viewable" ON public.custom_html_templates;
DROP POLICY IF EXISTS "Active custom HTML templates are public" ON public.custom_html_templates;
DROP POLICY IF EXISTS "Active templates and admins can read HTML templates" ON public.custom_html_templates;
CREATE POLICY "Active custom HTML templates are public"
ON public.custom_html_templates FOR SELECT
TO anon
USING (is_active = true);
CREATE POLICY "Active templates and admins can read HTML templates"
ON public.custom_html_templates FOR SELECT
TO authenticated
USING (is_active = true OR private.is_admin());

DROP POLICY IF EXISTS "Admins manage custom HTML templates" ON public.custom_html_templates;
CREATE POLICY "Admins manage custom HTML templates"
ON public.custom_html_templates FOR ALL
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

GRANT SELECT ON public.custom_html_templates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.custom_html_templates TO authenticated;
