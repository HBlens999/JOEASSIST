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
  // Only restore the official Tailwind Play CDN when the uploaded document explicitly depends on it.
  // All uploaded scripts are still stripped below; the trusted runtime is injected after sanitization.
  // Uploaded templates are rendered with local utility CSS below. Never execute the Tailwind CDN at runtime.
  const needsTailwindRuntime = false;
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
  // Support both camelCase and common uppercase/underscore placeholders used in
  // third-party HTML CVs, so imported designs bind to the live builder data.
  const replacements: Array<[string, string]> = [
    ['fullName', escapeTemplateValue(p.fullName || 'Your Name')],
    ['FULL_NAME', escapeTemplateValue(p.fullName || 'Your Name')],
    ['name', escapeTemplateValue(p.fullName || 'Your Name')],
    ['professionalTitle', escapeTemplateValue(p.professionalTitle || 'Professional Title')],
    ['PROFESSIONAL_TITLE', escapeTemplateValue(p.professionalTitle || 'Professional Title')],
    ['jobTitle', escapeTemplateValue(p.professionalTitle || 'Professional Title')],
    ['email', escapeTemplateValue(p.email)],
    ['EMAIL', escapeTemplateValue(p.email)],
    ['phone', escapeTemplateValue(p.phone)],
    ['PHONE', escapeTemplateValue(p.phone)],
    ['location', escapeTemplateValue(p.location)],
    ['LOCATION', escapeTemplateValue(p.location)],
    ['linkedin', escapeTemplateValue(p.linkedin)],
    ['LINKEDIN', escapeTemplateValue(p.linkedin)],
    ['website', escapeTemplateValue(p.website)],
    ['WEBSITE', escapeTemplateValue(p.website)],
    ['github', escapeTemplateValue(p.github)],
    ['GITHUB', escapeTemplateValue(p.github)],
    ['certifications', (cv.certifications || []).map(item => '<li>' + escapeTemplateValue(item.name) + (item.issuingOrganization ? ' - ' + escapeTemplateValue(item.issuingOrganization) : '') + '</li>').join('')],
    ['CERTIFICATIONS', (cv.certifications || []).map(item => '<li>' + escapeTemplateValue(item.name) + (item.issuingOrganization ? ' - ' + escapeTemplateValue(item.issuingOrganization) : '') + '</li>').join('')],
    ['languages', (cv.languages || []).map(item => '<li>' + escapeTemplateValue(item.language) + (item.proficiency ? ' (' + escapeTemplateValue(item.proficiency) + ')' : '') + '</li>').join('')],
    ['LANGUAGES', (cv.languages || []).map(item => '<li>' + escapeTemplateValue(item.language) + (item.proficiency ? ' (' + escapeTemplateValue(item.proficiency) + ')' : '') + '</li>').join('')],
    ['summary', escapeTemplateValue(cv.summary).replace(/\n/g, '<br>')],
    ['SUMMARY', escapeTemplateValue(cv.summary).replace(/\n/g, '<br>')],
    ['experience', experience],
    ['WORK_EXPERIENCE', experience],
    ['education', education],
    ['EDUCATION', education],
    ['skills', skills],
    ['SKILLS', skills],
    ['projects', projects],
    ['PROJECTS', projects],
  ];
  for (const [key, value] of replacements) {
    html = html.replace(new RegExp('\\{\\{\\s*' + key + '\\s*\\}\\}', 'gi'), value);
  }


  // Word/LibreOffice exports often contain the original CV as static text rather
  // than placeholders. Bind common CV fields and section content as a fallback.
  // Process sections from the bottom up so replacements do not invalidate offsets.
  const hasTemplatePlaceholders = /\{\{\s*(?:fullName|FULL_NAME|name|professionalTitle|PROFESSIONAL_TITLE|jobTitle|email|EMAIL|phone|PHONE|location|LOCATION|summary|SUMMARY|experience|WORK_EXPERIENCE|education|EDUCATION|skills|SKILLS)\s*\}\}/i.test(rawHtml);
  if (!hasTemplatePlaceholders && /<meta[^>]+(?:LibreOffice|Microsoft|Word)/i.test(rawHtml)) {
    const replaceTextValue = (pattern: RegExp, value: string) => {
      if (!value) return;
      html = html.replace(pattern, value);
    };
    // The exported Word CV usually places the candidate name in its first paragraph.
    if (p.fullName) {
      const bodyStart = html.search(/<body\b[^>]*>/i);
      const firstParagraph = bodyStart >= 0 ? html.slice(bodyStart).match(/<p\b[^>]*>[\s\S]*?<\/p>/i) : null;
      if (firstParagraph) {
        const oldName = firstParagraph[0].replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ').trim();
        const nameMatch = oldName.match(/[A-Z][A-Z'’-]+(?:\s+[A-Z][A-Z'’-]+){1,5}/);
        if (nameMatch) {
          const flexibleName = nameMatch[0].split(/\s+/).join('(?:<[^>]*>|\\s|&nbsp;|&#160;)*');
          html = html.replace(new RegExp(flexibleName, 'i'), escapeTemplateValue(p.fullName));
        }
      }
    }
    // Replace whole contact paragraphs so extra sample phone numbers or addresses cannot leak through.
    if (p.email) replaceTextValue(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, escapeTemplateValue(p.email));
    if (p.location) {
      const addressParagraph = /<p\b[^>]*>(?:(?!<p\b)[\s\S])*?(?:address|location)\s*:?(?:(?!<p\b)[\s\S])*?<\/p>/i;
      html = html.replace(addressParagraph, (paragraph) => {
        const open = paragraph.match(/^<p\b[^>]*>/i)?.[0] || '<p>';
        const label = paragraph.match(/(?:Address|Location)\s*:?/i)?.[0] || 'Address:';
        return open + '<b>' + label + '</b> ' + escapeTemplateValue(p.location) + '</p>';
      });
    }
    if (p.phone) {
      const phoneParagraph = /<p\b[^>]*>(?:(?!<p\b)[\s\S])*?(?:phone|mobile|telephone)\s*:?(?:(?!<p\b)[\s\S])*?<\/p>/i;
      html = html.replace(phoneParagraph, (paragraph) => {
        const open = paragraph.match(/^<p\b[^>]*>/i)?.[0] || '<p>';
        const label = paragraph.match(/(?:Phone|Mobile|Telephone)\s*:?/i)?.[0] || 'Phone:';
        return open + '<b>' + label + '</b> ' + escapeTemplateValue(p.phone) + '</p>';
      });
    }
    // Bind Objective/Summary, Education and Work Experience sections in Word exports.
    const knownSectionTitle = /^(objective|career objective|professional objective|summary|professional summary|career summary|profile|professional profile|education|educational background|academic background|qualifications|work experience|work experiences|professional experience|employment history|career history|experience|skills|technical skills|core competencies|competencies|projects|personal projects|certifications|certificates|licenses|licences|accreditations|languages|awards|honours|honors|references|personal details|personal information|industrial training|internship|internships|training|volunteer experience)$/i;
    const headingMatches = [...html.matchAll(/<(h[1-6]|p)\b[^>]*>[\s\S]*?<\/\1>/gi)]
      .map(match => {
        const title = match[0].replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;|&amp;/gi, ' ').replace(/\s+/g, ' ').trim().replace(/[:：]+$/, '').toLowerCase();
        return { index: match.index ?? 0, end: (match.index ?? 0) + match[0].length, title };
      })
      .filter(match => knownSectionTitle.test(match.title));
    const sectionReplacements: Array<{ index: number; end: number; value: string }> = [];
    for (let i = 0; i < headingMatches.length; i++) {
      const heading = headingMatches[i];
      const nextHeading = headingMatches[i + 1];
      const sectionEnd = nextHeading ? nextHeading.index : html.search(/<\/body\s*>/i);
      if (sectionEnd <= heading.index) continue;
      let value = '';
      let recognized = false;
      const liveSection = (content: string) => html.slice(heading.index, heading.end) + content;
      if (/(objective|summary|profile)/i.test(heading.title)) {
        recognized = true;
        const objectiveText = cv.career_objective?.trim() || cv.summary?.trim() || '';
        if (objectiveText) value = liveSection('<p style="margin:0 0 8px;line-height:1.35;text-align:justify">' + escapeTemplateValue(objectiveText).replace(/\n/g, '<br>') + '</p>');
      } else if (/(education|academic background|qualifications)/i.test(heading.title)) {
        recognized = true;
        if (cv.education?.length) value = liveSection(cv.education.map(item => '<p style="margin:0 0 8px;line-height:1.25"><b>' +
          escapeTemplateValue([item.startDate, item.endDate].filter(Boolean).join(' - ')) + (item.startDate || item.endDate ? ' &nbsp; ' : '') +
          escapeTemplateValue([item.institution, item.degree, item.fieldOfStudy].filter(Boolean).join(' — ')) +
          (item.gradeGpa ? '<br>' + escapeTemplateValue(item.gradeGpa) : '') + '</b></p>').join(''));
      } else if (/(work experience|work experiences|professional experience|employment history|career history|experience)/i.test(heading.title)) {
        recognized = true;
        if (cv.work_experience?.length) value = liveSection(cv.work_experience.map(item => '<p style="margin:0 0 8px;line-height:1.25"><b>' +
          escapeTemplateValue([item.jobTitle, item.company].filter(Boolean).join(' — ')) + '</b><br>' +
          escapeTemplateValue([item.startDate, item.isCurrent ? 'Present' : item.endDate].filter(Boolean).join(' - ')) +
          (item.location ? ' | ' + escapeTemplateValue(item.location) : '') +
          ((item.bulletPoints || []).length ? '<ul style="margin:4px 0 0 20px">' + item.bulletPoints.map(point => '<li>' + escapeTemplateValue(point) + '</li>').join('') + '</ul>' : '') +
          '</p>').join(''));
      } else if (/skills|competenc/i.test(heading.title)) {
        recognized = true;
        if (cv.skills?.some(group => group.items?.length)) value = liveSection('<ul style="margin:0 0 8px 20px">' + cv.skills.flatMap(group => group.items || []).map(skill => '<li>' + escapeTemplateValue(skill) + '</li>').join('') + '</ul>');
      } else if (/project/i.test(heading.title)) {
        recognized = true;
        if (cv.projects?.length) value = liveSection(projects);
      } else if (/certification|licen[cs]e|accreditation/i.test(heading.title)) {
        recognized = true;
        if (cv.certifications?.length) value = liveSection(replacements.find(([key]) => key === 'certifications')?.[1] || '');
      } else if (/language/i.test(heading.title)) {
        recognized = true;
        if (cv.languages?.length) value = liveSection(replacements.find(([key]) => key === 'languages')?.[1] || '');
      }
      // This imported document has static sample-only sections such as Industrial Training
      // and Personal Details. Remove unsupported headings and their content rather than
      // presenting information the current user never entered.
      // Always replace each imported section: mapped sections get live data, and all other sections are removed.\n      sectionReplacements.push({ index: heading.index, end: sectionEnd, value });
    }
    for (const replacement of sectionReplacements.reverse()) {
      html = html.slice(0, replacement.index) + replacement.value + html.slice(replacement.end);
    }
  }

  // Strip the unsupported personal-details block from uploaded CVs regardless of
  // whether Word exported it as table rows, paragraphs, or simple divs. These fields
  // are not collected by the JOEASSIST CV form and must never leak from template samples.
  const personalDetailField = /(?:date\s+of\s+birth|marital\s+status|state\s+of\s+origin|gender|nationality|l\.?\s*g\.?\s*a\.?|language)\s*:?/i;
  const plainText = (markup: string) => markup
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;|&amp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // A table row may contain one or several of the imported fields.
  html = html.replace(/<tr\b[^>]*>[\s\S]*?<\/tr\s*>/gi, row => {
    const text = plainText(row);
    return /personal\s+details/i.test(text) || personalDetailField.test(text) ? '' : row;
  });
  // Word normally wraps each detail in a paragraph; remove the entire paragraph,
  // including cases where multiple details are separated by <br> in one paragraph.
  html = html.replace(/<(p|li)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, block => {
    const text = plainText(block);
    return /^personal\s+details\s*:?$/i.test(text) || personalDetailField.test(text) ? '' : block;
  });
  // Also catch simple, non-nested divs used by some HTML exports without removing
  // larger layout containers that may hold the rest of the CV.
  html = html.replace(/<div\b[^>]*>(?:(?!<(?:div|p|table|section|article|ul|ol)\b)[\s\S])*?<\/div\s*>/gi, block => {
    const text = plainText(block);
    return /^personal\s+details\s*:?$/i.test(text) || personalDetailField.test(text) ? '' : block;
  });
  // Remove a standalone heading if its detail paragraphs have already been stripped.
  html = html.replace(/<(h[1-6]|p|strong|b|span)\b[^>]*>\s*PERSONAL\s+DETAILS\s*:?[\s\u00a0]*<\/\1\s*>/gi, '');

  // Normalize Word/LibreOffice HTML for an on-screen A4 page. Word's print margins
  // and fixed paragraph indents often overflow a browser iframe at screen dimensions.
  const layoutFix = `<style id="joeassist-uploaded-a4">
    html { width: 100%; min-width: 0; box-sizing: border-box; background: #e9eef5; }
    *, *::before, *::after { box-sizing: border-box; }
    body { width: 210mm !important; min-width: 0 !important; max-width: 210mm !important; margin: 0 auto !important; padding: 0 !important; overflow-wrap: anywhere; word-break: normal; background: transparent; }
    body > * { max-width: 100%; }
    p, h1, h2, h3, h4, table, ul, ol, div { max-width: 100%; }
    p, h1, h2, h3, h4 { margin-right: 0 !important; }
    img, table { max-width: 100% !important; }
    table { table-layout: fixed; }
    td, th { overflow-wrap: anywhere; }
    .joeassist-a4-sheet { width: 210mm !important; min-height: 297mm !important; height: 297mm !important; padding: 18mm 12mm 20mm !important; margin: 0 auto 8mm !important; overflow: hidden !important; background: #fff !important; box-shadow: 0 1px 5px #94a3b8; position: relative; }
    .joeassist-a4-sheet::after { content: ''; position: absolute; bottom: 20mm; left: 12mm; right: 12mm; border-top: 1px solid #e5e7eb; pointer-events: none; }
    @page { size: A4 portrait; margin: 0; }
  </style>`;
  if (/<\/head\s*>/i.test(html)) html = html.replace(/<\/head\s*>/i, layoutFix + '</head>');
  else html = layoutFix + html;

  // Bind the static Executive Navy demo sections to the live CV data too.
  // Use RegExp constructors so JSX/TSX transforms cannot misread escaped closing tags.
  if (/Executive Navy Resume/i.test(rawHtml) || /Jameson\s+Caldwell/i.test(rawHtml)) {
    const listItems = (items: string[]) => items.filter(Boolean).map(item => `<li>${escapeTemplateValue(item)}</li>`).join('');
    const skillItems = (cv.skills || []).flatMap(group => (group.items || []).map(item => String(item || '').trim())).filter(Boolean);
    const educationHtml = (cv.education || []).map(item => `
      <div class="mb-4">
        <h4 class="font-bold text-gray-800 text-sm">${escapeTemplateValue([item.degree, item.fieldOfStudy].filter(Boolean).join(' in '))}</h4>
        <p class="text-sm text-gray-600">${escapeTemplateValue(item.institution)}</p>
        <p class="text-xs text-gray-500 italic">${escapeTemplateValue([item.startDate, item.endDate].filter(Boolean).join(' - '))}</p>
      </div>`).join('');
    const experienceHtml = (cv.work_experience || []).map(item => `
      <div class="mb-6">
        <div class="flex justify-between items-baseline mb-1">
          <h4 class="font-bold text-lg text-gray-800">${escapeTemplateValue(item.jobTitle)}</h4>
          <span class="text-sm font-semibold text-gold">${escapeTemplateValue([item.startDate, item.isCurrent ? 'Present' : item.endDate].filter(Boolean).join(' - '))}</span>
        </div>
        <p class="text-sm font-semibold text-gray-600 mb-2">${escapeTemplateValue([item.company, item.location].filter(Boolean).join(' | '))}</p>
        <ul class="text-sm text-gray-700 list-disc list-outside ml-4 space-y-1">${listItems(item.bulletPoints || [])}</ul>
      </div>`).join('');
    const summaryHtml = escapeTemplateValue(cv.summary || '').replace(/\n/g, '<br>');
    html = html.replace(new RegExp('(<h3[^>]*>\\s*Executive Summary\\s*</h3>\\s*<p[^>]*>)[\\s\\S]*?(</p>)', 'i'), `$1${summaryHtml}$2`);
    html = html.replace(new RegExp('(<h3[^>]*>\\s*Core Competencies\\s*</h3>\\s*<ul[^>]*>)[\\s\\S]*?(</ul>)', 'i'), `$1${listItems(skillItems)}$2`);
    html = html.replace(new RegExp('(<h3[^>]*>\\s*Education\\s*</h3>)[\\s\\S]*?(?=\\n\\s*</div>\\s*\\n\\s*</aside>)', 'i'), `$1${educationHtml}`);
    html = html.replace(new RegExp('(<h3[^>]*>\\s*Professional Experience\\s*</h3>)[\\s\\S]*?(?=\\n\\s*</div>\\s*\\n\\s*</main>)', 'i'), `$1${experienceHtml}`);
  }

  // Replace the known demo profile shipped in the Executive Navy sample as well.
  // This is deliberately limited to its exact sample strings; arbitrary uploaded
  // CV text is otherwise left untouched.
  const displayName = String(p.fullName || 'Your Name').trim();
  const nameParts = displayName.split(/\s+/);
  const headerName = nameParts.length > 1
    ? escapeTemplateValue(nameParts[0]) + '<br>' + escapeTemplateValue(nameParts.slice(1).join(' '))
    : escapeTemplateValue(displayName);

  // The demo heading splits the sample name with a <br>, so replace the
  // whole heading rather than trying to match the name as plain text.
  html = html.replace(/(<h1\b[^>]*>)[\s\S]*?(?:JAMESON|CALDWELL)[\s\S]*?(<\/h1>)/i,
    (_match, openTag, closeTag) => openTag + headerName + closeTag);

  const sampleProfile: Array<[RegExp, string]> = [
    [/Senior\s+Operations\s+Executive/gi, escapeTemplateValue(p.professionalTitle || 'Professional Title')],
    [/\+1\s*\(555\)\s*123[-\s]?4567/gi, escapeTemplateValue(p.phone)],
    [/j\.caldwell@email\.com/gi, escapeTemplateValue(p.email)],
    [/Chicago,?\s+IL\s+60601/gi, escapeTemplateValue(p.location)],
    [/linkedin\.com\/in\/jcaldwell/gi, escapeTemplateValue(p.linkedin || '')],
    [/>(\s*)JC(\s*)</g, '>' + escapeTemplateValue(displayName.split(/\s+/).map(part => part[0] || '').join('').slice(0, 2).toUpperCase()) + '<'],
  ];
  for (const [pattern, value] of sampleProfile) {
    if (value) html = html.replace(pattern, value);
  }
  // The uploaded "professional green" template is a static sample, not a placeholder-based template.
  // Bind its existing design blocks to the active CV and restore its custom green theme colors
  // because the template's inline Tailwind configuration is intentionally stripped for safety.
  const isProfessionalGreen = /Professional Green Resume|Olivia Bennett|bg-forest|text-lightgreen/i.test(rawHtml);
  if (isProfessionalGreen) {
    const displayText = (value: unknown) => escapeTemplateValue(String(value ?? '').trim());
    const objectiveText = String(cv.career_objective || cv.summary || '').trim();

    // Keep the source header's typography/layout, but replace the example candidate and role.
    html = html.replace(/(<header\b[\s\S]*?<h1\b[^>]*>)[\s\S]*?(<\/h1>)/i,
      (_match, openTag, closeTag) => openTag + displayText(p.fullName || 'Your Name') + closeTag);
    html = html.replace(/(<header\b[\s\S]*?<h2\b[^>]*>)[\s\S]*?(<\/h2>)/i,
      (_match, openTag, closeTag) => openTag + displayText(p.professionalTitle || '') + closeTag);

    // Replace every example contact item as one unit so none of Olivia's details remain.
    const contactItems = [
      p.phone,
      p.email,
      p.location,
      p.linkedin || p.website || p.github,
    ].map(value => String(value || '').trim()).filter(Boolean);
    const contactHtml = contactItems.map(value => '<span>' + displayText(value) + '</span>').join('<span aria-hidden="true">•</span>');
    html = html.replace(/(<header\b[\s\S]*?<div\b[^>]*class=["'][^"']*border-t border-white\/30[^"']*["'][^>]*>)[\s\S]*?(<\/div>\s*<\/header>)/i,
      (_match, openTag, closeTags) => openTag + contactHtml + closeTags);

    // Keep the softly shaded objective panel; show only the objective/summary saved by this user.
    const objectiveSection = /<section\b[^>]*class=["'][^"']*bg-lightgreen\/30[^"']*["'][^>]*>[\s\S]*?<\/section>/i;
    const objectiveMatch = html.match(objectiveSection);
    if (objectiveMatch) {
      if (objectiveText) {
        const replacement = objectiveMatch[0].replace(/(<p\b[^>]*>)[\s\S]*?(<\/p>)/i,
          (_paragraph, openTag, closeTag) => openTag + displayText(objectiveText).replace(/\n/g, '<br>') + closeTag);
        html = html.replace(objectiveSection, replacement);
      } else {
        html = html.replace(objectiveSection, '');
      }
    }

    // Replace section contents by heading while retaining the template's original section wrapper and heading.
    const replaceGreenSection = (title: string, content: string) => {
      const headingRegex = new RegExp('<h3\\b[^>]*>\\s*' + title.replace(/ /g, '\\s+') + '\\s*</h3>', 'i');
      const headingMatch = headingRegex.exec(html);
      if (!headingMatch || headingMatch.index === undefined) return;
      const sectionStart = html.lastIndexOf('<section', headingMatch.index);
      const headingEnd = headingMatch.index + headingMatch[0].length;
      const sectionCloseStart = html.indexOf('</section>', headingEnd);
      if (sectionStart < 0 || sectionCloseStart < 0) return;
      const sectionEnd = sectionCloseStart + '</section>'.length;
      const sectionOpenEnd = html.indexOf('>', sectionStart) + 1;
      const sectionOpen = html.slice(sectionStart, sectionOpenEnd);
      const sectionReplacement = content.trim()
        ? sectionOpen + headingMatch[0] + content + '</section>'
        : '';
      html = html.slice(0, sectionStart) + sectionReplacement + html.slice(sectionEnd);
    };

    const experienceItems = (cv.work_experience || []).map(item => {
      const role = displayText(item.jobTitle);
      const employer = displayText([item.company, item.location].filter(Boolean).join(' | '));
      const dates = displayText([item.startDate, item.isCurrent ? 'Present' : item.endDate].filter(Boolean).join(' – '));
      const bullets = (item.bulletPoints || []).filter(point => String(point || '').trim())
        .map(point => '<li>' + displayText(point) + '</li>').join('');
      return '<div class="mb-6"><h4 class="font-bold text-lg text-textdark">' + role + '</h4>' +
        '<div class="flex justify-between items-center text-sm font-semibold text-gray-500 mb-2"><span>' + employer +
        '</span><span>' + dates + '</span></div>' +
        (bullets ? '<ul class="text-sm text-gray-700 list-disc list-outside ml-4 space-y-1.5">' + bullets + '</ul>' : '') +
        '</div>';
    }).join('');
    replaceGreenSection('Professional Experience', experienceItems);

    const skillItems = (cv.skills || []).flatMap(group => (group.items || []).map(item => String(item || '').trim()))
      .filter(Boolean);
    const expertiseHtml = skillItems.map(skill =>
      '<div class="flex items-center gap-2 text-sm font-bold text-gray-700 mb-3"><span class="inline-block w-2 h-2 rounded-full bg-forest"></span>' +
      displayText(skill) + '</div>'
    ).join('');
    replaceGreenSection('Expertise', expertiseHtml);

    const educationHtml = (cv.education || []).map(item =>
      '<div class="mb-3"><h4 class="font-bold text-sm text-textdark">' +
      displayText([item.degree, item.fieldOfStudy].filter(Boolean).join(' ')) +
      '</h4><p class="text-sm text-gray-600">' + displayText(item.institution) + '</p>' +
      '<p class="text-xs text-gray-500">' + displayText([item.startDate, item.endDate].filter(Boolean).join(' - ')) +
      '</p></div>'
    ).join('');
    replaceGreenSection('Education', educationHtml);

    const certificationsHtml = (cv.certifications || []).map(item =>
      '<li><span class="font-bold">' + displayText(item.name) + '</span>' +
      (item.issuingOrganization ? ' (' + displayText(item.issuingOrganization) + ')' : '') + '</li>'
    ).join('');
    replaceGreenSection('Certifications', certificationsHtml ? '<ul class="text-sm text-gray-700 space-y-2">' + certificationsHtml + '</ul>' : '');
  }

  const security = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline' https:; font-src data: https:;${needsTailwindRuntime ? " script-src 'unsafe-eval' https://cdn.tailwindcss.com;" : " script-src 'none';"} base-uri 'none'; form-action 'none'">`;
  const tailwindRuntime = needsTailwindRuntime ? '<script src="https://cdn.tailwindcss.com"></script>' : '';
  // The original uploaded "Test" CV uses custom Tailwind theme names (navy,
  // gold and lightgray). Its inline tailwind.config script is intentionally
  // stripped for safety, so provide those theme utilities as static CSS instead.
  const uploadedThemeCss = `<style>
    html, body { width: 210mm !important; max-width: 210mm !important; margin: 0 !important; padding: 0 !important; background: #fff !important; display: block !important; box-sizing: border-box !important; }
    body { font-family: Inter, Arial, sans-serif; overflow-wrap: anywhere; word-wrap: break-word; }
    .bg-navy { background-color: #1B263B !important; }
    .text-navy { color: #1B263B !important; }
    .text-gold { color: #C5A880 !important; }
    .border-gold { border-color: #C5A880 !important; }
    .bg-lightgray { background-color: #F3F4F6 !important; }
    .font-serif { font-family: Georgia, serif !important; }
    .font-sans { font-family: Inter, Arial, sans-serif !important; }
    .page { margin: 0 auto !important; border: 0 !important; outline: 0 !important; }
    /* Static Tailwind-compatible utilities used by the uploaded HTML templates.
       Keeping these styles local avoids executing a third-party CDN script in the preview iframe. */
    .flex { display: flex !important; }
    .flex-1 { flex: 1 1 0% !important; }
    .flex-col { flex-direction: column !important; }
    .items-center { align-items: center !important; }
    .items-baseline { align-items: baseline !important; }
    .justify-between { justify-content: space-between !important; }
    .justify-center { justify-content: center !important; }
    .gap-4 { gap: 1rem !important; }
    .gap-8 { gap: 2rem !important; }
    .w-full { width: 100% !important; }
    .w-2\/3 { width: 66.666667% !important; }
    .w-1\/3 { width: 33.333333% !important; }
    .w-32 { width: 8rem !important; }
    .w-5 { width: 1.25rem !important; }
    .h-full { height: 100% !important; }
    .h-32 { height: 8rem !important; }
    .h-5 { height: 1.25rem !important; }
    .h-1\.5 { height: .375rem !important; }
    .p-6 { padding: 1.5rem !important; }
    .p-8 { padding: 2rem !important; }
    .p-10 { padding: 2.5rem !important; }
    .pb-1 { padding-bottom: .25rem !important; }
    .pb-2 { padding-bottom: .5rem !important; }
    .pt-4 { padding-top: 1rem !important; }
    .pr-8 { padding-right: 2rem !important; }
    .mb-1 { margin-bottom: .25rem !important; }
    .mb-2 { margin-bottom: .5rem !important; }
    .mb-3 { margin-bottom: .75rem !important; }
    .mb-4 { margin-bottom: 1rem !important; }
    .mb-5 { margin-bottom: 1.25rem !important; }
    .mb-6 { margin-bottom: 1.5rem !important; }
    .mb-8 { margin-bottom: 2rem !important; }
    .mt-6 { margin-top: 1.5rem !important; }
    .ml-4 { margin-left: 1rem !important; }
    .mr-3 { margin-right: .75rem !important; }
    .border-r { border-right-width: 1px !important; border-right-style: solid !important; }
    .border-t { border-top-width: 1px !important; border-top-style: solid !important; }
    .border-b-2 { border-bottom-width: 2px !important; border-bottom-style: solid !important; }
    .border-4 { border-width: 4px !important; border-style: solid !important; }
    .border-gray-200 { border-color: #e5e7eb !important; }
    .rounded-md { border-radius: .375rem !important; }
    .rounded-full { border-radius: 9999px !important; }
    .shadow-lg { box-shadow: 0 10px 15px -3px rgb(0 0 0 / .1), 0 4px 6px -4px rgb(0 0 0 / .1) !important; }
    .overflow-hidden { overflow: hidden !important; }
    .object-cover { object-fit: cover !important; }
    .list-disc { list-style-type: disc !important; }
    .list-inside { list-style-position: inside !important; }
    .list-outside { list-style-position: outside !important; }
    .space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: .25rem !important; }
    .space-y-2 > :not([hidden]) ~ :not([hidden]) { margin-top: .5rem !important; }
    .space-y-3 > :not([hidden]) ~ :not([hidden]) { margin-top: .75rem !important; }
    .space-y-1\.5 > :not([hidden]) ~ :not([hidden]) { margin-top: .375rem !important; }
    .font-light { font-weight: 300 !important; }
    .font-medium { font-weight: 500 !important; }
    .font-semibold { font-weight: 600 !important; }
    .font-bold { font-weight: 700 !important; }
    .italic { font-style: italic !important; }
    .uppercase { text-transform: uppercase !important; }
    .text-center { text-align: center !important; }
    .text-justify { text-align: justify !important; }
    .text-xs { font-size: .75rem !important; line-height: 1rem !important; }
    .text-sm { font-size: .875rem !important; line-height: 1.25rem !important; }
    .text-lg { font-size: 1.125rem !important; line-height: 1.75rem !important; }
    .text-xl { font-size: 1.25rem !important; line-height: 1.75rem !important; }
    .text-2xl { font-size: 1.5rem !important; line-height: 2rem !important; }
    .text-4xl { font-size: 2.25rem !important; line-height: 2.5rem !important; }
    .text-5xl { font-size: 3rem !important; line-height: 1 !important; }
    .leading-relaxed { line-height: 1.625 !important; }
    .tracking-wider { letter-spacing: .05em !important; }
    .tracking-widest { letter-spacing: .1em !important; }
    .bg-gray-200 { background-color: #e5e7eb !important; }
    .bg-lightgray { background-color: #f3f4f6 !important; }
    .text-gray-500 { color: #6b7280 !important; }
    .text-gray-600 { color: #4b5563 !important; }
    .text-gray-700 { color: #374151 !important; }
    .text-gray-800 { color: #1f2937 !important; }
    \` : ''}
    \${isProfessionalGreen ? \`
    body { font-family: 'Source Sans Pro', Arial, sans-serif !important; }
    .font-serif { font-family: 'Merriweather', Georgia, serif !important; }
    .font-sans { font-family: 'Source Sans Pro', Arial, sans-serif !important; }
    .bg-forest { background-color: #2d6a4f !important; }
    .text-forest { color: #2d6a4f !important; }
    .border-forest { border-color: #2d6a4f !important; }
    .bg-lightgreen { background-color: #d8f3dc !important; }
    [class~="bg-lightgreen/30"] { background-color: rgba(216, 243, 220, .3) !important; }
    .text-lightgreen { color: #d8f3dc !important; }
    .text-textdark { color: #1b4332 !important; }
    [class~="border-white/30"] { border-color: rgba(255, 255, 255, .3) !important; }
    ` : ''}
  </style>`;
  if (/<head[^>]*>/i.test(html)) html = html.replace(/<head([^>]*)>/i, `<head$1>${security}${tailwindRuntime}${uploadedThemeCss}`);
  else html = `<!doctype html><html><head>${security}<meta charset="utf-8">${tailwindRuntime}${uploadedThemeCss}</head><body>${html}</body></html>`;
  return html;
}

const UploadedHtmlTemplateRenderer: React.FC<{ cv: CVDocument; scale: number; printMode: boolean }> = ({ cv, scale, printMode }) => {
  const [html, setHtml] = useState('');
  const [loadError, setLoadError] = useState('');
  const [frameReady, setFrameReady] = useState(false);
  const [documentHeight, setDocumentHeight] = useState(1122);
  const [pageCount, setPageCount] = useState(1);
  const frameRef = React.useRef<HTMLIFrameElement>(null);
  const cvSignature = JSON.stringify(cv);
  useEffect(() => {
    let active = true;
    setLoadError('');
    setHtml('');
    setFrameReady(false);
    setDocumentHeight(1122);
    setPageCount(1);
    const slug = cv.template_id.replace(/^uploaded_/, '');
    void supabase.from('custom_html_templates').select('html_content').eq('slug', slug).eq('is_active', true).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data?.html_content) setLoadError('This uploaded template is unavailable or has been unpublished.');
        else setHtml(prepareUploadedHtml(data.html_content, cv));
      });
    return () => { active = false; };
  }, [cv.template_id, cvSignature]);
  const measureDocument = () => {
    const doc = frameRef.current?.contentDocument;
    if (!doc?.body || doc.body.dataset.joeassistPaginated === 'true') {
      if (doc?.body) setFrameReady(true);
      return;
    }
    const body = doc.body;
    const root = doc.documentElement;
    const children = Array.from(body.children).filter((node) => !(node as HTMLElement).classList?.contains('joeassist-a4-sheet'));
    if (children.length) {
      body.dataset.joeassistPaginated = 'true';
      const originalNodes = children.map((node) => node as HTMLElement);
      const sheetHeight = 297 * 96 / 25.4;
      const contentLimit = 297 * 96 / 25.4 - (38 * 96 / 25.4);
      let sheet: HTMLDivElement | null = null;
      let usedHeight = 0;
      let count = 0;
      const makeSheet = () => {
        const page = doc.createElement('div');
        page.className = 'joeassist-a4-sheet';
        body.appendChild(page);
        sheet = page;
        usedHeight = 0;
        count++;
      };
      for (const node of originalNodes) {
        const height = Math.max(node.getBoundingClientRect().height, node.offsetHeight, 1);
        if (!sheet || (usedHeight > 0 && usedHeight + height > contentLimit)) makeSheet();
        sheet!.appendChild(node);
        usedHeight += height;
      }
      setPageCount(Math.max(1, count));
      // Each sheet is a true A4-sized surface; the iframe contains every page.
      const height = Math.max(body.scrollHeight, root.scrollHeight, count * sheetHeight);
      setDocumentHeight(height);
    } else {
      setDocumentHeight(Math.max(body.scrollHeight, root.scrollHeight, 1122));
      setPageCount(1);
    }
    setFrameReady(true);
  };
  if (loadError) return <div className="m-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{loadError}</div>;
  if (!html) return <div className="m-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">Loading uploaded HTML template…</div>;
  const frameHeight = Math.max(1122, documentHeight);
  return <div id="cv-printable-area" className="mx-auto border-0 shadow-none" style={{ width: '210mm', maxWidth: '210mm', boxSizing: 'border-box', border: 0, outline: 'none', boxShadow: 'none', transform: printMode ? 'none' : `scale(${scale})`, transformOrigin: 'top left', overflow: 'visible', overflowWrap: 'anywhere', position: 'relative' }}>
    {!frameReady && <div className="absolute z-10 m-3 rounded bg-white/95 px-3 py-2 text-xs text-gray-600 shadow">Loading uploaded CV styles…</div>}
    {frameReady && !printMode && <div aria-live="polite" className="sticky top-0 z-20 ml-auto w-fit rounded-bl-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white shadow">{pageCount} {pageCount === 1 ? 'page' : 'pages'} · A4 preview</div>}
    <iframe ref={frameRef} title="Uploaded CV template preview" onLoad={() => window.requestAnimationFrame(measureDocument)} sandbox="allow-same-origin" srcDoc={html} style={{ width: '210mm', height: `${frameHeight}px`, minHeight: '297mm', border: 0, outline: 'none', display: 'block', background: '#e9eef5', overflow: 'visible' }} />
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
          ...({ '--cv-primary-color': cv.styling?.primaryColor || '#1e3a8a' } as React.CSSProperties),
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
                {exp.startDate} - {(exp.isCurrent || exp.endDate.trim().toLowerCase() === 'present') ? 'Present' : exp.endDate}
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
          ...({ '--cv-primary-color': primaryColor } as React.CSSProperties),
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
          ...({ '--cv-primary-color': primaryColor } as React.CSSProperties),
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
          ...({ '--cv-primary-color': primaryColor } as React.CSSProperties),
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
          ...({ '--cv-primary-color': primaryColor } as React.CSSProperties),
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
          ...({ '--cv-primary-color': primaryColor } as React.CSSProperties),
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
          ...({ '--cv-primary-color': primaryColor } as React.CSSProperties),
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
