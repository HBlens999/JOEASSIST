export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  role: 'user' | 'admin' | 'moderator';
  subscription_tier: 'free' | 'premium' | 'lifetime';
  subscription_status: 'active' | 'past_due' | 'canceled' | 'expired';
  company_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  default_currency: string;
  default_paper_size: 'A4' | 'Letter';
  email_notifications: boolean;
}

export interface UserEntitlement {
  max_cvs: number;
  ai_requests_limit: number;
  ai_requests_used: number;
  ats_audits_limit: number;
  ats_audits_used: number;
  business_docs_limit: number;
  business_docs_used: number;
  premium_templates_enabled: boolean;
  watermark_free_export: boolean;
}

export interface PricingPlan {
  id: 'free' | 'premium' | 'lifetime';
  name: string;
  tagline: string;
  priceNGN: number;
  billingPeriod: 'forever' | 'per month' | 'one-time payment';
  badge?: string;
  features: string[];
  limits: {
    maxCVs: number;
    aiRequests: number;
    atsAudits: number;
    businessDocs: number;
    premiumTemplates: boolean;
    watermarkFree: boolean;
    prioritySupport: boolean;
  };
}
