import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthPageProps {
  setCurrentTab: (tab: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ setCurrentTab }) => {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMsg(error);
      } else {
        setCurrentTab('dashboard');
      }
    } else if (mode === 'register') {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your full name.');
        setIsLoading(false);
        return;
      }
      const result = await signUp(email, password, fullName);
      const { error } = result;
      if (error) {
        setErrorMsg(error);
      } else if (result.needsEmailConfirmation) {
        setSuccessMsg('Account created. Please check your email and confirm your address before signing in.');
        setMode('login');
      } else {
        setSuccessMsg('Account created successfully. You can now continue to your dashboard.');
        setCurrentTab('dashboard');
      }
    } else if (mode === 'forgot') {
      const { error } = await resetPassword(email);
      if (error) setErrorMsg(error);
      else setSuccessMsg('If an account exists for this email, a password reset link will be sent. Check your inbox and spam folder.');
    }

    setIsLoading(false);
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/20">
          JA
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
          {mode === 'login' && 'Sign in to JOEASSIST'}
          {mode === 'register' && 'Create your Free Account'}
          {mode === 'forgot' && 'Reset your Password'}
        </h1>
        <p className="text-xs text-gray-500">
          {mode === 'login' && 'Access your saved CVs, business documents, and AI tools'}
          {mode === 'register' && 'Start building executive CVs with 30+ distinct templates'}
          {mode === 'forgot' && 'Enter your email to receive a recovery link'}
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-5">
        {/* Switcher Tab */}
        <div className="flex p-1 bg-gray-100 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              mode === 'login' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              mode === 'register' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === 'register' && (
            <div>
              <label className="font-bold text-gray-700 uppercase block mb-1">Full Legal Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="e.g. Chinedu Okafor"
                  className="w-full pl-9 pr-3 py-2.5 border rounded-xl"
                />
              </div>
            </div>
          )}

          <div>
            <label className="font-bold text-gray-700 uppercase block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2.5 border rounded-xl"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-bold text-gray-700 uppercase">Password</label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[11px] text-blue-600 hover:underline font-semibold"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 border rounded-xl"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <span>{mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Free Account' : 'Send Reset Link'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

      </div>
    </div>
  );
};
