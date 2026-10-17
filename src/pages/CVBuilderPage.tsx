import React, { useState, useEffect, useRef } from 'react';
import { authenticatedFetch } from '../lib/authenticatedFetch';
import { CVDocument, WorkExperienceItem, EducationItem, SkillItem, ProjectItem, CertificationItem, LanguageItem } from '../types/cv';
import { CV_TEMPLATES } from '../templates/templateList';
import { supabase } from '../lib/supabase';
import { TemplateRenderer } from '../templates/TemplateRenderer';
import { exportElementToPDF } from '../lib/pdfExport';
import { useAuth } from '../context/AuthContext';
import { useEntitlements } from '../context/EntitlementsContext';
import { 
  Save, Download, Printer, Sparkles, Plus, Trash2, ChevronUp, ChevronDown, 
  Copy, History, Eye, Check, AlertCircle, RefreshCw, Layout, Palette, ArrowLeft, X 
} from 'lucide-react';

interface CVBuilderPageProps {
  initialTemplateId?: string;
  setCurrentTab: (tab: string) => void;
  cvToEdit?: CVDocument | null;
}

const DEFAULT_NEW_CV: CVDocument = {
  id: 'cv-' + Date.now(),
  title: 'My Professional CV',
  template_id: 'modern_minimalist',
  personal_info: {
    fullName: '',
    professionalTitle: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    website: ''
  },
  summary: '',
  career_objective: '',
  work_experience: [],
  education: [],
  skills: [
    { id: '1', category: 'Technical Skills', items: ['Problem Solving', 'Communication'] }
  ],
  projects: [],
  certifications: [],
  awards: [],
  volunteer_experience: [],
  publications: [],
  languages: [
    { id: '1', language: 'English', proficiency: 'Fluent' }
  ],
  references: [],
  custom_sections: [],
  section_order: ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages'],
  styling: {
    fontFamily: 'inter',
    primaryColor: '#1e3a8a',
    fontSize: 'medium',
    spacing: 'normal'
  }
};

