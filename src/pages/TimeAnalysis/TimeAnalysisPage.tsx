import { useEffect, useState } from 'react';
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
import { transitApi } from '../../services/api/client';
import { TimeBand, TimeBandAnalysis } from '../../types/transit';

export default function TimeAnalysisPage() {
  const [timeBands, setTimeBands] = useState<TimeBandAnalysis[]>([]);
  const [note, setNote] = useState('');
  const [selectedBand, setSelectedBand] = useState<TimeBand | 'all'>('all');
  const [dayComparisonMode, setDayComparisonMode] = useState<'both' | 'weekday' | 'weekend'>(
    'both'
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await transitApi.getPeakHours();
      setTimeBands(res.timeBands || []);
      setNote(res.note || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load peak-hour analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredBands =
    selectedBand === 'all' ? timeBands : timeBands.filter((tb) => tb.timeBand === selectedBand);

  const totalWeekdayTickets = timeBands.reduce((acc, t) => acc + t.weekdayTicketVolume, 0);
  const totalWeekendTickets = timeBands.reduce((acc, t) => acc + t.weekendTicketVolume, 0);
  const peakBand = timeBands.reduce<TimeBandAnalysis | null>(
    (best, cur) => (!best || cur.weekdayTicketVolume > best.weekdayTicketVolume ? cur : best),
    null
  );

  return (
    <WorkspaceLayout section="operator" breadcrumb="Time Analysis">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Time-of-Day &amp; Weekday vs. Weekend Analysis
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Hourly ticketing issuance vs. reconstructed passenger load index across six Delhi
              transit time bands.
            </p>
          </div>
          <DemoDataTag label="DEMO TIME-BAND FIXTURE" />
        </div>

        <DemoEstimateDisclaimer compact />

        {/* Filter Controls */}
        <section className="cw-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label
                htmlFor="ta-band"
                className="block text-[11px] font-semibold text-[var(--cw-text-secondary)] mb-1"
              >
                Focus Time Band
              </label>
              <select
                id="ta-band"
                value={selectedBand}
                onChange={(e) => setSelectedBand(e.target.value as TimeBand | 'all')}
                className="cw-input rounded-lg px-3 py-1.5 text-xs"
              >
                <option value="all">All 6 Time Bands</option>
                {timeBands.map((tb) => (
                  <option key={tb.timeBand} value={tb.timeBand}>
                    {tb.label} ({tb.hoursRange})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="ta-day"
                className="block text-[11px] font-semibold text-[var(--cw-text-secondary)] mb-1"
              >
                Day Comparison
              </label>
              <select
                id="ta-day"
                value={dayComparisonMode}
                onChange={(e) =>
                  setDayComparisonMode(e.target.value as 'both' | 'weekday' | 'weekend')
                }
                className="cw-input rounded-lg px-3 py-1.5 text-xs"
              >
                <option value="both">Weekday vs. Weekend</option>
                <option value="weekday">Weekday Only</option>
                <option value="weekend">Weekend Only</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-[var(--cw-text-secondary)] max-w-md">
            <span className="font-semibold text-white">Methodological distinction:</span>{' '}
            {note ||
              'Ticket issuance captures boardings; reconstructed load incorporates cumulative downstream occupancy where trip direction and alighting are valid.'}
          </div>
        </section>

        {loading && <LoadingSkeleton rows={4} />}
        {error && !loading && <ErrorState message={error} onRetry={loadData} />}

        {!loading && !error && timeBands.length > 0 && (
          <>
            {/* KPI Summary */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="cw-card rounded-2xl p-4">
                <div className="text-xs text-[var(--cw-text-muted)]">
                  Total Weekday Sample Tickets
                </div>
                <div className="mt-1 font-mono tabular-nums text-2xl font-bold text-white">
                  {totalWeekdayTickets.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-[var(--cw-text-muted)]">
                  Across 6 operational bands
                </div>
              </div>

              <div className="cw-card rounded-2xl p-4">
                <div className="text-xs text-[var(--cw-text-muted)]">
                  Total Weekend Sample Tickets
                </div>
                <div className="mt-1 font-mono tabular-nums text-2xl font-bold text-cyan-300">
                  {totalWeekendTickets.toLocaleString()}
                </div>
                <div className="mt-1 text-[11px] text-[var(--cw-text-muted)]">
                  {totalWeekdayTickets > 0
                    ? `${Math.round((totalWeekendTickets / totalWeekdayTickets) * 100)}% of weekday volume`
                    : 'Sample ratio'}
                </div>
              </div>

              <div className="cw-card rounded-2xl p-4">
                <div className="text-xs text-[var(--cw-text-muted)]">Highest Observed Band</div>
                <div className="mt-1 text-lg font-bold text-orange-300">
                  {peakBand ? peakBand.label : '—'}
                </div>
                <div className="mt-1 font-mono text-[11px] text-[var(--cw-text-muted)]">
                  {peakBand
                    ? `${peakBand.hoursRange} · ${peakBand.weekdayTicketVolume.toLocaleString()} weekday tickets`
                    : ''}
                </div>
              </div>
            </section>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="cw-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Observed Ticketing Volume by Time Band
                    </h2>
                    <p className="text-xs text-[var(--cw-text-muted)]">
                      Comparison of weekday commuter surge vs. weekend travel distribution
                    </p>
                  </div>
                  <DemoDataTag />
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredBands}>
                      <CartesianGrid strokeDasharray="3 3" stroke={DARK_CHART_GRID} />
                      <XAxis dataKey="label" tick={DARK_CHART_AXIS} />
                      <YAxis tick={DARK_CHART_AXIS} />
                      <Tooltip {...DARK_TOOLTIP_STYLE} />
                      <Legend {...DARK_LEGEND_STYLE} />
                      {dayComparisonMode !== 'weekend' && (
                        <Bar
                          dataKey="weekdayTicketVolume"
                          name="Weekday Ticket Volume (Demo)"
                          fill="#3B82F6"
                          radius={[5, 5, 0, 0]}
                        />
                      )}
                      {dayComparisonMode !== 'weekday' && (
                        <Bar
                          dataKey="weekendTicketVolume"
                          name="Weekend Ticket Volume (Demo)"
                          fill="#22D3EE"
                          radius={[5, 5, 0, 0]}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="cw-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Reconstructed Passenger Load Index by Band
                    </h2>
                    <p className="text-xs text-[var(--cw-text-muted)]">
                      Late Evening returns null where alighting/trip coverage is insufficient
                    </p>
                  </div>
                  <DemoDataTag />
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredBands}>
                      <CartesianGrid strokeDasharray="3 3" stroke={DARK_CHART_GRID} />
                      <XAxis dataKey="label" tick={DARK_CHART_AXIS} />
                      <YAxis domain={[0, 100]} tick={DARK_CHART_AXIS} />
                      <Tooltip {...DARK_TOOLTIP_STYLE} />
                      <Legend {...DARK_LEGEND_STYLE} />
                      <Line
                        type="monotone"
                        dataKey="avgReconstructedLoadIndex"
                        name="Avg Reconstructed Load Index (Demo)"
                        stroke="#F97316"
                        strokeWidth={2.5}
                        connectNulls={false}
                        dot={{ r: 4, fill: '#F97316' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            {/* Detailed Band Table */}
            <section className="cw-card rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">
                  Operational Time-Band Breakdown
                </h2>
                <span className="text-xs text-[var(--cw-text-muted)]">
                  {filteredBands.length} bands shown
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.04] text-[var(--cw-text-secondary)] border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Time Band</th>
                      <th className="px-4 py-3 font-semibold">Hours</th>
                      <th className="px-4 py-3 font-semibold text-right">Weekday Tickets</th>
                      <th className="px-4 py-3 font-semibold text-right">Weekend Tickets</th>
                      <th className="px-4 py-3 font-semibold text-right">
                        Reconstructed Load Index
                      </th>
                      <th className="px-4 py-3 font-semibold">Operational Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredBands.map((band) => (
                      <tr key={band.timeBand} className="hover:bg-white/[0.04]">
                        <td className="px-4 py-3 font-semibold text-white">{band.label}</td>
                        <td className="px-4 py-3 font-mono text-[var(--cw-text-muted)]">
                          {band.hoursRange}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-right text-white">
                          {band.weekdayTicketVolume.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-right text-cyan-300">
                          {band.weekendTicketVolume.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-right">
                          {band.avgReconstructedLoadIndex !== null ? (
                            <span className="font-semibold text-orange-300">
                              {band.avgReconstructedLoadIndex}
                            </span>
                          ) : (
                            <span className="text-[var(--cw-text-muted)]">Insufficient data</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[var(--cw-text-secondary)] max-w-md">
                          {band.note}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}
