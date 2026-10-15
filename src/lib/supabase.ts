import { createClient } from '@supabase/supabase-js';

// The verified JOEASSIST Supabase Project credentials
export const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 'https://ooalsbdkknznrnldrypd.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_IdubtbN4Y42fq98_CcV1Ew_soG7G7I3';

// Centrally configured Supabase client instance
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

// Helper to determine if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
};
