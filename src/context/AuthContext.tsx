import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/auth';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: any }>;
  signUp: (email: string, pass: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>;
  isAdmin: boolean;
  loginAsDemoUser: (role?: 'user' | 'admin', tier?: 'free' | 'premium' | 'lifetime') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    // Check local storage for persistent profile
    const saved = localStorage.getItem('joeassist_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial Supabase Auth session
    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Fetch profile from supabase profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            const userProfile: UserProfile = {
              id: profile.id,
              email: profile.email,
              full_name: profile.full_name || session.user.user_metadata?.full_name,
              phone: profile.phone,
              role: profile.role || 'user',
              subscription_tier: profile.subscription_tier || 'free',
              subscription_status: profile.subscription_status || 'active',
              company_name: profile.company_name,
            };
            setUser(userProfile);
            localStorage.setItem('joeassist_user', JSON.stringify(userProfile));
          } else {
            // Profile row missing, construct from auth metadata
            const fallback: UserProfile = {
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || 'JOEASSIST User',
              role: session.user.email === 'josepchiemezie42@gmail.com' ? 'admin' : 'user',
              subscription_tier: 'free',
              subscription_status: 'active',
            };
            setUser(fallback);
            localStorage.setItem('joeassist_user', JSON.stringify(fallback));
          }
        }
      } catch (err) {
        console.warn('Supabase auth session check notice:', err);
      } finally {
        setLoading(false);
      }
    }

    initSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const isFounder = session.user.email?.toLowerCase().includes('josepchiemezie');
        const userObj: UserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || 'JOEASSIST User',
          role: isFounder ? 'admin' : 'user',
          subscription_tier: isFounder ? 'lifetime' : 'free',
          subscription_status: 'active',
        };
        setUser(userObj);
        localStorage.setItem('joeassist_user', JSON.stringify(userObj));
      } else if (!localStorage.getItem('joeassist_demo_mode')) {
        setUser(null);
        localStorage.removeItem('joeassist_user');
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) throw error;
      if (data.user) {
        const isFounder = email.toLowerCase().includes('josepchiemezie');
        const userProfile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email,
          full_name: data.user.user_metadata?.full_name || 'JOEASSIST Member',
          role: isFounder ? 'admin' : 'user',
          subscription_tier: isFounder ? 'lifetime' : 'free',
          subscription_status: 'active',
        };
        setUser(userProfile);
        localStorage.setItem('joeassist_user', JSON.stringify(userProfile));
        localStorage.removeItem('joeassist_demo_mode');
      }
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Login failed' };
    }
  };

  const signUp = async (email: string, pass: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) throw error;

      if (data.user) {
        const isFounder = email.toLowerCase().includes('josepchiemezie');
        const userProfile: UserProfile = {
          id: data.user.id,
          email,
          full_name: fullName,
          role: isFounder ? 'admin' : 'user',
          subscription_tier: isFounder ? 'lifetime' : 'free',
          subscription_status: 'active',
        };
        setUser(userProfile);
        localStorage.setItem('joeassist_user', JSON.stringify(userProfile));
      }
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Registration failed' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Ignore
    }
    setUser(null);
    localStorage.removeItem('joeassist_user');
    localStorage.removeItem('joeassist_demo_mode');
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'No user logged in' };
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('joeassist_user', JSON.stringify(updated));

    try {
      await supabase.from('profiles').update(updates).eq('id', user.id);
    } catch (e) {
      // Local sync is already preserved
    }
    return { error: null };
  };

  const loginAsDemoUser = (role: 'user' | 'admin' = 'user', tier: 'free' | 'premium' | 'lifetime' = 'free') => {
    const demo: UserProfile = {
      id: role === 'admin' ? 'admin-demo-uuid-001' : 'user-demo-uuid-002',
      email: role === 'admin' ? 'josepchiemezie42@gmail.com' : 'demo.jobseeker@joeassist.com',
      full_name: role === 'admin' ? 'Joseph Chiemezie (Founder)' : 'Chidinma Okafor',
      phone: '08039448648',
      role,
      subscription_tier: tier,
      subscription_status: 'active',
      company_name: 'JOEASSIST Enterprises',
    };
    setUser(demo);
    localStorage.setItem('joeassist_user', JSON.stringify(demo));
    localStorage.setItem('joeassist_demo_mode', 'true');
  };

  const isAdmin = user?.role === 'admin' || user?.email === 'josepchiemezie42@gmail.com' || user?.email === 'josepchiemezie@gmail.com';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        isAdmin,
        loginAsDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
