import React from 'react';
import { Shield, Lock, FileText, ArrowLeft } from 'lucide-react';

interface LegalPagesProps {
  type: 'privacy' | 'terms';
  setCurrentTab: (tab: string) => void;
}

export const LegalPages: React.FC<LegalPagesProps> = ({ type, setCurrentTab }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 text-gray-800">
      <button
        onClick={() => setCurrentTab('home')}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </button>

      {type === 'privacy' ? (
        <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-12 shadow-xs space-y-6">
          <div className="border-b pb-4">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Data Protection</span>
            <h1 className="text-3xl font-extrabold text-gray-900 mt-1">Privacy Policy</h1>
            <p className="text-xs text-gray-500 mt-1">Effective Date: October 15, 2026 • Platform: JOEASSIST</p>
          </div>

          <section className="space-y-3 text-xs leading-relaxed text-gray-700">
            <h3 className="text-sm font-bold text-gray-900">1. Overview & Data Ownership</h3>
            <p>
              JOEASSIST ("we", "our", or "the Platform"), founded by Joseph Chiemezie, is committed to safeguarding your personal and professional documents. You retain full ownership of all resume details, contact information, work history, and financial invoice data entered into the platform.
            </p>

            <h3 className="text-sm font-bold text-gray-900">2. Information We Collect</h3>
            <p>
              We collect information you explicitly provide: your name, email address, phone number, employment history, academic credentials, and business invoice line items. We do not sell your personal data or document content to recruitment brokers or third-party advertising networks.
            </p>

            <h3 className="text-sm font-bold text-gray-900">3. Artificial Intelligence Processing</h3>
            <p>
              When you utilize Gemini AI features (such as CV drafting, summary rewriting, or ATS auditing), your supplied text is transmitted through server-side secure API proxies. Sensitive payment details and database passwords are never routed through AI models.
            </p>

            <h3 className="text-sm font-bold text-gray-900">4. Payment Information</h3>
            <p>
              Payments for Pro and Lifetime subscriptions are processed directly through Paystack. JOEASSIST does not store full credit card numbers or banking CVVs on our servers.
            </p>

            <h3 className="text-sm font-bold text-gray-900">5. Account Deletion & Rights</h3>
            <p>
              Users may request complete account and document deletion at any time by contacting our support desk at <a href="mailto:josepchiemezie@gmail.com" className="text-blue-600 underline">josepchiemezie@gmail.com</a> or calling 08039448648.
            </p>
          </section>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-12 shadow-xs space-y-6">
          <div className="border-b pb-4">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Platform Agreement</span>
            <h1 className="text-3xl font-extrabold text-gray-900 mt-1">Terms of Service</h1>
            <p className="text-xs text-gray-500 mt-1">Effective Date: October 15, 2026 • Founder: Joseph Chiemezie</p>
          </div>

          <section className="space-y-3 text-xs leading-relaxed text-gray-700">
            <h3 className="text-sm font-bold text-gray-900">1. Acceptance of Terms</h3>
            <p>
              By accessing JOEASSIST, creating an account, or generating documents, you agree to comply with these terms. If you disagree with any part, you may cease usage immediately.
            </p>

            <h3 className="text-sm font-bold text-gray-900">2. Truthful Career Representation</h3>
            <p>
              JOEASSIST provides language enhancement, formatting, and structural optimization. Users are solely responsible for ensuring that all credentials, employment tenures, academic degrees, and business claims entered are truthful and accurate.
            </p>

            <h3 className="text-sm font-bold text-gray-900">3. ATS Scores & Employment Disclaimers</h3>
            <p>
              The ATS compatibility score is an automated algorithmic structural estimate designed to highlight keyword frequency and formatting standards. An ATS score does not guarantee interview invitations, recruitment shortlisting, or job offers.
            </p>

            <h3 className="text-sm font-bold text-gray-900">4. Subscriptions & Refunds</h3>
            <p>
              Subscription pricing and one-time Lifetime Pro fees are billed in Nigerian Naira (NGN) via Paystack. Paid accounts enjoy watermark-free exports and elevated AI credits in accordance with the documented plan tier.
            </p>

            <h3 className="text-sm font-bold text-gray-900">5. Governing Law & Support</h3>
            <p>
              These Terms are governed by the laws of the Federal Republic of Nigeria. For any legal or billing inquiries, contact founder Joseph Chiemezie at 08039448648 or josepchiemezie@gmail.com.
            </p>
          </section>
        </div>
      )}
    </div>
  );
};
