-- ==============================================================================
-- JOEASSIST COMPLETE POSTGRESQL SCHEMA MIGRATION
-- Project: JOEASSIST - AI-Powered CV & Business Document Platform
-- Founder: Joseph Chiemezie
-- Supabase Project: https://ooalsbdkknznrnldrypd.supabase.co
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. PROFILES & ROLES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'lifetime')),
    subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'expired')),
    company_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Helper to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 2. USER PREFERENCES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    theme TEXT DEFAULT 'light',
    default_currency TEXT DEFAULT 'NGN',
    default_paper_size TEXT DEFAULT 'A4',
    email_notifications BOOLEAN DEFAULT true,
    marketing_emails BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. CV TEMPLATES (System & Custom Registry)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cv_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    is_premium BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    layout_type TEXT NOT NULL DEFAULT 'single_column',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4. CV DOCUMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cv_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled CV',
    template_id TEXT NOT NULL DEFAULT 'modern_minimalist',
    personal_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary TEXT,
    career_objective TEXT,
    work_experience JSONB NOT NULL DEFAULT '[]'::jsonb,
    education JSONB NOT NULL DEFAULT '[]'::jsonb,
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    projects JSONB NOT NULL DEFAULT '[]'::jsonb,
    certifications JSONB NOT NULL DEFAULT '[]'::jsonb,
    awards JSONB NOT NULL DEFAULT '[]'::jsonb,
    volunteer_experience JSONB NOT NULL DEFAULT '[]'::jsonb,
    publications JSONB NOT NULL DEFAULT '[]'::jsonb,
    languages JSONB NOT NULL DEFAULT '[]'::jsonb,
    "references" JSONB NOT NULL DEFAULT '[]'::jsonb,
    custom_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    section_order JSONB NOT NULL DEFAULT '["summary","experience","education","skills","projects","certifications","languages","awards","volunteer","publications","references"]'::jsonb,
    styling JSONB NOT NULL DEFAULT '{"fontFamily":"inter","primaryColor":"#1e3a8a","spacing":"normal","fontSize":"medium"}'::jsonb,
    is_public BOOLEAN DEFAULT false,
    share_slug TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cv_documents_user ON public.cv_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_cv_documents_updated ON public.cv_documents(updated_at DESC);

-- ------------------------------------------------------------------------------
-- 5. CV VERSIONS (Autosave & History)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cv_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cv_id UUID NOT NULL REFERENCES public.cv_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    snapshot JSONB NOT NULL,
    change_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cv_versions_cv ON public.cv_versions(cv_id);

