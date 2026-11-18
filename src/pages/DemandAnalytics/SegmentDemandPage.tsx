import { useEffect, useMemo, useState } from 'react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { DelhiTransitMap, MapSegmentOverlay } from '../../components/maps/DelhiTransitMap';
import { CrowdingBadge } from '../../components/crowding/CrowdingBadge';
import { ConfidenceBadge, ESTIMATE_TYPE_LABELS } from '../../components/crowding/ConfidenceBadge';
import {
  DemoDataTag,
  DemoEstimateDisclaimer,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from '../../components/common/StateBlocks';
import { useAppState } from '../../context/AppStateContext';
import {
  DEMO_ROUTES,
  DEMO_STOPS,
  STOP_BY_ID,
  TIME_BAND_META,
  buildDemoSegmentCrowding,
} from '../../data/demo/delhiTransitData';
import { transitApi } from '../../services/api/client';
import { CrowdingLevel, SegmentAnalyticsRow, TimeBand } from '../../types/transit';

const CROWD_ORDER: Record<CrowdingLevel, number> = {
  very_high: 4,
  high: 3,
  moderate: 2,
  low: 1,
  insufficient_data: 0,
};

export default function SegmentDemandPage() {
  const { preferences } = useAppState();
  const [routeId, setRouteId] = useState('ALL');
  const [timeBand, setTimeBand] = useState('ALL');
  const [stopFilter, setStopFilter] = useState('');
  const [sortBy, setSortBy] = useState<
    'highest_demand' | 'lowest_demand' | 'confidence' | 'sample_count' | 'route'
  >('highest_demand');
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');

  const [segments, setSegments] = useState<SegmentAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSegments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await transitApi.getSegmentAnalytics({ routeId, timeBand });
      setSegments(res.segments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load segment demand.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSegments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, timeBand]);

  const filteredAndSorted = useMemo(() => {
    const q = stopFilter.trim().toLowerCase();
    const list = q
      ? segments.filter(
          (s) =>
            s.fromStopName.toLowerCase().includes(q) ||
            s.toStopName.toLowerCase().includes(q)
        )
      : [...segments];

    const confRank = { high: 3, medium: 2, low: 1, insufficient_data: 0 };

    list.sort((a, b) => {
      if (sortBy === 'highest_demand') {
        const diff = CROWD_ORDER[b.crowdingLevel] - CROWD_ORDER[a.crowdingLevel];
        return (
          diff !== 0
            ? diff
            : (b.observedTicketingDemand ?? -1) - (a.observedTicketingDemand ?? -1)
        );
      }
      if (sortBy === 'lowest_demand') {
        const diff = CROWD_ORDER[a.crowdingLevel] - CROWD_ORDER[b.crowdingLevel];
        return (
          diff !== 0
            ? diff
            : (a.observedTicketingDemand ?? 999) - (b.observedTicketingDemand ?? 999)
        );
      }
      if (sortBy === 'confidence') {
        return confRank[b.confidence.level] - confRank[a.confidence.level];
      }
      if (sortBy === 'sample_count') {
        return b.sampleCount - a.sampleCount;
      }
      return a.routeShortName.localeCompare(b.routeShortName);
    });
    return list;
  }, [segments, stopFilter, sortBy]);

  const mapOverlays = useMemo<MapSegmentOverlay[]>(() => {
    return filteredAndSorted
      .slice(0, 35)
      .map((row) => {
        const fromStop = STOP_BY_ID[row.fromStopId];
        const toStop = STOP_BY_ID[row.toStopId];
        const route = DEMO_ROUTES.find((r) => r.route_id === row.routeId);
        if (!fromStop || !toStop || !route) return null;
        return {
          segmentId: row.segmentId,
          routeShortName: row.routeShortName,
          directionLabel: row.directionLabel,
          fromStop,
          toStop,
          path: [
            { lat: fromStop.stop_lat, lng: fromStop.stop_lng },
            { lat: toStop.stop_lat, lng: toStop.stop_lng },
          ],
          crowding: buildDemoSegmentCrowding(
            route,
            row.directionId,
            fromStop.stop_id,
            toStop.stop_id,
            row.timeBand,
            row.dayType
          ),
        };
      })
      .filter((x): x is MapSegmentOverlay => Boolean(x));
  }, [filteredAndSorted]);

  const cellPad = preferences.compactTables ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <WorkspaceLayout section="operator" breadcrumb="Segment Demand">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Segment Demand Explorer
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Observed ticketing demand, reconstructed passenger load, and model-predicted demand
              are displayed in separate columns and never conflated.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[var(--cw-text-secondary)] hover:text-white'
                }`}
              >
                Table View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'map'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[var(--cw-text-secondary)] hover:text-white'
                }`}
              >
                Map View
              </button>
            </div>
            <DemoDataTag />
          </div>
        </div>

        <DemoEstimateDisclaimer compact />

        {/* Controls */}
        <section className="cw-card rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label
              htmlFor="seg-route"
              className="block text-[11px] font-semibold text-[var(--cw-text-secondary)] mb-1"
            >
              Route
            </label>
            <select
              id="seg-route"
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              className="cw-input w-full rounded-lg px-2.5 py-2 text-xs"
            >
              <option value="ALL">All Routes</option>
              {DEMO_ROUTES.map((r) => (
                <option key={r.route_id} value={r.route_id}>
                  Bus {r.route_short_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="seg-band"
              className="block text-[11px] font-semibold text-[var(--cw-text-secondary)] mb-1"
            >
              Time Band
            </label>
            <select
              id="seg-band"
              value={timeBand}
              onChange={(e) => setTimeBand(e.target.value)}
              className="cw-input w-full rounded-lg px-2.5 py-2 text-xs"
            >
              <option value="ALL">All Sample Bands</option>
              {(['morning_peak', 'midday', 'evening_peak'] as TimeBand[]).map((tb) => (
                <option key={tb} value={tb}>
                  {TIME_BAND_META[tb].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="seg-stop"
              className="block text-[11px] font-semibold text-[var(--cw-text-secondary)] mb-1"
            >
              Stop Name Filter
            </label>
            <input
              id="seg-stop"
              type="text"
              value={stopFilter}
              onChange={(e) => setStopFilter(e.target.value)}
              placeholder="Filter from/to stop..."
              className="cw-input w-full rounded-lg px-2.5 py-2 text-xs"
            />
          </div>

          <div>
            <label
              htmlFor="seg-sort"
              className="block text-[11px] font-semibold text-[var(--cw-text-secondary)] mb-1"
            >
              Sort By
            </label>
            <select
              id="seg-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="cw-input w-full rounded-lg px-2.5 py-2 text-xs"
            >
              <option value="highest_demand">Highest demand</option>
              <option value="lowest_demand">Lowest demand</option>
              <option value="confidence">Confidence</option>
              <option value="sample_count">Sample count</option>
              <option value="route">Route</option>
            </select>
          </div>
        </section>

        {loading && <LoadingSkeleton rows={6} />}
        {error && !loading && <ErrorState message={error} onRetry={loadSegments} />}

        {!loading && !error && filteredAndSorted.length === 0 && (
          <EmptyState
            title="No segment estimates matched"
            description="Adjust route, time band, or stop filter criteria."
            actionLabel="Reset Filters"
            onAction={() => {
              setRouteId('ALL');
              setTimeBand('ALL');
              setStopFilter('');
            }}
          />
        )}

        {!loading && !error && filteredAndSorted.length > 0 && (
          viewMode === 'map' ? (
            <DelhiTransitMap
              stops={DEMO_STOPS}
              segments={mapOverlays}
              showHeatmapDefault
              title="Segment Demand Spatial Overlay"
            />
          ) : (
            <section className="cw-card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 bg-white/[0.04] text-[var(--cw-text-secondary)]">
                    <tr>
                      <th className={`${cellPad} font-semibold`}>Route &amp; Segment</th>
                      <th className={`${cellPad} font-semibold`}>Time Band</th>
                      <th className={`${cellPad} font-semibold text-right`}>Observed Demand</th>
                      <th className={`${cellPad} font-semibold text-right`}>Reconstructed Load</th>
                      <th className={`${cellPad} font-semibold text-right`}>Predicted Demand</th>
                      <th className={`${cellPad} font-semibold`}>Category</th>
                      <th className={`${cellPad} font-semibold`}>Confidence</th>
                      <th className={`${cellPad} font-semibold text-right`}>Samples / Cov.</th>
                      <th className={`${cellPad} font-semibold`}>Estimate Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredAndSorted.slice(0, 45).map((row) => (
                      <tr key={row.segmentId} className="hover:bg-white/[0.04] transition-colors">
                        <td className={cellPad}>
                          <div className="font-semibold text-white">
                            Bus {row.routeShortName}: {row.fromStopName} → {row.toStopName}
                          </div>
                          <div className="text-[11px] text-[var(--cw-text-muted)]">
                            {row.directionLabel}
                          </div>
                        </td>
                        <td className={`${cellPad} capitalize text-[var(--cw-text-secondary)]`}>
                          {row.timeBand.replace('_', ' ')}
                        </td>
                        <td className={`${cellPad} text-right font-mono tabular-nums text-white`}>
                          {row.observedTicketingDemand ?? '—'}
                        </td>
                        <td className={`${cellPad} text-right font-mono tabular-nums text-cyan-300`}>
                          {row.reconstructedPassengerLoad ?? '—'}
                        </td>
                        <td className={`${cellPad} text-right font-mono tabular-nums text-orange-300`}>
                          {row.predictedDemand ?? '—'}
                        </td>
                        <td className={cellPad}>
                          <CrowdingBadge level={row.crowdingLevel} compact />
                        </td>
                        <td className={cellPad}>
                          <ConfidenceBadge confidence={row.confidence} />
                        </td>
                        <td
                          className={`${cellPad} text-right font-mono tabular-nums text-[var(--cw-text-secondary)]`}
                        >
                          {row.sampleCount} ({row.coveragePercent}%)
                        </td>
                        <td className={`${cellPad} text-[var(--cw-text-muted)]`}>
                          {ESTIMATE_TYPE_LABELS[row.estimateType]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )
        )}
      </div>
    </WorkspaceLayout>
  );
}
