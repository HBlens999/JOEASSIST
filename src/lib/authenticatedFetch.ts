import { supabase } from './supabase';

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) {
    throw new Error('Please sign in to use this feature.');
  }

  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  let body = init.body;
  const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
  if (body && typeof body === 'string' && requestUrl.includes('/api/gemini/')) {
    try {
      const parsedBody = JSON.parse(body);
      const selectedModel = typeof window !== 'undefined'
        ? window.localStorage.getItem('joeassist_ai_model')
        : null;
      // Final CV proofreading must always use Model 1, regardless of the user's default AI selection.
      parsedBody.model = requestUrl.endsWith('/api/gemini/polish-cv')
        ? 'model1'
        : selectedModel === 'model1' ? 'model1' : 'model2';
      body = JSON.stringify(parsedBody);
    } catch {
      // Leave non-JSON request bodies untouched.
    }
  }
  if (body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const fetchInput = typeof input === 'string' && input.startsWith('/api/gemini/')
    ? input.replace('/api/gemini/', '/api/ai/')
    : input;
  return fetch(fetchInput, { ...init, body, headers });
}
