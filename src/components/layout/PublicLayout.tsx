import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PUBLIC_NAV = [
  { to: '/', label: 'Home' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/crowdedness-guide', label: 'Crowdedness Guide' },
  { to: '/methodology', label: 'Data Methodology' },
  { to: '/about', label: 'About' },
];

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardHref =
    role === 'admin'
      ? '/admin'
      : role === 'operator'
      ? '/operator'
      : isAuthenticated
      ? '/commuter'
      : '/login';

  return (
    <div data-cw-theme="public" className="cw-canvas min-h-screen flex flex-col">
      {/* Strict 3-zone Top Bar Contract */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#080D1A]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 py-3.5">
          {/* Zone 1: Clean single-line wordmark */}
          <Link
            to="/"
            className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            CrowdWise Delhi
          </Link>

          {/* Zone 2: 5 concise single-line text links */}
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6">
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'text-teal-300 underline underline-offset-8 decoration-2'
                      : 'text-slate-300 hover:text-white hover:underline underline-offset-8'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Zone 3: 1 primary action + mobile menu button */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={dashboardHref}
              className="hidden sm:inline-flex items-center rounded-lg bg-teal-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-teal-400 transition-colors whitespace-nowrap shrink-0 shadow-sm"
            >
              {isAuthenticated ? 'Open Workspace' : 'Sign In'}
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 p-2 text-slate-200 hover:bg-white/10"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden border-t border-white/10 bg-[#0B1222] px-4 py-3 space-y-1"
          >
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive ? 'bg-teal-500/20 text-teal-200' : 'text-slate-300 hover:bg-white/5'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
              <Link
                to="/planner"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg bg-teal-500 px-3 py-2.5 text-center text-sm font-semibold text-slate-950"
              >
                Plan Your Journey
              </Link>
              <Link
                to={dashboardHref}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg border border-white/15 px-3 py-2.5 text-center text-sm font-semibold text-slate-100"
              >
                {isAuthenticated ? 'Open Workspace' : 'Sign In'}
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-white/10 bg-[#050914]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="font-display text-base font-bold text-white">CrowdWise Delhi</div>
              <p className="mt-2 max-w-md text-sm text-slate-300 leading-relaxed">
                Know the Crowd Before You Board. A software-only, GTFS-aligned Delhi bus journey
                comparison and historical demand intelligence platform.
              </p>
              <p className="mt-3 text-xs text-cyan-300">
                Data-source transparent architecture: metrics are computed strictly from connected
                Static GTFS, historical ticketing, and optional GTFS-Realtime feeds.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-white mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link to="/planner" className="hover:text-teal-300 transition-colors">
                    Bus Journey Planner
                  </Link>
                </li>
                <li>
                  <Link to="/nearby-stops" className="hover:text-teal-300 transition-colors">
                    Nearby Delhi Stops
                  </Link>
                </li>
                <li>
                  <Link to="/methodology" className="hover:text-teal-300 transition-colors">
                    Data Methodology
                  </Link>
                </li>
                <li>
                  <Link to="/about#limitations" className="hover:text-teal-300 transition-colors">
                    Data Limitations
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-white mb-3">Governance &amp; Code</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <Link to="/about" className="hover:text-teal-300 transition-colors">
                    About &amp; Contact
                  </Link>
                </li>
                <li>
                  <Link to="/about#privacy" className="hover:text-teal-300 transition-colors">
                    Privacy Notice
                  </Link>
                </li>
                <li>
                  <Link to="/about#terms" className="hover:text-teal-300 transition-colors">
                    Terms &amp; Maps Notice
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/your-org/CrowdWise-Delhi"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-teal-300 transition-colors"
                  >
                    GitHub Repository (CrowdWise-Delhi)
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-400">
            <span>CrowdWise Delhi · Bus-Only Transit Intelligence Architecture</span>
            <span>Ready for Python/FastAPI + PostgreSQL/PostGIS backend integration</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
