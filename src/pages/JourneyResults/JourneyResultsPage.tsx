import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftRight,
  Bookmark,
  BookmarkCheck,
  Clock,
  Info,
  Share2,
  SlidersHorizontal,
} from 'lucide-react';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout';
import { JourneySearchForm } from '../../components/journey/JourneySearchForm';
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
import { transitApi } from '../../services/api/client';
import {
  ConfidenceLevel,
  CrowdingLevel,
  Journey,
  JourneyPreference,
  JourneySearchResponse,
} from '../../types/transit';

const RANK_LABELS: Record<'fastest' | 'balanced' | 'least_crowded', string> = {
  fastest: 'FASTEST',
  balanced: 'BALANCED',
  least_crowded: 'LEAST CROWDED',
};

export default function JourneyResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { saveJourney, isJourneySaved, pushToast, refreshHistory } = useAppState();

  const originStopId = searchParams.get('origin') || 'DL_STP_001';
  const destinationStopId = searchParams.get('destination') || 'DL_STP_014';
  const departureDate = searchParams.get('date') || new Date().toISOString().slice(0, 10);
  const departureTime = searchParams.get('time') || '08:45';
  const preference =
    ((searchParams.get('pref') || searchParams.get('preference')) as JourneyPreference) ||
    'balanced';

  const [data, setData] = useState<JourneySearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & sorting
  const [transferFilter, setTransferFilter] = useState<'all' | '0' | '1'>('all');
  const [demandFilter, setDemandFilter] = useState<CrowdingLevel | 'all'>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLevel | 'all'>('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'duration' | 'transfers'>('recommended');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const runSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await transitApi.searchJourneys({
        originStopId,
        destinationStopId,
        departureDate,
        departureTime,
        preference,
      });
      setData(res);
      refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search GTFS journeys.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originStopId, destinationStopId, departureDate, departureTime, preference]);

  const filteredJourneys = useMemo(() => {
    if (!data) return [];
    let list = [...data.journeys];
    if (transferFilter !== 'all') {
      list = list.filter((j) => j.transferCount === Number(transferFilter));
    }
    if (demandFilter !== 'all') {
      list = list.filter((j) => j.overallCrowding === demandFilter);
    }
    if (confidenceFilter !== 'all') {
      list = list.filter((j) => j.overallConfidence.level === confidenceFilter);
    }
    if (sortBy === 'duration') {
      list.sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);
    } else if (sortBy === 'transfers') {
      list.sort(
        (a, b) =>
          a.transferCount - b.transferCount || a.totalDurationMinutes - b.totalDurationMinutes
      );
    }
    return list;
  }, [data, transferFilter, demandFilter, confidenceFilter, sortBy]);

  const comparedJourneys = useMemo(() => {
    if (!data) return [];
    return compareIds
      .map((id) => data.journeys.find((j) => j.journeyId === id))
      .filter((j): j is Journey => Boolean(j));
  }, [data, compareIds]);

  const toggleCompare = (journeyId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(journeyId)) return prev.filter((id) => id !== journeyId);
      if (prev.length >= 2) return [prev[1], journeyId];
      return [...prev, journeyId];
    });
  };

  const handleShare = async (journey: Journey) => {
    const shareUrl = `${window.location.origin}/journeys/${encodeURIComponent(journey.journeyId)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      pushToast('Journey link copied to clipboard.', 'success');
    } catch {
      pushToast(`Shareable journey URL: ${shareUrl}`, 'info');
    }
  };

  const fastestJourney = data?.journeys.find((j) => j.journeyId === data.fastestJourneyId);
  const balancedJourney = data?.journeys.find((j) => j.journeyId === data.balancedJourneyId);
  const leastCrowdedJourney = data?.journeys.find((j) => j.journeyId === data.leastCrowdedJourneyId);

  return (
    <WorkspaceLayout section="commuter" breadcrumb="Journey Results">
      <div className="space-y-6">
        <JourneySearchForm
          initialOrigin={originStopId}
          initialDestination={destinationStopId}
          initialDate={departureDate}
          initialTime={departureTime}
          initialPreference={preference}
          compact
          onSearchSubmitted={(params) => {
            setSearchParams({
              origin: params.origin,
              destination: params.destination,
              date: params.date,
              time: params.time,
              pref: params.preference,
            });
          }}
        />

        <DemoEstimateDisclaimer compact />

        {loading && <LoadingSkeleton rows={4} />}

        {error && !loading && <ErrorState message={error} onRetry={runSearch} />}

        {!loading && !error && data && data.journeys.length === 0 && (
          <EmptyState
            title="No valid GTFS bus journey found"
            description={data.notice}
            actionLabel="Modify Search"
            onAction={() => navigate('/planner')}
          />
        )}

        {!loading && !error && data && data.journeys.length > 0 && (
          <>
            {/* Three Ranking Category Highlights */}
            <section
              aria-label="Recommended ranking categories"
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {[
                {
                  key: 'fastest',
                  title: 'Fastest Option',
                  accent: 'text-cyan-300',
                  subtitle: 'Prioritises shortest scheduled duration',
                  journey: fastestJourney,
                },
                {
                  key: 'balanced',
                  title: 'Balanced Option',
                  accent: 'text-emerald-300',
                  subtitle: 'Combines duration, transfers & demand',
                  journey: balancedJourney,
                },
                {
                  key: 'least_crowded',
                  title: 'Least Crowded Option',
                  accent: 'text-yellow-300',
                  subtitle: leastCrowdedJourney
                    ? 'Lower demand with sufficient confidence'
                    : 'No option meets reliability threshold',
                  journey: leastCrowdedJourney,
                },
              ].map((card) => (
                <div
                  key={card.key}
                  className="cw-card rounded-2xl p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold ${card.accent}`}>{card.title}</span>
                      <DemoDataTag />
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--cw-text-muted)]">{card.subtitle}</p>
                    {card.journey ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="font-display text-lg font-bold text-white">
                            Bus {card.journey.routesSummary.join(' → ')}
                          </span>
                          <span className="font-mono tabular-nums text-sm font-semibold text-white">
                            {card.journey.totalDurationMinutes} min
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <CrowdingBadge level={card.journey.overallCrowding} compact />
                          <ConfidenceBadge confidence={card.journey.overallConfidence} />
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-[var(--cw-text-muted)]">
                        Low-confidence or insufficient-data routes are withheld from Least Crowded
                        recommendations.
                      </p>
                    )}
                  </div>
                  {card.journey && (
                    <Link
                      to={`/journeys/${encodeURIComponent(card.journey.journeyId)}`}
                      className="mt-3 inline-block text-xs font-semibold text-emerald-300 hover:underline"
                    >
                      Inspect segments →
                    </Link>
                  )}
                </div>
              ))}
            </section>

            {/* Filter & Sort Bar */}
            <section className="cw-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-[var(--cw-text-secondary)]">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  <span>Filter:</span>
                </span>
                <select
                  aria-label="Filter by transfers"
                  value={transferFilter}
                  onChange={(e) => setTransferFilter(e.target.value as 'all' | '0' | '1')}
                  className="cw-input rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <option value="all">All transfers</option>
                  <option value="0">Direct (0 transfers)</option>
                  <option value="1">1 transfer</option>
                </select>

                <select
                  aria-label="Filter by demand category"
                  value={demandFilter}
                  onChange={(e) => setDemandFilter(e.target.value as CrowdingLevel | 'all')}
                  className="cw-input rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <option value="all">All demand states</option>
                  <option value="low">Low demand</option>
                  <option value="moderate">Moderate demand</option>
                  <option value="high">High demand</option>
                  <option value="very_high">Very high demand</option>
                  <option value="insufficient_data">Insufficient data</option>
                </select>

                <select
                  aria-label="Filter by confidence"
                  value={confidenceFilter}
                  onChange={(e) => setConfidenceFilter(e.target.value as ConfidenceLevel | 'all')}
                  className="cw-input rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <option value="all">All confidence levels</option>
                  <option value="high">High confidence</option>
                  <option value="medium">Medium confidence</option>
                  <option value="low">Low confidence</option>
                  <option value="insufficient_data">Insufficient data</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-[var(--cw-text-secondary)]">Sort:</span>
                <select
                  aria-label="Sort results"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as 'recommended' | 'duration' | 'transfers')
                  }
                  className="cw-input rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <option value="recommended">Priority match</option>
                  <option value="duration">Shortest duration</option>
                  <option value="transfers">Fewest transfers</option>
                </select>
              </div>
            </section>

            {/* Side-by-side Comparison Panel when 2 selected */}
            {comparedJourneys.length === 2 && (
              <section className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <ArrowLeftRight className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    <span>Side-by-Side Journey Comparison</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setCompareIds([])}
                    className="text-xs font-medium text-[var(--cw-text-secondary)] hover:text-white"
                  >
                    Clear comparison
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {comparedJourneys.map((j) => (
                    <div key={j.journeyId} className="cw-card rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-white">
                          Bus {j.routesSummary.join(' → ')}
                        </span>
                        <span className="font-mono text-sm font-semibold text-yellow-300">
                          {j.totalDurationMinutes} min
                        </span>
                      </div>
                      <div className="text-xs text-[var(--cw-text-secondary)] font-mono">
                        {j.departureTime} – {j.arrivalTime} · {j.transferCount} transfer(s)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <CrowdingBadge level={j.overallCrowding} compact />
                        <ConfidenceBadge confidence={j.overallConfidence} />
                      </div>
                      <div className="text-[11px] text-[var(--cw-text-muted)]">
                        {ESTIMATE_TYPE_LABELS[j.dominantEstimateType]}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Journey Cards List */}
            {filteredJourneys.length === 0 ? (
              <EmptyState
                title="No journeys match the active filters"
                description="Try clearing the transfer, demand, or confidence filter above."
                actionLabel="Reset Filters"
                onAction={() => {
                  setTransferFilter('all');
                  setDemandFilter('all');
                  setConfidenceFilter('all');
                }}
              />
            ) : (
              <div className="space-y-4">
                {filteredJourneys.map((journey) => {
                  const saved = isJourneySaved(journey.journeyId);
                  const isComparing = compareIds.includes(journey.journeyId);
                  const isExpanded = expandedId === journey.journeyId;

                  return (
                    <article
                      key={journey.journeyId}
                      className="cw-card rounded-2xl p-5 space-y-4 hover:border-emerald-400/40 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--cw-text-muted)]">
                            <span className="font-display text-lg font-bold text-white">
                              Bus {journey.routesSummary.join(' → ')}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{journey.agenciesSummary.join(' / ')}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {journey.transferCount === 0
                                ? 'Direct'
                                : `${journey.transferCount} transfer (${journey.transferWaitMinutes}m wait)`}
                            </span>
                            {journey.rankingCategories.length > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono font-semibold text-yellow-300">
                                  {journey.rankingCategories.map((c) => RANK_LABELS[c]).join(' / ')}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="text-sm text-[var(--cw-text-secondary)]">
                            <span className="font-medium text-white">
                              {journey.originStop.stop_name}
                            </span>{' '}
                            <span className="text-[var(--cw-text-muted)]">
                              ({journey.originStop.stop_code})
                            </span>
                            <span className="mx-2 text-[var(--cw-text-muted)]">→</span>
                            <span className="font-medium text-white">
                              {journey.destinationStop.stop_name}
                            </span>{' '}
                            <span className="text-[var(--cw-text-muted)]">
                              ({journey.destinationStop.stop_code})
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                          <div className="text-left lg:text-right">
                            <div className="font-mono tabular-nums text-lg font-bold text-white">
                              {journey.departureTime} – {journey.arrivalTime}
                            </div>
                            <div className="text-xs text-[var(--cw-text-muted)] flex items-center lg:justify-end gap-1">
                              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                              <span className="font-mono tabular-nums">
                                {journey.totalDurationMinutes} min total
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <CrowdingBadge level={journey.overallCrowding} />
                            <ConfidenceBadge confidence={journey.overallConfidence} />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs">
                        <div className="space-y-1">
                          <div className="text-[var(--cw-text-secondary)]">
                            <span className="font-medium text-white">Estimate Basis:</span>{' '}
                            {ESTIMATE_TYPE_LABELS[journey.dominantEstimateType]}
                          </div>
                          {journey.recommendationReason && (
                            <div className="flex items-start gap-1.5 text-[var(--cw-text-secondary)]">
                              <Info
                                className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-400"
                                aria-hidden="true"
                              />
                              <span>{journey.recommendationReason}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : journey.journeyId)}
                            className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--cw-text-secondary)] hover:bg-white/10 hover:text-white transition-colors"
                          >
                            {isExpanded ? 'Hide Legs' : 'Quick Preview'}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleCompare(journey.journeyId)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                              isComparing
                                ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                                : 'border-white/15 bg-white/5 text-[var(--cw-text-secondary)] hover:bg-white/10'
                            }`}
                          >
                            {isComparing ? 'Comparing' : 'Compare'}
                          </button>
                          <button
                            type="button"
                            onClick={() => saveJourney(journey)}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--cw-text-secondary)] hover:bg-white/10 hover:text-white transition-colors"
                          >
                            {saved ? (
                              <BookmarkCheck
                                className="h-3.5 w-3.5 text-yellow-300"
                                aria-hidden="true"
                              />
                            ) : (
                              <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            <span>{saved ? 'Saved' : 'Save'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShare(journey)}
                            aria-label="Share journey link"
                            className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-[var(--cw-text-secondary)] hover:bg-white/10 hover:text-white transition-colors"
                          >
                            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Share</span>
                          </button>
                          <Link
                            to={`/journeys/${encodeURIComponent(journey.journeyId)}`}
                            className="cw-btn-primary rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-white/10 pt-3 space-y-2">
                          {journey.segments.map((seg) => (
                            <div
                              key={seg.segmentId}
                              className="cw-card-alt rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                            >
                              <div>
                                <div className="font-semibold text-white">
                                  Leg {seg.legIndex + 1}: Bus {seg.routeShortName} (
                                  {seg.directionLabel})
                                </div>
                                <div className="text-[var(--cw-text-secondary)] mt-0.5">
                                  {seg.fromStop.stop_name} ({seg.departureTime}) →{' '}
                                  {seg.toStop.stop_name} ({seg.arrivalTime}) · {seg.durationMinutes}{' '}
                                  min
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <CrowdingBadge level={seg.crowding.crowdingLevel} compact />
                                <ConfidenceBadge confidence={seg.crowding.confidence} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}
