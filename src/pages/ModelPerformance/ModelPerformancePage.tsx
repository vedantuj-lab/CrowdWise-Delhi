import { useEffect, useState } from 'react';
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
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
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
import { ModelPerformancePayload, ModelVersionRecord } from '../../types/transit';

export default function ModelPerformancePage() {
  const [perf, setPerf] = useState<ModelPerformancePayload | null>(null);
  const [versions, setVersions] = useState<ModelVersionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [perfRes, verRes] = await Promise.all([
        transitApi.getModelPerformance(),
        transitApi.getModelVersions(),
      ]);
      setPerf(perfRes);
      setVersions(verRes.versions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model evaluation benchmark.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <WorkspaceLayout section="operator" breadcrumb="Model Performance">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
              Crowding Model Validation &amp; Benchmark Comparison
            </h1>
            <p className="mt-1 text-sm text-[var(--cw-text-secondary)]">
              Time-ordered chronological split benchmarks comparing Historical Mean/Median baselines
              against Random Forest &amp; XGBoost candidates.
            </p>
          </div>
          <DemoDataTag label="DEMO BENCHMARK ONLY" />
        </div>

        <DemoEstimateDisclaimer compact />

        {loading && <LoadingSkeleton rows={5} />}
        {error && !loading && <ErrorState message={error} onRetry={loadData} />}

        {!loading && !error && perf && (
          <>
            {/* Chronological Split & Non-Selection Callout */}
            <section className="cw-card rounded-2xl p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Info className="h-4 w-4 text-cyan-400" aria-hidden="true" />
                  <span>Evaluation Protocol &amp; Production Selection Status</span>
                </div>
                <span className="rounded border border-orange-400/40 bg-orange-500/15 px-2.5 py-0.5 font-mono text-xs font-medium text-orange-200">
                  Production Model: {perf.selectedProductionModel ?? 'NOT YET SELECTED'}
                </span>
              </div>
              <p className="text-xs text-[var(--cw-text-secondary)] leading-relaxed">
                {perf.evaluationProtocol}
              </p>
              <p className="text-xs text-orange-100 bg-orange-950/40 border border-orange-500/35 rounded-lg px-3 py-2">
                {perf.selectionNote}
              </p>
            </section>

            {/* Model Benchmark Table */}
            <section className="cw-card rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">
                  Baseline vs. Candidate Model Metrics (Holdout Test Window)
                </h2>
                <DemoDataTag />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.04] text-[var(--cw-text-secondary)] border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Model &amp; Version</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Split Window</th>
                      <th className="px-4 py-3 font-semibold text-right">MAE</th>
                      <th className="px-4 py-3 font-semibold text-right">RMSE</th>
                      <th className="px-4 py-3 font-semibold text-right">R²</th>
                      <th className="px-4 py-3 font-semibold text-right">Precision</th>
                      <th className="px-4 py-3 font-semibold text-right">Recall</th>
                      <th className="px-4 py-3 font-semibold text-right">F1</th>
                      <th className="px-4 py-3 font-semibold text-right">Coverage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {perf.models.map((m) => (
                      <tr key={m.modelId} className="hover:bg-white/[0.04]">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">{m.modelName}</div>
                          <div className="font-mono text-[11px] text-[var(--cw-text-muted)]">
                            {m.version}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium capitalize border ${
                              m.status === 'baseline'
                                ? 'bg-slate-800/80 text-slate-200 border-slate-600'
                                : m.status === 'candidate'
                                ? 'bg-cyan-950/60 text-cyan-200 border-cyan-500/40'
                                : 'bg-orange-950/60 text-orange-200 border-orange-500/40'
                            }`}
                          >
                            {m.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[var(--cw-text-secondary)] whitespace-nowrap">
                          {m.trainingRange} → {m.testRange}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-right font-semibold text-white">
                          {m.mae.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-right text-[var(--cw-text-secondary)]">
                          {m.rmse.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-right text-[var(--cw-text-secondary)]">
                          {m.rSquared !== null ? m.rSquared.toFixed(2) : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-right text-[var(--cw-text-secondary)]">
                          {m.precision.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-right text-[var(--cw-text-secondary)]">
                          {m.recall.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-right font-semibold text-cyan-300">
                          {m.f1Score.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-right text-[var(--cw-text-secondary)]">
                          {m.coveragePercent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Charts: By Route & By Time Band */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="cw-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Holdout MAE &amp; Coverage by Route
                    </h2>
                    <p className="text-xs text-[var(--cw-text-muted)]">
                      Routes with ambiguous directions show higher error variance
                    </p>
                  </div>
                  <DemoDataTag />
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perf.byRoute}>
                      <CartesianGrid strokeDasharray="3 3" stroke={DARK_CHART_GRID} />
                      <XAxis dataKey="routeShortName" tick={DARK_CHART_AXIS} />
                      <YAxis tick={DARK_CHART_AXIS} />
                      <Tooltip {...DARK_TOOLTIP_STYLE} />
                      <Legend {...DARK_LEGEND_STYLE} />
                      <Bar
                        dataKey="mae"
                        name="MAE (lower better)"
                        fill="#3B82F6"
                        radius={[5, 5, 0, 0]}
                      />
                      <Bar
                        dataKey="coveragePercent"
                        name="Coverage %"
                        fill="#22D3EE"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="cw-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      Error Profile by Time Band
                    </h2>
                    <p className="text-xs text-[var(--cw-text-muted)]">
                      Late Evening suffers higher MAE due to sparse ticketing observations
                    </p>
                  </div>
                  <DemoDataTag />
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perf.byTimeBand}>
                      <CartesianGrid strokeDasharray="3 3" stroke={DARK_CHART_GRID} />
                      <XAxis dataKey="timeBandLabel" tick={DARK_CHART_AXIS} />
                      <YAxis tick={DARK_CHART_AXIS} />
                      <Tooltip {...DARK_TOOLTIP_STYLE} />
                      <Legend {...DARK_LEGEND_STYLE} />
                      <Bar
                        dataKey="mae"
                        name="Observed MAE"
                        fill="#F97316"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>

            {/* Confidence Calibration & Least Reliable Areas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <section className="lg:col-span-5 cw-card rounded-2xl p-5 space-y-3">
                <h2 className="text-base font-semibold text-white">Confidence Calibration Table</h2>
                <p className="text-xs text-[var(--cw-text-muted)]">
                  Demonstrates how confidence tiers correlate with segment error in holdout testing.
                </p>
                <div className="divide-y divide-white/10 text-xs">
                  {perf.confidenceCalibration.map((c) => (
                    <div key={c.bucket} className="py-2.5 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold capitalize text-white">
                          {c.bucket.replace('_', ' ')} ({c.segmentSharePercent}% segments)
                        </div>
                        <div className="text-[var(--cw-text-muted)] mt-0.5">{c.description}</div>
                      </div>
                      <span className="font-mono tabular-nums font-semibold text-cyan-300 shrink-0">
                        MAE {c.observedErrorMae}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="lg:col-span-7 cw-card rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-400" aria-hidden="true" />
                  <h2 className="text-base font-semibold text-white">
                    Where the Model Is Least Reliable
                  </h2>
                </div>
                <div className="space-y-3">
                  {perf.leastReliableAreas.map((area) => (
                    <div
                      key={area.category}
                      className="cw-card-alt rounded-xl p-3.5 text-xs space-y-1"
                    >
                      <div className="font-semibold text-white">{area.category}</div>
                      <div className="text-[var(--cw-text-secondary)]">
                        <span className="font-medium text-white">Affected:</span>{' '}
                        {area.affectedRoutesOrSegments}
                      </div>
                      <div className="text-[var(--cw-text-secondary)]">
                        <span className="font-medium text-white">Cause:</span> {area.primaryCause}
                      </div>
                      <div className="text-cyan-300 flex items-center gap-1.5 pt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{area.mitigation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Registered Versions */}
            <section className="cw-card rounded-2xl p-5">
              <h2 className="text-base font-semibold text-white mb-3">
                Model Artifact Registry (Demo Metadata)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {versions.map((v) => (
                  <div key={v.versionId} className="cw-card-alt rounded-xl p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-cyan-300">{v.versionId}</span>
                      <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-medium text-[var(--cw-text-secondary)]">
                        {v.deploymentState}
                      </span>
                    </div>
                    <div className="font-medium text-white">{v.modelName}</div>
                    <div className="text-[var(--cw-text-muted)]">
                      {v.algorithm} · Split: {v.chronologicalSplit}
                    </div>
                    <p className="text-[var(--cw-text-secondary)]">{v.notes}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}
