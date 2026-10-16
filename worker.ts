import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GEMINI_API_KEY?: string;
  AI?: { run(model: string, inputs: Record<string, unknown>): Promise<any> };
  PAYSTACK_SECRET_KEY?: string;
  PAYSTACK_PUBLIC_KEY?: string;
  VITE_PAYSTACK_PUBLIC_KEY?: string;
  PAYSTACK_WEBHOOK_SECRET?: string;
  APP_URL?: string;
}

const DEFAULT_SUPABASE_URL = 'https://ooalsbdkknznrnldrypd.supabase.co';
const DEFAULT_PUBLISHABLE_KEY = 'sb_publishable_IdubtbN4Y42fq98_CcV1Ew_soG7G7I3';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const supportAttempts = new Map<string, { count: number; resetAt: number }>();
const PLAN_PRICES_NGN = { premium: 4500, lifetime: 18500 } as const;
type PlanTier = keyof typeof PLAN_PRICES_NGN;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
function text(message: string, status = 200): Response {
  return new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
function publicClient(env: Env): SupabaseClient {
  return createClient(env.SUPABASE_URL || DEFAULT_SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
function adminClient(env: Env): SupabaseClient | null {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(env.SUPABASE_URL || DEFAULT_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function readBody(request: Request): Promise<{ body: any; raw: Uint8Array } | Response> {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > 1024 * 1024) return json({ error: 'REQUEST_TOO_LARGE', message: 'Request body must be 1 MB or smaller.' }, 413);
  const raw = new Uint8Array(await request.arrayBuffer());
  if (raw.length > 1024 * 1024) return json({ error: 'REQUEST_TOO_LARGE', message: 'Request body must be 1 MB or smaller.' }, 413);
  if (!raw.length) return { body: {}, raw };
  if (!(request.headers.get('content-type') || '').toLowerCase().includes('application/json')) return { body: {}, raw };
  try { return { body: JSON.parse(decoder.decode(raw)), raw }; }
  catch { return json({ error: 'INVALID_JSON', message: 'Request body must contain valid JSON.' }, 400); }
}
async function authenticatedUser(request: Request, env: Env) {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return { response: json({ error: 'AUTH_REQUIRED', message: 'Please sign in to continue.' }, 401) };
  const { data, error } = await publicClient(env).auth.getUser(token);
  if (error || !data.user) return { response: json({ error: 'INVALID_SESSION', message: 'Your session is invalid or expired. Please sign in again.' }, 401) };
  return { user: data.user };
}
function getAI(env: Env): GoogleGenAI | null {
  const key = env.GEMINI_API_KEY;
  if (!key || key === 'your_gemini_api_key_here' || key === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({ apiKey: key, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
}
async function generateJSON(env: Env, prompt: string) {
  const ai = getAI(env);
  if (!ai) return { response: json({ error: 'GEMINI_API_KEY_MISSING', message: 'Gemini API is not configured yet. Please configure GEMINI_API_KEY in the server secrets to enable AI features.' }, 503) };
  const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
  return { data: JSON.parse(result.text || '{}') };
}
async function activatePaidPlan(admin: SupabaseClient, userId: string, tier: PlanTier) {
  const { data: limits, error: limitsError } = await admin.from('usage_limits').select('*').eq('tier', tier).single();
  if (limitsError || !limits) throw new Error('Could not load the configured plan entitlements.');
  const now = new Date().toISOString();
  const { error: profileError } = await admin.from('profiles').update({ subscription_tier: tier, subscription_status: 'active', updated_at: now }).eq('id', userId);
  if (profileError) throw profileError;
  const { error: entitlementError } = await admin.from('user_entitlements').upsert({ user_id: userId, max_cvs: limits.max_cvs, ai_requests_limit: limits.ai_requests_per_month, ats_audits_limit: limits.ats_audits_per_month, business_docs_limit: limits.business_docs_per_month, premium_templates_enabled: limits.premium_templates, watermark_free_export: limits.watermark_free_export, updated_at: now }, { onConflict: 'user_id' });
  if (entitlementError) throw entitlementError;
  const periodEnd = tier === 'premium' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;
  const { error: subError } = await admin.from('subscriptions').insert({ user_id: userId, tier, status: 'active', current_period_start: now, current_period_end: periodEnd });
  if (subError) throw subError;
}
function constantTimeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
async function hmacHex(secret: string, raw: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, raw));
  return Array.from(signature, b => b.toString(16).padStart(2, '0')).join('');
}

async function handleAPI(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();
  if (method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': url.origin, 'Access-Control-Allow-Headers': 'authorization, content-type, x-paystack-signature', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' } });

  if (path === '/api/health' && method === 'GET') {
    const hasGemini = Boolean(env.GEMINI_API_KEY && !['your_gemini_api_key_here', 'MY_GEMINI_API_KEY'].includes(env.GEMINI_API_KEY));
    const hasWorkersAI = Boolean(env.AI && typeof env.AI.run === 'function');
    const hasPaystack = Boolean(env.PAYSTACK_SECRET_KEY);
    return json({ status: 'ok', appName: 'JOEASSIST', founder: 'Joseph Chiemezie', version: '1.1.0', services: {
      model1: { configured: hasWorkersAI, message: hasWorkersAI ? 'Cloudflare Workers AI binding is available' : 'Cloudflare Workers AI binding is missing from this deployment' },
      model2: { configured: hasGemini, message: hasGemini ? 'Gemini key is available to the running Worker' : 'GEMINI_API_KEY is not available to the running Worker. Check the secret on the joeassist Worker and deploy it.' },
      paystack: { configured: hasPaystack, publicKeyProvided: Boolean(env.PAYSTACK_PUBLIC_KEY || env.VITE_PAYSTACK_PUBLIC_KEY), message: hasPaystack ? 'Secret key configured' : 'PAYSTACK_SECRET_KEY is pending in server environment' },
      supabase: { url: env.SUPABASE_URL || DEFAULT_SUPABASE_URL, configured: true }
    } });
  }

  const isAI = path.startsWith('/api/ai/') || path.startsWith('/api/gemini/');
  const isProtected = isAI || path === '/api/paystack/initialize' || path === '/api/paystack/verify';
  let user: any = null;
  if (isProtected) {
    const auth = await authenticatedUser(request, env);
    if (auth.response) return auth.response;
    user = auth.user;
  }

  if (method === 'POST' && (path.startsWith('/api/ai/') || path.startsWith('/api/gemini/') || path.startsWith('/api/paystack/') || path === '/api/support')) {
    const parsed = await readBody(request);
    if (parsed instanceof Response) return parsed;
    const body = parsed.body || {};

    if (path.startsWith('/api/ai/') || path.startsWith('/api/gemini/')) {
      const requestedModel = body.model === 'model1' ? 'model1' : 'model2';
      const routePath = path.startsWith('/api/ai/') ? path.replace('/api/ai/', '/api/gemini/') : path;
      let prompt = '';
      switch (routePath) {
        case '/api/gemini/cv-draft':
          if (!body.targetRole && !body.experienceSummary) return json({ error: 'Please provide at least a target role or experience summary.' }, 400);
          prompt = `You are an executive CV writer and ATS specialist for JOEASSIST.
Target Role: "${body.targetRole || 'Professional'}"
User's Experience Notes: "${body.experienceSummary || 'None provided'}"
User's Education Notes: "${body.educationSummary || 'None provided'}"
Current Skills: "${body.currentSkills || 'None provided'}"
Generate a structured CV draft in JSON. Do NOT invent companies, institutions, or dates. Use placeholders like "[Company Name]" and "[Institution]" if missing. Make bullet points achievement-oriented and metric-driven. Return ONLY valid JSON matching this schema: {"professionalTitle":"string","summary":"string","work_experience":[{"id":"1","jobTitle":"string","company":"string","location":"string","startDate":"2022","endDate":"2024","isCurrent":false,"bulletPoints":["string"]}],"education":[{"id":"1","degree":"string","fieldOfStudy":"string","institution":"string","startDate":"2018","endDate":"2022","gradeGpa":""}],"skills":[{"id":"1","category":"Core Competencies","items":["skill1"]}]}`;
          break;
        case '/api/gemini/improve-summary':
          prompt = `Rewrite this professional summary to be concise, impactful, and ATS-optimized for "${body.targetRole || 'Professional'}": "${body.currentSummary || ''}". Return JSON {"improvedSummary":"string","keyImprovements":["point 1","point 2"]}.`;
          break;
        case '/api/gemini/improve-bullets':
          prompt = `Act as an expert resume strategist. Improve these bullet points for "${body.jobTitle || 'Professional'}" using Google's XYZ formula ("Accomplished [X] as measured by [Y], by doing [Z]"). Original points: ${JSON.stringify(body.bulletPoints || [])}. Do not fabricate metrics; use placeholders such as "[X%]" or "[₦X]". Return JSON {"improvedBullets":["string"],"explanations":["string"]}.`;
          break;
        case '/api/gemini/ats-audit':
          if (!body.jobDescription) return json({ error: 'Job description is required for ATS analysis.' }, 400);
          prompt = `You are a senior ATS scanning engineer and corporate recruiter. Evaluate this CV against the job description. TARGET JOB TITLE: "${body.targetJobTitle || 'Not specified'}". JOB DESCRIPTION:\n${body.jobDescription}\nCV CONTENT:\n${typeof body.cvContent === 'string' ? body.cvContent : JSON.stringify(body.cvContent)}\nProvide overall score 0-100, category scores, matched and missing keywords, warnings, actionable recommendations without fabricating qualifications, and 3 tailored bullet suggestions. Return JSON {"overall_score":78,"keyword_score":75,"experience_score":80,"education_score":85,"formatting_score":90,"matched_keywords":[],"missing_keywords":[],"warnings":[],"recommendations":[],"tailored_suggestions":[]}`;
          break;
        case '/api/gemini/cover-letter':
          if (!body.applicantName || !body.applicantPhone || !body.applicantAddress || !body.jobTitle) {
            return json({ error: 'COVER_LETTER_DETAILS_REQUIRED', message: 'Please provide your name, phone number, address, and the job title before generating the letter.' }, 400);
          }
          prompt = `Write only the BODY PARAGRAPHS of a formal job application letter for JOEASSIST. Do not include the writer's address, date, receiver's address, salutation, subject line, closing, signature, name, or phone number because the website formats those separately.
Applicant name: "${String(body.applicantName || '').slice(0, 180)}"
Applicant email: "${String(body.applicantEmail || '').slice(0, 254)}"
Applicant phone: "${String(body.applicantPhone || '').slice(0, 80)}"
Applicant address: "${String(body.applicantAddress || '').slice(0, 500)}"
Date selected by applicant: "${String(body.letterDate || '')}"
Receiver / organisation: "${String(body.recipientName || body.hiringManager || '').slice(0, 180)}"
Receiver title / department: "${String(body.recipientTitle || '').slice(0, 180)}"
Receiver address: "${String(body.recipientAddress || '').slice(0, 500)}"
Salutation chosen: "${String(body.salutation || 'Dear Hiring Manager,').slice(0, 100)}"
Subject: "${String(body.subjectLine || '').slice(0, 250)}"
Job title: "${String(body.jobTitle || '').slice(0, 180)}"
Organisation: "${String(body.companyName || body.recipientName || '').slice(0, 180)}"
Candidate's real background: "${String(body.userExperience || '').slice(0, 6000)}"
Job advert / requirements: "${String(body.jobDescription || '').slice(0, 6000)}"
Tone: "${String(body.tone || 'Professional and formal').slice(0, 100)}"
Length: "${String(body.length || 'Medium (3-4 paragraphs)').slice(0, 100)}"
Write a natural, respectful, specific application letter body that connects only the supplied experience to the role and employer. Never invent degrees, employers, dates, skills, awards, achievements, or metrics. If the candidate provides limited experience, focus honestly on transferable skills, motivation, willingness to learn, and relevant strengths. Do not mention missing information. Produce the requested length. Return JSON only in this exact shape: {"title":"string","content":"paragraph one\\n\\nparagraph two\\n\\nparagraph three"}. The content value must contain body paragraphs only.`;
          break;
        case '/api/gemini/parse-cv-text':
          if (!body.rawText || String(body.rawText).trim().length < 20) return json({ error: 'Please provide readable CV text to extract.' }, 400);
          prompt = `Parse this raw CV text accurately without inventing information. RAW TEXT:\n${body.rawText}\nReturn JSON {"personal_info":{"fullName":"string","professionalTitle":"string","email":"string","phone":"string","location":"string","linkedin":"string","website":"string"},"summary":"string","work_experience":[{"id":"1","jobTitle":"string","company":"string","location":"string","startDate":"string","endDate":"string","isCurrent":false,"bulletPoints":["string"]}],"education":[{"id":"1","degree":"string","fieldOfStudy":"string","institution":"string","startDate":"string","endDate":"string","gradeGpa":"string"}],"skills":[{"id":"1","category":"string","items":["string"]}],"languages":[{"id":"1","language":"string","proficiency":"Fluent"}]}`;
          break;
        case '/api/gemini/proposal-draft':
          prompt = `Generate executive text sections for a business proposal. Proposal Title: "${body.title || ''}". Client Name: "${body.clientName || ''}". Client Problem: "${body.clientProblem || ''}". Our Solution Concept: "${body.proposedSolution || ''}". Return JSON {"executive_summary":"string","client_needs":"string","proposed_solution":"string","suggested_deliverables":[{"id":"1","title":"string","description":"string"}],"terms_and_conditions":"string"}.`;
          break;
        default: return json({ error: 'NOT_FOUND', message: 'API route not found.' }, 404);
      }
      try {
        if (requestedModel === 'model1') {
          if (!env.AI || typeof env.AI.run !== 'function') {
            return json({ error: 'MODEL1_NOT_CONFIGURED', message: 'Cloudflare Workers AI is not bound to this Worker. Add the AI binding and redeploy.' }, 503);
          }
          const result: any = await env.AI.run('@cf/zai-org/glm-4.7-flash', {
            messages: [
              {
                role: 'system',
                content: 'You are JOEASSIST, a professional career and business document assistant. Follow the request carefully. Never invent credentials, employers, dates, qualifications, or metrics. Return only valid JSON matching the requested schema. Do not include Markdown fences or explanations.'
              },
              { role: 'user', content: prompt }
            ],
            max_completion_tokens: 3000,
            temperature: 0.2,
            reasoning_effort: 'low',
            chat_template_kwargs: { enable_thinking: false }
          });
          const output = typeof result?.response === 'string' ? result.response : typeof result?.output === 'string' ? result.output : '';
          if (!output.trim()) {
            console.error('Cloudflare Workers AI returned no text:', JSON.stringify(result).slice(0, 500));
            return json({ error: 'EMPTY_AI_RESPONSE', message: 'Model 1 returned an empty response. Please try again or choose Model 2.' }, 502);
          }
          const cleaned = output.trim().replace(/^\u0060{3}(?:json)?\s*/i, '').replace(/\s*\u0060{3}$/, '');
          try {
            return json({ success: true, data: JSON.parse(cleaned) });
          } catch {
            console.error('Cloudflare Workers AI returned invalid JSON:', cleaned.slice(0, 300));
            return json({ error: 'INVALID_AI_JSON', message: 'Model 1 returned an unreadable response. Please try again or choose Model 2.' }, 502);
          }
        }
        const ai = getAI(env);
        if (!ai) return json({ error: 'MODEL2_NOT_CONFIGURED', message: 'Model 2 is not configured yet. The administrator must add its server API key.' }, 503);
        const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json' } });
        return json({ success: true, data: JSON.parse(result.text || '{}') });
      } catch (error: any) {
        console.error('AI request failed:', error?.message || error);
        return json({ error: 'AI_REQUEST_FAILED', message: 'The selected model could not complete this request. Please try again or choose the other model.' }, 500);
      }
    }

    if (path === '/api/paystack/initialize') {
      const secretKey = env.PAYSTACK_SECRET_KEY; const admin = adminClient(env);
      if (!secretKey) return json({ error: 'PAYSTACK_NOT_CONFIGURED', message: 'Paystack secret key is not configured. No payment has been started.' }, 503);
      if (!admin) return json({ error: 'PAYMENT_STORAGE_NOT_CONFIGURED', message: 'Server-side Supabase service credentials are not configured. Payments are safely disabled until this is completed.' }, 503);
      const planTier = body.planTier as PlanTier;
      if (!user?.email) return json({ error: 'AUTH_EMAIL_REQUIRED', message: 'Please sign in with a verified email before purchasing.' }, 401);
      if (!(planTier in PLAN_PRICES_NGN) || Number(body.amount) !== PLAN_PRICES_NGN[planTier]) return json({ error: 'INVALID_AMOUNT', message: 'The requested amount does not match the configured plan price.' }, 400);
      const reference = `JOEASSIST_${Date.now()}_${Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
      try {
        const response = await fetch('https://api.paystack.co/transaction/initialize', { method: 'POST', headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, amount: PLAN_PRICES_NGN[planTier] * 100, currency: 'NGN', reference, callback_url: env.APP_URL || new URL('/', request.url).toString(), metadata: { userId: user.id, planTier, platform: 'JOEASSIST' } }) });
        const data: any = await response.json();
        if (!response.ok || !data.status || !data.data?.authorization_url) return json({ error: data.message || 'Paystack initialization failed.' }, 502);
        const { error } = await admin.from('payments').insert({ user_id: user.id, reference, amount: PLAN_PRICES_NGN[planTier], currency: 'NGN', plan_tier: planTier, status: 'pending' });
        if (error) { console.error('Pending payment record failed:', error.message); return json({ error: 'PAYMENT_RECORD_FAILED', message: 'Payment could not be safely recorded. Please try again later.' }, 500); }
        return json({ success: true, authorization_url: data.data.authorization_url, access_code: data.data.access_code, reference });
      } catch (error) { console.error('Paystack initialization failed:', error); return json({ error: 'Could not communicate with Paystack.' }, 502); }
    }

    if (path === '/api/paystack/verify') {
      const secretKey = env.PAYSTACK_SECRET_KEY; const admin = adminClient(env);
      if (!secretKey || !admin) return json({ error: 'PAYMENTS_NOT_CONFIGURED', message: 'Payments are not configured for secure verification yet.' }, 503);
      const reference = String(body.reference || '').trim();
      if (!reference || reference.length > 120) return json({ error: 'A valid transaction reference is required.' }, 400);
      try {
        const { data: payment, error } = await admin.from('payments').select('*').eq('reference', reference).eq('user_id', user.id).maybeSingle();
        if (error || !payment) return json({ error: 'PAYMENT_NOT_FOUND', message: 'This payment does not belong to the signed-in account.' }, 404);
        const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secretKey}` } });
        const payload: any = await response.json(); const tx = payload.data;
        if (!response.ok || !payload.status || !tx) return json({ error: 'Paystack verification failed.' }, 502);
        const valid = tx.status === 'success' && tx.reference === payment.reference && tx.currency === payment.currency && Number(tx.amount) === Math.round(Number(payment.amount) * 100) && tx.customer?.email?.toLowerCase() === user.email?.toLowerCase();
        if (!valid) return json({ success: false, status: tx.status, message: 'Payment details could not be verified against this account and plan.' }, 400);
        if (payment.status !== 'success') {
          const { error: updateError } = await admin.from('payments').update({ status: 'success', paid_at: tx.paid_at || new Date().toISOString(), channel: tx.channel || null, paystack_tx_id: String(tx.id || ''), updated_at: new Date().toISOString() }).eq('id', payment.id);
          if (updateError) throw updateError;
          await activatePaidPlan(admin, user.id, payment.plan_tier);
        }
        return json({ success: true, status: 'success', reference, amount: payment.amount, currency: payment.currency, planTier: payment.plan_tier });
      } catch (error: any) { console.error('Payment verification failed:', error?.message || error); return json({ error: 'Payment verification could not be completed. Please contact support before retrying.' }, 500); }
    }

    if (path === '/api/paystack/webhook') {
      const secret = env.PAYSTACK_WEBHOOK_SECRET || env.PAYSTACK_SECRET_KEY;
      if (!secret) return text('Webhook is not configured.', 503);
      const supplied = request.headers.get('x-paystack-signature') || '';
      const expected = await hmacHex(secret, parsed.raw);
      if (!supplied || !constantTimeEqual(encoder.encode(supplied.toLowerCase()), encoder.encode(expected))) return text('Invalid signature.', 401);
      const admin = adminClient(env); if (!admin) return text('Payment storage is not configured.', 503);
      const event = body || {}; const reference = String(event.data?.reference || ''); const eventType = String(event.event || 'unknown'); const eventId = String(event.data?.id || `${eventType}:${reference}`);
      try {
        const { data: existing } = await admin.from('payment_webhook_events').select('id').eq('event_id', eventId).maybeSingle();
        if (existing) return text('OK', 200);
        if (eventType === 'charge.success' && reference) {
          const { data: payment, error } = await admin.from('payments').select('*').eq('reference', reference).maybeSingle();
          if (error) throw error;
          const tx = event.data || {};
          if (payment && tx.status === 'success' && tx.currency === payment.currency && Number(tx.amount) === Math.round(Number(payment.amount) * 100) && String(tx.metadata?.userId || '') === payment.user_id && String(tx.metadata?.planTier || '') === payment.plan_tier && String(tx.reference || '') === payment.reference) {
            if (payment.status !== 'success') {
              const { error: updateError } = await admin.from('payments').update({ status: 'success', paid_at: tx.paid_at || new Date().toISOString(), channel: tx.channel || null, paystack_tx_id: String(tx.id || ''), updated_at: new Date().toISOString() }).eq('id', payment.id);
              if (updateError) throw updateError;
              await activatePaidPlan(admin, payment.user_id, payment.plan_tier);
            }
          }
        }
        const { error: eventError } = await admin.from('payment_webhook_events').insert({ event_id: eventId, event_type: eventType, reference: reference || null, payload: event, status: 'processed' });
        if (eventError && eventError.code !== '23505') throw eventError;
        return text('OK', 200);
      } catch (error: any) { console.error('Webhook processing failed:', error?.message || error); return text('Webhook processing failed; retry later.', 500); }
    }

    if (path === '/api/support') {
      const name = String(body.name || '').trim().slice(0, 120);
      const email = String(body.email || '').trim().toLowerCase().slice(0, 254);
      const phone = String(body.phone || '').trim().slice(0, 40);
      const subject = String(body.subject || '').trim().slice(0, 160);
      const message = String(body.message || '').trim().slice(0, 5000);
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !subject || message.length < 5) return json({ error: 'Please provide a valid name, email, subject, and message.' }, 400);
      const ip = (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
      const now = Date.now(); const attempt = supportAttempts.get(ip);
      if (attempt && attempt.resetAt > now && attempt.count >= 5) return json({ error: 'Too many support requests. Please wait 15 minutes and try again.' }, 429);
      if (!attempt || attempt.resetAt <= now) supportAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
      else supportAttempts.set(ip, { count: attempt.count + 1, resetAt: attempt.resetAt });
      try {
        const { data, error } = await publicClient(env).from('support_requests').insert({ user_id: null, name, email, phone: phone || null, subject, message }).select('id').single();
        if (error || !data) { console.error('Support persistence failed:', error?.message || 'No row returned'); return json({ error: 'Your message could not be saved. Please try again or contact support directly at 08039448648.' }, 503); }
        return json({ success: true, message: 'Your message has been saved. Joseph Chiemezie and the JOEASSIST team will respond shortly.', ticketId: `SUP-${String(data.id).slice(0, 8).toUpperCase()}` }, 201);
      } catch (error: any) { console.error('Support request failed:', error?.message || error); return json({ error: 'Could not save your support request. Please try again.' }, 500); }
    }
  }
  return json({ error: 'NOT_FOUND', message: 'API route not found.' }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      const response = await handleAPI(request, env);
      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', url.origin);
      headers.set('Vary', 'Origin');
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
    return env.ASSETS.fetch(request);
  },
};
