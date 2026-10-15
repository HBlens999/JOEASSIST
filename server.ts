import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// JSON body parsing for Express running through Cloudflare's Node HTTP adapter.
// Express receives a Node-compatible IncomingMessage here, not the original
// Fetch API Request, so req.text()/req.json() are not available on this object.
// Avoid express.json/body-parser because its iconv-lite dependency currently
// fails during Worker bundle validation. Preserve raw bytes for Paystack HMAC.
app.use(async (req: Request, res: Response, next: NextFunction) => {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    (req as any).body = {};
    return next();
  }

  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    (req as any).body = {};
    (req as any).rawBody = Buffer.alloc(0);
    return next();
  }

  try {
    // Use Fetch body methods if this middleware is ever passed a Fetch Request
    // directly by a different adapter. Express requests use the stream fallback.
    const fetchRequest = req as any;
    let rawBody: Buffer;

    if (typeof fetchRequest.arrayBuffer === 'function') {
      const bytes = await fetchRequest.arrayBuffer();
      rawBody = Buffer.from(bytes);
    } else {
      const chunks: Buffer[] = [];
      let totalBytes = 0;

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const onData = (chunk: Buffer | string) => {
          if (settled) return;
          const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          totalBytes += part.length;
          if (totalBytes > 1024 * 1024) {
            settled = true;
            cleanup();
            reject(Object.assign(new Error('Request body exceeds 1 MB.'), { statusCode: 413 }));
            return;
          }
          chunks.push(part);
        };
        const onEnd = () => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve();
        };
        const onError = (error: Error) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(error);
        };
        const cleanup = () => {
          req.off('data', onData);
          req.off('end', onEnd);
          req.off('error', onError);
        };

        req.on('data', onData);
        req.once('end', onEnd);
        req.once('error', onError);
      });

      rawBody = Buffer.concat(chunks);
    }

    if (rawBody.length > 1024 * 1024) {
      return res.status(413).json({ error: 'REQUEST_TOO_LARGE', message: 'Request body must be 1 MB or smaller.' });
    }

    (req as any).rawBody = rawBody;
    if (rawBody.length === 0) {
      (req as any).body = {};
      return next();
    }

    try {
      (req as any).body = JSON.parse(rawBody.toString('utf8'));
      return next();
    } catch {
      return res.status(400).json({ error: 'INVALID_JSON', message: 'Request body must contain valid JSON.' });
    }
  } catch (error: any) {
    if (error?.statusCode === 413) {
      return res.status(413).json({ error: 'REQUEST_TOO_LARGE', message: 'Request body must be 1 MB or smaller.' });
    }
    return next(error);
  }
});

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ooalsbdkknznrnldrypd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_IdubtbN4Y42fq98_CcV1Ew_soG7G7I3';
const publicSupabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function getAdminSupabase(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Please sign in to continue.' });
  const { data, error } = await publicSupabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'INVALID_SESSION', message: 'Your session is invalid or expired. Please sign in again.' });
  (req as any).authUser = data.user;
  return next();
}

app.use('/api/gemini', requireAuth);

// Helper to get server-side Gemini AI client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// -----------------------------------------------------------------------------
// HEALTH & CONFIG STATUS ENDPOINT
// -----------------------------------------------------------------------------
app.get('/api/health', (req: Request, res: Response) => {
  const hasGemini = Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' &&
    process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
  );
  const hasPaystackSecret = Boolean(process.env.PAYSTACK_SECRET_KEY);
  const hasPaystackPublic = Boolean(process.env.PAYSTACK_PUBLIC_KEY || process.env.VITE_PAYSTACK_PUBLIC_KEY);

  res.json({
    status: 'ok',
    appName: 'JOEASSIST',
    founder: 'Joseph Chiemezie',
    version: '1.0.0',
    services: {
      gemini: {
        configured: hasGemini,
        model: 'gemini-2.5-flash',
        message: hasGemini ? 'Connected and operational' : 'GEMINI_API_KEY is not configured in server environment',
      },
      paystack: {
        configured: hasPaystackSecret,
        publicKeyProvided: hasPaystackPublic,
        message: hasPaystackSecret ? 'Secret key configured' : 'PAYSTACK_SECRET_KEY is pending in server environment',
      },
      supabase: {
        url: 'https://ooalsbdkknznrnldrypd.supabase.co',
        configured: true,
      },
    },
  });
});

