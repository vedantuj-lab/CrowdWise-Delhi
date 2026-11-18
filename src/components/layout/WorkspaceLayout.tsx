import React, { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Cpu,
  Database,
  FileSpreadsheet,
  Flame,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Radio,
  Route as RouteIcon,
  Settings,
  ShieldCheck,
  Sliders,
  Upload,
  Users,
  Workflow,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/transit';

interface NavItem {
  to: string;
  label: string;
  Icon: typeof LayoutDashboard;
  end?: boolean;
}

const COMMUTER_LINKS: NavItem[] = [
  { to: '/commuter', label: 'Home', Icon: LayoutDashboard, end: true },
  { to: '/planner', label: 'Plan Journey', Icon: Compass },
  { to: '/saved', label: 'Saved Journeys', Icon: Bookmark },
  { to: '/settings', label: 'My Account', Icon: Settings },
];

const OPERATOR_LINKS: NavItem[] = [
  { to: '/operator', label: 'Overview', Icon: BarChart3, end: true },
  { to: '/operator/routes', label: 'Route & Crowding Analytics', Icon: RouteIcon },
  { to: '/operator/time-analysis', label: 'Time-Based Analysis', Icon: Clock },
  { to: '/operator/model-performance', label: 'Model Performance', Icon: Cpu },
];

const ADMIN_LINKS: NavItem[] = [
  { to: '/admin', label: 'Overview', Icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'User Management', Icon: Users },
  { to: '/admin/data-sources', label: 'Dataset Management', Icon: Database },
  { to: '/admin/pipeline', label: 'Analysis & System Status', Icon: Workflow },
];

const ROLE_THEME_ACCENTS: Record<
  'commuter' | 'operator' | 'admin',
  {
    label: string;
    labelTextClass: string;
    activeNavClass: string;
    primaryCtaClass: string;
    roleIndicator: string;
  }
> = {
  commuter: {
    label: 'Commuter Workspace',
    labelTextClass: 'text-emerald-300',
    activeNavClass: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/35',
    primaryCtaClass: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
    roleIndicator: 'Teal · Emerald · Amber',
  },
  operator: {
    label: 'Operator Intelligence',
    labelTextClass: 'text-cyan-300',
    activeNavClass: 'bg-blue-500/20 text-cyan-200 border border-cyan-400/35',
    primaryCtaClass: 'bg-blue-500 text-white hover:bg-blue-400',
    roleIndicator: 'Midnight Navy · Blue · Orange',
  },
  admin: {
    label: 'Administrator Console',
    labelTextClass: 'text-fuchsia-300',
    activeNavClass: 'bg-violet-500/25 text-fuchsia-200 border border-fuchsia-400/35',
    primaryCtaClass: 'bg-violet-500 text-white hover:bg-violet-400',
    roleIndicator: 'Deep Purple · Violet · Magenta',
  },
};

export function WorkspaceLayout({
  section,
  breadcrumb,
  children,
}: {
  section: 'commuter' | 'operator' | 'admin';
  breadcrumb: string;
  children: React.ReactNode;
}) {
  const { user, role, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems =
    section === 'admin'
      ? ADMIN_LINKS
      : section === 'operator'
      ? OPERATOR_LINKS
      : COMMUTER_LINKS;

  const themeMeta = ROLE_THEME_ACCENTS[section];

  const renderSidebarContent = (isDesktopCollapsed: boolean) => (
    <div className="flex h-full flex-col bg-[var(--cw-sidebar-bg)] text-slate-200 border-r border-white/10">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        {!isDesktopCollapsed && (
          <Link to="/" className="font-display text-base font-bold text-white whitespace-nowrap">
            CrowdWise Delhi
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:bg-white/10 hover:text-white mx-auto"
          title={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isDesktopCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
          className="lg:hidden rounded p-1 text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {!isDesktopCollapsed && (
        <div className="px-4 py-3 border-b border-white/10 space-y-2">
          <div>
            <div className={`text-[11px] font-semibold tracking-wide ${themeMeta.labelTextClass}`}>
              {themeMeta.label}
            </div>
            <div className="mt-0.5 text-xs text-slate-300 truncate">
              {user ? `${user.name} · ${role}` : 'Not signed in'}
            </div>
          </div>
          {(role === 'admin' || role === 'operator') && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Link
                to="/commuter"
                onClick={() => setSidebarOpen(false)}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                  section === 'commuter'
                    ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                Commuter
              </Link>
              <Link
                to="/operator"
                onClick={() => setSidebarOpen(false)}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                  section === 'operator'
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/40'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                Operator
              </Link>
              {role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setSidebarOpen(false)}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                    section === 'admin'
                      ? 'bg-fuchsia-500/25 text-fuchsia-200 border border-fuchsia-400/40'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  Admin
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      <nav
        aria-label={`${themeMeta.label} navigation`}
        className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1"
      >
        {navItems.map((item) => {
          const Icon = item.Icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center ${isDesktopCollapsed ? 'justify-center px-2' : 'gap-2.5 px-3'} rounded-lg py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? themeMeta.activeNavClass
                    : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {!isDesktopCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-2.5 space-y-1.5">
        {!isDesktopCollapsed && (
          <Link
            to="/methodology"
            className="block rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-white/5 hover:text-white"
          >
            Methodology
          </Link>
        )}
        {user ? (
          <button
            type="button"
            title="Sign Out"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className={`flex w-full items-center ${isDesktopCollapsed ? 'justify-center px-2' : 'gap-2 px-3'} rounded-lg py-2 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white`}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {!isDesktopCollapsed && <span>Sign Out</span>}
          </button>
        ) : (
          <Link
            to={`/login?next=${encodeURIComponent(location.pathname)}`}
            className={`block rounded-lg px-3 py-2 text-center text-xs font-semibold transition-colors ${themeMeta.primaryCtaClass}`}
          >
            {isDesktopCollapsed ? 'In' : 'Sign In'}
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div data-cw-theme={section} className="cw-canvas min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:block shrink-0 transition-[width] duration-200 ${collapsed ? 'w-16' : 'w-64'}`}>
        <div className="sticky top-0 h-screen">{renderSidebarContent(collapsed)}</div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 h-full shadow-2xl">{renderSidebarContent(false)}</div>
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setSidebarOpen(false)}
            className="flex-1 bg-black/70"
          />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract for Workspace */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-white/10 bg-[var(--cw-bg-elevated)]/90 backdrop-blur-md px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open workspace sidebar"
              className="lg:hidden rounded-lg border border-white/15 bg-white/5 p-2 text-slate-200 hover:bg-white/10"
            >
              <Menu className="h-4 w-4" />
            </button>
            <nav aria-label="Breadcrumb" className="text-sm text-[var(--cw-text-muted)] truncate">
              <span className={`font-medium ${themeMeta.labelTextClass}`}>{themeMeta.label}</span>
              <span className="mx-2 text-white/25">/</span>
              <span className="font-semibold text-white">{breadcrumb}</span>
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {section === 'commuter' && (
              <Link
                to="/planner"
                className={`inline-flex items-center rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${themeMeta.primaryCtaClass}`}
              >
                Plan Journey
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