-- ------------------------------------------------------------------------------
-- 6. COVER LETTERS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cover_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cv_id UUID REFERENCES public.cv_documents(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'Untitled Cover Letter',
    target_job_title TEXT NOT NULL,
    company_name TEXT NOT NULL,
    hiring_manager_name TEXT,
    job_description TEXT,
    tone TEXT DEFAULT 'confident_professional',
    length TEXT DEFAULT 'medium',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cover_letters_user ON public.cover_letters(user_id);

-- ------------------------------------------------------------------------------
-- 7. ATS AUDITS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ats_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cv_id UUID REFERENCES public.cv_documents(id) ON DELETE SET NULL,
    target_job_title TEXT NOT NULL,
    job_description TEXT NOT NULL,
    overall_score INT NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    keyword_score INT NOT NULL,
    experience_score INT NOT NULL,
    education_score INT NOT NULL,
    formatting_score INT NOT NULL,
    matched_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    tailored_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ats_audits_user ON public.ats_audits(user_id);

-- ------------------------------------------------------------------------------
-- 8. BUSINESS INVOICES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    sender JSONB NOT NULL,
    recipient JSONB NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    tax_rate NUMERIC(5, 2) DEFAULT 0,
    tax_amount NUMERIC(15, 2) DEFAULT 0,
    discount_amount NUMERIC(15, 2) DEFAULT 0,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0,
    balance_due NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'NGN',
    payment_terms TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON public.invoices(user_id);

-- ------------------------------------------------------------------------------
-- 9. BUSINESS RECEIPTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    receipt_number TEXT NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payer JSONB NOT NULL,
    recipient JSONB NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
    transaction_ref TEXT,
    description TEXT NOT NULL,
    amount_paid NUMERIC(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'NGN',
    balance_remaining NUMERIC(15, 2) DEFAULT 0,
    is_platform_verified BOOLEAN NOT NULL DEFAULT false,
    authorized_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_user ON public.receipts(user_id);

-- ------------------------------------------------------------------------------
-- 10. BUSINESS PROPOSALS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    proposal_number TEXT NOT NULL,
    title TEXT NOT NULL,
    sender JSONB NOT NULL,
    client JSONB NOT NULL,
    executive_summary TEXT,
    client_needs TEXT,
    proposed_solution TEXT,
    deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
    timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
    pricing_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_budget NUMERIC(15, 2) DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'NGN',
    terms_and_conditions TEXT,
    assumptions_exclusions TEXT,
    signature_name TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposals_user ON public.proposals(user_id);

-- ------------------------------------------------------------------------------
-- 11. DELIVERY NOTES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    delivery_note_number TEXT NOT NULL,
    order_ref TEXT,
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sender JSONB NOT NULL,
    recipient JSONB NOT NULL,
    delivery_address TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    delivery_instructions TEXT,
    received_by_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'returned')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_notes_user ON public.delivery_notes(user_id);

-- ------------------------------------------------------------------------------
-- 12. SUBSCRIPTIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier IN ('free', 'premium', 'lifetime')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'expired')),
    paystack_customer_code TEXT,
    paystack_subscription_code TEXT,
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_period_end TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);

-- ------------------------------------------------------------------------------
-- 13. PAYMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reference TEXT NOT NULL UNIQUE,
    amount NUMERIC(15, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'NGN',
    plan_tier TEXT NOT NULL CHECK (plan_tier IN ('premium', 'lifetime')),
    channel TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'abandoned')),
    paystack_tx_id TEXT,
    paid_at TIMESTAMPTZ,
    raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(reference);

-- ------------------------------------------------------------------------------
-- 14. PAYMENT WEBHOOK EVENTS (Idempotency)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE,
    event_type TEXT NOT NULL,
    reference TEXT,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'processed'
);

-- ------------------------------------------------------------------------------
-- 15. USER ENTITLEMENTS & LIMITS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    max_cvs INT NOT NULL DEFAULT 2,
    ai_requests_limit INT NOT NULL DEFAULT 5,
    ats_audits_limit INT NOT NULL DEFAULT 2,
    business_docs_limit INT NOT NULL DEFAULT 3,
    premium_templates_enabled BOOLEAN NOT NULL DEFAULT false,
    watermark_free_export BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 16. AI USAGE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    tokens_prompt INT DEFAULT 0,
    tokens_response INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'success',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON public.ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_feature ON public.ai_usage(feature);

-- ------------------------------------------------------------------------------
-- 17. USAGE LIMITS CONFIGURATION (Global)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usage_limits (
    tier TEXT PRIMARY KEY CHECK (tier IN ('free', 'premium', 'lifetime')),
    max_cvs INT NOT NULL,
    ai_requests_per_month INT NOT NULL,
    ats_audits_per_month INT NOT NULL,
    business_docs_per_month INT NOT NULL,
    price_ngn NUMERIC(15, 2) NOT NULL,
    billing_period TEXT NOT NULL DEFAULT 'monthly',
    premium_templates BOOLEAN NOT NULL DEFAULT false,
    watermark_free_export BOOLEAN NOT NULL DEFAULT false,
    priority_support BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default usage limits
INSERT INTO public.usage_limits (tier, max_cvs, ai_requests_per_month, ats_audits_per_month, business_docs_per_month, price_ngn, billing_period, premium_templates, watermark_free_export, priority_support)
VALUES
('free', 2, 5, 2, 3, 0, 'none', false, false, false),
('premium', 25, 150, 50, 100, 4500, 'monthly', true, true, true),
('lifetime', 9999, 9999, 9999, 9999, 18500, 'lifetime', true, true, true)
ON CONFLICT (tier) DO UPDATE SET
price_ngn = EXCLUDED.price_ngn,
updated_at = now();

-- ------------------------------------------------------------------------------
-- 18. ADMIN SETTINGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default admin settings
INSERT INTO public.admin_settings (key, value, description)
VALUES
('platform_info', '{"appName": "JOEASSIST", "founder": "Joseph Chiemezie", "phone": "08039448648", "email": "josepchiemezie@gmail.com"}'::jsonb, 'Platform identity and support details'),
('paystack_config', '{"liveMode": false, "currency": "NGN"}'::jsonb, 'Payment settings'),
('maintenance_mode', '{"enabled": false, "notice": ""}'::jsonb, 'System maintenance flag')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 19. SUPPORT REQUESTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    admin_response TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_requests_status ON public.support_requests(status);

-- ------------------------------------------------------------------------------
-- 20. AUDIT LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cv_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ats_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id AND role = 'user');
CREATE POLICY "Admins can update any profile" ON public.profiles FOR ALL USING (public.is_admin());