// -----------------------------------------------------------------------------
// GEMINI AI ENDPOINTS
// -----------------------------------------------------------------------------

// 1. Generate CV Draft from brief user information
app.post('/api/gemini/cv-draft', async (req: Request, res: Response) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY_MISSING',
      message: 'Gemini API is not configured yet. Please configure GEMINI_API_KEY in the server secrets to enable AI features.',
    });
  }

  const { targetRole, experienceSummary, educationSummary, currentSkills } = req.body;

  if (!targetRole && !experienceSummary) {
    return res.status(400).json({ error: 'Please provide at least a target role or experience summary.' });
  }

  const prompt = `
You are an executive CV writer and ATS specialist for JOEASSIST.
Target Role: "${targetRole || 'Professional'}"
User's Experience Notes: "${experienceSummary || 'None provided'}"
User's Education Notes: "${educationSummary || 'None provided'}"
Current Skills: "${currentSkills || 'None provided'}"

Generate a structured CV draft in JSON format.
CRITICAL RULES:
- Do NOT invent companies, institutions, or dates that the user did not provide.
- Use placeholders like "[Company Name]", "[Institution]" if missing.
- Make work experience bullet points achievement-oriented and metric-driven.
- Return ONLY valid JSON matching this schema:
{
  "professionalTitle": "string",
  "summary": "string",
  "work_experience": [
    {
      "id": "1",
      "jobTitle": "string",
      "company": "string",
      "location": "string",
      "startDate": "2022",
      "endDate": "2024",
      "isCurrent": false,
      "bulletPoints": ["string", "string"]
    }
  ],
  "education": [
    {
      "id": "1",
      "degree": "string",
      "fieldOfStudy": "string",
      "institution": "string",
      "startDate": "2018",
      "endDate": "2022",
      "gradeGpa": ""
    }
  ],
  "skills": [
    {
      "id": "1",
      "category": "Core Competencies",
      "items": ["skill1", "skill2"]
    }
  ]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error('Gemini cv-draft error:', err);
    return res.status(500).json({ error: 'Failed to generate CV draft', details: err.message });
  }
});

// 2. Improve Summary
app.post('/api/gemini/improve-summary', async (req: Request, res: Response) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY_MISSING',
      message: 'Gemini API key is not configured on the server.',
    });
  }

  const { currentSummary, targetRole } = req.body;

  const prompt = `
Rewrite this professional summary to be concise, impactful, and ATS-optimized for a "${targetRole || 'Professional'}":
"${currentSummary || ''}"

Return JSON:
{
  "improvedSummary": "string",
  "keyImprovements": ["point 1", "point 2"]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    return res.json({ success: true, data: JSON.parse(response.text || '{}') });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to improve summary', details: err.message });
  }
});

// 3. Improve Bullet Points
app.post('/api/gemini/improve-bullets', async (req: Request, res: Response) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY_MISSING',
      message: 'Gemini API key is not configured on the server.',
    });
  }

  const { jobTitle, bulletPoints } = req.body;

  const prompt = `
Act as an expert resume strategist. Improve these bullet points for a "${jobTitle || 'Professional'}" using Google's XYZ formula ("Accomplished [X] as measured by [Y], by doing [Z]"):
Original points:
${JSON.stringify(bulletPoints || [])}

Do not fabricate metrics, but place clear placeholders (e.g. "[X%]", "[₦X]") where numbers can be inserted by the user.
Return JSON:
{
  "improvedBullets": ["string", "string"],
  "explanations": ["explanation 1", "explanation 2"]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    return res.json({ success: true, data: JSON.parse(response.text || '{}') });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to improve bullet points', details: err.message });
  }
});

// 4. ATS CV Checker
app.post('/api/gemini/ats-audit', async (req: Request, res: Response) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY_MISSING',
      message: 'Gemini API key is not configured on the server.',
    });
  }

  const { cvContent, jobDescription, targetJobTitle } = req.body;

  if (!jobDescription) {
    return res.status(400).json({ error: 'Job description is required for ATS analysis.' });
  }

  const prompt = `
