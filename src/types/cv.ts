// Types for JOEASSIST CV Data Model
export interface PersonalInfo {
  fullName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  location: string;
  website?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  portfolioUrl?: string;
  avatarUrl?: string;
}

export interface WorkExperienceItem {
  id: string;
  jobTitle: string;
  company: string;
  location?: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  bulletPoints: string[];
}

export interface EducationItem {
  id: string;
  degree: string;
  fieldOfStudy: string;
  institution: string;
  location?: string;
  startDate: string;
  endDate: string;
  gradeGpa?: string;
  highlights?: string[];
}

export interface SkillItem {
  id: string;
  category: string; // e.g. "Technical Skills", "Tools", "Soft Skills"
  items: string[];
}

export interface ProjectItem {
  id: string;
  name: string;
  role?: string;
  url?: string;
  description: string;
  technologies?: string[];
  keyAchievements?: string[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface AwardItem {
  id: string;
  title: string;
  issuer: string;
  date: string;
  description?: string;
}

export interface VolunteerItem {
  id: string;
  role: string;
  organization: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface PublicationItem {
  id: string;
  title: string;
  publisher: string;
  publicationDate: string;
  url?: string;
  summary?: string;
}

export interface LanguageItem {
  id: string;
  language: string;
  proficiency: 'Native' | 'Fluent' | 'Professional Working' | 'Conversational' | 'Elementary';
}

export interface ReferenceItem {
  id: string;
  fullName: string;
  position: string;
  company: string;
  email?: string;
  phone?: string;
  relationship?: string;
}

export interface CustomSectionItem {
  id: string;
  title: string;
  subtitle?: string;
  date?: string;
  content: string;
}

export interface CustomSection {
  id: string;
  title: string;
  items: CustomSectionItem[];
}

export interface CVStyling {
  fontFamily: 'inter' | 'roboto' | 'merriweather' | 'playfair' | 'fira_code' | 'lora' | 'montserrat';
  primaryColor: string;
  secondaryColor?: string;
  fontSize: 'compact' | 'medium' | 'spacious';
  spacing: 'tight' | 'normal' | 'relaxed';
  accentColor?: string;
}

export interface CVDocument {
  id: string;
  user_id?: string;
  title: string;
  template_id: string;
  personal_info: PersonalInfo;
  summary: string;
  career_objective?: string;
  work_experience: WorkExperienceItem[];
  education: EducationItem[];
  skills: SkillItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  awards: AwardItem[];
  volunteer_experience: VolunteerItem[];
  publications: PublicationItem[];
  languages: LanguageItem[];
  references: ReferenceItem[];
  custom_sections: CustomSection[];
  section_order: string[];
  styling: CVStyling;
  created_at?: string;
  updated_at?: string;
}

export interface CVTemplateMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  isPremium: boolean;
  layout: 'single-column' | 'two-column-left' | 'two-column-right' | 'grid' | 'header-hero' | 'timeline' | 'executive';
  recommendedFor: string[];
  tags: string[];
}
