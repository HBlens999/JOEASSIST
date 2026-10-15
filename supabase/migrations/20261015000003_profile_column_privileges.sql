-- JOEASSIST privilege hardening: users must never grant themselves paid access.
REVOKE UPDATE ON TABLE public.profiles FROM anon, authenticated;
GRANT UPDATE (full_name, phone, avatar_url, company_name, updated_at)
  ON TABLE public.profiles TO authenticated;

-- Restrict privileged admin policies to authenticated sessions.
-- Public-facing reads remain available through their explicit public policies.
