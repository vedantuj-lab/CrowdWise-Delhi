import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
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
import { Bus, Layers, MapPin, Ticket } from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
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
import { DEMO_ROUTES, TIME_BAND_META } from '../../data/demo/delhiTransitData';
import { transitApi } from '../../services/api/client';
import { DemandBreakdownPayload, OperatorOverview, TimeBand } from '../../types/transit';

export default function OperatorDashboardPage() {
  const [dateRange, setDateRange] = useState('all_oct_demo');
  const [agency, setAgency] = useState('ALL');
  const [routeId, setRouteId] = useState('ALL');
  const [direction, setDirection] = useState('ALL');
  const [timeBand, setTimeBand] = useState<string>('ALL');

  const [overview, setOverview] = useState<OperatorOverview | null>(null);
  const [demandBreakdown, setDemandBreakdown] = useState<DemandBreakdownPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, bdRes] = await Promise.all([
        transitApi.getAnalyticsOverview({
          dateRange,
          agency,
          routeId,
          timeBand,
        }),
        transitApi.getDemandBreakdown(agency),
      ]);
      setOverview(ovRes);
      setDemandBreakdown(bdRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load operator overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, agency, routeId, direction, timeBand]);

  return (
    <WorkspaceLayout section="operator" breadcrumb="Overview">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Operator Transit-Demand Overview
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Network-wide ticketing ingestion coverage, route/stop matching quality, and{' '}
              <span className="font-mono text-cyan-300">passenger_count</span> demand breakdown.
            </p>
          </div>
          <DemoDataTag label="DEMO ANALYTICS FIXTURE" />
        </div>

        <DemoEstimateDisclaimer compact />

        {/* Filter Bar */}
        <section className="cw-card rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label
              htmlFor="op-date"
              className="block text-[11px] font-semibold text-[var(--cw-text-secondary)] mb-1"
            >
              Date Range
            </label>
            <select
              id="op-date"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="cw-input w-full rounded-lg px-2.5 py-2 text-xs"
            >
              <option value="all_oct_demo">Sample Oct Cycle (31d)</option>
              <option value="last_7_days">Sample Final 7 Days</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="op-agency"
              className="block text-[11px] font-semibold text-[var(--cw-text-secondary)] mb-1"
            >
              Bus Agency
            </label>
            <select
              id="op-agency"
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
              className="cw-input w-full rounded-lg px-2.5 py-2 text-xs"
            >
              <option value="ALL">All Agencies (DTC + DIMTS)</option>
              <option value="DTC">DTC Only</option>
              <option value="DIMTS">DIMTS Cluster Only</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="op-route"
              className="block text-[11px] font-semibold text-[var(--cw-text-secondary)] mb-1"
            >
              Route Filter
            </label>
            <select
              id="op-route"
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              className="cw-input w-full rounded-lg px-2.5 py-2 text-xs"
            >
              <option value="ALL">All 10 GTFS Routes</option>
              {DEMO_ROUTES.map((r) => (
                <option key={r.route_id} value={r.route_id}>
                  Bus {r.route_short_name} ({r.agency_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="op-dir"
              className="block text-[11px] font-semibold text-[var(--cw-text-secondary)] mb-1"
            >
              Direction
            </label>
            <select
              id="op-dir"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              className="cw-input w-full rounded-lg px-2.5 py-2 text-xs"
            >
              <option value="ALL">Both Directions</option>
              <option value="0">Direction 0 (Outbound)</option>
              <option value="1">Direction 1 (Inbound)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="op-band"
              className="block text-[11px] font-semibold text-[var(--cw-text-secondary)] mb-1"
            >
              Time Band
            </label>
            <select
              id="op-band"
              value={timeBand}
              onChange={(e) => setTimeBand(e.target.value)}
              className="cw-input w-full rounded-lg px-2.5 py-2 text-xs"
            >
              <option value="ALL">All Time Bands</option>
              {(Object.keys(TIME_BAND_META) as TimeBand[]).map((tb) => (
                <option key={tb} value={tb}>
                  {TIME_BAND_META[tb].label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {loading && <LoadingSkeleton rows={4} />}
        {error && !loading && <ErrorState message={error} onRetry={loadOverview} />}

        {!loading && !error && overview && (
          <>
            {/* KPI Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="cw-card rounded-2xl p-4">
                <div className="text-xs text-[var(--cw-text-muted)]">Ticket Records Processed</div>
                <div className="mt-1 font-mono tabular-nums text-2xl font-bold text-white">
                  {overview.totalTicketRecordsProcessed.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-orange-300">Sample Oct fixture</div>
              </div>

              <div className="cw-card rounded-2xl p-4">
                <div className="text-xs text-[var(--cw-text-muted)]">Represented Passengers</div>
                <div className="mt-1 font-mono tabular-nums text-2xl font-bold text-cyan-300">
                  {overview.passengerCountsRepresented.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-[var(--cw-text-muted)]">
                  Sum of passenger_count
                </div>
              </div>

              <div className="cw-card rounded-2xl p-4">
                <div className="text-xs text-[var(--cw-text-muted)]">GTFS Coverage</div>
                <div className="mt-1 font-mono tabular-nums text-2xl font-bold text-white">
                  {overview.routesCovered}/{overview.totalGtfsRoutes} routes
                </div>
                <div className="mt-1 font-mono text-[11px] text-[var(--cw-text-muted)]">
                  {overview.stopsCovered}/{overview.totalGtfsStops} stops matched
                </div>
              </div>

              <div className="cw-card rounded-2xl p-4">
                <div className="text-xs text-[var(--cw-text-muted)]">Route / Stop Match Rate</div>
                <div className="mt-1 font-mono tabular-nums text-2xl font-bold text-blue-300">
                  {overview.routeMatchingRate}% / {overview.stopMatchingRate}%
                </div>
                <div className="mt-1 text-[11px] text-[var(--cw-text-muted)]">
                  Alias-assisted GTFS match
                </div>
              </div>

              <div className="cw-card rounded-2xl p-4">
                <div className="text-xs text-[var(--cw-text-muted)]">Coverage Status</div>
                <div className="mt-1 text-base font-bold text-orange-300">
                  Partial Demo Fixture
                </div>
                <div className="mt-1 font-mono text-[11px] text-[var(--cw-text-muted)] truncate">
                  {overview.modelVersion}
                </div>
              </div>
            </section>

            {/* Daily Volume Chart + Metadata & Depot Visual */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <section className="lg:col-span-8 cw-card rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Daily Ticketing Records vs. Represented Passenger Volume
                    </h2>
                    <p className="text-xs text-[var(--cw-text-muted)]">
                      Sample 14-day daily progression across weekday and weekend service cycles
                    </p>
                  </div>
                  <DemoDataTag />
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overview.dailyVolumeSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke={DARK_CHART_GRID} />
                      <XAxis dataKey="date" tick={DARK_CHART_AXIS} />
                      <YAxis tick={DARK_CHART_AXIS} />
                      <Tooltip {...DARK_TOOLTIP_STYLE} />
                      <Legend {...DARK_LEGEND_STYLE} />
                      <Area
                        type="monotone"
                        dataKey="passengerCount"
                        name="Represented Passengers (Demo)"
                        stroke="#22D3EE"
                        fill="rgba(34, 211, 238, 0.2)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="ticketRecords"
                        name="Ticket Records (Demo)"
                        stroke="#F97316"
                        fill="rgba(249, 115, 22, 0.16)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <aside className="lg:col-span-4 space-y-4">
                <div className="cw-card rounded-2xl overflow-hidden">
                  <img
                    src="/src/assets/images/delhi_bus_depot_1794898437428.jpg"
                    alt="Modern electric buses aligned in numbered bays at a New Delhi bus depot"
                    referrerPolicy="no-referrer"
                    className="h-40 w-full object-cover"
                  />
                  <div className="p-4 space-y-2 text-xs">
                    <div className="font-semibold text-white">Batch Metadata</div>
                    <div className="flex justify-between">
                      <span className="text-[var(--cw-text-muted)]">Data Period:</span>
                      <span className="font-medium text-white text-right">
                        {overview.dataPeriod}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--cw-text-muted)]">Last Processed:</span>
                      <span className="font-mono text-cyan-300">
                        {overview.lastProcessingTime.slice(0, 16)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--cw-text-muted)]">Model Version:</span>
                      <span className="font-mono text-white">{overview.modelVersion}</span>
                    </div>
                  </div>
                </div>

                <div className="cw-card rounded-2xl p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-white">Agency Breakdown</h3>
                  <div className="divide-y divide-white/10 text-xs">
                    {overview.agencyBreakdown.map((ag) => (
                      <div key={ag.agency} className="py-2 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-white">{ag.agency}</div>
                          <div className="text-[var(--cw-text-muted)]">
                            {ag.routes} routes · {ag.matchRate}% route match
                          </div>
                        </div>
                        <span className="font-mono tabular-nums font-semibold text-cyan-300">
                          {ag.ticketRecords.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <Link
                      to="/operator/routes"
                      className="text-xs font-semibold text-blue-300 hover:underline"
                    >
                      Route Analytics →
                    </Link>
                    <Link
                      to="/operator/data-quality"
                      className="text-xs font-semibold text-orange-300 hover:underline ml-auto"
                    >
                      Data Quality →
                    </Link>
                  </div>
                </div>
              </aside>
            </div>

            {/* Passenger Demand Analysis Section */}
            {demandBreakdown && (
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                      <Layers className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                      <span>
                        Passenger Demand Analysis (
                        {demandBreakdown.totalPassengerCount.toLocaleString()} represented trips)
                      </span>
                    </h2>
                    <p className="text-xs text-[var(--cw-text-muted)]">
                      Ticket-type mix, AC vs. Non-AC fleet distribution, top boarding stops, and
                      hourly demand curve derived from <span className="font-mono">passenger_count</span>.
                    </p>
                  </div>
                  <DemoDataTag label="PASSENGER_COUNT BREAKDOWN" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Ticket Type Distribution */}
                  <div className="lg:col-span-6 cw-card rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-orange-400" aria-hidden="true" />
                        <span>Passengers by Ticket Category</span>
                      </h3>
                    </div>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={demandBreakdown.byTicketType}>
                          <CartesianGrid strokeDasharray="3 3" stroke={DARK_CHART_GRID} />
                          <XAxis dataKey="label" tick={DARK_CHART_AXIS} />
                          <YAxis tick={DARK_CHART_AXIS} />
                          <Tooltip {...DARK_TOOLTIP_STYLE} />
                          <Bar
                            dataKey="passengerCount"
                            name="Passenger Count"
                            fill="#3B82F6"
                            radius={[5, 5, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Hourly Passenger Curve */}
                  <div className="lg:col-span-6 cw-card rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white">
                        Hourly Passenger Count vs. Ticket Records
                      </h3>
                    </div>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={demandBreakdown.hourlyPassengerDistribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke={DARK_CHART_GRID} />
                          <XAxis dataKey="hour" tick={DARK_CHART_AXIS} />
                          <YAxis tick={DARK_CHART_AXIS} />
                          <Tooltip {...DARK_TOOLTIP_STYLE} />
                          <Legend {...DARK_LEGEND_STYLE} />
                          <Line
                            type="monotone"
                            dataKey="passengerCount"
                            name="Passenger Count"
                            stroke="#22D3EE"
                            strokeWidth={2.5}
                          />
                          <Line
                            type="monotone"
                            dataKey="ticketRecords"
                            name="Ticket Issuances"
                            stroke="#F97316"
                            strokeDasharray="4 4"
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* AC vs Non-AC Breakdown */}
                  <div className="lg:col-span-5 cw-card rounded-2xl p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Bus className="h-4 w-4 text-blue-400" aria-hidden="true" />
                      <span>AC vs. Non-AC Fleet Demand Share</span>
                    </h3>
                    <div className="space-y-3">
                      {demandBreakdown.acVsNonAc.map((fleet) => (
                        <div key={fleet.fleetType} className="cw-card-alt rounded-xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-white">{fleet.fleetType}</span>
                            <span className="font-mono font-bold text-cyan-300">
                              {fleet.sharePercent}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                fleet.isAc ? 'bg-cyan-400' : 'bg-orange-400'
                              }`}
                              style={{ width: `${fleet.sharePercent}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[var(--cw-text-muted)]">
                            <span className="font-mono">
                              {fleet.passengerCount.toLocaleString()} pax ({fleet.ticketRecords.toLocaleString()} tkt)
                            </span>
                            <span>{fleet.avgOccupancyHint}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Stops by Passenger Count */}
                  <div className="lg:col-span-7 cw-card rounded-2xl p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-orange-400" aria-hidden="true" />
                      <span>Top Delhi Stops by Passenger Count</span>
                    </h3>
                    <div className="divide-y divide-white/10 text-xs">
                      {demandBreakdown.topStopsByPassengerCount.map((st, idx) => (
                        <div
                          key={st.stopId}
                          className="py-2.5 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate">
                              {idx + 1}. {st.stopName}
                            </div>
                            <div className="text-[11px] text-[var(--cw-text-muted)]">
                              {st.stopId} · {st.corridor}
                            </div>
                          </div>
                          <div className="text-right shrink-0 font-mono">
                            <div className="font-semibold text-cyan-300">
                              {st.passengerCount.toLocaleString()} pax
                            </div>
                            <div className="text-[11px] text-[var(--cw-text-muted)]">
                              {st.ticketRecords.toLocaleString()} records
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}
