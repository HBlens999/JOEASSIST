import React, { useState } from 'react';
import { useEntitlements } from '../context/EntitlementsContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { X, Check, ShieldCheck, Zap, Sparkles } from 'lucide-react';

export const UpgradeModal: React.FC = () => {
  const { showUpgradeModal, setShowUpgradeModal, upgradeModalReason, plans } = useEntitlements();
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState<'premium' | 'lifetime'>('premium');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!showUpgradeModal) return null;

  const handlePaystackCheckout = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    setSuccessNotice('');

    const plan = plans.find(p => p.id === selectedTier);
    if (!plan) return;

    try {
      if (!user) {
        setErrorMessage('Please sign in before purchasing a plan.');
        setIsProcessing(false);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setErrorMessage('Your session has expired. Please sign in again.');
        setIsProcessing(false);
        return;
      }
      // The server validates this authenticated account and the configured plan price.
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          email: user.email,
          amount: plan.priceNGN,
          planTier: selectedTier,
          callbackUrl: window.location.href,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If Paystack is not yet configured with live keys in server environment, provide a transparent, clear notification
        if (data.error === 'PAYSTACK_NOT_CONFIGURED') {
          setErrorMessage('Paystack is not configured yet. No plan has been activated. Please try again later.');
        } else {
          setErrorMessage(data.error || 'Payment initialization failed.');
        }
        setIsProcessing(false);
        return;
      }

      // If live authorization URL is returned, redirect to Paystack
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (err: any) {
      setErrorMessage('Could not connect to payment server. Check network connection.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative border border-gray-100 max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setShowUpgradeModal(false)}
          className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-blue-50 text-blue-700 rounded-2xl mb-3">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Unlock JOEASSIST Pro</h2>
          {upgradeModalReason && (
            <p className="text-sm text-amber-800 bg-amber-50 p-2.5 rounded-lg mt-2 border border-amber-200">
              {upgradeModalReason}
            </p>
          )}
        </div>

        {errorMessage && (
          <div className="p-3 mb-4 text-xs bg-red-50 text-red-700 rounded-lg border border-red-200">
            {errorMessage}
          </div>
        )}

        {/* Plan Selection */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {plans.filter(p => p.id !== 'free').map((plan) => {
            const isSelected = selectedTier === plan.id;
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedTier(plan.id as any)}
                className={`cursor-pointer rounded-xl p-5 border-2 transition-all relative ${
                  isSelected 
                    ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-600/20' 
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-2.5 right-4 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                    {plan.badge}
                  </span>
                )}
                <h3 className="font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-2 mb-3">
                  <span className="text-2xl font-extrabold text-gray-900">₦{plan.priceNGN.toLocaleString()}</span>
                  <span className="text-xs text-gray-500 ml-1">/{plan.billingPeriod}</span>
                </div>
                <p className="text-xs text-gray-600 mb-4">{plan.tagline}</p>
                <ul className="space-y-1.5 text-xs text-gray-700">
                  {plan.features.slice(0, 4).map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Checkout Button */}
        <div className="space-y-3">
          <button
            onClick={handlePaystackCheckout}
            disabled={isProcessing}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <ShieldCheck className="w-5 h-5" />
            {isProcessing ? 'Connecting to Paystack...' : `Pay ₦${plans.find(p => p.id === selectedTier)?.priceNGN.toLocaleString()} with Paystack`}
          </button>

        </div>

        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-gray-400">
          <span>Secured by Paystack 256-bit SSL</span>
          <span>•</span>
          <span>Instant Activation</span>
          <span>•</span>
          <span>Cancel anytime</span>
        </div>
      </div>
    </div>
  );
};
