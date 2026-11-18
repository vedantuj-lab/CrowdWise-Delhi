import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Compass,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { JourneySearchForm } from '../../components/journey/JourneySearchForm';
import { CrowdingBadge } from '../../components/crowding/CrowdingBadge';
import { DemoDataTag } from '../../components/common/StateBlocks';

export default function LandingPage() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-teal-300 bg-teal-500/10 border border-teal-400/30 rounded-md px-3 py-1">
                <span>GTFS BUS-ONLY INTELLIGENCE · DELHI</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.08]">
                Know the Crowd{' '}
                <span className="bg-gradient-to-r from-teal-300 via-sky-300 to-amber-300 bg-clip-text text-transparent">
                  Before You Board.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                Compare Delhi DTC and Cluster bus journeys by both travel duration and historical
                passenger-demand estimates across routes, stops, and time bands—so commuters and
                transit planners make informed decisions.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/planner"
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/20"
                >
                  <span>Plan Your Bus Journey</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-100 hover:bg-white/10 transition-colors"
                >
                  <span>Explore How It Works</span>
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-400/35 bg-amber-400/10 px-4 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-400/20 transition-colors"
                >
                  <span>Role Workspaces</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="cw-card overflow-hidden rounded-2xl">
                <div className="relative h-64 sm:h-72">
                  <img
                    src="/src/assets/images/hero_delhi_bus_1794898435824.jpg"
                    alt="Modern electric low-floor city bus operating along a tree-lined New Delhi corridor"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080D1A] via-[#080D1A]/35 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-white/15 bg-[#080D1A]/85 p-3 backdrop-blur-md">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">
                        Segment Demand Transparency
                      </span>
                      <DemoDataTag />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">
                      Every estimate surfaces its evidence basis, confidence tier, and coverage
                      ratio—never fabricated live occupancy.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Embedded Quick Journey Search */}
          <div className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="font-display text-base font-bold text-white">
                Quick Delhi Bus Route &amp; Crowding Search
              </h2>
              <span className="text-xs text-slate-400">
                Sample GTFS fixture: 10 routes · 29 disambiguated stops · bus-only
              </span>
            </div>
            <JourneySearchForm />
          </div>
        </div>
      </section>

      {/* Three Distinct Role Portals Preview */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">
              Three Purpose-Built Transit Roles
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Dedicated dashboards, visual palettes, and role-gated capabilities for passengers,
              transit analysts, and platform administrators.
            </p>
          </div>
          <Link
            to="/login"
            className="text-xs font-semibold text-teal-300 hover:text-teal-200 inline-flex items-center gap-1"
          >
            <span>Open Role Sign-In</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-emerald-400/25 bg-[#0D1C20] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-emerald-300">
                ROLE 01 · COMMUTER
              </span>
              <Compass className="h-5 w-5 text-yellow-300" aria-hidden="true" />
            </div>
            <h3 className="font-display text-lg font-bold text-white">
              Passenger Journey Companion
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Plan direct or 1-transfer Delhi bus trips, inspect segment crowding, find nearby
              shelters, save frequent commutes, and track least-crowded options.
            </p>
            <Link
              to="/login/commuter"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200"
            >
              <span>Enter Commuter Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="rounded-2xl border border-sky-400/25 bg-[#0B1329] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-cyan-300">
                ROLE 02 · OPERATOR
              </span>
              <BarChart3 className="h-5 w-5 text-orange-400" aria-hidden="true" />
            </div>
            <h3 className="font-display text-lg font-bold text-white">
              Demand &amp; Operations Intelligence
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Analyze corridor passenger counts, AC vs. Non-AC fleet demand, ticket-type splits,
              congestion hotspots, chronological model benchmarks, and CSV/PDF reports.
            </p>
            <Link
              to="/login/operator"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
            >
              <span>Enter Operator Intelligence</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="rounded-2xl border border-violet-400/30 bg-[#140D24] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-fuchsia-300">
                ROLE 03 · ADMINISTRATOR
              </span>
              <ShieldCheck className="h-5 w-5 text-amber-300" aria-hidden="true" />
            </div>
            <h3 className="font-display text-lg font-bold text-white">
              Data Governance &amp; 14-Stage ETL
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Manage GTFS route/stop aliases, validate ticketing CSV schemas, monitor the 14-stage
              processing pipeline, govern model versions, and inspect audit trails.
            </p>
            <Link
              to="/login/admin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-fuchsia-300 hover:text-fuchsia-200"
            >
              <span>Enter Admin Console</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="cw-card rounded-2xl p-6 space-y-3">
            <Sparkles className="h-5 w-5 text-teal-300" aria-hidden="true" />
            <h3 className="font-display text-lg font-bold text-white">
              Fastest vs. Balanced vs. Least Crowded
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every search ranks direct and 1-transfer GTFS bus itineraries separately so you can
              see whether a slightly longer corridor avoids a peak-hour bottleneck.
            </p>
            <div className="pt-2 flex flex-wrap gap-1.5">
              <CrowdingBadge level="low" compact />
              <CrowdingBadge level="moderate" compact />
              <CrowdingBadge level="very_high" compact />
            </div>
          </div>

          <div className="cw-card rounded-2xl p-6 space-y-3">
            <ShieldCheck className="h-5 w-5 text-amber-300" aria-hidden="true" />
            <h3 className="font-display text-lg font-bold text-white">
              Confidence-Gated Recommendations
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Routes with sparse records or ambiguous loop directions are tagged Low Confidence or
              Insufficient Data and never falsely promoted as Least Crowded.
            </p>
          </div>

          <div className="cw-card rounded-2xl p-6 space-y-3">
            <BarChart3 className="h-5 w-5 text-sky-300" aria-hidden="true" />
            <h3 className="font-display text-lg font-bold text-white">
              Observed vs. Reconstructed Separation
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Operator views strictly separate raw observed e-ticketing demand, reconstructed trip
              passenger loads, and chronological ML candidate predictions.
            </p>
          </div>
        </div>
      </section>

      {/* Delhi Corridor Context Banner */}
      <section className="border-t border-white/10 bg-[#0B1222]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5">
            <img
              src="/src/assets/images/delhi_bus_shelter_1794898436243.jpg"
              alt="Commuters waiting calmly at an illuminated modern Delhi bus shelter in daylight"
              referrerPolicy="no-referrer"
              className="h-64 w-full rounded-2xl object-cover border border-white/15 shadow-xl"
            />
          </div>
          <div className="lg:col-span-7 space-y-4">
            <h2 className="font-display text-2xl font-bold text-white">
              Built for Real Delhi Bus Network Complexity
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Delhi transit data spans DTC and DIMTS Cluster agencies, overlapping stop names
              across multiple ISBT bays, and partial GPS linkages. CrowdWise Delhi keeps every GTFS{' '}
              <code className="font-mono text-teal-300">stop_id</code> and directional sequence
              explicit.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm text-slate-200">
              {[
                'Bay-level GTFS stop_id disambiguation',
                'Direction-verified segment modeling',
                'Strict software-only architecture (zero hardware)',
                'Transparent demo-mode vs. FastAPI parity',
              ].map((pt) => (
                <li key={pt} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                to="/methodology"
                className="rounded-lg bg-white/10 border border-white/15 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
              >
                Read Data Methodology
              </Link>
              <Link
                to="/crowdedness-guide"
                className="rounded-lg border border-teal-400/35 bg-teal-500/10 px-4 py-2 text-xs font-semibold text-teal-200 hover:bg-teal-500/20"
              >
                View Crowdedness Guide
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
