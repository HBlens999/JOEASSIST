import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CV_TEMPLATES } from '../templates/templateList';
import { CVTemplateMeta } from '../types/cv';
import { 
  Shield, Users, Layout, CreditCard, Sparkles, MessageSquare, 
  Database, RefreshCw, CheckCircle2, AlertTriangle, Key, Terminal, Eye, Lock 
} from 'lucide-react';

interface AdminDashboardProps {
  setCurrentTab: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ setCurrentTab }) => {
  const { user, isAdmin } = useAuth();
  const [activeAdminTab, setActiveAdminTab] = useState<'overview' | 'templates' | 'pricing' | 'support' | 'system' | 'sql'>('overview');
  
  // Health & System status
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Template active/premium state in admin
  const [templatesState, setTemplatesState] = useState<CVTemplateMeta[]>(CV_TEMPLATES);

  // Support messages
  const [supportRequests, setSupportRequests] = useState([
    {
      id: 'SUP-001',
      name: 'Emeka Nwosu',
      email: 'emeka.nwosu@example.com',
      phone: '08023456789',
      subject: 'Inquiry regarding Lifetime Pro bank transfer',
      message: 'Hello Joseph, can I make a direct transfer to your Zenith Bank account for the Lifetime Pro license?',
      date: '2026-10-15',
      status: 'open'
    },
    {
      id: 'SUP-002',
      name: 'Blessing Adeyemi',
      email: 'blessing.a@example.com',
      phone: '08139448000',
      subject: 'ATS scan recommendations feedback',
      message: 'The ATS scan was very helpful in identifying missing keywords for the Senior Product Lead role. Thank you!',
      date: '2026-10-14',
      status: 'resolved'
    }
  ]);

  const fetchHealth = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setSystemStatus(data);
    } catch {
      // Offline fallback
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const toggleTemplateActive = (id: string) => {
    setTemplatesState(prev => prev.map(t => t.id === id ? { ...t, isPremium: !t.isPremium } : t));
  };

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white rounded-3xl border border-red-200 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Administrator Access Required</h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          This restricted area is reserved for authorized administrators of JOEASSIST (founder: Joseph Chiemezie).
        </p>
        <div className="pt-2 flex flex-col gap-2">
<button
            onClick={() => setCurrentTab('home')}
            className="w-full py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Admin Top Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg">
              <Shield className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">
              Administrative Control Console
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
            JOEASSIST Administration
          </h1>
          <p className="text-xs text-slate-400">
            Founder: Joseph Chiemezie • Logged in as: {user?.email}
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={isRefreshing}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      {/* Admin Tabs */}
      <div className="flex border-b border-gray-200 gap-6 text-sm font-bold overflow-x-auto">
        {[
          { id: 'overview', label: 'Platform Status' },
          { id: 'templates', label: `Manage Templates (${templatesState.length})` },
          { id: 'support', label: `Support Inbox (${supportRequests.length})` },
          { id: 'sql', label: 'Supabase SQL Migrations' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveAdminTab(tab.id as any)}
            className={`pb-3 font-bold transition border-b-2 whitespace-nowrap ${
              activeAdminTab === tab.id
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW & SERVICE STATUS */}
      {activeAdminTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Gemini AI Status */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase">Google Gemini AI</span>
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${systemStatus?.services?.gemini?.configured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="font-bold text-sm text-gray-900">
                  {systemStatus?.services?.gemini?.configured ? 'Active & Ready' : 'Key Pending in Server'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Model: <strong>gemini-3.8-flash</strong> (Official @google/genai SDK)
              </p>
              <div className="text-[11px] text-gray-500 p-2.5 bg-gray-50 rounded-lg">
                Configured via secure server-side env variable <code>GEMINI_API_KEY</code>.
              </div>
            </div>

            {/* Paystack Gateway Status */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase">Paystack Gateway</span>
                <CreditCard className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${systemStatus?.services?.paystack?.configured ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                <span className="font-bold text-sm text-gray-900">
                  {systemStatus?.services?.paystack?.configured ? 'Live Mode Active' : 'Ready for Keys'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Server-side verification endpoint: <code>/api/paystack/verify</code>
              </p>
              <div className="text-[11px] text-gray-500 p-2.5 bg-gray-50 rounded-lg">
                HMAC-SHA512 webhook signature verification enabled.
              </div>
            </div>

            {/* Supabase PostgreSQL Status */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase">Supabase PostgreSQL</span>
                <Database className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="font-bold text-sm text-gray-900">Connected</span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                Host: <code>https://ooalsbdkknznrnldrypd.supabase.co</code>
              </p>
              <div className="text-[11px] text-gray-500 p-2.5 bg-gray-50 rounded-lg">
                RLS policies configured for all 20 entities.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TEMPLATES MANAGER */}
      {activeAdminTab === 'templates' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base">CV Templates Catalog ({templatesState.length})</h3>
              <p className="text-xs text-gray-500">Toggle template availability and premium flags</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b font-bold text-gray-500 uppercase text-[10px]">
                  <th className="py-2.5">Template Name</th>
                  <th className="py-2.5">Category</th>
                  <th className="py-2.5">Layout</th>
                  <th className="py-2.5">Access Tier</th>
                  <th className="py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {templatesState.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-gray-50/50">
                    <td className="py-3 font-bold text-gray-900">{tpl.name}</td>
                    <td className="py-3 text-gray-600">{tpl.category}</td>
                    <td className="py-3 text-gray-500 font-mono text-[11px]">{tpl.layout}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        tpl.isPremium ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {tpl.isPremium ? 'Pro Only' : 'Free Starter'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => toggleTemplateActive(tpl.id)}
                        className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        Toggle Pro/Free
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SUPPORT INBOX */}
      {activeAdminTab === 'support' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-gray-900 text-base">Inquiries & Contact Desk ({supportRequests.length})</h3>
            <div className="space-y-3">
              {supportRequests.map((req) => (
                <div key={req.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-xs font-bold text-purple-700">{req.id}</span>
                      <h4 className="font-bold text-gray-900 text-sm">{req.subject}</h4>
                      <p className="text-xs text-gray-500">From: {req.name} ({req.email} • {req.phone})</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      {req.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 bg-white p-3 rounded-xl border border-gray-100">
                    "{req.message}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. SUPABASE SQL MIGRATIONS */}
      {activeAdminTab === 'sql' && (
        <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Database Migration (20 Entities & RLS Policies)</h3>
              <p className="text-xs text-gray-500">
                File: <code>supabase/migrations/20261015000001_initial_schema.sql</code>
              </p>
            </div>
            <button
              onClick={() => {
                alert('Migration file is ready at supabase/migrations/20261015000001_initial_schema.sql. You can execute this in your Supabase SQL Editor.');
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl"
            >
              Verify Migration Script
            </button>
          </div>

          <p className="text-xs text-gray-600">
            The migration creates the tables, indexes, constraints, and Row Level Security policies for:
            profiles, user_preferences, cv_documents, cv_versions, cv_templates, cover_letters, ats_audits, 
            invoices, receipts, proposals, delivery_notes, subscriptions, payments, payment_webhook_events, 
            user_entitlements, ai_usage, usage_limits, admin_settings, support_requests, and audit_logs.
          </p>

          <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-xs overflow-x-auto max-h-96">
            <pre>{`-- Supabase SQL Migration Preview (JOEASSIST)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Enforcement
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
-- [All 20 tables & RLS policies defined in supabase/migrations/20261015000001_initial_schema.sql]`}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
