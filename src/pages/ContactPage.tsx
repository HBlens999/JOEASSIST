import React, { useState } from 'react';
import { Phone, Mail, MapPin, Send, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('General Support & Feedback');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      setErrorMsg('Please fill in your name, email, and message.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject, message }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTicketResult(data.ticketId || 'SUP-RECEIVED');
        setName('');
        setEmail('');
        setPhone('');
        setMessage('');
      } else {
        setErrorMsg(data.error || 'Failed to submit inquiry.');
      }
    } catch {
      setErrorMsg('Could not submit ticket. Please reach out directly to 08039448648.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">
          Always Here to Assist
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          Help & Direct Support Desk
        </h1>
        <p className="text-sm text-gray-600">
          Have questions regarding CV templates, payments, or custom enterprise requirements? 
          Reach out to Joseph Chiemezie and our support team.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Contact Info Card */}
        <div className="md:col-span-5 bg-slate-900 text-white rounded-3xl p-8 shadow-xl space-y-6">
          <div>
            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Direct Contact</span>
            <h3 className="text-2xl font-extrabold text-white mt-1">Get in Touch</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              We respond promptly to job seekers, freelancers, and business owners across Nigeria.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-200">Phone & WhatsApp Support</p>
                <a href="tel:08039448648" className="text-blue-300 hover:text-white font-mono text-sm block mt-0.5">
                  08039448648
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-200">Official Support Email</p>
                <a href="mailto:josepchiemezie@gmail.com" className="text-blue-300 hover:text-white text-xs block mt-0.5">
                  josepchiemezie@gmail.com
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-200">Support Hours</p>
                <p className="text-slate-300 text-xs mt-0.5">Monday – Saturday: 8:00 AM – 8:00 PM (WAT)</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 text-xs text-slate-300 space-y-1">
            <p className="font-bold text-white">Founder:</p>
            <p>Joseph Chiemezie</p>
            <p className="text-[11px] text-slate-400">Software Engineer & Technology Entrepreneur</p>
          </div>
        </div>

        {/* Support Request Form */}
        <div className="md:col-span-7 bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-4">
          <h3 className="font-bold text-gray-900 text-base border-b pb-3">Submit a Support Ticket</h3>

          {ticketResult ? (
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3 animate-in fade-in">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-emerald-950 text-base">Inquiry Successfully Received!</h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Your ticket reference is <strong className="font-mono">{ticketResult}</strong>. 
                Joseph Chiemezie and the team will get back to you via your email or phone shortly.
              </p>
              <button
                onClick={() => setTicketResult(null)}
                className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 uppercase block mb-1">Your Full Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Chinedu Okafor"
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 uppercase block mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="e.g. chinedu@example.com"
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 uppercase block mb-1">Phone Number (Optional)</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 08012345678"
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 uppercase block mb-1">Category / Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full p-2.5 border rounded-xl bg-white"
                  >
                    <option>General Support & Feedback</option>
                    <option>Paystack / Bank Transfer Payment</option>
                    <option>CV Template Custom Request</option>
                    <option>ATS Checker Inquiries</option>
                    <option>Business Document Question</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 uppercase block mb-1">Detailed Message *</label>
                <textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  placeholder="Describe your question, request, or issue in detail..."
                  className="w-full p-2.5 border rounded-xl leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Sending inquiry...' : 'Send Message to Support'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
