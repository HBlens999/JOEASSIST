import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/auth';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: string | null }>;
  signUp: (email: string, pass: string, firstName: string, lastName: string, phone: string) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<UserProfile, 'first_name' | 'last_name' | 'full_name' | 'phone' | 'avatar_url' | 'company_name'>>) => Promise<{ error: string | null }>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toUserProfile(authUser: any, profile: any): UserProfile {
  return {
    id: authUser.id,
    email: authUser.email || profile?.email || '',
    first_name: profile?.first_name || authUser.user_metadata?.first_name || '',
    last_name: profile?.last_name || authUser.user_metadata?.last_name || '',
    full_name: profile?.full_name || authUser.user_metadata?.full_name || '',
    phone: profile?.phone || '',
    avatar_url: profile?.avatar_url || '',
    // Privileged fields always come from the database profile, never from
    // user-editable metadata or localStorage.
    role: profile?.role === 'admin' || profile?.role === 'moderator' ? profile.role : 'user',
    subscription_tier: profile?.subscription_tier === 'premium' || profile?.subscription_tier === 'lifetime'
      ? profile.subscription_tier : 'free',
    subscription_status: ['active', 'past_due', 'canceled', 'expired'].includes(profile?.subscription_status)
      ? profile.subscription_status : 'active',
    company_name: profile?.company_name || '',
    created_at: profile?.created_at,
    updated_at: profile?.updated_at,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadUser = async (authUser: any) => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id,email,first_name,last_name,full_name,phone,avatar_url,role,subscription_tier,subscription_status,company_name,created_at,updated_at')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        console.error('Could not load JOEASSIST profile:', error.message);
        // Keep valid Supabase authentication usable, but with least privilege.
        setUser(toUserProfile(authUser, null));
        return;
      }
      setUser(toUserProfile(authUser, profile));
    };

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session?.user) await loadUser(data.session.user);
        else if (mounted) setUser(null);
      } catch (error) {
        console.error('JOEASSIST session initialization failed:', error);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }
      // Defer database work outside the auth event callback.
      setTimeout(() => { void loadUser(session.user); }, 0);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pass,
    });
    if (error) return { error: error.message };
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id,email,first_name,last_name,full_name,phone,avatar_url,role,subscription_tier,subscription_status,company_name,created_at,updated_at')
        .eq('id', data.user.id)
        .maybeSingle();
      if (profileError) console.error('Profile lookup after sign-in failed:', profileError.message);
      setUser(toUserProfile(data.user, profile));
    }
    return { error: null };
  };

  const signUp = async (email: string, pass: string, firstName: string, lastName: string, phone: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanPhone = phone.trim();
    const fullName = [cleanFirstName, cleanLastName].filter(Boolean).join(' ');
    if (!cleanFirstName || !cleanLastName) return { error: 'Please enter both your first name and last name.' };
    if (!cleanPhone) return { error: 'Please enter your phone number.' };
    if (pass.length < 8) return { error: 'Use a password with at least 8 characters.' };

    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: pass,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          first_name: cleanFirstName,
          last_name: cleanLastName,
          full_name: fullName,
          phone: cleanPhone,
        },
      },
    });
    if (error) return { error: error.message };

    // With confirmation enabled, Supabase sends the user to the production
    // origin supplied above instead of falling back to localhost:3000.
    if (!data.session) {
      return { error: null, needsEmailConfirmation: true };
    }

    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id,email,first_name,last_name,full_name,phone,avatar_url,role,subscription_tier,subscription_status,company_name,created_at,updated_at')
        .eq('id', data.user.id)
        .maybeSingle();
      if (profileError) console.error('Profile lookup after sign-up failed:', profileError.message);
      setUser(toUserProfile(data.user, profile));
    }
    return { error: null, needsEmailConfirmation: false };
  };

  const resetPassword = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return { error: 'Enter your email address first.' };
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });
    return { error: error?.message || null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('JOEASSIST sign-out failed:', error.message);
    setUser(null);
  };

  const updateProfile: AuthContextType['updateProfile'] = async (updates) => {
    if (!user) return { error: 'Please sign in first.' };
    const safeUpdates = {
      ...(updates.first_name !== undefined ? { first_name: updates.first_name } : {}),
      ...(updates.last_name !== undefined ? { last_name: updates.last_name } : {}),
      ...(updates.full_name !== undefined ? { full_name: updates.full_name } : {}),
      ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
      ...(updates.avatar_url !== undefined ? { avatar_url: updates.avatar_url } : {}),
      ...(updates.company_name !== undefined ? { company_name: updates.company_name } : {}),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('profiles')
      .update(safeUpdates)
      .eq('id', user.id)
      .select('id,email,first_name,last_name,full_name,phone,avatar_url,role,subscription_tier,subscription_status,company_name,created_at,updated_at')
      .single();

    if (error) return { error: error.message };
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) setUser(toUserProfile(authData.user, data));
    return { error: null };
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, resetPassword, signOut, updateProfile, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
