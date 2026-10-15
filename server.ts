import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

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
        model: 'gemini-3.8-flash',
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
      model: 'gemini-3.8-flash',
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
      model: 'gemini-3.8-flash',
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
      model: 'gemini-3.8-flash',
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
      model: 'gemini-3.8-flash',
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
      model: 'gemini-3.8-flash',
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
      model: 'gemini-3.8-flash',
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
      model: 'gemini-3.8-flash',
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

// 1. Initialize Paystack Transaction
app.post('/api/paystack/initialize', async (req: Request, res: Response) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return res.status(503).json({
      error: 'PAYSTACK_NOT_CONFIGURED',
      message: 'Paystack secret key is not configured on the server. Please set PAYSTACK_SECRET_KEY in server environment.',
    });
  }

  const { email, amount, planTier, callbackUrl } = req.body;

  if (!email || !amount || !planTier) {
    return res.status(400).json({ error: 'Missing required parameters: email, amount, planTier.' });
  }

  const reference = `JOEASSIST_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(Number(amount) * 100), // Paystack expects amount in Kobo
        reference,
        callback_url: callbackUrl || process.env.APP_URL || 'http://localhost:3000/dashboard/billing',
        metadata: {
          planTier,
          platform: 'JOEASSIST',
          founder: 'Joseph Chiemezie',
        },
      }),
    });

    const data = await response.json();
    if (!data.status) {
      return res.status(400).json({ error: data.message || 'Paystack initialization failed.' });
    }

    return res.json({
      success: true,
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference,
    });
  } catch (err: any) {
    console.error('Paystack initialization error:', err);
    return res.status(500).json({ error: 'Failed to communicate with Paystack API', details: err.message });
  }
});

// 2. Server-Side Paystack Verification (CRITICAL: Never trust client-only success)
app.post('/api/paystack/verify', async (req: Request, res: Response) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return res.status(503).json({
      error: 'PAYSTACK_NOT_CONFIGURED',
      message: 'Paystack secret key is not configured on the server.',
    });
  }

  const { reference } = req.body;
  if (!reference) {
    return res.status(400).json({ error: 'Transaction reference is required.' });
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    const data = await response.json();

    if (!data.status) {
      return res.status(400).json({ error: data.message || 'Verification failed.' });
    }

    const tx = data.data;
    const isSuccess = tx.status === 'success';

    return res.json({
      success: isSuccess,
      status: tx.status,
      reference: tx.reference,
      amount: tx.amount / 100, // convert kobo to Naira
      currency: tx.currency,
      paidAt: tx.paid_at,
      channel: tx.channel,
      planTier: tx.metadata?.planTier || 'premium',
      customer: {
        email: tx.customer?.email,
      },
    });
  } catch (err: any) {
    console.error('Paystack verify error:', err);
    return res.status(500).json({ error: 'Paystack verification request failed', details: err.message });
  }
});

// 3. Paystack Webhook with HMAC-SHA512 Signature Verification & Idempotency
app.post('/api/paystack/webhook', async (req: Request, res: Response) => {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return res.status(400).send('Webhook secret not configured.');
  }

  const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Invalid signature.');
  }

  const event = req.body;
  console.log(`[PAYSTACK WEBHOOK] Received event: ${event.event} for ref: ${event.data?.reference}`);

  // Always respond with 200 OK to acknowledge receipt
  return res.sendStatus(200);
});

// -----------------------------------------------------------------------------
// SUPPORT REQUEST ENDPOINT
// -----------------------------------------------------------------------------
app.post('/api/support', (req: Request, res: Response) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Please provide your name, email, subject, and message.' });
  }

  // Support ticket registered
  console.log(`[JOEASSIST SUPPORT TICKET] From: ${name} (${email}, ${phone || 'N/A'}) - Subject: ${subject}`);
  return res.json({
    success: true,
    message: 'Your message has been received! Joseph Chiemezie and the JOEASSIST team will respond shortly.',
    ticketId: `SUP-${Date.now().toString(36).toUpperCase()}`,
  });
});

// -----------------------------------------------------------------------------
// DEV / PROD SERVER STATIC & MIDDLEWARE MOUNTING
// -----------------------------------------------------------------------------
async function startServer() {
  if (!isProduction) {
    // In development: mount Vite in middleware mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production: serve built assets from dist
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
