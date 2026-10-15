import { CVTemplateMeta } from '../types/cv';

export const CV_TEMPLATES: CVTemplateMeta[] = [
  {
    id: 'modern_minimalist',
    name: 'Modern Minimalist',
    category: 'Minimalist',
    description: 'Clean sans-serif typography, subtle divider lines, and balanced white space for maximum scannability.',
    isPremium: false,
    layout: 'single-column',
    recommendedFor: ['Software Engineers', 'Designers', 'General Professionals'],
    tags: ['Clean', 'Minimalist', 'Popular']
  },
  {
    id: 'corporate_classic',
    name: 'Corporate Classic',
    category: 'Corporate',
    description: 'Traditional, authoritative layout with elegant serif accents, structured borders, and refined hierarchy.',
    isPremium: false,
    layout: 'single-column',
    recommendedFor: ['Banking', 'Legal', 'Management Consulting'],
    tags: ['Formal', 'Executive', 'Traditional']
  },
  {
    id: 'executive_brief',
    name: 'Executive Brief',
    category: 'Executive',
    description: 'High-impact header banner with executive core competencies callout and career milestone emphasis.',
    isPremium: true,
    layout: 'executive',
    recommendedFor: ['Directors', 'VPs', 'C-Suite Executives'],
    tags: ['Leadership', 'High Impact', 'Executive']
  },
  {
    id: 'tech_terminal',
    name: 'Tech & Engineering Pro',
    category: 'Technology and IT',
    description: 'Code-inspired accent badges, technical stack matrix, and project-centric arrangement.',
    isPremium: false,
    layout: 'two-column-left',
    recommendedFor: ['Full Stack Developers', 'DevOps', 'Data Engineers'],
    tags: ['Technical', 'GitHub Ready', 'Projects']
  },
  {
    id: 'creative_studio',
    name: 'Creative Studio & Portfolio',
    category: 'Creative',
    description: 'Asymmetric header layout, bold typography contrasts, and visual skills matrix designed for creatives.',
    isPremium: true,
    layout: 'two-column-left',
    recommendedFor: ['UI/UX Designers', 'Art Directors', 'Brand Strategists'],
    tags: ['Creative', 'Visual', 'Portfolio']
  },
  {
    id: 'academic_curriculum',
    name: 'Academic Scholar',
    category: 'Academic',
    description: 'Formal scholarly layout prioritizing research interests, publications, grant awards, and teaching pedagogy.',
    isPremium: false,
    layout: 'single-column',
    recommendedFor: ['Professors', 'Postdoctoral Researchers', 'Lecturers'],
    tags: ['Scholarly', 'Publications', 'Research']
  },
  {
    id: 'graduate_launchpad',
    name: 'Graduate Launchpad',
    category: 'Graduate and entry-level',
    description: 'Strategic structure spotlighting education, academic honors, capstone projects, and transferable skills.',
    isPremium: false,
    layout: 'single-column',
    recommendedFor: ['Recent Graduates', 'First-Time Job Seekers', 'Interns'],
    tags: ['Entry-Level', 'University', 'Education First']
  },
  {
    id: 'student_intern',
    name: 'Student Intern',
    category: 'Student',
    description: 'Friendly, accessible format highlighting coursework, student union involvement, and early achievements.',
    isPremium: false,
    layout: 'two-column-left',
    recommendedFor: ['Undergraduate Students', 'Co-op Applicants'],
    tags: ['Student', 'Internship', 'Fresh']
  },
  {
    id: 'finance_analyst',
    name: 'Finance & Quant Analyst',
    category: 'Finance and accounting',
    description: 'High-density, structured format emphasizing quantitative ROI, financial modeling, and audits.',
    isPremium: true,
    layout: 'single-column',
    recommendedFor: ['Chartered Accountants', 'Financial Analysts', 'Auditors'],
    tags: ['Numbers', 'Audit', 'Quantitative']
  },
  {
    id: 'healthcare_clinical',
    name: 'Healthcare & Clinical Care',
    category: 'Healthcare',
    description: 'Clean medical-teal accents, clinical rotations, professional licenses, and patient-care highlights.',
    isPremium: false,
    layout: 'two-column-left',
    recommendedFor: ['Nurses', 'Medical Doctors', 'Pharmacists', 'Lab Scientists'],
    tags: ['Medical', 'Certifications', 'Clinical']
  },
  {
    id: 'sales_rainmaker',
    name: 'Sales Rainmaker',
    category: 'Sales and marketing',
    description: 'Quota attainment callouts, pipeline growth metrics, and high-visibility revenue achievement stats.',
    isPremium: true,
    layout: 'header-hero',
    recommendedFor: ['Account Executives', 'Sales Directors', 'Business Developers'],
    tags: ['Revenue', 'Quota', 'High Energy']
  },
  {
    id: 'marketing_growth',
    name: 'Growth & Digital Marketing',
    category: 'Sales and marketing',
    description: 'Dynamic layout showcasing campaign KPIs, CAC/LTV improvements, and multi-channel marketing stacks.',
    isPremium: false,
    layout: 'two-column-right',
    recommendedFor: ['Digital Marketers', 'SEO Specialists', 'Growth Hackers'],
    tags: ['Marketing', 'Metrics', 'Modern']
  },
  {
    id: 'project_master',
    name: 'Project & Program Master',
    category: 'Project management',
    description: 'PMP and Agile framework badges, cross-functional team delivery tables, and milestone tracking format.',
    isPremium: false,
    layout: 'single-column',
    recommendedFor: ['Project Managers', 'Scrum Masters', 'Operations Leads'],
    tags: ['PMP', 'Agile', 'Operations']
  },
  {
    id: 'customer_champion',
    name: 'Customer Success Champion',
    category: 'Customer service',
    description: 'Emphasizes customer satisfaction (CSAT), dispute resolution, CRM tools, and empathy-driven results.',
    isPremium: false,
    layout: 'two-column-left',
    recommendedFor: ['Support Specialists', 'Customer Success Managers'],
    tags: ['Support', 'CRM', 'Interpersonal']
  },
  {
    id: 'admin_operations',
    name: 'Administrative & Office Lead',
    category: 'Administrative',
    description: 'Organized, systematic layout highlighting office workflows, executive scheduling, and records.',
    isPremium: false,
    layout: 'single-column',
    recommendedFor: ['Executive Assistants', 'Office Managers', 'Secretaries'],
    tags: ['Organized', 'Operations', 'Executive Support']
  },
  {
    id: 'engineering_architect',
    name: 'Engineering Systems Architect',
    category: 'Engineering',
    description: 'Technical schematic styling with engineering principles, CAD/simulation competencies, and patent entries.',
    isPremium: true,
    layout: 'two-column-left',
    recommendedFor: ['Mechanical', 'Civil', 'Electrical', 'Chemical Engineers'],
    tags: ['Engineering', 'Design', 'Systems']
  },
  {
    id: 'education_educator',
    name: 'Distinguished Educator',
    category: 'Education',
    description: 'Pedagogy philosophy section, curriculum development metrics, and classroom management accolades.',
    isPremium: false,
    layout: 'single-column',
    recommendedFor: ['Teachers', 'School Administrators', 'Tutors'],
    tags: ['Education', 'Teaching', 'Curriculum']
  },
  {
    id: 'international_europass',
    name: 'International Borderless',
    category: 'International applications',
    description: 'Standardized left metadata sidebar with nationality, language CEFR levels, and global mobility details.',
    isPremium: false,
    layout: 'two-column-left',
    recommendedFor: ['Remote Global Workers', 'Immigration & Visa Applicants', 'NGO Workers'],
    tags: ['International', 'Multilingual', 'Global']
  },
  {
    id: 'scandinavian_pure',
    name: 'Scandinavian Pure',
    category: 'Minimalist',
    description: 'Generous white space, subtle stone border treatments, and tranquil typography inspired by Nordic minimalism.',
    isPremium: true,
    layout: 'single-column',
    recommendedFor: ['Architects', 'Writers', 'Consultants'],
    tags: ['Minimalist', 'Nordic', 'Airy']
  },
  {
    id: 'swiss_grid',
    name: 'Swiss Typographic Grid',
    category: 'Modern professional',
    description: 'Strict modular grid system with bold contrast headers and precision alignment in the Bauhaus lineage.',
    isPremium: true,
    layout: 'grid',
    recommendedFor: ['Design Engineers', 'Brand Managers', 'Strategists'],
    tags: ['Bauhaus', 'Precision', 'Grid']
  },
  {
    id: 'compact_onepage',
    name: 'Compact 1-Page Hustler',
    category: 'Graduate and entry-level',
    description: 'Maximum density without clutter; optimized to guarantee all critical qualifications fit on a single A4 page.',
    isPremium: false,
    layout: 'two-column-left',
    recommendedFor: ['Early Career', 'Interns', 'Quick Screenings'],
    tags: ['1-Page', 'Dense', 'ATS Favorite']
  },
  {
    id: 'data_science_ai',
    name: 'Data Science & AI Specialist',
    category: 'Technology and IT',
    description: 'Dedicated sections for algorithms, ML frameworks, dataset pipelines, and academic pre-prints.',
    isPremium: true,
    layout: 'two-column-left',
    recommendedFor: ['AI Engineers', 'Data Scientists', 'MLOps Practitioners'],
    tags: ['AI', 'Data', 'Python/ML']
  },
  {
    id: 'public_sector_ngo',
    name: 'Public Sector & Impact NGO',
    category: 'Corporate',
    description: 'Structured layout emphasizing grant stewardship, stakeholder consensus, and community impact.',
    isPremium: false,
    layout: 'single-column',
    recommendedFor: ['Civil Servants', 'Policy Analysts', 'NGO Directors'],
    tags: ['Government', 'Public Service', 'Impact']
  },
  {
    id: 'supply_chain_logistics',
    name: 'Supply Chain & Logistics Lead',
    category: 'Engineering',
    description: 'Process inventory turns, vendor negotiations, procurement spend, and warehouse flow metrics.',
    isPremium: false,
    layout: 'two-column-right',
    recommendedFor: ['Logistics Coordinators', 'Procurement Managers', 'Fleet Leads'],
    tags: ['Supply Chain', 'Logistics', 'Operations']
  },
  {
    id: 'hospitality_service',
    name: 'Hospitality & Luxury Service',
    category: 'Customer service',
    description: 'Warm, refined presentation featuring guest satisfaction scores, VIP protocols, and bilingual skills.',
    isPremium: false,
    layout: 'single-column',
    recommendedFor: ['Hotel Managers', 'Executive Chefs', 'Flight Attendants'],
    tags: ['Hospitality', 'Service', 'Refined']
  },
  {
    id: 'legal_advocate',
    name: 'Legal Counsel & Advocate',
    category: 'Corporate',
    description: 'Traditional formal serif, structured bar admissions, jurisprudence focus, and case history representation.',
    isPremium: true,
    layout: 'single-column',
    recommendedFor: ['Attorneys', 'Paralegals', 'Compliance Officers'],
    tags: ['Legal', 'Bar Admission', 'Formal']
  },
  {
    id: 'startup_founding',
    name: 'Startup Operator & Founder',
    category: 'Executive',
    description: 'Fast-paced milestone bulleting, venture capital backing notes, and cross-functional 0-to-1 build stories.',
    isPremium: true,
    layout: 'header-hero',
    recommendedFor: ['Founders', 'Product Managers', 'Growth Leads'],
    tags: ['Startup', '0 to 1', 'Operator']
  },
  {
    id: 'chrono_timeline',
    name: 'Chrono Vertical Timeline',
    category: 'Creative',
    description: 'Distinctive connected milestone dots and timeline track showing clear upward career progression.',
    isPremium: true,
    layout: 'timeline',
    recommendedFor: ['Experienced Specialists', 'Career Changers', 'Storytellers'],
    tags: ['Timeline', 'Visual', 'Modern']
  },
  {
    id: 'bold_slate_vanguard',
    name: 'Bold Slate Vanguard',
    category: 'Modern professional',
    description: 'Charcoal slate header band with crisp white body layout and sharp modern contrast.',
    isPremium: false,
    layout: 'header-hero',
    recommendedFor: ['Consultants', 'Marketing Directors', 'Tech Leads'],
    tags: ['Slate', 'Contrast', 'Executive']
  },
  {
    id: 'editorial_elegance',
    name: 'Editorial Magazine Elegance',
    category: 'Creative',
    description: 'New York Times/Vogue-style typography with pull-quote summaries and refined ruled separators.',
    isPremium: true,
    layout: 'single-column',
    recommendedFor: ['Journalists', 'Copywriters', 'Communications Specialists'],
    tags: ['Editorial', 'Serif', 'Sophisticated']
  },
  {
    id: 'apex_csuite',
    name: 'Apex C-Suite Monogram',
    category: 'Executive',
    description: 'Monogram initials seal, board advisory section, and gold-trimmed executive summary presentation.',
    isPremium: true,
    layout: 'executive',
    recommendedFor: ['Chief Executive Officers', 'Board Members', 'Senior Partners'],
    tags: ['C-Suite', 'Prestigious', 'Monogram']
  },
  {
    id: 'infographic_modern',
    name: 'Infographic Modern Spectrum',
    category: 'Creative',
    description: 'Visual category cards, competency meters, and structured pill badges for high-engagement scanning.',
    isPremium: true,
    layout: 'grid',
    recommendedFor: ['Social Media Managers', 'Product Designers', 'Brand Strategists'],
    tags: ['Visual', 'Badges', 'Engaging']
  }
];

export const TEMPLATE_CATEGORIES = [
  'All',
  'Modern professional',
  'Corporate',
  'Minimalist',
  'Executive',
  'Graduate and entry-level',
  'Student',
  'Academic',
  'Creative',
  'Technology and IT',
  'Engineering',
  'Finance and accounting',
  'Healthcare',
  'Education',
  'Administrative',
  'Sales and marketing',
  'Customer service',
  'Project management',
  'International applications'
];
