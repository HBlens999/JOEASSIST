import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CVDocument } from '../types/cv';
import { getCustomTemplate } from './custom/registry';
import { 
  Mail, Phone, MapPin, Globe, Linkedin, Github, Award, BookOpen, 
  Briefcase, GraduationCap, CheckCircle2, Star, Sparkles
} from 'lucide-react';

interface TemplateRendererProps {
  cv: CVDocument;
  scale?: number;
  printMode?: boolean;
}


function escapeTemplateValue(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function prepareUploadedHtml(rawHtml: string, cv: CVDocument): string {
  const p = cv.personal_info || ({} as CVDocument['personal_info']);
  const experience = (cv.work_experience || []).map(item =>
    `<section style="margin:12px 0"><h3>${escapeTemplateValue(item.jobTitle)} · ${escapeTemplateValue(item.company)}</h3><p>${escapeTemplateValue(item.startDate)} – ${escapeTemplateValue(item.isCurrent ? 'Present' : item.endDate)}</p><ul>${(item.bulletPoints || []).map(point => `<li>${escapeTemplateValue(point)}</li>`).join('')}</ul></section>`
  ).join('');
  const education = (cv.education || []).map(item =>
    `<section style="margin:8px 0"><strong>${escapeTemplateValue(item.degree)} ${escapeTemplateValue(item.fieldOfStudy)}</strong><div>${escapeTemplateValue(item.institution)} · ${escapeTemplateValue(item.startDate)} – ${escapeTemplateValue(item.endDate)}</div></section>`
  ).join('');
  const skills = (cv.skills || []).map(group =>
    `<div style="margin:5px 0"><strong>${escapeTemplateValue(group.category)}:</strong> ${(group.items || []).map(escapeTemplateValue).join(', ')}</div>`
  ).join('');
  const projects = (cv.projects || []).map(project =>
    `<section style="margin:10px 0"><h3>${escapeTemplateValue(project.name)}</h3>${project.role ? `<p><strong>Role:</strong> ${escapeTemplateValue(project.role)}</p>` : ''}<p>${escapeTemplateValue(project.description)}</p>${project.url ? `<p>${escapeTemplateValue(project.url)}</p>` : ''}${project.technologies?.length ? `<p><strong>Tools / Skills:</strong> ${project.technologies.map(escapeTemplateValue).join(', ')}</p>` : ''}${project.keyAchievements?.length ? `<ul>${project.keyAchievements.map(item => `<li>${escapeTemplateValue(item)}</li>`).join('')}</ul>` : ''}</section>`
  ).join('');
  let html = rawHtml
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<script\b[^>]*\/?\s*>/gi, '')
    .replace(/<(iframe|object|embed|form|input|button|textarea|select)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(iframe|object|embed|form|input|button|textarea|select)\b[^>]*\/?\s*>/gi, '')
    .replace(/<meta[^>]+http-equiv[^>]*>/gi, '')
    .replace(/\s(on[a-z]+|srcdoc)\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '$1="#"')
    .replace(/@import\s+[^;]+;?/gi, '')
    .replace(/url\(\s*(['"]?)javascript:[^)]*\)/gi, '');
  const replacements: Record<string, string> = {
    fullName: escapeTemplateValue(p.fullName || 'Your Name'),
    professionalTitle: escapeTemplateValue(p.professionalTitle || 'Professional Title'),
    email: escapeTemplateValue(p.email),
    phone: escapeTemplateValue(p.phone),
    location: escapeTemplateValue(p.location),
    summary: escapeTemplateValue(cv.summary).replace(/\n/g, '<br>'),
    experience,
    education,
    skills,
    projects,
  };
  for (const [key, value] of Object.entries(replacements)) {
    html = html.replace(new RegExp('\\{\\{\\s*' + key + '\\s*\\}\\}', 'gi'), value);
  }
  const security = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: https:; style-src \'unsafe-inline\' https:; font-src data: https:; base-uri \'none\'; form-action \'none\'">';
  if (/<head[^>]*>/i.test(html)) html = html.replace(/<head([^>]*)>/i, `<head$1>${security}`);
  else html = `<!doctype html><html><head>${security}<meta charset="utf-8"></head><body>${html}</body></html>`;
  return html;
}

const UploadedHtmlTemplateRenderer: React.FC<{ cv: CVDocument; scale: number; printMode: boolean }> = ({ cv, scale, printMode }) => {
  const [html, setHtml] = useState('');
  const [loadError, setLoadError] = useState('');
  const cvSignature = JSON.stringify(cv);
  useEffect(() => {
    let active = true;
    setLoadError('');
    setHtml('');
    const slug = cv.template_id.replace(/^uploaded_/, '');
    void supabase.from('custom_html_templates').select('html_content').eq('slug', slug).eq('is_active', true).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data?.html_content) setLoadError('This uploaded template is unavailable or has been unpublished.');
        else setHtml(prepareUploadedHtml(data.html_content, cv));
      });
    return () => { active = false; };
  }, [cv.template_id, cvSignature]);
  if (loadError) return <div className="m-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{loadError}</div>;
  if (!html) return <div className="m-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">Loading uploaded HTML template…</div>;
  return <div id="cv-printable-area" className="mx-auto bg-white shadow-2xl" style={{ width: '210mm', maxWidth: '210mm', boxSizing: 'border-box', minHeight: '297mm', transform: printMode ? 'none' : `scale(${scale})`, transformOrigin: 'top left', overflowX: 'hidden', overflowWrap: 'anywhere' }}>
    <iframe title="Uploaded CV template preview" sandbox="allow-same-origin" srcDoc={html} style={{ width: '210mm', height: '297mm', border: 0, display: 'block', background: 'white' }} />
  </div>;
};

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({ cv, scale = 1, printMode = false }) => {
  if (cv.template_id?.startsWith('uploaded_')) return <UploadedHtmlTemplateRenderer cv={cv} scale={scale} printMode={printMode} />;

  // Check if this is a registered custom HTML template
  const customTpl = getCustomTemplate(cv.template_id);
  if (customTpl) {
    return (
      <div 
        id="cv-printable-area" 
        className="bg-white text-gray-900 shadow-2xl mx-auto origin-top transition-transform duration-200"
        style={{
          width: '210mm',
          maxWidth: '210mm',
          boxSizing: 'border-box',
          overflowX: 'hidden',
          overflowWrap: 'anywhere',
          minHeight: '297mm',
          transform: printMode ? 'none' : `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {customTpl.render(cv)}
      </div>
    );
  }

  const p = cv.personal_info || {};
  const primaryColor = cv.styling?.primaryColor || '#1e3a8a';
  const templateId = cv.template_id || 'modern_minimalist';

  // Helper for contact details row
  const renderContactBar = (layout: 'inline' | 'stacked' | 'sidebar' = 'inline', darkBg = false) => {
    const textColor = darkBg ? 'text-gray-200' : 'text-gray-800';
    const iconColor = darkBg ? 'text-blue-300' : 'text-blue-600';

    return (
      <div className={`flex flex-wrap gap-x-4 gap-y-1 text-[13px] ${textColor} ${layout === 'stacked' ? 'flex-col space-y-1' : ''}`}>
        {p.email && (
          <span className="inline-flex items-center gap-1">
            <Mail className={`w-3.5 h-3.5 ${iconColor}`} />
            <span>{p.email}</span>
          </span>
        )}
        {p.phone && (
          <span className="inline-flex items-center gap-1">
            <Phone className={`w-3.5 h-3.5 ${iconColor}`} />
            <span>{p.phone}</span>
          </span>
        )}
        {p.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className={`w-3.5 h-3.5 ${iconColor}`} />
            <span>{p.location}</span>
          </span>
        )}
        {p.website && (
          <span className="inline-flex items-center gap-1">
            <Globe className={`w-3.5 h-3.5 ${iconColor}`} />
            <span>{p.website}</span>
          </span>
        )}
        {p.linkedin && (
          <span className="inline-flex items-center gap-1">
            <Linkedin className={`w-3.5 h-3.5 ${iconColor}`} />
            <span>{p.linkedin}</span>
          </span>
        )}
        {p.github && (
          <span className="inline-flex items-center gap-1">
            <Github className={`w-3.5 h-3.5 ${iconColor}`} />
            <span>{p.github}</span>
          </span>
        )}
      </div>
    );
  };

  // Sections Render Helpers
  const renderSummary = () => {
    if (!cv.summary) return null;
    return (
      <div className="mb-4">
        <p className="text-[13px] leading-relaxed text-gray-900 whitespace-pre-line">{cv.summary}</p>
      </div>
    );
  };

  const renderWorkExperience = (style: 'standard' | 'timeline' | 'compact' | 'borderless' = 'standard') => {
    if (!cv.work_experience?.length) return null;
    return (
      <div className="space-y-3.5">
        {cv.work_experience.map((exp, idx) => (
          <div key={exp.id || idx} className={`relative ${style === 'timeline' ? 'pl-4 border-l-2 border-blue-400' : ''}`}>
            {style === 'timeline' && (
              <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
            )}
            <div className="flex justify-between items-baseline flex-wrap">
              <span className="font-semibold text-[13px] text-gray-900">{exp.jobTitle}</span>
              <span className="text-[12px] font-medium text-gray-700">
                {exp.startDate} - {exp.isCurrent ? 'Present' : exp.endDate}
              </span>
            </div>
            <div className="text-[12px] font-medium text-blue-800 mb-1">
              {exp.company} {exp.location ? `• ${exp.location}` : ''}
            </div>
            {exp.bulletPoints?.length > 0 && (
              <ul className="list-disc list-outside ml-3.5 space-y-0.5 text-[13px] text-gray-900">
                {exp.bulletPoints.map((pt, i) => (
                  <li key={i} className="leading-snug">{pt}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderEducation = () => {
    if (!cv.education?.length) return null;
    return (
      <div className="space-y-2.5">
        {cv.education.map((edu, idx) => (
          <div key={edu.id || idx}>
            <div className="flex justify-between items-baseline flex-wrap">
              <span className="font-semibold text-[13px] text-gray-900">
                {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
              </span>
              <span className="text-[12px] text-gray-700">{edu.startDate} - {edu.endDate}</span>
            </div>
            <div className="text-[12px] text-gray-900">{edu.institution} {edu.location ? `• ${edu.location}` : ''}</div>
            {edu.gradeGpa && <div className="text-[12px] text-gray-800 font-medium">Grade / GPA: {edu.gradeGpa}</div>}
          </div>
        ))}
      </div>
    );
  };

  const renderSkills = (layout: 'pills' | 'grouped' | 'list' = 'grouped') => {
    if (!cv.skills?.length) return null;
    if (layout === 'pills') {
      const allSkills = cv.skills.flatMap(s => s.items);
      return (
        <div className="flex flex-wrap gap-1.5">
          {allSkills.map((sk, i) => (
            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-800 text-[12px] font-medium rounded border border-gray-200">
              {sk}
            </span>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-1.5 text-[13px]">
        {cv.skills.map((s, idx) => (
          <div key={s.id || idx}>
            <span className="font-semibold text-gray-800">{s.category}: </span>
            <span className="text-gray-900">{s.items.join(', ')}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderProjects = () => {
    if (!cv.projects?.length) return null;
    return (
      <div className="space-y-2.5">
        {cv.projects.map((proj, idx) => (
          <div key={proj.id || idx}>
            <div className="flex justify-between items-baseline">
              <span className="font-semibold text-[13px] text-gray-900">{proj.name}</span>
              {proj.role && <span className="text-[12px] text-gray-700">{proj.role}</span>}
            </div>
            <p className="text-[13px] text-gray-900 leading-snug">{proj.description}</p>
            {proj.url && (
              <p className="text-[12px] text-blue-700 break-all">{proj.url}</p>
            )}
            {proj.technologies?.length ? (
              <div className="text-[12px] text-blue-700 mt-0.5 font-medium break-words">
                Tools / Skills: {proj.technologies.join(', ')}
              </div>
            ) : null}
            {proj.keyAchievements?.length ? (
              <ul className="list-disc ml-3.5 mt-1 space-y-0.5 text-[12px] text-gray-900">
                {proj.keyAchievements.filter(Boolean).map((achievement, achievementIndex) => (
                  <li key={achievementIndex} className="leading-snug">{achievement}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    );
  };

  const renderCertifications = () => {
    if (!cv.certifications?.length) return null;
    return (
      <div className="space-y-1.5 text-[13px]">
        {cv.certifications.map((c, idx) => (
          <div key={c.id || idx} className="flex justify-between">
            <span className="font-medium text-gray-900">{c.name} — <span className="text-gray-800">{c.issuingOrganization}</span></span>
            <span className="text-[12px] text-gray-700">{c.issueDate}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderLanguages = () => {
    if (!cv.languages?.length) return null;
    return (
      <div className="flex flex-wrap gap-2 text-[13px]">
        {cv.languages.map((l, i) => (
          <span key={i} className="text-gray-800">
            <strong>{l.language}</strong> ({l.proficiency})
          </span>
        ))}
      </div>
    );
  };

  // Distinct Layout Renderers based on template category/style:
  // 1. Executive / C-Suite (Navy/Slate Banner, High Contrast)
  if (['executive_brief', 'apex_csuite', 'sales_rainmaker', 'bold_slate_vanguard'].includes(templateId)) {
    const isGold = templateId === 'apex_csuite';
    const bannerBg = isGold ? 'bg-slate-900 border-b-4 border-amber-500' : 'bg-slate-900 text-white';

    return (
      <div 
        id="cv-printable-area" 
        className="bg-white text-gray-900 shadow-2xl mx-auto origin-top"
        style={{
          width: '210mm',
          maxWidth: '210mm',
          boxSizing: 'border-box',
          overflowX: 'hidden',
          overflowWrap: 'anywhere',
          minHeight: '297mm',
          transform: printMode ? 'none' : `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div className={`${bannerBg} px-8 py-7 text-white`}>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white uppercase">{p.fullName || 'Your Name'}</h1>
              <p className={`text-sm font-semibold tracking-wide mt-0.5 ${isGold ? 'text-amber-400' : 'text-blue-300'}`}>
                {p.professionalTitle || 'Executive Title'}
              </p>
            </div>
            {isGold && (
              <div className="w-12 h-12 rounded-full border-2 border-amber-400 flex items-center justify-center font-serif text-lg font-bold text-amber-400">
                {(p.fullName || 'JA').substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-700">
            {renderContactBar('inline', true)}
          </div>
        </div>

        <div className="p-8 space-y-6">
          {cv.summary && (
            <div>
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-800 pb-1 mb-2 border-b-2 border-slate-200">
                Executive Profile
              </h2>
              {renderSummary()}
            </div>
          )}

          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-800 pb-1 mb-3 border-b-2 border-slate-200">
              Professional Experience
            </h2>
            {renderWorkExperience('standard')}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-800 pb-1 mb-2 border-b-2 border-slate-200">
                Education
              </h2>
              {renderEducation()}
            </div>
            <div>
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-800 pb-1 mb-2 border-b-2 border-slate-200">
                Core Competencies & Skills
              </h2>
              {renderSkills('pills')}
            </div>
          </div>

          {cv.certifications?.length ? (
            <div>
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-slate-800 pb-1 mb-2 border-b-2 border-slate-200">
                Certifications & Board Credentials
              </h2>
              {renderCertifications()}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // 2. Tech Terminal / Engineering (Monospace & Tech stack accents)
  if (['tech_terminal', 'data_science_ai', 'engineering_architect'].includes(templateId)) {
    return (
      <div 
        id="cv-printable-area" 
        className="bg-white text-gray-900 shadow-2xl mx-auto origin-top font-sans"
        style={{
          width: '210mm',
          maxWidth: '210mm',
          boxSizing: 'border-box',
          overflowX: 'hidden',
          overflowWrap: 'anywhere',
          minHeight: '297mm',
          transform: printMode ? 'none' : `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div className="p-8">
          <div className="border-b-2 border-slate-900 pb-4 mb-5 flex justify-between items-end">
            <div>
              <div className="font-mono text-[12px] text-emerald-600 font-semibold tracking-wider mb-1">// SYSTEM RESUME</div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-mono">{p.fullName || 'Your Name'}</h1>
              <p className="text-sm font-medium text-slate-600 mt-0.5">{p.professionalTitle || 'Software Engineer'}</p>
            </div>
            <div className="text-right">
              {renderContactBar('stacked')}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Main Column */}
            <div className="col-span-8 space-y-5">
              {cv.summary && (
                <div>
                  <h2 className="font-mono text-[13px] font-bold text-slate-900 uppercase tracking-wider bg-slate-100 px-2 py-1 mb-2">
                    # Summary & Architecture
                  </h2>
                  {renderSummary()}
                </div>
              )}

              <div>
                <h2 className="font-mono text-[13px] font-bold text-slate-900 uppercase tracking-wider bg-slate-100 px-2 py-1 mb-3">
                  # Work Experience
                </h2>
                {renderWorkExperience('standard')}
              </div>

              {cv.projects?.length ? (
                <div>
                  <h2 className="font-mono text-[13px] font-bold text-slate-900 uppercase tracking-wider bg-slate-100 px-2 py-1 mb-2">
                    # Projects & Systems
                  </h2>
                  {renderProjects()}
                </div>
              ) : null}
            </div>

            {/* Tech Sidebar */}
            <div className="col-span-4 space-y-5 border-l border-slate-200 pl-4">
              <div>
                <h2 className="font-mono text-[13px] font-bold text-slate-900 uppercase tracking-wider mb-2">
                  [ Tech Stack ]
                </h2>
                {renderSkills('pills')}
              </div>

              <div>
                <h2 className="font-mono text-[13px] font-bold text-slate-900 uppercase tracking-wider mb-2">
                  [ Education ]
                </h2>
                {renderEducation()}
              </div>

              {cv.certifications?.length ? (
                <div>
                  <h2 className="font-mono text-[13px] font-bold text-slate-900 uppercase tracking-wider mb-2">
                    [ Certifications ]
                  </h2>
                  {renderCertifications()}
                </div>
              ) : null}

              {cv.languages?.length ? (
                <div>
                  <h2 className="font-mono text-[13px] font-bold text-slate-900 uppercase tracking-wider mb-2">
                    [ Languages ]
                  </h2>
                  {renderLanguages()}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Two-Column Left Sidebar (Creative Studio, International Europass, Healthcare, Compact Hustler)
  if (['creative_studio', 'international_europass', 'healthcare_clinical', 'compact_onepage', 'student_intern'].includes(templateId)) {
    const isHealthcare = templateId === 'healthcare_clinical';
    const sidebarBg = isHealthcare ? 'bg-teal-900 text-teal-50' : 'bg-slate-800 text-slate-100';

    return (
      <div 
        id="cv-printable-area" 
        className="bg-white text-gray-900 shadow-2xl mx-auto origin-top flex min-h-[297mm]"
        style={{
          width: '210mm',
          transform: printMode ? 'none' : `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {/* Left Sidebar */}
        <div className={`w-[70mm] ${sidebarBg} p-6 flex flex-col justify-between`}>
          <div className="space-y-6">
            <div>
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold mb-3">
                {(p.fullName || 'JA').substring(0, 2).toUpperCase()}
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">{p.fullName || 'Your Name'}</h1>
              <p className="text-[13px] text-teal-300 font-medium mt-1">{p.professionalTitle}</p>
            </div>

            <div className="border-t border-white/20 pt-4">
              <h2 className="text-[13px] font-bold uppercase tracking-wider mb-2 text-white/80">Contact</h2>
              {renderContactBar('stacked', true)}
            </div>

            <div className="border-t border-white/20 pt-4">
              <h2 className="text-[13px] font-bold uppercase tracking-wider mb-2 text-white/80">Skills</h2>
              {renderSkills('pills')}
            </div>

            {cv.languages?.length ? (
              <div className="border-t border-white/20 pt-4">
                <h2 className="text-[13px] font-bold uppercase tracking-wider mb-2 text-white/80">Languages</h2>
                {renderLanguages()}
              </div>
            ) : null}

            {cv.certifications?.length ? (
              <div className="border-t border-white/20 pt-4">
                <h2 className="text-[13px] font-bold uppercase tracking-wider mb-2 text-white/80">Certifications</h2>
                {renderCertifications()}
              </div>
            ) : null}
          </div>

          <div className="text-[11px] text-white/40 pt-4">
            JOEASSIST Verified Format
          </div>
        </div>

        {/* Right Content */}
        <div className="w-[140mm] p-6 space-y-5">
          {cv.summary && (
            <div>
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-gray-800 pb-1 mb-2 border-b border-gray-300">
                Professional Profile
              </h2>
              {renderSummary()}
            </div>
          )}

          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-gray-800 pb-1 mb-3 border-b border-gray-300">
              Experience
            </h2>
            {renderWorkExperience('standard')}
          </div>

          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-gray-800 pb-1 mb-2 border-b border-gray-300">
              Education
            </h2>
            {renderEducation()}
          </div>

          {cv.projects?.length ? (
            <div>
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-gray-800 pb-1 mb-2 border-b border-gray-300">
                Key Projects
              </h2>
              {renderProjects()}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // 4. Chrono Timeline (Continuous vertical timeline)
  if (templateId === 'chrono_timeline') {
    return (
      <div 
        id="cv-printable-area" 
        className="bg-white text-gray-900 shadow-2xl mx-auto origin-top p-8 font-sans"
        style={{
          width: '210mm',
          maxWidth: '210mm',
          boxSizing: 'border-box',
          overflowX: 'hidden',
          overflowWrap: 'anywhere',
          minHeight: '297mm',
          transform: printMode ? 'none' : `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div className="text-center pb-5 mb-6 border-b border-blue-200">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{p.fullName || 'Your Name'}</h1>
          <p className="text-[13px] font-semibold text-blue-600 mt-1 uppercase tracking-wider">{p.professionalTitle}</p>
          <div className="mt-3 flex justify-center">
            {renderContactBar('inline')}
          </div>
        </div>

        <div className="space-y-6">
          {cv.summary && (
            <div>
              <h2 className="text-[13px] font-bold uppercase tracking-widest text-blue-900 mb-2">About & Summary</h2>
              {renderSummary()}
            </div>
          )}

          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-widest text-blue-900 mb-3">Career Progression</h2>
            {renderWorkExperience('timeline')}
          </div>

          <div className="grid grid-cols-2 gap-6 pt-2">
            <div>
              <h2 className="text-[13px] font-bold uppercase tracking-widest text-blue-900 mb-2">Education Timeline</h2>
              {renderEducation()}
            </div>
            <div>
              <h2 className="text-[13px] font-bold uppercase tracking-widest text-blue-900 mb-2">Core Skills Matrix</h2>
              {renderSkills('grouped')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. Corporate Classic & Academic & Editorial (Serif typography, double rule headers)
  if (['corporate_classic', 'academic_curriculum', 'editorial_elegance', 'legal_advocate'].includes(templateId)) {
    return (
      <div 
        id="cv-printable-area" 
        className="bg-white text-gray-900 shadow-2xl mx-auto origin-top p-9 font-serif"
        style={{
          width: '210mm',
          maxWidth: '210mm',
          boxSizing: 'border-box',
          overflowX: 'hidden',
          overflowWrap: 'anywhere',
          minHeight: '297mm',
          transform: printMode ? 'none' : `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div className="text-center pb-4 mb-5 border-b-2 border-t-2 border-black py-4">
          <h1 className="text-2xl font-bold tracking-wide uppercase">{p.fullName || 'Your Name'}</h1>
          <div className="text-[13px] italic text-gray-900 mt-1">{p.professionalTitle}</div>
          <div className="mt-2.5 flex justify-center font-sans text-[13px]">
            {renderContactBar('inline')}
          </div>
        </div>

        <div className="space-y-5 font-serif">
          {cv.summary && (
            <div>
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-black border-b border-gray-400 pb-0.5 mb-2">
                Professional Overview
              </h2>
              {renderSummary()}
            </div>
          )}

          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-black border-b border-gray-400 pb-0.5 mb-3">
              Experience & Appointments
            </h2>
            {renderWorkExperience('standard')}
          </div>

          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-black border-b border-gray-400 pb-0.5 mb-2">
              Academic Background & Qualifications
            </h2>
            {renderEducation()}
          </div>

          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-black border-b border-gray-400 pb-0.5 mb-2">
              Expertise & Competencies
            </h2>
            <div className="font-sans">
              {renderSkills('grouped')}
            </div>
          </div>

          {cv.certifications?.length ? (
            <div>
              <h2 className="text-[13px] font-bold uppercase tracking-wider text-black border-b border-gray-400 pb-0.5 mb-2">
                Admissions, Licenses & Certifications
              </h2>
              {renderCertifications()}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  // 6. Default Single Column: Modern Minimalist, Scandinavian, Swiss, etc.
  return (
    <div 
      id="cv-printable-area" 
      className="bg-white text-gray-900 shadow-2xl mx-auto origin-top p-8 font-sans"
      style={{
        width: '210mm',
        maxWidth: '210mm',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        overflowWrap: 'anywhere',
        minHeight: '297mm',
        transform: printMode ? 'none' : `scale(${scale})`,
        transformOrigin: 'top left',
      }}
    >
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{p.fullName || 'Your Name'}</h1>
        <p className="text-[13px] font-semibold text-blue-700 mt-0.5">{p.professionalTitle || 'Professional Title'}</p>
        <div className="mt-2.5">
          {renderContactBar('inline')}
        </div>
      </div>

      <div className="space-y-5">
        {cv.summary && (
          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-blue-900 pb-1 mb-2 border-b border-blue-100">
              Summary
            </h2>
            {renderSummary()}
          </div>
        )}

        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-blue-900 pb-1 mb-3 border-b border-blue-100">
            Work Experience
          </h2>
          {renderWorkExperience('standard')}
        </div>

        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-blue-900 pb-1 mb-2 border-b border-blue-100">
            Education
          </h2>
          {renderEducation()}
        </div>

        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-blue-900 pb-1 mb-2 border-b border-blue-100">
            Skills & Competencies
          </h2>
          {renderSkills('grouped')}
        </div>

        {cv.projects?.length ? (
          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-blue-900 pb-1 mb-2 border-b border-blue-100">
              Selected Projects
            </h2>
            {renderProjects()}
          </div>
        ) : null}

        {cv.certifications?.length ? (
          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-blue-900 pb-1 mb-2 border-b border-blue-100">
              Certifications & Accreditations
            </h2>
            {renderCertifications()}
          </div>
        ) : null}

        {cv.languages?.length ? (
          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-blue-900 pb-1 mb-2 border-b border-blue-100">
              Languages
            </h2>
            {renderLanguages()}
          </div>
        ) : null}
      </div>
    </div>
  );
};
