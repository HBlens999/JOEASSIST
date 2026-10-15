import React, { useState } from 'react';
import { useEntitlements } from '../context/EntitlementsContext';
import { useAuth } from '../context/AuthContext';
import { Check, ShieldCheck, Zap, Sparkles, HelpCircle, Phone } from 'lucide-react';

interface PricingPageProps {
  setCurrentTab: (tab: string) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ setCurrentTab }) => {
  const { plans, currentTier } = useEntitlements();
  const { user, updateProfile } = useAuth();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleCheckout = async (planId: 'premium' | 'lifetime', price: number) => {
    setIsProcessing(planId);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email || 'customer@joeassist.com',
          amount: price,
          planTier: planId,
          callbackUrl: window.location.href,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'PAYSTACK_NOT_CONFIGURED') {
          setErrorMessage('Notice: Paystack live keys are currently not configured in server environment. For development evaluation, you can activate Demo Pro below.');
        } else {
          setErrorMessage(data.error || 'Payment initialization failed.');
        }
        setIsProcessing(null);
        return;
      }

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch {
      setErrorMessage('Could not connect to payment server. Check connection.');
      setIsProcessing(null);
    }
  };

  const handleDemoActivate = async (planId: 'premium' | 'lifetime') => {
    await updateProfile({
      subscription_tier: planId,
      subscription_status: 'active',
    });
    setStatusMessage(`Successfully activated ${planId === 'lifetime' ? 'Lifetime Pro' : 'Monthly Pro'} plan in sandbox mode!`);
    setTimeout(() => setStatusMessage(''), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Title */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
          Transparent, Fair Pricing
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
          Invest in Your Career & Business
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          No hidden charges. Verified Nigerian payments processed securely through Paystack. 
          Cancel anytime or grab Lifetime access for perpetual peace of mind.
        </p>
      </div>

      {statusMessage && (
        <div className="max-w-2xl mx-auto p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-center text-xs font-bold">
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="max-w-2xl mx-auto p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-center text-xs">
          {errorMessage}
        </div>
      )}

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
        {plans.map((plan) => {
          const isCurrent = currentTier === plan.id;
          const isPopular = plan.id === 'premium';
          const isLifetime = plan.id === 'lifetime';

          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 relative ${
                isPopular
                  ? 'bg-white border-2 border-blue-600 shadow-2xl shadow-blue-600/10 scale-105 z-10'
                  : isLifetime
                  ? 'bg-linear-to-b from-amber-50/50 to-white border border-amber-300 shadow-xl'
                  : 'bg-white border border-gray-200 shadow-sm'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm">
                  {plan.badge}
                </span>
              )}

              <div>
                <h3 className="font-extrabold text-xl text-gray-900">{plan.name}</h3>
                <p className="text-xs text-gray-500 mt-1 min-h-[32px]">{plan.tagline}</p>

                <div className="mt-4 mb-6">
                  <span className="text-4xl font-black text-gray-900">
                    ₦{plan.priceNGN.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500 ml-1.5 font-semibold">
                    /{plan.billingPeriod}
                  </span>
                </div>

                <div className="border-t border-gray-100 pt-6 space-y-3">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                    What's included:
                  </span>
                  <ul className="space-y-2.5 text-xs text-gray-700">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-8 space-y-2">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 bg-gray-100 text-gray-500 font-bold text-xs rounded-xl cursor-default"
                  >
                    Current Active Plan
                  </button>
                ) : plan.id === 'free' ? (
                  <button
                    onClick={() => setCurrentTab('builder')}
                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition"
                  >
                    Start Free
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.id as any, plan.priceNGN)}
                    disabled={isProcessing === plan.id}
                    className={`w-full py-3.5 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50 ${
                      isPopular
                        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
                        : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {isProcessing === plan.id
                      ? 'Connecting to Paystack...'
                      : `Pay ₦${plan.priceNGN.toLocaleString()} with Paystack`}
                  </button>
                )}

                {/* Sandbox / Testing Activator */}
                {plan.id !== 'free' && (
                  <button
                    onClick={() => handleDemoActivate(plan.id as any)}
                    className="w-full text-center text-[10px] text-gray-400 hover:text-blue-600 underline font-medium pt-1"
                  >
                    Test Sandbox Instant Upgrade
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Support assistance notice */}
      <div className="max-w-3xl mx-auto bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center space-y-2">
        <h4 className="font-bold text-blue-900 text-sm">Need help or bank transfer verification?</h4>
        <p className="text-xs text-blue-800">
          If you prefer direct corporate bank transfer or need custom team invoicing, contact founder Joseph Chiemezie directly.
        </p>
        <p className="text-xs font-mono font-bold text-blue-900">
          Phone: 08039448648 • Email: josepchiemezie@gmail.com
        </p>
      </div>
    </div>
  );
};
