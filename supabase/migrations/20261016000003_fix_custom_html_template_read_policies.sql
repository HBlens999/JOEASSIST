-- Ensure anonymous users can read published templates without needing admin helper permissions.
DROP POLICY IF EXISTS "Active custom HTML templates are viewable" ON public.custom_html_templates;
DROP POLICY IF EXISTS "Active custom HTML templates are public" ON public.custom_html_templates;
DROP POLICY IF EXISTS "Active templates and admins can read HTML templates" ON public.custom_html_templates;
CREATE POLICY "Active custom HTML templates are public"
ON public.custom_html_templates FOR SELECT TO anon
USING (is_active = true);
CREATE POLICY "Active templates and admins can read HTML templates"
ON public.custom_html_templates FOR SELECT TO authenticated
USING (is_active = true OR private.is_admin());