export const CVBuilderPage: React.FC<CVBuilderPageProps> = ({ 
  initialTemplateId, 
  setCurrentTab, 
  cvToEdit 
}) => {
  const { user } = useAuth();
  const { isWatermarkFree, checkCanUseAI, recordAIUsage, canAccessTemplate, triggerUpgradePrompt } = useEntitlements();

  const [cv, setCV] = useState<CVDocument>(() => {
    if (cvToEdit) return cvToEdit;
    const savedLocal = localStorage.getItem('joeassist_active_cv');
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (initialTemplateId) parsed.template_id = initialTemplateId;
        return parsed;
      } catch (e) {
        // Fallback to default
      }
    }
    return {
      ...DEFAULT_NEW_CV,
      template_id: initialTemplateId || 'modern_minimalist',
      personal_info: {
        ...DEFAULT_NEW_CV.personal_info,
        fullName: user?.full_name || '',
        email: user?.email || '',
        phone: user?.phone || '',
      }
    };
  });

  const [activeTab, setActiveTab] = useState<'content' | 'design' | 'preview'>('content');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [versionHistory, setVersionHistory] = useState<{ id: string; timestamp: string; snapshot: CVDocument }[]>(() => {
    const saved = localStorage.getItem('joeassist_cv_versions');
    return saved ? JSON.parse(saved) : [];
  });
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiAction, setAIAction] = useState<'draft' | 'summary' | 'bullets' | 'skills'>('summary');
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiError, setAIError] = useState('');
  const [aiNotes, setAiNotes] = useState('');
  const [aiResultPreview, setAiResultPreview] = useState<any>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isPolishingCV, setIsPolishingCV] = useState(false);
  const [polishError, setPolishError] = useState('');
  const [polishedCVSignature, setPolishedCVSignature] = useState('');
  const currentCVSignature = JSON.stringify(cv);
  const isCVPolished = polishedCVSignature !== '' && polishedCVSignature === currentCVSignature;
  const [activeSection, setActiveSection] = useState<string>('personal');
  const [uploadedTemplates, setUploadedTemplates] = useState<{ id: string; name: string; isPremium: boolean }[]>([]);
  const allTemplates = [...CV_TEMPLATES, ...uploadedTemplates];
  const previewScale = typeof window !== 'undefined'
    ? (window.innerWidth < 640 ? 0.34 : window.innerWidth < 1024 ? 0.46 : 0.68)
    : 0.68;
  const templatesWithProjects = [
    'tech_terminal', 'data_science_ai', 'engineering_architect',
    'creative_studio', 'international_europass', 'healthcare_clinical',
    'compact_onepage', 'student_intern', 'modern_minimalist',
    'scandinavian_pure', 'swiss_grid', 'graduate_launchpad',
    'project_master', 'startup_founding', 'marketing_growth',
    'supply_chain_logistics', 'infographic_modern', 'customer_champion',
    'education_educator', 'hospitality_service', 'public_sector_ngo',
  ];
  const showProjectsForTemplate = cv.template_id.startsWith('uploaded_') || templatesWithProjects.includes(cv.template_id);

  useEffect(() => {
    let active = true;
    void supabase.from('custom_html_templates')
      .select('slug,name,is_premium,is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.warn('Could not load custom CV templates:', error.message);
          return;
        }
        setUploadedTemplates((data || []).map((tpl: any) => ({
          id: `uploaded_${tpl.slug}`,
          name: tpl.name,
          isPremium: Boolean(tpl.is_premium),
        })));
      });
    return () => { active = false; };
  }, []);

  // Autosave
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      localStorage.setItem('joeassist_active_cv', JSON.stringify(cv));
      setSaveStatus('saved');
    }, 800);
    return () => clearTimeout(timer);
  }, [cv]);

  // Save version snapshot
  const saveSnapshot = (description = 'Manual Version') => {
    const newVersion = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      snapshot: JSON.parse(JSON.stringify(cv))
    };
    const updated = [newVersion, ...versionHistory.slice(0, 9)];
    setVersionHistory(updated);
    localStorage.setItem('joeassist_cv_versions', JSON.stringify(updated));
  };

  const handleRestoreVersion = (version: { snapshot: CVDocument }) => {
    if (confirm('Restore this previous version? Any unsaved edits will be replaced.')) {
      setCV(version.snapshot);
      setShowHistoryModal(false);
    }
  };

  const handlePolishCV = async () => {
    if (!checkCanUseAI()) return;
    setIsPolishingCV(true);
    setPolishError('');
    try {
      const response = await authenticatedFetch('/api/gemini/polish-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv }),
      });
      const result = await response.json();
      if (!response.ok || !result?.data) {
        throw new Error(result?.message || result?.error || 'Model 1 could not polish this CV.');
      }
      const polished = result.data as CVDocument;
      setCV(polished);
      setPolishedCVSignature(JSON.stringify(polished));
      recordAIUsage();
    } catch (error) {
      setPolishError(error instanceof Error ? error.message : 'Model 1 could not polish this CV. Your original information is unchanged.');
    } finally {
      setIsPolishingCV(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      const exported = await exportElementToPDF('cv-printable-area', {
        filename: `${(cv.personal_info.fullName || 'JOEASSIST').replace(/[\\/:*?"<>|]/g, '_')}_CV.pdf`,
        isWatermarkFree,
      });
      if (!exported) window.alert('PDF export could not find the CV page. Please switch to the CV preview and try again.');
    } catch (error) {
      console.error('CV PDF export failed:', error);
      window.alert(error instanceof Error ? error.message : 'PDF export failed. Please wait for the CV preview to finish loading and try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Section items additions
  const addExperience = () => {
    const newExp: WorkExperienceItem = {
      id: Date.now().toString(),
      jobTitle: 'Job Title',
      company: 'Company Name',
      location: 'City, Country',
      startDate: '2022',
      endDate: '',
      isCurrent: false,
      bulletPoints: ['Spearheaded key initiatives resulting in measurable improvements.']
    };
    setCV(prev => ({
      ...prev,
      work_experience: [...prev.work_experience, newExp]
    }));
  };

  const removeExperience = (id: string) => {
    setCV(prev => ({
      ...prev,
      work_experience: prev.work_experience.filter(w => w.id !== id)
    }));
  };

  const addEducation = () => {
    const newEdu: EducationItem = {
      id: Date.now().toString(),
      degree: 'B.Sc.',
      fieldOfStudy: 'Field of Study',
      institution: 'University / Institution',
      startDate: '2018',
      endDate: '2022',
      gradeGpa: 'Second Class Upper'
    };
    setCV(prev => ({
      ...prev,
      education: [...prev.education, newEdu]
    }));
  };

  const removeEducation = (id: string) => {
    setCV(prev => ({
      ...prev,
      education: prev.education.filter(e => e.id !== id)
    }));
  };

  const addSkillCategory = () => {
    const newSkill: SkillItem = {
      id: Date.now().toString(),
      category: 'New Skill Category',
      items: ['Skill 1', 'Skill 2']
    };
    setCV(prev => ({
      ...prev,
      skills: [...prev.skills, newSkill]
    }));
  };

  const addProject = () => {
    const project: ProjectItem = {
      id: Date.now().toString(),
      name: '',
      role: '',
      url: '',
      description: '',
      technologies: [],
      keyAchievements: [],
    };
    setCV(prev => ({ ...prev, projects: [...(prev.projects || []), project] }));
  };

  const updateProject = (id: string, changes: Partial<ProjectItem>) => {
    setCV(prev => ({
      ...prev,
      projects: (prev.projects || []).map(project =>
        project.id === id ? { ...project, ...changes } : project
      ),
    }));
  };

  const removeProject = (id: string) => {
    setCV(prev => ({ ...prev, projects: (prev.projects || []).filter(project => project.id !== id) }));
  };

  // AI Handler
  const handleRunAI = async () => {
    if (!checkCanUseAI()) return;

    setIsAILoading(true);
    setAIError('');
    setAiResultPreview(null);

    try {
      let endpoint = '/api/gemini/improve-summary';
      let payload: any = {};

      if (aiAction === 'summary') {
        endpoint = '/api/gemini/improve-summary';
        payload = {
          currentSummary: cv.summary || aiNotes,
          targetRole: cv.personal_info.professionalTitle || 'Professional',
        };
      } else if (aiAction === 'draft') {
        endpoint = '/api/gemini/cv-draft';
        payload = {
          targetRole: cv.personal_info.professionalTitle || aiNotes,
          experienceSummary: aiNotes,
        };
      } else if (aiAction === 'bullets') {
        endpoint = '/api/gemini/improve-bullets';
        payload = {
          jobTitle: cv.personal_info.professionalTitle || 'Professional',
          bulletPoints: cv.work_experience.flatMap(w => w.bulletPoints).slice(0, 5),
        };
      }

      const res = await authenticatedFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (['MODEL1_NOT_CONFIGURED', 'MODEL2_NOT_CONFIGURED', 'GEMINI_API_KEY_MISSING'].includes(data.error)) {
          setAIError('The selected AI model is not configured yet. Choose the other model or ask the administrator to add its server API key.');
        } else {
          setAIError(data.error || 'AI generation failed.');
        }
        return;
      }

      recordAIUsage();
      setAiResultPreview(data.data);
    } catch (err: any) {
      setAIError('Could not communicate with AI service. Check network.');
    } finally {
      setIsAILoading(false);
    }
  };

  const handleApplyAISuggestion = () => {
    if (!aiResultPreview) return;

    if (aiAction === 'summary' && aiResultPreview.improvedSummary) {
      setCV(prev => ({ ...prev, summary: aiResultPreview.improvedSummary }));
    } else if (aiAction === 'draft' && aiResultPreview.work_experience) {
      setCV(prev => ({
        ...prev,
        summary: aiResultPreview.summary || prev.summary,
        work_experience: aiResultPreview.work_experience || prev.work_experience,
        skills: aiResultPreview.skills || prev.skills,
      }));
    } else if (aiAction === 'bullets' && aiResultPreview.improvedBullets?.length) {
      // Apply to first work experience item
      setCV(prev => {
        if (!prev.work_experience.length) return prev;
        const updatedExp = [...prev.work_experience];
        updatedExp[0].bulletPoints = aiResultPreview.improvedBullets;
        return { ...prev, work_experience: updatedExp };
      });
    }

    setShowAIModal(false);
    setAiResultPreview(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Action Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Title & Status */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentTab('templates')}
              className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              title="Back to templates"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <input
                type="text"
                value={cv.title}
                onChange={(e) => setCV(prev => ({ ...prev, title: e.target.value }))}
                className="font-bold text-gray-900 text-sm sm:text-base border-b border-transparent hover:border-gray-300 focus:border-blue-600 focus:outline-none"
              />
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${saveStatus === 'saved' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                  {saveStatus === 'saved' ? 'Autosaved' : 'Saving...'}
                </span>
                <span>•</span>
                <span>Template: {allTemplates.find(t => t.id === cv.template_id)?.name || 'Modern'}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowAIModal(true);
                setAiResultPreview(null);
              }}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-indigo-200 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              <span>AI Assistant</span>
            </button>

            <button
              onClick={() => {
                saveSnapshot();
                setShowHistoryModal(true);
              }}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 border border-gray-200"
              title="Version History & Recovery"
            >
              <History className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                const printable = document.getElementById('cv-printable-area');
                if (!printable) {
                  window.alert('The CV preview is not ready to print yet. Please wait for it to finish loading.');
                  return;
                }
                const originalStyles = new Map<HTMLElement, string | null>();
                const rememberAndSet = (element: HTMLElement, cssText: string) => {
                  if (!originalStyles.has(element)) originalStyles.set(element, element.getAttribute('style'));
                  element.setAttribute('style', cssText);
                };

                // Remove every non-CV sibling from the print layout and neutralize
                // scaled preview wrappers, so the page starts at the actual A4 top edge.
                let current: HTMLElement = printable;
                while (current.parentElement && current.parentElement !== document.body) {
                  const parent = current.parentElement;
                  Array.from(parent.children).forEach(child => {
                    if (child !== current && child instanceof HTMLElement) {
                      rememberAndSet(child, 'display:none !important');
                    }
                  });
                  if (parent !== document.body) {
                    rememberAndSet(parent, 'display:contents !important; transform:none !important; overflow:visible !important; width:auto !important; height:auto !important; max-width:none !important; min-height:0 !important; padding:0 !important; margin:0 !important;');
                  }
                  current = parent;
                }

                document.body.classList.add('printing-cv');
                const cleanup = () => {
                  document.body.classList.remove('printing-cv');
                  originalStyles.forEach((style, element) => {
                    if (style === null) element.removeAttribute('style');
                    else element.setAttribute('style', style);
                  });
                };
                window.addEventListener('afterprint', cleanup, { once: true });
                window.print();
              }}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 border border-gray-200"
              title="Print Document"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={handlePolishCV}
              disabled={isPolishingCV || isExportingPDF}
              className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition disabled:opacity-50 ${isCVPolished ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'}`}
              title="Finish entering details and let Model 1 proofread the CV"
            >
              {isPolishingCV ? <RefreshCw className="w-4 h-4 animate-spin" /> : isCVPolished ? <Check className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              <span>{isPolishingCV ? 'Model 1 is improving…' : isCVPolished ? 'CV Ready' : 'Done & Improve CV'}</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPDF ? 'Exporting...' : 'Download PDF'}</span>
            </button>
          </div>
          {polishError && (
            <div className="mx-auto max-w-7xl px-4 pb-2">
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">
                {polishError} Your original CV has been preserved. You can still export or print it without AI proofreading.
              </div>
            </div>
          )}
          {!isCVPolished && !polishError && (
            <div className="mx-auto max-w-7xl px-4 pb-2">
              <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                AI proofreading is optional. You can download or print your CV at any time, or choose <strong>Done & Improve CV</strong> for an extra grammar and clarity review.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Editor & Section Selectors */}
        <div className="lg:col-span-5 space-y-4">
          {/* Section Navigation Tabs */}
          <div className="bg-white p-2 rounded-2xl border border-gray-200 flex gap-1 overflow-x-auto scrollbar-thin text-xs font-bold">
            {[
              { id: 'personal', label: '1. Contact' },
              { id: 'summary', label: '2. Summary' },
              { id: 'experience', label: '3. Experience' },
              { id: 'education', label: '4. Education' },
              { id: 'skills', label: '5. Skills' },
              ...(showProjectsForTemplate ? [{ id: 'projects', label: '6. Projects' }] : []),
              { id: 'styling', label: 'Design' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                  activeSection === tab.id ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Form Body based on Active Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            {/* 1. PERSONAL INFORMATION */}
            {activeSection === 'personal' && (
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900 text-sm border-b pb-2">Personal & Contact Information</h3>\n                <p className="text-xs text-gray-500">Start with your name and the best ways for an employer to contact you. Only fill in links you actually use.</p>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase">Full Name</label>
                  <input
                    type="text"
                    value={cv.personal_info.fullName}
                    onChange={(e) => setCV(prev => ({
                      ...prev,
                      personal_info: { ...prev.personal_info, fullName: e.target.value }
                    }))}
                    placeholder="e.g. Joseph Chiemezie"
                    className="w-full mt-1 p-2 text-xs border rounded-lg focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase">Professional Title</label>
                  <input
                    type="text"
                    value={cv.personal_info.professionalTitle}
                    onChange={(e) => setCV(prev => ({
                      ...prev,
                      personal_info: { ...prev.personal_info, professionalTitle: e.target.value }
                    }))}
                    placeholder="e.g. Lead Software Architect"
                    className="w-full mt-1 p-2 text-xs border rounded-lg focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase">Email</label>
                    <input
                      type="email"
                      value={cv.personal_info.email}
                      onChange={(e) => setCV(prev => ({
                        ...prev,
                        personal_info: { ...prev.personal_info, email: e.target.value }
                      }))}
                      placeholder="e.g. josepchiemezie@gmail.com"
                      className="w-full mt-1 p-2 text-xs border rounded-lg focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase">Phone</label>
                    <input
                      type="text"
                      value={cv.personal_info.phone}
                      onChange={(e) => setCV(prev => ({
                        ...prev,
                        personal_info: { ...prev.personal_info, phone: e.target.value }
                      }))}
                      placeholder="08039448648"
                      className="w-full mt-1 p-2 text-xs border rounded-lg focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-600 uppercase">Location</label>
                  <input
                    type="text"
                    value={cv.personal_info.location}
                    onChange={(e) => setCV(prev => ({
                      ...prev,
                      personal_info: { ...prev.personal_info, location: e.target.value }
                    }))}
                    placeholder="e.g. Lagos, Nigeria"
                    className="w-full mt-1 p-2 text-xs border rounded-lg focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase">LinkedIn</label>
                    <input
                      type="text"
                      value={cv.personal_info.linkedin || ''}
                      onChange={(e) => setCV(prev => ({
                        ...prev,
                        personal_info: { ...prev.personal_info, linkedin: e.target.value }
                      }))}
                      placeholder="linkedin.com/in/username"
                      className="w-full mt-1 p-2 text-xs border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-600 uppercase">Website / Portfolio</label>
                    <input
                      type="text"
                      value={cv.personal_info.website || ''}
                      onChange={(e) => setCV(prev => ({
                        ...prev,
                        personal_info: { ...prev.personal_info, website: e.target.value }
                      }))}
                      placeholder="https://myportfolio.com"
                      className="w-full mt-1 p-2 text-xs border rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. PROFESSIONAL SUMMARY */}
            {activeSection === 'summary' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="font-bold text-gray-900 text-sm">Professional Summary</h3>\n                  <p className="text-xs text-gray-500">Write 3–5 sentences about your experience, strengths, and the value you can bring to an employer.</p>
                  <button
                    onClick={() => {
                      setAIAction('summary');
                      setShowAIModal(true);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Enhance with AI
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={cv.summary}
                  onChange={(e) => setCV(prev => ({ ...prev, summary: e.target.value }))}
                  placeholder="Summarize your professional background, key career highlights, and top achievements..."
                  className="w-full p-2.5 text-xs border rounded-lg focus:ring-1 focus:ring-blue-600 leading-relaxed"
                />
              </div>
            )}

            {/* 3. WORK EXPERIENCE */}
            {activeSection === 'experience' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="font-bold text-gray-900 text-sm">Work Experience</h3>\n                  <p className="text-xs text-gray-500">List jobs, internships, or relevant volunteering. If you have no work history yet, you can leave this empty and highlight projects or education.</p>
                  <button
                    onClick={addExperience}
                    className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-blue-100"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Job
                  </button>
                </div>

                {cv.work_experience.map((exp, idx) => (
                  <div key={exp.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2 relative">
                    <button
                      onClick={() => removeExperience(exp.id)}
                      className="absolute right-2 top-2 text-gray-400 hover:text-red-600 p-1"
                      title="Remove Job"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="grid grid-cols-2 gap-2 pr-6">
                      <input
                        type="text"
                        value={exp.jobTitle}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCV(prev => ({
                            ...prev,
                            work_experience: prev.work_experience.map(w => w.id === exp.id ? { ...w, jobTitle: val } : w)
                          }));
                        }}
                        placeholder="Job Title"
                        className="p-1.5 text-xs border rounded bg-white"
                      />
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCV(prev => ({
                            ...prev,
                            work_experience: prev.work_experience.map(w => w.id === exp.id ? { ...w, company: val } : w)
                          }));
                        }}
                        placeholder="Company"
                        className="p-1.5 text-xs border rounded bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={exp.startDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCV(prev => ({
                            ...prev,
                            work_experience: prev.work_experience.map(w => w.id === exp.id ? { ...w, startDate: val } : w)
                          }));
                        }}
                        placeholder="Start Date (e.g. 2021)"
                        className="p-1.5 text-xs border rounded bg-white"
                      />
                      <input
                        type="text"
                        value={exp.endDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCV(prev => ({
                            ...prev,
                            work_experience: prev.work_experience.map(w => w.id === exp.id
                              ? { ...w, endDate: val, isCurrent: val.trim().toLowerCase() === 'present' }
                              : w)
                          }));
                        }}
                        placeholder="End Date (or Present)"
                        className="p-1.5 text-xs border rounded bg-white"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-[11px] text-gray-600">
                      <input
                        type="checkbox"
                        checked={Boolean(exp.isCurrent)}
                        onChange={(e) => {
                          const isCurrent = e.target.checked;
                          setCV(prev => ({
                            ...prev,
                            work_experience: prev.work_experience.map(w => w.id === exp.id
                              ? { ...w, isCurrent, endDate: isCurrent ? 'Present' : (w.endDate.trim().toLowerCase() === 'present' ? '' : w.endDate) }
                              : w)
                          }));
                        }}
                        className="rounded border-gray-300"
                      />
                      I currently work here
                    </label>

                    {/* Bullet Points */}
                    <div className="pt-1 space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Bullet Points (Achievements)</label>
                      {exp.bulletPoints.map((bp, bpIdx) => (
                        <div key={bpIdx} className="flex gap-1 items-center">
                          <input
                            type="text"
                            value={bp}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCV(prev => ({
                                ...prev,
                                work_experience: prev.work_experience.map(w => {
                                  if (w.id !== exp.id) return w;
                                  const updatedPts = [...w.bulletPoints];
                                  updatedPts[bpIdx] = val;
                                  return { ...w, bulletPoints: updatedPts };
                                })
                              }));
                            }}
                            className="flex-1 p-1 text-xs border rounded bg-white"
                          />
                          <button
                            onClick={() => {
                              setCV(prev => ({
                                ...prev,
                                work_experience: prev.work_experience.map(w => {
                                  if (w.id !== exp.id) return w;
                                  return { ...w, bulletPoints: w.bulletPoints.filter((_, i) => i !== bpIdx) };
                                })
                              }));
                            }}
                            className="text-gray-400 hover:text-red-500 text-xs px-1"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          setCV(prev => ({
                            ...prev,
                            work_experience: prev.work_experience.map(w => {
                              if (w.id !== exp.id) return w;
                              return { ...w, bulletPoints: [...w.bulletPoints, ''] };
                            })
                          }));
                        }}
                        className="text-[11px] text-blue-600 font-bold hover:underline pt-0.5"
                      >
                        + Add bullet point
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 4. EDUCATION */}
            {activeSection === 'education' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="font-bold text-gray-900 text-sm">Education & Qualifications</h3>
                  <button
                    onClick={addEducation}
                    className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-blue-100"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Degree
                  </button>
                </div>

                {cv.education.map((edu) => (
                  <div key={edu.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2 relative">
                    <button
                      onClick={() => removeEducation(edu.id)}
                      className="absolute right-2 top-2 text-gray-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="grid grid-cols-2 gap-2 pr-6">
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCV(prev => ({
                            ...prev,
                            education: prev.education.map(ed => ed.id === edu.id ? { ...ed, degree: val } : ed)
                          }));
                        }}
                        placeholder="Degree (e.g. B.Sc.)"
                        className="p-1.5 text-xs border rounded bg-white"
                      />
                      <input
                        type="text"
                        value={edu.fieldOfStudy}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCV(prev => ({
                            ...prev,
                            education: prev.education.map(ed => ed.id === edu.id ? { ...ed, fieldOfStudy: val } : ed)
                          }));
                        }}
                        placeholder="Field of Study"
                        className="p-1.5 text-xs border rounded bg-white"
                      />
                    </div>
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCV(prev => ({
                          ...prev,
                          education: prev.education.map(ed => ed.id === edu.id ? { ...ed, institution: val } : ed)
                        }));
                      }}
                      placeholder="University / School"
                      className="w-full p-1.5 text-xs border rounded bg-white"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 5. SKILLS */}
            {activeSection === 'skills' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="font-bold text-gray-900 text-sm">Skills & Core Competencies</h3>
                  <button
                    onClick={addSkillCategory}
                    className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-blue-100"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Category
                  </button>
                </div>

                {cv.skills.map((skill, sIdx) => (
                  <div key={skill.id || sIdx} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                    <input
                      type="text"
                      value={skill.category}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCV(prev => ({
                          ...prev,
                          skills: prev.skills.map(s => s.id === skill.id ? { ...s, category: val } : s)
                        }));
                      }}
                      className="font-bold text-xs p-1 border rounded bg-white w-full"
                    />
                    <input
                      type="text"
                      value={skill.items.join(', ')}
                      onChange={(e) => {
                        const items = e.target.value.split(',').map(s => s.trim());
                        setCV(prev => ({
                          ...prev,
                          skills: prev.skills.map(s => s.id === skill.id ? { ...s, items } : s)
                        }));
                      }}
                      placeholder="Comma-separated skills (e.g. React, Node.js, Leadership)"
                      className="p-1.5 text-xs border rounded bg-white w-full"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 6. PROJECTS */}
            {activeSection === 'projects' && (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-gray-900 text-sm">Projects you have worked on</h3>
                    <button onClick={addProject} className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg font-bold flex items-center gap-1 hover:bg-blue-100">
                      <Plus className="w-3.5 h-3.5" /> Add Project
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Add school, personal, volunteer, freelance, or work projects. Include what you did and the result. You can leave optional details blank.</p>
                </div>
                {(cv.projects || []).length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
                    <p className="text-sm font-semibold text-gray-700">No projects added yet</p>
                    <p className="text-xs text-gray-500 mt-1">Select “Add Project” to include a project in your CV.</p>
                    <button onClick={addProject} className="mt-3 text-xs bg-blue-600 text-white px-3 py-2 rounded-lg font-bold inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add your first project</button>
                  </div>
                )}
                {(cv.projects || []).map((project, index) => (
                  <div key={project.id} className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-800">Project {index + 1}</p>
                      <button onClick={() => removeProject(project.id)} className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700" aria-label={`Remove project ${index + 1}`}><Trash2 className="w-3.5 h-3.5" /> Remove</button>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Project name <span className="font-normal text-gray-500">(required)</span></label>
                      <input value={project.name || ''} onChange={e => updateProject(project.id, { name: e.target.value })} placeholder="e.g. Student Marketplace Website" className="w-full p-2 text-sm border rounded-lg bg-white" />
                      <p className="mt-1 text-[11px] text-gray-500">Use a short name that explains what you built or worked on.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Your role <span className="font-normal text-gray-500">(optional)</span></label>
                        <input value={project.role || ''} onChange={e => updateProject(project.id, { role: e.target.value })} placeholder="e.g. Designer, Team Lead" className="w-full p-2 text-sm border rounded-lg bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Project link <span className="font-normal text-gray-500">(optional)</span></label>
                        <input value={project.url || ''} onChange={e => updateProject(project.id, { url: e.target.value })} placeholder="https://..." className="w-full p-2 text-sm border rounded-lg bg-white" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">What was the project about?</label>
                      <textarea rows={3} value={project.description || ''} onChange={e => updateProject(project.id, { description: e.target.value })} placeholder="Explain the problem, what you did, and the outcome. Example: Designed a student marketplace that helped 30 vendors display products online." className="w-full p-2 text-sm border rounded-lg bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Tools or skills used <span className="font-normal text-gray-500">(optional)</span></label>
                      <input value={(project.technologies || []).join(', ')} onChange={e => updateProject(project.id, { technologies: e.target.value.split(',').map(item => item.trim()).filter(Boolean) })} placeholder="e.g. Canva, Figma, React, Excel" className="w-full p-2 text-sm border rounded-lg bg-white" />
                      <p className="mt-1 text-[11px] text-gray-500">Separate each tool or skill with a comma.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Key achievement <span className="font-normal text-gray-500">(optional)</span></label>
                      <textarea rows={2} value={(project.keyAchievements || []).join('\n')} onChange={e => updateProject(project.id, { keyAchievements: e.target.value.split('\n').filter(Boolean) })} placeholder="What improved or what result did you achieve? One achievement per line." className="w-full p-2 text-sm border rounded-lg bg-white" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 6. DESIGN & TEMPLATE SWITCHER */}
            {activeSection === 'styling' && (
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 text-sm border-b pb-2">Layout & Visual Styling</h3>
                
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Select Active Template</label>
                  <select
                    value={cv.template_id}
                    onChange={(e) => {
                      const tpl = allTemplates.find(t => t.id === e.target.value);
                      if (tpl?.isPremium && !canAccessTemplate(true)) {
                        triggerUpgradePrompt(`"${tpl.name}" is a Pro template. Upgrade to Pro to use it.`);
                        return;
                      }
                      setCV(prev => ({ ...prev, template_id: e.target.value }));
                      if (!e.target.value.startsWith('uploaded_') && !templatesWithProjects.includes(e.target.value) && activeSection === 'projects') {
                        setActiveSection('personal');
                      }
                    }}
                    className="w-full p-2 text-xs border rounded-lg bg-white"
                  >
                    {allTemplates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.isPremium ? '(Pro)' : ''} {t.id.startsWith('uploaded_') ? '· Custom HTML' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Primary Color Accent</label>
                  <div className="flex gap-2">
                    {['#1e3a8a', '#0f766e', '#0f172a', '#7c2d12', '#4c1d95', '#b45309'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setCV(prev => ({
                          ...prev,
                          styling: { ...prev.styling, primaryColor: c }
                        }))}
                        className={`w-7 h-7 rounded-full border-2 transition ${cv.styling?.primaryColor === c ? 'ring-2 ring-blue-500 scale-110' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Scaled A4 Preview */}
        <div className="lg:col-span-7 min-w-0 bg-slate-200/70 p-3 sm:p-5 rounded-2xl border border-gray-300 flex flex-col items-center overflow-hidden shadow-inner">
          <div className="w-full flex justify-between items-center mb-3 text-xs text-gray-600 font-semibold px-2">
            <span>A4 Document Preview (210mm × 297mm)</span>
            <span>{isWatermarkFree ? '✓ Watermark Free' : 'Free Watermark Enabled'}</span>
          </div>

          <div className="w-full min-w-0 flex justify-center overflow-hidden py-2">
            <div style={{ width: `${210 * previewScale}mm`, height: `${297 * previewScale}mm`, maxWidth: '100%', flex: '0 0 auto', position: 'relative' }}>
              <TemplateRenderer cv={cv} scale={previewScale} />
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Modal */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative border border-gray-100">
            <button
              onClick={() => setShowAIModal(false)}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">AI Career Strategist</h3>
                <p className="text-xs text-gray-500">Transform your real background into an executive format</p>
              </div>
            </div>

            {aiError && (
              <div className="p-3 mb-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs">
                {aiError}
              </div>
            )}

            {/* AI Action Selector */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { id: 'summary', label: 'Rewrite Summary' },
                { id: 'bullets', label: 'Optimize Bullets' },
                { id: 'draft', label: 'Full Draft from Notes' },
              ].map((act) => (
                <button
                  key={act.id}
                  onClick={() => {
                    setAIAction(act.id as any);
                    setAiResultPreview(null);
                  }}
                  className={`p-2 text-xs font-bold rounded-xl border text-center transition ${
                    aiAction === act.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {act.label}
                </button>
              ))}
            </div>

            {/* User Input Notes */}
            <div className="mb-4">
              <label className="text-xs font-bold text-gray-700 block mb-1">
                {aiAction === 'draft' ? 'Enter rough notes or paste your work details:' : 'Optional guidance or target focus:'}
              </label>
              <textarea
                rows={3}
                value={aiNotes}
                onChange={(e) => setAiNotes(e.target.value)}
                placeholder="e.g. Emphasize cloud architecture, cost savings, and team leadership..."
                className="w-full p-2.5 text-xs border rounded-xl"
              />
            </div>

            {/* AI Result Review Box */}
            {aiResultPreview && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl mb-4 max-h-48 overflow-y-auto text-xs text-gray-800 space-y-2">
                <p className="font-bold text-blue-900">AI Suggested Changes (Review Before Applying):</p>
                {aiAction === 'summary' && (
                  <p className="italic">"{aiResultPreview.improvedSummary}"</p>
                )}
                {aiAction === 'bullets' && aiResultPreview.improvedBullets?.map((b: string, i: number) => (
                  <p key={i}>• {b}</p>
                ))}
                {aiAction === 'draft' && (
                  <p>Generated {aiResultPreview.work_experience?.length || 0} work positions and core summary.</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAIModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              {aiResultPreview ? (
                <button
                  onClick={handleApplyAISuggestion}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" /> Apply Changes to CV
                </button>
              ) : (
                <button
                  onClick={handleRunAI}
                  disabled={isAILoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {isAILoading ? 'Processing with selected model…' : 'Generate with AI'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Version History Drawer */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-bold text-gray-900 text-sm">Saved Version History</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            {versionHistory.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">No snapshots saved yet. Click version history to save a recovery point.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {versionHistory.map((ver, idx) => (
                  <div key={ver.id || idx} className="p-3 bg-gray-50 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-gray-900">{ver.snapshot.title}</p>
                      <span className="text-[10px] text-gray-500">Saved at {ver.timestamp}</span>
                    </div>
                    <button
                      onClick={() => handleRestoreVersion(ver)}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
