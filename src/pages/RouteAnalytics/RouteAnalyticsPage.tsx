import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, Flame, Printer, Search } from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { DelhiTransitMap, MapSegmentOverlay } from '../../components/maps/DelhiTransitMap';
import { CrowdingBadge } from '../../components/crowding/CrowdingBadge';
import { ConfidenceBadge } from '../../components/crowding/ConfidenceBadge';
import {
  DARK_CHART_AXIS,
  DARK_CHART_GRID,
  DARK_LEGEND_STYLE,
  DARK_TOOLTIP_STYLE,
} from '../../components/common/ChartTheme';
import {
  DemoDataTag,
  DemoEstimateDisclaimer,
  ErrorState,
  LoadingSkeleton,
} from '../../components/common/StateBlocks';
import { useAppState } from '../../context/AppStateContext';
import { buildDemoSegmentCrowding } from '../../data/demo/delhiTransitData';
import { transitApi } from '../../services/api/client';
import {
  HotspotRecord,
  Route,
  RouteAnalyticsSummary,
  SegmentAnalyticsRow,
  Stop,
} from '../../types/transit';

export default function RouteAnalyticsPage() {
  const { routeId } = useParams<{ routeId?: string }>();
  const navigate = useNavigate();
  const { pushToast } = useAppState();

  const [agencyFilter, setAgencyFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [routes, setRoutes] = useState<RouteAnalyticsSummary[]>([]);
  const [segments, setSegments] = useState<SegmentAnalyticsRow[]>([]);
  const [hotspots, setHotspots] = useState<HotspotRecord[]>([]);
  const [selectedRouteDetail, setSelectedRouteDetail] = useState<{
    route: Route;
    stopsDir0: Stop[];
    stopsDir1: Stop[];
    analytics: RouteAnalyticsSummary | null;
  } | null>(null);
  const [directionId, setDirectionId] = useState<0 | 1>(0);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadList = async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, segRes, hsRes] = await Promise.all([
        transitApi.getRouteAnalytics(agencyFilter),
        transitApi.getSegmentAnalytics({ routeId: routeId || 'ALL' }),
        transitApi.getHotspots({ routeId: routeId || 'ALL' }),
      ]);
      setRoutes(res.routes);
      setSegments(segRes.segments || []);
      setHotspots(hsRes.hotspots || []);
      const targetId = routeId || res.routes[0]?.routeId;
      if (targetId) {
        const detail = await transitApi.getRouteDetail(targetId);
        setSelectedRouteDetail(detail);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load route analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyFilter, routeId]);

  const filteredRoutes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(
      (r) =>
        r.routeShortName.toLowerCase().includes(q) ||
        r.routeLongName.toLowerCase().includes(q) ||
        r.agencyId.toLowerCase().includes(q)
    );
  }, [routes, searchQuery]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      await transitApi.downloadCsvReport({ reportType: 'route_demand', format: 'csv' });
      pushToast('Downloaded Route & Crowding Analytics CSV (demo).', 'success');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'CSV export failed.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const activeStops = useMemo(() => {
    if (!selectedRouteDetail) return [];
    return directionId === 0 ? selectedRouteDetail.stopsDir0 : selectedRouteDetail.stopsDir1;
  }, [selectedRouteDetail, directionId]);

  const mapSegments = useMemo<MapSegmentOverlay[]>(() => {
    if (!selectedRouteDetail || activeStops.length < 2) return [];
    const list: MapSegmentOverlay[] = [];
    for (let i = 0; i < activeStops.length - 1; i++) {
      const fromStop = activeStops[i];
      const toStop = activeStops[i + 1];
      list.push({
        segmentId: `${selectedRouteDetail.route.route_id}_${directionId}_${fromStop.stop_id}_${toStop.stop_id}`,
        routeShortName: selectedRouteDetail.route.route_short_name,
        directionLabel:
          directionId === 0
            ? selectedRouteDetail.route.direction_0_label
            : selectedRouteDetail.route.direction_1_label,
        fromStop,
        toStop,
        path: [
          { lat: fromStop.stop_lat, lng: fromStop.stop_lng },
          { lat: toStop.stop_lat, lng: toStop.stop_lng },
        ],
        crowding: buildDemoSegmentCrowding(
          selectedRouteDetail.route,
          directionId,
          fromStop.stop_id,
          toStop.stop_id,
          'morning_peak',
          'weekday'
        ),
      });
    }
    return list;
  }, [selectedRouteDetail, activeStops, directionId]);

  const weekdayVsWeekendData = useMemo(() => {
    if (!selectedRouteDetail?.analytics) return [];
    return [
      {
        dayType: 'Weekday Average',
        tickets: selectedRouteDetail.analytics.weekdayAvgTickets,
      },
      {
        dayType: 'Weekend Average',
        tickets: selectedRouteDetail.analytics.weekendAvgTickets,
      },
    ];
  }, [selectedRouteDetail]);

  return (
    <WorkspaceLayout section="operator" breadcrumb="Route & Crowding Analytics">
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Route &amp; Crowding Analytics
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Unified route-wise demand, direction certainty, segment-level estimates, and corridor
              crowding hotspots (Read-only analytical view).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--cw-text-muted)]"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search route..."
                className="cw-input rounded-lg pl-8 pr-3 py-1.5 text-xs w-40"
              />
            </div>
            <select
              aria-label="Filter routes by agency"
              value={agencyFilter}
              onChange={(e) => setAgencyFilter(e.target.value)}
              className="cw-input rounded-lg px-3 py-1.5 text-xs font-medium"
            >
              <option value="ALL">All Agencies</option>
              <option value="DTC">DTC</option>
              <option value="DIMTS">DIMTS Cluster</option>
            </select>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{exporting ? 'Exporting...' : 'CSV'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
            >
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              <span>PDF</span>
            </button>
            <DemoDataTag />
          </div>
        </div>

        <DemoEstimateDisclaimer compact />

        {loading && <LoadingSkeleton rows={5} />}
        {error && !loading && <ErrorState message={error} onRetry={loadList} />}

        {!loading && !error && (
          <div className="space-y-6">
            {/* Route List Table */}
            <section className="cw-card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 bg-white/[0.04] text-[var(--cw-text-secondary)]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Route</th>
                      <th className="px-4 py-3 font-semibold">Agency</th>
                      <th className="px-4 py-3 font-semibold text-right">Stops</th>
                      <th className="px-4 py-3 font-semibold">Direction Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Observed Tickets</th>
                      <th className="px-4 py-3 font-semibold">Demand Category</th>
                      <th className="px-4 py-3 font-semibold text-right">Coverage</th>
                      <th className="px-4 py-3 font-semibold">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredRoutes.map((r) => {
                      const active = selectedRouteDetail?.route.route_id === r.routeId;
                      return (
                        <tr
                          key={r.routeId}
                          onClick={() => navigate(`/operator/routes/${r.routeId}`)}
                          className={`cursor-pointer transition-colors ${
                            active ? 'bg-blue-500/15' : 'hover:bg-white/[0.04]'
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-white">Bus {r.routeShortName}</div>
                            <div className="text-[11px] text-[var(--cw-text-muted)] truncate max-w-xs">
                              {r.routeLongName}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-cyan-300">{r.agencyId}</td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-[var(--cw-text-secondary)]">
                            {r.stopCount}
                          </td>
                          <td className="px-4 py-3 capitalize font-medium text-[var(--cw-text-secondary)]">
                            {r.directionStatus}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-white">
                            {r.observedTicketingDemand.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <CrowdingBadge level={r.historicalDemandCategory} compact />
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-cyan-300">
                            {r.coveragePercent}%
                          </td>
                          <td className="px-4 py-3 capitalize font-medium text-[var(--cw-text-secondary)]">
                            {r.confidence.replace('_', ' ')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Selected Route Detail Panel */}
            {selectedRouteDetail && (
              <section className="space-y-6">
                <div className="cw-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="text-xs font-mono text-cyan-300">
                      {selectedRouteDetail.route.route_id} · {selectedRouteDetail.route.agency_name}
                    </div>
                    <h2 className="mt-0.5 font-display text-xl font-bold text-white">
                      Bus {selectedRouteDetail.route.route_short_name}:{' '}
                      {selectedRouteDetail.route.route_long_name}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setDirectionId(0)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        directionId === 0
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-[var(--cw-text-secondary)] hover:text-white'
                      }`}
                    >
                      Dir 0: {selectedRouteDetail.route.direction_0_label}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirectionId(1)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        directionId === 1
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-[var(--cw-text-secondary)] hover:text-white'
                      }`}
                    >
                      Dir 1: {selectedRouteDetail.route.direction_1_label}
                    </button>
                  </div>
                </div>

                <DelhiTransitMap
                  stops={activeStops}
                  segments={mapSegments}
                  heightClass="h-[360px]"
                  title={`Route ${selectedRouteDetail.route.route_short_name} — ${
                    directionId === 0
                      ? selectedRouteDetail.route.direction_0_label
                      : selectedRouteDetail.route.direction_1_label
                  }`}
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 cw-card rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white">
                        Time-of-Day Ticketing vs. Candidate Model Demand
                      </h3>
                      <DemoDataTag />
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedRouteDetail.analytics?.hourlyDistribution || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke={DARK_CHART_GRID} />
                          <XAxis dataKey="hour" tick={DARK_CHART_AXIS} />
                          <YAxis tick={DARK_CHART_AXIS} />
                          <Tooltip {...DARK_TOOLTIP_STYLE} />
                          <Legend {...DARK_LEGEND_STYLE} />
                          <Line
                            type="monotone"
                            dataKey="observedTickets"
                            name="Observed Tickets (Demo)"
                            stroke="#F97316"
                            strokeWidth={2}
                          />
                          <Line
                            type="monotone"
                            dataKey="predictedDemand"
                            name="Candidate Model Prediction"
                            stroke="#22D3EE"
                            strokeDasharray="4 4"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="lg:col-span-5 cw-card rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">
                        Weekday vs. Weekend Average
                      </h3>
                      <DemoDataTag />
                    </div>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weekdayVsWeekendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={DARK_CHART_GRID} />
                          <XAxis dataKey="dayType" tick={DARK_CHART_AXIS} />
                          <YAxis tick={DARK_CHART_AXIS} />
                          <Tooltip {...DARK_TOOLTIP_STYLE} />
                          <Bar
                            dataKey="tickets"
                            name="Daily Tickets (Demo)"
                            fill="#3B82F6"
                            radius={[5, 5, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="border-t border-white/10 pt-3">
                      <div className="text-xs font-semibold text-white mb-1.5">
                        Ordered Stop Sequence ({activeStops.length} stops)
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-xs text-[var(--cw-text-secondary)]">
                        {activeStops.map((s, idx) => (
                          <Link
                            key={s.stop_id}
                            to={`/stops/${s.stop_id}`}
                            className="hover:text-cyan-300 transition-colors"
                          >
                            {idx + 1}. {s.stop_name}
                            {idx < activeStops.length - 1 ? ' → ' : ''}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Crowding Hotspots */}
            {hotspots.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-400" aria-hidden="true" />
                    <span>Crowding Hotspots ({hotspots.length})</span>
                  </h2>
                  <DemoDataTag label="HOTSPOTS" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hotspots.map((hs) => (
                    <div key={hs.hotspotId} className="cw-card rounded-2xl p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white">Bus {hs.routeShortName}</span>
                        <CrowdingBadge level={hs.crowdingLevel} compact />
                      </div>
                      <div className="text-[var(--cw-text-secondary)]">
                        {hs.fromStopName} → {hs.toStopName}
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-[var(--cw-text-muted)] pt-1 border-t border-white/10">
                        <span>Peak: {hs.peakTimeBand.replace('_', ' ')}</span>
                        <span className="text-cyan-300">{hs.observedPeakDemand} est. demand</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Segment-Level Estimated Demand Table */}
            {segments.length > 0 && (
              <section className="cw-card rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Segment-Level Estimated Demand ({segments.length} segments)
                    </h2>
                    <p className="text-[11px] text-[var(--cw-text-muted)]">
                      Route, direction, stop-to-stop segment, time period, estimated demand,
                      crowding level, confidence, and supporting observations.
                    </p>
                  </div>
                  <DemoDataTag />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 bg-white/[0.04] text-[var(--cw-text-secondary)]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Route</th>
                        <th className="px-4 py-3 font-semibold">Direction</th>
                        <th className="px-4 py-3 font-semibold">Segment</th>
                        <th className="px-4 py-3 font-semibold">Time Period</th>
                        <th className="px-4 py-3 font-semibold text-right">Est. Demand</th>
                        <th className="px-4 py-3 font-semibold">Crowding</th>
                        <th className="px-4 py-3 font-semibold">Confidence</th>
                        <th className="px-4 py-3 font-semibold text-right">Observations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {segments.slice(0, 20).map((seg) => (
                        <tr key={seg.segmentId} className="hover:bg-white/[0.04]">
                          <td className="px-4 py-2.5 font-semibold text-white">
                            Bus {seg.routeShortName}
                          </td>
                          <td className="px-4 py-2.5 text-[var(--cw-text-secondary)] max-w-[160px] truncate">
                            {seg.directionLabel}
                          </td>
                          <td className="px-4 py-2.5 text-white">
                            {seg.fromStopName} → {seg.toStopName}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--cw-text-muted)]">
                            {seg.timeBand.replace('_', ' ')}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums text-cyan-300">
                            {seg.reconstructedPassengerLoad ??
                              seg.predictedDemand ??
                              seg.observedTicketingDemand ??
                              '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            <CrowdingBadge level={seg.crowdingLevel} compact />
                          </td>
                          <td className="px-4 py-2.5">
                            <ConfidenceBadge confidence={seg.confidence} />
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[var(--cw-text-secondary)]">
                            {seg.sampleCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </WorkspaceLayout>
  );
}
