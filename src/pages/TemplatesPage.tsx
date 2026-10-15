import React, { useState } from 'react';
import { CV_TEMPLATES, TEMPLATE_CATEGORIES } from '../templates/templateList';
import { CVTemplateMeta, CVDocument } from '../types/cv';
import { TemplateRenderer } from '../templates/TemplateRenderer';
import { useEntitlements } from '../context/EntitlementsContext';
import { Search, Sparkles, Filter, Check, Eye, X, ArrowRight, ShieldCheck } from 'lucide-react';

interface TemplatesPageProps {
  setCurrentTab: (tab: string) => void;
  onSelectTemplate: (templateId: string) => void;
}

// Sample CV for template previews
const PREVIEW_CV: CVDocument = {
  id: 'preview-cv',
  title: 'Executive CV Preview',
  template_id: 'modern_minimalist',
  personal_info: {
    fullName: 'Joseph Chiemezie',
    professionalTitle: 'Lead Software Architect & Product Engineer',
    email: 'josepchiemezie@gmail.com',
    phone: '08039448648',
    location: 'Lagos, Nigeria',
    linkedin: 'linkedin.com/in/josephchiemezie',
    website: 'joeassist.com'
  },
  summary: 'Innovative Technology Leader with extensive experience architecting high-scale cloud distributed systems, AI-powered applications, and enterprise software. Track record of delivering high-performing platforms that scale to millions of users.',
  work_experience: [
    {
      id: 'w1',
      jobTitle: 'Principal Software Architect',
      company: 'JOEASSIST Technologies',
      location: 'Lagos, Nigeria',
      startDate: '2021',
      endDate: 'Present',
      isCurrent: true,
      bulletPoints: [
        'Designed scalable AI-powered CV and business documentation pipeline serving over 50,000 active users.',
        'Reduced query response times by 65% through optimized PostgreSQL indexing and caching architectures.',
        'Engineered secure server-side Paystack payment verification and webhook processing systems.'
      ]
    },
    {
      id: 'w2',
      jobTitle: 'Senior Full Stack Engineer',
      company: 'Zenith Global Systems',
      location: 'Abuja, Nigeria',
      startDate: '2018',
      endDate: '2021',
      isCurrent: false,
      bulletPoints: [
        'Built enterprise microservices supporting cross-border payments with 99.99% uptime compliance.',
        'Spearheaded automated testing frameworks reducing system bugs by 45%.'
      ]
    }
  ],
  education: [
    {
      id: 'e1',
      degree: 'B.Sc. Computer Science',
      fieldOfStudy: 'Distributed Systems',
      institution: 'University of Nigeria',
      startDate: '2013',
      endDate: '2017',
      gradeGpa: 'First Class'
    }
  ],
  skills: [
    {
      id: 's1',
      category: 'Technical Stack',
      items: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'Gemini AI API', 'Cloud Architecture']
    },
    {
      id: 's2',
      category: 'Leadership & Methods',
      items: ['Agile Sprint Planning', 'System Design', 'Cybersecurity Best Practices', 'Team Mentorship']
    }
  ],
  projects: [
    {
      id: 'p1',
      name: 'JOEASSIST Enterprise Suite',
      role: 'Founder & Architect',
      description: 'End-to-end AI career & business documents generation suite.',
      technologies: ['React', 'Express', 'Supabase', 'Paystack', 'Gemini AI']
    }
  ],
  certifications: [
    {
      id: 'c1',
      name: 'Google Cloud Certified Professional Cloud Architect',
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

export const TemplatesPage: React.FC<TemplatesPageProps> = ({ setCurrentTab, onSelectTemplate }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<CVTemplateMeta | null>(null);
  const { canAccessTemplate, triggerUpgradePrompt } = useEntitlements();

  // Filter templates by category and search
  const filteredTemplates = CV_TEMPLATES.filter((tpl) => {
    const matchesCategory = selectedCategory === 'All' || tpl.category === selectedCategory;
    const matchesSearch = 
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      tpl.recommendedFor.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleUseTemplate = (template: CVTemplateMeta) => {
    if (template.isPremium && !canAccessTemplate(true)) {
      triggerUpgradePrompt(`"${template.name}" is a Pro template. Upgrade to Pro or Lifetime Pro to unlock all 30+ premium templates.`);
      return;
    }
    onSelectTemplate(template.id);
    setCurrentTab('builder');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
          32 Distinct Professional Layouts
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          CV Template Gallery
        </h1>
        <p className="text-sm text-gray-600">
          Each template is designed with distinct typography, spacing, and hierarchy for specific careers and industries. 
          Switch templates anytime without losing a single word of your data.
        </p>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by role (e.g. Doctor, Engineer, Sales, Minimalist)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
            />
          </div>

          <div className="text-xs text-gray-500 font-semibold self-end sm:self-center">
            Showing {filteredTemplates.length} of {CV_TEMPLATES.length} templates
          </div>
        </div>

        {/* Category Pills (Horizontal scrollable) */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTemplates.map((template) => {
          const hasAccess = canAccessTemplate(template.isPremium);

          return (
            <div
              key={template.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group"
            >
              <div>
                {/* Visual Preview Container */}
                <div className="relative bg-slate-100 h-56 overflow-hidden border-b border-gray-100 flex items-start justify-center p-2">
                  <div className="transform scale-[0.28] origin-top pointer-events-none transition-transform group-hover:scale-[0.29] duration-300">
                    <TemplateRenderer
                      cv={{
                        ...PREVIEW_CV,
                        template_id: template.id,
                      }}
                      scale={1}
                    />
                  </div>

                  {/* Badges Overlay */}
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold rounded-md uppercase tracking-wider">
                      {template.category}
                    </span>
                    {template.isPremium && (
                      <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-md uppercase tracking-wider">
                        Pro
                      </span>
                    )}
                  </div>

                  {/* Hover Quick Preview Action */}
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs"
                  >
                    <Eye className="w-4 h-4" /> Full Preview
                  </button>
                </div>

                {/* Template Info */}
                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-xs text-gray-500 leading-snug line-clamp-2">
                    {template.description}
                  </p>

                  <div className="pt-1 flex flex-wrap gap-1">
                    {template.tags.map((t, idx) => (
                      <span key={idx} className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 pt-0 flex gap-2">
                <button
                  onClick={() => setPreviewTemplate(template)}
                  className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-600"
                  title="Full Screen Preview"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleUseTemplate(template)}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition ${
                    template.isPremium && !hasAccess
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  }`}
                >
                  {template.isPremium && !hasAccess ? (
                    <>
                      <span>Unlock with Pro</span>
                    </>
                  ) : (
                    <>
                      <span>Use Template</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Screen Live Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-700">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center text-white">
              <div>
                <h3 className="font-bold text-base">{previewTemplate.name}</h3>
                <p className="text-xs text-slate-400">Category: {previewTemplate.category} • Layout: {previewTemplate.layout}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    handleUseTemplate(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition"
                >
                  Use This Template <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Scaled Scrollable Preview */}
            <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-950">
              <div className="py-4">
                <TemplateRenderer
                  cv={{
                    ...PREVIEW_CV,
                    template_id: previewTemplate.id,
                  }}
                  scale={0.9}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
