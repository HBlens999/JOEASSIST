import React, { useState } from 'react';
import { authenticatedFetch } from '../lib/authenticatedFetch';
import { useEntitlements } from '../context/EntitlementsContext';
import jsPDF from 'jspdf';
import { Sparkles, Download, Copy, Check, Printer } from 'lucide-react';

interface CoverLetterPageProps {
  setCurrentTab: (tab: string) => void;
}

const todayISO = () => {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const displayDate = (value: string) => {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const CoverLetterPage: React.FC<CoverLetterPageProps> = () => {
  const { isWatermarkFree, checkCanUseAI, recordAIUsage } = useEntitlements();

  const [applicantName, setApplicantName] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantAddress, setApplicantAddress] = useState('');
  const [letterDate, setLetterDate] = useState(todayISO());
  const [recipientName, setRecipientName] = useState('');
  const [recipientTitle, setRecipientTitle] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [salutation, setSalutation] = useState('Dear Hiring Manager,');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [subjectStyle, setSubjectStyle] = useState('application');
  const [customSubject, setCustomSubject] = useState('');
  const [leaveSignatureSpace, setLeaveSignatureSpace] = useState(true);
  const [tone, setTone] = useState('Professional and formal');
  const [length, setLength] = useState('Medium (3-4 paragraphs)');
  const [userBackground, setUserBackground] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [letterContent, setLetterContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const subjectLine = subjectStyle === 'plain'
    ? 'LETTER OF APPLICATION'
    : subjectStyle === 'custom'
      ? customSubject.trim() || 'LETTER OF APPLICATION'
      : `APPLICATION FOR THE POSITION OF ${jobTitle.trim() || '[JOB TITLE]'}`;

  const assembledLetter = [
    applicantName.trim(),
    applicantPhone.trim(),
    applicantEmail.trim(),
    applicantAddress.trim(),
    displayDate(letterDate),
    recipientName.trim(),
    recipientTitle.trim(),
    recipientAddress.trim(),
    salutation.trim(),
    subjectLine,
    letterContent.trim(),
    'Yours faithfully,',
    leaveSignatureSpace ? '\n\n' : '',
    applicantName.trim(),
    applicantPhone.trim(),
  ].filter(Boolean).join('\n');

  const handleGenerate = async () => {
    if (!checkCanUseAI()) return;
    if (!applicantName.trim() || !applicantPhone.trim() || !applicantAddress.trim()) {
      setAiError('Please enter your name, phone number, and address before generating the letter.');
      return;
    }
    if (!jobTitle.trim()) {
      setAiError('Please enter the job title you are applying for.');
      return;
    }
    setIsGenerating(true);
    setAiError('');
    try {
      const res = await authenticatedFetch('/api/gemini/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicantName,
          applicantEmail,
          applicantPhone,
          applicantAddress,
          letterDate,
          recipientName,
          recipientTitle,
          recipientAddress,
          salutation,
          subjectLine,
          leaveSignatureSpace,
          jobTitle,
          companyName,
          hiringManager: recipientName || recipientTitle || 'Hiring Manager',
          jobDescription,
          userExperience: userBackground,
          tone,
          length,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAiError(data.message || data.error || `The selected model could not generate the letter (HTTP ${res.status}). Please try Model 2 or try again shortly.`);
        return;
      }
      const generatedBody = typeof data?.data?.content === 'string' ? data.data.content.trim() : '';
      if (data.success && generatedBody) {
        setLetterContent(generatedBody);
        recordAIUsage();
      } else {
        setAiError('The selected model returned no letter text. Please try the other model or try again.');
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Could not connect to the selected AI model. Please check your connection and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(assembledLetter);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setAiError('Copy was blocked by your browser. Select the letter text and copy it manually.');
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    setAiError('');
    try {
      // Build a real text-based PDF instead of screenshotting the preview DOM.
      // This avoids blank exports caused by canvas/CSS rendering differences.
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 22;
      const contentWidth = pageWidth - margin * 2;
      const filename = `Cover_Letter_${(companyName || jobTitle || 'Application').replace(/[^a-z0-9-_]+/gi, '_')}.pdf`;
      let y = 20;
      const addWrapped = (text: string, x: number, width: number, lineHeight = 6, align: 'left' | 'center' | 'right' = 'left') => {
        const lines = pdf.splitTextToSize(text, width) as string[];
        for (const line of lines) {
          if (y > pageHeight - 22) {
            pdf.addPage();
            y = 22;
          }
          pdf.text(line, x, y, { align });
          y += lineHeight;
        }
      };

      pdf.setTextColor(25, 25, 25);
      pdf.setFont('times', 'normal');
      pdf.setFontSize(10.5);

      // Applicant contact block and date, aligned to the top right.
      pdf.setFont('times', 'bold');
      addWrapped(applicantName.trim() || 'Your full name', pageWidth - margin, contentWidth, 5, 'right');
      pdf.setFont('times', 'normal');
      [applicantPhone, applicantEmail, applicantAddress].filter(Boolean).forEach(value => {
        String(value).split(/\\r?\\n/).forEach(line => addWrapped(line, pageWidth - margin, contentWidth, 5, 'right'));
      });
      if (letterDate) {
        y += 2;
        addWrapped(displayDate(letterDate), pageWidth - margin, contentWidth, 5, 'right');
      }

      y += 12;
      pdf.setFontSize(10.5);
      pdf.setFont('times', 'bold');
      if (recipientName.trim()) addWrapped(recipientName.trim(), margin, contentWidth, 5);
      pdf.setFont('times', 'normal');
      if (recipientTitle.trim()) addWrapped(recipientTitle.trim(), margin, contentWidth, 5);
      if (recipientAddress.trim()) recipientAddress.split(/\\r?\\n/).forEach(line => addWrapped(line, margin, contentWidth, 5));

      y += 10;
      addWrapped(salutation.trim(), margin, contentWidth, 6);
      y += 3;
      pdf.setFont('times', 'bold');
      pdf.setFontSize(11);
      const subjectLines = pdf.splitTextToSize(subjectLine.toUpperCase(), contentWidth) as string[];
      subjectLines.forEach(line => {
        if (y > pageHeight - 22) { pdf.addPage(); y = 22; }
        pdf.text(line, pageWidth / 2, y, { align: 'center' });
        y += 6;
      });
      y += 5;
      pdf.setFont('times', 'normal');
      pdf.setFontSize(11);
      const paragraphs = letterContent.trim().split(/\\n\\s*\\n/).filter(Boolean);
      for (const paragraph of paragraphs) {
        const lines = pdf.splitTextToSize(paragraph.replace(/\\n/g, ' '), contentWidth) as string[];
        for (const line of lines) {
          if (y > pageHeight - 24) { pdf.addPage(); y = 22; }
          pdf.text(line, margin, y);
          y += 6;
        }
        y += 3;
      }
      y += 7;
      if (y > pageHeight - 35) { pdf.addPage(); y = 22; }
      addWrapped('Yours faithfully,', margin, contentWidth, 6);
      if (leaveSignatureSpace) y += 18;
      pdf.setFont('times', 'bold');
      addWrapped(applicantName.trim() || 'Your full name', margin, contentWidth, 6);
      pdf.setFont('times', 'normal');
      if (applicantPhone.trim()) addWrapped(applicantPhone.trim(), margin, contentWidth, 6);

      if (!isWatermarkFree) {
        const pages = pdf.getNumberOfPages();
        for (let page = 1; page <= pages; page++) {
          pdf.setPage(page);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(150, 150, 150);
          pdf.text('Generated with JOEASSIST Free Starter', pageWidth / 2, pageHeight - 7, { align: 'center' });
        }
      }

      pdf.save(filename);
    } catch (error) {
      console.error('Cover letter PDF export failed:', error);
      setAiError('Could not create the PDF. Please try again. If it continues, reload the page and retry.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    setAiError('');
    // Print a clean, standalone document so application layout/CSS cannot hide the letter.
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      setAiError('Your browser blocked the print preview. Allow pop-ups for this site and try again.');
      return;
    }
    const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const lines = (value: string) => esc(value).replace(/\\r?\\n/g, '<br>');
    const paragraphHtml = letterContent.trim()
      ? letterContent.trim().split(/\\n\\s*\\n/).map(p => `<p>${lines(p).replace(/\\n/g, '<br>')}</p>`).join('')
      : '<p></p>';
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Cover Letter</title><style>
      @page{size:A4;margin:20mm}*{box-sizing:border-box}body{font-family:"Times New Roman",serif;color:#111;font-size:12pt;line-height:1.5;margin:0}
      .applicant{text-align:right;font-family:Arial,sans-serif;font-size:10pt}.recipient{margin-top:30px;font-family:Arial,sans-serif;font-size:10pt}
      .salutation{margin-top:30px}.subject{text-align:center;font-weight:bold;text-decoration:underline;text-transform:uppercase;margin:18px 0}
      .body p{margin:0 0 12px;text-align:justify;white-space:normal}.closing{margin-top:26px}.signature{height:65px}
      @media screen{body{max-width:170mm;margin:20px auto;padding:20mm;box-shadow:0 0 8px #bbb;min-height:257mm}}
    </style></head><body>
      <div class="applicant"><strong>${esc(applicantName || 'Your full name')}</strong><br>${[applicantPhone, applicantEmail, applicantAddress, displayDate(letterDate)].filter(Boolean).map(lines).join('<br>')}</div>
      <div class="recipient">${[recipientName, recipientTitle, recipientAddress].filter(Boolean).map(v => `<div>${lines(v)}</div>`).join('')}</div>
      <div class="salutation">${lines(salutation)}</div><div class="subject">${esc(subjectLine)}</div>
      <div class="body">${paragraphHtml}</div>
      <div class="closing">Yours faithfully,<div class="signature">${leaveSignatureSpace ? '' : ''}</div><strong>${esc(applicantName || 'Your full name')}</strong><br>${esc(applicantPhone)}</div>
      ${!isWatermarkFree ? '<footer style="margin-top:25px;text-align:center;color:#999;font:8pt Arial">Generated with JOEASSIST Free Starter</footer>' : ''}
      <script>window.addEventListener('load',function(){setTimeout(function(){window.focus();window.print();},300);});window.addEventListener('afterprint',function(){window.close();});</script>
      </body></html>`);
    printWindow.document.close();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="text-center max-w-3xl mx-auto space-y-3 no-print">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">AI Cover Letter Generator</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Create a Professional Application Letter</h1>
        <p className="text-sm text-gray-600">Enter your own details and preview a properly formatted letter before printing or exporting it.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto no-print">
        <section className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <h2 className="font-bold text-gray-900 text-sm border-b pb-2">1. Your Contact Details</h2>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase">Your full name *</label>
            <input value={applicantName} onChange={e => setApplicantName(e.target.value)} className="w-full mt-1 p-2.5 text-sm border rounded-lg" placeholder="Enter your full name" autoComplete="name" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase">Phone number *</label>
              <input value={applicantPhone} onChange={e => setApplicantPhone(e.target.value)} className="w-full mt-1 p-2.5 text-sm border rounded-lg" placeholder="Your phone number" autoComplete="tel" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase">Email (optional)</label>
              <input type="email" value={applicantEmail} onChange={e => setApplicantEmail(e.target.value)} className="w-full mt-1 p-2.5 text-sm border rounded-lg" placeholder="you@example.com" autoComplete="email" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase">Your address *</label>
            <textarea rows={2} value={applicantAddress} onChange={e => setApplicantAddress(e.target.value)} className="w-full mt-1 p-2.5 text-sm border rounded-lg" placeholder="House number, street, town/city, state" autoComplete="street-address" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase">Date to appear on the letter *</label>
            <input type="date" value={letterDate} onChange={e => setLetterDate(e.target.value)} className="w-full mt-1 p-2.5 text-sm border rounded-lg" />
          </div>

          <h2 className="font-bold text-gray-900 text-sm border-b pb-2 pt-2">2. Receiver and Application</h2>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase">Receiver / organisation</label>
            <input value={recipientName} onChange={e => setRecipientName(e.target.value)} className="w-full mt-1 p-2.5 text-sm border rounded-lg" placeholder="e.g. The Recruitment Manager" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase">Receiver's title / department (optional)</label>
            <input value={recipientTitle} onChange={e => setRecipientTitle(e.target.value)} className="w-full mt-1 p-2.5 text-sm border rounded-lg" placeholder="e.g. Human Resources Department" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase">Receiver's address</label>
            <textarea rows={2} value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} className="w-full mt-1 p-2.5 text-sm border rounded-lg" placeholder="Organisation address, city, state" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase">Salutation</label>
            <select value={salutation} onChange={e => setSalutation(e.target.value)} className="w-full mt-1 p-2.5 text-sm border rounded-lg bg-white">
              <option>Dear Sir,</option>
              <option>Dear Madam,</option>
              <option>Dear Sir/Madam,</option>
              <option>Dear Hiring Manager,</option>
              <option>Dear Recruitment Manager,</option>
              <option>Dear Hiring Committee,</option>
              <option>Dear Selection Committee,</option>
              <option>Dear [Recipient Name],</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase">Application subject / subtitle</label>
            <select value={subjectStyle} onChange={e => setSubjectStyle(e.target.value)} className="w-full mt-1 p-2.5 text-sm border rounded-lg bg-white">
              <option value="application">Application for the position of [job title]</option>
              <option value="plain">Letter of Application</option>
              <option value="custom">Write my own subject</option>
            </select>
            {subjectStyle === 'custom' && <input value={customSubject} onChange={e => setCustomSubject(e.target.value)} className="w-full mt-2 p-2.5 text-sm border rounded-lg" placeholder="Enter your subject line" />}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase">Job title *</label>
            <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="w-full mt-1 p-2.5 text-sm border rounded-lg" placeholder="e.g. Administrative Officer" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase">Company / organisation (optional)</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full mt-1 p-2.5 text-sm border rounded-lg" placeholder="Organisation name" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase">Your qualifications and experience</label>
            <textarea rows={4} value={userBackground} onChange={e => setUserBackground(e.target.value)} placeholder="Education, experience, skills, achievements and relevant details. Do not include anything you cannot verify." className="w-full mt-1 p-2.5 text-sm border rounded-lg" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-600 uppercase">Job advert / requirements (optional)</label>
            <textarea rows={3} value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Paste the job description to tailor the letter." className="w-full mt-1 p-2.5 text-sm border rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase">Writing tone</label>
              <select value={tone} onChange={e => setTone(e.target.value)} className="w-full mt-1 p-2.5 text-sm border rounded-lg bg-white">
                <option>Professional and formal</option>
                <option>Confident and persuasive</option>
                <option>Warm and enthusiastic</option>
                <option>Traditional and respectful</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-600 uppercase">Letter length</label>
              <select value={length} onChange={e => setLength(e.target.value)} className="w-full mt-1 p-2.5 text-sm border rounded-lg bg-white">
                <option>Short (2-3 paragraphs)</option>
                <option>Medium (3-4 paragraphs)</option>
                <option>Detailed (4-5 paragraphs)</option>
              </select>
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={leaveSignatureSpace} onChange={e => setLeaveSignatureSpace(e.target.checked)} className="mt-1" />
            <span><strong>Leave space for my handwritten signature</strong><span className="block text-xs text-gray-500 mt-0.5">If unchecked, the letter will show “Yours faithfully” followed by your name and phone number without a blank signature gap.</span></span>
          </label>
          <button onClick={handleGenerate} disabled={isGenerating} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50">
            <Sparkles className="w-4 h-4" />{isGenerating ? 'Generating your letter…' : 'Generate Cover Letter'}
          </button>
          {isGenerating && <p className="text-xs text-blue-700" role="status">The selected AI model is working. Please keep this page open.</p>}
          {aiError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{aiError}</div>}
        </section>

        <section className="lg:col-span-7 space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2 bg-white px-4 py-3 rounded-xl border border-gray-200">
            <span className="text-sm font-bold text-gray-700">Letter Preview</span>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleCopy} className="px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 border border-gray-200">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Copied!' : 'Copy Letter'}
              </button>
              <button onClick={handlePrint} className="px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 border border-gray-200">
                <Printer className="w-3.5 h-3.5" />Print
              </button>
              <button onClick={handleExportPDF} disabled={isExporting} className="px-3 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                <Download className="w-3.5 h-3.5" />{isExporting ? 'Exporting…' : 'Export PDF'}
              </button>
            </div>
          </div>

          <div className="bg-slate-100 p-3 sm:p-5 rounded-2xl border border-gray-200 flex justify-center overflow-x-auto">
            <article id="cover-letter-printable" className="bg-white p-8 sm:p-12 shadow-xl rounded-lg w-[210mm] min-h-[297mm] text-gray-900 font-serif leading-relaxed text-sm">
              <header className="text-right font-sans text-xs text-gray-700 whitespace-pre-line">
                <p className="font-bold text-gray-900 text-sm">{applicantName || 'Your full name'}</p>
                {applicantPhone && <p>{applicantPhone}</p>}
                {applicantEmail && <p>{applicantEmail}</p>}
                <p className="whitespace-pre-line">{applicantAddress || 'Your address will appear here'}</p>
                {letterDate && <p className="mt-2">{displayDate(letterDate)}</p>}
              </header>

              <section className="mt-7 text-left font-sans text-xs text-gray-800 whitespace-pre-line">
                {recipientName && <p className="font-bold">{recipientName}</p>}
                {recipientTitle && <p>{recipientTitle}</p>}
                {recipientAddress && <p>{recipientAddress}</p>}
              </section>

              <p className="mt-7 mb-4">{salutation}</p>
              <h2 className="text-center font-bold uppercase underline underline-offset-4 mb-5">{subjectLine}</h2>

              <div className="min-h-[280px] whitespace-pre-wrap text-justify">
                {letterContent ? (
                  <textarea
                    aria-label="Edit the generated letter body"
                    value={letterContent}
                    onChange={e => setLetterContent(e.target.value)}
                    rows={Math.max(12, Math.min(28, letterContent.split('\n').length + 4))}
                    className="w-full min-h-[280px] p-0 border-0 focus:outline-none resize-y bg-transparent font-serif text-sm leading-relaxed text-gray-900"
                  />
                ) : (
                  <p className="text-gray-400 italic font-sans text-xs no-print">Your letter body will appear here after you complete the form and select Generate Cover Letter.</p>
                )}
              </div>

              <div className="mt-6 whitespace-pre-line">
                <p>Yours faithfully,</p>
                {leaveSignatureSpace && <div className="h-16" aria-label="Space for handwritten signature" />}
                <p className="font-bold">{applicantName || 'Your full name'}</p>
                {applicantPhone && <p>{applicantPhone}</p>}
              </div>

              {!isWatermarkFree && <p className="mt-8 pt-4 border-t text-[10px] text-gray-400 text-center font-sans">Generated with JOEASSIST Free Starter • Upgrade to remove watermark</p>}
            </article>
          </div>
        </section>
      </div>
    </div>
  );
};
