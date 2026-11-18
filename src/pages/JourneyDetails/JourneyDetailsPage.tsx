import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, Clock, MapPin } from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { DelhiTransitMap, MapSegmentOverlay } from '../../components/maps/DelhiTransitMap';
import { CrowdingBadge } from '../../components/crowding/CrowdingBadge';
import { ConfidenceBadge, ESTIMATE_TYPE_LABELS } from '../../components/crowding/ConfidenceBadge';
import {
  DemoDataTag,
  DemoEstimateDisclaimer,
  ErrorState,
  LoadingSkeleton,
} from '../../components/common/StateBlocks';
import { useAppState } from '../../context/AppStateContext';
import { transitApi } from '../../services/api/client';
import { Journey, JourneySegment, Stop } from '../../types/transit';

export default function JourneyDetailsPage() {
  const { journeyId } = useParams<{ journeyId: string }>();
  const { saveJourney, isJourneySaved } = useAppState();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<JourneySegment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!journeyId) return;
    setLoading(true);
    setError(null);
    transitApi
      .getJourneyById(journeyId)
      .then((res) => {
        setJourney(res.journey);
        setSelectedSegment(res.journey.segments[0] ?? null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load journey details.');
      })
      .finally(() => setLoading(false));
  }, [journeyId]);

  const mapStops = useMemo<Stop[]>(() => {
    if (!journey) return [];
    const seen = new Set<string>();
    const out: Stop[] = [];
    for (const seg of journey.segments) {
      for (const s of [seg.fromStop, ...seg.intermediateStops, seg.toStop]) {
        if (!seen.has(s.stop_id)) {
          seen.add(s.stop_id);
          out.push(s);
        }
      }
    }
    return out;
  }, [journey]);

  const mapSegments = useMemo<MapSegmentOverlay[]>(() => {
    if (!journey) return [];
    return journey.segments.map((seg) => ({
      segmentId: seg.segmentId,
      routeShortName: seg.routeShortName,
      directionLabel: seg.directionLabel,
      fromStop: seg.fromStop,
      toStop: seg.toStop,
      path: seg.path,
      crowding: seg.crowding,
    }));
  }, [journey]);

  return (
    <WorkspaceLayout section="commuter" breadcrumb="Journey Details">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/results"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--cw-text-secondary)] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Journey Results</span>
          </Link>
          {journey && (
            <button
              type="button"
              onClick={() => saveJourney(journey)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
            >
              <Bookmark className="h-3.5 w-3.5 text-yellow-300" aria-hidden="true" />
              <span>{isJourneySaved(journey.journeyId) ? 'Saved in Demo' : 'Save Journey'}</span>
            </button>
          )}
        </div>

        <DemoEstimateDisclaimer compact />

        {loading && <LoadingSkeleton rows={5} />}
        {error && !loading && <ErrorState message={error} />}

        {!loading && !error && journey && (
          <>
            {/* Summary Header */}
            <section className="cw-card rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-2xl font-bold text-white">
                      Bus {journey.routesSummary.join(' → ')}
                    </h1>
                    <DemoDataTag />
                  </div>
                  <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
                    {journey.originStop.stop_name} ({journey.originStop.stop_code}) →{' '}
                    {journey.destinationStop.stop_name} ({journey.destinationStop.stop_code})
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono tabular-nums text-lg font-bold text-white">
                      {journey.departureTime} – {journey.arrivalTime}
                    </div>
                    <div className="text-xs text-[var(--cw-text-muted)] flex items-center gap-1 justify-end">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {journey.totalDurationMinutes} min · {journey.transferCount} transfer(s)
                      </span>
                    </div>
                  </div>
                  <CrowdingBadge level={journey.overallCrowding} />
                  <ConfidenceBadge confidence={journey.overallConfidence} />
                </div>
              </div>
            </section>

            {/* Interactive Route Map */}
            <DelhiTransitMap
              stops={mapStops}
              segments={mapSegments}
              selectedSegmentId={selectedSegment?.segmentId}
              onSelectSegment={(overlay) => {
                const match = journey.segments.find((s) => s.segmentId === overlay.segmentId);
                if (match) setSelectedSegment(match);
              }}
              title={`Journey Map: Bus ${journey.routesSummary.join(' → ')}`}
            />

            {/* Segment Timeline + Click-to-Inspect Segment Detail Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <section className="lg:col-span-7 cw-card rounded-2xl p-5 space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    Segment-by-Segment Journey Timeline
                  </h2>
                  <p className="text-xs text-[var(--cw-text-muted)] mt-0.5">
                    Click any segment leg to inspect demand evidence, coverage, and estimate type.
                  </p>
                </div>

                <div className="space-y-3">
                  {journey.segments.map((seg) => {
                    const active = selectedSegment?.segmentId === seg.segmentId;
                    return (
                      <button
                        key={seg.segmentId}
                        type="button"
                        onClick={() => setSelectedSegment(seg)}
                        className={`w-full text-left rounded-xl border p-4 transition-colors ${
                          active
                            ? 'border-emerald-400/70 bg-emerald-500/15'
                            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                        }`}
                      >
                        {seg.isTransferWaitBefore && seg.transferWaitMinutes && (
                          <div className="mb-2 text-xs font-mono text-yellow-200 bg-yellow-500/15 border border-yellow-400/30 rounded px-2.5 py-1 inline-block">
                            Transfer wait at {seg.fromStop.stop_name}: ~{seg.transferWaitMinutes} min
                          </div>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-semibold text-white">
                            Bus {seg.routeShortName} · {seg.directionLabel}
                          </div>
                          <span className="font-mono text-xs text-[var(--cw-text-secondary)]">
                            {seg.departureTime} – {seg.arrivalTime} ({seg.durationMinutes} min ·{' '}
                            {seg.distanceKm} km)
                          </span>
                        </div>
                        <div className="mt-1.5 text-sm text-[var(--cw-text-secondary)]">
                          {seg.fromStop.stop_name} → {seg.toStop.stop_name}
                        </div>
                        <div className="mt-1 text-xs text-[var(--cw-text-muted)]">
                          Intermediate stops ({seg.intermediateStops.length}):{' '}
                          {seg.intermediateStops.map((s) => s.stop_name).join(' · ') || 'None'}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <CrowdingBadge level={seg.crowding.crowdingLevel} compact />
                          <ConfidenceBadge confidence={seg.crowding.confidence} />
                          <span className="text-[11px] text-[var(--cw-text-muted)]">
                            {ESTIMATE_TYPE_LABELS[seg.crowding.estimateType]}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Selected Segment Evidence Drawer */}
              <aside className="lg:col-span-5 cw-card rounded-2xl p-5 space-y-4">
                {selectedSegment ? (
                  <>
                    <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <div className="text-xs font-mono text-emerald-300">
                          Route {selectedSegment.routeShortName} · Trip {selectedSegment.tripId}
                        </div>
                        <h3 className="mt-1 text-base font-semibold text-white">
                          {selectedSegment.fromStop.stop_name} → {selectedSegment.toStop.stop_name}
                        </h3>
                      </div>
                      <DemoDataTag />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <CrowdingBadge level={selectedSegment.crowding.crowdingLevel} />
                      <ConfidenceBadge confidence={selectedSegment.crowding.confidence} />
                    </div>

                    <div className="cw-card-alt rounded-xl p-3.5 space-y-1.5 text-xs">
                      <div className="font-semibold text-white">Estimate Classification</div>
                      <div className="text-emerald-300 font-medium">
                        {ESTIMATE_TYPE_LABELS[selectedSegment.crowding.estimateType]}
                      </div>
                      <p className="text-[var(--cw-text-secondary)] leading-relaxed">
                        {selectedSegment.crowding.relativeDemandIndexLabel}
                      </p>
                    </div>

                    {/* Explicitly separate the three quantitative concepts */}
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t border-white/10 pt-3">
                      <div className="cw-card-alt rounded-xl p-3">
                        <dt className="text-[var(--cw-text-muted)]">Observed Ticketing Demand</dt>
                        <dd className="mt-1 font-mono tabular-nums text-sm font-semibold text-white">
                          {selectedSegment.crowding.observedTicketingDemand ?? 'Unavailable'}
                        </dd>
                      </div>
                      <div className="cw-card-alt rounded-xl p-3">
                        <dt className="text-[var(--cw-text-muted)]">Reconstructed Load</dt>
                        <dd className="mt-1 font-mono tabular-nums text-sm font-semibold text-white">
                          {selectedSegment.crowding.reconstructedPassengerLoad ??
                            'Not reconstructed'}
                        </dd>
                      </div>
                      <div className="cw-card-alt rounded-xl p-3">
                        <dt className="text-[var(--cw-text-muted)]">Model Predicted Demand</dt>
                        <dd className="mt-1 font-mono tabular-nums text-sm font-semibold text-white">
                          {selectedSegment.crowding.predictedDemand ?? 'Not applied'}
                        </dd>
                      </div>
                      <div className="cw-card-alt rounded-xl p-3">
                        <dt className="text-[var(--cw-text-muted)]">Verified Occupancy Ratio</dt>
                        <dd className="mt-1 font-mono tabular-nums text-sm font-semibold text-white">
                          {selectedSegment.crowding.occupancyRatioPercent !== null
                            ? `${selectedSegment.crowding.occupancyRatioPercent}% (Cap ${selectedSegment.crowding.verifiedVehicleCapacity})`
                            : 'Capacity unknown'}
                        </dd>
                      </div>
                    </dl>

                    <div className="border-t border-white/10 pt-3 text-xs text-[var(--cw-text-secondary)] space-y-1">
                      <div>
                        <span className="font-medium text-white">Time Band:</span>{' '}
                        <span className="capitalize">
                          {selectedSegment.crowding.timeBand.replace('_', ' ')} (
                          {selectedSegment.crowding.dayType})
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-white">Sample Coverage:</span>{' '}
                        <span className="font-mono text-emerald-300">
                          {selectedSegment.crowding.coverage.coverageLabel}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-white">Data Freshness:</span>{' '}
                        {selectedSegment.crowding.dataFreshness}
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-3">
                      <div className="text-xs font-semibold text-white mb-2">
                        Stop Sequence ({selectedSegment.intermediateStops.length + 2} stops)
                      </div>
                      <ol className="space-y-1.5 text-xs text-[var(--cw-text-secondary)]">
                        {[
                          selectedSegment.fromStop,
                          ...selectedSegment.intermediateStops,
                          selectedSegment.toStop,
                        ].map((s, idx) => (
                          <li key={s.stop_id} className="flex items-center gap-2">
                            <MapPin
                              className="h-3.5 w-3.5 text-emerald-400 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="font-mono text-[11px] text-[var(--cw-text-muted)]">
                              {(idx + 1).toString().padStart(2, '0')}
                            </span>
                            <Link
                              to={`/stops/${s.stop_id}`}
                              className="hover:text-emerald-300 transition-colors"
                            >
                              {s.stop_name} ({s.stop_code})
                            </Link>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[var(--cw-text-muted)]">
                    Select a segment from the timeline.
                  </p>
                )}
              </aside>
            </div>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}
