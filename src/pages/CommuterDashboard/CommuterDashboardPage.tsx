import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  Clock,
  Compass,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { JourneySearchForm } from '../../components/journey/JourneySearchForm';
import { CrowdingBadge } from '../../components/crowding/CrowdingBadge';
import { DemoDataTag, DemoEstimateDisclaimer } from '../../components/common/StateBlocks';
import { useAuth } from '../../context/AuthContext';
import { useAppState } from '../../context/AppStateContext';
import { DEMO_DATASET_METADATA, STOP_BY_ID } from '../../data/demo/delhiTransitData';
import { JourneyPreference } from '../../types/transit';

export default function CommuterDashboardPage() {
  const { user } = useAuth();
  const { savedJourneys, searchHistory, favouriteStopIds, preferences } = useAppState();
  const navigate = useNavigate();

  const handleSearch = (params: {
    origin: string;
    destination: string;
    date: string;
    time: string;
    preference: JourneyPreference;
  }) => {
    const sp = new URLSearchParams({
      origin: params.origin,
      destination: params.destination,
      date: params.date,
      time: params.time,
      pref: params.preference,
    });
    navigate(`/results?${sp.toString()}`);
  };

  return (
    <WorkspaceLayout section="commuter" breadcrumb="Dashboard">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <Sparkles className="h-3.5 w-3.5 text-yellow-300" aria-hidden="true" />
              <span>Delhi Commuter Workspace</span>
            </div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white">
              Welcome{user ? `, ${user.name}` : ' to CrowdWise Commuter'}
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Compare Delhi bus options by scheduled duration, transfers, and historical segment
              crowdedness.
            </p>
          </div>
          <div className="cw-card-alt rounded-xl px-3.5 py-2 text-xs text-[var(--cw-text-secondary)] font-mono shrink-0">
            Data Cycle: <span className="text-yellow-300">{DEMO_DATASET_METADATA.period}</span>
          </div>
        </div>

        <DemoEstimateDisclaimer compact />

        {/* Quick Journey Search */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-white">Plan a Bus Journey</h2>
            <DemoDataTag label="GTFS DEMO" />
          </div>
          <JourneySearchForm
            initialOrigin={preferences.preferredOriginStopId || 'DL_STP_001'}
            initialPreference={preferences.defaultPreference}
            onSearchSubmitted={handleSearch}
          />
        </section>

        {/* Grid: Recent Searches, Saved Journeys, Favourite/Nearby Stops */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Searches */}
          <section className="cw-card rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-white/10">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-teal-400" aria-hidden="true" />
                  <span>Recent Searches</span>
                </h2>
                <Link to="/history" className="text-xs font-semibold text-emerald-300 hover:underline">
                  View all
                </Link>
              </div>
              {searchHistory.length === 0 ? (
                <p className="text-xs text-[var(--cw-text-muted)] py-4">
                  No recent searches yet. Run a bus journey search above to save history.
                </p>
              ) : (
                <ul className="divide-y divide-white/10">
                  {searchHistory.slice(0, 3).map((item) => (
                    <li key={item.id} className="py-2.5">
                      <Link
                        to={`/results?origin=${item.originStopId}&destination=${item.destinationStopId}&date=${item.departureDate}&time=${item.departureTime}&pref=${item.preference}`}
                        className="group block"
                      >
                        <div className="text-xs font-semibold text-white group-hover:text-emerald-300 truncate transition-colors">
                          {item.originStopName} → {item.destinationStopName}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--cw-text-muted)] font-mono">
                          {item.departureTime} · {item.preference.replace('_', ' ')} ·{' '}
                          {item.resultsCount} options
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Saved Journeys */}
          <section className="cw-card rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-white/10">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-yellow-300" aria-hidden="true" />
                  <span>Saved Journeys</span>
                </h2>
                <Link to="/saved" className="text-xs font-semibold text-emerald-300 hover:underline">
                  Manage
                </Link>
              </div>
              {savedJourneys.length === 0 ? (
                <div className="py-4 space-y-2.5">
                  <p className="text-xs text-[var(--cw-text-muted)]">
                    You have not saved any bus journeys yet. Save a result card to bookmark it
                    here.
                  </p>
                  <Link
                    to="/planner"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-yellow-300 hover:underline"
                  >
                    <span>Browse routes</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-white/10">
                  {savedJourneys.slice(0, 3).map((s) => (
                    <li key={s.id} className="py-2.5">
                      <Link
                        to={`/journeys/${encodeURIComponent(s.journey.journeyId)}`}
                        className="block group"
                      >
                        <div className="text-xs font-semibold text-white group-hover:text-emerald-300 truncate transition-colors">
                          {s.label}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-mono text-[var(--cw-text-muted)]">
                            Routes {s.journey.routesSummary.join(' → ')} ·{' '}
                            {s.journey.totalDurationMinutes} min
                          </span>
                          <CrowdingBadge level={s.journey.overallCrowding} compact />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Favourite & Nearby Stops */}
          <section className="cw-card rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-white/10">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <span>Pinned Delhi Stops</span>
                </h2>
                <Link
                  to="/nearby-stops"
                  className="text-xs font-semibold text-emerald-300 hover:underline"
                >
                  Find nearby
                </Link>
              </div>
              <ul className="divide-y divide-white/10">
                {favouriteStopIds.slice(0, 3).map((id) => {
                  const stop = STOP_BY_ID[id];
                  if (!stop) return null;
                  return (
                    <li key={id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/stops/${stop.stop_id}`}
                          className="text-xs font-semibold text-white hover:text-emerald-300 truncate block"
                        >
                          {stop.stop_name}
                        </Link>
                        <div className="text-[11px] text-[var(--cw-text-muted)] truncate">
                          {stop.stop_code} · Routes {stop.routes_served.slice(0, 4).join(', ')}
                        </div>
                      </div>
                      <Link
                        to={`/planner?origin=${stop.stop_id}`}
                        className="text-[11px] font-semibold text-yellow-300 hover:underline whitespace-nowrap shrink-0"
                      >
                        Depart here
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        </div>

        {/* Travel Insights & Data Freshness */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-7 cw-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Compass className="h-4 w-4 text-teal-400" aria-hidden="true" />
                <span>Sample Delhi Corridor Insights</span>
              </h2>
              <DemoDataTag />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="cw-card-alt rounded-xl p-3.5">
                <div className="font-semibold text-yellow-200">
                  Morning Inbound Peak (08:00–11:00)
                </div>
                <p className="mt-1.5 text-[var(--cw-text-secondary)] leading-relaxed">
                  Sample records show sustained high demand entering ITO, Connaught Place, and
                  AIIMS Ring Road on Routes 405 and 543.
                </p>
              </div>
              <div className="cw-card-alt rounded-xl p-3.5">
                <div className="font-semibold text-emerald-200">
                  Late-Evening Coverage Caution
                </div>
                <p className="mt-1.5 text-[var(--cw-text-secondary)] leading-relaxed">
                  Trips after 21:00 on sparse branches (e.g. Route 347) carry Insufficient Data
                  badges rather than assuming low occupancy.
                </p>
              </div>
            </div>
          </section>

          <section className="lg:col-span-5 cw-card rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>Data Freshness &amp; Crowdedness Guide</span>
            </h2>
            <div className="flex flex-wrap gap-1.5">
              <CrowdingBadge level="low" compact />
              <CrowdingBadge level="moderate" compact />
              <CrowdingBadge level="high" compact />
              <CrowdingBadge level="very_high" compact />
              <CrowdingBadge level="insufficient_data" compact />
            </div>
            <p className="text-xs text-[var(--cw-text-secondary)] leading-relaxed">
              Last sample batch processed:{' '}
              <span className="font-mono text-white">{DEMO_DATASET_METADATA.lastProcessedAt}</span>.
              Historical estimates are not live vehicle counts.
            </p>
          </section>
        </div>
      </div>
    </WorkspaceLayout>
  );
}