You are a senior ATS scanning engineer and corporate recruiter.
Evaluate the following CV content against this Job Description.

TARGET JOB TITLE: "${targetJobTitle || 'Not specified'}"
JOB DESCRIPTION:
${jobDescription}

CV CONTENT:
${typeof cvContent === 'string' ? cvContent : JSON.stringify(cvContent)}

Perform a thorough, transparent ATS compatibility analysis. Provide:
1. Overall ATS score (0 to 100).
2. Category scores (Keyword coverage, Experience alignment, Education & certs, Readability & formatting).
3. Matched keywords (present in both).
4. Missing critical keywords from the job description.
5. Actionable recommendations to improve match rate without fabricating qualifications.
6. 3 concrete tailored bullet points that could be adapted into the CV based on existing facts.

Return JSON:
{
  "overall_score": 78,
  "keyword_score": 75,
  "experience_score": 80,
  "education_score": 85,
  "formatting_score": 90,
  "matched_keywords": ["keyword 1", "keyword 2"],
  "missing_keywords": ["keyword 3", "keyword 4"],
  "warnings": ["warning 1"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "tailored_suggestions": ["suggestion 1", "suggestion 2"]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    return res.json({ success: true, data: JSON.parse(response.text || '{}') });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to run ATS audit', details: err.message });
  }
});

// 5. Cover Letter Generator
app.post('/api/gemini/cover-letter', async (req: Request, res: Response) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY_MISSING',
      message: 'Gemini API key is not configured on the server.',
    });
  }

  const { jobTitle, companyName, hiringManager, jobDescription, userExperience, tone, length } = req.body;

  const prompt = `
Write a high-converting, professional cover letter.
Target Role: "${jobTitle}"
Target Company: "${companyName}"
Hiring Manager: "${hiringManager || 'Hiring Team'}"
Job Description:
${jobDescription || 'Standard professional role'}

Candidate Background:
${userExperience || 'Experienced professional with relevant skills'}

Tone: "${tone || 'confident and professional'}"
Length: "${length || 'medium (3-4 paragraphs)'}"

Requirements:
- Natural, engaging, authentic writing. Avoid generic clichés.
- Highlight candidate's specific relevance to the company.
- Do NOT invent fake previous employers or credentials.
- Return JSON:
{
  "title": "Cover Letter - ${companyName}",
  "content": "Full letter body text formatted with clear paragraphs."
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    return res.json({ success: true, data: JSON.parse(response.text || '{}') });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate cover letter', details: err.message });
  }
});

// 6. CV Text Parser (Upload/Paste CV Extraction)
app.post('/api/gemini/parse-cv-text', async (req: Request, res: Response) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY_MISSING',
      message: 'Gemini API key is not configured on the server.',
    });
  }

  const { rawText } = req.body;
  if (!rawText || rawText.trim().length < 20) {
    return res.status(400).json({ error: 'Please provide readable CV text to extract.' });
  }

  const prompt = `
Parse this raw CV / Resume text into structured JSON. Extract accurately:
RAW TEXT:
${rawText}

Return JSON with this exact structure:
{
  "personal_info": {
    "fullName": "string",
    "professionalTitle": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedin": "string",
    "website": "string"
  },
  "summary": "string",
  "work_experience": [
    {
      "id": "1",
      "jobTitle": "string",
      "company": "string",
      "location": "string",
      "startDate": "string",
      "endDate": "string",
      "isCurrent": false,
      "bulletPoints": ["string"]
    }
  ],
  "education": [
    {
      "id": "1",
      "degree": "string",
      "fieldOfStudy": "string",
      "institution": "string",
      "startDate": "string",
      "endDate": "string",
      "gradeGpa": "string"
    }
  ],
  "skills": [
    {
      "id": "1",
      "category": "string",
      "items": ["string"]
    }
  ],
  "languages": [
    {
      "id": "1",
      "language": "string",
      "proficiency": "Fluent"
    }
  ]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    return res.json({ success: true, data: JSON.parse(response.text || '{}') });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to parse CV text', details: err.message });
  }
});

