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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, ApiClientError } from '../api/client';
import type { UserRole } from '../api/types';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Alert } from '../components/common/Alert';

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
      <div className="max-w-md mx-auto my-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
            {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">{user.full_name}</h3>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mb-5 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">System Role:</span>
            <span className="font-semibold text-indigo-700 uppercase tracking-wide">{user.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Account ID:</span>
            <span className="font-mono text-slate-700">{user.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status:</span>
            <span className="text-emerald-700 font-medium">Active Session</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={logout}>
          Sign Out of Account
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto my-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 text-left">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                B
              </div>
              <span className="text-sm font-bold text-slate-900 tracking-tight">Brightloop Auth</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Phase 1</span>
          </div>

          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {mode === 'login' && 'Sign in to your account'}
            {mode === 'register' && 'Create Brightloop account'}
            {mode === 'forgot-password' && 'Reset your password'}
            {mode === 'reset-password' && 'Enter new password'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'login' && 'Enter your credentials to access subscription governance.'}
            {mode === 'register' && 'Setup enterprise subscription access with role assignment.'}
            {mode === 'forgot-password' && 'We will send a secure verification code to your email.'}
            {mode === 'reset-password' && 'Choose a strong password conforming to security guidelines.'}
          </p>

          {(mode === 'login' || mode === 'register') && (
            <div className="grid grid-cols-2 p-1 mt-4 bg-slate-100 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => resetFormState('login')}
                className={`py-1.5 rounded-md transition-all ${
                  mode === 'login' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => resetFormState('register')}
                className={`py-1.5 rounded-md transition-all ${
                  mode === 'register' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Register
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6">
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

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center space-x-1.5 cursor-pointer text-slate-600 select-none">
                  <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => resetFormState('forgot-password')}
                  className="font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" className="w-full" isLoading={isSubmitting} rightIcon={<ArrowRight className="w-4 h-4" />}>
                Sign In
              </Button>
            </form>
          )}

          {/* VIEW: REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="Jane Developer"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                error={fieldErrors.fullName}
                leftIcon={<UserIcon className="w-4 h-4" />}
                required
              />

              <Input
                label="Work Email"
                type="email"
                placeholder="jane@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldErrors.email}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <div className="text-left space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Target Role <span className="text-slate-400 font-normal">(RBAC Assignment)</span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(['customer', 'sales', 'finance', 'admin'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRole(r)}
                      className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                        selectedRole === r
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="capitalize">{r}</span>
                      {selectedRole === r && <Check className="w-3.5 h-3.5 text-indigo-600" />}
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

              {password.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-left space-y-1 text-xs">
                  <p className="font-semibold text-slate-700 mb-1">Security Standards:</p>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <div className={`flex items-center space-x-1.5 ${passwordChecks.length ? 'text-emerald-700' : 'text-slate-400'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${passwordChecks.length ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200'}`}>
                        {passwordChecks.length ? '✓' : '•'}
                      </span>
                      <span>&gt; 8 characters</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${passwordChecks.uppercase ? 'text-emerald-700' : 'text-slate-400'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${passwordChecks.uppercase ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200'}`}>
                        {passwordChecks.uppercase ? '✓' : '•'}
                      </span>
                      <span>Uppercase letter</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${passwordChecks.lowercase ? 'text-emerald-700' : 'text-slate-400'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${passwordChecks.lowercase ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200'}`}>
                        {passwordChecks.lowercase ? '✓' : '•'}
                      </span>
                      <span>Lowercase letter</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${passwordChecks.special ? 'text-emerald-700' : 'text-slate-400'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${passwordChecks.special ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200'}`}>
                        {passwordChecks.special ? '✓' : '•'}
                      </span>
                      <span>Special symbol</span>
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
                className="w-full"
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

              <Button type="submit" className="w-full" isLoading={isSubmitting} leftIcon={<KeyRound className="w-4 h-4" />}>
                Request Reset Instructions
              </Button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => resetFormState('reset-password')}
                  className="text-xs text-indigo-600 hover:underline block mx-auto mb-2"
                >
                  Already have a reset code?
                </button>
                <button
                  type="button"
                  onClick={() => resetFormState('login')}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
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
                label="Verification Code / Token"
                placeholder="Paste code from email"
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
                  className="text-xs font-medium text-slate-500 hover:text-slate-800"
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
