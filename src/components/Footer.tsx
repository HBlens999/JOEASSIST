import React from 'react';
import { Phone, Mail, MapPin, Heart, Shield, FileCheck, CheckCircle2 } from 'lucide-react';

interface FooterProps {
  setCurrentTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ setCurrentTab }) => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-14 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                JA
              </div>
              <span className="text-xl font-bold text-white tracking-tight">JOEASSIST</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complete AI-powered platform for executive CVs, career documents, business invoices, receipts, and proposals.
            </p>
            <div className="text-xs text-slate-400">
              <span className="font-semibold text-slate-200">Founder & Lead Engineer:</span>
              <p className="text-blue-400 font-medium">Joseph Chiemezie</p>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100 mb-3.5">Document Tools</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => setCurrentTab('templates')} className="hover:text-blue-400 transition">
                  30+ Distinct CV Templates
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('builder')} className="hover:text-blue-400 transition">
                  AI CV Builder
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('ats')} className="hover:text-blue-400 transition">
                  ATS Compatibility Checker
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('coverletter')} className="hover:text-blue-400 transition">
                  Cover Letter Generator
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('business')} className="hover:text-blue-400 transition">
                  Invoices, Receipts & Proposals
                </button>
              </li>
            </ul>
          </div>

          {/* Company & Support */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100 mb-3.5">Direct Support</h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-2 text-slate-300">
                <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <a href="tel:08039448648" className="hover:text-white transition font-mono">
                  08039448648
                </a>
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <a href="mailto:josepchiemezie@gmail.com" className="hover:text-white transition">
                  josepchiemezie@gmail.com
                </a>
              </li>
              <li>
                <button onClick={() => setCurrentTab('contact')} className="hover:text-blue-400 transition">
                  Contact Support Desk
                </button>
              </li>
              <li>
                <button onClick={() => setCurrentTab('about')} className="hover:text-blue-400 transition">
                  About Joseph Chiemezie & JOEASSIST
                </button>
              </li>
            </ul>
          </div>

          {/* Trust & Guarantees */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100 mb-3.5">Security & Compliance</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Supabase PostgreSQL with RLS</span>
              </div>
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Official Paystack Payment Gateway</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Selectable AI Models: Model 1 & Model 2</span>
              </div>
            </div>
            <div className="pt-2">
              <button 
                onClick={() => setCurrentTab('pricing')}
                className="w-full py-2 px-3 text-xs font-bold text-center bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
              >
                View Plans & Pricing
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-3">
          <p>
            © {new Date().getFullYear()} JOEASSIST. Founded by Joseph Chiemezie. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <button onClick={() => setCurrentTab('privacy')} className="hover:text-slate-300 transition">
              Privacy Policy
            </button>
            <button onClick={() => setCurrentTab('terms')} className="hover:text-slate-300 transition">
              Terms of Service
            </button>
            <button onClick={() => setCurrentTab('contact')} className="hover:text-slate-300 transition">
              Help & Support
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
