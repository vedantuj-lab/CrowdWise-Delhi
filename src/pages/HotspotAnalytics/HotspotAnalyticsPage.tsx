import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { DelhiTransitMap, MapSegmentOverlay } from '../../components/maps/DelhiTransitMap';
import { CrowdingBadge } from '../../components/crowding/CrowdingBadge';
import {
  DARK_CHART_AXIS,
  DARK_CHART_GRID,
  DARK_LEGEND_STYLE,
  DARK_TOOLTIP_STYLE,
} from '../../components/common/ChartTheme';
import {
  DemoDataTag,
  DemoEstimateDisclaimer,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from '../../components/common/StateBlocks';
import {
  DEMO_ROUTES,
  DEMO_STOPS,
  TIME_BAND_META,
  buildDemoSegmentCrowding,
} from '../../data/demo/delhiTransitData';
import { transitApi } from '../../services/api/client';
import { HotspotRecord, TimeBand } from '../../types/transit';

export default function HotspotAnalyticsPage() {
  const [routeId, setRouteId] = useState('ALL');
  const [timeBand, setTimeBand] = useState('ALL');
  const [hotspots, setHotspots] = useState<HotspotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHotspots = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await transitApi.getHotspots({ routeId, timeBand });
      setHotspots(res.hotspots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load hotspot analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHotspots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, timeBand]);

  const mapHotspotSegments = useMemo<MapSegmentOverlay[]>(() => {
    const out: MapSegmentOverlay[] = [];
    for (const hs of hotspots) {
      const route = DEMO_ROUTES.find((r) => r.route_id === hs.routeId);
      const fromStop = DEMO_STOPS.find((s) => s.stop_name === hs.fromStopName);
      const toStop = DEMO_STOPS.find((s) => s.stop_name === hs.toStopName);
      if (!route || !fromStop || !toStop) continue;
      out.push({
        segmentId: hs.segmentId,
        routeShortName: hs.routeShortName,
        directionLabel: route.direction_0_label,
        fromStop,
        toStop,
        path: [
          { lat: fromStop.stop_lat, lng: fromStop.stop_lng },
          { lat: toStop.stop_lat, lng: toStop.stop_lng },
        ],
        crowding: buildDemoSegmentCrowding(
          route,
          0,
          fromStop.stop_id,
          toStop.stop_id,
          hs.peakTimeBand,
          'weekday'
        ),
      });
    }
    return out;
  }, [hotspots]);

  const chartData = useMemo(
    () =>
      hotspots.map((h) => ({
        name: `Bus ${h.routeShortName} (${h.fromStopName.split(' ')[0]})`,
        weekdayPeak: h.observedPeakDemand,
        weekendEstimate: Math.round(h.observedPeakDemand / h.weekdayVsWeekendRatio),
      })),
    [hotspots]
  );

  return (
    <WorkspaceLayout section="operator" breadcrumb="Hotspot Analysis">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              High Observed-Demand Hotspot Analysis
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Identifies repeated peak-demand corridors while distinguishing ticketing spikes from
              verified vehicle overcrowding.
            </p>
          </div>
          <DemoDataTag />
        </div>

        <div className="rounded-xl border border-orange-500/35 bg-orange-950/35 p-4 flex items-start gap-2.5 text-xs text-orange-100">
          <AlertTriangle className="h-4 w-4 text-orange-300 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong className="text-white">Evidence Discipline:</strong> Segments backed solely by
            ticketing counts are explicitly labelled <em>High observed-demand hotspot</em> rather
            than verified physical overcrowding.
          </span>
        </div>

        <DemoEstimateDisclaimer compact />

        {/* Filters */}
        <div className="cw-card rounded-2xl p-4 flex flex-wrap gap-3">
          <select
            aria-label="Filter hotspots by route"
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
            className="cw-input rounded-lg px-3 py-2 text-xs"
          >
            <option value="ALL">All Routes</option>
            {DEMO_ROUTES.map((r) => (
              <option key={r.route_id} value={r.route_id}>
                Bus {r.route_short_name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter hotspots by time band"
            value={timeBand}
            onChange={(e) => setTimeBand(e.target.value)}
            className="cw-input rounded-lg px-3 py-2 text-xs"
          >
            <option value="ALL">All Time Bands</option>
            {(['morning_peak', 'evening_peak'] as TimeBand[]).map((tb) => (
              <option key={tb} value={tb}>
                {TIME_BAND_META[tb].label}
              </option>
            ))}
          </select>
        </div>

        {loading && <LoadingSkeleton rows={4} />}
        {error && !loading && <ErrorState message={error} onRetry={loadHotspots} />}

        {!loading && !error && hotspots.length === 0 && (
          <EmptyState
            title="No hotspots match selected filters"
            description="Reset the route or time-band filter to inspect ranked corridors."
            actionLabel="Reset Filters"
            onAction={() => {
              setRouteId('ALL');
              setTimeBand('ALL');
            }}
          />
        )}

        {!loading && !error && hotspots.length > 0 && (
          <>
            <DelhiTransitMap
              stops={DEMO_STOPS}
              segments={mapHotspotSegments}
              showHeatmapDefault
              heightClass="h-[360px]"
              title="Hotspot Demand Density Overlay (Demo)"
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <section className="lg:col-span-7 cw-card rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 bg-white/[0.04] font-semibold text-xs text-white">
                  Ranked Hotspot Corridors
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 text-[var(--cw-text-muted)]">
                      <tr>
                        <th className="px-4 py-2.5">Route &amp; Segment</th>
                        <th className="px-4 py-2.5">Evidence Label</th>
                        <th className="px-4 py-2.5 text-right">Repeat Days</th>
                        <th className="px-4 py-2.5">Demand</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {hotspots.map((h) => (
                        <tr key={h.hotspotId} className="hover:bg-white/[0.03]">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-white">
                              Bus {h.routeShortName}: {h.fromStopName} → {h.toStopName}
                            </div>
                            <div className="text-[11px] text-[var(--cw-text-muted)] capitalize">
                              Peak: {h.peakTimeBand.replace('_', ' ')}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[var(--cw-text-secondary)]">
                            {h.classificationLabel}
                          </td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums text-cyan-300">
                            {h.repeatPeakDaysObserved}d
                          </td>
                          <td className="px-4 py-3">
                            <CrowdingBadge level={h.crowdingLevel} compact />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="lg:col-span-5 cw-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-white">
                    Weekday vs. Weekend Peak Contrast
                  </h2>
                  <DemoDataTag />
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={DARK_CHART_GRID} />
                      <XAxis dataKey="name" tick={DARK_CHART_AXIS} />
                      <YAxis tick={DARK_CHART_AXIS} />
                      <Tooltip {...DARK_TOOLTIP_STYLE} />
                      <Legend {...DARK_LEGEND_STYLE} />
                      <Bar
                        dataKey="weekdayPeak"
                        name="Weekday Peak"
                        fill="#F97316"
                        radius={[5, 5, 0, 0]}
                      />
                      <Bar
                        dataKey="weekendEstimate"
                        name="Weekend"
                        fill="#22D3EE"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}
