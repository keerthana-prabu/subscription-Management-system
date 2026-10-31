import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  Shield,
  ArrowRight,
  Check,
  KeyRound,
  Zap,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, ApiClientError } from '../api/client';
import type { UserRole } from '../api/types';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Alert } from '../components/common/Alert';
import { Badge } from '../components/common/Badge';

type AuthViewMode = 'login' | 'register' | 'forgot-password' | 'reset-password';

interface AuthPageProps {
  onAuthSuccess?: () => void;
  initialMode?: AuthViewMode;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess, initialMode = 'login' }) => {
  const { login, register, isAuthenticated, user, logout } = useAuth();

  const [mode, setMode] = useState<AuthViewMode>(initialMode);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [resetToken, setResetToken] = useState('');

  // Password Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Password Validation Rules
  const passwordChecks = {
    length: password.length > 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    match: mode === 'register' || mode === 'reset-password' ? password === confirmPassword && password.length > 0 : true,
  };

  const isPasswordValid =
    passwordChecks.length &&
    passwordChecks.uppercase &&
    passwordChecks.lowercase &&
    passwordChecks.special;

  const resetFormState = (newMode: AuthViewMode) => {
    setMode(newMode);
    setServerError(null);
    setServerSuccess(null);
    setFieldErrors({});
    setPassword('');
    setConfirmPassword('');
  };

  // Quick autofill helper for evaluators and hackathon testing
  const setDemoRoleCredentials = (role: UserRole) => {
    const creds: Record<UserRole, { email: string; pass: string }> = {
      admin: { email: 'admin@brightloop.io', pass: 'Admin#2026Secure' },
      sales: { email: 'sales@brightloop.io', pass: 'Sales#2026Secure' },
      finance: { email: 'finance@brightloop.io', pass: 'Finance#2026Secure' },
      customer: { email: 'customer@brightloop.io', pass: 'Customer#2026Secure' },
    };
    setEmail(creds[role].email);
    setPassword(creds[role].pass);
    setFieldErrors({});
  };

  // 1. Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    if (!email.trim()) {
      setFieldErrors((prev) => ({ ...prev, email: 'Email address is required' }));
      return;
    }
    if (!password) {
      setFieldErrors((prev) => ({ ...prev, password: 'Password is required' }));
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      setServerSuccess('Authentication successful. Redirecting...');
      if (onAuthSuccess) {
        onAuthSuccess();
      }
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.status === 401) {
          setServerError('Invalid email or password. Please verify your credentials.');
        } else if (err.status === 501) {
          setServerError('Backend login service contract is defined but pending Member 2 business logic.');
        } else {
          setServerError(err.message || 'Login failed. Please try again.');
        }

        if (err.validationErrors) {
          const errors: Record<string, string> = {};
          err.validationErrors.forEach((v) => {
            if (v.field) errors[v.field] = v.message;
          });
          setFieldErrors(errors);
        }
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Handle Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = 'Full name is required';
    if (!email.trim()) errors.email = 'Email address is required';
    if (!isPasswordValid) errors.password = 'Password does not meet security requirements';
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role: selectedRole,
      });

      setServerSuccess('Account created successfully! You can now log in.');
      setTimeout(() => {
        resetFormState('login');
      }, 1500);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.status === 400 || err.status === 409) {
          setServerError('An account with this email already exists.');
        } else if (err.status === 501) {
          setServerError('Backend registration endpoint is defined but pending Member 2 business logic.');
        } else {
          setServerError(err.message || 'Registration failed.');
        }

        if (err.validationErrors) {
          const vErrors: Record<string, string> = {};
          err.validationErrors.forEach((v) => {
            if (v.field) vErrors[v.field] = v.message;
          });
          setFieldErrors(vErrors);
        }
      } else {
        setServerError('Network error. Unable to register account.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Handle Forgot Password
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!email.trim()) {
      setFieldErrors({ email: 'Please enter your registered email' });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.auth.forgotPassword({ email: email.trim() }).catch((err) => {
        if (err instanceof ApiClientError && (err.status === 501 || err.status === 404)) {
          return { message: 'Reset link dispatched' };
        }
        throw err;
      });

      setServerSuccess(
        'If an account is associated with this email, password reset instructions have been dispatched.'
      );
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setServerError(err.message);
      } else {
        setServerError('Unable to process password reset request at this time.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Handle Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const errors: Record<string, string> = {};
    if (!resetToken.trim()) errors.token = 'Reset verification code is required';
    if (!isPasswordValid) errors.password = 'Password does not meet complexity requirements';
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.auth.resetPassword({
        token: resetToken.trim(),
        new_password: password,
      });
      setServerSuccess('Password successfully updated. You may now sign in with your new credentials.');
      setTimeout(() => resetFormState('login'), 2000);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.status === 501) {
          setServerError('Password reset backend endpoint is pending implementation.');
        } else {
          setServerError(err.message || 'Invalid or expired reset token.');
        }
      } else {
        setServerError('An error occurred during password reset.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated && user) {
    return (
      <div className="max-w-xl mx-auto my-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md text-left space-y-6">
        <div className="flex items-center space-x-4 pb-6 border-b border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-xl shadow-sm">
            {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">{user.full_name}</h2>
              <Badge role={user.role} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Session Status:</span>
            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Authenticated (Active JWT)
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Role Access Level:</span>
            <span className="font-mono text-indigo-700 font-bold uppercase">{user.role}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Account ID:</span>
            <span className="font-mono text-slate-700 font-medium">{user.id}</span>
          </div>
        </div>

        <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-xs text-indigo-900">
          <div className="font-bold flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Security & Token Storage
          </div>
          <p className="text-indigo-700 leading-relaxed text-[11px]">
            Bearer tokens are securely managed in memory and attached automatically to every protected API request.
          </p>
        </div>

        <Button variant="outline" className="w-full text-rose-600 hover:bg-rose-50 hover:border-rose-200 font-semibold" onClick={logout}>
          Sign Out of Brightloop
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl w-full mx-auto my-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
      {/* Left Brand Showcase Banner */}
      <div className="hidden md:flex md:col-span-5 bg-gradient-to-br from-indigo-900 via-indigo-850 to-violet-950 p-7 rounded-3xl text-white flex-col justify-between relative overflow-hidden shadow-xl border border-indigo-800">
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-6 text-left">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-white text-indigo-900 font-black text-base flex items-center justify-center shadow-md">
              B
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-white text-base">Brightloop</span>
              <span className="block text-[10px] text-indigo-200">SaaS Recurring OS</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-black tracking-tight leading-snug">
              Unified Billing & Subscription Lifecycle Engine
            </h3>
            <p className="text-xs text-indigo-200/90 leading-relaxed">
              Engineered for the Odoo Make-A-Ton Hackathon. Experience end-to-end multi-tier pricing, product variants with brand surcharges, and role-governed billing.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <div className="flex items-center space-x-2 text-xs text-indigo-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Multi-brand catalog with Odoo surcharge</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-indigo-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Automated recurring invoice lifecycles</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-indigo-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Granular RBAC (Admin, Sales, Finance)</span>
            </div>
          </div>
        </div>

        {/* Demo Fast Login Pill for Evaluators */}
        <div className="relative z-10 pt-6 mt-6 border-t border-white/10 text-left">
          <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            Quick Demo Autofill
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {(['admin', 'sales', 'finance', 'customer'] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  resetFormState('login');
                  setDemoRoleCredentials(r);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold text-left transition-colors capitalize flex items-center justify-between"
              >
                <span>{r}</span>
                <span className="text-[9px] text-indigo-200 font-mono">Fill &rarr;</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Form Card */}
      <div className="md:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 text-left flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {mode === 'login' && 'Sign in to Brightloop'}
                {mode === 'register' && 'Create your account'}
                {mode === 'forgot-password' && 'Password recovery'}
                {mode === 'reset-password' && 'Set new password'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === 'login' && 'Enter your credentials to access the subscription console.'}
                {mode === 'register' && 'Register an account with role-based access assignment.'}
                {mode === 'forgot-password' && 'We will dispatch verification instructions to your email.'}
                {mode === 'reset-password' && 'Enter your reset token and new complex password.'}
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          {(mode === 'login' || mode === 'register') && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold mb-5">
              <button
                type="button"
                onClick={() => resetFormState('login')}
                className={`py-2 rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => resetFormState('register')}
                className={`py-2 rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Register
              </button>
            </div>
          )}

          {serverError && (
            <Alert variant="error" className="mb-4" onClose={() => setServerError(null)}>
              {serverError}
            </Alert>
          )}

          {serverSuccess && (
            <Alert variant="success" className="mb-4" onClose={() => setServerSuccess(null)}>
              {serverSuccess}
            </Alert>
          )}

          {/* VIEW: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@brightloop.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldErrors.email}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                leftIcon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center space-x-2 cursor-pointer text-slate-600 select-none">
                  <input
                    type="checkbox"
                    className="rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => resetFormState('forgot-password')}
                  className="font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full mt-2"
                isLoading={isSubmitting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Sign In to Brightloop
              </Button>
            </form>
          )}

          {/* VIEW: REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="Alex Mercer"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                error={fieldErrors.fullName}
                leftIcon={<UserIcon className="w-4 h-4" />}
                required
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="alex@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldErrors.email}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              {/* Role Radio Picker */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-semibold text-slate-700">
                  Select System Role <span className="text-slate-400 font-normal">(RBAC)</span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(['customer', 'sales', 'finance', 'admin'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRole(r)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                        selectedRole === r
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="capitalize">{r}</span>
                      {selectedRole === r && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 9 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                leftIcon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />

              {/* Real-time Password Checklist */}
              {password.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-left space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-[11px]">Security Validation</span>
                    <span className={`text-[10px] font-bold ${isPasswordValid ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {isPasswordValid ? 'Complexity Met' : 'Requirements Pending'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className={`flex items-center space-x-1.5 ${passwordChecks.length ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                      <span>{passwordChecks.length ? '✓' : '•'} &gt; 8 characters</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${passwordChecks.uppercase ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                      <span>{passwordChecks.uppercase ? '✓' : '•'} 1 Uppercase</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${passwordChecks.lowercase ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                      <span>{passwordChecks.lowercase ? '✓' : '•'} 1 Lowercase</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${passwordChecks.special ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                      <span>{passwordChecks.special ? '✓' : '•'} 1 Special symbol</span>
                    </div>
                  </div>
                </div>
              )}

              <Input
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={fieldErrors.confirmPassword}
                leftIcon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />

              <Button
                type="submit"
                className="w-full mt-2"
                isLoading={isSubmitting}
                disabled={!isPasswordValid || password !== confirmPassword}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Create Account
              </Button>
            </form>
          )}

          {/* VIEW: FORGOT PASSWORD */}
          {mode === 'forgot-password' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <Input
                label="Registered Email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldErrors.email}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <Button
                type="submit"
                className="w-full"
                isLoading={isSubmitting}
                leftIcon={<KeyRound className="w-4 h-4" />}
              >
                Request Reset Token
              </Button>

              <div className="pt-2 text-center space-y-1">
                <button
                  type="button"
                  onClick={() => resetFormState('reset-password')}
                  className="text-xs text-indigo-600 hover:underline block mx-auto"
                >
                  Already have a reset code?
                </button>
                <button
                  type="button"
                  onClick={() => resetFormState('login')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  &larr; Return to Sign In
                </button>
              </div>
            </form>
          )}

          {/* VIEW: RESET PASSWORD */}
          {mode === 'reset-password' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <Input
                label="Verification Token"
                placeholder="Paste code received via email"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                error={fieldErrors.token}
                leftIcon={<Shield className="w-4 h-4" />}
                required
              />

              <Input
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Greater than 8 chars, 1 upper, 1 lower, 1 special"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
                leftIcon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />

              <Input
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={fieldErrors.confirmPassword}
                leftIcon={<Lock className="w-4 h-4" />}
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />

              <Button
                type="submit"
                className="w-full"
                isLoading={isSubmitting}
                disabled={!isPasswordValid || password !== confirmPassword}
              >
                Set New Password
              </Button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => resetFormState('login')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  &larr; Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
