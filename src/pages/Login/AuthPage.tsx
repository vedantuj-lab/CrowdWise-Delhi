import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  KeyRound,
  Lock,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { useAuth } from '../../context/AuthContext';
import { useAppState } from '../../context/AppStateContext';
import { UserRole } from '../../types/transit';

type AuthMode = 'login' | 'register' | 'forgot';

function routeForRole(role: UserRole, nextPath: string | null): string {
  if (nextPath && nextPath.startsWith('/')) return nextPath;
  if (role === 'admin') return '/admin';
  if (role === 'operator') return '/operator';
  return '/commuter';
}

function mapFirebaseAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (msg.includes('auth/user-not-found')) {
    return 'No account found with this email address.';
  }
  if (msg.includes('auth/email-already-in-use')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (msg.includes('auth/weak-password')) {
    return 'Password must be at least 6 characters long.';
  }
  if (msg.includes('auth/operation-not-allowed')) {
    return 'Email/Password sign-in is not yet enabled in the Firebase console. Please use Continue with Google or enable Email/Password in Firebase Authentication.';
  }
  if (msg.includes('auth/popup-closed-by-user')) {
    return 'Google sign-in popup was closed before completing authentication.';
  }
  return msg || 'Authentication failed. Please try again.';
}

const ROLE_PORTALS: Array<{
  id: 'commuter' | 'operator' | 'admin';
  label: string;
  subtitle: string;
  path: string;
  accent: string;
}> = [
  {
    id: 'commuter',
    label: 'Commuter',
    subtitle: 'Journey planner, nearby stops & saved trips',
    path: '/commuter',
    accent: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
  },
  {
    id: 'operator',
    label: 'Transport Operator',
    subtitle: 'Route demand, hotspots & peak-hour analytics',
    path: '/operator',
    accent: 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200',
  },
  {
    id: 'admin',
    label: 'Administrator',
    subtitle: 'Data ingestion, pipeline, RBAC & audit logs',
    path: '/admin',
    accent: 'border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200',
  },
];

function resolveDestination(
  userRole: UserRole,
  selectedPortal: 'commuter' | 'operator' | 'admin',
  nextPath: string | null
): string {
  if (nextPath && nextPath.startsWith('/')) return nextPath;
  if (userRole === 'admin') {
    return routeForRole(selectedPortal, null);
  }
  if (userRole === 'operator' && (selectedPortal === 'operator' || selectedPortal === 'commuter')) {
    return routeForRole(selectedPortal, null);
  }
  return routeForRole(userRole, null);
}

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next');
  const navigate = useNavigate();
  const {
    user,
    authReady,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    sendPasswordReset,
  } = useAuth();
  const { pushToast } = useAppState();

  const [selectedPortal, setSelectedPortal] = useState<'commuter' | 'operator' | 'admin'>('commuter');
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (authReady && user) {
      navigate(resolveDestination(user.role, selectedPortal, nextPath), { replace: true });
    }
  }, [authReady, user, navigate, nextPath, selectedPortal]);

  const handleGoogleSignIn = async () => {
    setFormError(null);
    setResetNotice(null);
    setSubmitting(true);
    try {
      const profile = await signInWithGoogle(selectedPortal);
      pushToast(`Signed in as ${profile.name} (${profile.role}).`, 'success');
      navigate(resolveDestination(profile.role, selectedPortal, nextPath), { replace: true });
    } catch (err) {
      setFormError(mapFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setResetNotice(null);

    if (!email.trim()) {
      setFormError('Please enter your email address.');
      return;
    }

    if (mode === 'forgot') {
      setSubmitting(true);
      try {
        await sendPasswordReset(email.trim());
        setResetNotice(
          `Password reset email sent to ${email.trim()}. Check your inbox to reset your password.`
        );
      } catch (err) {
        setFormError(mapFirebaseAuthError(err));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === 'register' && !name.trim()) {
      setFormError('Please enter your full name.');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const profile =
        mode === 'register'
          ? await registerWithEmail(name.trim(), email.trim(), password, selectedPortal)
          : await signInWithEmail(email.trim(), password);
      pushToast(
        mode === 'register'
          ? `Welcome to CrowdWise Delhi, ${profile.name}.`
          : `Signed in as ${profile.name}.`,
        'success'
      );
      navigate(resolveDestination(profile.role, selectedPortal, nextPath), { replace: true });
    } catch (err) {
      setFormError(mapFirebaseAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-md border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-mono text-teal-200">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>FIREBASE AUTHENTICATION · RBAC</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white">
            Sign In to CrowdWise Delhi
          </h1>
          <p className="text-sm text-slate-300">
            Select your workspace portal (Commuter, Transport Operator, or Administrator) and sign in
            with Google or email.
          </p>
        </div>

        {/* 3-Role Workspace Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Select workspace role">
          {ROLE_PORTALS.map((portal) => {
            const active = selectedPortal === portal.id;
            return (
              <button
                key={portal.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelectedPortal(portal.id)}
                className={`rounded-xl border p-3.5 text-left transition-all ${
                  active
                    ? portal.accent
                    : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                <div className="text-sm font-semibold">{portal.label}</div>
                <div className="mt-1 text-[11px] opacity-80 leading-snug">{portal.subtitle}</div>
              </button>
            );
          })}
        </div>

        <section className="cw-card rounded-2xl p-6 sm:p-8 space-y-6">
          {/* Google Sign-In */}
          <button
            type="button"
            disabled={submitting}
            onClick={handleGoogleSignIn}
            className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-white/15 bg-white text-slate-900 px-4 py-2.5 text-sm font-semibold hover:bg-slate-100 transition-colors disabled:opacity-60"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
              />
            </svg>
            <span>{submitting ? 'Signing in...' : 'Continue with Google'}</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-white/10" />
            <span className="bg-[var(--cw-surface)] px-3 text-[11px] font-mono uppercase text-slate-400">
              or email
            </span>
            <div className="w-full border-t border-white/10" />
          </div>

          {/* Auth Mode Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
            {[
              { id: 'login' as const, label: 'Sign In', Icon: Lock },
              { id: 'register' as const, label: 'Create Account', Icon: UserPlus },
              { id: 'forgot' as const, label: 'Forgot Password', Icon: KeyRound },
            ].map((tab) => {
              const Icon = tab.Icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setMode(tab.id);
                    setFormError(null);
                    setResetNotice(null);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    mode === tab.id
                      ? 'bg-teal-500 text-slate-950'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {resetNotice && (
            <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-4 py-2.5 text-xs text-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{resetNotice}</span>
            </div>
          )}

          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-rose-400/35 bg-rose-500/15 px-4 py-2.5 text-xs text-rose-200"
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="cw-input w-full rounded-lg px-3 py-2 text-sm"
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="cw-input w-full rounded-lg px-3 py-2 text-sm"
                autoComplete="email"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label htmlFor="auth-pass" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <input
                  id="auth-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="cw-input w-full rounded-lg px-3 py-2 text-sm"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-400 transition-colors disabled:opacity-60"
            >
              {submitting
                ? 'Please wait...'
                : mode === 'register'
                ? 'Create Commuter Account'
                : mode === 'forgot'
                ? 'Send Password Reset Email'
                : 'Sign In'}
            </button>
          </form>

          <p className="text-[11px] text-slate-400 leading-relaxed border-t border-white/10 pt-4">
            New accounts register as Commuters. Transport Operator and Administrator access is
            provisioned exclusively by authorized platform administrators.
          </p>
        </section>
      </div>
    </PublicLayout>
  );
}