// 7. Business Proposal Assistant
app.post('/api/gemini/proposal-draft', async (req: Request, res: Response) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY_MISSING',
      message: 'Gemini API key is not configured on the server.',
    });
  }

  const { title, clientName, clientProblem, proposedSolution } = req.body;

  const prompt = `
Generate executive text sections for a business proposal:
Proposal Title: "${title}"
Client Name: "${clientName}"
Client Problem: "${clientProblem}"
Our Solution Concept: "${proposedSolution}"

Return JSON:
{
  "executive_summary": "string",
  "client_needs": "string",
  "proposed_solution": "string",
  "suggested_deliverables": [
    {"id": "1", "title": "string", "description": "string"},
    {"id": "2", "title": "string", "description": "string"}
  ],
  "terms_and_conditions": "string"
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    return res.json({ success: true, data: JSON.parse(response.text || '{}') });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to draft proposal', details: err.message });
  }
});

// -----------------------------------------------------------------------------
// PAYSTACK PAYMENT INTEGRATION
// -----------------------------------------------------------------------------

// Server-side plan prices are authoritative. Never trust the browser's amount.
const PLAN_PRICES_NGN: Record<'premium' | 'lifetime', number> = {
  premium: 4500,
  lifetime: 18500,
};

async function activatePaidPlan(admin: SupabaseClient, userId: string, tier: 'premium' | 'lifetime') {
  const { data: limits, error: limitsError } = await admin
    .from('usage_limits').select('*').eq('tier', tier).single();
  if (limitsError || !limits) throw new Error('Could not load the configured plan entitlements.');

  const { error: profileError } = await admin.from('profiles')
    .update({ subscription_tier: tier, subscription_status: 'active', updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (profileError) throw profileError;

  const { error: entitlementError } = await admin.from('user_entitlements').upsert({
    user_id: userId,
    max_cvs: limits.max_cvs,
    ai_requests_limit: limits.ai_requests_per_month,
    ats_audits_limit: limits.ats_audits_per_month,
    business_docs_limit: limits.business_docs_per_month,
    premium_templates_enabled: limits.premium_templates,
    watermark_free_export: limits.watermark_free_export,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (entitlementError) throw entitlementError;

  const periodEnd = tier === 'premium'
    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : null;
  const { error: subscriptionError } = await admin.from('subscriptions').insert({
    user_id: userId,
    tier,
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: periodEnd,
  });
  if (subscriptionError) throw subscriptionError;
}

// 1. Initialize a transaction for the authenticated user.
app.post('/api/paystack/initialize', requireAuth, async (req: Request, res: Response) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const admin = getAdminSupabase();
  if (!secretKey) return res.status(503).json({ error: 'PAYSTACK_NOT_CONFIGURED', message: 'Paystack secret key is not configured. No payment has been started.' });
  if (!admin) return res.status(503).json({ error: 'PAYMENT_STORAGE_NOT_CONFIGURED', message: 'Server-side Supabase service credentials are not configured. Payments are safely disabled until this is completed.' });

  const authUser = (req as any).authUser;
  const { planTier, amount } = req.body || {};
  if (!authUser?.email) return res.status(401).json({ error: 'AUTH_EMAIL_REQUIRED', message: 'Please sign in with a verified email before purchasing.' });
  if (planTier !== 'premium' && planTier !== 'lifetime') return res.status(400).json({ error: 'INVALID_PLAN', message: 'Select a valid paid plan.' });
  if (Number(amount) !== PLAN_PRICES_NGN[planTier]) return res.status(400).json({ error: 'INVALID_AMOUNT', message: 'The requested amount does not match the configured plan price.' });

  const reference = `JOEASSIST_${Date.now()}_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: authUser.email,
        amount: PLAN_PRICES_NGN[planTier] * 100,
        currency: 'NGN',
        reference,
        callback_url: process.env.APP_URL || 'http://localhost:3000',
        metadata: { userId: authUser.id, planTier, platform: 'JOEASSIST' },
      }),
    });
    const data = await response.json() as any;
    if (!response.ok || !data.status || !data.data?.authorization_url) {
      return res.status(502).json({ error: data.message || 'Paystack initialization failed.' });
    }

    const { error: insertError } = await admin.from('payments').insert({
      user_id: authUser.id,
      reference,
      amount: PLAN_PRICES_NGN[planTier],
      currency: 'NGN',
      plan_tier: planTier,
      status: 'pending',
    });
    if (insertError) {
      console.error('Could not record pending payment:', insertError.message);
      return res.status(500).json({ error: 'PAYMENT_RECORD_FAILED', message: 'Payment could not be safely recorded. Please try again later.' });
    }

    return res.json({ success: true, authorization_url: data.data.authorization_url, access_code: data.data.access_code, reference });
  } catch (err: any) {
    console.error('Paystack initialization error:', err);
    return res.status(502).json({ error: 'Could not communicate with Paystack.' });
  }
});

