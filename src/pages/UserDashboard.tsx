import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEntitlements } from '../context/EntitlementsContext';
import { CVDocument } from '../types/cv';
import { 
  FileText, Plus, Trash2, Edit3, Copy, Download, User, 
  CreditCard, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, Phone, Mail 
} from 'lucide-react';

interface UserDashboardProps {
  setCurrentTab: (tab: string) => void;
  onEditCV: (cv: CVDocument) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ setCurrentTab, onEditCV }) => {
  const { user, signOut, updateProfile } = useAuth();
  const { entitlements, currentTier, triggerUpgradePrompt } = useEntitlements();

  const [activeTab, setActiveTab] = useState<'cvs' | 'business' | 'account'>('cvs');
  const [profileName, setProfileName] = useState(user?.full_name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileCompany, setProfileCompany] = useState(user?.company_name || '');
  const [profileSavedNotice, setProfileSavedNotice] = useState(false);

  // Active CVs stored locally / synced
  const [savedCVs, setSavedCVs] = useState<CVDocument[]>(() => {
    const active = localStorage.getItem('joeassist_active_cv');
    if (active) {
      try {
        return [JSON.parse(active)];
      } catch (e) {}
    }
    return [];
  });

  const handleDeleteCV = (id: string) => {
    if (confirm('Are you sure you want to delete this CV? This action cannot be undone.')) {
      setSavedCVs(prev => prev.filter(c => c.id !== id));
      localStorage.removeItem('joeassist_active_cv');
    }
  };

  const handleDuplicateCV = (cv: CVDocument) => {
    const dup: CVDocument = {
      ...cv,
      id: 'cv-' + Date.now(),
      title: `${cv.title} (Copy)`,
    };
    setSavedCVs(prev => [dup, ...prev]);
    localStorage.setItem('joeassist_active_cv', JSON.stringify(dup));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      full_name: profileName,
      phone: profilePhone,
      company_name: profileCompany,
    });
    setProfileSavedNotice(true);
    setTimeout(() => setProfileSavedNotice(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Welcome & Usage Bar */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Welcome back, {user?.full_name || 'Member'}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
              currentTier === 'lifetime' 
                ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                : currentTier === 'premium'
                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {currentTier === 'lifetime' ? '👑 Lifetime Pro' : currentTier === 'premium' ? '⚡ Pro Monthly' : 'Free Starter'}
            </span>
          </div>
          <p className="text-xs text-gray-500 font-mono">{user?.email}</p>
        </div>

        {/* Quick Create Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCurrentTab('builder')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" /> Create New CV
          </button>
          <button
            onClick={() => setCurrentTab('ats')}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition"
          >
            Run ATS Scan
          </button>
          <button
            onClick={() => setCurrentTab('business')}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition"
          >
            Create Invoice
          </button>
        </div>
      </div>

      {/* Usage Meters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Saved CVs',
            used: savedCVs.length,
            limit: entitlements.max_cvs,
            unit: 'CVs',
          },
          {
            label: 'AI Generation Credits',
            used: entitlements.ai_requests_used,
            limit: entitlements.ai_requests_limit,
            unit: 'credits',
          },
          {
            label: 'ATS Compatibility Audits',
            used: entitlements.ats_audits_used,
            limit: entitlements.ats_audits_limit,
            unit: 'scans',
          },
          {
            label: 'Business Documents',
            used: 1,
            limit: entitlements.business_docs_limit,
            unit: 'docs',
          },
        ].map((meter, i) => {
          const isUnlimited = meter.limit > 1000;
          const percent = isUnlimited ? 15 : Math.min(100, Math.round((meter.used / meter.limit) * 100));

          return (
            <div key={i} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-500 block mb-1">{meter.label}</span>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xl font-black text-gray-900">{meter.used}</span>
                <span className="text-xs text-gray-500">
                  / {isUnlimited ? 'Unlimited' : meter.limit} {meter.unit}
                </span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${percent > 85 ? 'bg-red-500' : 'bg-blue-600'}`} 
                  style={{ width: `${percent}%` }} 
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 gap-6 text-sm font-bold">
        {[
          { id: 'cvs', label: `My Saved CVs (${savedCVs.length})` },
          { id: 'business', label: 'Business Documents' },
          { id: 'account', label: 'Account & Profile' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`pb-3 font-bold transition border-b-2 ${
              activeTab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 1. CVs TAB */}
      {activeTab === 'cvs' && (
        <div className="space-y-4">
          {savedCVs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">No CVs Created Yet</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Start crafting your executive CV using our 30+ distinct templates or import your existing resume.
              </p>
              <button
                onClick={() => setCurrentTab('builder')}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Create Your First CV
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedCVs.map((cvDoc) => (
                <div
                  key={cvDoc.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900 text-base">{cvDoc.title}</h4>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {cvDoc.template_id.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">
                      {cvDoc.personal_info?.professionalTitle || 'Professional Role'} • {cvDoc.work_experience?.length || 0} jobs listed
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => {
                        onEditCV(cvDoc);
                        setCurrentTab('builder');
                      }}
                      className="flex-1 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDuplicateCV(cvDoc)}
                      className="p-2 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 border border-gray-200"
                      title="Duplicate CV"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCV(cvDoc.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 border border-gray-200"
                      title="Delete CV"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. BUSINESS DOCUMENTS TAB */}
      {activeTab === 'business' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Business Documents Repository</h3>
              <p className="text-xs text-gray-500">Invoices, receipts, proposals, and delivery notes</p>
            </div>
            <button
              onClick={() => setCurrentTab('business')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl"
            >
              Open Documents Center
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-xl border border-gray-200 flex justify-between items-center">
              <div>
                <span className="font-mono text-xs font-bold text-blue-600">INV-2026-0042</span>
                <p className="text-xs font-bold text-gray-900">Enterprise Cloud Architecture</p>
                <p className="text-[11px] text-gray-500">Horizon Digital Media • ₦657,250</p>
              </div>
              <button
                onClick={() => setCurrentTab('business')}
                className="text-xs text-blue-600 hover:underline font-bold"
              >
                View
              </button>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gray-200 flex justify-between items-center">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-600">REC-2026-0089</span>
                <p className="text-xs font-bold text-gray-900">Bank Transfer Receipt</p>
                <p className="text-[11px] text-gray-500">Confirmed Paid • ₦200,000</p>
              </div>
              <button
                onClick={() => setCurrentTab('business')}
                className="text-xs text-blue-600 hover:underline font-bold"
              >
                View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ACCOUNT SETTINGS TAB */}
      {activeTab === 'account' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 max-w-2xl space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-bold text-gray-900 text-base">Profile & Organization Settings</h3>
            <p className="text-xs text-gray-500">Manage your contact details and business name</p>
          </div>

          {profileSavedNotice && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-semibold text-center">
              Profile updated successfully!
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-gray-700 uppercase block mb-1">Full Legal Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full p-2.5 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 uppercase block mb-1">Email Address</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full p-2.5 border rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 uppercase block mb-1">Phone Number</label>
              <input
                type="text"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="e.g. 08039448648"
                className="w-full p-2.5 border rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 uppercase block mb-1">Company / Organization Name</label>
              <input
                type="text"
                value={profileCompany}
                onChange={(e) => setProfileCompany(e.target.value)}
                placeholder="e.g. JOEASSIST Enterprises"
                className="w-full p-2.5 border rounded-xl"
              />
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => signOut()}
                className="text-xs text-red-600 hover:underline font-bold"
              >
                Sign Out of Account
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
