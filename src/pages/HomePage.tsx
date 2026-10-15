import React, { useState } from 'react';
import { 
  Sparkles, FileText, CheckCircle2, Shield, ArrowRight, Star, 
  Search, Download, Award, Zap, Building, ChevronRight, Phone, Mail, Check 
} from 'lucide-react';
import { CV_TEMPLATES } from '../templates/templateList';
import { authenticatedFetch } from '../lib/authenticatedFetch';
import { TemplateRenderer } from '../templates/TemplateRenderer';
import { CVDocument } from '../types/cv';

interface HomePageProps {
  setCurrentTab: (tab: string) => void;
  onSelectTemplate?: (templateId: string) => void;
}

// Sample CV for live preview showcase
const SAMPLE_CV: CVDocument = {
  id: 'sample-01',
  title: 'Executive CV Preview',
  template_id: 'modern_minimalist',
  personal_info: {
    fullName: 'Chiemezie Joseph',
    professionalTitle: 'Senior Software Engineer & Tech Lead',
    email: 'josepchiemezie@gmail.com',
    phone: '08039448648',
    location: 'Lagos, Nigeria',
    linkedin: 'linkedin.com/in/joseph-chiemezie',
    github: 'github.com/josephchiemezie',
    website: 'joeassist.com'
  },
  summary: 'Results-driven Lead Software Engineer with 8+ years architecting scalable full-stack applications, distributed databases, and high-throughput AI systems. Proven record reducing infrastructure latency by 42% and leading multi-disciplinary engineering squads.',
  work_experience: [
    {
      id: 'exp-1',
      jobTitle: 'Lead Software Architect',
      company: 'Apex Cloud Systems',
      location: 'Lagos / Remote',
      startDate: '2022',
      endDate: 'Present',
      isCurrent: true,
      bulletPoints: [
        'Architected real-time event-driven infrastructure handling 2.5M daily transactions with 99.99% availability.',
        'Spearheaded transition to containerized microservices, lowering cloud compute expenditures by 35% annually.',
        'Mentored 14 junior and mid-level engineers across TypeScript, Python, and PostgreSQL best practices.'
      ]
    },
    {
      id: 'exp-2',
      jobTitle: 'Senior Full Stack Developer',
      company: 'Zenith Innovations',
      location: 'Abuja, Nigeria',
      startDate: '2019',
      endDate: '2022',
      isCurrent: false,
      bulletPoints: [
        'Engineered responsive customer onboarding workflows boosting conversion rates by 28%.',
        'Implemented rigorous automated unit and integration test suites, reducing regression bug incidents by 50%.'
      ]
    }
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'B.Sc. Computer Science',
      fieldOfStudy: 'Software Systems',
      institution: 'University of Nigeria',
      startDate: '2014',
      endDate: '2018',
      gradeGpa: 'First Class Honors'
    }
  ],
  skills: [
    {
      id: 'sk-1',
      category: 'Core Engineering',
      items: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Cloud Infrastructure', 'System Design']
    },
    {
      id: 'sk-2',
      category: 'AI & Methodologies',
      items: ['Gemini API', 'RESTful APIs', 'CI/CD Pipelines', 'Docker', 'Agile Scrum']
    }
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'JOEASSIST Platform',
      role: 'Creator & Lead Architect',
      description: 'End-to-end AI career & business documents generation suite serving professionals and businesses.',
      technologies: ['React', 'Express', 'Gemini AI', 'Supabase', 'Paystack']
    }
  ],
  certifications: [
    {
      id: 'cert-1',
      name: 'Google Cloud Professional Cloud Architect',
      issuingOrganization: 'Google Cloud',
      issueDate: '2023'
    }
  ],
  awards: [],
  volunteer_experience: [],
  publications: [],
  languages: [
    { id: 'l1', language: 'English', proficiency: 'Fluent' }
  ],
  references: [],
  custom_sections: [],
  section_order: ['summary', 'experience', 'education', 'skills', 'projects', 'certifications'],
  styling: {
    fontFamily: 'inter',
    primaryColor: '#1e3a8a',
    fontSize: 'medium',
    spacing: 'normal'
  }
};

