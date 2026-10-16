import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, UserRound, Phone, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthPageProps {
  setCurrentTab: (tab: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ setCurrentTab }) => {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const changeMode = (nextMode: 'login' | 'register' | 'forgot') => {
    setMode(nextMode);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) setErrorMsg(error);
        else setCurrentTab('dashboard');
      } else if (mode === 'register') {
        if (!firstName.trim() || !lastName.trim()) {
          setErrorMsg('Please enter both your first name and last name.');
          return;
        }
        if (!phone.trim()) {
          setErrorMsg('Please enter your phone number.');
          return;
        }
        const result = await signUp(email, password, firstName.trim(), lastName.trim(), phone.trim());
        if (result.error) {
          setErrorMsg(result.error);
        } else if (result.needsEmailConfirmation) {
          setSuccessMsg('Your account has been created. Please open the confirmation email and click the link to verify your email address, then return here to sign in.');
          setMode('login');
          setPassword('');
        } else {
          setSuccessMsg('Account created successfully. Welcome to JOEASSIST!');
          setCurrentTab('dashboard');
        }
      } else {
        const { error } = await resetPassword(email);
        if (error) setErrorMsg(error);
        else setSuccessMsg('If an account exists for this email, a password reset link will be sent. Check your inbox and spam folder.');
      }
    } catch (error: any) {
      setErrorMsg(error?.message || 'Something went wrong. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">JA</div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
          {mode === 'login' && 'Sign in to JOEASSIST'}
          {mode === 'register' && 'Create your Free Account'}
          {mode === 'forgot' && 'Reset your Password'}
        </h1>
        <p className="text-xs text-gray-500">
          {mode === 'login' && 'Access your saved CVs, business documents, and AI tools'}
          {mode === 'register' && 'Create your account to start using JOEASSIST'}
          {mode === 'forgot' && 'Enter your email to receive a recovery link'}
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex p-1 bg-gray-100 rounded-xl gap-1">
          <button type="button" onClick={() => changeMode('login')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${mode === 'login' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}>Sign In</button>
          <button type="button" onClick={() => changeMode('register')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${mode === 'register' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}>Create Account</button>
        </div>

        {errorMsg && <div role="alert" className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span></div>}
        {successMsg && <div role="status" className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>{successMsg}</span></div>}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === 'register' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="signup-first-name" className="font-bold text-gray-700 uppercase block mb-1">First Name</label>
                  <div className="relative">
                    <UserRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input id="signup-first-name" type="text" autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} required maxLength={80} placeholder="First name" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label htmlFor="signup-last-name" className="font-bold text-gray-700 uppercase block mb-1">Last Name</label>
                  <div className="relative">
                    <UserRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input id="signup-last-name" type="text" autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} required maxLength={80} placeholder="Last name" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="signup-phone" className="font-bold text-gray-700 uppercase block mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input id="signup-phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} required maxLength={40} placeholder="e.g. 08012345678" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </>
          )}

          <div>
            <label htmlFor="auth-email" className="font-bold text-gray-700 uppercase block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input id="auth-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required maxLength={254} placeholder="name@example.com" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="auth-password" className="font-bold text-gray-700 uppercase">Password</label>
                {mode === 'login' && <button type="button" onClick={() => changeMode('forgot')} className="text-[11px] text-blue-600 hover:underline font-semibold">Forgot password?</button>}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input id="auth-password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {mode === 'register' && <p className="text-[11px] text-gray-500 mt-1">Use at least 8 characters.</p>}
            </div>
          )}

          <button type="submit" disabled={isLoading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50">
            <span>{isLoading ? 'Please wait…' : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Free Account' : 'Send Reset Link'}</span>
            {!isLoading && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </form>
      </div>
    </div>
  );
};
