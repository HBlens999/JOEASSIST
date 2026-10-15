import { CVDocument } from '../../types/cv';

/**
 * Custom Template Definition
 * Designed to cleanly host user-provided custom HTML/CSS templates
 * without requiring unsafe iframes or script execution.
 */
export interface CustomTemplateDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  author?: string;
  version?: string;
  isPremium?: boolean;
  // A clean React render function or structured component
  render: (cv: CVDocument) => React.ReactNode;
}

/**
 * Utility to safely sanitize text content before rendering in HTML templates
 */
export function sanitizeString(val?: string | null): string {
  if (!val) return '';
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Adapter mapping common CV fields to standardized template parameters
 */
export function adaptCVData(cv: CVDocument) {
  const p = cv.personal_info || {};
  return {
    fullName: p.fullName || 'Your Name',
    title: p.professionalTitle || 'Professional Title',
    email: p.email || '',
    phone: p.phone || '',
    location: p.location || '',
    website: p.website || '',
    linkedin: p.linkedin || '',
    github: p.github || '',
    summary: cv.summary || '',
    careerObjective: cv.career_objective || '',
    experience: (cv.work_experience || []).map(exp => ({
      ...exp,
      dateRange: `${exp.startDate} - ${exp.isCurrent ? 'Present' : exp.endDate}`,
      bullets: exp.bulletPoints || []
    })),
    education: (cv.education || []).map(edu => ({
      ...edu,
      dateRange: `${edu.startDate} - ${edu.endDate}`,
      degreeText: `${edu.degree} in ${edu.fieldOfStudy}`
    })),
    skills: cv.skills || [],
    allSkillsFlat: (cv.skills || []).flatMap(s => s.items),
    projects: cv.projects || [],
    certifications: cv.certifications || [],
    awards: cv.awards || [],
    languages: cv.languages || [],
    customSections: cv.custom_sections || [],
    styling: cv.styling || {
      fontFamily: 'inter',
      primaryColor: '#1e3a8a',
      fontSize: 'medium',
      spacing: 'normal'
    }
  };
}
