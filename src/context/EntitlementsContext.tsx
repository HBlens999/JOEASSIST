import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { UserEntitlement, PricingPlan } from '../types/auth';

export const DEFAULT_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free Starter',
    tagline: 'Ideal for graduates & entry-level job seekers creating their first CV',
    priceNGN: 0,
    billingPeriod: 'forever',
    features: [
      'Up to 2 Saved CVs',
      '5 AI generation credits / month',
      '2 Comprehensive ATS CV Audits',
      '3 Business Invoices / Receipts',
      'Access to standard CV templates',
      'Instant PDF export (with JOEASSIST watermark)',
      'Community support',
    ],
    limits: {
      maxCVs: 2,
      aiRequests: 5,
      atsAudits: 2,
      businessDocs: 3,
      premiumTemplates: false,
      watermarkFree: false,
      prioritySupport: false,
    },
  },
  {
    id: 'premium',
    name: 'Pro Career & Business',
    tagline: 'For active job seekers, freelancers, and small business owners',
    priceNGN: 4500,
    billingPeriod: 'per month',
    badge: 'Most Popular',
    features: [
      'Up to 25 Saved CVs',
      '150 AI generation & rewrite credits / month',
      '50 ATS Compatibility Audits with tailored keywords',
      '100 Business Invoices, Receipts & Proposals',
      'Unlock ALL 32+ Premium CV Templates',
      '100% Watermark-Free Crisp A4 PDF Downloads',
      'Multiple Cover Letter draft generation',
      'Priority Email & Phone Support (08039448648)',
    ],
    limits: {
      maxCVs: 25,
      aiRequests: 150,
      atsAudits: 50,
      businessDocs: 100,
      premiumTemplates: true,
      watermarkFree: true,
      prioritySupport: true,
    },
  },
  {
    id: 'lifetime',
    name: 'Lifetime Founder Pro',
    tagline: 'One-time investment for perpetual unlimited access to all present & future features',
    priceNGN: 18500,
    billingPeriod: 'one-time payment',
    badge: 'Best Value',
    features: [
      'UNLIMITED Saved CVs forever',
      'UNLIMITED AI CV rewrites & summaries',
      'UNLIMITED ATS Audits & Job matching scans',
      'UNLIMITED Invoices, Receipts, Proposals & Delivery Notes',
      'VIP access to the 7 original HTML templates upon release',
      'Watermark-free exports forever',
      'Direct WhatsApp & phone support with founder',
      'Early access to all future upgrades & tools',
    ],
    limits: {
      maxCVs: 999999,
      aiRequests: 999999,
      atsAudits: 999999,
      businessDocs: 999999,
      premiumTemplates: true,
      watermarkFree: true,
      prioritySupport: true,
    },
  },
];

interface EntitlementsContextType {
  plans: PricingPlan[];
  currentTier: 'free' | 'premium' | 'lifetime';
  entitlements: UserEntitlement;
  checkCanCreateCV: (currentCount: number) => boolean;
  checkCanUseAI: () => boolean;
  checkCanRunATS: () => boolean;
  checkCanCreateBusinessDoc: (currentCount: number) => boolean;
  canAccessTemplate: (isPremium: boolean) => boolean;
  isWatermarkFree: boolean;
  recordAIUsage: () => void;
  recordATSUsage: () => void;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (show: boolean) => void;
  upgradeModalReason: string;
  triggerUpgradePrompt: (reason: string) => void;
}

const EntitlementsContext = createContext<EntitlementsContextType | undefined>(undefined);

export const EntitlementsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const tier = user?.subscription_tier || 'free';

  const [aiUsageCount, setAiUsageCount] = useState<number>(() => {
    return Number(localStorage.getItem('joeassist_ai_used') || 0);
  });
  const [atsUsageCount, setAtsUsageCount] = useState<number>(() => {
    return Number(localStorage.getItem('joeassist_ats_used') || 0);
  });

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalReason, setUpgradeModalReason] = useState('');

  const currentPlan = DEFAULT_PLANS.find(p => p.id === tier) || DEFAULT_PLANS[0];

  const entitlements: UserEntitlement = {
    max_cvs: currentPlan.limits.maxCVs,
    ai_requests_limit: currentPlan.limits.aiRequests,
    ai_requests_used: aiUsageCount,
    ats_audits_limit: currentPlan.limits.atsAudits,
    ats_audits_used: atsUsageCount,
    business_docs_limit: currentPlan.limits.businessDocs,
    business_docs_used: 0,
    premium_templates_enabled: currentPlan.limits.premiumTemplates,
    watermark_free_export: currentPlan.limits.watermarkFree,
  };

  const triggerUpgradePrompt = (reason: string) => {
    setUpgradeModalReason(reason);
    setShowUpgradeModal(true);
  };

  const checkCanCreateCV = (currentCount: number) => {
    if (tier === 'lifetime') return true;
    if (currentCount >= currentPlan.limits.maxCVs) {
      triggerUpgradePrompt(`You have reached the ${currentPlan.limits.maxCVs} CV limit on the ${currentPlan.name}. Upgrade to create unlimited CVs.`);
      return false;
    }
    return true;
  };

  const checkCanUseAI = () => {
    if (tier === 'lifetime') return true;
    if (aiUsageCount >= currentPlan.limits.aiRequests) {
      triggerUpgradePrompt(`You have used your ${currentPlan.limits.aiRequests} monthly AI generation credits. Upgrade to Pro for 150+ credits or Lifetime Pro for unlimited AI.`);
      return false;
    }
    return true;
  };

  const checkCanRunATS = () => {
    if (tier === 'lifetime') return true;
    if (atsUsageCount >= currentPlan.limits.atsAudits) {
      triggerUpgradePrompt(`You have completed your ${currentPlan.limits.atsAudits} included ATS CV audits. Upgrade to unlock more in-depth scans.`);
      return false;
    }
    return true;
  };

  const checkCanCreateBusinessDoc = (currentCount: number) => {
    if (tier === 'lifetime') return true;
    if (currentCount >= currentPlan.limits.businessDocs) {
      triggerUpgradePrompt(`You have reached the ${currentPlan.limits.businessDocs} business documents limit. Upgrade to Pro to manage all your business paperwork.`);
      return false;
    }
    return true;
  };

  const canAccessTemplate = (isPremium: boolean) => {
    if (!isPremium) return true;
    if (tier === 'premium' || tier === 'lifetime') return true;
    return false;
  };

  const recordAIUsage = () => {
    setAiUsageCount(prev => {
      const next = prev + 1;
      localStorage.setItem('joeassist_ai_used', next.toString());
      return next;
    });
  };

  const recordATSUsage = () => {
    setAtsUsageCount(prev => {
      const next = prev + 1;
      localStorage.setItem('joeassist_ats_used', next.toString());
      return next;
    });
  };

  return (
    <EntitlementsContext.Provider
      value={{
        plans: DEFAULT_PLANS,
        currentTier: tier,
        entitlements,
        checkCanCreateCV,
        checkCanUseAI,
        checkCanRunATS,
        checkCanCreateBusinessDoc,
        canAccessTemplate,
        isWatermarkFree: currentPlan.limits.watermarkFree,
        recordAIUsage,
        recordATSUsage,
        showUpgradeModal,
        setShowUpgradeModal,
        upgradeModalReason,
        triggerUpgradePrompt,
      }}
    >
      {children}
    </EntitlementsContext.Provider>
  );
};

export const useEntitlements = () => {
  const context = useContext(EntitlementsContext);
  if (!context) throw new Error('useEntitlements must be used within EntitlementsProvider');
  return context;
};