// 2. Verify a transaction and activate entitlements only after server-side verification.
app.post('/api/paystack/verify', requireAuth, async (req: Request, res: Response) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const admin = getAdminSupabase();
  if (!secretKey || !admin) return res.status(503).json({ error: 'PAYMENTS_NOT_CONFIGURED', message: 'Payments are not configured for secure verification yet.' });

  const authUser = (req as any).authUser;
  const reference = String(req.body?.reference || '').trim();
  if (!reference || reference.length > 120) return res.status(400).json({ error: 'A valid transaction reference is required.' });

  try {
    const { data: payment, error: paymentError } = await admin.from('payments')
      .select('*').eq('reference', reference).eq('user_id', authUser.id).maybeSingle();
    if (paymentError || !payment) return res.status(404).json({ error: 'PAYMENT_NOT_FOUND', message: 'This payment does not belong to the signed-in account.' });

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const payload = await response.json() as any;
    if (!response.ok || !payload.status || !payload.data) return res.status(502).json({ error: 'Paystack verification failed.' });

    const tx = payload.data;
    const valid = tx.status === 'success'
      && tx.reference === payment.reference
      && tx.currency === payment.currency
      && Number(tx.amount) === Math.round(Number(payment.amount) * 100)
      && tx.customer?.email?.toLowerCase() === authUser.email?.toLowerCase();
    if (!valid) {
      return res.status(400).json({ success: false, status: tx.status, message: 'Payment details could not be verified against this account and plan.' });
    }

    if (payment.status !== 'success') {
      const { error: updateError } = await admin.from('payments').update({
        status: 'success', paid_at: tx.paid_at || new Date().toISOString(),
        channel: tx.channel || null, paystack_tx_id: String(tx.id || ''),
        updated_at: new Date().toISOString(),
      }).eq('id', payment.id);
      if (updateError) throw updateError;
      await activatePaidPlan(admin, authUser.id, payment.plan_tier);
    }

    return res.json({ success: true, status: 'success', reference, amount: payment.amount, currency: payment.currency, planTier: payment.plan_tier });
  } catch (err: any) {
    console.error('Paystack verification error:', err?.message || err);
    return res.status(500).json({ error: 'Payment verification could not be completed. Please contact support before retrying.' });
  }
});

// 3. Verify Paystack's signature against the exact raw request body and process events idempotently.
app.post('/api/paystack/webhook', async (req: Request, res: Response) => {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
  const rawBody: Buffer | undefined = (req as any).rawBody;
  if (!secret || !rawBody) return res.status(503).send('Webhook is not configured.');
  const supplied = String(req.headers['x-paystack-signature'] || '');
  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  const suppliedBuffer = Buffer.from(supplied, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return res.status(401).send('Invalid signature.');
  }

  const admin = getAdminSupabase();
  if (!admin) return res.status(503).send('Payment storage is not configured.');
  const event = req.body || {};
  const reference = String(event.data?.reference || '');
  const eventType = String(event.event || 'unknown');
  const eventId = String(event.data?.id || `${eventType}:${reference}`);
  try {
    const { data: existing } = await admin.from('payment_webhook_events').select('id').eq('event_id', eventId).maybeSingle();
    if (existing) return res.sendStatus(200);

    if (eventType === 'charge.success' && reference) {
      const { data: payment, error } = await admin.from('payments').select('*').eq('reference', reference).maybeSingle();
      if (error) throw error;
      const tx = event.data || {};
      if (payment && tx.status === 'success'
        && tx.currency === payment.currency
        && Number(tx.amount) === Math.round(Number(payment.amount) * 100)
        && String(tx.metadata?.userId || '') === payment.user_id
        && String(tx.metadata?.planTier || '') === payment.plan_tier) {
        if (payment.status !== 'success') {
          const { error: updateError } = await admin.from('payments').update({
            status: 'success', paid_at: tx.paid_at || new Date().toISOString(),
            channel: tx.channel || null, paystack_tx_id: String(tx.id || ''),
            updated_at: new Date().toISOString(),
          }).eq('id', payment.id);
          if (updateError) throw updateError;
          await activatePaidPlan(admin, payment.user_id, payment.plan_tier);
        }
      }
    }

    const { error: eventError } = await admin.from('payment_webhook_events').insert({
      event_id: eventId, event_type: eventType, reference: reference || null,
      payload: event, status: 'processed',
    });
    if (eventError && eventError.code !== '23505') throw eventError;
    return res.sendStatus(200);
  } catch (err: any) {
    console.error('Paystack webhook processing failed:', err?.message || err);
    return res.status(500).send('Webhook processing failed; retry later.');
  }
});

