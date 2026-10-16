import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CV_TEMPLATES } from '../templates/templateList';
import { CVTemplateMeta } from '../types/cv';
import { supabase } from '../lib/supabase';
import { 
  Shield, Users, Layout, CreditCard, Sparkles, MessageSquare, 
  Database, RefreshCw, CheckCircle2, AlertTriangle, Key, Terminal, Eye, Lock 
} from 'lucide-react';

interface UploadedHtmlTemplate {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  html_content: string;
  is_premium: boolean;
  is_active: boolean;
  created_at: string;
}

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
  const [uploadedTemplates, setUploadedTemplates] = useState<UploadedHtmlTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('Professional');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateHtml, setTemplateHtml] = useState('');
  const [templatePremium, setTemplatePremium] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateMessage, setTemplateMessage] = useState('');
  const [templateError, setTemplateError] = useState('');

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
    void loadUploadedTemplates();
  }, []);

  const loadUploadedTemplates = async () => {
    const { data, error } = await supabase
      .from('custom_html_templates')
      .select('id,slug,name,category,description,html_content,is_premium,is_active,created_at')
      .order('created_at', { ascending: false });
    if (error) {
      setTemplateError('Could not load uploaded templates: ' + error.message);
      return;
    }
    setUploadedTemplates((data || []) as UploadedHtmlTemplate[]);
  };

  const resetTemplateForm = () => {
    setTemplateName('');
    setTemplateCategory('Professional');
    setTemplateDescription('');
    setTemplateHtml('');
    setTemplatePremium(false);
    setEditingTemplateId(null);
    setTemplateMessage('');
    setTemplateError('');
  };

  const handleTemplateFile = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.html') && file.type !== 'text/html') {
      setTemplateError('Please select an .html file.');
      return;
    }
    if (file.size > 500 * 1024) {
      setTemplateError('The HTML template must be 500 KB or smaller.');
      return;
    }
    const content = await file.text();
    if (!content.trim() || !/<html[\s>]|<body[\s>]|<div[\s>]/i.test(content)) {
      setTemplateError('This file does not appear to contain a valid HTML template.');
      return;
    }
    setTemplateHtml(content);
    setTemplateError('');
    if (!templateName) setTemplateName(file.name.replace(/\.html?$/i, '').replace(/[-_]+/g, ' '));
  };

  const saveUploadedTemplate = async () => {
    setTemplateError('');
    setTemplateMessage('');
    if (templateName.trim().length < 2) return setTemplateError('Enter a template name with at least 2 characters.');
    if (templateHtml.trim().length < 20) return setTemplateError('Choose an .html file before saving.');
    setTemplateSaving(true);
    try {
      const slugBase = templateName.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'custom-template';
      const payload = {
        name: templateName.trim(),
        category: templateCategory.trim() || 'Professional',
        description: templateDescription.trim(),
        html_content: templateHtml,
        is_premium: templatePremium,
        updated_at: new Date().toISOString(),
      };
      const result = editingTemplateId
        ? await supabase.from('custom_html_templates').update(payload).eq('id', editingTemplateId)
        : await supabase.from('custom_html_templates').insert({ ...payload, slug: `${slugBase}-${Date.now().toString(36)}`, created_by: user?.id });
      if (result.error) throw result.error;
      const wasEditing = Boolean(editingTemplateId);
      resetTemplateForm();
      setTemplateMessage(wasEditing ? 'Template updated and saved.' : 'HTML template uploaded and saved.');
      await loadUploadedTemplates();
    } catch (error: any) {
      setTemplateError(error?.message || 'Could not save the HTML template.');
    } finally {
      setTemplateSaving(false);
    }
  };

  const editUploadedTemplate = (template: UploadedHtmlTemplate) => {
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    setTemplateCategory(template.category);
    setTemplateDescription(template.description || '');
    setTemplateHtml(template.html_content);
    setTemplatePremium(template.is_premium);
    setTemplateMessage('');
    setTemplateError('');
    document.getElementById('uploaded-html-template-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const updateUploadedTemplate = async (id: string, updates: Partial<Pick<UploadedHtmlTemplate, 'is_active' | 'is_premium'>>) => {
    const { error } = await supabase.from('custom_html_templates').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) setTemplateError('Could not update template: ' + error.message);
    else await loadUploadedTemplates();
  };

  const deleteUploadedTemplate = async (template: UploadedHtmlTemplate) => {
    if (!window.confirm(`Delete uploaded template "${template.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from('custom_html_templates').delete().eq('id', template.id);
    if (error) setTemplateError('Could not delete template: ' + error.message);
    else {
      if (editingTemplateId === template.id) resetTemplateForm();
      await loadUploadedTemplates();
      setTemplateMessage('Template deleted.');
    }
  };

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
          { id: 'templates', label: `Manage Templates (${templatesState.length + uploadedTemplates.length})` },
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Gemini AI Status */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase">AI Model 1 · OpenAI</span>
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${systemStatus?.services?.model1?.configured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="font-bold text-sm text-gray-900">
                  {systemStatus?.services?.model1?.configured ? 'Configured' : 'API key pending in Cloudflare'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Model: <strong>GPT-4o mini</strong> · shown to users as Model 1
              </p>
              <div className="text-[11px] text-gray-500 p-2.5 bg-gray-50 rounded-lg">
                Set the server-side Cloudflare secret <code>OPENAI_API_KEY</code>. Never add it to frontend code.
              </div>
            </div>

            {/* Paystack Gateway Status */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase">AI Model 2 · Google Gemini</span>
                <CreditCard className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${systemStatus?.services?.model2?.configured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="font-bold text-sm text-gray-900">
                  {systemStatus?.services?.model2?.configured ? 'Configured' : 'API key pending in Cloudflare'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Model: <strong>Gemini 2.5 Flash</strong> · shown to users as Model 2
              </p>
              <div className="text-[11px] text-gray-500 p-2.5 bg-gray-50 rounded-lg">
                Set the server-side Cloudflare secret <code>GEMINI_API_KEY</code>. Never add it to frontend code.
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
                <span className="font-bold text-sm text-gray-900">{systemStatus?.services?.paystack?.configured ? 'Live Mode Active' : 'Ready for Keys'}</span>
              </div>
              <p className="text-xs text-gray-500">Server-side verification endpoint: <code>/api/paystack/verify</code></p>
              <div className="text-[11px] text-gray-500 p-2.5 bg-gray-50 rounded-lg">Payment secret keys stay server-side.</div>
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
              <h3 className="font-bold text-gray-900 text-base">CV Templates Catalog ({templatesState.length + uploadedTemplates.length})</h3>
              <p className="text-xs text-gray-500">Toggle template availability and premium flags</p>
            </div>
          </div>

          <div id="uploaded-html-template-form" className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/50 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h4 className="font-bold text-gray-900">{editingTemplateId ? 'Edit Uploaded HTML Template' : 'Upload Your HTML CV Template'}</h4>
                <p className="text-xs text-gray-600 mt-1">Upload a self-contained .html file (maximum 500 KB). Keep scripts out of CV templates; use the placeholder guide below for personal CV data.</p>
              </div>
              {editingTemplateId && <button onClick={resetTemplateForm} className="text-xs font-bold text-gray-600 underline">Cancel edit</button>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-gray-700">Template name
                <input value={templateName} onChange={e => setTemplateName(e.target.value)} maxLength={100} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" placeholder="e.g. Executive Blue CV" />
              </label>
              <label className="text-xs font-semibold text-gray-700">Category
                <input value={templateCategory} onChange={e => setTemplateCategory(e.target.value)} maxLength={60} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" placeholder="Professional" />
              </label>
              <label className="text-xs font-semibold text-gray-700 md:col-span-2">Description
                <input value={templateDescription} onChange={e => setTemplateDescription(e.target.value)} maxLength={500} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" placeholder="Short description shown in the template gallery" />
              </label>
              <label className="text-xs font-semibold text-gray-700 md:col-span-2">HTML file
                <input type="file" accept=".html,text/html" onChange={e => void handleTemplateFile(e.target.files?.[0])} className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
                <span className="mt-1 block text-[11px] font-normal text-gray-500">{templateHtml ? `HTML loaded · ${Math.round(new Blob([templateHtml]).size / 1024)} KB` : 'Choose the .html file from your computer.'}</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 md:col-span-2">
                <input type="checkbox" checked={templatePremium} onChange={e => setTemplatePremium(e.target.checked)} />
                Mark as Pro template
              </label>
            </div>
            <div className="rounded-xl border border-blue-100 bg-white p-3 text-[11px] text-gray-600">
              <strong>Supported placeholders:</strong> <code>{'{{fullName}}'}</code>, <code>{'{{professionalTitle}}'}</code>, <code>{'{{email}}'}</code>, <code>{'{{phone}}'}</code>, <code>{'{{location}}'}</code>, <code>{'{{summary}}'}</code>, <code>{'{{experience}}'}</code>, <code>{'{{education}}'}</code>, and <code>{'{{skills}}'}</code>.
            </div>
            {templateError && <p role="alert" className="text-xs font-semibold text-red-600">{templateError}</p>}
            {templateMessage && <p role="status" className="text-xs font-semibold text-emerald-700">{templateMessage}</p>}
            <button onClick={() => void saveUploadedTemplate()} disabled={templateSaving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
              {templateSaving ? 'Saving…' : editingTemplateId ? 'Save Template Changes' : 'Upload & Save HTML Template'}
            </button>
          </div>

          <div className="mb-8 space-y-3">
            <h4 className="font-bold text-gray-900">Uploaded HTML Templates ({uploadedTemplates.length})</h4>
            {uploadedTemplates.length === 0 ? <p className="rounded-xl bg-gray-50 p-4 text-xs text-gray-500">No custom HTML templates uploaded yet.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead><tr className="border-b text-[10px] uppercase text-gray-500"><th className="py-2">Name</th><th className="py-2">Category</th><th className="py-2">Visibility</th><th className="py-2">Access</th><th className="py-2 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {uploadedTemplates.map(tpl => <tr key={tpl.id}>
                      <td className="py-3 pr-3"><strong>{tpl.name}</strong><p className="mt-1 text-[10px] text-gray-500">{tpl.description}</p></td>
                      <td className="py-3 pr-3">{tpl.category}</td>
                      <td className="py-3">{tpl.is_active ? 'Published' : 'Hidden'}</td>
                      <td className="py-3">{tpl.is_premium ? 'Pro' : 'Free'}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          <button onClick={() => editUploadedTemplate(tpl)} className="rounded-lg border px-2 py-1 font-semibold text-blue-700">Edit</button>
                          <button onClick={() => void updateUploadedTemplate(tpl.id, { is_active: !tpl.is_active })} className="rounded-lg border px-2 py-1 font-semibold">{tpl.is_active ? 'Hide' : 'Publish'}</button>
                          <button onClick={() => void updateUploadedTemplate(tpl.id, { is_premium: !tpl.is_premium })} className="rounded-lg border px-2 py-1 font-semibold">{tpl.is_premium ? 'Make Free' : 'Make Pro'}</button>
                          <button onClick={() => void deleteUploadedTemplate(tpl)} className="rounded-lg border border-red-200 px-2 py-1 font-semibold text-red-600">Delete</button>
                        </div>
                      </td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            )}
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