-- 2. User Preferences
CREATE POLICY "Users can access own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

-- 3. CV Templates (Public read, admin write)
CREATE POLICY "Anyone can view active templates" ON public.cv_templates FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins can manage templates" ON public.cv_templates FOR ALL USING (public.is_admin());

-- 4. CV Documents
CREATE POLICY "Users manage own CVs" ON public.cv_documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Public CVs viewable by slug" ON public.cv_documents FOR SELECT USING (is_public = true);

-- 5. CV Versions
CREATE POLICY "Users manage own CV versions" ON public.cv_versions FOR ALL USING (auth.uid() = user_id);

-- 6. Cover Letters
CREATE POLICY "Users manage own cover letters" ON public.cover_letters FOR ALL USING (auth.uid() = user_id);

-- 7. ATS Audits
CREATE POLICY "Users manage own ATS audits" ON public.ats_audits FOR ALL USING (auth.uid() = user_id);

-- 8. Invoices
CREATE POLICY "Users manage own invoices" ON public.invoices FOR ALL USING (auth.uid() = user_id);

-- 9. Receipts
CREATE POLICY "Users manage own receipts" ON public.receipts FOR ALL USING (auth.uid() = user_id);

-- 10. Proposals
CREATE POLICY "Users manage own proposals" ON public.proposals FOR ALL USING (auth.uid() = user_id);

-- 11. Delivery Notes
CREATE POLICY "Users manage own delivery notes" ON public.delivery_notes FOR ALL USING (auth.uid() = user_id);

-- 12. Subscriptions
CREATE POLICY "Users view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions FOR ALL USING (public.is_admin());

-- 13. Payments
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL USING (public.is_admin());

-- 14. Webhook events (Admin only)
CREATE POLICY "Admin webhook view" ON public.payment_webhook_events FOR SELECT USING (public.is_admin());

-- 15. User entitlements
CREATE POLICY "Users view own entitlements" ON public.user_entitlements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage entitlements" ON public.user_entitlements FOR ALL USING (public.is_admin());

-- 16. AI Usage
CREATE POLICY "Users view own AI usage" ON public.ai_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all AI usage" ON public.ai_usage FOR ALL USING (public.is_admin());

-- 17. Usage Limits (Public read, admin write)
CREATE POLICY "Anyone view usage limits" ON public.usage_limits FOR SELECT USING (true);
CREATE POLICY "Admins manage usage limits" ON public.usage_limits FOR ALL USING (public.is_admin());

-- 18. Admin Settings
CREATE POLICY "Anyone view public settings" ON public.admin_settings FOR SELECT USING (key = 'platform_info');
CREATE POLICY "Admins manage all settings" ON public.admin_settings FOR ALL USING (public.is_admin());

-- 19. Support Requests
CREATE POLICY "Anyone can submit support" ON public.support_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Users view own support" ON public.support_requests FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "Admins manage support" ON public.support_requests FOR ALL USING (public.is_admin());

-- 20. Audit Logs
CREATE POLICY "Admins view audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin());
