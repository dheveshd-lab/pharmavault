import React, { useState } from 'react';
import {
  Pill,
  Lock,
  Mail,
  User,
  Building2,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Database,
  ExternalLink,
  ChevronRight,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { setCustomSupabaseConfig } from '../utils/supabaseClient';

export const AuthView: React.FC = () => {
  const {
    signIn,
    signUp,
    resetPassword,
    authError,
    clearAuthError,
    isSupabaseConnected,
    configStatus,
    enableSandboxMode,
    refreshSession,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'setup'>('login');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [pharmacyName, setPharmacyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Setup state for custom credentials
  const [setupUrl, setSetupUrl] = useState('');
  const [setupKey, setSetupKey] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    clearAuthError();

    if (!email.trim() || !password) {
      setFormError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await signIn(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.error || 'Failed to sign in. Please verify your credentials.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    clearAuthError();

    if (!fullName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setFormError('Please enter your email address.');
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await signUp(email, password, fullName, pharmacyName || 'PharmaVault');
    setIsSubmitting(false);

    if (result.success) {
      if (result.confirmationRequired) {
        setSuccessMessage(
          'Account created! A confirmation email has been sent. Please verify your email before logging in.'
        );
        setMode('login');
      } else {
        setSuccessMessage('Account registered successfully! Welcome to PharmaVault.');
      }
    } else {
      setFormError(result.error || 'Registration failed. The email may already be in use.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setFormError('Please provide your registered email address.');
      return;
    }

    setIsSubmitting(true);
    const result = await resetPassword(email);
    setIsSubmitting(false);

    if (result.success) {
      setSuccessMessage('Password reset instructions have been sent to your email.');
    } else {
      setFormError(result.error || 'Could not send reset link. Verify your email address.');
    }
  };

  const handleSaveSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!setupUrl.trim() || !setupKey.trim()) {
      setFormError('Both Supabase Project URL and Anon Key are required.');
      return;
    }

    const saved = setCustomSupabaseConfig(setupUrl, setupKey);
    if (saved) {
      refreshSession();
      setSuccessMessage('Supabase credentials configured successfully! You can now log in or register.');
      setMode('login');
    } else {
      setFormError('Invalid Supabase Project URL. Must start with https://');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background radial medical glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a15_1px,transparent_1px),linear-gradient(to_bottom,#0f172a15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Header / Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 px-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 text-white shadow-[0_0_30px_-5px_rgba(20,184,166,0.5)] mb-4">
          <Pill className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
          PharmaVault
          <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800">
            SaaS
          </span>
        </h1>
        <p className="mt-1 text-sm text-cyan-200/80 font-medium">
          Smart Inventory. Safer Medicines.
        </p>

        {/* Supabase Status Pill */}
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-slate-900/90 border border-slate-800 text-slate-300">
          <div
            className={`w-2 h-2 rounded-full ${
              isSupabaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span>
            {isSupabaseConnected
              ? 'Connected to Supabase PostgreSQL & Auth'
              : 'Supabase Config Pending (Environment Setup)'}
          </span>
        </div>
      </div>

      {/* Main Auth Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {/* Notification Messages */}
          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-start gap-3 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {(formError || authError) && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start gap-3 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{formError || authError}</span>
            </div>
          )}

          {/* Missing Supabase Warning */}
          {!isSupabaseConnected && mode !== 'setup' && (
            <div className="mb-6 p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 space-y-3">
              <div className="flex items-start gap-2.5">
                <Database className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-300">Supabase Setup Notice</h4>
                  <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                    Set <code className="text-white bg-slate-950 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> and <code className="text-white bg-slate-950 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> in Vercel or enter them directly below.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setMode('setup')}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                >
                  Configure Credentials
                </button>
                <button
                  type="button"
                  onClick={enableSandboxMode}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Try Pharmacist Sandbox
                </button>
              </div>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pharmacist@pharmavault.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 active:scale-[0.99] text-white text-sm font-semibold shadow-lg shadow-teal-900/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <>
                    Sign In to PharmaVault <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-4 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-400">
                  New pharmacy account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setFormError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline-offset-2 hover:underline"
                  >
                    Create Account
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Pharmacist Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Sarah Jenkins, PharmD"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Pharmacy / Facility Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={pharmacyName}
                    onChange={(e) => setPharmacyName(e.target.value)}
                    placeholder="Central Community Pharmacy"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="orders@centralpharmacy.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-10 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-sm font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Registering Account...
                  </span>
                ) : (
                  <>Create Pharmacy Account</>
                )}
              </button>

              <div className="pt-3 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setFormError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline-offset-2 hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Reset Password</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your registered email address to receive password recovery instructions.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pharmacist@pharmavault.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Sending Link...' : 'Send Recovery Email'}
              </button>

              <div className="pt-3 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* SUPABASE DIRECT SETUP MODAL / FORM */}
          {mode === 'setup' && (
            <form onSubmit={handleSaveSetup} className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                  <Database className="w-4 h-4" />
                  <span>Configure Supabase Connection</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Connect PharmaVault directly to your Supabase PostgreSQL project. Your keys are stored securely in browser storage.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  required
                  value={setupUrl}
                  onChange={(e) => setSetupUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700 text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Supabase Anon / Publishable Key
                </label>
                <textarea
                  required
                  rows={2}
                  value={setupKey}
                  onChange={(e) => setSetupKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-700 text-white placeholder-slate-500 text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
                >
                  Save & Connect
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Pharmacist Sandbox Shortcut */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={enableSandboxMode}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Launch Clinical Demo Sandbox</span>
            <ChevronRight className="w-3 h-3 text-slate-500" />
          </button>
        </div>
      </div>
    </div>
  );
};