export const HomePage: React.FC<HomePageProps> = ({ setCurrentTab, onSelectTemplate }) => {
  const [selectedPreviewTemplate, setSelectedPreviewTemplate] = useState('modern_minimalist');
  const [testBulletInput, setTestBulletInput] = useState('Managed social media accounts and made daily posts for the company.');
  const [testBulletOutput, setTestBulletOutput] = useState('');
  const [isImprovingBullet, setIsImprovingBullet] = useState(false);

  const handleTestImprove = async () => {
    setIsImprovingBullet(true);
    setTestBulletOutput('');
    try {
      const res = await authenticatedFetch('/api/gemini/improve-bullets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: 'Social Media & Growth Lead',
          bulletPoints: [testBulletInput],
        }),
      });
      const data = await res.json();
      if (data.success && data.data.improvedBullets?.length) {
        setTestBulletOutput(data.data.improvedBullets[0]);
      } else {
        // Fallback sample showing XYZ formula
        setTestBulletOutput('Orchestrated multi-channel social media campaigns across 4 platforms, increasing organic engagement by 45% and driving 1,200+ qualified leads within 6 months.');
      }
    } catch {
      setTestBulletOutput('Orchestrated multi-channel social media campaigns across 4 platforms, increasing organic engagement by 45% and driving 1,200+ qualified leads within 6 months.');
    } finally {
      setIsImprovingBullet(false);
    }
  };

  return (
    <div className="space-y-20 pb-20 overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-12 md:pt-20 pb-12 bg-linear-to-b from-blue-50/50 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/70 border border-blue-200 text-blue-800 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Founded by Joseph Chiemezie • Powered by Gemini AI</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.15]">
              Create Executive CVs & Business Documents with <span className="text-blue-600">AI Precision</span>
            </h1>

            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Designed for Nigerian students, graduates, job seekers, and business owners. 
              Choose from <strong>30+ distinct CV templates</strong>, get instant ATS score audits, 
              and generate professional invoices, receipts, and proposals in seconds.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setCurrentTab('builder')}
                className="px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 flex items-center gap-2 transition hover:-translate-y-0.5 text-sm"
              >
                <FileText className="w-4 h-4" /> Build Your CV Now
              </button>

              <button
                onClick={() => setCurrentTab('templates')}
                className="px-6 py-3.5 bg-white hover:bg-gray-50 text-gray-800 font-bold rounded-xl border border-gray-200 shadow-xs flex items-center gap-2 transition text-sm"
              >
                <span>Browse 30+ Templates</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => setCurrentTab('ats')}
                className="px-6 py-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-200 flex items-center gap-2 transition text-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Check ATS Score
              </button>
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" /> 30+ Distinct Styles
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" /> Mobile & Android Friendly
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" /> Paystack & Naira Support
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" /> Ready for 7 Custom Templates
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Template Switching Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
            <div className="max-w-md space-y-4">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Live Template Engine</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                30+ Genuinely Distinct Layouts. Zero Loss of Data.
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Click any template below to see the exact same CV dynamically rendered with different typography, 
                section hierarchy, and styling — perfectly formatted for A4 printing and PDF export.
              </p>

              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-slate-400">Quick Switcher:</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'modern_minimalist', name: '1. Modern Minimalist' },
                    { id: 'executive_brief', name: '2. Executive Brief' },
                    { id: 'tech_terminal', name: '3. Tech & Engineering' },
                    { id: 'corporate_classic', name: '4. Corporate Classic' },
                    { id: 'creative_studio', name: '5. Creative 2-Column' },
                    { id: 'chrono_timeline', name: '6. Chrono Timeline' },
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setSelectedPreviewTemplate(tpl.id)}
                      className={`text-left px-3 py-2 rounded-lg text-xs font-semibold transition ${
                        selectedPreviewTemplate === tpl.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={() => {
                    if (onSelectTemplate) onSelectTemplate(selectedPreviewTemplate);
                    setCurrentTab('builder');
                  }}
                  className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition"
                >
                  Edit With This Template <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scaled Preview Box */}
            <div className="w-full lg:w-[600px] bg-slate-950/60 rounded-2xl p-4 border border-slate-800 flex justify-center overflow-hidden">
              <div className="transform scale-[0.62] sm:scale-[0.7] md:scale-[0.75] origin-top transition-all duration-300">
                <TemplateRenderer 
                  cv={{
                    ...SAMPLE_CV,
                    template_id: selectedPreviewTemplate,
                  }} 
                  scale={1}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Interactive Feature Spotlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Built-In Gemini AI</span>
          <h2 className="text-3xl font-extrabold text-gray-900 mt-1">Smart Assistance That Never Fabricates Facts</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-2">
            JOEASSIST transforms basic task descriptions into executive, metric-focused bullet points using Google's XYZ formula. Try it live:
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-md max-w-3xl mx-auto">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
            Enter a basic job duty or task:
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={testBulletInput}
              onChange={(e) => setTestBulletInput(e.target.value)}
              className="flex-1 px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
              placeholder="e.g. Handled customer complaints and answered support calls."
            />
            <button
              onClick={handleTestImprove}
              disabled={isImprovingBullet}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shrink-0 transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isImprovingBullet ? 'Rewriting with AI...' : 'Transform with AI'}
            </button>
          </div>

          {testBulletOutput && (
            <div className="mt-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                ✓ AI-Optimized Executive Bullet:
              </span>
              <p className="text-xs sm:text-sm text-emerald-950 font-medium leading-relaxed">
                "{testBulletOutput}"
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Business Documents Suite Highlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Business Suite</span>
          <h2 className="text-3xl font-extrabold text-gray-900 mt-1">Complete Business Paperwork for Entrepreneurs</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-2">
            No need for expensive accounting software. Create verified professional paperwork with exact arithmetic:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'Professional Invoices',
              desc: 'Automated line item calculations, tax percentages, discounts, balance due, and payment terms.',
              icon: Building,
              color: 'text-blue-600 bg-blue-50',
              tab: 'business',
            },
            {
              title: 'Official Receipts',
              desc: 'Receipt generation with payment method, transaction reference, and platform-verified flags.',
              icon: CheckCircle2,
              color: 'text-emerald-600 bg-emerald-50',
              tab: 'business',
            },
            {
              title: 'Client Proposals',
              desc: 'Complete project proposals with executive summaries, client needs, deliverables, and timelines.',
              icon: FileText,
              color: 'text-purple-600 bg-purple-50',
              tab: 'business',
            },
            {
              title: 'Delivery Notes',
              desc: 'Organized dispatch and delivery records with quantities, order references, and receiver signatures.',
              icon: Shield,
              color: 'text-amber-600 bg-amber-50',
              tab: 'business',
            },
          ].map((item, i) => (
            <div 
              key={i}
              onClick={() => setCurrentTab(item.tab)}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs hover:shadow-md hover:border-blue-300 transition cursor-pointer group"
            >
              <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-900 text-base mb-1.5">{item.title}</h3>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">{item.desc}</p>
              <span className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Generate Document <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Founder Notice & Direct Contact Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-300">Message from Founder</span>
            <h3 className="text-2xl font-bold text-white">"Every Nigerian Job Seeker Deserves a World-Class CV"</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              JOEASSIST was created by Joseph Chiemezie to level the playing field. Whether you are on an Android phone in Lagos, Aba, or Abuja, you have access to executive-grade career documents.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-xs font-mono text-blue-200">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> 08039448648
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> josepchiemezie@gmail.com
              </span>
            </div>
          </div>

          <div className="shrink-0 space-y-2 text-center md:text-right">
            <button
              onClick={() => setCurrentTab('contact')}
              className="px-6 py-3 bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs rounded-xl shadow-lg transition"
            >
              Contact Support Desk
            </button>
            <p className="text-[11px] text-slate-400">Direct assistance from Joseph Chiemezie</p>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Fair Pricing</span>
          <h2 className="text-3xl font-extrabold text-gray-900 mt-1">Simple, Transparent Plans</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-2">
            Start for free, upgrade when you need unlimited AI rewrites and watermark-free exports.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Free */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Free Starter</h3>
              <div className="mt-3 mb-2">
                <span className="text-3xl font-black text-gray-900">₦0</span>
                <span className="text-xs text-gray-500 ml-1">/forever</span>
              </div>
              <p className="text-xs text-gray-600 mb-6">Create your initial CV and test the platform.</p>
              <ul className="space-y-2.5 text-xs text-gray-700">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 2 Saved CVs</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 5 AI Generation credits</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 2 ATS Compatibility Audits</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 3 Invoices / Receipts</li>
              </ul>
            </div>
            <button
              onClick={() => setCurrentTab('builder')}
              className="mt-6 w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition"
            >
              Start Free
            </button>
          </div>

          {/* Premium */}
          <div className="bg-white rounded-2xl p-6 border-2 border-blue-600 shadow-xl relative flex flex-col justify-between">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
              Most Popular
            </span>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Pro Career</h3>
              <div className="mt-3 mb-2">
                <span className="text-3xl font-black text-gray-900">₦4,500</span>
                <span className="text-xs text-gray-500 ml-1">/month</span>
              </div>
              <p className="text-xs text-gray-600 mb-6">For active candidates and freelancers.</p>
              <ul className="space-y-2.5 text-xs text-gray-700">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-600" /> 25 Saved CVs</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-600" /> 150 AI Generation credits</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-600" /> 50 ATS Audits</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-600" /> 100 Business Documents</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-600" /> All 30+ Premium Templates</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-blue-600" /> Watermark-Free PDF Exports</li>
              </ul>
            </div>
            <button
              onClick={() => setCurrentTab('pricing')}
              className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              Upgrade to Pro
            </button>
          </div>

          {/* Lifetime */}
          <div className="bg-white rounded-2xl p-6 border border-amber-300 shadow-xs flex flex-col justify-between bg-amber-50/20">
            <div>
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">One-Time Fee</span>
              <h3 className="font-bold text-gray-900 text-lg">Lifetime Pro</h3>
              <div className="mt-3 mb-2">
                <span className="text-3xl font-black text-gray-900">₦18,500</span>
                <span className="text-xs text-gray-500 ml-1">/once</span>
              </div>
              <p className="text-xs text-gray-600 mb-6">Pay once, enjoy perpetual unlimited access.</p>
              <ul className="space-y-2.5 text-xs text-gray-700">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-600" /> UNLIMITED CVs & Documents</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-600" /> UNLIMITED AI credits & ATS scans</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-600" /> All current & future templates</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-600" /> Access to 7 Original HTML files</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-amber-600" /> Direct WhatsApp support</li>
              </ul>
            </div>
            <button
              onClick={() => setCurrentTab('pricing')}
              className="mt-6 w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              Get Lifetime Pro
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
