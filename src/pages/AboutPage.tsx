import React from 'react';
import { Phone, Mail, Award, CheckCircle2, Heart, Shield, Sparkles } from 'lucide-react';

interface AboutPageProps {
  setCurrentTab: (tab: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ setCurrentTab }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
          The Story Behind JOEASSIST
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
          Democratizing Professional Career & Business Documents
        </h1>
        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Founded by Joseph Chiemezie to empower Nigerian students, graduates, job seekers, and entrepreneurs with world-class, AI-assisted tools.
        </p>
      </div>

      {/* Founder Profile Card */}
      <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm flex flex-col md:flex-row items-center gap-8">
        <div className="w-32 h-32 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-4xl shadow-xl shrink-0">
          JC
        </div>
        <div className="space-y-3 text-center md:text-left">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Founder & Lead Engineer</span>
          <h2 className="text-2xl font-bold text-gray-900">Joseph Chiemezie</h2>
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            "Throughout my career as a software engineer and mentor, I observed hundreds of talented candidates rejected by automated applicant tracking systems simply because their CV formatting failed algorithmic parsing. JOEASSIST was built to bridge this divide — providing 30+ meticulously engineered templates, ATS score transparency, and seamless business paperwork in one unified platform."
          </p>
          <div className="flex flex-wrap gap-4 pt-2 text-xs font-mono text-gray-700 justify-center md:justify-start">
            <span className="flex items-center gap-1.5 font-bold">
              <Phone className="w-4 h-4 text-blue-600" /> 08039448648
            </span>
            <span className="flex items-center gap-1.5 font-bold">
              <Mail className="w-4 h-4 text-blue-600" /> josepchiemezie@gmail.com
            </span>
          </div>
        </div>
      </div>

      {/* Core Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            01
          </div>
          <h3 className="font-bold text-gray-900 text-sm">Truth in AI</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Our AI model refines language and quantifies impact using real user facts. We never invent fake degrees or fictitious companies.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            02
          </div>
          <h3 className="font-bold text-gray-900 text-sm">Mobile & Android Friendly</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            Optimized for fast loading on cellular networks and modest smartphones across all 36 Nigerian states.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            03
          </div>
          <h3 className="font-bold text-gray-900 text-sm">Real Business Utility</h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            From verified invoices to signed delivery notes, small business owners can generate compliant paperwork without costly software.
          </p>
        </div>
      </div>

      {/* Direct Contact CTA */}
      <div className="text-center pt-4">
        <button
          onClick={() => setCurrentTab('contact')}
          className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          Contact Joseph Chiemezie & Support
        </button>
      </div>
    </div>
  );
};
