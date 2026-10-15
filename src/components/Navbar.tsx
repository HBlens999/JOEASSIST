import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEntitlements } from '../context/EntitlementsContext';
import { 
  FileText, Sparkles, CheckSquare, Briefcase, CreditCard, 
  User, LogOut, Menu, X, Shield, Phone, ChevronDown 
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, signOut, isAdmin, loginAsDemoUser } = useAuth();
  const { triggerUpgradePrompt, currentTier } = useEntitlements();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'templates', label: '30+ Templates' },
    { id: 'builder', label: 'CV Builder' },
    { id: 'upload', label: 'Upload & Parse' },
    { id: 'ats', label: 'ATS Checker' },
    { id: 'coverletter', label: 'Cover Letter' },
    { id: 'business', label: 'Invoices & Docs' },
    { id: 'pricing', label: 'Pricing' },
  ];

  const handleNavClick = (tabId: string) => {
    setCurrentTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <div 
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              JA
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-gray-900 group-hover:text-blue-600 transition-colors">
                JOEASSIST
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded ml-1.5">
                AI Platform
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentTab === item.id
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right Action buttons */}
          <div className="hidden sm:flex items-center space-x-3">
            {/* Subscription Badge */}
            {user && (
              <span 
                onClick={() => currentTier === 'free' && triggerUpgradePrompt('Upgrade to unlock full features.')}
                className={`cursor-pointer px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  currentTier === 'lifetime'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : currentTier === 'premium'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {currentTier === 'lifetime' ? '👑 Lifetime Pro' : currentTier === 'premium' ? '⚡ Pro' : 'Free Plan'}
              </span>
            )}

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl border border-gray-200 hover:border-gray-300 transition bg-white"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    {(user.full_name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-gray-800 max-w-[120px] truncate">
                    {user.full_name || user.email.split('@')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {userDropdownOpen && (
                  <div 
                    onMouseLeave={() => setUserDropdownOpen(false)}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in"
                  >
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-bold text-gray-900 truncate">{user.full_name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                    </div>

                    <button
                      onClick={() => { setCurrentTab('dashboard'); setUserDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <User className="w-4 h-4 text-blue-600" /> My Dashboard
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => { setCurrentTab('admin'); setUserDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 flex items-center gap-2"
                      >
                        <Shield className="w-4 h-4 text-purple-600" /> Admin Console
                      </button>
                    )}

                    <button
                      onClick={() => { setCurrentTab('pricing'); setUserDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <CreditCard className="w-4 h-4 text-emerald-600" /> Subscription & Plans
                    </button>

                    <div className="border-t border-gray-100 my-1" />

                    <button
                      onClick={() => { signOut(); setUserDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentTab('auth')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
                >
                  Log In
                </button>
                <button
                  onClick={() => setCurrentTab('auth')}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
                >
                  Get Started
                </button>
                <button
                  onClick={() => loginAsDemoUser('user', 'free')}
                  className="px-2.5 py-1.5 text-[11px] font-medium text-gray-500 hover:text-blue-600 border border-gray-200 rounded-lg"
                  title="Explore instantly without registering"
                >
                  Quick Demo
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            {user && (
              <button 
                onClick={() => handleNavClick('dashboard')}
                className="p-1.5 text-blue-600 bg-blue-50 rounded-lg"
              >
                <User className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-4 pt-3 pb-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                currentTab === item.id ? 'bg-blue-50 text-blue-600 font-bold' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}

          <div className="border-t border-gray-100 pt-3">
            {user ? (
              <div className="space-y-2">
                <button
                  onClick={() => handleNavClick('dashboard')}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-gray-800 bg-gray-50 rounded-lg flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-blue-600" /> User Dashboard
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleNavClick('admin')}
                    className="w-full text-left px-3 py-2 text-sm font-bold text-purple-700 bg-purple-50 rounded-lg flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" /> Admin Console
                  </button>
                )}
                <button
                  onClick={() => signOut()}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => handleNavClick('auth')}
                  className="w-full py-2.5 text-center text-sm font-bold text-white bg-blue-600 rounded-xl"
                >
                  Sign In / Create Account
                </button>
                <button
                  onClick={() => { loginAsDemoUser('user', 'free'); setMobileMenuOpen(false); }}
                  className="w-full py-2 text-center text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl"
                >
                  Explore as Demo User
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
