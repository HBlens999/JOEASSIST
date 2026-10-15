import React, { useState } from 'react';
import { CoverLetterDocument } from '../types/business';
import { useEntitlements } from '../context/EntitlementsContext';
import { exportElementToPDF } from '../lib/pdfExport';
import { 
  Sparkles, Download, Copy, Check, Save, FileText, ArrowRight, Printer 
} from 'lucide-react';

interface CoverLetterPageProps {
  setCurrentTab: (tab: string) => void;
}

export const CoverLetterPage: React.FC<CoverLetterPageProps> = ({ setCurrentTab }) => {
  const { isWatermarkFree, checkCanUseAI, recordAIUsage } = useEntitlements();

  const [jobTitle, setJobTitle] = useState('Senior Full Stack Developer');
  const [companyName, setCompanyName] = useState('Apex Technologies');
  const [hiringManager, setHiringManager] = useState('Hiring Committee');
  const [tone, setTone] = useState('Confident & Professional');
  const [length, setLength] = useState('Medium (3-4 paragraphs)');
  const [userBackground, setUserBackground] = useState('6+ years building full stack web applications with TypeScript, React, Node.js, and cloud systems.');
  const [jobDescription, setJobDescription] = useState('Looking for an experienced full stack engineer with cloud, database optimization, and team leadership experience.');

  const [letterContent, setLetterContent] = useState(`Dear Hiring Committee,

I am writing to express my strong enthusiasm for the Senior Full Stack Developer position at Apex Technologies. With over 6 years of experience architecting high-throughput web applications and leading engineering initiatives, I am eager to contribute to your technical innovations.

Throughout my career, I have focused on building performant software architectures using TypeScript, React, and PostgreSQL. At my previous roles, I spearheaded microservice optimizations that reduced cloud latency by over 40% while ensuring 99.99% system availability. Furthermore, I have mentored multiple engineering squads to adopt rigorous automated testing and scalable API designs.

What excites me most about Apex Technologies is your commitment to engineering excellence and user-centric problem solving. I am confident that my background in distributed systems and hands-on execution will allow me to deliver immediate value to your development pipeline.

Thank you for your time and consideration. I welcome the opportunity to discuss how my qualifications align with your engineering milestones.

Warm regards,
Joseph Chiemezie`);

  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleGenerate = async () => {
    if (!checkCanUseAI()) return;
    setIsGenerating(true);

    try {
      const res = await fetch('/api/gemini/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle,
          companyName,
          hiringManager,
          jobDescription,
          userExperience: userBackground,
          tone,
          length,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.data.content) {
        setLetterContent(data.data.content);
        recordAIUsage();
      }
    } catch {
      // Keep default
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(letterContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportElementToPDF('cover-letter-printable', {
        filename: `Cover_Letter_${companyName.replace(/\s+/g, '_')}.pdf`,
        isWatermarkFree,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
          AI Cover Letter Generator
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          High-Converting Cover Letters in Minutes
        </h1>
        <p className="text-sm text-gray-600">
          Tailored to your specific target company and job description without generic clichés or fabricated facts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto">
        {/* Left: Configuration Form */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <h3 className="font-bold text-gray-900 text-sm border-b pb-2">Target Job & Company</h3>

          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase">Target Job Title</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full mt-1 p-2 text-xs border rounded-lg"
              placeholder="e.g. Product Manager"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase">Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full mt-1 p-2 text-xs border rounded-lg"
              placeholder="e.g. Flutterwave, Paystack, Google"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase">Hiring Manager / Team</label>
            <input
              type="text"
              value={hiringManager}
              onChange={(e) => setHiringManager(e.target.value)}
              className="w-full mt-1 p-2 text-xs border rounded-lg"
              placeholder="e.g. Mrs. Adeyemi or Hiring Committee"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-bold text-gray-600 uppercase">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full mt-1 p-2 text-xs border rounded-lg bg-white"
              >
                <option>Confident & Professional</option>
                <option>Enthusiastic & Modern</option>
                <option>Traditional & Formal</option>
                <option>Creative & Bold</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-600 uppercase">Length</label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="w-full mt-1 p-2 text-xs border rounded-lg bg-white"
              >
                <option>Short (2-3 paragraphs)</option>
                <option>Medium (3-4 paragraphs)</option>
                <option>Detailed (4-5 paragraphs)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-600 uppercase">Your Background Highlights</label>
            <textarea
              rows={3}
              value={userBackground}
              onChange={(e) => setUserBackground(e.target.value)}
              placeholder="Summarize your key qualifications..."
              className="w-full mt-1 p-2 text-xs border rounded-lg"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? 'Drafting with Gemini AI...' : 'Generate Cover Letter Draft'}
          </button>
        </div>

        {/* Right: Document Preview & Editor */}
        <div className="lg:col-span-7 space-y-3">
          {/* Action Bar */}
          <div className="flex justify-between items-center bg-white px-4 py-2.5 rounded-xl border border-gray-200">
            <span className="text-xs font-bold text-gray-700">Cover Letter Document</span>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-1.5 border border-gray-200"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>

              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Exporting...' : 'Export PDF'}</span>
              </button>
            </div>
          </div>

          {/* Printable Letter Canvas */}
          <div className="bg-slate-100 p-4 rounded-2xl border border-gray-200 flex justify-center overflow-x-auto">
            <div
              id="cover-letter-printable"
              className="bg-white p-8 sm:p-12 shadow-xl rounded-lg w-[210mm] min-h-[297mm] text-gray-900 font-serif leading-relaxed text-xs sm:text-sm"
              style={{ transformOrigin: 'top center' }}
            >
              <div className="border-b pb-4 mb-6 text-right font-sans text-xs text-gray-500">
                <p className="font-bold text-gray-900 text-sm">Joseph Chiemezie</p>
                <p>08039448648 • josepchiemezie@gmail.com</p>
                <p>Lagos, Nigeria</p>
                <p className="mt-2 text-gray-400">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>

              <textarea
                value={letterContent}
                onChange={(e) => setLetterContent(e.target.value)}
                rows={18}
                className="w-full p-2 border-transparent hover:border-gray-300 focus:border-blue-600 focus:outline-none rounded resize-none bg-transparent font-serif leading-relaxed"
              />

              {!isWatermarkFree && (
                <div className="mt-8 pt-4 border-t text-[10px] text-gray-400 text-center font-sans">
                  Generated with JOEASSIST Free Starter • Upgrade to remove watermark
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