// -----------------------------------------------------------------------------
// SUPPORT REQUEST ENDPOINT
// -----------------------------------------------------------------------------
const supportAttempts = new Map<string, { count: number; resetAt: number }>();
app.post('/api/support', async (req: Request, res: Response) => {
  const { name, email, phone, subject, message } = req.body || {};
  const cleanName = String(name || '').trim().slice(0, 120);
  const cleanEmail = String(email || '').trim().toLowerCase().slice(0, 254);
  const cleanPhone = String(phone || '').trim().slice(0, 40);
  const cleanSubject = String(subject || '').trim().slice(0, 160);
  const cleanMessage = String(message || '').trim().slice(0, 5000);
  if (!cleanName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || !cleanSubject || cleanMessage.length < 5) {
    return res.status(400).json({ error: 'Please provide a valid name, email, subject, and message.' });
  }

  const ip = String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now();
  const attempt = supportAttempts.get(ip);
  if (attempt && attempt.resetAt > now && attempt.count >= 5) {
    return res.status(429).json({ error: 'Too many support requests. Please wait 15 minutes and try again.' });
  }
  if (!attempt || attempt.resetAt <= now) supportAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
  else supportAttempts.set(ip, { count: attempt.count + 1, resetAt: attempt.resetAt });

  try {
    const { data, error } = await publicSupabase.from('support_requests').insert({
      user_id: null, name: cleanName, email: cleanEmail, phone: cleanPhone || null,
      subject: cleanSubject, message: cleanMessage,
    }).select('id').single();
    if (error || !data) {
      console.error('Support request persistence failed:', error?.message || 'No row returned');
      return res.status(503).json({ error: 'Your message could not be saved. Please try again or contact support directly at 08039448648.' });
    }
    return res.status(201).json({
      success: true,
      message: 'Your message has been saved. Joseph Chiemezie and the JOEASSIST team will respond shortly.',
      ticketId: `SUP-${String(data.id).slice(0, 8).toUpperCase()}`,
    });
  } catch (err: any) {
    console.error('Support request failed:', err?.message || err);
    return res.status(500).json({ error: 'Could not save your support request. Please try again.' });
  }
});

// -----------------------------------------------------------------------------
// DEV / PROD SERVER STATIC & MIDDLEWARE MOUNTING
// -----------------------------------------------------------------------------
async function startServer() {
  if (!isProduction) {
    // In development: mount Vite in middleware mode
    const vitePackageName = 'vite';
    const { createServer: createViteServer } = await import(vitePackageName);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (process.env.CLOUDFLARE_WORKER === 'true') {
    // Cloudflare Workers serves the built SPA through its Assets binding.
    // The Express server handles API routes only in this deployment mode.
    app.use((req: Request, res: Response) => {
      res.status(404).json({ error: 'NOT_FOUND', message: 'API route not found.' });
    });
  } else {
    // Traditional Node.js production deployment: serve built assets from dist.
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`🚀 JOEASSIST server listening on http://0.0.0.0:${PORT} [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
  });
}

startServer();
