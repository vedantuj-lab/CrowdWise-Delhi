import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/transit';

export function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  demoUpgradeRole?: Exclude<UserRole, 'public'>;
  children: React.ReactNode;
}) {
  const { hasAccess, isAuthenticated, authReady, role } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return (
      <div
        data-cw-theme="public"
        className="min-h-screen flex items-center justify-center bg-[#080D1A] text-slate-300 text-sm"
      >
        Verifying session...
      </div>
    );
  }

  if (hasAccess(allowedRoles)) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const homeForRole =
    role === 'admin' ? '/admin' : role === 'operator' ? '/operator' : '/commuter';

  return (
    <div
      data-cw-theme="public"
      className="min-h-screen flex items-center justify-center bg-[#080D1A] text-white p-4"
    >
      <div className="cw-card max-w-md w-full rounded-2xl p-6 text-center space-y-4">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-teal-300">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="font-display text-xl font-bold text-white">
          Access Restricted
        </h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          Your account role (<span className="font-mono text-amber-300">{role}</span>) does not
          have permission to access this workspace.
        </p>

        <div className="flex flex-col gap-2.5 pt-2">
          <Link
            to={homeForRole}
            className="w-full rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-400 transition-colors"
          >
            Return to Your Workspace
          </Link>
          <Link to="/" className="text-xs text-slate-400 hover:text-white pt-1">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
